import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ExternalLink, Copy, Edit2, Check, X, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

export const InfoSidebar = ({ sections = [] }) => {
    return (
        <div className="w-full h-full overflow-y-auto custom-scrollbar p-4 space-y-6">
            {sections.map((section, idx) => (
                <SidebarSection key={idx} section={section} defaultOpen={idx === 0} />
            ))}
        </div>
    );
};

const SidebarSection = ({ section, defaultOpen }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="space-y-2">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-widest hover:text-slate-800 dark:hover:text-slate-200 transition-colors group"
            >
                {section.title}
                <ChevronDown className={cn(
                    "w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-transform duration-200",
                    isOpen && "rotate-180"
                )} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="space-y-3 pt-1">
                            {section.items.map((item, i) => (
                                <InfoItem key={i} item={item} />
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const InfoItem = ({ item }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [value, setValue] = useState(item.value);

    // If type is 'link' (e.g. for Parent Company link)
    if (item.type === 'link') {
        return (
            <div className="group">
                <label className="text-[10px] font-medium text-slate-400 block mb-1">{item.label}</label>
                <Link to={item.href} className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 transition-colors group/card">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
                        {value.charAt(0)}
                    </div>
                    <div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white group-hover/card:text-blue-600">{value}</div>
                        <div className="text-[10px] text-slate-500">View details</div>
                    </div>
                </Link>
            </div>
        );
    }

    const hasError = item.validate && !item.validate(value);

    return (
        <div className="group relative">
            <label className="text-[10px] font-medium text-slate-400 block mb-0.5 flex items-center justify-between">
                {item.label}
                {item.editable && !isEditing && (
                    <button onClick={() => setIsEditing(true)} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-blue-500">
                        <Edit2 className="w-3 h-3" />
                    </button>
                )}
            </label>

            {isEditing ? (
                <div className="flex items-center gap-1 animate-in fade-in zoom-in-95 duration-200">
                    <input
                        className="w-full text-sm px-2 py-1 border border-blue-300 rounded focus:ring-2 focus:ring-blue-100 outline-none"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        autoFocus
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') setIsEditing(false);
                            if (e.key === 'Escape') { setValue(item.value); setIsEditing(false); }
                        }}
                    />
                    <button onClick={() => setIsEditing(false)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"><Check className="w-3.5 h-3.5" /></button>
                    <button onClick={() => { setValue(item.value); setIsEditing(false); }} className="p-1 text-rose-500 hover:bg-rose-50 rounded"><X className="w-3.5 h-3.5" /></button>
                </div>
            ) : (
                <div className="flex items-center justify-between gap-2 min-h-[24px]">
                    <div className={cn(
                        "text-sm font-medium break-words flex items-center gap-2",
                        item.isLink && "text-blue-600 hover:underline cursor-pointer",
                        hasError ? "text-slate-900" : "text-slate-900 dark:text-slate-200"
                    )}>
                        {value || <span className="text-slate-300 italic">--</span>}

                        {hasError && (
                            <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 text-[9px] font-bold uppercase tracking-wide rounded-sm border border-rose-200 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> Missing
                            </span>
                        )}
                    </div>

                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                        {item.copyable && value && (
                            <button
                                className="p-1 hover:bg-slate-100 rounded"
                                title="Copy"
                                onClick={() => navigator.clipboard.writeText(value)}
                            >
                                <Copy className="w-3 h-3 text-slate-400" />
                            </button>
                        )}
                        {item.href && (
                            <a
                                href={item.href}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 hover:bg-slate-100 rounded"
                            >
                                <ExternalLink className="w-3 h-3 text-slate-400" />
                            </a>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
