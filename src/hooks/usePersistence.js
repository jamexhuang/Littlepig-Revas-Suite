import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';

const STORAGE_KEY_PREFIX = 'revas_suite_';

export const usePersistence = (key, initialValue, version = '1.0.0') => {
    const [state, setState] = useState(initialValue);
    const [lastSaved, setLastSaved] = useState(null);

    // Load from cookie on mount
    useEffect(() => {
        const savedData = Cookies.get(STORAGE_KEY_PREFIX + key);
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
                // Basic version check or migration could go here
                if (parsed.data) {
                    setState(parsed.data);
                    setLastSaved(parsed.timestamp);
                }
            } catch (e) {
                console.error("Failed to parse cookie data", e);
            }
        }
    }, [key]);

    // Save to cookie on change (debounced)
    useEffect(() => {
        const timer = setTimeout(() => {
            const payload = {
                version,
                timestamp: new Date().toISOString(),
                data: state
            };
            Cookies.set(STORAGE_KEY_PREFIX + key, JSON.stringify(payload), { expires: 365 });
            setLastSaved(payload.timestamp);
        }, 1000); // 1s debounce

        return () => clearTimeout(timer);
    }, [state, key, version]);

    const clearData = () => {
        Cookies.remove(STORAGE_KEY_PREFIX + key);
        setState(initialValue);
        setLastSaved(null);
    };

    const exportData = () => {
        const payload = {
            version,
            timestamp: new Date().toISOString(),
            data: state
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `Revas_${key}_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const importData = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const parsed = JSON.parse(event.target.result);
                    if (parsed.data) {
                        setState(parsed.data);
                        resolve(true);
                    } else {
                        reject("Invalid format");
                    }
                } catch (err) {
                    reject(err);
                }
            };
            reader.readAsText(file);
        });
    };

    return { state, setState, lastSaved, clearData, exportData, importData };
};
