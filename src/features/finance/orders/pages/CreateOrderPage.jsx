import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus,
  Trash2,
  ChevronRight,
  Check,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { SmartSelect } from '@/components/ui/SmartSelect';
import { fileApi, financeOpsApi } from '@/lib/api';
import { callApi } from '@/lib/apiService';
import { normalizeApiError } from '@/features/finance/financeApiHelpers';
import { CURRENCY_OPTIONS } from '@/lib/const';

const emptyItem = () => ({ id: Date.now() + Math.random(), details: '', type: '', amount: '', billingFreq: '' });
const emptySchedule = () => ({ id: Date.now() + Math.random(), details: '', amount: '', date: '' });

export const CreateOrderPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const clientIdFromUrl = searchParams.get('clientId') || '';
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [options, setOptions] = useState({
    clients: [],
    selectedClient: null,
    projectTypes: [],
    itemTypes: [],
    billingFrequencies: [],
  });
  const [formData, setFormData] = useState({
    client: clientIdFromUrl,
    currency: 'INR',
    project: '',
    projectType: '',
    woNumber: '',
    woDate: '',
    woValue: '',
    startDate: '',
    endDate: '',
    poExpiry: '',
    scope: '',
    file: null,
    fileName: '',
    fileUrl: '',
    items: [emptyItem()],
    schedule: [emptySchedule()],
  });

  useEffect(() => {
    loadDependencies();
  }, [clientIdFromUrl]);

  useEffect(() => {
    if (!toast.show) return undefined;
    const timer = window.setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 2500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const selectedClient = useMemo(
    () => options.clients.find((client) => client.id === formData.client) || options.selectedClient,
    [formData.client, options]
  );

  const loadDependencies = async () => {
    try {
      setLoading(true);
      const response = await callApi(financeOpsApi.getOrderFormOptions, {
        clientId: clientIdFromUrl || undefined,
      });
      const itemTypesResponse = await callApi(financeOpsApi.getItemTypes);

      setOptions({
        clients: response.clients || [],
        selectedClient: response.selectedClient || null,
        projectTypes: response.projectTypes || [],
        itemTypes: Array.isArray(itemTypesResponse) ? itemTypesResponse : [],
        billingFrequencies: response.billingFrequencies || [],
      });

      if (response.selectedClient && clientIdFromUrl) {
        setFormData((prev) => ({
          ...prev,
          client: response.selectedClient.id,
          currency: response.selectedClient.currency || prev.currency,
        }));
      }
    } catch (loadError) {
      setError(normalizeApiError(loadError, 'Failed to load order form'));
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
  };

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    const matchedClient = options.clients.find((client) => client.id === formData.client);
    if (!matchedClient?.currency) return;
    setFormData((prev) => (
      prev.currency === matchedClient.currency ? prev : { ...prev, currency: matchedClient.currency }
    ));
  }, [formData.client, options.clients]);

  const updateItem = (id, field, value) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    }));
  };

  const updateScheduleItem = (id, field, value) => {
    setFormData((prev) => ({
      ...prev,
      schedule: prev.schedule.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    }));
  };

  const addItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, emptyItem()],
    }));
  };

  const addScheduleItem = () => {
    setFormData((prev) => ({
      ...prev,
      schedule: [...prev.schedule, emptySchedule()],
    }));
  };

  const removeItem = (id) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== id),
    }));
  };

  const removeScheduleItem = (id) => {
    setFormData((prev) => ({
      ...prev,
      schedule: prev.schedule.filter((item) => item.id !== id),
    }));
  };

  const validateStep = (step) => {
    if (step === 1) {
      if (!formData.client || !formData.project || !formData.projectType || !formData.woNumber || !formData.woDate || !formData.woValue || !formData.startDate || !formData.endDate || !formData.poExpiry) {
        return 'Fill all required order details';
      }
    }

    if (step === 2) {
      const hasInvalidItem = formData.items.some((item) => !item.details || !item.type || !item.amount || !item.billingFreq);
      if (hasInvalidItem) {
        return 'Complete all item rows before continuing';
      }
    }

    if (step === 3) {
      const hasInvalidSchedule = formData.schedule.some((item) => !item.details || !item.amount || !item.date);
      if (hasInvalidSchedule) {
        return 'Complete all schedule rows before submitting';
      }
    }

    return '';
  };

  const handleNext = () => {
    const validationError = validateStep(currentStep);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    if (currentStep < 3) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setError('');
    if (currentStep > 1) setCurrentStep((prev) => prev - 1);
  };

  const handleFileSelected = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setError('');
      const uploaded = await callApi(fileApi.upload, file);
      setFormData((prev) => ({
        ...prev,
        file,
        fileName: file.name,
        fileUrl: uploaded.url || uploaded.fileUrl || uploaded.location || '',
      }));
      showToast('File uploaded successfully');
    } catch (uploadError) {
      setError(normalizeApiError(uploadError, 'Failed to upload file'));
    }
  };

  const handleFinish = async () => {
    const validationError = validateStep(3);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const response = await callApi(financeOpsApi.createWorkOrder, formData.client, {
        projectName: formData.project,
        projectType: formData.projectType,
        currency: formData.currency,
        woNumber: formData.woNumber,
        woDate: formData.woDate,
        woValue: Number(formData.woValue),
        startDate: formData.startDate,
        endDate: formData.endDate,
        poExpiry: formData.poExpiry,
        scope: formData.scope,
        poDocumentUrl: formData.fileUrl || undefined,
        items: formData.items.map((item) => ({
          itemDetails: item.details,
          itemType: item.type,
          amount: Number(item.amount),
          billingFrequency: item.billingFreq,
        })),
        schedule: formData.schedule.map((item) => ({
          itemDetails: item.details,
          amount: Number(item.amount),
          scheduleDate: item.date,
        })),
      });

      showToast('Work order created successfully');
      const workOrderId = response.workOrder?.id;
      const clientId = response.workOrder?.clientId || formData.client;
      window.setTimeout(() => {
        navigate(`/client/${workOrderId}/orders`);
      }, 400);
      return { clientId };
    } catch (submitError) {
      setError(normalizeApiError(submitError, 'Failed to create work order'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500 pb-20">
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading create order flow...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-lg text-slate-500 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <div className="text-sm text-slate-500 dark:text-neutral-400 mb-1 flex items-center gap-2">
            <span className="cursor-pointer hover:text-slate-900 dark:hover:text-white" onClick={() => navigate('/clients')}>Clients</span>
            <span>/</span>
            {selectedClient?.label || selectedClient?.customerName ? (
              <>
                <span className="cursor-pointer hover:text-slate-900 dark:hover:text-white" onClick={() => navigate(`/clients/${selectedClient.id || formData.client}/details`)}>
                  {selectedClient.label || selectedClient.customerName}
                </span>
                <span>/</span>
              </>
            ) : null}
            <span className="text-slate-900 dark:text-white font-medium">Create Order</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Create New Order</h1>
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-900 w-full rounded-2xl border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden flex flex-col">
        <div className="px-12 py-6 bg-slate-50 dark:bg-neutral-950/50 border-b border-slate-200 dark:border-neutral-800">
          <div className="relative grid grid-cols-3 max-w-3xl mx-auto">
            <div className="absolute top-4 left-[16.66%] right-[16.66%] h-0.5 bg-slate-200 dark:bg-neutral-700 -translate-y-1/2 z-0">
              <div className="h-full bg-blue-600 transition-all duration-300 ease-in-out" style={{ width: `${(currentStep - 1) * 50}%` }} />
            </div>

            {[
              { step: 1, label: 'Order Details' },
              { step: 2, label: 'Order Items' },
              { step: 3, label: 'Billing Schedule' },
            ].map((s) => (
              <div key={s.step} className="relative z-10 flex flex-col items-center gap-2">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 border-2 bg-white dark:bg-neutral-900',
                    currentStep >= s.step ? 'border-blue-600 text-blue-600' : 'border-slate-300 dark:border-neutral-600 text-slate-500',
                    currentStep > s.step && 'bg-blue-600 text-white border-blue-600',
                    currentStep === s.step && 'bg-blue-600 text-white border-blue-600 shadow-md ring-4 ring-blue-50 dark:ring-blue-900/20'
                  )}
                >
                  {currentStep > s.step ? <Check className="w-4 h-4" /> : `0${s.step}`}
                </div>
                <span className={cn('text-xs font-medium transition-colors text-center whitespace-nowrap', currentStep >= s.step ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500')}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 min-h-[400px]">
          {currentStep === 1 && (
            <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-right-4 duration-300 space-y-5">
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-wider">
                  <div className="w-1 h-3 bg-blue-600 rounded-full" />
                  Project Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-4 space-y-1">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Customer Name<span className="text-red-500">*</span></label>
                    <CustomSelect
                      value={formData.client}
                      onChange={(val) => updateField('client', val)}
                      placeholder="Select Customer"
                      options={options.clients.map((client) => ({ value: client.id, label: client.label }))}
                    />
                  </div>
                  <div className="md:col-span-5 space-y-1">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Project Name<span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      placeholder="e.g. Cloud Migration Phase 1"
                      value={formData.project}
                      onChange={(e) => updateField('project', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all hover:border-blue-400 dark:text-white"
                    />
                  </div>
                  <div className="md:col-span-3 space-y-1">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Project Type<span className="text-red-500">*</span></label>
                    <CustomSelect
                      value={formData.projectType}
                      onChange={(val) => updateField('projectType', val)}
                      placeholder="Select Type"
                      options={options.projectTypes.map((type) => ({ value: type, label: type }))}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 dark:border-neutral-800" />

              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-wider">
                  <div className="w-1 h-3 bg-emerald-500 rounded-full" />
                  Order Specifics
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-4 space-y-1">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Work Order No.<span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      placeholder="WO-2024-001"
                      value={formData.woNumber}
                      onChange={(e) => updateField('woNumber', e.target.value)}
                      className="w-full pl-3 pr-3 py-2 border border-slate-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono transition-all hover:border-blue-400 dark:text-white"
                    />
                  </div>
                  <div className="md:col-span-4 space-y-1">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Order Value<span className="text-red-500">*</span></label>
                    <div className="flex gap-2">
                      <select
                        value={formData.currency}
                        onChange={(e) => updateField('currency', e.target.value)}
                        className="w-24 px-2 py-2 border border-slate-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all hover:border-blue-400 dark:text-white"
                      >
                        {CURRENCY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.symbol} {option.value}</option>
                        ))}
                      </select>
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                          {CURRENCY_OPTIONS.find((option) => option.value === formData.currency)?.symbol || '$'}
                        </span>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={formData.woValue}
                        onChange={(e) => updateField('woValue', e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono transition-all hover:border-blue-400 dark:text-white"
                      />
                      </div>
                    </div>
                  </div>
                  <div className="md:col-span-4 space-y-1">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Order Date<span className="text-red-500">*</span></label>
                    <input type="date" value={formData.woDate} onChange={(e) => updateField('woDate', e.target.value)} className="w-full px-3 py-2 border border-slate-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-600 dark:text-neutral-400" />
                  </div>

                  <div className="md:col-span-8 space-y-1">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Work Order Period<span className="text-red-500">*</span></label>
                    <div className="flex items-center gap-4">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-medium uppercase">Start</span>
                        <input type="date" value={formData.startDate} onChange={(e) => updateField('startDate', e.target.value)} className="w-full pl-10 pr-3 py-2 border border-slate-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-600 dark:text-neutral-400" />
                      </div>
                      <div className="text-slate-400">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-medium uppercase">End</span>
                        <input type="date" value={formData.endDate} onChange={(e) => updateField('endDate', e.target.value)} className="w-full pl-10 pr-3 py-2 border border-slate-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-600 dark:text-neutral-400" />
                      </div>
                    </div>
                  </div>
                  <div className="md:col-span-4 space-y-1">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">PO Expiry<span className="text-red-500">*</span></label>
                    <input type="date" value={formData.poExpiry} onChange={(e) => updateField('poExpiry', e.target.value)} className="w-full px-3 py-2 border border-slate-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-600 dark:text-neutral-400" />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 dark:border-neutral-800" />

              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-wider">
                  <div className="w-1 h-3 bg-indigo-500 rounded-full" />
                  Scope & Attachments
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-8 space-y-1">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Work Scope</label>
                    <textarea
                      placeholder="Briefly describe the scope of work..."
                      value={formData.scope}
                      onChange={(e) => updateField('scope', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none h-20 resize-none transition-all hover:border-blue-400 dark:text-white"
                    />
                  </div>
                  <div className="md:col-span-4 space-y-1">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Upload WO Copy</label>
                    <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-slate-200 dark:border-neutral-700 rounded-xl p-4 flex flex-col items-center justify-center text-center hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer group h-20">
                      <UploadCloud className="w-5 h-5 text-slate-400 group-hover:text-blue-500 transition-colors mb-1" />
                      <p className="text-[10px] text-slate-500 font-medium">
                        <span className="text-blue-600">{formData.fileName || 'Click to upload'}</span>
                      </p>
                    </div>
                    <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelected} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300 max-w-5xl mx-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-medium text-slate-900 dark:text-white">Order Items</h3>
              </div>
              {formData.items.map((item) => (
                <div key={item.id} className="grid grid-cols-12 gap-4 items-end pb-4 border-b border-slate-100 dark:border-neutral-800">
                  <div className="col-span-4 space-y-2">
                    <label className="text-xs font-medium text-slate-500">Item Details</label>
                    <input type="text" placeholder="Item Details" value={item.details} onChange={(e) => updateItem(item.id, 'details', e.target.value)} className="w-full px-3 py-2 border border-slate-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white" />
                  </div>
                  <div className="col-span-3 space-y-2">
                    <label className="text-xs font-medium text-slate-500">Item Type</label>
                    <SmartSelect
                      value={item.type}
                      onChange={(val) => updateItem(item.id, 'type', val)}
                      placeholder="Item Type"
                      options={options.itemTypes}
                      allowCreateFromSearch
                      onAddNew={(newType) => {
                        const nextType = (newType || '').trim();
                        if (!nextType) return;
                        setOptions((prev) => ({
                          ...prev,
                          itemTypes: prev.itemTypes.some((opt) => opt.toLowerCase() === nextType.toLowerCase())
                            ? prev.itemTypes
                            : [...prev.itemTypes, nextType],
                        }));
                        updateItem(item.id, 'type', nextType);
                      }}
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <label className="text-xs font-medium text-slate-500">Item Amount</label>
                    <input type="number" placeholder="Amount" value={item.amount} onChange={(e) => updateItem(item.id, 'amount', e.target.value)} className="w-full px-3 py-2 border border-slate-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white" />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <label className="text-xs font-medium text-slate-500">Billing Freq.</label>
                    <CustomSelect
                      value={item.billingFreq}
                      onChange={(val) => updateItem(item.id, 'billingFreq', val)}
                      placeholder="Select"
                      options={options.billingFrequencies.map((frequency) => ({ value: frequency, label: frequency }))}
                    />
                  </div>
                  <div className="col-span-1 flex justify-center pb-2">
                    {formData.items.length > 1 && (
                      <button onClick={() => removeItem(item.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <button onClick={addItem} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 dark:text-blue-400 text-sm font-medium rounded-lg transition-colors mt-2">
                <Plus className="w-4 h-4" />
                Add Item
              </button>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300 max-w-5xl mx-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-medium text-slate-900 dark:text-white">Billing Schedule</h3>
              </div>
              {formData.schedule.map((item) => (
                <div key={item.id} className="grid grid-cols-12 gap-4 items-end pb-4 border-b border-slate-100 dark:border-neutral-800">
                  <div className="col-span-5 space-y-2">
                    <label className="text-xs font-medium text-slate-500">Item Details</label>
                    <input type="text" placeholder="Item Details" value={item.details} onChange={(e) => updateScheduleItem(item.id, 'details', e.target.value)} className="w-full px-3 py-2 border border-slate-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white" />
                  </div>
                  <div className="col-span-3 space-y-2">
                    <label className="text-xs font-medium text-slate-500">Amount</label>
                    <input type="number" placeholder="Amount" value={item.amount} onChange={(e) => updateScheduleItem(item.id, 'amount', e.target.value)} className="w-full px-3 py-2 border border-slate-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white" />
                  </div>
                  <div className="col-span-3 space-y-2">
                    <label className="text-xs font-medium text-slate-500">Schedule Date</label>
                    <input type="date" value={item.date} onChange={(e) => updateScheduleItem(item.id, 'date', e.target.value)} className="w-full px-3 py-2 border border-slate-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white" />
                  </div>
                  <div className="col-span-1 flex justify-center pb-2">
                    {formData.schedule.length > 1 && (
                      <button onClick={() => removeScheduleItem(item.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <button onClick={addScheduleItem} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 dark:text-blue-400 text-sm font-medium rounded-lg transition-colors mt-2">
                <Plus className="w-4 h-4" />
                Add Schedule
              </button>
            </div>
          )}

          {error ? (
            <div className="max-w-4xl mx-auto mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-900/40 dark:bg-rose-500/10 dark:text-rose-300">
              {error}
            </div>
          ) : null}
        </div>

        <div className="px-8 py-4 bg-slate-50 dark:bg-neutral-950 border-t border-slate-200 dark:border-neutral-800 flex justify-between items-center">
          <div>
            {currentStep > 1 && (
              <button
                onClick={handleBack}
                className="px-4 py-2 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 rounded-lg text-slate-700 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-neutral-800 text-sm font-medium transition-colors"
              >
                Previous
              </button>
            )}
          </div>
          <button
            onClick={currentStep === 3 ? handleFinish : handleNext}
            disabled={submitting}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving
              </span>
            ) : currentStep === 3 ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>

      {toast.show ? (
        <div className={cn('fixed bottom-6 right-6 z-[170] flex items-start gap-3 rounded-2xl px-4 py-3 text-white shadow-2xl', toast.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600')}>
          {toast.type === 'error' ? <AlertCircle className="mt-0.5 h-5 w-5" /> : <CheckCircle2 className="mt-0.5 h-5 w-5" />}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      ) : null}
    </div>
  );
};
