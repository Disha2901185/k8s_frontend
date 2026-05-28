import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronDown, Check, Plus, AlertCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export const SmartSelect = ({
    label,
    subLabel,
    icon: Icon,
    placeholder,
    options,
    value,
    onChange,
    error,
    onAddNew,
    addNewLabel,
    allowCreateFromSearch = false,
    required,
    disabled,
    multiple = false,
    placement = "bottom" // "bottom" | "top"
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const wrapperRef = useRef(null);
    const inputRef = useRef(null);

    const filteredOptions = options.filter(opt =>
        opt.toLowerCase().includes(search.toLowerCase())
    );
    const normalizedSearch = search.trim();
    const hasExactMatch = options.some(opt => opt.toLowerCase() === normalizedSearch.toLowerCase());
    const showCreateOption = Boolean(onAddNew && allowCreateFromSearch && normalizedSearch && !hasExactMatch);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Focus search input when opened
    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current.focus(), 50);
        }
    }, [isOpen]);

    const triggerClasses = (hasError) => cn(
        "w-full px-4 py-2.5 bg-white dark:bg-neutral-900 border rounded-lg outline-none transition-all duration-300 text-sm font-medium flex items-center justify-between cursor-pointer",
        hasError
            ? "border-rose-300 focus:border-rose-500 hover:border-rose-400"
            : "border-slate-200 hover:border-slate-300 dark:border-neutral-800 dark:hover:border-neutral-700 focus:border-blue-500",
        disabled && "opacity-60 cursor-not-allowed bg-slate-50 dark:bg-neutral-900"
    );

    return (
        <div className={cn("space-y-2 relative", isOpen && "z-[80]")} ref={wrapperRef}>
            {label && (
                <label className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 pl-1">
                    {label} {required && <span className="text-rose-500">*</span>}
                    {subLabel && <span className="ml-1 text-[9px] text-slate-400 font-normal normal-case tracking-normal">{subLabel}</span>}
                </label>
            )}

            <div className="relative">
                <div
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    className={triggerClasses(!!error)}
                >
                    <div className="flex items-center gap-2 overflow-hidden">
                        {Icon && <Icon className={cn("w-4 h-4 shrink-0 transition-colors", isOpen ? "text-blue-500" : "text-slate-400")} />}
                        <span className={cn(
                            "flex flex-wrap gap-1.5 items-center", 
                            (!value || (multiple && value.length === 0)) ? "text-slate-400" : "text-slate-900 dark:text-white"
                        )}>
                            {multiple ? (
                                value?.length > 0 ? (
                                    value.map(v => (
                                        <span key={v} className="bg-slate-100 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 px-1.5 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 text-slate-700 dark:text-neutral-300">
                                            <span className="truncate max-w-[150px]">{v}</span>
                                            {!disabled && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onChange(value.filter(item => item !== v));
                                                    }}
                                                    className="hover:text-rose-500 transition-colors p-0.5 rounded-sm hover:bg-rose-50 dark:hover:bg-rose-500/10"
                                                >
                                                    <X className="w-2.5 h-2.5" />
                                                </button>
                                            )}
                                        </span>
                                    ))
                                ) : placeholder
                            ) : (
                                <span className="truncate">{value || placeholder}</span>
                            )}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                        {((multiple ? value?.length > 0 : value)) && !required && !disabled && (
                            <div
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onChange(multiple ? [] : '');
                                }}
                                className="p-0.5 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-md text-slate-400 hover:text-rose-500 transition-colors"
                                title="Clear selection"
                            >
                                <X className="w-3.5 h-3.5" />
                            </div>
                        )}
                        <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform duration-200", isOpen && "rotate-180")} />
                    </div>
                </div>

                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: placement === 'top' ? 4 : -4, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: placement === 'top' ? 4 : -4, scale: 0.98 }}
                            transition={{ duration: 0.15 }}
                            className={cn(
                                "absolute z-50 left-0 right-0 bg-white dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-lg shadow-xl overflow-hidden flex flex-col max-h-[200px]",
                                placement === 'top' ? "bottom-full mb-2" : "top-full mt-2"
                            )}
                        >
                            {/* Search Header - boxed style */}
                            <div className="p-2 border-b border-slate-100 dark:border-neutral-800 shrink-0 bg-white dark:bg-neutral-950">
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                    <input
                                        ref={inputRef}
                                        className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 dark:border-neutral-700 rounded-md outline-none text-slate-700 dark:text-neutral-200 placeholder:text-slate-400 focus:border-blue-500 transition-colors bg-white dark:bg-neutral-800"
                                        placeholder="Search..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Options List */}
                            <div className="overflow-y-auto custom-scrollbar p-1 flex-1 min-h-0 bg-white dark:bg-neutral-950">
                                {filteredOptions.length > 0 ? (
                                    filteredOptions.map((opt) => {
                                        const isSelected = multiple ? value?.includes(opt) : value === opt;
                                        return (
                                            <div
                                                key={opt}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (multiple) {
                                                        if (isSelected) {
                                                            onChange(value.filter(v => v !== opt));
                                                        } else {
                                                            onChange([...(value || []), opt]);
                                                        }
                                                    } else {
                                                        onChange(opt);
                                                        setIsOpen(false);
                                                        setSearch('');
                                                    }
                                                }}
                                                className="px-3 py-2 text-sm text-slate-700 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-neutral-800/50 rounded-md cursor-pointer flex items-center justify-between group transition-colors"
                                            >
                                                <span className={cn("group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors", isSelected && "font-semibold text-blue-600 dark:text-blue-400")}>{opt}</span>
                                                {isSelected && <Check className="w-3.5 h-3.5 text-blue-500" />}
                                            </div>
                                        );
                                    })
                                ) : showCreateOption ? null : (
                                    <div className="px-4 py-8 text-center">
                                        <p className="text-xs text-slate-500 italic">No matches found</p>
                                    </div>
                                )}
                            </div>

                            {/* Sticky Footer */}
                            {onAddNew && (!allowCreateFromSearch || showCreateOption) && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        onAddNew(showCreateOption ? normalizedSearch : undefined);
                                        setIsOpen(false);
                                        setSearch('');
                                    }}
                                    className="w-full relative z-50 border-t border-slate-100 dark:border-neutral-800 px-4 py-2.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors flex items-center justify-start gap-2 bg-slate-50/50 dark:bg-neutral-800/50 shrink-0"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    {showCreateOption
                                        ? `Create "${normalizedSearch}"`
                                        : (addNewLabel || `Add New ${label ? label.replace(/Associated|Primary|Name/g, '').trim() : 'Item'}`)}
                                </button>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            {error && (
                <div className="flex items-center gap-1.5 mt-1.5 text-rose-500 animate-in slide-in-from-left-2">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <p className="text-[10px] font-semibold">{error.message}</p>
                </div>
            )}
        </div>
    );
};
