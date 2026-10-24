import React from 'react';
import { cn } from '@/lib/utils';

export const Input = ({ type = "text", value, onChange, className = "", placeholder = "", ...props }) => (
    <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={cn("w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", className)}
        {...props}
    />
);
