import React from 'react';
import { cn } from '@/lib/utils';

export const NavItem = ({
    icon: Icon,
    label,
    active,
    collapsed,
    onClick,
    children,
    className
}) => {
    return (
        <div className="w-full">
            <button
                onClick={onClick}
                className={cn(
                    "flex items-center transition-all duration-200 rounded-lg group cursor-pointer", // Explicit hand cursor
                    collapsed ? "w-[44px] h-[40px] pl-3" : "w-full px-3 py-2", // Fixed left align (pl-3). 44px width centers icon (12L-20I-12R).
                    "hover:bg-gray-100 dark:hover:bg-neutral-800", // Neutral hover
                    active
                        ? "bg-gray-200 text-main font-semibold dark:bg-neutral-800 dark:text-white" // Neutral Grey 200 fill, Semibold
                        : "text-neutral dark:text-neutral-400", // Neutral #525252 for inactive
                    className
                )}
            >
                {Icon && (
                    <Icon
                        strokeWidth={active ? 2.0 : 1.75} // Thicker icon when active
                        className={cn(
                            "w-5 h-5 min-w-[20px]",
                            active ? "text-main dark:text-white" : "text-neutral group-hover:text-slate-900 dark:text-neutral-400 dark:group-hover:text-neutral-200"
                        )} />
                )}
                {!collapsed && (
                    <span className="ml-2 text-sm tracking-[-0.2px] truncate">
                        {label}
                    </span>
                )}
            </button>
            {!collapsed && children && (
                <div className="mt-1 ml-4 space-y-1">
                    {children}
                </div>
            )}
        </div>
    );
};
