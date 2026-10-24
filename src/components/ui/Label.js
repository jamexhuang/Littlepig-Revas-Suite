import React from 'react';
import { cn } from '@/lib/utils';

export const Label = ({ children, className = "" }) => (
    <label className={cn("block text-xs font-bold text-slate-500 uppercase mb-1 tracking-wider", className)}>
        {children}
    </label>
);
