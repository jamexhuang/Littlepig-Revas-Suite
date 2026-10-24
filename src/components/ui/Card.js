import React from 'react';
import { cn } from '@/lib/utils';

export const Card = ({ children, className = "" }) => (
    <div className={cn("bg-white rounded-lg shadow-sm border border-slate-200", className)}>
        {children}
    </div>
);
