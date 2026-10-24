// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

// Firebase configuration comes from environment variables so this public
// repository carries no live project identifiers. Copy .env.example to
// .env.local and fill in the values from your own Firebase project
// (Firebase console -> Project settings -> Your apps -> Web app).
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || ""
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics (conditionally, as it may not be supported in all environments like SSR)
let analytics;
if (typeof window !== "undefined") {
    isSupported().then((supported) => {
        if (supported) {
            analytics = getAnalytics(app);
        }
    });
}

// Initialize Firestore
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

// Initialize Firestore with offline persistence
const db = initializeFirestore(app, {
    localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
    })
});

export { app, analytics, db };
