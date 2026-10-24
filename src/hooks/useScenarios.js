'use client';
import { useState, useEffect, useCallback, useRef } from 'react';

const STORAGE_KEY = 'revas_scenarios';
const AUTOSAVE_KEY = 'revas_autosave';

export function useScenarios() {
    const [scenarios, setScenarios] = useState([]);
    const autosaveTimerRef = useRef(null);

    // Load scenarios list on mount
    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) setScenarios(JSON.parse(raw));
        } catch { setScenarios([]); }
    }, []);

    const persistList = (list) => {
        setScenarios(list);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    };

    const saveScenario = useCallback((name, data) => {
        const id = Date.now().toString();
        const entry = {
            id,
            name: name.trim() || `Scenario ${new Date().toLocaleDateString()}`,
            savedAt: new Date().toISOString(),
            metrics: {
                revenue: data._metrics?.revenue ?? null,
                netProfit: data._metrics?.netProfit ?? null,
            },
            data
        };
        const list = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        persistList([...list, entry]);
        return id;
    }, []);

    const loadScenario = useCallback((id) => {
        const list = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        return list.find(s => s.id === id)?.data ?? null;
    }, []);

    const deleteScenario = useCallback((id) => {
        const list = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        persistList(list.filter(s => s.id !== id));
    }, []);

    // Debounced autosave — only fires when autoBackup is OFF
    const triggerAutosave = useCallback((data) => {
        if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = setTimeout(() => {
            try {
                localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({
                    savedAt: new Date().toISOString(),
                    data
                }));
            } catch { /* storage full */ }
        }, 2000);
    }, []);

    const getAutosave = useCallback(() => {
        try {
            const raw = localStorage.getItem(AUTOSAVE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch { return null; }
    }, []);

    const clearAutosave = useCallback(() => {
        localStorage.removeItem(AUTOSAVE_KEY);
    }, []);

    return { scenarios, saveScenario, loadScenario, deleteScenario, triggerAutosave, getAutosave, clearAutosave };
}
