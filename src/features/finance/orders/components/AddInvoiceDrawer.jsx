import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Download, Eye, FileText, Loader2, Pencil, Plus, Save, Trash2, Upload, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SmartSelect } from '@/components/ui/SmartSelect';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { financeOpsApi } from '@/lib/api';
import { callApi } from '@/lib/apiService';
import { formatCurrency } from '@/features/finance/financeApiHelpers';
import { INDIA_GST_STATE_OPTIONS, OVERSEAS_PLACE_OF_SUPPLY_CODE, TENANT_INVOICE_PROFILE } from '@/lib/const';

const MotionDiv = motion.div;
const DEFAULT_INVOICE_TERMS = [
    '- This invoice is due within 14 days from the invoice date. Late payment will attract interest.',
    '- Payment to be made through Electronic Fund Transfer to:',
    '  Acompworld Technosoft Pvt Ltd',
    '  Bank Account Details:',
    '  ICICI Bank Account# 139005000095',
    '  IFSC Code: ICIC0001390',
].join('\n');

const HsnSacSelect = ({ value, options, inputClasses, onChange, onCreate, disabled = false }) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [menuPosition, setMenuPosition] = useState(null);
    const inputRef = useRef(null);
    const query = search.trim();
    const filteredOptions = options.filter((option) => option.toLowerCase().includes(query.toLowerCase()));
    const hasExactMatch = options.some((option) => option.toLowerCase() === query.toLowerCase());
    const updateMenuPosition = () => {
        const rect = inputRef.current?.getBoundingClientRect();
        if (!rect) return;
        setMenuPosition({
            left: rect.left,
            top: rect.bottom + 6,
            width: rect.width,
        });
    };

    useEffect(() => {
        if (!open) return undefined;
        updateMenuPosition();
        window.addEventListener('resize', updateMenuPosition);
        window.addEventListener('scroll', updateMenuPosition, true);
        return () => {
            window.removeEventListener('resize', updateMenuPosition);
            window.removeEventListener('scroll', updateMenuPosition, true);
        };
    }, [open]);

    const menu = open && menuPosition ? createPortal(
        <div
            className="fixed z-[300] max-h-56 overflow-auto rounded-lg border border-slate-200 bg-white p-1 shadow-xl dark:border-neutral-800 dark:bg-neutral-950"
            style={{ left: menuPosition.left, top: menuPosition.top, width: menuPosition.width }}
        >
            {filteredOptions.map((option) => (
                <button
                    key={option}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                        onChange(option);
                        setSearch(option);
                        setOpen(false);
                    }}
                    className="w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
                >
                    {option}
                </button>
            ))}
            {query && !hasExactMatch ? (
                <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                        onCreate(query);
                        setSearch(query);
                        setOpen(false);
                    }}
                    className="w-full rounded-md px-3 py-2 text-left text-sm font-bold text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10"
                >
                    Create "{query}" HSN/SAC
                </button>
            ) : null}
            {!filteredOptions.length && !query ? (
                <div className="px-3 py-2 text-sm text-slate-500 dark:text-neutral-400">No HSN/SAC codes yet.</div>
            ) : null}
        </div>,
        document.body
    ) : null;

    return (
        <div className="relative">
            <input
                ref={inputRef}
                type="text"
                value={open ? search : value}
                onFocus={() => {
                    if (disabled) return;
                    setSearch('');
                    setOpen(true);
                    window.setTimeout(updateMenuPosition, 0);
                }}
                onChange={(e) => {
                    if (disabled) return;
                    setSearch(e.target.value);
                    setOpen(true);
                    updateMenuPosition();
                }}
                onBlur={() => window.setTimeout(() => setOpen(false), 120)}
                className={cn(inputClasses, disabled ? 'cursor-not-allowed bg-slate-100 text-slate-500 dark:bg-neutral-800 dark:text-neutral-400' : '')}
                readOnly={disabled}
                placeholder="Search HSN/SAC"
            />
            {menu}
        </div>
    );
};

const ItemDetailsSelect = ({ head, inputClasses, orderItems, serviceCategoryOptions, updateInvoiceHead }) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [menuPosition, setMenuPosition] = useState(null);
    const inputRef = useRef(null);
    const updateMenuPosition = () => {
        const rect = inputRef.current?.getBoundingClientRect();
        if (!rect) return;
        setMenuPosition({ left: rect.left, top: rect.bottom + 6, width: rect.width });
    };
    useEffect(() => {
        if (!open) return undefined;
        updateMenuPosition();
        window.addEventListener('resize', updateMenuPosition);
        window.addEventListener('scroll', updateMenuPosition, true);
        return () => {
            window.removeEventListener('resize', updateMenuPosition);
            window.removeEventListener('scroll', updateMenuPosition, true);
        };
    }, [open]);

    const query = (open ? search : head.label || '').trim().toLowerCase();
    const orderItemOptions = (orderItems || [])
        .filter((item) => {
            const itemText = (item?.itemDetails || '').toLowerCase();
            const itemDescription = (item?.itemType || item?.billingFrequency || '').toLowerCase();
            return itemText.includes(query) || itemDescription.includes(query);
        })
        .slice(0, 100)
        .map((item) => ({ ...item, source: 'work-order' }));
    const categoryOptions = (serviceCategoryOptions || [])
        .filter((option) => {
            const label = (option?.itemDetails || '').toLowerCase();
            return label.includes(query);
        })
        .map((option) => ({ ...option, source: 'service-category' }));
    const itemDetailOptions = [...categoryOptions, ...orderItemOptions].slice(0, 100);

    const menu = open && menuPosition ? createPortal(
        <div
            className="fixed z-[320] max-h-64 overflow-auto rounded-lg border border-slate-200 bg-white p-1 shadow-xl dark:border-neutral-800 dark:bg-neutral-950"
            style={{ left: menuPosition.left, top: menuPosition.top, width: menuPosition.width }}
        >
            {itemDetailOptions.map((option) => (
                <button
                    key={`${option.source}-${option.id}`}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                        const nextLabel = option.itemDetails || '';
                        const qty = Number(head.qty) || 1;
                        const rate = Number(option.itemAmount ?? 0);
                        const amount = qty * rate;
                        const taxPercent = Number(head.taxPercent) || 0;
                        updateInvoiceHead(head.id, {
                            label: nextLabel,
                            workOrderScheduleId: undefined,
                            rate: String(rate),
                            amount: String(amount),
                            tax: String(amount * taxPercent / 100),
                            hsnSac: option.hsnSac || head.hsnSac,
                            hsnLocked: option.source === 'service-category',
                            itemDetailsLocked: true,
                        });
                        setSearch(nextLabel);
                        setOpen(false);
                    }}
                    className="w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
                >
                    <div className="truncate font-medium">{option.itemDetails}</div>
                    {option.source !== 'service-category' && (option.itemType || option.billingFrequency) ? (
                        <div className="truncate text-xs text-slate-500 dark:text-neutral-400">
                            {option.itemType || option.billingFrequency}
                        </div>
                    ) : null}
                    {option.source === 'service-category' ? (
                        <div className="truncate text-xs text-blue-600 dark:text-blue-400">
                            Category • HSN {option.hsnSac || '-'}
                        </div>
                    ) : null}
                </button>
            ))}
            {!itemDetailOptions.length ? (
                <div className="px-3 py-2 text-sm text-slate-500 dark:text-neutral-400">No matching item details.</div>
            ) : null}
        </div>,
        document.body
    ) : null;

    const selectedDisplayValue = head.label || '';
    return (
        <div className="relative">
            <input
                ref={inputRef}
                type="text"
                value={open ? search : selectedDisplayValue}
                onMouseDown={() => {
                    setOpen(true);
                    if (head.itemDetailsLocked) {
                        setSearch('');
                    }
                    window.setTimeout(updateMenuPosition, 0);
                }}
                onFocus={() => {
                    setSearch(head.itemDetailsLocked ? '' : (head.label || ''));
                    setOpen(true);
                    window.setTimeout(updateMenuPosition, 0);
                }}
                onChange={(e) => {
                    if (head.itemDetailsLocked) return;
                    const nextValue = e.target.value;
                    setSearch(nextValue);
                    updateInvoiceHead(head.id, { label: nextValue, itemDescription: '', hsnLocked: false, itemDetailsLocked: false });
                    setOpen(true);
                    updateMenuPosition();
                }}
                onBlur={() => window.setTimeout(() => setOpen(false), 120)}
                className={inputClasses}
                readOnly={Boolean(head.itemDetailsLocked)}
                placeholder="Select item detail or type new"
            />
            {menu}
        </div>
    );
};

const DEFAULT_TAX_RATES = [
    { label: 'IGST 18%', type: 'IGST', percent: 18 },
];

const PLACE_OF_SUPPLY_OPTIONS = [
    { value: OVERSEAS_PLACE_OF_SUPPLY_CODE, label: 'Overseas (00)' },
    ...INDIA_GST_STATE_OPTIONS.map((option) => {
        const name = option.label.replace(/^\d{2}\s+/, '').trim();
        return { value: option.value, label: `${name} (${option.value})` };
    }),
];

