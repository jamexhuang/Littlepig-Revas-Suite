import React from 'react';
import { cn } from '@/lib/utils';

export const Select = ({ value, onChange, options, className = "", ...props }) => (
    <select
        value={value}
        onChange={onChange}
        className={cn("w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white", className)}
        {...props}
    >
        {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
                {opt.label}
            </option>
        ))}
    </select>
);
