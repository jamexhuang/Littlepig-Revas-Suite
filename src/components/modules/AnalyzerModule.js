import React, { useState, useMemo } from 'react';
import {
    TrendingUp, FolderOpen, Save, Upload, Loader2, Users, DollarSign,
    Map as MapIcon, Globe2, AlertCircle, Building2, CheckSquare,
    CheckCircle2, AlertTriangle, ArrowUpDown, Info, Calculator
} from 'lucide-react';
import {
    ResponsiveContainer, Tooltip as RechartsTooltip,
    Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { read, utils } from 'xlsx';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { SERVICE_CATEGORIES, SERVICE_TIMES, SUGGESTED_PRICES, DEMAND_DATA } from '@/data/constants';
import { useI18n } from '@/i18n/I18nContext';

export const AnalyzerModule = ({
    services,
    setServices,
    serviceStates,
    setServiceStates,
    opEx,
    setOpEx,
    hrConfig,
    setHrConfig,
    resourceCosts,
    handleFileUpload,
    importConfig,
    exportConfig,
    forecastConfig,
    setForecastConfig,
    serviceUnitCosts
}) => {
    const { t } = useI18n();
    const [isDragOver, setIsDragOver] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [chartSort, setChartSort] = useState('revenue');
    const [sortDir, setSortDir] = useState('desc');

    // Demand Forecasting Logic
    const calculateForecast = (serviceName) => {
        const data = DEMAND_DATA[serviceName];
        if (!data) return null;

        const monthlyBase = data.annualDemand / 12;

        const seasonality = data.seasonality[forecastConfig.selectedMonth - 1]; // 0-indexed array
        const riskMultiplier = 1 - (forecastConfig.riskFactor / 100);

        return Math.round(monthlyBase * seasonality * riskMultiplier);
    };

    const applyForecast = (serviceName) => {
        const forecast = calculateForecast(serviceName);
        if (forecast !== null) {
            setServiceStates(prev => ({
                ...prev,
                [serviceName]: { ...prev[serviceName], participants: forecast }
            }));
        }
    };

    const toggleAllServices = (checked) => {
        setServiceStates(prev => {
            const next = { ...prev };
            Object.keys(next).forEach(key => {
                next[key] = { ...next[key], isSelected: checked };
            });
            return next;
        });
    };

    const onDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);
        if (handleFileUpload) {
            handleFileUpload(e);
        }
    };

    const demandStats = useMemo(() => {
        let domesticHoursRequired = 0;
        let internationalHoursRequired = 0;

        services.forEach(s => {
            const state = serviceStates[s.name];
            if (state && state.isSelected) {
                const timeFactor = SERVICE_TIMES[s.name] || 1;
                const totalHours = timeFactor * state.participants;
                const category = SERVICE_CATEGORIES[s.name] || 'Domestic';

                if (category === 'Domestic') {
                    domesticHoursRequired += totalHours;
                } else {
                    internationalHoursRequired += totalHours;
                }
            }
        });
        return { domesticHoursRequired, internationalHoursRequired };
    }, [services, serviceStates]);

    // --- Integrated Calculation: Financials ---
    const report = useMemo(() => {
        let totalRevenue = 0;
        let totalCOGS = 0;
        let usingRealCosts = false;
        let potentialSavings = 0;
        let savingsDetails = [];

        const serviceBreakdowns = services
            .filter(s => serviceStates[s.name]?.isSelected)
            .map(s => {
                const state = serviceStates[s.name];
                const pax = state.participants;
                const price = state.price;

                let serviceCost = 0;
                let marketCost = 0; // Cost if using best suppliers
                let isEstimated = false;

                // Calculate Market Cost (Best Supplier)
                if (s.resources && s.resources.length > 0) {
                    s.resources.forEach(res => {
                        const costData = resourceCosts[res.keyword || res.name];
                        let unitCost = 0;
                        let capacity = null;

                        if (typeof costData === 'object' && costData !== null) {
                            unitCost = costData.price;
                            capacity = costData.capacity;
                        } else if (costData !== undefined) {
                            unitCost = costData;
                        } else {
                            unitCost = res.unitPrice || 0;
                        }

                        let totalItemCost = 0;
                        if (res.rule.type === 'per_person') {
                            totalItemCost = unitCost * res.rule.val * pax;
                        } else if (res.rule.type === 'per_group') {
                            // Use parsed capacity if available, otherwise use rule default
                            const groupSize = capacity || res.rule.val;
                            const groups = Math.ceil(pax / groupSize);
                            totalItemCost = unitCost * groups;
                        } else if (res.rule.type === 'variable_simple') {
                            totalItemCost = unitCost * pax;
                        } else if (res.rule.type === 'step') {
                            // Use parsed capacity if available (assuming step factor is similar to group size)
                            const stepSize = capacity || res.rule.factor;
                            const groups = Math.ceil(pax / stepSize);
                            totalItemCost = unitCost * groups;
                        }
                        marketCost += totalItemCost;
                    });
                }

                // Determine Actual Cost Used
                if (serviceUnitCosts && serviceUnitCosts[s.name] !== undefined && serviceUnitCosts[s.name] > 0) {
                    serviceCost = serviceUnitCosts[s.name] * pax;
                    usingRealCosts = true;
                } else if (s.realCost && s.realCost > 0) {
                    serviceCost = s.realCost;
                    usingRealCosts = true;
                } else if (marketCost > 0) {
                    serviceCost = marketCost;
                    usingRealCosts = true;
                    // If we are using market cost, it means we don't have realCost from CSV, so no savings to compare against CSV
                } else {
                    // Fallback
                    serviceCost = price * 0.6 * pax;
                    isEstimated = true;
                }

                // Check for Savings (Only if we have Real Cost from CSV AND Market Cost is lower)
                if (s.realCost > 0 && marketCost > 0 && marketCost < s.realCost) {
                    const diff = s.realCost - marketCost;
                    potentialSavings += diff;
                    savingsDetails.push({ name: s.name, current: s.realCost, market: marketCost, save: diff });
                }

                const revenue = price * pax;
                const grossProfit = revenue - serviceCost;
                const margin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
                const unitCost = pax > 0 ? serviceCost / pax : 0;

                totalRevenue += revenue;
                totalCOGS += serviceCost;

                return {
                    name: s.name,
                    category: SERVICE_CATEGORIES[s.name] || 'Domestic',
                    pax,
                    price,
                    revenue,
                    cost: serviceCost,
                    unitCost: unitCost,
                    grossProfit,
                    margin,
                    isEstimated
                };
            });

        const grossProfit = totalRevenue - totalCOGS;
        const totalOpEx =
            (hrConfig.totalCost || 0) +
            (opEx.admin || 0) +
            (opEx.investment || 0) +
            (opEx.marketing || 0);

        const netProfit = grossProfit - totalOpEx;
        const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
        const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

        return {
            totalRevenue,
            totalCOGS,
            grossProfit,
            totalOpEx,
            netProfit,
            grossMargin,
            netMargin,
            serviceBreakdowns,
            usingRealCosts,
            potentialSavings,
            savingsDetails
        };
    }, [services, serviceStates, hrConfig, opEx, resourceCosts]);

    const profitData = useMemo(() => {
        let data = report.serviceBreakdowns.map(s => ({
            name: s.name,
            Profit: s.grossProfit,
            Cost: s.cost,
            Revenue: s.revenue,
            Margin: s.margin
        }));

        if (chartSort === 'profit') {
            data.sort((a, b) => sortDir === 'desc' ? b.Profit - a.Profit : a.Profit - b.Profit);
        } else if (chartSort === 'margin') {
            data.sort((a, b) => sortDir === 'desc' ? b.Margin - a.Margin : a.Margin - b.Margin);
        } else {
            data.sort((a, b) => sortDir === 'desc' ? b.Revenue - a.Revenue : a.Revenue - b.Revenue);
        }

        return data;
    }, [report.serviceBreakdowns, chartSort, sortDir]);

    return (
        <div className={`transition-colors ${isDragOver ? 'bg-blue-50' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={onDrop}
        >
            <header className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <TrendingUp className="w-7 h-7 text-blue-600" />
                        {t('analyzer.title')}
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">
                        {t('analyzer.desc')}
                    </p>
                </div>
                <div className="flex gap-2">
                    <label className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors shadow-sm text-sm font-medium">
                        <FolderOpen className="w-4 h-4" />
                        <span>{t('analyzer.import_config')}</span>
                        <input type="file" accept=".json" onChange={importConfig} className="hidden" />
                    </label>
                    <button onClick={exportConfig} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors shadow-sm text-sm font-medium">
                        <Save className="w-4 h-4" />
                        <span>{t('analyzer.export_config')}</span>
                    </button>
                    <label className={`flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer transition-colors shadow-sm ${isProcessing ? 'opacity-70 pointer-events-none' : ''}`}>
                        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        <span>{t('analyzer.load_csv')}</span>
                        <input type="file" accept=".csv, .xlsx" onChange={handleFileUpload} className="hidden" />
                    </label>
                </div>
            </header>

            {/* Demand Forecasting Section */}
            <Card className="mb-6 p-6 border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <Calculator className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-slate-800">{t('analyzer.forecast_title')}</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <Label className="mb-2 block text-sm font-medium text-slate-700">{t('analyzer.select_month')}</Label>
                        <Select
                            value={forecastConfig.selectedMonth}
                            onChange={(e) => setForecastConfig({ ...forecastConfig, selectedMonth: parseInt(e.target.value) })}
                            className="w-full"
                            options={Array.from({ length: 12 }, (_, i) => ({
                                value: i + 1,
                                label: `${i + 1} ${t('analyzer.month')}`
                            }))}
                        />
                    </div>
                    <div>
                        <Label className="mb-2 block text-sm font-medium text-slate-700">{t('analyzer.risk_factor')}</Label>
                        <div className="flex items-center gap-2">
                            <Input
                                type="number"
                                min="0"
                                max="100"
                                value={forecastConfig.riskFactor}
                                onChange={(e) => setForecastConfig({ ...forecastConfig, riskFactor: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) })}
                                className="w-full"
                            />
                            <span className="text-slate-500">%</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{t('analyzer.risk_eg')}</p>
                    </div>
                    <div className="flex items-end">
                        <div className="bg-blue-50 text-blue-800 px-4 py-3 rounded-lg text-sm w-full">
                            <p className="font-semibold mb-1">{t('analyzer.forecast_formula')}</p>
                            <p>{t('analyzer.forecast_desc')}</p>
                        </div>
                    </div>
                </div>
            </Card>

            {
                report.potentialSavings > 0 && (
                    <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-start gap-3">
                        <Info className="w-5 h-5 text-emerald-600 mt-0.5" />
                        <div>
                            <h4 className="font-bold text-emerald-800">{t('analyzer.saving_opp_title')}</h4>
                            <p className="text-sm text-emerald-700 mb-2">
                                {t('analyzer.saving_opp_desc')}
                                <span className="font-bold text-lg">${report.potentialSavings.toLocaleString()}</span>.
                            </p>
                            <ul className="text-xs text-emerald-600 space-y-1 list-disc list-inside">
                                {report.savingsDetails.map((d, i) => (
                                    <li key={i}>
                                        <strong>{d.name}</strong>: {t('analyzer.saving_current')} ${d.current.toLocaleString()} → {t('analyzer.saving_best')} ${d.market.toLocaleString()} ({t('analyzer.saving_save')} ${d.save.toLocaleString()})
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )
            }

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* Left Panel: Settings */}
                <div className="lg:col-span-7 space-y-6">

                    {/* 1. HR Management (Split Domestic / International) */}
                    <Card className="p-5 border-l-4 border-l-orange-500">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                                <Users className="w-5 h-5 text-orange-600" /> {t('analyzer.hr_title')}
                            </h3>
                        </div>

                        {/* Top Row: Cost */}
                        <div className="bg-orange-50 p-3 rounded-lg border border-orange-100 mb-4">
                            <Label>{t('analyzer.total_hr_cost')}</Label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-400" />
                                <input
                                    type="number"
                                    className="w-full pl-9 p-2 bg-white border border-orange-200 rounded font-bold text-slate-700 focus:ring-2 focus:ring-orange-500 outline-none"
                                    value={hrConfig.totalCost}
                                    onChange={(e) => setHrConfig({ ...hrConfig, totalCost: parseFloat(e.target.value) || 0 })}
                                />
                            </div>
                        </div>

                        {/* Hours Input Split */}
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                                <Label>{t('analyzer.domestic_hours')}</Label>
                                <div className="relative">
                                    <MapIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
                                    <input
                                        type="number"
                                        className="w-full pl-9 p-2 bg-white border border-blue-200 rounded font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={hrConfig.totalHoursDomestic}
                                        onChange={(e) => setHrConfig({ ...hrConfig, totalHoursDomestic: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>
                            <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                                <Label>{t('analyzer.intl_hours')}</Label>
                                <div className="relative">
                                    <Globe2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
                                    <input
                                        type="number"
                                        className="w-full pl-9 p-2 bg-white border border-indigo-200 rounded font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={hrConfig.totalHoursInternational}
                                        onChange={(e) => setHrConfig({ ...hrConfig, totalHoursInternational: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Capacity Utilization Split */}
                        <div className="space-y-2">
                            {/* Domestic Utilization */}
                            <div className="flex items-center justify-between p-2 bg-white rounded border border-slate-200 text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                    <span className="text-slate-600 font-medium">Domestic Load</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-slate-500 text-xs">{demandStats.domesticHoursRequired.toFixed(1)} / {hrConfig.totalHoursDomestic} h</span>
                                    {hrConfig.totalHoursDomestic > 0 ? (
                                        <span className={`font-bold ${demandStats.domesticHoursRequired > hrConfig.totalHoursDomestic ? 'text-red-600' : 'text-emerald-600'}`}>
                                            {((demandStats.domesticHoursRequired / hrConfig.totalHoursDomestic) * 100).toFixed(1)}%
                                        </span>
                                    ) : <span className="text-slate-300">-</span>}
                                </div>
                            </div>
                            {demandStats.domesticHoursRequired > hrConfig.totalHoursDomestic && (
                                <div className="text-xs text-red-600 bg-red-50 p-1 px-2 rounded flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> {t('analyzer.domestic_warn')}
                                </div>
                            )}

                            {/* International Utilization */}
                            <div className="flex items-center justify-between p-2 bg-white rounded border border-slate-200 text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                                    <span className="text-slate-600 font-medium">International Load</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-slate-500 text-xs">{demandStats.internationalHoursRequired.toFixed(1)} / {hrConfig.totalHoursInternational} h</span>
                                    {hrConfig.totalHoursInternational > 0 ? (
                                        <span className={`font-bold ${demandStats.internationalHoursRequired > hrConfig.totalHoursInternational ? 'text-red-600' : 'text-emerald-600'}`}>
                                            {((demandStats.internationalHoursRequired / hrConfig.totalHoursInternational) * 100).toFixed(1)}%
                                        </span>
                                    ) : <span className="text-slate-300">-</span>}
                                </div>
                            </div>
                            {demandStats.internationalHoursRequired > hrConfig.totalHoursInternational && (
                                <div className="text-xs text-red-600 bg-red-50 p-1 px-2 rounded flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> {t('analyzer.intl_warn')}
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* 2. OpEx Breakdown */}
                    <Card className="p-5 border-l-4 border-l-slate-500">
                        <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
                            <Building2 className="w-5 h-5 text-slate-600" /> {t('analyzer.opex_title')}
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>{t('analyzer.admin')}</Label>
                                <Input type="number" value={opEx.admin} onChange={(e) => setOpEx({ ...opEx, admin: parseFloat(e.target.value) || 0 })} />
                            </div>
                            <div>
                                <Label>{t('analyzer.capital')}</Label>
                                <Input type="number" value={opEx.investment} onChange={(e) => setOpEx({ ...opEx, investment: parseFloat(e.target.value) || 0 })} />
                            </div>
                            <div>
                                <Label>{t('analyzer.marketing')}</Label>
                                <Input type="number" value={opEx.marketing} onChange={(e) => setOpEx({ ...opEx, marketing: parseFloat(e.target.value) || 0 })} />
                            </div>
                            <div className="flex flex-col justify-end">
                                <div className="p-2 bg-slate-100 rounded text-right">
                                    <span className="text-xs text-slate-500">{t('analyzer.total_fixed')}</span>
                                    <div className="text-xl font-bold text-red-700">${report.totalOpEx.toLocaleString()}</div>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* 3. Service Selection Table */}

                </div>

                {/* Right Panel: Global Report */}
                <div className="lg:col-span-5 space-y-6">

                    {/* KPI Cards */}
                    <div className="grid grid-cols-2 gap-4">
                        <Card className="p-4 bg-blue-600 text-white border-none">
                            <p className="text-xs opacity-80 uppercase mb-1">{t('analyzer.est_rev')}</p>
                            <p className="text-2xl font-bold">${report.totalRevenue.toLocaleString()}</p>
                        </Card>
                        <Card className="p-4">
                            <p className="text-xs text-slate-500 uppercase mb-1">{t('analyzer.net_profit')}</p>
                            <p className={`text-2xl font-bold ${report.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                ${report.netProfit.toLocaleString()}
                            </p>
                        </Card>
                    </div>

                    {/* Margins */}
                    <Card className="p-5">
                        <h4 className="font-bold text-sm text-slate-700 mb-4 flex justify-between items-center">
                            {t('analyzer.margin_analysis')}
                            {report.usingRealCosts ? (
                                <span className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> {t('analyzer.use_real')}
                                </span>
                            ) : (
                                <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-1 rounded flex items-center gap-1" title={t('analyzer.use_est_title')}>
                                    <AlertTriangle className="w-3 h-3" /> {t('analyzer.use_est')}
                                </span>
                            )}
                        </h4>
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span>{t('analyzer.gross_margin')}</span>
                                    <span className="font-bold">{report.grossMargin.toFixed(1)}%</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2">
                                    <div className={`h-2 rounded-full ${report.usingRealCosts ? 'bg-blue-500' : 'bg-amber-400'}`} style={{ width: `${Math.max(0, Math.min(100, report.grossMargin))}%` }}></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span>{t('analyzer.net_margin')}</span>
                                    <span className={`font-bold ${report.netMargin < 0 ? 'text-red-500' : 'text-emerald-500'}`}>{report.netMargin.toFixed(1)}%</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2">
                                    <div className={`h-2 rounded-full ${report.netMargin < 0 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${Math.max(0, Math.min(100, report.netMargin))}%` }}></div>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Charts - Updated to Stacked Bar with Sorting */}
                    {profitData.length > 0 && (
                        <Card className="p-5">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="font-bold text-sm text-slate-700">{t('analyzer.service_struct')}</h4>
                                <div className="flex items-center gap-2">
                                    <select className="text-xs border rounded p-1" value={chartSort} onChange={(e) => setChartSort(e.target.value)}>
                                        <option value="revenue">{t('analyzer.sort_rev')}</option>
                                        <option value="profit">{t('analyzer.sort_profit')}</option>
                                        <option value="margin">{t('analyzer.sort_margin')}</option>
                                    </select>
                                    <button onClick={() => setSortDir(sortDir === 'desc' ? 'asc' : 'desc')} className="p-1 hover:bg-slate-100 rounded">
                                        <ArrowUpDown className="w-3 h-3 text-slate-500" />
                                    </button>
                                </div>
                            </div>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart key={chartSort + sortDir} data={profitData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                        <XAxis type="number" />
                                        <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
                                        <RechartsTooltip
                                            formatter={(value, name) => {
                                                if (name === 'Cost' || name === t('analyzer.chart_cost')) return [`$${value.toLocaleString()}`, t('analyzer.chart_cost')];
                                                if (name === 'Profit' || name === t('analyzer.chart_profit')) return [`$${value.toLocaleString()}`, t('analyzer.chart_profit')];
                                                return [`$${value.toLocaleString()}`, name];
                                            }}
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    const data = payload[0].payload;
                                                    return (
                                                        <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200">
                                                            <p className="font-bold text-slate-900 mb-2">{t(data.name, data.name)}</p>
                                                            <div className="space-y-1 text-sm">
                                                                <div className="flex justify-between gap-4">
                                                                    <span className="text-slate-600">{t('analyzer.chart_cost')}:</span>
                                                                    <span className="font-semibold text-red-600">${data.Cost.toLocaleString()}</span>
                                                                </div>
                                                                <div className="flex justify-between gap-4">
                                                                    <span className="text-slate-600">{t('analyzer.chart_profit')}:</span>
                                                                    <span className="font-semibold text-emerald-600">${data.Profit.toLocaleString()}</span>
                                                                </div>
                                                                <div className="flex justify-between gap-4 pt-1 border-t border-slate-200">
                                                                    <span className="text-slate-600">{t('analyzer.chart_margin')}</span>
                                                                    <span className="font-bold text-blue-600">{data.Margin.toFixed(1)}%</span>
                                                                </div>
                                                                <div className="flex justify-between gap-4">
                                                                    <span className="text-slate-600">{t('analyzer.chart_rev')}</span>
                                                                    <span className="font-semibold text-slate-900">${data.Revenue.toLocaleString()}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                                        {/* Stacked Bars: Revenue is the sum of Cost + Profit visually */}
                                        <Bar dataKey="Cost" stackId="a" fill="#fca5a5" name={t('analyzer.chart_cost')} barSize={20} />
                                        <Bar dataKey="Profit" stackId="a" fill="#10b981" name={t('analyzer.chart_profit')} barSize={20} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    )}
                </div>
            </div>
            {/* 3. Service Selection Table - Moved to bottom */}
            <div className="mt-6 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                        <CheckSquare className="w-5 h-5 text-slate-400" />
                        {t('analyzer.config_title')}
                    </h3>
                    <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => toggleAllServices(true)}>{t('common.select_all')}</Button>
                        <Button size="sm" variant="ghost" onClick={() => toggleAllServices(false)}>{t('common.deselect_all')}</Button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
                            <tr>
                                <th className="px-4 py-3 w-10"></th>
                                <th className="px-4 py-3">{t('analyzer.table_service')}</th>
                                <th className="px-4 py-3 w-20 text-center">{t('analyzer.table_pax')}</th>
                                <th className="px-4 py-3 w-20 text-center">{t('analyzer.table_forecast')}</th>
                                <th className="px-4 py-3 w-24 text-right">{t('analyzer.table_unit_cost')}</th>
                                <th className="px-4 py-3 w-24 text-right">{t('analyzer.table_price')}</th>
                                <th className="px-4 py-3 w-24 text-right">{t('analyzer.table_margin')}</th>
                                <th className="px-4 py-3 w-24 text-right">{t('analyzer.table_profit')}</th>
                                <th className="px-4 py-3 w-20 text-right">{t('analyzer.table_hours')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {services.map((s) => {
                                const state = serviceStates[s.name] || { isSelected: false, price: 0, participants: 0 };
                                const timeFactor = SERVICE_TIMES[s.name] || 1;
                                const estHours = timeFactor * state.participants;

                                const metric = report.serviceBreakdowns.find(b => b.name === s.name);
                                const unitCost = metric ? metric.unitCost : 0;
                                const margin = metric ? metric.margin : 0;
                                const category = SERVICE_CATEGORIES[s.name] || 'Domestic';

                                return (
                                    <tr key={s.name} className={`hover:bg-slate-50 transition-colors ${state.isSelected ? 'bg-blue-50/30' : ''}`}>
                                        <td className="px-4 py-3">
                                            <input
                                                type="checkbox"
                                                checked={state.isSelected}
                                                onChange={(e) => setServiceStates({ ...serviceStates, [s.name]: { ...state, isSelected: e.target.checked } })}
                                                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                                            />
                                        </td>
                                        <td className="px-4 py-3 font-medium text-slate-900">
                                            {t(s.name, s.name)}
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${category === 'Domestic' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}>
                                                    {t('common.' + category.toLowerCase(), category)}
                                                </span>
                                                <span className="text-[10px] text-slate-400">{timeFactor}h /p</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <input
                                                type="number"
                                                className="w-20 p-1.5 border border-slate-300 rounded text-center text-sm"
                                                value={state.participants}
                                                onChange={(e) => {
                                                    const val = parseInt(e.target.value) || 0;
                                                    setServiceStates(prev => ({
                                                        ...prev,
                                                        [s.name]: { ...prev[s.name], participants: val }
                                                    }));
                                                }}
                                            />
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {calculateForecast(s.name) !== null ? (
                                                <div className="relative group">
                                                    <button
                                                        onClick={() => applyForecast(s.name)}
                                                        className="text-sm font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded transition-colors cursor-pointer"
                                                        title={t('analyzer.apply_forecast')}
                                                    >
                                                        📊 {calculateForecast(s.name)}
                                                    </button>
                                                    {/* Tooltip */}
                                                    <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-64 bg-slate-900 text-white text-xs rounded-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 shadow-xl">
                                                        <div className="font-bold text-yellow-300 mb-2 border-b border-slate-700 pb-1">{t('analyzer.tooltip_title')}</div>
                                                        <div className="space-y-1.5">
                                                            <div className="flex justify-between">
                                                                <span className="text-slate-300">{t('analyzer.tooltip_rec_vol')}</span>
                                                                <span className="font-bold text-emerald-400">{calculateForecast(s.name)} {t('analyzer.person')}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-slate-300">{t('analyzer.tooltip_rec_price')}</span>
                                                                <span className="font-bold text-emerald-400">${(SUGGESTED_PRICES[s.name] || state.price).toLocaleString()}</span>
                                                            </div>
                                                            <div className="mt-2 pt-2 border-t border-slate-700 text-[10px] text-slate-400">
                                                                {t('analyzer.tooltip_warn')}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-slate-300 text-sm">-</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right text-xs font-mono text-slate-600">
                                            ${unitCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                        </td>
                                        <td className="px-4 py-3">
                                            <input
                                                type="number" min="0" disabled={!state.isSelected}
                                                value={state.price}
                                                onChange={(e) => setServiceStates({ ...serviceStates, [s.name]: { ...state, price: parseFloat(e.target.value) || 0 } })}
                                                className="w-full p-1.5 border border-slate-300 rounded text-right"
                                            />
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {state.isSelected ? (
                                                <span className={`text-xs font-bold px-2 py-1 rounded ${margin > 40 ? 'bg-green-100 text-green-700' : margin > 20 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                                    {margin.toFixed(1)}%
                                                </span>
                                            ) : <span className="text-slate-300">-</span>}
                                        </td>
                                        <td className="px-4 py-3 text-right text-xs font-mono text-slate-600">
                                            {state.isSelected ? `$${((state.price - unitCost) * state.participants).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-right text-xs font-mono text-slate-500">
                                            {state.isSelected ? estHours.toFixed(1) : '-'} h
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div >
    );
};
