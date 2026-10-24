import { useState, useEffect, useRef } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const COLLECTION_NAME = 'modules';

export const useFirestore = (documentId, initialValue, version = '1.0.0', isAutoBackupEnabled = false) => {
    const [state, setState] = useState(initialValue);
    const [lastSaved, setLastSaved] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Ref to track if the update came from Firestore
    const isRemoteUpdate = useRef(false);

    // Real-time sync with Firestore
    useEffect(() => {
        if (!documentId) return;

        // If auto backup is disabled, we still want to load the initial snapshot? 
        // Yes, loading existing data is fine, but we might want them to be able to load at least once.
        setLoading(true);
        // Sanitize documentId to ensure it's a valid document path (no slashes allowed in ID if collection is fixed)
        // This handles cases where a path like "session_.../supplierData" is passed, converting it to "session_..._supplierData"
        const safeId = documentId.replace(/\//g, '_');
        const docRef = doc(db, COLLECTION_NAME, safeId);

        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                // Optional: Version check logic could go here
                if (data.data) {
                    // Mark this as a remote update so we don't save it back immediately
                    isRemoteUpdate.current = true;
                    setState(data.data);
                    setLastSaved(data.timestamp);
                }
            } else {
                // If document doesn't exist, we might want to create it with initialValue
                // But usually we just wait for the first save
            }
            setLoading(false);
        }, (err) => {
            console.error("Firestore sync error:", err);
            setError(err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [documentId]);

    // Save to Firestore on change (debounced)
    useEffect(() => {
        if (!documentId || loading) return;

        // If this change came from a remote update, reset the flag and do NOT save back
        if (isRemoteUpdate.current) {
            isRemoteUpdate.current = false;
            return;
        }

        if (!isAutoBackupEnabled) return;

        const timer = setTimeout(async () => {
            try {
                const payload = {
                    version,
                    timestamp: new Date().toISOString(),
                    data: state
                };
                const safeId = documentId.replace(/\//g, '_');
                const docRef = doc(db, COLLECTION_NAME, safeId);
                await setDoc(docRef, payload, { merge: true });
                setLastSaved(payload.timestamp);
            } catch (err) {
                console.error("Failed to save to Firestore:", err);
                setError(err);
            }
        }, 1000); // 1s debounce

        return () => clearTimeout(timer);
    }, [state, documentId, version, loading, isAutoBackupEnabled]);

    const clearData = async () => {
        setState(initialValue);
        setLastSaved(null);
        setLastSaved(null);
        try {
            const safeId = documentId.replace(/\//g, '_');
            const docRef = doc(db, COLLECTION_NAME, safeId);
            await setDoc(docRef, {
                version,
                timestamp: new Date().toISOString(),
                data: initialValue
            });
        } catch (err) {
            console.error("Failed to clear data in Firestore:", err);
        }
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
        link.download = `Revas_${documentId}_${new Date().toISOString().slice(0, 10)}.json`;
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

    return { state, setState, lastSaved, loading, error, clearData, exportData, importData };
};
