'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    LayoutDashboard, Wallet, Calculator, Save, FolderOpen,
    Trash2, Download, Upload, History, CloudCheck, Globe
} from 'lucide-react';
import Cookies from 'js-cookie';
import { useI18n } from '@/i18n/I18nContext';
import { PurchasingModule } from '@/components/modules/PurchasingModule';
import { AnalyzerModule } from '@/components/modules/AnalyzerModule';
import { useFirestore } from '@/hooks/useFirestore';
import { useScenarios } from '@/hooks/useScenarios';
import { ScenarioPanel } from '@/components/ui/ScenarioPanel';
import { DEFAULT_SUPPLIER_DATA } from '@/data/defaultSupplierData';
import {
    APP_VERSION, DEFAULT_ANALYZER_DATA, SUGGESTED_PRICES
} from '@/data/constants';
import { parseSupplierCSV } from '@/utils/csvParser';

// Initial States
const INITIAL_OPEX = { admin: 2000, investment: 5000, marketing: 1000 };
const INITIAL_HR = { totalCost: 0, totalHoursDomestic: 0, totalHoursInternational: 0 };
const INITIAL_FORECAST_CONFIG = { selectedMonth: 1, riskFactor: 0 };
const INITIAL_SERVICE_STATES = {};
DEFAULT_ANALYZER_DATA.forEach(s => {
    INITIAL_SERVICE_STATES[s.name] = {
        isSelected: false,
        price: SUGGESTED_PRICES[s.name] || 1500,
        participants: s.defaultParticipants
    };
});

const timeAgo = (dateString) => {
    if (!dateString) return 'offline';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    if (seconds < 60) return 'seconds ago';
    const minutes = Math.floor(seconds / 60);
    if (minutes === 1) return '1 minute ago';
    if (minutes < 60) return `${minutes} minutes ago`;
    const hours = Math.floor(minutes / 60);
    if (hours === 1) return '1 hour ago';
    if (hours < 24) return `${hours} hours ago`;
    return 'on ' + date.toLocaleDateString();
};

