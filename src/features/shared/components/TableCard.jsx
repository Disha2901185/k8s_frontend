import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export const TableCard = ({
    title,
    action,
    headers,
    children,
    footer,
    className,
    tableClassName,
    bodyClassName,
    sortConfig,
    onSort
}) => (
    <div className={cn("bg-white dark:bg-neutral-900 rounded-xl border border-slate-200 dark:border-neutral-800 shadow-sm overflow-visible", className)}>
        {(title || action) && (
            <div className="px-6 py-4 border-b border-slate-200 dark:border-neutral-800 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
                {action}
            </div>
        )}

        <div className="overflow-x-auto overflow-y-visible">
            <table className={cn("w-full text-sm text-left", tableClassName)}>
                <thead className="bg-slate-50 dark:bg-neutral-900/50 text-slate-500 dark:text-neutral-500 font-medium border-b border-slate-200 dark:border-neutral-800">
                    <tr>
                        {headers.map((header) => (
                            <th
                                key={header.key || header.label}
                                onClick={header.sortable && onSort ? () => onSort(header.key) : undefined}
                                className={cn(
                                    "px-6 py-4",
                                    header.className,
                                    header.sortable && onSort && "cursor-pointer hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors select-none"
                                )}
                            >
                                {header.sortable && onSort ? (
                                    <div className={cn(
                                        "flex items-center gap-1",
                                        header.className?.includes('text-right') && "justify-end"
                                    )}>
                                        {header.label}
                                        <div className="flex flex-col">
                                            <ChevronUp className={cn("w-2 h-2", sortConfig?.key === header.key && sortConfig?.direction === 'asc' ? "text-main dark:text-white" : "text-slate-300 dark:text-neutral-600")} />
                                            <ChevronDown className={cn("w-2 h-2", sortConfig?.key === header.key && sortConfig?.direction === 'desc' ? "text-main dark:text-white" : "text-slate-300 dark:text-neutral-600")} />
                                        </div>
                                    </div>
                                ) : header.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className={cn("divide-y divide-slate-100 dark:divide-neutral-800", bodyClassName)}>
                    {children}
                </tbody>
            </table>
        </div>

        {footer ? (
            <div className="px-6 py-4 border-t border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-900/30 text-xs text-slate-500 dark:text-neutral-400 flex justify-between items-center">
                {footer}
            </div>
        ) : null}
    </div>
);
