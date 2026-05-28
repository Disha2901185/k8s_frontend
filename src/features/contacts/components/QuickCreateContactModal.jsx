import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SmartSelect } from '@/components/ui/SmartSelect';
import { QuickCreateCompanyModal } from '@/features/companies/components/QuickCreateCompanyModal';
import { companyApi, contactApi } from '@/lib/api';
import { callApi } from '@/lib/apiService';
import { extractCompanyItems } from '@/features/companies/companyApiHelpers';

const contactSchema = z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().optional(),
    title: z.string().optional(),
    companyId: z.string().min(1, 'Company is required'),
    email: z.string().email('Invalid email').or(z.literal('')),
    phone: z.string().optional(),
});

const parseName = (fullName) => {
    if (!fullName) return { firstName: '', lastName: '' };
    const parts = fullName.trim().split(/\s+/);
    return {
        firstName: parts[0] || '',
        lastName: parts.slice(1).join(' '),
    };
};

export const QuickCreateContactModal = ({
    isOpen,
    onClose,
    onSave,
    initialData = null,
    submitLabel = 'Save',
}) => {
    const [companyRecords, setCompanyRecords] = useState([]);
    const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');

    const { register, handleSubmit, reset, setValue, watch, getValues, formState: { errors } } = useForm({
        resolver: zodResolver(contactSchema),
        defaultValues: {
            firstName: '',
            lastName: '',
            title: '',
            companyId: '',
            email: '',
            phone: '',
        },
    });

    useEffect(() => {
        let ignore = false;

        const loadCompanies = async () => {
            try {
                const response = await callApi(companyApi.getAll, { limit: 500 });
                if (!ignore) {
                    setCompanyRecords(extractCompanyItems(response));
                }
            } catch {
                if (!ignore) {
                    setCompanyRecords([]);
                }
            }
        };

        if (isOpen) {
            loadCompanies();
        }

        return () => {
            ignore = true;
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const parsed = parseName(initialData?.name);

        reset({
            firstName: initialData?.firstName || parsed.firstName || '',
            lastName: initialData?.lastName || parsed.lastName || '',
            title: initialData?.title || '',
            companyId: initialData?.companyId || '',
            email: initialData?.email || '',
            phone: initialData?.phone || '',
        });
        setSubmitError('');
        setIsSubmitting(false);
    }, [initialData, isOpen, reset]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const preferredCompanyName = initialData?.company || initialData?.companyName || '';
        if (!preferredCompanyName || getValues('companyId')) {
            return;
        }

        const matchedCompany = companyRecords.find((company) => company.name === preferredCompanyName);
        if (matchedCompany?.id) {
            setValue('companyId', matchedCompany.id, { shouldValidate: true });
        }
    }, [companyRecords, getValues, initialData, isOpen, setValue]);

    const companyNameById = useMemo(
        () => new Map(companyRecords.map((company) => [company.id, company.name])),
        [companyRecords],
    );

    const selectedCompanyName = companyNameById.get(watch('companyId')) || '';
    const companyNames = [...new Set([
        ...companyRecords.map((company) => company.name),
    ].filter(Boolean))].sort((left, right) => left.localeCompare(right));

    const handleNewCompany = (savedCompany) => {
        if (!savedCompany?.id || !savedCompany?.name) {
            return;
        }

        setCompanyRecords((prev) => {
            const existing = prev.find((company) => company.id === savedCompany.id);
            if (existing) {
                return prev.map((company) => company.id === savedCompany.id ? savedCompany : company);
            }

            return [...prev, savedCompany];
        });

        setValue('companyId', savedCompany.id, { shouldValidate: true });
        setIsCompanyModalOpen(false);
    };

    const onSubmit = async (data) => {
        setIsSubmitting(true);
        setSubmitError('');

        try {
            // IF CONVERTING A LEAD:
            // We skip the generic contact creation and pass the raw data to the parent.
            // The parent (LeadsPage) will call the specialized conversion API.
            if (initialData?.id || initialData?.leadId) {
                onSave?.({
                    ...data,
                    firstName: data.firstName.trim(),
                    lastName: data.lastName?.trim() || undefined,
                    title: data.title?.trim() || undefined,
                    companyId: data.companyId,
                    email: data.email?.trim() || undefined,
                    phone: data.phone?.trim() || undefined,
                });
                onClose();
                return;
            }

            // STANDALONE CONTACT CREATION:
            const savedContact = await callApi(contactApi.create, {
                firstName: data.firstName.trim(),
                lastName: data.lastName?.trim() || undefined,
                title: data.title?.trim() || undefined,
                companyId: data.companyId,
                email: data.email?.trim() || undefined,
                phone: data.phone?.trim() || undefined,
            });

            onSave?.(savedContact);
            onClose();
        } catch (error) {
            setSubmitError(error.message || 'Unable to create contact.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const modalContent = (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
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
                        className="relative w-full max-w-lg bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-slate-100 dark:border-neutral-800"
                    >
                        <div className="px-8 py-6 border-b border-slate-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-t-xl">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Quick Create Contact</h3>
                        </div>

                        <form onSubmit={(event) => { event.stopPropagation(); handleSubmit(onSubmit)(event); }} className="p-8 space-y-5">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <label className="text-right text-xs font-medium text-slate-500 dark:text-neutral-400">First Name</label>
                                <div className="col-span-3">
                                    <input 
                                        {...register('firstName')} 
                                        className={inputClasses(!!errors.firstName)} 
                                        autoFocus 
                                        readOnly={!!(initialData?.firstName || parseName(initialData?.name).firstName)}
                                    />
                                    {errors.firstName && <p className="text-[10px] text-rose-500 mt-1">{errors.firstName.message}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-4 items-center gap-4">
                                <label className="text-right text-xs font-medium text-slate-500 dark:text-neutral-400">Last Name</label>
                                <div className="col-span-3">
                                    <input 
                                        {...register('lastName')} 
                                        className={inputClasses(!!errors.lastName)} 
                                        readOnly={!!(initialData?.lastName || parseName(initialData?.name).lastName)}
                                    />
                                    {errors.lastName && <p className="text-[10px] text-rose-500 mt-1">{errors.lastName.message}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-4 items-center gap-4">
                                <label className="text-right text-xs font-medium text-slate-500 dark:text-neutral-400">Title</label>
                                <div className="col-span-3">
                                    <input {...register('title')} className={inputClasses(!!errors.title)} />
                                </div>
                            </div>

                            <div className="grid grid-cols-4 items-center gap-4">
                                <label className="text-right text-xs font-medium text-slate-500 dark:text-neutral-400">Company</label>
                                <div className="col-span-3">
                                    <SmartSelect
                                        icon={Building2}
                                        placeholder="Select company..."
                                        options={companyNames}
                                        value={selectedCompanyName}
                                        onChange={(value) => {
                                            const match = companyRecords.find((company) => company.name === value);
                                            setValue('companyId', match?.id || '', { shouldValidate: true });
                                        }}
                                        error={errors.companyId}
                                        onAddNew={() => setIsCompanyModalOpen(true)}
                                        addNewLabel="Add New Company"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-4 items-center gap-4">
                                <label className="text-right text-xs font-medium text-slate-500 dark:text-neutral-400">Email</label>
                                <div className="col-span-3">
                                    <input 
                                        {...register('email')} 
                                        className={inputClasses(!!errors.email)} 
                                        readOnly={!!initialData?.email}
                                    />
                                    {errors.email && <p className="text-[10px] text-rose-500 mt-1">{errors.email.message}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-4 items-center gap-4">
                                <label className="text-right text-xs font-medium text-slate-500 dark:text-neutral-400">Phone</label>
                                <div className="col-span-3">
                                    <input 
                                        {...register('phone')} 
                                        className={inputClasses(!!errors.phone)} 
                                        readOnly={!!initialData?.phone}
                                    />
                                </div>
                            </div>

                            {submitError && (
                                <div className="text-[11px] font-semibold text-rose-500">
                                    {typeof submitError === 'object' ? (submitError.message || JSON.stringify(submitError)) : String(submitError)}
                                </div>
                            )}

                            <div className="flex items-center justify-end pt-6 border-t border-slate-100 dark:border-neutral-800 mt-6">
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-lg hover:bg-slate-50 dark:hover:bg-neutral-700 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                                    >
                                        {isSubmitting ? (
                                            <span className="inline-flex items-center gap-2">
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Saving
                                            </span>
                                        ) : submitLabel}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </motion.div>

                    <QuickCreateCompanyModal
                        isOpen={isCompanyModalOpen}
                        onClose={() => setIsCompanyModalOpen(false)}
                        onSave={handleNewCompany}
                    />
                </div>
            )}
        </AnimatePresence>
    );

    return createPortal(modalContent, document.body);
};

const inputClasses = (hasError) => cn(
    "w-full px-4 py-2 bg-white dark:bg-neutral-900 border rounded-lg outline-none transition-all duration-300 text-sm dark:text-white",
    hasError
        ? "border-rose-300 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10"
        : "border-slate-200 hover:border-slate-300 dark:border-neutral-800 dark:hover:border-neutral-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
);
