import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Receipt, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SmartSelect } from '@/components/ui/SmartSelect';
import { formatCurrency } from '@/features/finance/financeApiHelpers';

const MotionDiv = motion.div;

const PAYMENT_MODES = ['Bank Remittance', 'Bank Transfer', 'UPI', 'Cheque', 'Cash'];

export const EditReceiptDrawer = ({ isOpen, receipt, invoice, currency = 'INR', onClose, onSave }) => {
    const [formData, setFormData] = useState({
        invoiceNo: '',
        receiptDate: '',
        amountReceived: '',
        tds: '',
        chargesAndLevies: '',
        withholding: '',
        paymentMode: '',
        details: ''
    });
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isOpen) {
            setFormData({
                invoiceNo: '',
                receiptDate: '',
                amountReceived: '',
                tds: '',
                chargesAndLevies: '',
                withholding: '',
                paymentMode: '',
                details: ''
            });
            setIsSaving(false);
            setError('');
            return;
        }

        if (receipt) {
            setFormData({
                invoiceNo: receipt.invoiceNo || '',
                receiptDate: receipt.receiptDate || '',
                amountReceived: String(receipt.amountReceived ?? ''),
                tds: String(receipt.tds ?? ''),
                chargesAndLevies: String(receipt.chargesAndLevies ?? ''),
                withholding: String(receipt.withholding ?? ''),
                paymentMode: receipt.paymentMode || '',
                details: receipt.details || ''
            });
        } else if (invoice) {
            setFormData({
                invoiceNo: invoice.invoiceNo || '',
                receiptDate: '',
                amountReceived: String(invoice.totalAmount ?? invoice.amount ?? ''),
                tds: '',
                chargesAndLevies: '',
                withholding: '',
                paymentMode: '',
                details: ''
            });
        }
    }, [isOpen, receipt, invoice]);

    if (!isOpen) return null;

    const inputClasses = "w-full px-4 py-2.5 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-500";
    const moneyInputClasses = cn(inputClasses, "pl-10");
    const currencySymbol = formatCurrency(0, currency).replace(/[0-9,.\s]/g, '') || '₹';

    const parseRequiredNumber = (value) => {
        if (value === '' || value === null || value === undefined) {
            return null;
        }

        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    };

    const validateForm = () => {
        if (!formData.invoiceNo.trim()) return 'Invoice number is required';
        if (!formData.receiptDate) return 'Receipt date is required';
        if (parseRequiredNumber(formData.amountReceived) === null) return 'Amount is required';
        if (!formData.paymentMode) return 'Payment mode is required';
        return '';
    };

    const handleSave = async () => {
        try {
            const validationError = validateForm();
            if (validationError) {
                setError(validationError);
                return;
            }

            const amountReceived = parseRequiredNumber(formData.amountReceived);

            setIsSaving(true);
            setError('');
            await onSave({
                ...receipt,
                ...formData,
                amountReceived,
                tds: Number(formData.tds) || 0,
                chargesAndLevies: Number(formData.chargesAndLevies) || 0,
                withholding: Number(formData.withholding) || 0
            });
            onClose();
        } catch (saveError) {
            setError(saveError?.message || 'Failed to save receipt');
        } finally {
            setIsSaving(false);
        }
    };

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
                <div className="px-8 py-6 border-b border-slate-100 dark:border-neutral-800 shrink-0">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-emerald-50 dark:bg-[#1A1A1A] rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                                <Receipt className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                                    Receipt
                                </h2>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-lg transition-colors">
                            <X className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-8 py-6">
                    <div className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 ml-1">Invoice No <span className="text-rose-500">*</span></label>
                            <input
                                type="text"
                                value={formData.invoiceNo}
                                readOnly
                                className={cn(inputClasses, "bg-slate-50 dark:bg-neutral-800 text-slate-500 dark:text-neutral-300")}
                                placeholder="Invoice No"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 ml-1">Receipt Date <span className="text-rose-500">*</span></label>
                            <input
                                type="date"
                                value={formData.receiptDate}
                                onChange={(e) => setFormData({ ...formData, receiptDate: e.target.value })}
                                className={cn(inputClasses, "dark:[color-scheme:dark]")}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 ml-1">Amount <span className="text-rose-500">*</span></label>
                            <div className="relative">
                                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-medium text-slate-400 dark:text-neutral-500">
                                    {currencySymbol}
                                </span>
                                <input
                                    type="number"
                                    value={formData.amountReceived}
                                    onChange={(e) => setFormData({ ...formData, amountReceived: e.target.value })}
                                    className={moneyInputClasses}
                                    placeholder="Amount Received"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 ml-1">TDS</label>
                            <div className="relative">
                                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-medium text-slate-400 dark:text-neutral-500">
                                    {currencySymbol}
                                </span>
                                <input
                                    type="number"
                                    value={formData.tds}
                                    onChange={(e) => setFormData({ ...formData, tds: e.target.value })}
                                    className={moneyInputClasses}
                                    placeholder="Tax Deducted at Source"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 ml-1">Charges & Levies</label>
                            <div className="relative">
                                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-medium text-slate-400 dark:text-neutral-500">
                                    {currencySymbol}
                                </span>
                                <input
                                    type="number"
                                    value={formData.chargesAndLevies}
                                    onChange={(e) => setFormData({ ...formData, chargesAndLevies: e.target.value })}
                                    className={moneyInputClasses}
                                    placeholder="Bank charges , fines"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 ml-1">Withholding</label>
                            <div className="relative">
                                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-medium text-slate-400 dark:text-neutral-500">
                                    {currencySymbol}
                                </span>
                                <input
                                    type="number"
                                    value={formData.withholding}
                                    onChange={(e) => setFormData({ ...formData, withholding: e.target.value })}
                                    className={moneyInputClasses}
                                    placeholder="Security Deposit"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 ml-1">Payment Mode <span className="text-rose-500">*</span></label>
                            <SmartSelect
                                value={formData.paymentMode}
                                onChange={(val) => setFormData({ ...formData, paymentMode: val })}
                                placeholder="Select Payment Mode"
                                options={PAYMENT_MODES}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 ml-1">Details</label>
                            <input
                                type="text"
                                value={formData.details}
                                onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                                className={inputClasses}
                                placeholder="Details"
                            />
                        </div>

                        {error ? (
                            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-900/40 dark:bg-rose-500/10 dark:text-rose-300">
                                {error}
                            </div>
                        ) : null}
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 dark:border-neutral-800 bg-white/80 dark:bg-[#131313]/90 backdrop-blur-md flex gap-3 shrink-0">
                    <button onClick={onClose} className="flex-1 py-3 text-xs font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-neutral-800 rounded-lg transition-colors border border-slate-200 dark:border-neutral-700">
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
