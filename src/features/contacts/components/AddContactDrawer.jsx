import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Building2, Loader2, Mail, Phone, User, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SmartSelect } from '@/components/ui/SmartSelect';
import { QuickCreateCompanyModal } from '@/features/companies/components/QuickCreateCompanyModal';
import { companyApi, contactApi } from '@/lib/api';
import { callApi } from '@/lib/apiService';
import { extractCompanyItems } from '@/features/companies/companyApiHelpers';

const MotionDiv = motion.div;

const contactSchema = z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().optional(),
    title: z.string().optional(),
    email: z.string().email('Invalid email address').or(z.literal('')),
    phone: z.string().optional(),
    companyId: z.string().min(1, 'Associated company is required'),
});

export const AddContactDrawer = ({ isOpen, onClose, contact = null, onSaved, lockedCompany = null }) => {
    const [companyRecords, setCompanyRecords] = useState([]);
    const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [submitError, setSubmitError] = useState('');

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(contactSchema),
        defaultValues: {
            firstName: '',
            lastName: '',
            title: '',
            email: '',
            phone: '',
            companyId: '',
        },
    });
    const selectedCompanyId = watch('companyId');
    const isCompanyLocked = Boolean(lockedCompany?.id);

    useEffect(() => {
        let ignore = false;

        const loadCompanies = async () => {
            try {
                const data = await callApi(companyApi.getAll, { limit: 500 });
                if (!ignore) {
                    setCompanyRecords(extractCompanyItems(data));
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

        reset({
            firstName: contact?.firstName || '',
            lastName: contact?.lastName || '',
            title: contact?.title || '',
            email: contact?.email || '',
            phone: contact?.phone || '',
            companyId: lockedCompany?.id || contact?.companyId || '',
        });
        setSubmitError('');
        setIsSaving(false);
    }, [contact, isOpen, lockedCompany?.id, reset]);

    const companyNames = useMemo(
        () => companyRecords.map((company) => company.name).sort((left, right) => left.localeCompare(right)),
        [companyRecords],
    );

    const selectedCompanyName = useMemo(() => {
        return companyRecords.find((company) => company.id === selectedCompanyId)?.name || '';
    }, [companyRecords, selectedCompanyId]);

    const handleQuickCreateSave = (savedCompany) => {
        if (!savedCompany?.id || !savedCompany?.name) {
            return;
        }

        setCompanyRecords((prev) => [...prev.filter((company) => company.id !== savedCompany.id), savedCompany]);
        setValue('companyId', savedCompany.id, { shouldValidate: true });
        setIsCompanyModalOpen(false);
    };

    const onContactSubmit = async (data) => {
        setIsSaving(true);
        setSubmitError('');

        try {
            const payload = {
                firstName: data.firstName.trim(),
                lastName: data.lastName?.trim() || undefined,
                title: data.title?.trim() || undefined,
                email: data.email?.trim() || undefined,
                phone: data.phone?.trim() || undefined,
                companyId: lockedCompany?.id || data.companyId,
            };

            const savedContact = contact?.id
                ? await callApi(contactApi.update, contact.id, payload)
                : await callApi(contactApi.create, payload);

            onSaved?.(savedContact);
            onClose();
        } catch (error) {
            setSubmitError(error.message || 'Unable to save contact.');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

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
                className="absolute inset-y-0 right-0 w-full md:w-[450px] bg-white dark:bg-neutral-900 shadow-2xl flex flex-col h-full border-l border-slate-100 dark:border-neutral-800"
            >
                <div className="px-6 py-6 border-b border-slate-100 dark:border-neutral-800 shrink-0">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
                                <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                                    {contact?.id ? 'Edit Contact' : 'Add New Contact'}
                                </h2>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-lg transition-colors">
                            <X className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    <form onSubmit={handleSubmit(onContactSubmit)} className="space-y-5">
                        {submitError && (
                            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                    <span>{submitError}</span>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <FormField label="First Name" error={errors.firstName}>
                                <input {...register('firstName')} placeholder="e.g. Rahul" className={inputClasses(!!errors.firstName)} />
                            </FormField>
                            <FormField label="Last Name" error={errors.lastName}>
                                <input {...register('lastName')} placeholder="e.g. Dravid" className={inputClasses(!!errors.lastName)} />
                            </FormField>
                        </div>

                        <FormField label="Title" error={errors.title}>
                            <input {...register('title')} placeholder="e.g. VP Engineering" className={inputClasses(!!errors.title)} />
                        </FormField>

                        <FormField label="Email" error={errors.email}>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input {...register('email')} placeholder="rahul@example.com" className={cn(inputClasses(!!errors.email), 'pl-10')} />
                            </div>
                        </FormField>

                        <FormField label="Phone" error={errors.phone}>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input {...register('phone')} placeholder="+91 98765 43210" className={cn(inputClasses(!!errors.phone), 'pl-10')} />
                            </div>
                        </FormField>

                        {isCompanyLocked ? (
                            <FormField label="Associated Company">
                                <div className={cn(inputClasses(false), 'flex items-center gap-3 text-slate-700 dark:text-neutral-200 bg-slate-50 dark:bg-neutral-800/70')}>
                                    <Building2 className="w-4 h-4 text-slate-400" />
                                    <span>{lockedCompany.name}</span>
                                </div>
                            </FormField>
                        ) : (
                            <SmartSelect
                                label="Associated Company"
                                icon={Building2}
                                placeholder="Search or add company..."
                                options={companyNames}
                                value={selectedCompanyName}
                                onChange={(name) => {
                                    const found = companyRecords.find((company) => company.name === name);
                                    setValue('companyId', found?.id || '', { shouldValidate: true });
                                }}
                                onAddNew={() => setIsCompanyModalOpen(true)}
                                error={errors.companyId}
                                required
                            />
                        )}
                    </form>
                </div>

                <div className="p-6 border-t border-slate-100 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md flex gap-3 shrink-0">
                    <button onClick={onClose} className="flex-1 py-3 text-xs font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-neutral-800 rounded-lg transition-colors border border-slate-200 dark:border-neutral-700">
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit(onContactSubmit)}
                        disabled={isSaving}
                        className="flex-[1.5] py-3 text-xs font-bold rounded-lg shadow-lg transition-all duration-300 bg-blue-600 text-white shadow-blue-500/20 hover:bg-blue-700 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isSaving ? (
                            <span className="inline-flex items-center justify-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Saving
                            </span>
                        ) : (
                            contact?.id ? 'Save Changes' : 'Save Contact'
                        )}
                    </button>
                </div>
            </MotionDiv>

            <QuickCreateCompanyModal
                isOpen={isCompanyModalOpen}
                onClose={() => setIsCompanyModalOpen(false)}
                onSave={handleQuickCreateSave}
            />
        </div>,
        document.body
    );
};

const FormField = ({ label, children, error }) => (
    <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 ml-1">{label}</label>
        {children}
        {error && <p className="text-[10px] text-rose-500 font-semibold ml-1">{error.message}</p>}
    </div>
);

const inputClasses = (hasError) => cn(
    "w-full px-4 py-2.5 bg-white dark:bg-neutral-900 border rounded-lg outline-none transition-all duration-300 text-sm font-medium dark:text-white",
    hasError
        ? "border-rose-300 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10"
        : "border-slate-200 hover:border-slate-300 dark:border-neutral-800 dark:hover:border-neutral-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
);
