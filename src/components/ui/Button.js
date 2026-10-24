import React from 'react';
import { cn } from '@/lib/utils';

export const Button = ({ children, onClick, variant = "primary", className = "", disabled = false, size = "md" }) => {
    const baseStyle = "rounded-md font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
    const sizes = {
        sm: "px-2 py-1 text-xs",
        md: "px-4 py-2 text-sm",
        lg: "px-6 py-3 text-base"
    };
    const variants = {
        primary: "bg-blue-600 text-white hover:bg-blue-700",
        secondary: "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300",
        outline: "bg-transparent border border-blue-600 text-blue-600 hover:bg-blue-50",
        success: "bg-emerald-600 text-white hover:bg-emerald-700",
        danger: "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200",
        ghost: "bg-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700"
    };
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={cn(baseStyle, sizes[size], variants[variant], className)}
        >
            {children}
        </button>
    );
};
