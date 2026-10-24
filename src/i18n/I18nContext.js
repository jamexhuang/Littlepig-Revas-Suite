'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import en from './en.json';
import zh from './zh.json';
import Cookies from 'js-cookie';

const translations = { en, zh };
const I18nContext = createContext();

export const I18nProvider = ({ children }) => {
    const [locale, setLocale] = useState('zh'); // Default to Chinese as requested
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
        const savedLocale = Cookies.get('revas_locale') || 'zh';
        setLocale(savedLocale);
    }, []);

    const changeLocale = (newLocale) => {
        setLocale(newLocale);
        Cookies.set('revas_locale', newLocale, { expires: 365 });
    };

    const t = (key) => {
        if (!key) return '';
        const keys = key.split('.');
        let value = translations[locale];
        for (const k of keys) {
            if (value && value[k] !== undefined) {
                value = value[k];
            } else {
                value = undefined;
                break;
            }
        }
        
        if (value !== undefined) return value;
        
        let fallback = translations['en'];
        for (const fk of keys) {
            if (fallback && fallback[fk] !== undefined) {
                fallback = fallback[fk];
            } else {
                return key;
            }
        }
        return fallback || key;
    };

    if (!isClient) {
        return <I18nContext.Provider value={{ locale: 'zh', changeLocale: () => {}, t }}>{children}</I18nContext.Provider>;
    }

    return (
        <I18nContext.Provider value={{ locale, changeLocale, t }}>
            {children}
        </I18nContext.Provider>
    );
};

export const useI18n = () => {
    const context = useContext(I18nContext);
    if (!context) {
        throw new Error('useI18n must be used within an I18nProvider');
    }
    return context;
};
