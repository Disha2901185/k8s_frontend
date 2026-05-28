import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { companyApi } from '@/lib/api';
import {
    companyFormSchema,
    getCompanyErrorMessage,
    normalizeCompanyPayload,
} from '@/features/companies/companyFormSchema';
import { extractSavedCompany } from '@/features/companies/companyApiHelpers';

const quickCreateCompanySchema = companyFormSchema.pick({
    name: true,
    phone: true,
    website: true,
});

export const QuickCreateCompanyModal = ({ isOpen, onClose, onSave }) => {
    const [isSaving, setIsSaving] = useState(false);
    const [submitError, setSubmitError] = useState('');

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(quickCreateCompanySchema),
        defaultValues: { name: '', phone: '', website: '' },
    });

    useEffect(() => {
        if (isOpen) {
            reset();
            setSubmitError('');
            setIsSaving(false);
        }
    }, [isOpen, reset]);

    const onSubmit = async (data) => {
        setIsSaving(true);
        setSubmitError('');

        try {
            const response = await companyApi.create(normalizeCompanyPayload(data));
            const savedCompany = extractSavedCompany(response);
            onSave?.(savedCompany);
            onClose();
        } catch (error) {
            setSubmitError(getCompanyErrorMessage(error));
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-slate-100 dark:border-neutral-800 overflow-hidden"
                    >
                        <div className="px-6 py-5 border-b border-slate-100 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Quick Create Company</h3>
                        </div>

                        <form onSubmit={(e) => { e.stopPropagation(); handleSubmit(onSubmit)(e); }} className="p-6 space-y-4">
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-500 dark:text-neutral-400">Company Name <span className="text-rose-500">*</span></label>
                                    <input
                                        {...register('name')}
                                        className={inputClasses(!!errors.name)}
                                        placeholder="e.g. Acme Corp"
                                        autoFocus
                                    />
                                    {errors.name && <p className="text-[10px] text-rose-500 font-semibold">{errors.name.message}</p>}
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-500 dark:text-neutral-400">Phone</label>
                                    <input
                                        {...register('phone')}
                                        className={inputClasses(!!errors.phone)}
                                        placeholder="+91 ..."
                                    />
                                    {errors.phone && <p className="text-[10px] text-rose-500 font-semibold">{errors.phone.message}</p>}
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-500 dark:text-neutral-400">Website</label>
                                    <input
                                        {...register('website')}
                                        className={inputClasses(!!errors.website)}
                                        placeholder="https://..."
                                    />
                                    {errors.website && <p className="text-[10px] text-rose-500 font-semibold">{errors.website.message}</p>}
                                </div>
                            </div>

                            {submitError && (
                                <div className="text-[11px] font-semibold text-rose-500">{submitError}</div>
                            )}

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 py-2.5 text-xs font-bold text-slate-500 dark:text-neutral-300 bg-slate-50 hover:bg-slate-100 dark:bg-neutral-800 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="flex-1 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-lg shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {isSaving ? 'Saving...' : 'Add Company'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

const inputClasses = (hasError) => cn(
    "w-full px-4 py-2.5 bg-white dark:bg-neutral-900 border rounded-lg outline-none transition-all duration-300 text-sm font-medium dark:text-white",
    hasError
        ? "border-rose-300 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10"
        : "border-slate-200 hover:border-slate-300 dark:border-neutral-800 dark:hover:border-neutral-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
);
