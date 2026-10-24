import React, { useState, useEffect } from 'react';
import {
    Upload, FileUp, ShoppingCart, BarChart3, Trash2, Plus,
    CheckCircle2, Settings2, Download, Save, ChevronDown, ChevronUp, Sparkles
} from 'lucide-react';
import { read, utils } from 'xlsx';
import { parseSupplierCSV } from '@/utils/csvParser';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { SERVICE_RECIPES } from '@/data/constants';
import { DEFAULT_SUPPLIER_DATA } from '@/data/defaultSupplierData';
import { useI18n } from '@/i18n/I18nContext';

export const PurchasingModule = ({
    supplierData,
    setSupplierData,
    requests,
    setRequests,
    setResourceCosts,
    setServiceUnitCosts
}) => {
    const { t } = useI18n();
    const [analysisResult, setAnalysisResult] = useState(null);
    const [expandedServices, setExpandedServices] = useState({});

    // Update resource costs when supplier data changes
    useEffect(() => {
        if (supplierData.length === 0) return;

        const newCosts = {};
        Object.values(SERVICE_RECIPES).flat().forEach(item => {
            let bestPrice = Infinity;
            let bestCapacity = null;
            let found = false;
            supplierData.forEach(supplier => {
                const matches = supplier.items.filter(sItem =>
                    sItem.name && sItem.name.toLowerCase().includes(item.keyword.toLowerCase())
                );
                matches.forEach(m => {
                    if (m.price < bestPrice) {
                        bestPrice = m.price;
                        bestCapacity = m.capacity;
                        found = true;
                    }
                });
            });
            if (found) {
                newCosts[item.keyword] = { price: bestPrice, capacity: bestCapacity };
            }
        });
        setResourceCosts(newCosts);
    }, [supplierData, setResourceCosts]);

    const onLocalFileUpload = (event) => {
        const files = Array.from(event.target.files);
        files.forEach(file => {
            parseSupplierCSV(file)
                .then(newSuppliers => {
                    setSupplierData(prev => {
                        let updated = [...prev];
                        newSuppliers.forEach(({ supplierName, items }) => {
                            // Remove existing supplier with same name
                            updated = updated.filter(s => s.supplierName !== supplierName);
                            // Add new/updated supplier
                            updated.push({ supplierName, items });
                        });
                        return updated;
                    });
                })
                .catch(error => {
                    alert(error.message);
                });
        });
    };

    // Analysis Logic
    useEffect(() => {
        if (supplierData.length === 0 || requests.length === 0) {
            if (requests.length === 0) setAnalysisResult(null);
            return;
        }

        const breakdown = [];
        let totalCheapest = 0;
        let supplierTotals = {};

        supplierData.forEach(s => supplierTotals[s.supplierName] = 0);

        requests.forEach(req => {
            const recipe = SERVICE_RECIPES[req.service] || [];

            recipe.forEach(component => {
                let bestOption = null;
                let requiredQty = 0;
                if (component.rule.type === 'per_person') {
                    requiredQty = req.quantity * component.rule.val;
                } else if (component.rule.type === 'per_group') {
                    requiredQty = Math.ceil(req.quantity / component.rule.val);
                } else {
                    requiredQty = req.quantity;
                }

                const targetQuality = req.qualityMap && req.qualityMap[component.keyword]
                    ? req.qualityMap[component.keyword]
                    : req.baseQuality;

                // Helper to normalize strings for matching (handle different dashes, spaces)
                const normalize = (str) => str.toLowerCase().replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim();
                const targetKeyword = normalize(component.keyword);

                supplierData.forEach(supplier => {
                    const matches = supplier.items.filter(item =>
                        item.name && normalize(item.name).includes(targetKeyword)
                    );
                    let match = matches.find(m => m.quality === targetQuality);
                    if (!match && matches.length > 0) {
                        if (component.category === 'Insurance' || component.category === 'Transport' || component.category === 'Tickets') {
                            match = matches.find(m => m.quality === 1);
                        }
                        if (!match) match = matches[0];
                    }

                    if (match) {
                        // Use parsed capacity if available for per_group items
                        let currentRequiredQty = requiredQty;
                        if (component.rule.type === 'per_group' && match.capacity) {
                            currentRequiredQty = Math.ceil(req.quantity / match.capacity);
                        }

                        const cost = Number(match.price) * currentRequiredQty;
                        if (!bestOption || cost < bestOption.total || (cost === bestOption.total && Number(match.price) < bestOption.priceUnit)) {
                            bestOption = {
                                supplier: supplier.supplierName,
                                priceUnit: Number(match.price),
                                total: cost,
                                itemName: match.name,
                                quality: match.quality,
                                capacity: match.capacity,
                                requiredQty: currentRequiredQty
                            };
                        }
                    }
                });

                if (bestOption) {
                    totalCheapest += bestOption.total;
                    supplierTotals[bestOption.supplier] += bestOption.total;
                    breakdown.push({
                        reqId: req.id,
                        serviceName: req.service,
                        category: component.category,
                        required: component.keyword,
                        ruleDesc: component.rule.desc,
                        participants: req.quantity,
                        requiredQty: requiredQty,
                        foundItem: bestOption.itemName,
                        targetQuality: targetQuality,
                        foundQuality: bestOption.quality,
                        supplier: bestOption.supplier,
                        unitPrice: bestOption.priceUnit,
                        subtotal: bestOption.total
                    });
                } else {
                    breakdown.push({
                        reqId: req.id,
                        serviceName: req.service,
                        category: component.category,
                        required: component.keyword,
                        ruleDesc: component.rule.desc,
                        participants: req.quantity,
                        requiredQty: requiredQty,
                        foundItem: "NOT FOUND",
                        targetQuality: targetQuality,
                        foundQuality: "-",
                        supplier: "-",
                        unitPrice: 0,
                        subtotal: 0
                    });
                }
            });
        });

        setAnalysisResult({ breakdown, totalCheapest, supplierTotals });

        // Calculate Unit Costs for each service
        const newUnitCosts = {};
        requests.forEach(req => {
            // Find all items for this request in the breakdown
            const items = breakdown.filter(b => b.reqId === req.id);
            const totalCost = items.reduce((sum, item) => sum + item.subtotal, 0);
            const unitCost = req.quantity > 0 ? totalCost / req.quantity : 0;
            newUnitCosts[req.service] = unitCost;
        });
        setServiceUnitCosts(newUnitCosts);

    }, [requests, supplierData, setServiceUnitCosts]);

    // Checklist Logic
    const toggleService = (serviceName) => {
        setRequests(prev => {
            const exists = prev.find(r => r.service === serviceName);
            if (exists) {
                return prev.filter(r => r.service !== serviceName);
            } else {
                // Initialize with default values
                const recipe = SERVICE_RECIPES[serviceName] || [];
                const defaultQualityMap = {};
                recipe.forEach(item => defaultQualityMap[item.keyword] = 1);

                return [...prev, {
                    id: Date.now() + Math.random(),
                    service: serviceName,
                    baseQuality: 1,
                    quantity: 40,
                    qualityMap: defaultQualityMap
                }];
            }
        });
    };

    const updateRequest = (serviceName, field, value) => {
        setRequests(prev => prev.map(r => {
            if (r.service === serviceName) {
                const updated = { ...r, [field]: value };
                // If baseQuality changes, update all items in qualityMap
                if (field === 'baseQuality') {
                    const newMap = {};
                    const recipe = SERVICE_RECIPES[serviceName] || [];
                    recipe.forEach(item => newMap[item.keyword] = parseInt(value));
                    updated.qualityMap = newMap;
                }
                return updated;
            }
            return r;
        }));
    };

    const updateQualityMap = (serviceName, keyword, quality) => {
        setRequests(prev => prev.map(r => {
            if (r.service === serviceName) {
                return {
                    ...r,
                    qualityMap: {
                        ...r.qualityMap,
                        [keyword]: parseInt(quality)
                    }
                };
            }
            return r;
        }));
    };

    const selectAll = () => {
        const allServices = Object.keys(SERVICE_RECIPES).map(name => {
            const existing = requests.find(r => r.service === name);
            if (existing) return existing;

            const recipe = SERVICE_RECIPES[name] || [];
            const defaultQualityMap = {};
            recipe.forEach(item => defaultQualityMap[item.keyword] = 1);

            return {
                id: Date.now() + Math.random(),
                service: name,
                baseQuality: 1,
                quantity: 40,
                qualityMap: defaultQualityMap
            };
        });
        setRequests(allServices);
    };

    const deselectAll = () => {
        setRequests([]);
    };

    const toggleExpand = (serviceName) => {
        setExpandedServices(prev => ({
            ...prev,
            [serviceName]: !prev[serviceName]
        }));
    };

    const setAllQuality = (serviceName, quality) => {
        setRequests(prev => prev.map(r => {
            if (r.service === serviceName) {
                const newMap = { ...r.qualityMap };
                const recipe = SERVICE_RECIPES[serviceName] || [];
                recipe.forEach(item => {
                    newMap[item.keyword] = parseInt(quality);
                });
                return { ...r, qualityMap: newMap };
            }
            return r;
        }));
    };

    // JSON Import/Export
    const exportRequests = () => {
        const dataStr = JSON.stringify(requests, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `purchasing_list_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const importRequests = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const parsed = JSON.parse(event.target.result);
                if (Array.isArray(parsed)) {
                    setRequests(parsed);
                } else {
                    alert(t("purchasing.invalid_json"));
                }
            } catch (err) {
                alert(t("purchasing.parse_fail"));
            }
        };
        reader.readAsText(file);
    };

    // Smart Optimization Logic
    const handleSmartOptimize = () => {
        if (!supplierData.length || !requests.length) return;

        let optimizedCount = 0;
        let totalSavings = 0;
        const newRequests = JSON.parse(JSON.stringify(requests)); // Deep copy

        newRequests.forEach(req => {
            const recipe = SERVICE_RECIPES[req.service] || [];

            recipe.forEach(component => {
                const normalize = (str) => str.toLowerCase().replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim();
                const targetKeyword = normalize(component.keyword);

                // Get current selection details
                const currentQuality = req.qualityMap && req.qualityMap[component.keyword]
                    ? req.qualityMap[component.keyword]
                    : req.baseQuality;

                // Find all matching items from all suppliers
                let allMatches = [];
                supplierData.forEach(supplier => {
                    const matches = supplier.items.filter(item =>
                        item.name && normalize(item.name).includes(targetKeyword)
                    );
                    matches.forEach(m => allMatches.push({ ...m, supplier: supplier.supplierName }));
                });

                // Find current price (best price for current quality)
                const currentMatches = allMatches.filter(m => m.quality === currentQuality);
                const currentPrice = currentMatches.length > 0
                    ? Math.min(...currentMatches.map(m => m.price))
                    : Infinity;

                if (currentPrice === Infinity) return;

                // Find better options: Higher Quality AND Lower Price
                const betterOptions = allMatches.filter(m =>
                    m.quality > currentQuality && m.price < currentPrice
                );

                if (betterOptions.length > 0) {
                    // Sort by price ascending (cheapest first), then quality descending (best quality for that price)
                    betterOptions.sort((a, b) => a.price - b.price || b.quality - a.quality);
                    const bestOption = betterOptions[0];

                    // Apply optimization
                    if (!req.qualityMap) req.qualityMap = {};
                    req.qualityMap[component.keyword] = bestOption.quality;

                    optimizedCount++;
                    // Calculate savings per unit * quantity (approximate)
                    // Note: This is a rough estimate because quantity logic (per_group etc) is complex
                    // But for the alert it's fine to show unit price difference
                    totalSavings += (currentPrice - bestOption.price);
                }
            });
        });

        if (optimizedCount > 0) {
            setRequests(newRequests);
            alert(t("purchasing.optimize_done").replace("{count}", optimizedCount).replace("{savings}", totalSavings.toLocaleString()));
        } else {
            alert(t("purchasing.optimize_none"));
        }
    };

    // CSV Export for Purchasing List
    const exportPurchasingListCSV = () => {
        if (!analysisResult || !analysisResult.breakdown) {
            alert(t("purchasing.no_analysis"));
            return;
        }

        // Filter out items with zero quantity and format for CSV
        const csvRows = [];
        csvRows.push(['Supplier', 'Resource name', 'Quality', 'Price', 'Order', 'Value', 'InputID']);

        // Create a map of purchased items for quick lookup
        // Key: Supplier|Name|Quality
        const purchasedItems = new Map();
        analysisResult.breakdown
            .filter(item => item.requiredQty > 0 && item.supplier !== "-")
            .forEach(item => {
                const key = `${item.supplier}|${item.foundItem}|${item.foundQuality}`;

                if (purchasedItems.has(key)) {
                    const existing = purchasedItems.get(key);
                    purchasedItems.set(key, {
                        qty: existing.qty + item.requiredQty,
                        subtotal: existing.subtotal + item.subtotal
                    });
                } else {
                    purchasedItems.set(key, {
                        qty: item.requiredQty,
                        subtotal: item.subtotal
                    });
                }
            });

        // Only export items that are actually being purchased (qty > 0)
        supplierData.forEach(supplier => {
            supplier.items.forEach(item => {
                const key = `${supplier.supplierName}|${item.name}|${item.quality}`;
                const purchased = purchasedItems.get(key);

                // Only include items with non-zero order quantity
                if (purchased && purchased.qty > 0) {
                    csvRows.push([
                        supplier.supplierName,
                        item.name,
                        item.quality,
                        item.price,
                        purchased.qty,
                        purchased.subtotal,
                        item.inputId || ""
                    ]);
                }
            });
        });

        // Convert to CSV string
        const csvContent = csvRows.map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `purchasing_order_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-4 space-y-6">
                <Card className="p-5 border-l-4 border-l-blue-500">
                    <div className="flex items-center gap-2 mb-4">
                        <FileUp className="h-5 w-5 text-blue-600" />
                        <h3 className="font-semibold text-lg">{t("purchasing.step1")}</h3>
                    </div>
                    <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg p-6 text-center relative">
                        <input type="file" multiple accept=".csv, .xlsx, .xls" onChange={onLocalFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                        <div className="pointer-events-none">
                            <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                            <p className="text-sm text-slate-500 font-medium">{t("purchasing.dropzone")}</p>
                        </div>
                    </div>
                    {supplierData.length > 0 && (
                        <div className="mt-4">
                            <div className="flex justify-between items-end mb-1">
                                <div className="flex items-center gap-2">
                                    <p className="text-xs font-semibold text-slate-500 uppercase">{t("purchasing.loaded")} ({supplierData.length})</p>
                                    {supplierData.every(s => s.isDefault) && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-50 text-sky-600 border border-sky-100">{t('purchasing.default_data', 'Default')}</span>
                                    )}
                                </div>
                                <button onClick={() => setSupplierData(DEFAULT_SUPPLIER_DATA)} className="text-xs text-red-400 hover:text-red-600">{t("purchasing.clear")}</button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {supplierData.map((s, i) => (
                                    <span key={i} className={`inline-flex items-center px-2 py-1 rounded text-xs border ${s.isDefault ? 'bg-sky-50 text-sky-700 border-sky-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                                        <CheckCircle2 className="h-3 w-3 mr-1" /> {s.supplierName}{s.isDefault ? ' ★' : ''}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </Card>

                <Card className="p-5 border-l-4 border-l-indigo-500 sticky top-20">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="h-5 w-5 text-indigo-600" >📋</div>
                            <h3 className="font-semibold text-lg">{t("purchasing.step2")}</h3>
                        </div>
                        <div className="flex gap-1">
                            <label className="cursor-pointer p-1 hover:bg-slate-100 rounded" title={t("purchasing.import_list")}>
                                <Upload className="h-4 w-4 text-slate-500" />
                                <input type="file" accept=".json" onChange={importRequests} className="hidden" />
                            </label>
                            <button onClick={exportRequests} className="p-1 hover:bg-slate-100 rounded" title={t("purchasing.export_list")}>
                                <Download className="h-4 w-4 text-slate-500" />
                            </button>
                        </div>
                    </div>

                    {/* Checklist Controls */}
                    <div className="flex gap-2 mb-4">
                        <Button size="sm" variant="secondary" onClick={selectAll} className="flex-1">{t("purchasing.select_all")}</Button>
                        <Button size="sm" variant="outline" onClick={deselectAll} className="flex-1">{t("purchasing.deselect_all")}</Button>
                    </div>

                    <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto custom-scrollbar pr-1">
                        {Object.keys(SERVICE_RECIPES).map((serviceName) => {
                            const request = requests.find(r => r.service === serviceName);
                            const isSelected = !!request;
                            const isExpanded = expandedServices[serviceName];

                            return (
                                <div key={serviceName} className={`border rounded-lg transition-all ${isSelected ? 'border-indigo-300 bg-indigo-50/30' : 'border-slate-200 bg-white'}`}>
                                    <div className="p-3 flex items-start gap-3">
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => toggleService(serviceName)}
                                            className="mt-1 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                                        />
                                        <div className="flex-grow">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className={`font-medium text-sm ${isSelected ? 'text-indigo-900' : 'text-slate-600'}`}>{t(`services.${serviceName}`) === `services.${serviceName}` ? serviceName : t(`services.${serviceName}`)}</span>
                                                {isSelected && (
                                                    <button onClick={() => toggleExpand(serviceName)} className="text-slate-400 hover:text-indigo-600">
                                                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                                    </button>
                                                )}
                                            </div>

                                            {isSelected && (
                                                <div className="grid grid-cols-2 gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                                    <div>
                                                        <Label className="text-[10px]">{t("purchasing.pax")}</Label>
                                                        <Input
                                                            type="number"
                                                            className="h-8 text-sm"
                                                            value={request.quantity}
                                                            onChange={(e) => updateRequest(serviceName, 'quantity', parseInt(e.target.value) || 0)}
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label className="text-[10px]">{t("purchasing.base_quality")}</Label>
                                                        <Select
                                                            className="h-8 text-sm py-0"
                                                            value={request.baseQuality}
                                                            onChange={(e) => updateRequest(serviceName, 'baseQuality', e.target.value)}
                                                            options={[{ label: "★", value: 1 }, { label: "★★", value: 2 }, { label: "★★★", value: 3 }]}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Expanded Details */}
                                    {isSelected && isExpanded && (
                                        <div className="border-t border-indigo-100 p-3 bg-white/50 rounded-b-lg">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <Settings2 className="h-3 w-3 text-slate-500" />
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t("purchasing.quality_settings")}</span>
                                                </div>
                                                <div className="flex gap-1">
                                                    <button onClick={() => setAllQuality(serviceName, 1)} className="text-[10px] px-1.5 py-0.5 bg-white border border-slate-200 rounded hover:bg-slate-50 text-slate-600">All ★</button>
                                                    <button onClick={() => setAllQuality(serviceName, 2)} className="text-[10px] px-1.5 py-0.5 bg-white border border-slate-200 rounded hover:bg-slate-50 text-slate-600">All ★★</button>
                                                    <button onClick={() => setAllQuality(serviceName, 3)} className="text-[10px] px-1.5 py-0.5 bg-white border border-slate-200 rounded hover:bg-slate-50 text-slate-600">All ★★★</button>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                {SERVICE_RECIPES[serviceName].map((item, idx) => (
                                                    <div key={idx} className="flex items-center justify-between text-xs">
                                                        <span className="text-slate-600 truncate flex-1 mr-2" title={item.keyword}>
                                                            {t(`services.${item.keyword}`) === `services.${item.keyword}` ? item.keyword.split("-")[0].trim() : t(`services.${item.keyword}`)}
                                                        </span>
                                                        <select
                                                            value={request.qualityMap?.[item.keyword] || 1}
                                                            onChange={(e) => updateQualityMap(serviceName, item.keyword, e.target.value)}
                                                            className="border rounded px-1 py-0.5 text-slate-700 focus:ring-1 focus:ring-indigo-500 w-14 text-xs shrink-0"
                                                        >
                                                            <option value="1">★</option>
                                                            <option value="2">★★</option>
                                                            <option value="3">★★★</option>
                                                        </select>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </Card>
            </div>

            <div className="lg:col-span-8">
                {analysisResult ? (
                    <Card className="p-6 h-full flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="font-bold text-xl text-slate-800 flex items-center gap-2"><BarChart3 className="h-6 w-6" /> {t("purchasing.report_title")}</h2>
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={handleSmartOptimize}
                                    className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-sm text-sm font-medium"
                                    title={t("purchasing.optimize_tooltip")}
                                >
                                    <Sparkles className="h-4 w-4" />
                                    {t("purchasing.optimize_btn")}
                                </button>
                                <button
                                    onClick={exportPurchasingListCSV}
                                    className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-sm text-sm font-medium"
                                >
                                    <Download className="h-4 w-4" />
                                    {t("purchasing.export_csv")}
                                </button>
                                <div className="text-right">
                                    <p className="text-xs text-slate-500 uppercase">{t("purchasing.total_amount")}</p>
                                    <p className="text-2xl font-bold text-blue-900">{analysisResult.totalCheapest.toLocaleString()} GBP</p>
                                </div>
                            </div>
                        </div>
                        <div className="overflow-x-auto border rounded-lg flex-grow">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-100 text-slate-700 uppercase font-semibold text-xs sticky top-0">
                                    <tr>
                                        <th className="px-3 py-3">{t("purchasing.table_service")}</th>
                                        <th className="px-3 py-3">{t("purchasing.table_item")}</th>
                                        <th className="px-3 py-3">{t("purchasing.table_quality")}</th>
                                        <th className="px-3 py-3 text-right">{t("purchasing.table_qty")}</th>
                                        <th className="px-3 py-3">{t("purchasing.table_supplier")}</th>
                                        <th className="px-3 py-3 text-right">{t("purchasing.table_subtotal")}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 bg-white">
                                    {analysisResult.breakdown.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50">
                                            <td className="px-3 py-3 text-xs font-medium text-indigo-600">{t(`services.${item.serviceName}`) === `services.${item.serviceName}` ? item.serviceName : t(`services.${item.serviceName}`)} <br /><span className="text-slate-400 font-normal">{item.participants} pax</span></td>
                                            <td className="px-3 py-3 font-medium">{item.foundItem.includes("NOT FOUND") ? item.required : item.foundItem}</td>
                                            <td className="px-3 py-3 text-amber-500 text-xs">
                                                {"★".repeat(item.foundQuality === "-" ? 0 : item.foundQuality)}
                                                {item.foundQuality !== "-" && item.foundQuality !== item.targetQuality && (
                                                    <span className="text-slate-400 ml-1 text-[10px]">({t("purchasing.need")} {item.targetQuality})</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-3 text-right">{item.requiredQty.toLocaleString()}</td>
                                            <td className="px-3 py-3 text-blue-700 text-xs">{item.supplier} <br /><span className="text-slate-400">@ {item.unitPrice.toLocaleString()}</span></td>
                                            <td className="px-3 py-3 text-right font-mono">{item.subtotal.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center bg-white rounded-lg border-2 border-dashed border-slate-200 text-slate-400 p-10">
                        <ShoppingCart className="h-12 w-12 text-slate-300 mb-4" />
                        <h3 className="text-lg font-medium text-slate-600">{t("purchasing.ready_title")}</h3>
                        <p>{t("purchasing.ready_desc")}</p>
                    </div>
                )}
            </div>
        </div>
    );
};
