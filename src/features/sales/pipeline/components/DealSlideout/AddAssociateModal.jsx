import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export const AddAssociateModal = ({ isOpen, onClose, onSave, initialData = null }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');

    useEffect(() => {
        if (initialData) {
            setName(initialData.name || '');
            setEmail(initialData.email || '');
            setPhone(initialData.phone || '');
        } else {
            setName('');
            setEmail('');
            setPhone('');
        }
        setSubmitError('');
        setIsSubmitting(false);
    }, [initialData, isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;

        setIsSubmitting(true);
        setSubmitError('');

        const associateData = {
            name: name.trim(),
            email: email.trim(),
            phone: phone.trim(),
        };

        try {
            await Promise.resolve(onSave(associateData));
            if (!initialData) {
                setName('');
                setEmail('');
                setPhone('');
            }
            onClose();
        } catch (err) {
            console.error("Failed to process associate:", err);
            // Error should be handled by the parent component (onSave)
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-4">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                    />
                )}
            </AnimatePresence>

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-100 dark:border-neutral-800"
            >
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        {initialData ? 'Edit Associate' : 'Quick Create Associate'}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {submitError && (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                <span>{submitError}</span>
                            </div>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-500 dark:text-neutral-400">Associate Name <span className="text-rose-500">*</span></label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. John Doe"
                                className={inputClasses(false)}
                                autoFocus
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-500 dark:text-neutral-400">Email Address</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="john@example.com"
                                    className={inputClasses(false)}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-500 dark:text-neutral-400">Phone Number</label>
                                <input
                                    type="text"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="+91 98765 43210"
                                    className={inputClasses(false)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2.5 text-xs font-bold text-slate-500 dark:text-neutral-300 bg-slate-50 hover:bg-slate-100 dark:bg-neutral-800 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!name.trim() || isSubmitting}
                            className="flex-1 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-lg shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                            <span>{initialData ? 'Save Changes' : 'Add Associate'}</span>
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>,
        document.body
    );
};

const inputClasses = (hasError) => cn(
    "w-full px-4 py-2.5 bg-white dark:bg-neutral-900 border rounded-lg outline-none transition-all duration-300 text-sm font-medium dark:text-white",
    hasError
        ? "border-rose-300 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10"
        : "border-slate-200 hover:border-slate-300 dark:border-neutral-800 dark:hover:border-neutral-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
);


