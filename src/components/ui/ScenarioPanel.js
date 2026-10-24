'use client';
import React, { useState } from 'react';
import { BookMarked, Save, Trash2, Download, ChevronRight, Check, Clock } from 'lucide-react';
import { useI18n } from '@/i18n/I18nContext';

const fmt = (v) => v != null ? `$${Number(v).toLocaleString()}` : '-';
const fmtDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return `${d.getMonth()+1}/${d.getDate()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
};

export function ScenarioPanel({ scenarios, onSave, onLoad, onDelete, autosave, onRestoreAutosave, currentMetrics }) {
    const { t } = useI18n();
    const [open, setOpen] = useState(false);
    const [nameInput, setNameInput] = useState('');
    const [saved, setSaved] = useState(false);

    const handleSave = () => {
        if (onSave) {
            onSave(nameInput);
            setNameInput('');
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        }
    };

    return (
        <>
            {/* Slide handle */}
            <button
                onClick={() => setOpen(o => !o)}
                className="fixed right-0 top-1/3 z-50 flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-3 rounded-l-lg shadow-lg transition-all"
                title={t('scenario.panel_title', 'Scenarios')}
            >
                <BookMarked className="w-4 h-4" />
                <span className="text-xs font-semibold writing-vertical hidden sm:block"
                    style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', lineHeight: 1 }}>
                    {t('scenario.panel_title', 'Scenarios')}
                </span>
                <ChevronRight className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {/* Backdrop */}
            {open && <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setOpen(false)} />}

            {/* Panel */}
            <div className={`fixed right-0 top-0 h-full w-80 bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200 transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="flex items-center justify-between px-4 py-3 bg-indigo-600 text-white shrink-0">
                    <div className="flex items-center gap-2">
                        <BookMarked className="w-4 h-4" />
                        <span className="font-semibold text-sm">{t('scenario.panel_title', 'Scenarios')}</span>
                    </div>
                    <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white text-lg leading-none">×</button>
                </div>

                {/* Save current */}
                <div className="p-4 border-b border-slate-100 shrink-0">
                    <p className="text-xs font-semibold text-slate-500 uppercase mb-2">{t('scenario.save_current', 'Save Current State')}</p>
                    {currentMetrics && (
                        <div className="flex gap-3 mb-2 text-xs text-slate-500">
                            <span>Rev: <b className="text-slate-700">{fmt(currentMetrics.revenue)}</b></span>
                            <span>Profit: <b className={currentMetrics.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}>{fmt(currentMetrics.netProfit)}</b></span>
                        </div>
                    )}
                    <div className="flex gap-2">
                        <input
                            className="flex-1 text-sm border border-slate-200 rounded px-2 py-1.5 focus:ring-2 focus:ring-indigo-400 outline-none"
                            placeholder={t('scenario.name_placeholder', 'Scenario name...')}
                            value={nameInput}
                            onChange={e => setNameInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSave()}
                        />
                        <button
                            onClick={handleSave}
                            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded transition-colors"
                        >
                            {saved ? <Check className="w-3 h-3" /> : <Save className="w-3 h-3" />}
                        </button>
                    </div>
                </div>

                {/* Autosave notice */}
                {autosave && (
                    <div className="mx-4 mt-3 shrink-0 bg-amber-50 border border-amber-200 rounded-lg p-2 flex items-start gap-2">
                        <Clock className="w-3 h-3 text-amber-600 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-amber-800">{t('scenario.autosave_found', 'Autosave found')}</p>
                            <p className="text-[10px] text-amber-600">{fmtDate(autosave.savedAt)}</p>
                        </div>
                        <button
                            onClick={() => { onRestoreAutosave && onRestoreAutosave(); setOpen(false); }}
                            className="text-[10px] bg-amber-600 hover:bg-amber-700 text-white px-2 py-1 rounded whitespace-nowrap"
                        >
                            {t('scenario.restore', 'Restore')}
                        </button>
                    </div>
                )}

                {/* Scenario list */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {scenarios.length === 0 ? (
                        <div className="text-center text-slate-400 text-sm py-10">
                            <BookMarked className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            <p>{t('scenario.empty', 'No saved scenarios yet')}</p>
                        </div>
                    ) : (
                        scenarios.slice().reverse().map(s => (
                            <div key={s.id} className="border border-slate-200 rounded-lg p-3 bg-white hover:bg-slate-50 transition-colors">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                    <p className="font-semibold text-sm text-slate-800 truncate flex-1">{s.name}</p>
                                    <button onClick={() => onDelete(s.id)} className="text-slate-300 hover:text-red-500 shrink-0">
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                <p className="text-[10px] text-slate-400 mb-2">{fmtDate(s.savedAt)}</p>
                                {s.metrics?.revenue != null && (
                                    <div className="flex gap-3 text-xs text-slate-500 mb-2">
                                        <span>Rev: <b className="text-slate-700">{fmt(s.metrics.revenue)}</b></span>
                                        <span>Profit: <b className={s.metrics.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}>{fmt(s.metrics.netProfit)}</b></span>
                                    </div>
                                )}
                                <button
                                    onClick={() => { onLoad(s.id); setOpen(false); }}
                                    className="w-full flex items-center justify-center gap-1 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-medium rounded transition-colors"
                                >
                                    <Download className="w-3 h-3" />
                                    {t('scenario.load', 'Load this scenario')}
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </>
    );
}