export default function Home() {
    const { t, locale, changeLocale } = useI18n();
    const [currentView, setCurrentView] = useState("analyzer");
    const [resourceCosts, setResourceCosts] = useState({});
    const [serviceUnitCosts, setServiceUnitCosts] = useState({});
    const [autosaveEntry, setAutosaveEntry] = useState(null);

    // Auto-backup toggle (persisted in localStorage)
    const [isAutoBackupEnabled, setIsAutoBackupEnabled] = useState(false);
    useEffect(() => {
        const stored = localStorage.getItem('revas_autoBackup');
        if (stored !== null) setIsAutoBackupEnabled(stored === 'true');
    }, []);
    const handleAutoBackupToggle = () => {
        const newVal = !isAutoBackupEnabled;
        setIsAutoBackupEnabled(newVal);
        localStorage.setItem('revas_autoBackup', String(newVal));
    };

    // Firestore / cookie-backed states
    const { state: supplierData, setState: setSupplierData, lastSaved: lastSavedSupplier, clearData: clearSupplier } = useFirestore('supplierData', DEFAULT_SUPPLIER_DATA, APP_VERSION, isAutoBackupEnabled);
    const { state: requests, setState: setRequests, lastSaved: lastSavedRequests, clearData: clearRequests } = useFirestore('requests', [], APP_VERSION, isAutoBackupEnabled);

    // Fallback: if Firestore returns empty supplierData, use the embedded default
    useEffect(() => {
        if (supplierData.length === 0) {
            setSupplierData(DEFAULT_SUPPLIER_DATA);
        }
    }, [supplierData.length]);
    const { state: services, setState: setServices, lastSaved: lastSavedServices, clearData: clearServices } = useFirestore('services', DEFAULT_ANALYZER_DATA, APP_VERSION, isAutoBackupEnabled);
    const { state: serviceStates, setState: setServiceStates, lastSaved: lastSavedServiceStates, clearData: clearServiceStates } = useFirestore('serviceStates', INITIAL_SERVICE_STATES, APP_VERSION, isAutoBackupEnabled);
    const { state: opEx, setState: setOpEx, lastSaved: lastSavedOpEx, clearData: clearOpEx } = useFirestore('opEx', INITIAL_OPEX, APP_VERSION, isAutoBackupEnabled);
    const { state: hrConfig, setState: setHrConfig, lastSaved: lastSavedHrConfig, clearData: clearHrConfig } = useFirestore('hrConfig', INITIAL_HR, APP_VERSION, isAutoBackupEnabled);
    const { state: forecastConfig, setState: setForecastConfig, lastSaved: lastSavedForecastConfig, clearData: clearForecastConfig } = useFirestore('forecastConfig', INITIAL_FORECAST_CONFIG, APP_VERSION, isAutoBackupEnabled);

    // Scenario management
    const { scenarios, saveScenario, loadScenario, deleteScenario, triggerAutosave, getAutosave, clearAutosave } = useScenarios();

    // Check for autosave on mount (only when autoBackup is off)
    useEffect(() => {
        if (!isAutoBackupEnabled) {
            const as = getAutosave();
            if (as) setAutosaveEntry(as);
        }
    }, [isAutoBackupEnabled]);

    // Trigger autosave when autoBackup is OFF and state changes
    useEffect(() => {
        if (!isAutoBackupEnabled) {
            const snapshot = { supplierData, requests, services, serviceStates, opEx, hrConfig, forecastConfig };
            triggerAutosave(snapshot);
        }
    }, [isAutoBackupEnabled, supplierData, requests, services, serviceStates, opEx, hrConfig, forecastConfig]);

    // Computed metrics for ScenarioPanel (from AnalyzerModule logic light version)
    const currentMetrics = useMemo(() => {
        let totalRevenue = 0, totalCOGS = 0;
        services.forEach(s => {
            const state = serviceStates[s.name];
            if (!state?.isSelected) return;
            const revenue = state.price * state.participants;
            const costData = serviceUnitCosts?.[s.name];
            const cost = costData ? costData * state.participants : revenue * 0.6;
            totalRevenue += revenue;
            totalCOGS += cost;
        });
        const grossProfit = totalRevenue - totalCOGS;
        const totalOpEx = (hrConfig.totalCost || 0) + (opEx.admin || 0) + (opEx.investment || 0) + (opEx.marketing || 0);
        const netProfit = grossProfit - totalOpEx;
        return { revenue: totalRevenue, netProfit };
    }, [services, serviceStates, serviceUnitCosts, hrConfig, opEx]);

    const getAllState = () => ({
        supplierData, requests, services, serviceStates, opEx, hrConfig, forecastConfig,
        _metrics: currentMetrics
    });

    const restoreState = (data) => {
        if (!data) return;
        if (data.supplierData) setSupplierData(data.supplierData);
        if (data.requests) setRequests(data.requests);
        if (data.services) setServices(data.services);
        if (data.serviceStates) setServiceStates(data.serviceStates);
        if (data.opEx) setOpEx(data.opEx);
        if (data.hrConfig) setHrConfig(data.hrConfig);
        if (data.forecastConfig) setForecastConfig(data.forecastConfig);
    };

    const handleSaveScenario = (name) => saveScenario(name, getAllState());

    const handleLoadScenario = (id) => {
        const data = loadScenario(id);
        if (data) restoreState(data);
    };

    const handleRestoreAutosave = () => {
        if (autosaveEntry?.data) {
            restoreState(autosaveEntry.data);
            clearAutosave();
            setAutosaveEntry(null);
        }
    };

    // Bidirectional sync guard
    const syncInProgress = React.useRef(false);

    useEffect(() => {
        if (syncInProgress.current) return;
        const newRequests = [];
        let hasChanges = false;
        Object.entries(serviceStates).forEach(([serviceName, state]) => {
            if (state.isSelected) {
                const existingReq = requests.find(r => r.service === serviceName);
                if (existingReq) {
                    if (existingReq.quantity !== state.participants) {
                        newRequests.push({ ...existingReq, quantity: state.participants });
                        hasChanges = true;
                    } else {
                        newRequests.push(existingReq);
                    }
                } else {
                    newRequests.push({ id: Date.now() + Math.random(), service: serviceName, quantity: state.participants, baseQuality: 1, qualityMap: {} });
                    hasChanges = true;
                }
            }
        });
        if (newRequests.length !== requests.length) hasChanges = true;
        if (hasChanges) {
            syncInProgress.current = true;
            setRequests(newRequests);
            setTimeout(() => { syncInProgress.current = false; }, 100);
        }
    }, [serviceStates]);

    useEffect(() => {
        if (syncInProgress.current) return;
        let hasChanges = false;
        const nextServiceStates = { ...serviceStates };
        requests.forEach(req => {
            const state = nextServiceStates[req.service];
            if (state && (!state.isSelected || state.participants !== req.quantity)) {
                nextServiceStates[req.service] = { ...state, isSelected: true, participants: req.quantity };
                hasChanges = true;
            }
        });
        Object.keys(nextServiceStates).forEach(name => {
            if (nextServiceStates[name].isSelected && !requests.find(r => r.service === name)) {
                nextServiceStates[name] = { ...nextServiceStates[name], isSelected: false };
                hasChanges = true;
            }
        });
        if (hasChanges) {
            syncInProgress.current = true;
            setServiceStates(nextServiceStates);
            setTimeout(() => { syncInProgress.current = false; }, 100);
        }
    }, [requests]);

    // Global Data Management
    const handleGlobalExport = () => {
        const fullData = { version: APP_VERSION, timestamp: new Date().toISOString(), data: getAllState() };
        const blob = new Blob([JSON.stringify(fullData, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `Revas_Full_Backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleGlobalImport = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const parsed = JSON.parse(event.target.result);
                if (parsed.data) {
                    restoreState(parsed.data);
                    alert(t("common.restore_success"));
                } else {
                    alert(t("common.invalid_backup"));
                }
            } catch { alert(t("common.read_fail")); }
        };
        reader.readAsText(file);
    };

    const handleClearAll = () => {
        if (confirm(t("common.confirm_clear"))) {
            clearSupplier();
            clearRequests();
            clearServices();
            clearServiceStates();
            clearOpEx();
            clearHrConfig();
            clearForecastConfig();
            Object.keys(Cookies.get()).forEach(cookieName => {
                if (cookieName.startsWith('revas_suite_')) Cookies.remove(cookieName);
            });
            // Reset supplierData to default instead of empty
            setSupplierData(DEFAULT_SUPPLIER_DATA);
        }
    };

    const handleFileUpload = (event) => {
        const files = Array.from(event.target.files);
        files.forEach(file => {
            parseSupplierCSV(file)
                .then(newSuppliers => {
                    setSupplierData(prev => {
                        let updated = [...prev];
                        newSuppliers.forEach(({ supplierName, items }) => {
                            updated = updated.filter(s => s.supplierName !== supplierName);
                            updated.push({ supplierName, items, isDefault: false });
                        });
                        return updated;
                    });
                    alert(t("common.success_load_suppliers").replace("{count}", newSuppliers.length));
                })
                .catch(error => alert(error.message));
        });
    };

    const lastSaved = [lastSavedSupplier, lastSavedRequests, lastSavedServices, lastSavedServiceStates, lastSavedOpEx, lastSavedHrConfig, lastSavedForecastConfig]
        .filter(Boolean).sort().reverse()[0];

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-12">
            {/* Navigation Bar */}
            <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 shrink-0">
                        <div className="flex items-center">
                            <div className="flex-shrink-0 flex items-center gap-2 text-indigo-600">
                                <LayoutDashboard className="h-8 w-8" />
                                <span className="font-bold text-xl tracking-tight text-slate-900 hidden sm:inline">Revas Suite</span>
                            </div>
                            <div className="hidden sm:ml-10 sm:flex sm:space-x-4">
                                <button
                                    onClick={() => setCurrentView("analyzer")}
                                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${currentView === "analyzer" ? "border-indigo-500 text-gray-900" : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"}`}
                                >
                                    <Wallet className="w-4 h-4 mr-2" />
                                    {t("common.analyzer")}
                                </button>
                                <button
                                    onClick={() => setCurrentView("purchasing")}
                                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${currentView === "purchasing" ? "border-indigo-500 text-gray-900" : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"}`}
                                >
                                    <Calculator className="w-4 h-4 mr-2" />
                                    {t("common.purchasing")}
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {/* Language toggle */}
                            <button
                                onClick={() => changeLocale(locale === 'zh' ? 'en' : 'zh')}
                                className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors flex items-center pr-3"
                                title="切換語言 / Switch Language"
                            >
                                <Globe className="w-5 h-5" />
                                <span className="ml-1 text-xs font-semibold w-8 text-center inline-block">{locale === 'zh' ? 'EN' : '中文'}</span>
                            </button>
                            <div className="hidden sm:block h-6 w-px bg-slate-200" />
                            <label className="cursor-pointer p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors" title={t("common.import_backup")}>
                                <Upload className="w-5 h-5" />
                                <input type="file" accept=".json" onChange={handleGlobalImport} className="hidden" />
                            </label>
                            <button onClick={handleGlobalExport} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors" title={t("common.export_backup")}>
                                <Download className="w-5 h-5" />
                            </button>
                            <button onClick={handleClearAll} className="p-2 hover:bg-red-50 rounded-full text-red-500 transition-colors" title={t("common.clear_data")}>
                                <Trash2 className="w-5 h-5" />
                            </button>
                            <div className="h-6 w-px bg-slate-200 hidden md:block" />
                            {/* Last Sync */}
                            <div className="items-center gap-2 text-slate-500 hidden xl:flex">
                                <CloudCheck className="w-4 h-4" />
                                <span className="text-sm">{t("common.last_edit")} {timeAgo(lastSaved)}</span>
                            </div>
                            {/* Auto Backup Toggle */}
                            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
                                <span className="text-xs font-medium text-slate-600 hidden md:inline">{t("common.auto_backup")}</span>
                                <button
                                    onClick={handleAutoBackupToggle}
                                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isAutoBackupEnabled ? 'bg-indigo-600' : 'bg-slate-300'}`}
                                    role="switch" aria-checked={isAutoBackupEnabled}
                                >
                                    <span aria-hidden="true" className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isAutoBackupEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                                </button>
                            </div>
                            <span className="text-xs text-slate-400 border border-slate-200 px-2 py-1 rounded bg-slate-50 font-mono hidden lg:inline max-w-[180px] truncate" title={APP_VERSION}>
                                {APP_VERSION}
                            </span>
                        </div>
                    </div>
                </div>
                {/* Mobile Nav */}
                <div className="sm:hidden border-t border-slate-100 flex">
                    <button onClick={() => setCurrentView("analyzer")} className={`flex-1 py-3 text-center text-sm font-medium ${currentView === "analyzer" ? "bg-indigo-50 text-indigo-700" : "text-slate-500"}`}>{t("common.analyzer")}</button>
                    <button onClick={() => setCurrentView("purchasing")} className={`flex-1 py-3 text-center text-sm font-medium ${currentView === "purchasing" ? "bg-indigo-50 text-indigo-700" : "text-slate-500"}`}>{t("common.purchasing")}</button>
                </div>
            </div>

            {/* Floating Scenario Panel */}
            <ScenarioPanel
                scenarios={scenarios}
                onSave={handleSaveScenario}
                onLoad={handleLoadScenario}
                onDelete={deleteScenario}
                autosave={autosaveEntry}
                onRestoreAutosave={handleRestoreAutosave}
                currentMetrics={currentMetrics}
            />

            {/* Main Content Area */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {currentView === "purchasing" ? (
                    <PurchasingModule
                        supplierData={supplierData}
                        setSupplierData={setSupplierData}
                        requests={requests}
                        setRequests={setRequests}
                        setResourceCosts={setResourceCosts}
                        setServiceUnitCosts={setServiceUnitCosts}
                    />
                ) : (
                    <AnalyzerModule
                        services={services}
                        setServices={setServices}
                        serviceStates={serviceStates}
                        setServiceStates={setServiceStates}
                        opEx={opEx}
                        setOpEx={setOpEx}
                        hrConfig={hrConfig}
                        setHrConfig={setHrConfig}
                        forecastConfig={forecastConfig}
                        setForecastConfig={setForecastConfig}
                        resourceCosts={resourceCosts}
                        serviceUnitCosts={serviceUnitCosts}
                        importConfig={handleGlobalImport}
                        exportConfig={handleGlobalExport}
                        handleFileUpload={handleFileUpload}
                    />
                )}
            </main>
        </div>
    );
}
