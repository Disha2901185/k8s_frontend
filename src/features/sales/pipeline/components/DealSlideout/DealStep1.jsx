import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, DollarSign, Building, AlertCircle, Percent } from 'lucide-react';
import { cn } from '@/lib/utils';
import { QuickCreateCompanyModal } from '@/features/companies/components/QuickCreateCompanyModal';
import { QuickCreateContactModal } from '@/features/contacts/components/QuickCreateContactModal';
import { SmartSelect } from '@/components/ui/SmartSelect';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { Controller } from 'react-hook-form';
import { AssociateSelectWithOptions } from './AssociateSelect';
import { AddAssociateModal } from './AddAssociateModal';
import { associateApi, companyApi, contactApi } from '@/lib/api';
import { callApi } from '@/lib/apiService';
import { extractCompanyItems, extractCompanyNames } from '@/features/companies/companyApiHelpers';
import { CURRENCY_OPTIONS } from '@/lib/const';

const MotionDiv = motion.div;

export const DealStep1 = ({ form, lockedCompany = null }) => {
    const { register, formState: { errors }, setValue, watch, control, trigger } = form;
    const currency = watch('currency', 'INR');
    const selectedCompany = watch('companyName');
    const selectedCompanyId = watch('companyId');

    const [companyRecords, setCompanyRecords] = useState([]);
    const [contactDataset, setContactDataset] = useState([]);
    const [associates, setAssociates] = useState([]);
    const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
    const [isContactModalOpen, setIsContactModalOpen] = useState(false);
    const [isAssociateModalOpen, setIsAssociateModalOpen] = useState(false);
    const currencySymbol = CURRENCY_OPTIONS.find((option) => option.value === currency)?.symbol || '$';

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

        loadCompanies();

        return () => {
            ignore = true;
        };
    }, []);

    useEffect(() => {
        if (!lockedCompany?.id) {
            return;
        }

        setValue('companyName', lockedCompany.name, { shouldValidate: true });
        setValue('companyId', lockedCompany.id, { shouldValidate: true });
    }, [lockedCompany?.id, lockedCompany?.name, setValue]);

    useEffect(() => {
        let ignore = false;

        const loadContacts = async () => {
            if (!selectedCompanyId) {
                setContactDataset([]);
                return;
            }

            try {
                const response = await callApi(contactApi.getAll, { companyId: selectedCompanyId, limit: 100 });
                const contacts = Array.isArray(response?.items) ? response.items : [];
                if (!ignore) {
                    setContactDataset(contacts);
                }
            } catch {
                if (!ignore) {
                    setContactDataset([]);
                }
            }
        };

        loadContacts();

        return () => {
            ignore = true;
        };
    }, [selectedCompanyId]);

    useEffect(() => {
        let ignore = false;

        const loadAssociates = async () => {
            try {
                const response = await callApi(associateApi.getAll, { limit: 100 });
                // API returns { items: [], pagination: {} }
                const nextAssociates = Array.isArray(response?.items) ? response.items : (Array.isArray(response) ? response : []);
                if (!ignore) {
                    setAssociates(nextAssociates);
                }
            } catch (err) {
                console.error("Failed to load associates:", err);
                if (!ignore) {
                    setAssociates([]);
                }
            }
        };

        loadAssociates();

        return () => {
            ignore = true;
        };
    }, []);

    // Automatic ID Resolution: If we have a company name but no ID, try to resolve it from the loaded records
    useEffect(() => {
        if (selectedCompany && !selectedCompanyId && companyRecords.length > 0) {
            const match = companyRecords.find(c => c.name === selectedCompany);
            if (match) {
                setValue('companyId', match.id, { shouldValidate: true });
            } else {
                // If the pre-filled name doesn't match any real record, clear it as requested
                setValue('companyName', '', { shouldValidate: true });
            }
        }
    }, [selectedCompany, selectedCompanyId, companyRecords, setValue]);

    const companyOptions = useMemo(() => {
        return extractCompanyNames(companyRecords).filter(name => !name.toLowerCase().includes('unknown'));
    }, [companyRecords]);

    const filteredContacts = useMemo(() => {
        return contactDataset;
    }, [contactDataset]);

    const handleNewCompany = (savedCompany) => {
        if (!savedCompany?.name) return;

        setCompanyRecords((prev) => {
            const existingIndex = prev.findIndex((company) => company.id === savedCompany.id || company.name === savedCompany.name);
            if (existingIndex === -1) {
                return [...prev, savedCompany];
            }

            const next = [...prev];
            next[existingIndex] = savedCompany;
            return next;
        });

        setValue('companyName', savedCompany.name, { shouldValidate: true });
        setValue('companyId', savedCompany.id, { shouldValidate: true });
        setContactDataset([]);
        setValue('primaryContactId', '');
        setValue('primaryContact', '');
        setValue('primaryContactEmail', '');
        setValue('primaryContactPhone', '');
        setIsCompanyModalOpen(false);
    };

    const handleNewContact = (savedContact) => {
        setContactDataset((prev) => {
            const withoutOld = prev.filter((contact) => contact.id !== savedContact.id);
            return [...withoutOld, savedContact];
        });
        setValue('companyName', savedContact.companyName, { shouldValidate: true });
        setValue('companyId', savedContact.companyId, { shouldValidate: true });
        setValue('primaryContact', savedContact.name, { shouldValidate: true });
        setValue('primaryContactId', savedContact.id, { shouldValidate: true });
        setValue('primaryContactEmail', savedContact.email || '', { shouldValidate: true });
        setValue('primaryContactPhone', savedContact.phone || '', { shouldValidate: true });
        setIsContactModalOpen(false);
    };

    return (
        <MotionDiv
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6 pt-2"
        >
            <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 dark:text-neutral-400">Deal Title <span className="text-rose-500">*</span></label>
                <input
                    {...register('title')}
                    placeholder="e.g. Q3 Software License Deal"
                    className={inputClasses(!!errors.title)}
                    autoFocus
                />
                {errors.title && <ErrorMessage message={errors.title.message} />}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 dark:text-neutral-400">Estimated Value</label>
                    <div className="flex gap-2">
                        <select
                            {...register('currency')}
                            className="bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-lg px-2 text-xs font-bold w-24 outline-none focus:border-blue-500 transition-colors"
                        >
                            {CURRENCY_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.symbol} {option.value}
                                </option>
                            ))}
                        </select>
                        <div className="relative group flex-1">
                            {currency === 'USD' && <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />}
                            {currency !== 'USD' && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-sans text-sm">{currencySymbol}</span>}

                            <input
                                type="number"
                                {...register('value')}
                                placeholder="0.00"
                                className={cn(inputClasses(!!errors.value), "pl-9")}
                            />
                        </div>
                    </div>
                    {errors.value && <ErrorMessage message={errors.value.message} />}
                </div>

                <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 dark:text-neutral-400">Pipeline Stage <span className="text-rose-500">*</span></label>
                    <CustomSelect
                        value={watch('stage') || 'Discovery'}
                        onChange={(val) => setValue('stage', val || 'Discovery', { shouldValidate: true })}
                        options={[
                            { value: 'Discovery', label: 'Discovery' },
                            { value: 'Proposal', label: 'Proposal' },
                            { value: 'Negotiation', label: 'Negotiation' },
                            { value: 'Not Progressing', label: 'Not Progressing' },
                            { value: 'Closed Won', label: 'Closed Won' }
                        ]}
                        className={cn(inputClasses(!!errors.stage), "py-2")}
                        placeholder="Select Stage..."
                    />
                    {errors.stage && <ErrorMessage message={errors.stage.message} />}
                </div>
            </div>

            <SmartSelect
                label="Associated Company"
                icon={Building}
                placeholder="Search or add company..."
                options={companyOptions}
                value={watch('companyName')}
                onChange={(val) => {
                    const match = companyRecords.find((company) => company.name === val);
                    setValue('companyName', val, { shouldValidate: true });
                    setValue('companyId', match?.id || '', { shouldValidate: true });
                    setValue('primaryContactId', '');
                    setValue('primaryContact', '');
                    setValue('primaryContactEmail', '');
                    setValue('primaryContactPhone', '');
                }}
                error={errors.companyName}
                onAddNew={() => setIsCompanyModalOpen(true)}
                disabled={Boolean(lockedCompany?.id)}
                required
            />

            <SmartSelect
                label="Primary Contact"
                subLabel="(Mandatory for closure)"
                icon={User}
                placeholder={selectedCompany ? `Search contacts in ${selectedCompany}...` : "Select a company first..."}
                options={filteredContacts.map((contact) => contact.name)}
                value={watch('primaryContact')}
                onChange={(val) => {
                    const match = filteredContacts.find((contact) => contact.name === val);
                    setValue('primaryContact', val, { shouldValidate: true });
                    setValue('primaryContactId', match?.id || '', { shouldValidate: true });
                    setValue('primaryContactEmail', match?.email || '', { shouldValidate: true });
                    setValue('primaryContactPhone', match?.phone || '', { shouldValidate: true });
                }}
                error={errors.primaryContact}
                onAddNew={() => setIsContactModalOpen(true)}
                disabled={!selectedCompany}
                required
            />

            <div className="space-y-4">
                <div className="space-y-2">
                    <Controller
                        name="associate"
                        control={control}
                        render={({ field: { value, onChange } }) => (
                            <AssociateSelectWithOptions
                                value={value}
                                onChange={(val) => {
                                    onChange(val);
                                    const match = associates.find(a => a.id === val);
                                    setValue('associateName', match?.name || '', { shouldValidate: true });
                                    setValue('associateEmail', match?.email || '', { shouldValidate: true });
                                    setValue('associatePhone', match?.phone || '', { shouldValidate: true });
                                    trigger('associateSuccessFee');
                                }}
                                onAddNew={() => setIsAssociateModalOpen(true)}
                                options={associates}
                                error={errors.associate}
                                placement="top"
                            />
                        )}
                    />
                </div>

                <AnimatePresence>
                    {watch('associate') && (
                        <MotionDiv
                            initial={{ opacity: 0, height: 0, marginTop: 0 }}
                            animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
                            exit={{ opacity: 0, height: 0, marginTop: 0 }}
                            className="overflow-hidden space-y-2"
                        >
                            <label className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 block">
                                Success Fee % <span className="text-rose-500">*</span>
                            </label>
                            <div className="relative group">
                                <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="number"
                                    step="0.1"
                                    max="100"
                                    {...register('associateSuccessFee')}
                                    placeholder="e.g. 10"
                                    className={cn(inputClasses(!!errors.associateSuccessFee), "pl-9")}
                                />
                            </div>
                            {errors.associateSuccessFee && <ErrorMessage message={errors.associateSuccessFee.message} />}
                        </MotionDiv>
                    )}
                </AnimatePresence>
            </div>

            <QuickCreateCompanyModal
                isOpen={isCompanyModalOpen}
                onClose={() => setIsCompanyModalOpen(false)}
                onSave={handleNewCompany}
            />
            <QuickCreateContactModal
                isOpen={isContactModalOpen}
                onClose={() => setIsContactModalOpen(false)}
                onSave={handleNewContact}
                initialData={{
                    companyId: selectedCompanyId || '',
                    companyName: selectedCompany || '',
                    company: selectedCompany || '',
                }}
            />
            <AddAssociateModal
                isOpen={isAssociateModalOpen}
                onClose={() => setIsAssociateModalOpen(false)}
                onSave={async (newAssociate) => {
                    const savedAssociate = await callApi(associateApi.create, {
                        name: newAssociate.name,
                        email: newAssociate.email,
                        phone: newAssociate.phone,
                    });
                    setAssociates((prev) => {
                        const withoutOld = prev.filter((associate) => associate.id !== savedAssociate.id);
                        return [...withoutOld, savedAssociate];
                    });
                    setValue('associate', savedAssociate.id, { shouldValidate: true });
                }}
            />
        </MotionDiv>
    );
};

const ErrorMessage = ({ message }) => (
    <div className="flex items-center gap-1.5 mt-1.5 text-rose-500 animate-in slide-in-from-left-2">
        <AlertCircle className="w-3.5 h-3.5" />
        <p className="text-[10px] font-semibold">{message}</p>
    </div>
);

const inputClasses = (hasError) => cn(
    "w-full px-4 py-2.5 bg-white dark:bg-neutral-900 border rounded-lg outline-none transition-all duration-300 text-sm font-medium dark:text-white",
    hasError
        ? "border-rose-300 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10"
        : "border-slate-200 hover:border-slate-300 dark:border-neutral-800 dark:hover:border-neutral-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
);

