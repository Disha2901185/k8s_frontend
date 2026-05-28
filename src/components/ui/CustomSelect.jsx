import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export const CustomSelect = ({
    options,
    value,
    onChange,
    placeholder = "Select...",
    className,
    icon: Icon,
    trigger, // Optional custom trigger component
    searchable = false,
    searchPlaceholder = "Search..."
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
    const containerRef = useRef(null);
    const dropdownRef = useRef(null);
    const searchInputRef = useRef(null);

    const selectedOption = options.find(opt => opt.value === value);
    const filteredOptions = searchable
        ? options.filter((option) =>
            String(option.label || '')
                .toLowerCase()
                .includes(searchTerm.trim().toLowerCase())
        )
        : options;

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target) &&
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target)
            ) {
                setIsOpen(false);
            }
        };

        const handleScroll = (event) => {
            if (!isOpen) return;
            const scrollTarget = event?.target;
            if (
                (dropdownRef.current && scrollTarget && dropdownRef.current.contains(scrollTarget)) ||
                (containerRef.current && scrollTarget && containerRef.current.contains(scrollTarget))
            ) {
                return;
            }
            setIsOpen(false);
        };

        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('scroll', handleScroll, true);
        window.addEventListener('resize', handleScroll);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('scroll', handleScroll, true);
            window.removeEventListener('resize', handleScroll);
        };
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            // Check if we should open upwards (if close to bottom of screen)
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;
            const dropdownHeight = Math.min(options.length * 44 + 10, 300); // Updated height estimation

            const openUpwards = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;

            setPosition({
                top: openUpwards ? rect.top - dropdownHeight - 4 : rect.bottom + 4,
                left: rect.left,
                width: rect.width,
                transformOrigin: openUpwards ? 'bottom' : 'top'
            });
        }
    }, [isOpen, options.length]);

    useEffect(() => {
        if (!isOpen) {
            setSearchTerm('');
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && searchable) {
            window.setTimeout(() => {
                searchInputRef.current?.focus();
            }, 0);
        }
    }, [isOpen, searchable]);

    return (
        <div className="relative" ref={containerRef}>
            {trigger ? (
                <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
                    {trigger}
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className={cn(
                        "flex items-center justify-between w-full px-3 py-2 text-sm bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-lg shadow-sm transition-all duration-200 cursor-pointer",
                        "hover:bg-slate-50 dark:hover:bg-neutral-800 hover:border-slate-300 dark:hover:border-neutral-700",
                        "focus:outline-none focus:ring-2 focus:ring-slate-200 dark:focus:ring-neutral-800",
                        className
                    )}
                >
                    <div className="flex items-center gap-2 truncate">
                        {Icon && <Icon className="w-4 h-4 text-sub dark:text-neutral-400" />}
                        <span className={cn("truncate", !selectedOption ? "text-sub dark:text-neutral-400" : "text-main dark:text-white font-medium")}>
                            {selectedOption ? selectedOption.label : placeholder}
                        </span>
                    </div>
                    <ChevronDown className={cn(
                        "w-4 h-4 text-sub dark:text-neutral-400 transition-transform duration-200 ml-2 shrink-0",
                        isOpen && "transform rotate-180"
                    )} />
                </button>
            )}

            {isOpen && createPortal(
                <div
                    ref={dropdownRef}
                    style={{
                        top: position.top,
                        left: position.left,
                        width: Math.max(position.width, 160), // Increased min width
                        zIndex: 9999
                    }}
                    className="fixed mt-1 bg-white dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-lg shadow-xl animate-in fade-in zoom-in-95 duration-100 overflow-hidden"
                >
                    {searchable && (
                        <div className="p-2 border-b border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                                placeholder={searchPlaceholder}
                                className="w-full px-2.5 py-1.5 text-xs rounded-md border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                            />
                        </div>
                    )}
                    <div className="py-1.5 max-h-72 overflow-auto custom-scrollbar bg-white dark:bg-neutral-950">
                        {filteredOptions.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => {
                                    onChange(option.value);
                                    setIsOpen(false);
                                }}
                                className={cn(
                                    "flex items-center justify-between w-full px-4 py-2.5 text-sm text-left transition-colors",
                                    option.value === value
                                        ? "bg-blue-600 text-white"
                                        : "text-slate-700 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 hover:text-blue-600 dark:hover:text-blue-400"
                                )}
                            >
                                <span className={cn("truncate", option.value === value ? "font-semibold" : "")}>{option.label}</span>
                                {option.value === value && (
                                    <Check className="w-3.5 h-3.5 text-white ml-2" />
                                )}
                            </button>
                        ))}
                        {filteredOptions.length === 0 && (
                            <div className="px-4 py-3 text-xs text-slate-500 dark:text-neutral-400">
                                No results found
                            </div>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

