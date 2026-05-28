import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { fileApi, dealApi } from '@/lib/api';

// --- Zod Schemas ---

const step1Schema = z.object({
    title: z.string().min(3, "Deal title is required (min 3 chars)"),
    currency: z.string().default('INR'),
    value: z.union([z.literal(''), z.coerce.number().min(0)]).optional(),
    companyId: z.string().optional(),
    companyName: z.string()
        .min(1, "Company name is required")
        .refine(val => !val.toLowerCase().includes('unknown'), {
            message: "Please select or add a valid company (cannot use 'Unknown')"
        }),
    primaryContactId: z.string().optional(),
    primaryContact: z.string().min(1, "Primary contact is required"),
    stage: z.string().min(1, "Pipeline stage is required"),
    associate: z.string().optional(),
    associateSuccessFee: z.coerce.number().min(0).max(100).optional().or(z.literal('')),
}).superRefine((data, ctx) => {
    // Validation Gate: Success Fee required if Associate is selected
    if (data.associate && (!data.associateSuccessFee || data.associateSuccessFee === 0)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['associateSuccessFee'],
            message: "Success Fee % is required",
        });
    }
});

const step2Schema = z.object({
    gstin: z.string().optional(),
    billingStreet: z.string().optional(),
    billingCity: z.string().optional(),
    billingState: z.string().optional(),
    billingCountry: z.string().optional(),
    billingZip: z.string().optional(),
    paymentTerms: z.string().optional(),
    projectType: z.string().optional(),
    poNumber: z.string().optional(),
    poDate: z.string().optional(),
    poEndDate: z.string().optional(),
    duration: z.string().optional(),
    poFile: z.any().optional(),
    poDocumentUrl: z.string().optional(),
    poFileName: z.string().optional(),
});

// Merged schema for final submission
const fullSchema = z.intersection(step1Schema, step2Schema);

const stageMapping = {
    'Discovery': 'DISCOVERY',
    'Proposal': 'PROPOSAL',
    'Negotiation': 'NEGOTIATION',
    'Not Progressing': 'NOT_PROGRESSING',
    'Closed Won': 'CLOSED_WON',
    'DISCOVERY': 'Discovery',
    'PROPOSAL': 'Proposal',
    'NEGOTIATION': 'Negotiation',
    'NOT_PROGRESSING': 'Not Progressing',
    'CLOSED_WON': 'Closed Won',
};

const toBackendStage = (stage) => stageMapping[stage] || stage;
const toUiStage = (stage) => stageMapping[stage] || stage;

const toDealApiPayload = (payload) => {
    const nextPayload = { ...payload };
    delete nextPayload.primaryContactName;
    delete nextPayload.primaryContactEmail;
    delete nextPayload.primaryContactPhone;
    delete nextPayload.associateName;
    delete nextPayload.associateEmail;
    delete nextPayload.associatePhone;
    return nextPayload;
};

