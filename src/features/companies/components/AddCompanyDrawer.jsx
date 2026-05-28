import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    ChevronDown,
    Globe,
    Building2,
    MapPin,
    AlertCircle,
    CheckCircle2,
    Loader2,
    Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { companyApi } from '@/lib/api';
import {
    companyFormSchema,
    COMPANY_INDUSTRY_OPTIONS,
    COMPANY_STATUS_OPTIONS,
    getCompanyErrorMessage,
    getCompanyFormDefaults,
    normalizeCompanyPayload,
} from '@/features/companies/companyFormSchema';
import { extractSavedCompany } from '@/features/companies/companyApiHelpers';

export const AddCompanyDrawer = ({ isOpen, onClose, company = null, onSaved }) => {
    const [isAddressExpanded, setIsAddressExpanded] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [submitError, setSubmitError] = useState('');

    const {
        register,
        handleSubmit,
        control,
        reset,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(companyFormSchema),
        defaultValues: getCompanyFormDefaults(company),
    });

    useEffect(() => {
        if (isOpen) {
            reset(getCompanyFormDefaults(company));
            setIsAddressExpanded(Boolean(
                company?.billingStreet ||
                company?.billingCity ||
                company?.billingState ||
                company?.billingCountry ||
                company?.billingZip
            ));
            setIsSaving(false);
            setShowToast(false);
            setSubmitError('');
        }
    }, [company, isOpen, reset]);

    const onSubmit = async (data) => {
        setIsSaving(true);
        setSubmitError('');

        try {
            const payload = normalizeCompanyPayload(data);
            const response = company?.id
                ? await companyApi.update(company.id, payload)
                : await companyApi.create(payload);
            const savedCompany = extractSavedCompany(response);

            setShowToast(true);
            onSaved?.(savedCompany);

            setTimeout(() => {
                setShowToast(false);
                onClose();
            }, 1500);
        } catch (error) {
            setSubmitError(getCompanyErrorMessage(error));
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen && !showToast) return null;

    return createPortal(
        <div className="fixed inset-0 z-[120] overflow-hidden">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"
                    />
                )}
            </AnimatePresence>

            <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="absolute inset-y-0 right-0 w-full md:w-[400px] bg-white dark:bg-neutral-900 shadow-2xl flex flex-col h-full border-l border-slate-100 dark:border-neutral-800"
            >
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md z-10 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                            <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
                                {company ? 'Edit Company' : 'Add Company'}
                            </h2>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 hover:bg-slate-50 dark:hover:bg-neutral-800 rounded-md transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        {submitError && (
                            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                    <span>{submitError}</span>
                                </div>
                            </div>
                        )}

                        <div className="space-y-5">
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="space-y-2"
                            >
                                <label className="text-xs font-semibold text-slate-900 dark:text-neutral-200 flex items-center gap-1">
                                    Company Name <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    {...register('name')}
                                    autoComplete="off"
                                    placeholder="e.g. Reliance Industries"
                                    className={cn(
                                        "w-full px-3 py-2.5 bg-white dark:bg-neutral-900 border rounded-md outline-none transition-all duration-300 text-sm font-medium",
                                        errors.name
                                            ? "border-rose-300 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10"
                                            : "border-slate-200 hover:border-slate-300 dark:border-neutral-800 dark:hover:border-neutral-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 shadow-sm"
                                    )}
                                />
                                {errors.name && <p className="text-[10px] font-semibold text-rose-500">{errors.name.message}</p>}
                            </motion.div>

                            <div className="grid grid-cols-2 gap-4">
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.15 }}
                                    className="space-y-2"
                                >
                                    <label className="text-xs font-semibold text-slate-900 dark:text-neutral-200">Industry</label>
                                    <Controller
                                        name="industry"
                                        control={control}
                                        render={({ field }) => (
                                            <CustomSelect
                                                value={field.value}
                                                onChange={field.onChange}
                                                placeholder="Select..."
                                                options={COMPANY_INDUSTRY_OPTIONS}
                                                className="w-full"
                                            />
                                        )}
                                    />
                                </motion.div>

                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="space-y-2"
                                >
                                    <label className="text-xs font-semibold text-slate-900 dark:text-neutral-200">Status</label>
                                    <Controller
                                        name="status"
                                        control={control}
                                        render={({ field }) => (
                                            <CustomSelect
                                                value={field.value}
                                                onChange={field.onChange}
                                                options={COMPANY_STATUS_OPTIONS}
                                                className="w-full"
                                            />
                                        )}
                                    />
                                </motion.div>
                            </div>

                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.25 }}
                                className="space-y-2"
                            >
                                <label className="text-xs font-semibold text-slate-900 dark:text-neutral-200">Website</label>
                                <div className="relative group">
                                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                    <input
                                        {...register('website')}
                                        placeholder="https://example.com"
                                        className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 hover:border-slate-300 dark:hover:border-neutral-700 rounded-md outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-300 text-sm font-medium"
                                    />
                                </div>
                                {errors.website && <p className="text-[10px] font-semibold text-rose-500">{errors.website.message}</p>}
                            </motion.div>
                        </div>

                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="pt-4"
                        >
                            <button
                                type="button"
                                onClick={() => setIsAddressExpanded(!isAddressExpanded)}
                                className="w-full flex items-center justify-between group p-3 bg-slate-50 dark:bg-neutral-900/50 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-900 transition-colors border border-slate-100 dark:border-neutral-800"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "p-1.5 rounded-md transition-colors",
                                        isAddressExpanded ? "bg-blue-100 text-blue-600 dark:bg-blue-900/40" : "bg-white dark:bg-neutral-900 text-slate-400 dark:text-neutral-500 border border-slate-200 dark:border-neutral-800"
                                    )}>
                                        <MapPin className="w-4 h-4" />
                                    </div>
                                    <div className="text-left">
                                        <span className="text-sm font-semibold text-slate-900 dark:text-white block">Address</span>
                                    </div>
                                </div>
                                <div className={cn(
                                    "transition-transform duration-300 text-slate-400",
                                    isAddressExpanded ? "rotate-180 text-blue-500" : ""
                                )}>
                                    <ChevronDown className="w-4 h-4" />
                                </div>
                            </button>

                            <AnimatePresence>
                                {isAddressExpanded && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] }}
                                        className="overflow-hidden"
                                    >
                                        <div className="pt-5 space-y-4 px-1 pb-2">
                                            <div className="space-y-2">
                                                <label className="text-xs font-semibold text-slate-900 dark:text-neutral-200">Street Address</label>
                                                <textarea
                                                    {...register('address')}
                                                    rows={3}
                                                    className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 hover:border-slate-300 dark:hover:border-neutral-700 rounded-md outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-300 text-sm font-medium resize-none"
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-xs font-semibold text-slate-900 dark:text-neutral-200">City</label>
                                                    <input
                                                        {...register('city')}
                                                        className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 hover:border-slate-300 dark:hover:border-neutral-700 rounded-md outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-300 text-sm font-medium"
                                                    />
                                                </div>
                                                <div className="space-y-2 text-blue-600 dark:text-blue-400">
                                                    <label className="text-xs font-semibold text-slate-900 dark:text-neutral-200 flex items-center gap-1">
                                                        State <Shield className="w-2.5 h-2.5 opacity-50 text-slate-400" />
                                                    </label>
                                                    <input
                                                        {...register('state')}
                                                        placeholder="For GST"
                                                        className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-blue-100 dark:border-blue-900/30 hover:border-blue-300 dark:hover:border-blue-700 rounded-md outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-300 text-sm font-medium placeholder:text-slate-400 placeholder:text-xs"
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-xs font-semibold text-slate-900 dark:text-neutral-200">Country</label>
                                                    <input
                                                        {...register('country')}
                                                        className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 hover:border-slate-300 dark:hover:border-neutral-700 rounded-md outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-300 text-sm font-medium"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-semibold text-slate-900 dark:text-neutral-200">Zip Code</label>
                                                    <input
                                                        {...register('zipCode')}
                                                        className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 hover:border-slate-300 dark:hover:border-neutral-700 rounded-md outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-300 text-sm font-medium"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>

                    </form>
                </div>

                <div className="px-6 py-5 border-t border-slate-100 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md flex gap-3 sticky bottom-0 z-10 shrink-0">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-neutral-800 text-slate-600 dark:text-neutral-400 font-medium rounded-md hover:bg-slate-50 dark:hover:bg-neutral-800 transition-colors text-sm"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit(onSubmit)}
                        disabled={isSaving}
                        className="flex-[1.5] px-4 py-2.5 relative font-medium rounded-md shadow-lg transition-all duration-200 text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isSaving ? (
                            <div className="flex justify-center items-center gap-2">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Processing</span>
                            </div>
                        ) : (
                            <span>{company ? 'Update Company' : 'Save Company'}</span>
                        )}
                    </button>
                </div>
            </motion.div>

            <AnimatePresence>
                {showToast && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, x: '-50%' }}
                        animate={{ opacity: 1, y: 0, x: '-50%' }}
                        exit={{ opacity: 0, y: 20, x: '-50%' }}
                        className="fixed bottom-8 left-1/2 z-[200] bg-emerald-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3"
                    >
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="font-semibold text-sm tracking-wide">
                            {company ? 'Company Updated Successfully!' : 'Company Saved Successfully!'}
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>,
        document.body
    );
};
