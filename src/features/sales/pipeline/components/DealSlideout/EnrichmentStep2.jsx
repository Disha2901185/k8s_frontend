import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Calendar, ArrowDownCircle, CheckCircle2, X, FileText, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { companyApi, financeOpsApi } from '@/lib/api';
import { callApi } from '@/lib/apiService';
import { SmartSelect } from '@/components/ui/SmartSelect';

const MotionDiv = motion.div;

export const EnrichmentStep2 = ({ form }) => {
    const { register, formState: { errors }, setValue, watch } = form;
    const fileInputRef = useRef(null);
    const [isAutofilling, setIsAutofilling] = useState(false);
    const [autofillMessage, setAutofillMessage] = useState('');
    const [projectTypeOptions, setProjectTypeOptions] = useState([]);
    
    const currency = watch('currency', 'INR');
    const currencySymbol = getCurrencySymbol(currency);
    const companyId = watch('companyId');
    const poDocumentUrl = watch('poDocumentUrl');
    const poFile = watch('poFile');
    const poFileName = watch('poFileName');
    const selectedProjectType = watch('projectType');

    useEffect(() => {
        let ignore = false;
        const loadProjectTypes = async () => {
            try {
                const response = await callApi(financeOpsApi.getItemTypes);
                const options = Array.isArray(response) ? response : [];
                if (!ignore) {
                    setProjectTypeOptions(options);
                }
            } catch {
                if (!ignore) {
                    setProjectTypeOptions([]);
                }
            }
        };

        loadProjectTypes();

        return () => {
            ignore = true;
        };
    }, []);

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Basic client-side validation
        if (file.size > 5 * 1024 * 1024) {
            alert('File size exceeds 5MB limit');
            return;
        }

        // JUST BUFFER LOCALLY - Upload happens on Confirm Order
        setValue('poFile', file, { shouldValidate: true });
        setValue('poFileName', file.name, { shouldValidate: true });
    };

    const removeFile = (e) => {
        e.stopPropagation();
        setValue('poFile', null, { shouldValidate: true });
        setValue('poDocumentUrl', '', { shouldValidate: true });
        setValue('poFileName', '', { shouldValidate: true });
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleAutofill = async () => {
        if (!companyId) {
            setAutofillMessage('Select a company before autofill.');
            return;
        }

        setIsAutofilling(true);
        setAutofillMessage('');

        try {
            const company = await callApi(companyApi.getById, companyId);
            const companyAddress = company?.address || {};
            const fieldMap = {
                gstin: company?.taxId || company?.gstIn,
                paymentTerms: company?.paymentTerms,
                billingStreet: company?.billingStreet || companyAddress.line1,
                billingCity: company?.billingCity || companyAddress.city,
                billingState: company?.billingState || companyAddress.state,
                billingCountry: company?.billingCountry || companyAddress.country,
                billingZip: company?.billingZip || companyAddress.pincode,
            };

            const populatedFields = Object.entries(fieldMap).filter(([, value]) => {
                return typeof value === 'string' ? value.trim() : value;
            });

            if (!populatedFields.length) {
                setAutofillMessage('No billing details saved for this company.');
                return;
            }

            populatedFields.forEach(([field, value]) => {
                setValue(field, String(value).trim(), { shouldValidate: true, shouldDirty: true });
            });
            setAutofillMessage('Filled from saved company details.');
        } catch (error) {
            setAutofillMessage(error?.message || 'Could not load company details.');
        } finally {
            setIsAutofilling(false);
        }
    };

    return (
        <MotionDiv
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-8 pt-2"
        >
            {/* Value Summary (Editable) */}
            <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20 rounded-xl p-4 flex items-center justify-between gap-4">
                <div className="shrink-0">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">Actual Work Order Value</h4>
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-500 font-medium">Finalize amount from PO</p>
                </div>
                <div className="flex-1 max-w-[200px]">
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600 font-bold">{currencySymbol}</span>
                        <input
                            type="number"
                            {...register('value', { valueAsNumber: true })}
                            className="w-full pl-7 pr-3 py-2 bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-700 dark:text-emerald-400 font-bold text-lg outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-right"
                        />
                    </div>
                    {errors.value && <p className="text-[10px] text-rose-500 font-semibold mt-1 text-right">{errors.value.message}</p>}
                </div>
            </div>

            {/* Financial Details Flow */}
            <div className="space-y-5">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Financial Details</h3>
                    <button
                        type="button"
                        onClick={handleAutofill}
                        disabled={isAutofilling || !companyId}
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 rounded transition-colors flex items-center gap-1"
                    >
                        {isAutofilling ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowDownCircle className="w-3 h-3" />}
                        Autofill from Company
                    </button>
                </div>
                {autofillMessage && (
                    <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 -mt-3">
                        {autofillMessage}
                    </p>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">GSTIN / Tax ID</label>
                        <input
                            {...register('gstin')}
                            placeholder="Tax ID Number"
                            className={cn(inputClasses(!!errors.gstin), "uppercase placeholder:normal-case")}
                        />
                        {errors.gstin && <ErrorMessage message={errors.gstin.message} />}
                    </div>
                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Payment Terms</label>
                        <div className="relative group">
                            <select {...register('paymentTerms')} className={cn(inputClasses(!!errors.paymentTerms), "appearance-none bg-transparent")}>
                                <option value="Net 15">Net 15 Days</option>
                                <option value="Net 30">Net 30 Days</option>
                                <option value="Net 45">Net 45 Days</option>
                                <option value="Immediate">Immediate</option>
                            </select>
                        </div>
                        {errors.paymentTerms && <ErrorMessage message={errors.paymentTerms.message} />}
                    </div>
                </div>

                {/* Billing Address Detailed Fields */}
                <div className="space-y-3 pt-2">
                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        Billing Address
                        <span className="h-px bg-slate-200 flex-1"></span>
                    </label>

                    <div className="space-y-3">
                        <div className="space-y-1">
                            <input
                                {...register('billingStreet')}
                                placeholder="Street Address, Building, Suite..."
                                className={inputClasses(!!errors.billingStreet)}
                            />
                            {errors.billingStreet && <ErrorMessage message={errors.billingStreet.message} />}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <input
                                    {...register('billingCity')}
                                    placeholder="City"
                                    className={inputClasses(!!errors.billingCity)}
                                />
                                {errors.billingCity && <ErrorMessage message={errors.billingCity.message} />}
                            </div>
                            <div className="space-y-1">
                                <input
                                    {...register('billingState')}
                                    placeholder="State / Region"
                                    className={inputClasses(!!errors.billingState)}
                                />
                                {errors.billingState && <ErrorMessage message={errors.billingState.message} />}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <input
                                    {...register('billingCountry')}
                                    placeholder="Country"
                                    className={inputClasses(!!errors.billingCountry)}
                                />
                                {errors.billingCountry && <ErrorMessage message={errors.billingCountry.message} />}
                            </div>
                            <div className="space-y-1">
                                <input
                                    {...register('billingZip')}
                                    placeholder="Zip / Postal Code"
                                    className={inputClasses(!!errors.billingZip)}
                                />
                                {errors.billingZip && <ErrorMessage message={errors.billingZip.message} />}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Order Details Flow */}
            <div className="space-y-5 pt-4 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Order & PO Details</h3>

                <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Project Type</label>
                    <SmartSelect
                        value={selectedProjectType || ''}
                        onChange={(val) => setValue('projectType', val, { shouldValidate: true, shouldDirty: true })}
                        placeholder="Select Project Type..."
                        options={projectTypeOptions}
                        allowCreateFromSearch
                        onAddNew={(newType) => {
                            const nextType = (newType || '').trim();
                            if (!nextType) return;
                            setProjectTypeOptions((prev) =>
                                prev.some((opt) => opt.toLowerCase() === nextType.toLowerCase())
                                    ? prev
                                    : [...prev, nextType]
                            );
                            setValue('projectType', nextType, { shouldValidate: true, shouldDirty: true });
                        }}
                    />
                    {errors.projectType && <ErrorMessage message={errors.projectType.message} />}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">PO Number</label>
                        <input
                            {...register('poNumber')}
                            placeholder="PO-2024-..."
                            className={inputClasses(!!errors.poNumber)}
                        />
                        {errors.poNumber && <ErrorMessage message={errors.poNumber.message} />}
                    </div>
                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">PO Date</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="date"
                                {...register('poDate')}
                                className={cn(inputClasses(!!errors.poDate), "pl-10")}
                            />
                        </div>
                        {errors.poDate && <ErrorMessage message={errors.poDate.message} />}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">PO End Date</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="date"
                                {...register('poEndDate')}
                                className={cn(inputClasses(!!errors.poEndDate), "pl-10")}
                            />
                        </div>
                        {errors.poEndDate && <ErrorMessage message={errors.poEndDate.message} />}
                    </div>
                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Duration</label>
                        <input
                            {...register('duration')}
                            placeholder="e.g. 6 Months"
                            className={inputClasses(!!errors.duration)}
                        />
                        {errors.duration && <ErrorMessage message={errors.duration.message} />}
                    </div>
                </div>

                {/* File Upload Zone */}
                <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center justify-between">
                        Attach PO Document (Optional)
                        {poDocumentUrl && <span className="text-[9px] text-emerald-500 font-bold flex items-center gap-1"><CheckCircle2 className="w-2.5 h-2.5" /> VERIFIED</span>}
                    </label>
                    <input 
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png"
                    />
                    
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className={cn(
                            "relative overflow-hidden border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer group",
                            (poDocumentUrl || poFile)
                                ? "border-emerald-200 bg-emerald-50/30 dark:border-emerald-900/30 dark:bg-emerald-900/10" 
                                : "border-slate-200 hover:border-blue-400 hover:bg-slate-50 dark:border-neutral-800 dark:hover:border-blue-900/50 dark:hover:bg-blue-900/10",
                        )}
                    >
                        <AnimatePresence mode="wait">
                            {(poDocumentUrl || poFile) ? (
                                <motion.div 
                                    key="success"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="flex flex-col items-center w-full px-4"
                                >
                                    <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-3">
                                        <FileText className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-full">
                                        {poFileName || 'Document Attached'}
                                    </p>
                                    <p className="text-[10px] text-emerald-600 dark:text-emerald-500 mt-1 font-medium">Click to replace or use different file</p>
                                    <button 
                                        onClick={removeFile}
                                        className="mt-4 p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full hover:bg-rose-50 hover:text-rose-500 transition-colors shadow-sm"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </motion.div>
                            ) : (
                                <motion.div 
                                    key="idle"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex flex-col items-center"
                                >
                                    <div className="p-4 bg-slate-100 dark:bg-neutral-800 rounded-full mb-4 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
                                        <Upload className={cn("w-6 h-6", "text-slate-400 group-hover:text-blue-600")} />
                                    </div>
                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                        Click to upload Purchase Order
                                    </p>
                                    <p className="text-[10px] text-slate-400 mt-1.5">PDF, JPG or PNG (Max 5MB)</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </MotionDiv>
    );
};

const getCurrencySymbol = (currency) => {
    switch ((currency || '').toUpperCase()) {
        case 'USD':
            return '$';
        case 'EUR':
            return '€';
        case 'GBP':
            return '£';
        case 'INR':
        default:
            return '₹';
    }
};

const ErrorMessage = ({ message }) => (
    <p className="text-[10px] text-rose-500 font-semibold mt-1 animate-in slide-in-from-left-2">
        {typeof message === 'object' ? (message.message || JSON.stringify(message)) : String(message)}
    </p>
);

const inputClasses = (hasError) => cn(
    "w-full px-4 py-2.5 bg-white dark:bg-slate-950 border rounded-lg outline-none transition-all duration-300 text-sm font-medium",
    hasError
        ? "border-rose-300 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10"
        : "border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
);
