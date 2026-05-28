import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SmartSelect } from '@/components/ui/SmartSelect';
import { financeOpsApi } from '@/lib/api';
import { callApi } from '@/lib/apiService';

const MotionDiv = motion.div;

const getCurrencySymbol = (currency) => {
    switch ((currency || '').toUpperCase()) {
        case 'EUR': return '€';
        case 'GBP': return '£';
        case 'INR': return '₹';
        case 'USD':
        default:    return '$';
    }
};

export const AddOrderItemDrawer = ({
    isOpen,
    onClose,
    onSave,
    item,
    currency,
    orderValue,
    orderItems = [],
}) => {
    const [formData, setFormData] = useState({
        itemDetails: '',
        itemType: '',
        itemAmount: '',
        billingFrequency: '',
    });
    const [itemTypeOptions, setItemTypeOptions] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const loadItemTypes = async () => {
            try {
                const response = await callApi(financeOpsApi.getItemTypes);
                const nextOptions = Array.isArray(response) ? response : [];
                const mergedOptions =
                    item?.itemType && !nextOptions.some((opt) => opt.toLowerCase() === item.itemType.toLowerCase())
                        ? [...nextOptions, item.itemType]
                        : nextOptions;
                setItemTypeOptions(mergedOptions);
            } catch {
                setItemTypeOptions(item?.itemType ? [item.itemType] : []);
            }
        };

        if (!isOpen) {
            setFormData({ itemDetails: '', itemType: '', itemAmount: '', billingFrequency: '' });
            setIsSaving(false);
            setError('');
            return;
        }

        loadItemTypes();

        if (item) {
            setFormData({
                itemDetails: item.itemDetails || '',
                itemType: item.itemType || '',
                itemAmount: String(item.itemAmount ?? ''),
                billingFrequency: item.billingFrequency || '',
            });
        }
    }, [isOpen, item]);

    // â”€â”€ Budget helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const orderValueNum  = Number(orderValue) || 0;
    // Sum all existing items, excluding the one currently being edited
    const usedAmount = orderItems.reduce((sum, i) => {
        if (item && i.id === item.id) return sum;
        return sum + (Number(i.itemAmount) || 0);
    }, 0);
    const remainingAmount  = orderValueNum - usedAmount;
    const enteredAmount    = Number(formData.itemAmount) || 0;
    const budgetAfterEntry = remainingAmount - enteredAmount;
    const isBudgetExceeded = orderValueNum > 0 && enteredAmount > remainingAmount;

    const handleSave = async () => {
        if (isBudgetExceeded) {
            const sym = getCurrencySymbol(currency);
            const fmt = (n) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            setError(
                `Amount exceeds the order value. Only ${sym}${fmt(remainingAmount)} remaining out of ${sym}${fmt(orderValueNum)}.`
            );
            return;
        }
        try {
            setIsSaving(true);
            setError('');
            if (onSave) {
                await onSave({
                    ...item,
                    ...formData,
                    itemAmount: Number(formData.itemAmount) || 0,
                });
            }
            onClose();
        } catch (saveError) {
            setError(saveError?.message || 'Failed to save item');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    const inputClasses =
        'w-full px-4 py-2.5 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-500';
    const currencySymbol = getCurrencySymbol(currency);
    const fmt = (n) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return createPortal(
        <div className="fixed inset-0 z-[150] overflow-hidden">
            <AnimatePresence>
                {isOpen && (
                    <MotionDiv
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                    />
                )}
            </AnimatePresence>

            <MotionDiv
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="absolute inset-y-0 right-0 w-full md:w-[450px] bg-white dark:bg-[#131313] shadow-2xl flex flex-col h-full border-l border-slate-100 dark:border-neutral-800"
            >
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 dark:border-neutral-800 shrink-0">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-blue-50 dark:bg-[#1A1A1A] rounded-xl border border-blue-100 dark:border-blue-900/30">
                                <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                                    {item ? 'Edit Item' : 'Add Item'}
                                </h2>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-lg transition-colors">
                            <X className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-8 py-6">
                    <div className="space-y-5">

                        {/* Item Details */}
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 ml-1">
                                Item Details<span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.itemDetails}
                                onChange={e => setFormData({ ...formData, itemDetails: e.target.value })}
                                className={inputClasses}
                                placeholder="Item Details"
                            />
                        </div>

                        {/* Item Type */}
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 ml-1">
                                Item Type<span className="text-rose-500">*</span>
                            </label>
                            <SmartSelect
                                value={formData.itemType}
                                onChange={val => setFormData({ ...formData, itemType: val })}
                                placeholder="Item Type"
                                options={itemTypeOptions}
                                allowCreateFromSearch
                                onAddNew={(newType) => {
                                    const nextType = (newType || '').trim();
                                    if (!nextType) return;
                                    setItemTypeOptions((prev) =>
                                        prev.some((opt) => opt.toLowerCase() === nextType.toLowerCase())
                                            ? prev
                                            : [...prev, nextType]
                                    );
                                    setFormData((prev) => ({ ...prev, itemType: nextType }));
                                }}
                            />
                        </div>

                        {/* Item Amount */}
                        <div className="space-y-1.5">
                            {/* Label row with live budget badge */}
                            <div className="flex items-center justify-between ml-1">
                                <label className="text-[11px] font-bold text-slate-500 dark:text-neutral-400">
                                    Item Amount<span className="text-rose-500">*</span>
                                </label>
                                {orderValueNum > 0 && (
                                    <span className={cn(
                                        'text-[10px] font-semibold px-2 py-0.5 rounded-full transition-colors',
                                        isBudgetExceeded
                                            ? 'bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400'
                                            : budgetAfterEntry < orderValueNum * 0.1
                                                ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400'
                                                : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400'
                                    )}>
                                        {isBudgetExceeded
                                            ? `Exceeds by ${currencySymbol}${fmt(Math.abs(budgetAfterEntry))}`
                                            : `${currencySymbol}${fmt(budgetAfterEntry)} remaining`
                                        }
                                    </span>
                                )}
                            </div>

                            {/* Amount input */}
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-medium">
                                    {currencySymbol}
                                </span>
                                <input
                                    type="number"
                                    value={formData.itemAmount}
                                    onChange={e => {
                                        setError('');
                                        setFormData({ ...formData, itemAmount: e.target.value });
                                    }}
                                    className={cn(
                                        inputClasses,
                                        'pl-8',
                                        isBudgetExceeded && 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20 dark:border-rose-500/50'
                                    )}
                                    placeholder="0.00"
                                />
                            </div>

                            {/* Sub-row: order value + used */}
                            {orderValueNum > 0 && (
                                <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-neutral-500 px-1">
                                    <span>Order Value: {currencySymbol}{fmt(orderValueNum)}</span>
                                    <span>Already used: {currencySymbol}{fmt(usedAmount)}</span>
                                </div>
                            )}
                        </div>

                        {/* Billing Frequency */}
                        <div className="space-y-1.5 z-50 relative">
                            <label className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 ml-1">
                                Billing Frequency<span className="text-rose-500">*</span>
                            </label>
                            <SmartSelect
                                value={formData.billingFrequency}
                                onChange={val => setFormData({ ...formData, billingFrequency: val })}
                                placeholder="Select"
                                options={['One-time', 'Monthly', 'Quarterly', 'Annually']}
                            />
                        </div>

                        {/* Error banner */}
                        {error && (
                            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-900/40 dark:bg-rose-500/10 dark:text-rose-300">
                                {error}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 dark:border-neutral-800 bg-white/80 dark:bg-[#131313]/90 backdrop-blur-md flex gap-3 shrink-0">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 text-xs font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-neutral-800 rounded-lg transition-colors border border-slate-200 dark:border-neutral-700"
                    >
                        Close
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex-[1.5] py-3 text-xs font-bold rounded-lg shadow-lg transition-all duration-300 bg-blue-600 text-white shadow-blue-500/20 hover:bg-blue-700 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isSaving ? (
                            <span className="inline-flex items-center justify-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Saving
                            </span>
                        ) : 'Save'}
                    </button>
                </div>
            </MotionDiv>
        </div>,
        document.body
    );
};