const getStateCodeFromPlaceOfSupply = (value) => {
    const text = String(value || '').trim();
    if (!text) return '';
    if (/^00(\b|[^0-9])/.test(text) || /overseas/i.test(text)) return OVERSEAS_PLACE_OF_SUPPLY_CODE;
    const exact = text.match(/^(\d{2})$/);
    if (exact) return exact[1];
    const prefixed = text.match(/^(\d{2})\b/);
    if (prefixed) return prefixed[1];
    const normalized = text.toLowerCase();
    const found = INDIA_GST_STATE_OPTIONS.find((option) => option.label.toLowerCase().includes(normalized));
    return found?.value || '';
};

const getPlaceOfSupplyLabel = (value) => (
    PLACE_OF_SUPPLY_OPTIONS.find((option) => option.value === value)?.label || value || '-'
);

const resolveAssetUrl = (url) => {
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url;
    const apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:3000/v1').replace(/\/+$/, '');
    const origin = apiBase.replace(/\/v\d+$/, '');
    return `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
};

export const AddInvoiceDrawer = ({
    isOpen,
    onClose,
    onSave,
    onDownloadInvoice,
    invoiceTrackingByScheduleId = {},
    invoice,
    itemOptions,
    orderItems = [],
    scheduleRecords = [],
    workOrder = null,
    tenantProfile = null,
    invoiceOptions = {},
    currency = 'INR',
    mode = 'drawer'
}) => {
    const parseItemLabel = (value) => {
        const text = String(value || '');
        const [label, ...rest] = text.split('\n');
        return {
            label: (label || '').trim(),
            itemDescription: rest.join('\n').trim(),
        };
    };

    const composeItemLabel = (label, itemDescription) => {
        const normalizedLabel = String(label || '').trim();
        const normalizedDescription = String(itemDescription || '').trim();
        return normalizedDescription ? `${normalizedLabel}\n${normalizedDescription}` : normalizedLabel;
    };

    const [formData, setFormData] = useState({
        itemDetails: [],
        invoiceNo: '',
        invoiceDate: '',
        amount: '',
        tax: '',
        waiveOff: false,
        waiveOffAmount: '',
        waiveOffReason: '',
        paymentTerms: 'Due on Receipt',
        dueDate: '',
        customerNotes: '',
        discountPercent: '',
        withholdingType: 'TDS',
        withholdingTaxPercent: '',
        attachmentNames: [],
        termsAndConditions: DEFAULT_INVOICE_TERMS
    });
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const [isDownloadShake, setIsDownloadShake] = useState(false);
    const [localItemOptions, setLocalItemOptions] = useState([]);
    const [invoiceHeads, setInvoiceHeads] = useState([]);
    const [hsnSacOptions, setHsnSacOptions] = useState([]);
    const [serviceCategoryHsnSacMap, setServiceCategoryHsnSacMap] = useState({});
    const [taxRateOptions, setTaxRateOptions] = useState(DEFAULT_TAX_RATES);
    const [placeOfSupply, setPlaceOfSupply] = useState('');
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const downloadShakeTimeoutRef = useRef(null);


    useEffect(() => {
        if (!isOpen) {
            setFormData({
                itemDetails: [],
                invoiceNo: '',
                invoiceDate: '',
                amount: '',
                tax: '',
                waiveOff: false,
                waiveOffAmount: '',
                waiveOffReason: '',
                paymentTerms: 'Due on Receipt',
                dueDate: '',
                customerNotes: '',
                discountPercent: '',
                withholdingType: 'TDS',
                withholdingTaxPercent: '',
                attachmentNames: [],
                termsAndConditions: invoice?.termsAndConditions || DEFAULT_INVOICE_TERMS
            });
            setIsSaving(false);
            setError('');
            setFieldErrors({});
            setLocalItemOptions(itemOptions || []);
            setInvoiceHeads([]);
            setHsnSacOptions([]);
            setServiceCategoryHsnSacMap({});
            setTaxRateOptions(DEFAULT_TAX_RATES);
            setPlaceOfSupply('');
            setIsPreviewOpen(false);
            return;
        }

        setLocalItemOptions(itemOptions || []);
        setHsnSacOptions(invoiceOptions.hsnSacCodes?.length ? invoiceOptions.hsnSacCodes : [invoiceOptions.hsnSac || '998313']);
        setServiceCategoryHsnSacMap(invoiceOptions.serviceCategoryHsnSacCodes || {});
        setTaxRateOptions(invoiceOptions.taxRates?.length ? invoiceOptions.taxRates : DEFAULT_TAX_RATES);
        const defaultClientPos = workOrder?.client?.placeOfSupply || '';

        if (invoice) {
            setFormData({
                itemDetails: invoice.itemDetails ? invoice.itemDetails.split(',').map(s => s.trim()).filter(Boolean) : [],
                invoiceNo: invoice.invoiceNo || '',
                invoiceDate: invoice.invoiceDate || '',
                amount: String(invoice.amount ?? ''),
                tax: String(invoice.tax ?? ''),
                waiveOff: Boolean(invoice.waiveOff),
                waiveOffAmount: String(invoice.waiveOffAmount ?? ''),
                waiveOffReason: invoice.waiveOffReason || '',
                paymentTerms: 'Due on Receipt',
                dueDate: invoice.invoiceDate || '',
                customerNotes: invoice.customerNotes || '',
                discountPercent: '',
                withholdingType: 'TDS',
                withholdingTaxPercent: '',
                attachmentNames: [],
                termsAndConditions: DEFAULT_INVOICE_TERMS
            });
            setPlaceOfSupply(invoice.placeOfSupply || defaultClientPos);
            const mappedRows = Array.isArray(invoice.invoiceItems) ? invoice.invoiceItems : [];
            if (mappedRows.length) {
                setInvoiceHeads(mappedRows.map((row, index) => ({
                    ...parseItemLabel(row.itemLabel || ''),
                    id: `${Date.now()}-${index}`,
                    isDescriptionEditing: false,
                    workOrderScheduleId: row.workOrderScheduleId || undefined,
                    amount: String(row.amount ?? ''),
                    qty: String(row.qty ?? 1),
                    rate: String(row.rate ?? ''),
                    tax: String(row.tax ?? ''),
                    taxPercent: Number(row.taxPercent ?? 18),
                    taxLabel: row.taxLabel || 'IGST 18%',
                    hsnSac: row.hsnSac || (hsnSacOptions[0] || invoiceOptions.hsnSac || '998313'),
                    hsnLocked: false,
                    itemDetailsLocked: false,
                    selected: true,
                })).filter((head) => head.label));
            } else {
                setInvoiceHeads(invoice.itemDetails
                    ? invoice.itemDetails.split(',').map((label, index) => ({
                        id: `${Date.now()}-${index}`,
                        label: label.trim(),
                        itemDescription: '',
                        amount: index === 0 ? String(invoice.amount ?? '') : '',
                        hsnLocked: false,
                        itemDetailsLocked: false,
                        selected: true,
                    })).filter((head) => head.label)
                    : []);
            }
        } else if (mode === 'modal') {
            setInvoiceHeads([]);
            setFormData((prev) => ({
                ...prev,
                invoiceNo: '',
                itemDetails: [],
                amount: '0',
                tax: '0',
                dueDate: prev.dueDate || prev.invoiceDate || '',
                paymentTerms: prev.paymentTerms || 'Due on Receipt',
                termsAndConditions: prev.termsAndConditions || DEFAULT_INVOICE_TERMS,
            }));
            setPlaceOfSupply(defaultClientPos);
        }
    }, [isOpen, invoice, itemOptions, invoiceOptions.nextInvoiceNo, invoiceOptions.hsnSac, invoiceOptions.hsnSacCodes, invoiceOptions.taxRates, mode, workOrder?.client?.placeOfSupply]);

    useEffect(() => {
        if (!isOpen || mode !== 'modal') return;

        const selectedHeads = invoiceHeads.filter((head) => head.selected && head.label.trim());
        const nextAmount = selectedHeads.reduce((sum, head) => sum + (Number(head.amount) || 0), 0);
        const nextTax = selectedHeads.reduce(
            (sum, head) => sum + (Number(head.tax) || ((Number(head.amount) || 0) * (Number(head.taxPercent) || 0) / 100)),
            0
        );
        setFormData((prev) => ({
            ...prev,
            itemDetails: selectedHeads.map((head) => head.label.trim()),
            amount: nextAmount.toString(),
            tax: nextTax.toString(),
        }));
    }, [invoiceHeads, isOpen, mode]);

    useEffect(() => {
        if (!isOpen || mode !== 'modal') return undefined;

        let cancelled = false;
        const loadFreshInvoiceOptions = async () => {
            try {
                const response = await callApi(financeOpsApi.getInvoiceOptions);
                if (!cancelled && response?.hsnSacCodes?.length) {
                    setHsnSacOptions(response.hsnSacCodes);
                    setServiceCategoryHsnSacMap(response.serviceCategoryHsnSacCodes || {});
                    setTaxRateOptions(response.taxRates?.length ? response.taxRates : DEFAULT_TAX_RATES);
                    setInvoiceHeads((prev) => prev.map((head) => ({
                        ...head,
                        hsnSac: head.hsnSac || response.hsnSacCodes[0],
                    })));
                }
            } catch (loadError) {
                if (!cancelled) {
                    setError(loadError?.message || 'Failed to load HSN/SAC codes');
                }
            }
        };

        loadFreshInvoiceOptions();
        return () => {
            cancelled = true;
        };
    }, [isOpen, mode]);

    useEffect(() => () => {
        if (downloadShakeTimeoutRef.current) {
            window.clearTimeout(downloadShakeTimeoutRef.current);
        }
    }, []);

    const totalAmount = useMemo(() => {
        const amount = Number(formData.amount) || 0;
        const tax = Number(formData.tax) || 0;
        const discountAmount = amount * ((Number(formData.discountPercent) || 0) / 100);
        const withholdingAmount = amount * ((Number(formData.withholdingTaxPercent) || 0) / 100);
        const waiveOffAmount = formData.waiveOff ? (Number(formData.waiveOffAmount) || 0) : 0;
        const withholdingAdjustment = formData.withholdingType === 'TCS' ? withholdingAmount : -withholdingAmount;
        return Math.max(0, amount - discountAmount + tax + withholdingAdjustment - waiveOffAmount);
    }, [formData.amount, formData.tax, formData.discountPercent, formData.withholdingTaxPercent, formData.withholdingType, formData.waiveOff, formData.waiveOffAmount]);

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

    const normalizeInvoiceNo = (value) => {
        const cleaned = (value || '').trim().toUpperCase();
        if (!cleaned) return '';
        return cleaned.startsWith('INV') ? cleaned : `INV${cleaned}`;
    };

    const clearFieldError = (fieldName) => {
        setFieldErrors((prev) => {
            if (!prev[fieldName]) return prev;
            const next = { ...prev };
            delete next[fieldName];
            return next;
        });
    };

    const triggerDownloadShake = () => {
        if (downloadShakeTimeoutRef.current) {
            window.clearTimeout(downloadShakeTimeoutRef.current);
        }
        setIsDownloadShake(true);
        downloadShakeTimeoutRef.current = window.setTimeout(() => {
            setIsDownloadShake(false);
            downloadShakeTimeoutRef.current = null;
        }, 420);
    };

    const validateForm = () => {
        const errors = {};
        if (!isModal && !formData.invoiceNo.trim()) errors.invoiceNo = 'Invoice number is required';
        if (!formData.invoiceDate) errors.invoiceDate = 'Invoice date is required';
        if (mode === 'modal' && !invoiceHeads.some((head) => head.selected && head.label.trim())) {
            errors.invoiceHeads = 'Select at least one invoice head';
        }
        if (parseRequiredNumber(formData.amount) === null) errors.amount = 'Amount is required';
        if (parseRequiredNumber(formData.tax) === null) errors.tax = 'Tax is required';
        if (formData.waiveOff && parseRequiredNumber(formData.waiveOffAmount) === null) {
            errors.waiveOffAmount = 'Waive off amount is required when waive off is enabled';
        }

        return errors;
    };

    const handleSave = async (saveMode = 'draft') => {
        try {
            const validationErrors = validateForm();
            if (Object.keys(validationErrors).length) {
                setFieldErrors(validationErrors);
                setError('');
                if (saveMode === 'download') {
                    triggerDownloadShake();
                }
                return;
            }

            const amount = parseRequiredNumber(formData.amount);
            const tax = Number(liveTaxAmount || 0);
            const waiveOffAmount = !isModal && formData.waiveOff ? parseRequiredNumber(formData.waiveOffAmount) : 0;

            setIsSaving(true);
            setError('');
            setFieldErrors({});
            const resolvedInvoiceNo = isModal
                ? (invoice?.invoiceNo ? normalizeInvoiceNo(invoice.invoiceNo) : undefined)
                : normalizeInvoiceNo(formData.invoiceNo);
            const savedInvoice = await onSave({
                ...invoice,
                itemDetails: Array.isArray(formData.itemDetails) ? formData.itemDetails.join(', ') : formData.itemDetails,
                invoiceNo: resolvedInvoiceNo,
                invoiceDate: formData.invoiceDate,
                amount,
                tax,
                totalAmount,
                waiveOff: !isModal && Boolean(formData.waiveOff),
                waiveOffAmount,
                waiveOffReason: !isModal && formData.waiveOff ? formData.waiveOffReason.trim() : '',
                customerNotes: (formData.customerNotes || '').trim(),
                termsAndConditions: (formData.termsAndConditions || '').trim(),
                placeOfSupply: clientStateCode || '',
                taxType: computedTaxBreakdown.taxType,
                gstPercent: effectiveGstPercent,
                igstAmount: computedTaxBreakdown.igstAmount,
                cgstAmount: computedTaxBreakdown.cgstAmount,
                sgstAmount: computedTaxBreakdown.sgstAmount,
                createdFromInvoiceBuilder: isModal || Boolean(invoice?.createdFromInvoiceBuilder),
                savedAndDownloaded: saveMode === 'download',
                invoiceItems: selectedInvoiceHeads.map((head) => ({
                    workOrderScheduleId: head.workOrderScheduleId,
                    itemLabel: composeItemLabel(head.label, head.itemDescription),
                    hsnSac: head.hsnSac,
                    qty: Number(head.qty) || 1,
                    rate: Number(head.rate) || 0,
                    taxLabel: head.taxLabel,
                    taxPercent: Number(head.taxPercent) || 0,
                    amount: Number(head.amount) || 0,
                    tax: Number(head.tax) || 0,
                })),
                status: invoice?.status || 'Draft'
            });
            if (saveMode === 'download' && savedInvoice) {
                onDownloadInvoice?.(savedInvoice);
            }
            onClose();
        } catch (saveError) {
            setError(saveError?.message || 'Failed to save invoice');
        } finally {
            setIsSaving(false);
        }
    };

    const isModal = mode === 'modal';
    const selectedInvoiceHeads = invoiceHeads.filter((head) => head.selected && head.label.trim());
    const subTotal = Number(formData.amount) || 0;
    const resolvedTenantProfile = tenantProfile || TENANT_INVOICE_PROFILE;
    const tenantStateCode = getStateCodeFromPlaceOfSupply(resolvedTenantProfile.billingStateCode || resolvedTenantProfile.billingState);
    const clientStateCode = getStateCodeFromPlaceOfSupply(placeOfSupply);
    const indiaTaxOptions = (() => {
        const rawBase = (taxRateOptions?.length ? taxRateOptions : DEFAULT_TAX_RATES).map((rate) => ({
            value: `GST_${Number(rate.percent)}`,
            label: `GST ${Number(rate.percent)}%`,
            percent: Number(rate.percent),
        }));
        
        // Ensure uniqueness by value
        const uniqueMap = new Map();
        rawBase.forEach(opt => uniqueMap.set(opt.value, opt));
        
        if (!uniqueMap.has('GST_0')) {
            uniqueMap.set('GST_0', { value: 'GST_0', label: 'GST 0%', percent: 0 });
        }
        
        return Array.from(uniqueMap.values()).sort((a, b) => a.percent - b.percent);
    })();
    const isOverseasPlaceOfSupply = clientStateCode === OVERSEAS_PLACE_OF_SUPPLY_CODE;
    const rowTaxPercent = isOverseasPlaceOfSupply ? 0 : (indiaTaxOptions[0]?.percent || 18);
    const rowTaxLabel = isOverseasPlaceOfSupply ? 'Exempt' : (indiaTaxOptions[0]?.label || 'GST 18%');
    const selectedTaxAmount = selectedInvoiceHeads.reduce((sum, head) => sum + (Number(head.tax) || 0), 0);
    const effectiveGstPercent = subTotal > 0 ? Number(((selectedTaxAmount * 100) / subTotal).toFixed(2)) : 0;
    const computedTaxBreakdown = useMemo(() => {
        if (!subTotal || !clientStateCode) {
            return { taxType: 'UNKNOWN', igstAmount: 0, cgstAmount: 0, sgstAmount: 0, taxAmount: 0 };
        }

        if (clientStateCode === OVERSEAS_PLACE_OF_SUPPLY_CODE) {
            return { taxType: 'OVERSEAS', igstAmount: 0, cgstAmount: 0, sgstAmount: 0, taxAmount: 0 };
        }

        const totalTax = Number(selectedTaxAmount.toFixed(2));
        if (tenantStateCode && tenantStateCode === clientStateCode) {
            const half = Number((totalTax / 2).toFixed(2));
            return {
                taxType: 'INTRA_STATE',
                igstAmount: 0,
                cgstAmount: half,
                sgstAmount: Number((totalTax - half).toFixed(2)),
                taxAmount: totalTax,
            };
        }

        return {
            taxType: 'INTER_STATE',
            igstAmount: totalTax,
            cgstAmount: 0,
            sgstAmount: 0,
            taxAmount: totalTax,
        };
    }, [subTotal, selectedTaxAmount, clientStateCode, tenantStateCode]);
    const liveTaxAmount = computedTaxBreakdown.taxAmount;
    useEffect(() => {
        if (!isOpen || mode !== 'modal') return;
        setInvoiceHeads((prev) => prev.map((head) => {
            const amount = (Number(head.qty) || 0) * (Number(head.rate) || 0);
            if (isOverseasPlaceOfSupply) {
                return {
                    ...head,
                    taxLabel: 'Exempt',
                    taxPercent: 0,
                    tax: '0',
                };
            }
            if (head.taxPercent === undefined || head.taxPercent === null || Number.isNaN(Number(head.taxPercent))) {
                return {
                    ...head,
                    taxLabel: rowTaxLabel,
                    taxPercent: rowTaxPercent,
                    tax: String((amount * rowTaxPercent) / 100),
                };
            }
            return {
                ...head,
                tax: String((amount * (Number(head.taxPercent) || 0)) / 100),
            };
        }));
    }, [isOpen, mode, isOverseasPlaceOfSupply, rowTaxLabel, rowTaxPercent]);
    useEffect(() => {
        if (!isOpen || mode !== 'modal') return;
        setFormData((prev) => ({ ...prev, tax: String(liveTaxAmount) }));
    }, [isOpen, mode, liveTaxAmount]);
    const serviceCategoryOptions = useMemo(
        () => Object.entries(serviceCategoryHsnSacMap || {}).map(([itemDetails, hsnSac], index) => ({
            id: `svc-${index}-${itemDetails}`,
            itemDetails,
            itemType: 'Service Category',
            billingFrequency: '',
            itemAmount: '',
            hsnSac: String(hsnSac || '').trim(),
        })),
        [serviceCategoryHsnSacMap],
    );
    if (!isOpen) return null;
    const discountAmount = subTotal * ((Number(formData.discountPercent) || 0) / 100);
    const withholdingAmount = subTotal * ((Number(formData.withholdingTaxPercent) || 0) / 100);
    const waiveOffAmount = formData.waiveOff ? (Number(formData.waiveOffAmount) || 0) : 0;
    const formattedTotal = formatCurrency(totalAmount, currency);
    const taxColumnLabel = computedTaxBreakdown.taxType === 'INTRA_STATE' ? 'CGST + SGST' : 'IGST';
    const taxPercentLabel = `${effectiveGstPercent}%`;
    const previewInvoiceNo = isModal ? 'Generated on save' : (normalizeInvoiceNo(formData.invoiceNo) || 'INV2024001');
    const seller = {
        name: resolvedTenantProfile.legalName || resolvedTenantProfile.name || 'Tenant',
        addressLines: [
            resolvedTenantProfile.billingStreet,
            [resolvedTenantProfile.billingCity, resolvedTenantProfile.billingState, resolvedTenantProfile.billingZip].filter(Boolean).join(', '),
            resolvedTenantProfile.billingCountry,
        ].filter(Boolean),
        gstin: resolvedTenantProfile.taxId || '',
        logoUrl: resolveAssetUrl(resolvedTenantProfile.logoUrl || '/inv_logo.png'),
    };
    const billTo = workOrder?.client || {};
    const billToLines = [
        billTo.billingStreet,
        [billTo.billingCity, billTo.billingState, billTo.billingZip].filter(Boolean).join(', '),
        billTo.billingCountry,
    ].filter(Boolean);
    const orderDetailsText = [
        workOrder?.orderDetails,
        workOrder?.scopeOfWork,
        workOrder?.description,
    ].filter(Boolean).join('\n');
    const updateInvoiceHead = (headId, patch) => {
        setInvoiceHeads((prev) => prev.map((head) => (head.id === headId ? { ...head, ...patch } : head)));
    };
    const addInvoiceHead = () => {
        setInvoiceHeads((prev) => [
            ...prev,
            { id: `head-${Date.now()}`, label: '', itemDescription: '', isDescriptionEditing: false, amount: '', qty: '1', rate: '', tax: '', taxPercent: rowTaxPercent, taxLabel: rowTaxLabel, hsnSac: hsnSacOptions[0] || invoiceOptions.hsnSac || '998313', hsnLocked: false, itemDetailsLocked: false, selected: true },
        ]);
    };
    const addScheduleRows = () => {
        const sourceRows = (orderItems || []).filter((item) => item.itemDetails);
        setInvoiceHeads((prev) => [
            ...prev,
            ...sourceRows.map((item, index) => ({
                id: `bulk-${Date.now()}-${index}`,
                label: item.itemDetails,
                itemDescription: '',
                isDescriptionEditing: false,
                workOrderScheduleId: undefined,
                amount: String(item.itemAmount ?? ''),
                qty: '1',
                rate: String(item.itemAmount ?? ''),
                tax: String((Number(item.itemAmount) || 0) * rowTaxPercent / 100),
                taxPercent: rowTaxPercent,
                taxLabel: rowTaxLabel,
                hsnSac: hsnSacOptions[0] || invoiceOptions.hsnSac || '998313',
                hsnLocked: false,
                itemDetailsLocked: false,
                selected: true,
            })),
        ]);
    };
    const updateHeadTaxRate = (head, taxLabel) => {
        if (taxLabel === 'EXEMPT') {
            updateInvoiceHead(head.id, {
                taxLabel: 'Exempt',
                taxPercent: 0,
                tax: '0',
            });
            return;
        }
        const percent = Number(String(taxLabel).replace('GST_', ''));
        const amount = Number(head.amount) || 0;
        updateInvoiceHead(head.id, {
            taxLabel: `GST ${percent}%`,
            taxPercent: percent,
            tax: String(amount * (percent || 0) / 100),
        });
    };
    const createHsnSacOption = async (headId, code) => {
        const nextCode = code.trim();
        if (!nextCode) return;

        setHsnSacOptions((prev) => (
            prev.some((option) => option.toLowerCase() === nextCode.toLowerCase()) ? prev : [...prev, nextCode]
        ));
        updateInvoiceHead(headId, { hsnSac: nextCode });

        try {
            const response = await callApi(financeOpsApi.createHsnSacCode, { code: nextCode });
            if (response?.codes?.length) {
                setHsnSacOptions(response.codes);
            }
        } catch (createError) {
            setError(createError?.message || 'Failed to save HSN/SAC code');
        }
    };
    const setAllInvoiceHeadsSelected = (selected) => {
        setInvoiceHeads((prev) => prev.map((head) => ({ ...head, selected })));
    };
    const removeSelectedInvoiceHeads = () => {
        setInvoiceHeads((prev) => prev.filter((head) => !head.selected));
    };
    const removeInvoiceHead = (headId) => {
        setInvoiceHeads((prev) => prev.filter((head) => head.id !== headId));
    };
    const invoicePreview = (
        <div className="mx-auto min-h-full max-w-[820px] rounded-xl bg-white p-8 text-slate-950 shadow-sm">
            <div className="grid grid-cols-[1fr_auto] gap-8">
                <div>
                    <div className="h-12 w-28 overflow-hidden rounded-md bg-transparent flex items-center justify-start">
                        <img src={seller.logoUrl} alt={seller.name} className="max-h-full max-w-full object-contain" />
                    </div>
                    <h3 className="mt-3 text-lg font-bold">{seller.name}</h3>
                    {seller.addressLines.map((line) => (
                        <p key={line} className="text-sm leading-5">{line}</p>
                    ))}
                    {seller.gstin ? <p className="text-sm leading-5">GSTIN {seller.gstin}</p> : null}
                </div>
                <div className="text-right">
                    <h2 className="text-4xl font-light tracking-wide">Original Tax Invoice</h2>
                    <p className="mt-2 text-lg font-bold"># {previewInvoiceNo}</p>
                    <div className="mt-8">
                        <p className="text-sm font-bold">Balance Due</p>
                        <p className="text-2xl font-bold">{formattedTotal}</p>
                    </div>
                </div>
            </div>

            <div className="mt-12 grid grid-cols-[1fr_auto] gap-8">
                <div>
                    <p className="text-lg">Bill To</p>
                    <p className="font-bold uppercase text-blue-600">{billTo.name || workOrder?.customerName || 'Client Company'}</p>
                    {billToLines.map((line) => (
                        <p key={line} className="text-sm leading-5">{line}</p>
                    ))}
                    {billTo.taxId ? <p className="text-sm leading-5">GSTIN {billTo.taxId}</p> : null}
                </div>
                <div className="grid grid-cols-[auto_auto] items-end gap-x-12 gap-y-2 self-end text-sm">
                    <span className="text-base">Invoice Date :</span>
                    <span>{formData.invoiceDate || 'YYYY-MM-DD'}</span>
                    <span className="text-base">Terms :</span>
                    <span>{formData.paymentTerms || '-'}</span>
                    <span className="text-base">Due Date :</span>
                    <span>{formData.dueDate || formData.invoiceDate || 'YYYY-MM-DD'}</span>
                </div>
            </div>

            <p className="mt-8 text-sm">Place Of Supply: {getPlaceOfSupplyLabel(clientStateCode)}</p>

            <div className="mt-8 overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-neutral-800 text-left text-white">
                        <tr>
                            <th className="px-4 py-3 text-lg font-normal">Item & Description</th>
                            <th className="px-4 py-3 text-lg font-normal">HSN/SAC</th>
                            <th className="px-4 py-3 text-right text-lg font-normal">Qty</th>
                            <th className="px-4 py-3 text-right text-lg font-normal">Rate</th>
                            <th className="px-4 py-3 text-right text-lg font-normal">{taxColumnLabel}</th>
                            <th className="px-4 py-3 text-right text-lg font-normal">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {selectedInvoiceHeads.map((head, index) => (
                            <tr key={head.id} className="align-top">
                                <td className="px-4 py-4">
                                    <p>{index + 1}. {head.label}</p>
                                    {head.itemDescription ? <p className="ml-4 text-sm text-slate-600">{head.itemDescription}</p> : null}
                                </td>
                                <td className="px-4 py-4">{head.hsnSac || invoiceOptions.hsnSac || '998313'}</td>
                                <td className="px-4 py-4 text-right">{Number(head.qty) || 0}</td>
                                <td className="px-4 py-4 text-right">{formatCurrency(Number(head.rate) || 0, currency)}</td>
                                <td className="px-4 py-4 text-right">
                                    <div>{formatCurrency(Number(head.tax) || 0, currency)}</div>
                                    <div className="text-xs">{(Number(head.taxPercent) || 0) > 0 ? `${Number(head.taxPercent)}%` : 'Exempt'}</div>
                                </td>
                                <td className="px-4 py-4 text-right">{formatCurrency(Number(head.amount) || 0, currency)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="border-t border-slate-300" />
            </div>

            <div className="mt-6 grid grid-cols-[1fr_260px] gap-8 text-sm">
                <div>
                    <p className="text-sm">Po No. {workOrder?.woNumber || '-'} Dated: {workOrder?.woDate || '-'}</p>
                    {formData.customerNotes ? (
                        <>
                            <p className="mt-4 font-bold">Customer Notes</p>
                            <p className="mt-2 whitespace-pre-wrap leading-5">{formData.customerNotes}</p>
                        </>
                    ) : null}
                </div>
                <div className="ml-auto w-[300px] px-4 py-3">
                    <div className="flex justify-between text-sm"><span>Sub Total</span><span>{formatCurrency(subTotal, currency)}</span></div>
                    {discountAmount ? <div className="mt-2 flex justify-between text-sm"><span>Discount</span><span>-{formatCurrency(discountAmount, currency)}</span></div> : null}
                    {computedTaxBreakdown.taxType === 'INTRA_STATE' ? (
                        <>
                            <div className="mt-2 flex justify-between text-sm"><span>CGST ({(effectiveGstPercent / 2).toFixed(2)}%)</span><span>{formatCurrency(computedTaxBreakdown.cgstAmount, currency, 2, 2)}</span></div>
                            <div className="mt-2 flex justify-between text-sm"><span>SGST ({(effectiveGstPercent / 2).toFixed(2)}%)</span><span>{formatCurrency(computedTaxBreakdown.sgstAmount, currency, 2, 2)}</span></div>
                        </>
                    ) : (
                        <div className="mt-2 flex justify-between text-sm"><span>IGST ({taxPercentLabel})</span><span>{formatCurrency(computedTaxBreakdown.igstAmount, currency, 2, 2)}</span></div>
                    )}
                    {withholdingAmount ? (
                        <div className="mt-2 flex justify-between text-sm"><span>{formData.withholdingType}</span><span>{formData.withholdingType === 'TCS' ? '+' : '-'}{formatCurrency(withholdingAmount, currency)}</span></div>
                    ) : null}
                    {waiveOffAmount ? <div className="mt-2 flex justify-between text-sm"><span>Waive Off</span><span>-{formatCurrency(waiveOffAmount, currency)}</span></div> : null}
                    <div className="mt-3 flex justify-between rounded-md bg-slate-100 border-t border-slate-300 px-2 pt-2 pb-1 text-base font-bold"><span>Total</span><span>{formattedTotal}</span></div>
                </div>
            </div>

            <div className="mt-10 text-sm">
                <h3 className="mt-8 text-xl">Terms & Conditions</h3>
                <div className="mt-3 whitespace-pre-wrap">{formData.termsAndConditions || '-'}</div>
                <p className="mt-12 text-xl">Authorized Signatory <span className="inline-block w-72 border-b border-slate-900 align-middle" /></p>
            </div>
        </div>
    );

    return createPortal(
        <div className={cn('fixed inset-0 z-[150] overflow-hidden', isModal ? 'flex items-center justify-center p-4' : '')}>
            <AnimatePresence>
                {isOpen && (
                    <MotionDiv
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={!isModal ? onClose : undefined}
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                    />
                )}
            </AnimatePresence>

            <MotionDiv
                initial={isModal ? { opacity: 0, scale: 0.96, y: 18 } : { x: '100%' }}
                animate={isModal ? { opacity: 1, scale: 1, y: 0 } : { x: 0 }}
                exit={isModal ? { opacity: 0, scale: 0.96, y: 18 } : { x: '100%' }}
                transition={isModal ? { duration: 0.18, ease: 'easeOut' } : { type: 'spring', stiffness: 300, damping: 30 }}
                className={cn(
                    'bg-white dark:bg-[#131313] shadow-2xl flex flex-col border-slate-100 dark:border-neutral-800',
                    isModal
                        ? 'relative z-[151] w-[80vw] h-[80vh] max-w-[1280px] max-h-[900px] min-w-0 rounded-2xl border'
                        : 'absolute inset-y-0 right-0 w-full md:w-[450px] h-full border-l'
                )}
            >
                <div className="px-8 py-6 border-b border-slate-100 dark:border-neutral-800 shrink-0">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-emerald-50 dark:bg-[#1A1A1A] rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                                <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                                    {isModal ? 'Create Invoice' : 'Invoice'}
                                </h2>
                            </div>
                        </div>
                        {!isModal ? (
                            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-lg transition-colors">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        ) : null}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-8 py-6">
                    {isModal ? (
                        <div className="mx-auto grid min-h-full w-full max-w-6xl grid-cols-1 gap-6">
                            <div className="space-y-5">
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">New Invoice</h3>
                                        <p className="text-sm text-slate-500 dark:text-neutral-400">Create invoice details, add items, validate totals, then preview the projected PDF.</p>
                                    </div>
                                </div>

                                <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950/30">
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                        <div className="space-y-1.5 md:col-span-3">
                                            <label className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 ml-1">Customer Name</label>
                                            <input
                                                type="text"
                                                value={billTo.name || workOrder?.customerName || ''}
                                                readOnly
                                                className={cn(inputClasses, "bg-slate-50 dark:bg-neutral-800 text-slate-500 dark:text-neutral-300")}
                                                placeholder="Bill to customer"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 ml-1">Order Number</label>
                                            <input
                                                type="text"
                                                value={workOrder?.woNumber || ''}
                                                readOnly
                                                className={cn(inputClasses, "bg-slate-50 dark:bg-neutral-800 text-slate-500 dark:text-neutral-300")}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 ml-1">Invoice Date <span className="text-rose-500">*</span></label>
                                            <input
                                                type="date"
                                                value={formData.invoiceDate}
                                                onChange={(e) => {
                                                    clearFieldError('invoiceDate');
                                                    setFormData({ ...formData, invoiceDate: e.target.value, dueDate: formData.dueDate || e.target.value });
                                                }}
                                                className={cn(inputClasses, "dark:[color-scheme:dark]")}
                                            />
                                            {fieldErrors.invoiceDate ? <p className="text-xs text-rose-500">{fieldErrors.invoiceDate}</p> : null}
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 ml-1">Terms</label>
                                            <select
                                                value={formData.paymentTerms}
                                                onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                                                className={inputClasses}
                                            >
                                                <option>Due on Receipt</option>
                                                <option>Net 7</option>
                                                <option>Net 14</option>
                                                <option>Net 30</option>
                                                <option>Custom</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 ml-1">Due Date <span className="text-rose-500">*</span></label>
                                            <input
                                                type="date"
                                                value={formData.dueDate}
                                                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                                className={cn(inputClasses, "dark:[color-scheme:dark]")}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 ml-1">Place Of Supply</label>
                                            <CustomSelect
                                                value={placeOfSupply}
                                                onChange={(value) => setPlaceOfSupply(value)}
                                                options={PLACE_OF_SUPPLY_OPTIONS}
                                                placeholder="Select place of supply"
                                                searchable
                                                searchPlaceholder="Search place of supply"
                                                className="w-full"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950/30">
                                    <div className="mb-4 flex items-center justify-between gap-3">
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Item Table</h3>
                                            <p className="text-xs text-slate-500 dark:text-neutral-400">Add a row, enter item details, and adjust HSN/SAC, quantity, rate, and GST.</p>
                                        </div>
                                        <div className="flex flex-wrap items-center justify-end gap-2">
                                            <button type="button" onClick={() => setAllInvoiceHeadsSelected(true)} className="rounded-lg px-3 py-2 text-xs font-bold text-blue-600 transition-colors hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10">Select All</button>
                                            <button type="button" onClick={removeSelectedInvoiceHeads} className="rounded-lg px-3 py-2 text-xs font-bold text-rose-500 transition-colors hover:bg-rose-50 dark:hover:bg-rose-500/10">Remove Selected</button>
                                            <button type="button" onClick={addScheduleRows} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800">Add Items in Bulk</button>
                                            <button
                                                type="button"
                                                onClick={addInvoiceHead}
                                                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
                                            >
                                                <Plus className="h-4 w-4" />
                                                Add New Row
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-3 overflow-x-auto">
                                        {fieldErrors.invoiceHeads ? <p className="px-1 text-xs text-rose-500">{fieldErrors.invoiceHeads}</p> : null}
                                        {invoiceHeads.length ? (
                                            <div className="grid min-w-[760px] grid-cols-[36px_minmax(180px,1fr)_96px_80px_120px_120px_34px] gap-3 px-3 text-[11px] font-bold uppercase text-slate-500 dark:text-neutral-400">
                                                <span />
                                                <span>Item Details</span>
                                                <span>HSN/SAC</span>
                                                <span>Qty</span>
                                                <span>Rate</span>
                                                <span>Tax</span>
                                                <span />
                                            </div>
                                        ) : null}
                                        {invoiceHeads.length ? invoiceHeads.map((head) => (
                                            <div key={head.id} className="grid min-w-[760px] grid-cols-[36px_minmax(180px,1fr)_96px_80px_120px_120px_34px] items-center gap-3 rounded-lg border border-slate-200 p-3 dark:border-neutral-800">
                                                <button
                                                    type="button"
                                                    onClick={() => updateInvoiceHead(head.id, { selected: !head.selected })}
                                                    className={cn(
                                                        'flex h-8 w-8 items-center justify-center rounded-lg border transition-colors',
                                                        head.selected
                                                            ? 'border-blue-600 bg-blue-600 text-white dark:border-blue-500 dark:bg-blue-500'
                                                            : 'border-slate-200 text-slate-400 hover:bg-slate-50 dark:border-neutral-700 dark:hover:bg-neutral-800'
                                                    )}
                                                >
                                                    {head.selected ? <Check className="h-4 w-4" /> : null}
                                                </button>
                                                <div>
                                                    <ItemDetailsSelect
                                                        head={head}
                                                        inputClasses={inputClasses}
                                                        orderItems={orderItems}
                                                        serviceCategoryOptions={serviceCategoryOptions}
                                                        updateInvoiceHead={updateInvoiceHead}
                                                    />
                                                    {head.isDescriptionEditing ? (
                                                        <textarea
                                                            value={head.itemDescription || ''}
                                                            onChange={(e) => updateInvoiceHead(head.id, { itemDescription: e.target.value })}
                                                            onBlur={() => updateInvoiceHead(head.id, { isDescriptionEditing: false })}
                                                            className={cn(inputClasses, 'mt-1 min-h-[68px] resize-y leading-5')}
                                                            placeholder="Description"
                                                            autoFocus
                                                        />
                                                    ) : (
                                                        <div className="mt-1 flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-2.5 py-1.5 text-xs text-slate-500 dark:border-neutral-700 dark:text-neutral-400">
                                                            <span className="truncate">{head.itemDescription?.trim() || 'Description'}</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => updateInvoiceHead(head.id, { isDescriptionEditing: true })}
                                                                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-slate-100 text-slate-700 transition-colors hover:bg-slate-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
                                                                title="Edit description"
                                                            >
                                                                <Pencil className="h-3.5 w-3.5" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                                <HsnSacSelect
                                                    value={head.hsnSac}
                                                    options={hsnSacOptions}
                                                    inputClasses={inputClasses}
                                                    disabled={Boolean(head.hsnLocked)}
                                                    onChange={(code) => updateInvoiceHead(head.id, { hsnSac: code })}
                                                    onCreate={(code) => createHsnSacOption(head.id, code)}
                                                />
                                                <input
                                                    type="number"
                                                    value={head.qty}
                                                    onChange={(e) => {
                                                        const qty = e.target.value;
                                                        const amount = (Number(qty) || 0) * (Number(head.rate) || 0);
                                                        const percent = Number(head.taxPercent);
                                                        const safePercent = Number.isFinite(percent) ? percent : rowTaxPercent;
                                                        updateInvoiceHead(head.id, {
                                                            qty,
                                                            amount: String(amount),
                                                            tax: String(amount * safePercent / 100),
                                                            taxPercent: safePercent,
                                                            taxLabel: safePercent === 0 ? 'GST 0%' : `GST ${safePercent}%`,
                                                        });
                                                    }}
                                                    className={inputClasses}
                                                    placeholder="Qty"
                                                />
                                                <input
                                                    type="number"
                                                    value={head.rate}
                                                    onChange={(e) => {
                                                        const rate = e.target.value;
                                                        const amount = (Number(head.qty) || 0) * (Number(rate) || 0);
                                                        const percent = Number(head.taxPercent);
                                                        const safePercent = Number.isFinite(percent) ? percent : rowTaxPercent;
                                                        updateInvoiceHead(head.id, {
                                                            rate,
                                                            amount: String(amount),
                                                            tax: String(amount * safePercent / 100),
                                                            taxPercent: safePercent,
                                                            taxLabel: safePercent === 0 ? 'GST 0%' : `GST ${safePercent}%`,
                                                        });
                                                    }}
                                                    className={inputClasses}
                                                    placeholder="Rate"
                                                />
                                                <select
                                                    value={isOverseasPlaceOfSupply ? 'EXEMPT' : `GST_${Number.isFinite(Number(head.taxPercent)) ? Number(head.taxPercent) : rowTaxPercent}`}
                                                    onChange={(e) => updateHeadTaxRate(head, e.target.value)}
                                                    className={inputClasses}
                                                >
                                                    {isOverseasPlaceOfSupply ? (
                                                        <>
                                                            <option value="EXEMPT">Exempt</option>
                                                            {indiaTaxOptions.map((rate) => (
                                                                <option key={rate.value} value={rate.value} disabled>
                                                                    {rate.label}
                                                                </option>
                                                            ))}
                                                        </>
                                                    ) : (
                                                        <>
                                                            {indiaTaxOptions.map((rate) => (
                                                                <option key={rate.value} value={rate.value}>
                                                                    {rate.label}
                                                                </option>
                                                            ))}
                                                            <option value="EXEMPT" disabled>Exempt</option>
                                                        </>
                                                    )}
                                                </select>
                                                <button
                                                    type="button"
                                                    onClick={() => removeInvoiceHead(head.id)}
                                                    className="flex h-8 w-8 items-center justify-center rounded-lg text-rose-500 transition-colors hover:bg-rose-50 dark:hover:bg-rose-500/10"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        )) : (
                                            <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-neutral-700 dark:text-neutral-400">
                                                No rows added yet.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
                                    <div className="space-y-5">
                                        <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950/30">
                                            <label className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 ml-1">Customer Notes</label>
                                            <textarea
                                                value={formData.customerNotes}
                                                onChange={(e) => setFormData({ ...formData, customerNotes: e.target.value })}
                                                className={cn(inputClasses, "mt-1.5 min-h-[96px] resize-y leading-6")}
                                                placeholder="Visible on the invoice"
                                            />
                                        </div>
                                        <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950/30">
                                            <label className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 ml-1">Terms & Conditions</label>
                                            <textarea
                                                value={formData.termsAndConditions}
                                                onChange={(e) => setFormData({ ...formData, termsAndConditions: e.target.value })}
                                                className={cn(inputClasses, "mt-1.5 min-h-[150px] resize-y leading-6")}
                                                placeholder="Enter invoice terms and conditions"
                                            />
                                        </div>
                                        <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950/30">
                                            <div className="flex flex-wrap items-center justify-between gap-3">
                                                <div>
                                                    <label className="text-[11px] font-bold text-slate-500 dark:text-neutral-400">Attach File(s) to Invoice</label>
                                                    <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">Up to 10 files, 10MB each.</p>
                                                </div>
                                                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800">
                                                    <Upload className="h-4 w-4" />
                                                    Upload File
                                                    <input
                                                        type="file"
                                                        multiple
                                                        className="hidden"
                                                        onChange={(e) => setFormData({ ...formData, attachmentNames: Array.from(e.target.files || []).slice(0, 10).map((file) => file.name) })}
                                                    />
                                                </label>
                                            </div>
                                            {formData.attachmentNames.length ? (
                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    {formData.attachmentNames.map((name) => (
                                                        <span key={name} className="rounded-md bg-slate-100 px-2.5 py-1 text-xs text-slate-700 dark:bg-neutral-800 dark:text-neutral-300">{name}</span>
                                                    ))}
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>

                                    <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950/30">
                                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Totals</h3>
                                        <div className="mt-4 space-y-4 text-sm">
                                            <div className="flex items-center justify-between text-slate-600 dark:text-neutral-300">
                                                <span>Sub Total</span>
                                                <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(subTotal, currency)}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <label className="min-w-24 text-slate-600 dark:text-neutral-300">Discount</label>
                                                <div className="relative flex-1">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        value={formData.discountPercent}
                                                        onChange={(e) => setFormData({ ...formData, discountPercent: e.target.value })}
                                                        className={cn(inputClasses, "pr-8 text-right")}
                                                        placeholder="0"
                                                    />
                                                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span>
                                                </div>
                                                <span className="w-24 text-right text-slate-500 dark:text-neutral-400">{formatCurrency(discountAmount, currency)}</span>
                                            </div>
                                            {computedTaxBreakdown.taxType === 'INTRA_STATE' ? (
                                                <>
                                                    <div className="flex items-center justify-between text-slate-600 dark:text-neutral-300">
                                                        <span>CGST ({(effectiveGstPercent / 2).toFixed(2)}%)</span>
                                                        <span>{formatCurrency(computedTaxBreakdown.cgstAmount, currency, 2, 2)}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-slate-600 dark:text-neutral-300">
                                                        <span>SGST ({(effectiveGstPercent / 2).toFixed(2)}%)</span>
                                                        <span>{formatCurrency(computedTaxBreakdown.sgstAmount, currency, 2, 2)}</span>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="flex items-center justify-between text-slate-600 dark:text-neutral-300">
                                                    <span>{computedTaxBreakdown.taxType === 'OVERSEAS' ? 'GST' : `IGST (${taxPercentLabel})`}</span>
                                                    <span>{formatCurrency(computedTaxBreakdown.igstAmount, currency, 2, 2)}</span>
                                                </div>
                                            )}
                                            <div className="grid grid-cols-[auto_1fr_76px] items-center gap-3">
                                                <div className="flex items-center gap-2 text-slate-600 dark:text-neutral-300">
                                                    <label className="inline-flex items-center gap-1.5">
                                                        <input type="radio" checked={formData.withholdingType === 'TDS'} onChange={() => setFormData({ ...formData, withholdingType: 'TDS' })} />
                                                        TDS
                                                    </label>
                                                    <label className="inline-flex items-center gap-1.5">
                                                        <input type="radio" checked={formData.withholdingType === 'TCS'} onChange={() => setFormData({ ...formData, withholdingType: 'TCS' })} />
                                                        TCS
                                                    </label>
                                                </div>
                                                <select
                                                    value={formData.withholdingTaxPercent}
                                                    onChange={(e) => setFormData({ ...formData, withholdingTaxPercent: e.target.value })}
                                                    className={inputClasses}
                                                >
                                                    <option value="" className="text-sm">Select a Tax</option>
                                                    <option value="1">1%</option>
                                                    <option value="2">2%</option>
                                                    <option value="10">10%</option>
                                                </select>
                                                <span className="text-right text-slate-500 dark:text-neutral-400">
                                                    {formData.withholdingType === 'TCS' ? '+' : '-'}{formatCurrency(withholdingAmount, currency)}
                                                </span>
                                            </div>
                                            <div className="border-t border-slate-200 pt-4 dark:border-neutral-800">
                                                <div className="flex items-center justify-between text-base font-bold text-slate-950 dark:text-white">
                                                    <span>Total</span>
                                                    <span>{formattedTotal}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {error ? (
                                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-900/40 dark:bg-rose-500/10 dark:text-rose-300">
                                        {error}
                                    </div>
                                ) : null}
                            </div>

                            <div className="hidden rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-neutral-800 dark:bg-neutral-950/30">
                                <div className="mx-auto min-h-full max-w-[820px] rounded-xl bg-white p-8 text-slate-950 shadow-sm">
                                    <div className="grid grid-cols-[1fr_auto] gap-8">
                                        <div>
                                            <div className="h-12 w-28 overflow-hidden rounded-md bg-transparent flex items-center justify-start">
                                                <img src={seller.logoUrl} alt={seller.name} className="max-h-full max-w-full object-contain" />
                                            </div>
                                            <h3 className="mt-3 text-lg font-bold">{seller.name}</h3>
                                            {seller.addressLines.map((line) => (
                                                <p key={line} className="text-sm leading-5">{line}</p>
                                            ))}
                                            {seller.gstin ? <p className="text-sm leading-5">GSTIN {seller.gstin}</p> : null}
                                        </div>
                                        <div className="text-right">
                                            <h2 className="text-4xl font-light tracking-wide">Original Tax Invoice</h2>
                                            <p className="mt-2 text-lg font-bold"># {previewInvoiceNo}</p>
                                            <div className="mt-8">
                                                <p className="text-sm font-bold">Balance Due</p>
                                                <p className="text-2xl font-bold">{formattedTotal}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-12 grid grid-cols-[1fr_auto] gap-8">
                                        <div>
                                            <p className="text-lg">Bill To</p>
                                            <p className="font-bold uppercase text-blue-600">{billTo.name || workOrder?.customerName || 'Client Company'}</p>
                                            {billToLines.map((line) => (
                                                <p key={line} className="text-sm leading-5">{line}</p>
                                            ))}
                                            {billTo.taxId ? <p className="text-sm leading-5">GSTIN {billTo.taxId}</p> : null}
                                        </div>
                                        <div className="grid grid-cols-[auto_auto] items-end gap-x-12 gap-y-2 self-end text-sm">
                                            <span className="text-base">Invoice Date :</span>
                                            <span>{formData.invoiceDate || 'YYYY-MM-DD'}</span>
                                            <span className="text-base">Terms :</span>
                                            <span>{formData.paymentTerms || '-'}</span>
                                            <span className="text-base">Due Date :</span>
                                            <span>{formData.dueDate || formData.invoiceDate || 'YYYY-MM-DD'}</span>
                                        </div>
                                    </div>

                                    <p className="mt-8 text-sm">Place Of Supply: {getPlaceOfSupplyLabel(clientStateCode)}</p>

                                    <div className="mt-8 overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead className="bg-neutral-800 text-left text-white">
                                                <tr>
                                                    <th className="px-4 py-3 text-lg font-normal">Item & Description</th>
                                                    <th className="px-4 py-3 text-lg font-normal">HSN/SAC</th>
                                                    <th className="px-4 py-3 text-right text-lg font-normal">Qty</th>
                                                    <th className="px-4 py-3 text-right text-lg font-normal">Rate</th>
                                                    <th className="px-4 py-3 text-right text-lg font-normal">{taxColumnLabel}</th>
                                                    <th className="px-4 py-3 text-right text-lg font-normal">Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedInvoiceHeads.map((head, index) => (
                                                    <tr key={head.id} className="align-top">
                                                        <td className="px-4 py-4">
                                                            {index === 0 && orderDetailsText ? (
                                                                <>
                                                                    <p className="whitespace-pre-line text-base leading-6">Order Details</p>
                                                                    <p className="mt-1 whitespace-pre-line text-base leading-6">{orderDetailsText}</p>
                                                                    <div className="mt-2" />
                                                                </>
                                                            ) : null}
                                                            <p>{index + 1}. {head.label}</p>
                                                            {head.itemDescription ? <p className="ml-4 text-sm text-slate-600">{head.itemDescription}</p> : null}
                                                        </td>
                                                        <td className="px-4 py-4">{head.hsnSac || invoiceOptions.hsnSac || '998313'}</td>
                                                        <td className="px-4 py-4 text-right">{Number(head.qty) || 0}</td>
                                                        <td className="px-4 py-4 text-right">{formatCurrency(Number(head.rate) || 0, currency)}</td>
                                                        <td className="px-4 py-4 text-right">
                                                            <div>{formatCurrency(Number(head.tax) || 0, currency)}</div>
                                                            <div className="text-xs">{(Number(head.taxPercent) || 0) > 0 ? `${Number(head.taxPercent)}%` : 'Exempt'}</div>
                                                        </td>
                                                        <td className="px-4 py-4 text-right">{formatCurrency(Number(head.amount) || 0, currency)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        <div className="border-t border-slate-300" />
                                    </div>

                                    <div className="mt-6 grid grid-cols-[1fr_260px] gap-8 text-sm">
                                        <div>
                                            <p className="text-sm">Po No. {workOrder?.woNumber || '-'} Dated: {workOrder?.woDate || '-'}</p>
                                            {formData.customerNotes ? (
                                                <>
                                                    <p className="mt-4 font-bold">Customer Notes</p>
                                                    <p className="mt-2 whitespace-pre-wrap leading-5">{formData.customerNotes}</p>
                                                </>
                                            ) : null}
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between"><span>Sub Total</span><span>{formatCurrency(subTotal, currency)}</span></div>
                                            {discountAmount ? <div className="flex justify-between"><span>Discount</span><span>-{formatCurrency(discountAmount, currency)}</span></div> : null}
                                            {computedTaxBreakdown.taxType === 'INTRA_STATE' ? (
                                                <>
                                                    <div className="flex justify-between"><span>CGST ({(effectiveGstPercent / 2).toFixed(2)}%)</span><span>{formatCurrency(computedTaxBreakdown.cgstAmount, currency, 2, 2)}</span></div>
                                                    <div className="flex justify-between"><span>SGST ({(effectiveGstPercent / 2).toFixed(2)}%)</span><span>{formatCurrency(computedTaxBreakdown.sgstAmount, currency, 2, 2)}</span></div>
                                                </>
                                            ) : (
                                                <div className="flex justify-between"><span>IGST ({taxPercentLabel})</span><span>{formatCurrency(computedTaxBreakdown.igstAmount, currency, 2, 2)}</span></div>
                                            )}
                                            {withholdingAmount ? (
                                                <div className="flex justify-between"><span>{formData.withholdingType}</span><span>{formData.withholdingType === 'TCS' ? '+' : '-'}{formatCurrency(withholdingAmount, currency)}</span></div>
                                            ) : null}
                                            {waiveOffAmount ? <div className="flex justify-between"><span>Waive Off</span><span>-{formatCurrency(waiveOffAmount, currency)}</span></div> : null}
                                            <div className="flex justify-between border-t border-slate-300 pt-2 text-base font-bold"><span>Total</span><span>{formattedTotal}</span></div>
                                        </div>
                                    </div>

                                    <div className="mt-10 text-sm">
                                        <h3 className="mt-8 text-xl">Terms & Conditions</h3>
                                        <div className="mt-3 whitespace-pre-wrap">{formData.termsAndConditions || '-'}</div>
                                        <p className="mt-12 text-xl">Authorized Signatory <span className="inline-block w-72 border-b border-slate-900 align-middle" /></p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                    <div className="space-y-5">
                        <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 ml-1">Items</label>
                                <SmartSelect
                                    multiple
                                    value={formData.itemDetails}
                                    onChange={(val) => setFormData({ ...formData, itemDetails: val })}
                                    placeholder="Select Items"
                                    options={localItemOptions}
                                    allowCreateFromSearch
                                    onAddNew={(newItem) => {
                                        const nextItem = (newItem || '').trim();
                                        if (!nextItem) return;

                                        setLocalItemOptions((prev) =>
                                            prev.some((opt) => opt.toLowerCase() === nextItem.toLowerCase())
                                                ? prev
                                                : [...prev, nextItem]
                                        );
                                        setFormData((prev) => ({
                                            ...prev,
                                            itemDetails: prev.itemDetails.includes(nextItem)
                                                ? prev.itemDetails
                                                : [...prev.itemDetails, nextItem],
                                        }));
                                    }}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 ml-1">Invoice No <span className="text-rose-500">*</span></label>
                                <input
                                    type="text"
                                    value={formData.invoiceNo}
                                    onChange={(e) => {
                                        clearFieldError('invoiceNo');
                                        setFormData({ ...formData, invoiceNo: e.target.value });
                                    }}
                                    className={inputClasses}
                                    placeholder="Invoice No"
                                />
                                {fieldErrors.invoiceNo ? <p className="text-xs text-rose-500">{fieldErrors.invoiceNo}</p> : null}
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 ml-1">Invoice Date <span className="text-rose-500">*</span></label>
                                <input
                                    type="date"
                                    value={formData.invoiceDate}
                                    onChange={(e) => {
                                        clearFieldError('invoiceDate');
                                        setFormData({ ...formData, invoiceDate: e.target.value });
                                    }}
                                    className={cn(inputClasses, "dark:[color-scheme:dark]")}
                                />
                                {fieldErrors.invoiceDate ? <p className="text-xs text-rose-500">{fieldErrors.invoiceDate}</p> : null}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 ml-1">Amount <span className="text-rose-500">*</span></label>
                                <div className="relative">
                                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-medium text-slate-400 dark:text-neutral-500">
                                        {currencySymbol}
                                    </span>
                                    <input
                                        type="number"
                                        value={formData.amount}
                                        onChange={(e) => {
                                            clearFieldError('amount');
                                            setFormData({ ...formData, amount: e.target.value });
                                        }}
                                        className={moneyInputClasses}
                                        placeholder="Amount"
                                    />
                                </div>
                                {fieldErrors.amount ? <p className="text-xs text-rose-500">{fieldErrors.amount}</p> : null}
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 ml-1">Tax <span className="text-rose-500">*</span></label>
                                <div className="relative">
                                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-medium text-slate-400 dark:text-neutral-500">
                                        {currencySymbol}
                                    </span>
                                    <input
                                        type="number"
                                        value={formData.tax}
                                        onChange={(e) => {
                                            clearFieldError('tax');
                                            setFormData({ ...formData, tax: e.target.value });
                                        }}
                                        className={moneyInputClasses}
                                        placeholder="Tax"
                                    />
                                </div>
                                {fieldErrors.tax ? <p className="text-xs text-rose-500">{fieldErrors.tax}</p> : null}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 ml-1">Total Amount</label>
                            <input
                                type="text"
                                value={new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(totalAmount)}
                                readOnly
                                className={cn(inputClasses, "bg-slate-50 dark:bg-neutral-800 text-slate-500 dark:text-neutral-300")}
                            />
                        </div>

                        <label className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-neutral-300">
                            <input
                                type="checkbox"
                                checked={formData.waiveOff}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        waiveOff: e.target.checked,
                                        waiveOffAmount: e.target.checked ? prev.waiveOffAmount : '',
                                        waiveOffReason: e.target.checked ? prev.waiveOffReason : '',
                                    }))
                                }
                                className="rounded border-slate-300 dark:border-neutral-700"
                            />
                            Is Waive Off
                        </label>

                        {formData.waiveOff ? (
                            <div className="flex flex-col gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 ml-1">Waive Off Amount <span className="text-rose-500">*</span></label>
                                    <div className="relative">
                                        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-medium text-slate-400 dark:text-neutral-500">
                                            {currencySymbol}
                                        </span>
                                        <input
                                            type="number"
                                            value={formData.waiveOffAmount}
                                            onChange={(e) => {
                                                clearFieldError('waiveOffAmount');
                                                setFormData({ ...formData, waiveOffAmount: e.target.value });
                                            }}
                                            className={moneyInputClasses}
                                            placeholder="Waive Off Amount"
                                        />
                                    </div>
                                    {fieldErrors.waiveOffAmount ? <p className="text-xs text-rose-500">{fieldErrors.waiveOffAmount}</p> : null}
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 ml-1">Reason</label>
                                    <textarea
                                        value={formData.waiveOffReason}
                                        onChange={(e) => setFormData({ ...formData, waiveOffReason: e.target.value })}
                                        className={cn(inputClasses, "min-h-[104px] resize-y")}
                                        placeholder="Reason"
                                    />
                                </div>
                            </div>
                        ) : null}

                        {error ? (
                            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-900/40 dark:bg-rose-500/10 dark:text-rose-300">
                                {error}
                            </div>
                        ) : null}
                    </div>
                    )}
                </div>

                {isModal && isPreviewOpen ? (
                    <div className="absolute inset-0 z-[170] flex items-center justify-center bg-black/55 p-6 backdrop-blur-sm">
                        <div className="flex h-[88vh] w-[86vw] max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-2xl dark:border-neutral-800 dark:bg-neutral-950">
                            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 dark:border-neutral-800 dark:bg-[#131313]">
                                <div>
                                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Projected Invoice</h3>
                                    <p className="text-xs text-slate-500 dark:text-neutral-400">Preview before saving or downloading.</p>
                                </div>
                                <button onClick={() => setIsPreviewOpen(false)} className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-neutral-800">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-auto p-6">
                                {invoicePreview}
                            </div>
                            <div className="flex justify-end gap-3 border-t border-slate-200 bg-white px-5 py-4 dark:border-neutral-800 dark:bg-[#131313]">
                                <button
                                    type="button"
                                    onClick={() => setIsPreviewOpen(false)}
                                    className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                                >
                                    Cancel
                                </button>
                                <motion.button
                                    type="button"
                                    onClick={() => handleSave('download')}
                                    disabled={isSaving}
                                    animate={isDownloadShake ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
                                    transition={{ duration: 0.32 }}
                                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-70"
                                >
                                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                                    Save and Download
                                </motion.button>
                            </div>
                        </div>
                    </div>
                ) : null}

                <div className="p-6 border-t border-slate-100 dark:border-neutral-800 bg-white/80 dark:bg-[#131313]/90 backdrop-blur-md flex justify-end gap-3 shrink-0">
                    {isModal ? (
                        <>
                            <button onClick={onClose} className="rounded-lg border border-slate-200 px-5 py-3 text-xs font-bold text-slate-500 transition-colors hover:bg-slate-50 dark:border-neutral-700 dark:hover:bg-neutral-800">
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsPreviewOpen(true)}
                                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-5 py-3 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-70 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                            >
                                <Eye className="h-4 w-4" />
                                View Projected Invoice
                            </button>
                            <button
                                onClick={() => handleSave('draft')}
                                disabled={isSaving}
                                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-5 py-3 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-70 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                            >
                                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                Save as Draft
                            </button>
                            <motion.button
                                onClick={() => handleSave('download')}
                                disabled={isSaving}
                                animate={isDownloadShake ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
                                transition={{ duration: 0.32 }}
                                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-xs font-bold text-white shadow-lg shadow-blue-500/20 transition-colors hover:bg-blue-700 disabled:opacity-70"
                            >
                                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                                Save and Download
                            </motion.button>
                        </>
                    ) : (
                        <>
                            <button onClick={onClose} className="flex-1 py-3 text-xs font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-neutral-800 rounded-lg transition-colors border border-slate-200 dark:border-neutral-700">
                                Close
                            </button>
                            <button
                                onClick={() => handleSave('draft')}
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
                        </>
                    )}
                </div>
            </MotionDiv>
        </div>,
        document.body
    );
};