export const useDealWorkflow = (onSuccess, initialData = null, submitHandler = null) => {
    const [currentStep, setCurrentStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');

    // Default empty values
    const defaultValues = {
        title: '',
        currency: 'INR',
        value: '',
        companyId: '',
        companyName: '',
        primaryContactId: '',
        primaryContact: '',
        primaryContactEmail: '',
        primaryContactPhone: '',
        stage: 'Discovery',
        gstin: '',
        billingStreet: '',
        billingCity: '',
        billingState: '',
        billingCountry: 'India',
        billingZip: '',
        paymentTerms: 'Net 30',
        projectType: '',
        poNumber: '',
        poDate: '',
        poEndDate: '',
        duration: '',
        associate: '',
        associateName: '',
        associateEmail: '',
        associatePhone: '',
        associateSuccessFee: '',
        poFile: null,
        poDocumentUrl: '',
        poFileName: ''
    };

    // Helper to format date for input[type="date"] (YYYY-MM-DD)
    const formatDateForInput = (dateStr) => {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return '';
            return date.toISOString().split('T')[0];
        } catch {
            return '';
        }
    };

    // Prepare form values from initialData if present
    const formValues = initialData ? {
        ...defaultValues,
        ...initialData,
        stage: toUiStage(initialData.stage) || 'Discovery',
        companyId: (initialData.companyId && !initialData.company?.name?.toLowerCase().includes('unknown')) ? initialData.companyId : '',
        companyName: (() => {
            const name = initialData.company?.name || initialData.companyName || '';
            return name.toLowerCase().includes('unknown') ? '' : name;
        })(),
        primaryContactId: initialData.primaryContactId || initialData.primaryContact?.id || '',
        primaryContact: initialData.primaryContact?.fullName || initialData.primaryContact?.name || '',
        primaryContactEmail: initialData.primaryContact?.email || '',
        primaryContactPhone: initialData.primaryContact?.phone || '',
        value: initialData.value ? String(initialData.value) : '',
        gstin: initialData.taxId || initialData.company?.taxId || '',
        associate: initialData.associateId || '',
        associateName: initialData.associate?.name || '',
        associateEmail: initialData.associate?.email || '',
        associatePhone: initialData.associate?.phone || '',
        associateSuccessFee: initialData.associateSuccessFee ? String(initialData.associateSuccessFee) : '',

        // Enrichment Fields: Smart Pre-filling from Deal or Company
        billingStreet: initialData.billingStreet || initialData.company?.billingStreet || '',
        billingCity: initialData.billingCity || initialData.company?.billingCity || '',
        billingState: initialData.billingState || initialData.company?.billingState || '',
        billingCountry: initialData.billingCountry || initialData.company?.billingCountry || 'India',
        billingZip: initialData.billingZip || initialData.company?.billingZip || '',
        paymentTerms: initialData.paymentTerms || 'Net 30',
        projectType: initialData.projectType || '',
        poNumber: initialData.poNumber || '',
        poDate: formatDateForInput(initialData.poDate),
        poEndDate: formatDateForInput(initialData.poEndDate),
        duration: initialData.duration || '',
        poDocumentUrl: initialData.poDocumentUrl || '',
        poFileName: initialData.poDocumentUrl ? initialData.poDocumentUrl.split('/').pop() : ''
    } : defaultValues;

    const form = useForm({
        resolver: zodResolver(currentStep === 1 ? step1Schema : fullSchema),
        mode: 'onChange',
        defaultValues: defaultValues,
        values: formValues
    });

    const { trigger, getValues, watch } = form;
    const stage = watch('stage');
    const estimatedValue = watch('value') || 0;

    const handleNext = async () => {
        setSubmitError('');
        const isValid = await trigger();
        if (isValid) {
            if (currentStep === 1 && stage === 'Closed Won') {
                // Fetch WorkOrder if deal exists
                if (initialData?.id) {
                    setIsSubmitting(true);
                    try {
                        const response = await dealApi.getWorkOrder(initialData.id);
                        const wo = response.data;
                        if (wo) {
                            form.setValue('gstin', wo.taxId || '');
                            form.setValue('billingStreet', wo.billingStreet || '');
                            form.setValue('billingCity', wo.billingCity || '');
                            form.setValue('billingState', wo.billingState || '');
                            form.setValue('billingCountry', wo.billingCountry || 'India');
                            form.setValue('billingZip', wo.billingZip || '');
                            form.setValue('paymentTerms', wo.paymentTerms || 'Net 30');
                            form.setValue('projectType', wo.projectType || '');
                            form.setValue('poNumber', wo.poNumber || '');
                            form.setValue('poDate', formatDateForInput(wo.poDate));
                            form.setValue('poEndDate', formatDateForInput(wo.poEndDate));
                            form.setValue('duration', wo.duration || '');
                            form.setValue('poDocumentUrl', wo.poDocumentUrl || '');
                            form.setValue('poFileName', wo.poDocumentUrl ? wo.poDocumentUrl.split('/').pop() : '');
                        }
                    } catch (err) {
                        // Gracefully handle 404 (WorkOrder not found yet)
                        if (err.response?.status === 404) {
                            console.log('No existing work order found for this deal, starting fresh.');
                            // Explicitly clear enrichment fields to prevent stale data/fallbacks
                            form.setValue('gstin', '');
                            form.setValue('billingStreet', '');
                            form.setValue('billingCity', '');
                            form.setValue('billingState', '');
                            form.setValue('billingCountry', 'India');
                            form.setValue('billingZip', '');
                            form.setValue('paymentTerms', 'Net 30');
                            form.setValue('projectType', '');
                            form.setValue('poNumber', '');
                            form.setValue('poDate', '');
                            form.setValue('poEndDate', '');
                            form.setValue('duration', '');
                            form.setValue('poDocumentUrl', '');
                            form.setValue('poFileName', '');
                        } else {
                            console.error('Failed to pre-fetch work order:', err);
                        }
                    } finally {
                        setIsSubmitting(false);
                    }
                }
                setCurrentStep(2);
            } else {
                handleSave();
            }
        }
    };

    const handleBack = () => {
        setCurrentStep(1);
    };

    const handleSave = async () => {
        setSubmitError('');
        const isValid = await trigger();
        if (!isValid) return;

        setIsSubmitting(true);
        const data = getValues();
        let finalPoUrl = data.poDocumentUrl;

        // SEQUENTIAL UPLOAD
        if (data.poFile && data.poFile instanceof File) {
            try {
                const response = await fileApi.upload(data.poFile);
                finalPoUrl = response.data.url;
            } catch (err) {
                console.error('Initial upload failed:', err);
                setIsSubmitting(false);
                return;
            }
        }

        const payload = {
            title: data.title,
            description: data.description || initialData?.description,
            currency: data.currency,
            value: (() => {
                if (data.value === '' || data.value === null || data.value === undefined) return 0;
                const parsed = Number(data.value);
                return Number.isFinite(parsed) ? parsed : 0;
            })(),
            stage: toBackendStage(data.stage || 'Discovery'),
            companyId: data.companyId || undefined,
            primaryContactId: data.primaryContactId || undefined,
            primaryContactName: data.primaryContact || undefined,
            primaryContactEmail: data.primaryContactEmail || undefined,
            primaryContactPhone: data.primaryContactPhone || undefined,
            associateId: data.associate || undefined,
            associateName: data.associateName || undefined,
            associateEmail: data.associateEmail || undefined,
            associatePhone: data.associatePhone || undefined,
            associateSuccessFee: data.associateSuccessFee === '' ? undefined : Number(data.associateSuccessFee),
            taxId: data.gstin || undefined,
            billingStreet: data.billingStreet || undefined,
            billingCity: data.billingCity || undefined,
            billingState: data.billingState || undefined,
            billingCountry: data.billingCountry || undefined,
            billingZip: data.billingZip || undefined,
            paymentTerms: data.paymentTerms || undefined,
            projectType: data.projectType || undefined,
            poNumber: data.poNumber || undefined,
            poDate: data.poDate || undefined,
            poEndDate: data.poEndDate || undefined,
            duration: data.duration || undefined,
            poDocumentUrl: finalPoUrl || undefined,
        };

        try {
            if (submitHandler) {
                await submitHandler(payload, data);
            } else {
                const dealApiPayload = toDealApiPayload(payload);
                if (initialData?.id) {
                    await dealApi.update(initialData.id, dealApiPayload);
                } else {
                    await dealApi.create(dealApiPayload);
                }
            }

            onSuccess();
        } catch (error) {
            console.error('Deal submission failed:', error);
            setSubmitError(error?.message || 'Failed to save deal. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return {
        currentStep,
        form,
        isSubmitting,
        submitError,
        stage,
        estimatedValue,
        handleNext,
        handleBack,
        handleSave
    };
};
