import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Edit3, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export const CompanyCommandBar = ({ company, onAction }) => {
    const navigate = useNavigate();
    const initials = (company.name || '?').substring(0, 2).toUpperCase();

    const getStatusColor = (status) => {
        if (status === 'Client') return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-500 border-transparent";
        if (status === 'Prospect') return "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-500 border-transparent";
        return "bg-slate-100 text-slate-700 dark:bg-neutral-800 dark:text-neutral-400 border-transparent";
    };

    return (
        <div className="w-full transition-all">
            <div className="px-6 py-4">
                {/* Breadcrumbs */}
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-3">
                    <span className="cursor-pointer hover:text-slate-800 dark:hover:text-neutral-200 transition-colors">Sales</span>
                    <ChevronRight className="w-3 h-3 text-slate-400" />
                    <span
                        onClick={() => navigate('/companies')}
                        className="cursor-pointer hover:text-slate-800 dark:hover:text-neutral-200 hover:underline transition-colors"
                    >
                        Companies
                    </span>
                    <ChevronRight className="w-3 h-3 text-slate-400" />
                    <span className="text-slate-900 dark:text-white font-semibold">{company.name}</span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Entity Identity */}
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-lg font-bold shadow-lg shadow-blue-500/20">
                            {initials}
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight leading-none">
                                    {company.name}
                                </h1>
                                <span className={cn(
                                    "px-3 py-1 rounded-full text-xs font-bold border",
                                    getStatusColor(company.status)
                                )}>
                                    {company.status}
                                </span>
                            </div>
                            <p className="text-sm text-slate-500 mt-1 font-medium">{company.industry || 'Not available'}</p>
                        </div>
                    </div>

                    {/* Interaction Hub */}
                    {/* Actions Dropdown */}
                    <div className="relative group">
                        <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-neutral-800 text-white dark:text-white rounded-lg text-sm font-bold shadow-sm hover:shadow-md hover:bg-slate-800 dark:hover:bg-neutral-700 transition-all border border-transparent dark:border-neutral-700">
                            Actions <ChevronRight className="w-4 h-4 rotate-90" />
                        </button>
                        <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-neutral-900 rounded-xl shadow-xl border border-slate-200 dark:border-neutral-800 p-1 hidden group-hover/block animate-in fade-in zoom-in-95 duration-200 z-50">
                            <button
                                onClick={() => onAction('edit_company')}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                            >
                                <Edit3 className="w-4 h-4" /> Edit Company
                            </button>
                            <button
                                onClick={() => onAction('delete_company')}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                            >
                                <Trash2 className="w-4 h-4" /> Delete Company
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
