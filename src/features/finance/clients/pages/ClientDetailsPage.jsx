import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Building2,
  Receipt,
  FileText,
  MoreHorizontal,
  Trash2,
  X,
  UploadCloud,
  FileEdit,
  Loader2,
  ChevronDown,
  ChevronUp,
  Search,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAuth } from '@/features/auth/context/AuthContext';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { SmartSelect } from '@/components/ui/SmartSelect';
import { financeOpsApi } from '@/lib/api';
import { callApi } from '@/lib/apiService';
import { formatCurrency, normalizeApiError } from '@/features/finance/financeApiHelpers';

const ConfirmDialog = ({ open, title, message, confirmLabel, busy, onCancel, onConfirm }) => {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/45 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[24px] border border-slate-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-[#121212]">
        <div className="flex items-start gap-4">
          <div className="inline-flex rounded-2xl bg-rose-50 p-3 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
            <Trash2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xl font-semibold text-slate-950 dark:text-white">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-neutral-400">{message}</p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-rose-500 disabled:opacity-60 dark:bg-rose-500 dark:hover:bg-rose-400"
          >
            <Trash2 className="h-4 w-4" />
            {busy ? 'Deleting...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

const FeedbackToast = ({ toast }) => {
  if (!toast.show) return null;
  const isError = toast.type === 'error';
  return (
    <div
      className={cn(
        'fixed bottom-6 right-6 z-[170] flex items-start gap-3 rounded-2xl px-4 py-3 text-white shadow-2xl',
        isError ? 'bg-rose-600' : 'bg-emerald-600'
      )}
    >
      {isError ? <AlertCircle className="mt-0.5 h-5 w-5" /> : <CheckCircle2 className="mt-0.5 h-5 w-5" />}
      <span className="text-sm font-medium">{toast.message}</span>
    </div>
  );
};

const EditWorkOrderDrawer = ({ isOpen, onClose, workOrder, onSave }) => {
  const MotionDiv = motion.div;
  const [formData, setFormData] = useState({
    projectName: '',
    projectType: '',
    woNumber: '',
    woValue: '',
    woDate: '',
    startDate: '',
    endDate: '',
    poExpiry: '',
    workScope: '',
    poDocumentUrl: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isCustomTypeMode, setIsCustomTypeMode] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setError('');
      setIsSaving(false);
      return;
    }

    if (workOrder) {
      setFormData({
        projectName: workOrder.project || '',
        projectType: workOrder.projectType || '',
        woNumber: workOrder.woNumber || '',
        woValue: String(workOrder.woValue ?? ''),
        woDate: workOrder.woDate || '',
        startDate: workOrder.startDate || '',
        endDate: workOrder.endDate || '',
        poExpiry: workOrder.poExpiry || '',
        workScope: workOrder.workScope || '',
        poDocumentUrl: workOrder.poDocumentUrl || '',
      });
      setIsCustomTypeMode(false);
    }
  }, [isOpen, workOrder]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError('');
      await onSave(formData);
      onClose();
    } catch (saveError) {
      setError(normalizeApiError(saveError, 'Failed to update work order'));
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const inputClasses =
    'w-full px-4 py-2.5 bg-white dark:bg-[#1A1A1A] border border-slate-200 dark:border-neutral-800 hover:border-slate-300 dark:hover:border-neutral-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-lg outline-none transition-all duration-300 text-sm font-medium text-slate-900 dark:text-white';

  const SectionTitle = ({ color, title }) => (
    <div className="flex items-center gap-2 mt-8 mb-4">
      <div className={`w-1 h-3.5 rounded-full ${color}`} />
      <h3 className="text-[11px] font-bold text-slate-900 dark:text-white uppercase tracking-wider">{title}</h3>
    </div>
  );

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
        className="absolute inset-y-0 right-0 w-full md:w-[450px] bg-white dark:bg-[#131313] shadow-2xl flex flex-col h-full border-l border-slate-100 dark:border-neutral-800"
      >
        <div className="px-8 py-6 border-b border-slate-100 dark:border-neutral-800 shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 dark:bg-[#1A1A1A] rounded-xl border border-blue-100 dark:border-blue-900/30">
                <FileEdit className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Edit Work Order
                </h2>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-lg transition-colors">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="space-y-5">
            <SectionTitle color="bg-blue-500" title="PROJECT INFORMATION" />

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 ml-1">Project Name<span className="text-rose-500">*</span></label>
              <input type="text" value={formData.projectName} onChange={(e) => setFormData({ ...formData, projectName: e.target.value })} className={inputClasses} placeholder="e.g. Cloud Migration Phase 1" />
            </div>

            <div className="space-y-1.5 z-50 relative">
              <label className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 ml-1">Project Type<span className="text-rose-500">*</span></label>
              {isCustomTypeMode ? (
                <div className="relative">
                  <input
                    type="text"
                    value={formData.projectType}
                    onChange={(e) => setFormData({ ...formData, projectType: e.target.value })}
                    className={cn(inputClasses, 'pr-10')}
                    placeholder="Type new project type..."
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomTypeMode(false);
                      setFormData({ ...formData, projectType: '' });
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-md transition-colors"
                  >
                    <X className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </div>
              ) : (
                <SmartSelect
                  value={formData.projectType}
                  onChange={(val) => setFormData({ ...formData, projectType: val })}
                  placeholder="Select Type"
                  options={['Fixed Bid', 'T&M', 'Retainer']}
                  onAddNew={() => {
                    setFormData({ ...formData, projectType: '' });
                    setIsCustomTypeMode(true);
                  }}
                  addNewLabel="Create New Type"
                />
              )}
            </div>

            <SectionTitle color="bg-emerald-500" title="ORDER SPECIFICS" />

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 ml-1">Work Order No.<span className="text-rose-500">*</span></label>
              <input type="text" value={formData.woNumber} onChange={(e) => setFormData({ ...formData, woNumber: e.target.value })} className={inputClasses} />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 ml-1">Order Value<span className="text-rose-500">*</span></label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-medium">$</span>
                <input type="number" value={formData.woValue} onChange={(e) => setFormData({ ...formData, woValue: e.target.value })} className={cn(inputClasses, 'pl-8')} placeholder="0.00" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 ml-1">Order Date<span className="text-rose-500">*</span></label>
              <input type="date" value={formData.woDate} onChange={(e) => setFormData({ ...formData, woDate: e.target.value })} className={cn(inputClasses, 'dark:[color-scheme:dark]')} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 ml-1">Period Start</label>
                <input type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} className={cn(inputClasses, 'dark:[color-scheme:dark]')} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 ml-1">Period End</label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => {
                    const nextEndDate = e.target.value;
                    setFormData((prev) => ({
                      ...prev,
                      endDate: nextEndDate,
                      poExpiry: prev.poExpiry || nextEndDate,
                    }));
                  }}
                  className={cn(inputClasses, 'dark:[color-scheme:dark]')}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 ml-1">PO Expiry<span className="text-rose-500">*</span></label>
              <input type="date" value={formData.poExpiry} onChange={(e) => setFormData({ ...formData, poExpiry: e.target.value })} className={cn(inputClasses, 'dark:[color-scheme:dark]')} />
            </div>

            <SectionTitle color="bg-indigo-500" title="SCOPE & ATTACHMENTS" />

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 ml-1">Work Scope</label>
              <textarea value={formData.workScope} onChange={(e) => setFormData({ ...formData, workScope: e.target.value })} className={cn(inputClasses, 'resize-none h-28')} placeholder="Briefly describe the scope of work..." />
            </div>

            <div className="space-y-1.5 pb-2">
              <label className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 ml-1">Upload WO Copy</label>
              <div className="h-32 border-2 border-dashed border-slate-200 dark:border-neutral-700 rounded-lg flex flex-col items-center justify-center text-slate-500 dark:text-neutral-400 bg-slate-50 dark:bg-neutral-900/30">
                <UploadCloud className="w-6 h-6 mb-2" />
                <p className="text-sm font-medium">
                  {formData.poDocumentUrl ? 'File already uploaded' : <span className="text-blue-600 dark:text-blue-500">Upload available in create flow</span>}
                </p>
              </div>
            </div>

            {error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-900/40 dark:bg-rose-500/10 dark:text-rose-300">
                {error}
              </div>
            ) : null}
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 dark:border-neutral-800 bg-white/80 dark:bg-[#131313]/90 backdrop-blur-md flex gap-3 shrink-0">
          <button onClick={onClose} className="flex-1 py-3 text-xs font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-neutral-800 rounded-lg transition-colors border border-slate-200 dark:border-neutral-700">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-[1.5] py-3 text-xs font-bold rounded-lg shadow-lg transition-all duration-300 bg-blue-600 text-white shadow-blue-500/20 hover:bg-blue-700 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <span className="inline-flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving
              </span>
            ) : 'Save Changes'}
          </button>
        </div>
      </MotionDiv>
    </div>,
    document.body
  );
};

export const ClientDetailsPage = () => {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: 'project', direction: 'asc' });
  const [client, setClient] = useState(null);
  const [workOrders, setWorkOrders] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteState, setDeleteState] = useState({ wo: null, submitting: false });
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [workOrderToEdit, setWorkOrderToEdit] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [menuState, setMenuState] = useState({ wo: null, top: 0, left: 0 });
  const can = (permissionKey) => user?.permissions?.includes(permissionKey);
  const canCreateWorkOrder = can('write:finance-ops.clients.work-orders.create');
  const canEditWorkOrder = can('write:finance-ops.clients.work-orders.details');

  useEffect(() => {
    fetchClientDetails();
  }, [id, searchTerm, currentPage, itemsPerPage, sortConfig]);

  useEffect(() => {
    if (!toast.show) return undefined;
    const timer = window.setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 2500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!menuState.wo) return undefined;

    const closeMenu = () => setMenuState({ wo: null, top: 0, left: 0 });

    window.addEventListener('click', closeMenu);
    window.addEventListener('resize', closeMenu);
    window.addEventListener('scroll', closeMenu, true);

    return () => {
      window.removeEventListener('click', closeMenu);
      window.removeEventListener('resize', closeMenu);
      window.removeEventListener('scroll', closeMenu, true);
    };
  }, [menuState.wo]);

  const fetchClientDetails = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await callApi(financeOpsApi.getClientDetails, id, {
        search: searchTerm || undefined,
        page: currentPage,
        limit: itemsPerPage,
        sortBy: sortConfig.key,
        sortDirection: sortConfig.direction,
      });
      setClient(response.client);
      setWorkOrders(response.workOrders || []);
      setPagination(response.pagination || { total: 0, totalPages: 1 });
    } catch (fetchError) {
      setError(normalizeApiError(fetchError, 'Failed to load client details'));
      setWorkOrders([]);
      setPagination({ total: 0, totalPages: 1 });
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleToggleMenu = (wo, element) => {
    if (menuState.wo?.id === wo.id) {
      setMenuState({ wo: null, top: 0, left: 0 });
      return;
    }

    const rect = element.getBoundingClientRect();
    const menuWidth = 144;
    const menuHeight = 92;
    const gap = 8;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < menuHeight + gap && rect.top > menuHeight + gap;

    setMenuState({
      wo,
      top: openUpward ? rect.top - menuHeight - gap : rect.bottom + gap,
      left: Math.min(window.innerWidth - menuWidth - gap, Math.max(gap, rect.right - menuWidth)),
    });
  };

  const handleSaveEditDrawer = async (savedData) => {
    await callApi(financeOpsApi.updateWorkOrder, workOrderToEdit.id, {
      projectName: savedData.projectName,
      projectType: savedData.projectType,
      woNumber: savedData.woNumber,
      woValue: Number(savedData.woValue || 0),
      woDate: savedData.woDate,
      startDate: savedData.startDate || undefined,
      endDate: savedData.endDate || undefined,
      poExpiry: savedData.poExpiry || undefined,
      scope: savedData.workScope || undefined,
      poDocumentUrl: savedData.poDocumentUrl || undefined,
    });
    showToast('Work order updated successfully');
    fetchClientDetails();
  };

  const handleConfirmDelete = async () => {
    if (!deleteState.wo) return;
    try {
      setDeleteState((prev) => ({ ...prev, submitting: true }));
      await callApi(financeOpsApi.deleteWorkOrder, deleteState.wo.id);
      setDeleteState({ wo: null, submitting: false });
      showToast('Work order deleted successfully');
      fetchClientDetails();
    } catch (deleteError) {
      setDeleteState((prev) => ({ ...prev, submitting: false }));
      showToast(normalizeApiError(deleteError, 'Failed to delete work order'), 'error');
    }
  };

  const totalPages = Math.max(1, pagination.totalPages || 1);
  const startIndex = pagination.total === 0 ? 0 : (currentPage - 1) * itemsPerPage;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 max-w-7xl mx-auto">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/clients')}
          className="p-2.5 border border-slate-200 dark:border-neutral-800 bg-transparent rounded-xl hover:bg-slate-50 dark:hover:bg-neutral-800 transition-colors text-slate-500 dark:text-neutral-400"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 text-[15px] font-medium text-slate-500 dark:text-neutral-400">
          <span className="cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors" onClick={() => navigate('/clients')}>Clients</span>
          <span className="text-slate-400 dark:text-neutral-500">/</span>
          <span className="text-slate-900 dark:text-white font-semibold">{client?.customerName || 'Client'}</span>
        </div>
      </div>

      {loading && !client ? (
        <div className="rounded-[16px] border border-slate-200 bg-white p-12 text-center text-slate-500 shadow-sm dark:border-neutral-800 dark:bg-[#121212]">
          <div className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading client details...
          </div>
        </div>
      ) : error && !client ? (
        <div className="rounded-[16px] border border-rose-200 bg-rose-50 p-12 text-center text-rose-600 shadow-sm dark:border-rose-900/40 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-neutral-800 rounded-[16px] p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="w-[60px] h-[60px] rounded-[14px] bg-blue-50 dark:bg-[#1A2332] flex items-center justify-center text-blue-600 dark:text-[#60A5FA] text-2xl font-bold">
                  {(client?.customerName || 'CL').substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h1 className="text-[28px] font-bold text-slate-900 dark:text-white mb-1.5 tracking-tight leading-none">{client?.customerName}</h1>
                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600 dark:text-neutral-400 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Receipt className="w-4 h-4 text-slate-400" />
                        <span>GST: <span className="text-slate-900 dark:text-white font-semibold">{client?.gst || 'N/A'}</span></span>
                      </div>
                    </div>
                  </div>
                </div>

              <button
                disabled={!canCreateWorkOrder}
                onClick={() => navigate(`/orders/new?clientId=${client?.id || id}`)}
                className={cn(
                  'inline-flex items-center gap-2 px-5 py-2.5 text-white text-sm font-medium rounded-lg transition-colors shadow-sm self-start sm:self-center',
                  canCreateWorkOrder ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-400 cursor-not-allowed'
                )}
              >
                <Plus className="w-4 h-4" />
                Create Work Order
              </button>
            </div>
          </div>

          <div className="relative bg-white dark:bg-neutral-900 rounded-xl border border-slate-200 dark:border-neutral-800 shadow-sm overflow-visible mt-8">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-neutral-800 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-slate-400" />
                Work Orders
              </h2>
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search Work Orders..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                />
              </div>
            </div>

            <div className="overflow-x-auto overflow-y-visible">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 dark:bg-neutral-900/50 text-slate-500 dark:text-neutral-500 font-medium border-b border-slate-200 dark:border-neutral-800">
                  <tr>
                    {[
                      { label: 'Project', key: 'project' },
                      { label: 'WO Number', key: 'woNumber' },
                      { label: 'WO Value', key: 'woValue' },
                      { label: 'WO Date', key: 'woDate' },
                      { label: 'WO Period', key: 'woPeriod' },
                    ].map((column) => (
                      <th
                        key={column.key}
                        onClick={() => handleSort(column.key)}
                        className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors select-none"
                      >
                        <div className="flex items-center gap-1">
                          {column.label}
                          <div className="flex flex-col">
                            <ChevronUp className={cn('w-2 h-2', sortConfig.key === column.key && sortConfig.direction === 'asc' ? 'text-main dark:text-white' : 'text-slate-300 dark:text-neutral-600')} />
                            <ChevronDown className={cn('w-2 h-2', sortConfig.key === column.key && sortConfig.direction === 'desc' ? 'text-main dark:text-white' : 'text-slate-300 dark:text-neutral-600')} />
                          </div>
                        </div>
                      </th>
                    ))}
                    {canEditWorkOrder ? <th className="px-6 py-4 text-right">Action</th> : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
                  {loading ? (
                    <tr>
                      <td colSpan={canEditWorkOrder ? 6 : 5} className="p-12 text-center text-slate-500">
                        <div className="inline-flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading work orders...
                        </div>
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={canEditWorkOrder ? 6 : 5} className="p-12 text-center text-rose-500">
                        {error}
                      </td>
                    </tr>
                  ) : workOrders.length > 0 ? (
                    workOrders.map((wo) => (
                      <tr
                        key={wo.id}
                        onClick={() => navigate(`/client/${wo.id}/orders`)}
                        className="group hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer"
                      >
                        <td className="px-6 py-4 relative z-10">
                          <div className="text-slate-900 dark:text-white font-medium transition-colors">
                            {wo.project}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-600 dark:text-neutral-300 font-medium">
                          {wo.woNumber}
                        </td>
                        <td className="px-6 py-4 text-slate-900 dark:text-white font-medium">
                          {formatCurrency(wo.woValue, wo.currency || client?.currency)}
                        </td>
                        <td className="px-6 py-4 text-slate-500 dark:text-neutral-400">
                          {wo.woDate}
                        </td>
                        <td className="px-6 py-4 text-slate-500 dark:text-neutral-400">
                          {wo.woPeriod || 'N/A'}
                        </td>
                        {canEditWorkOrder ? (
                          <td className="px-6 py-4 text-right">
                            <div className="inline-block relative">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleMenu(wo, e.currentTarget);
                                }}
                                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        ) : null}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={canEditWorkOrder ? 6 : 5} className="p-12 text-center text-slate-500">
                        <p>No work orders found.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-900/30 text-xs text-slate-500 dark:text-neutral-400 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <span>
                  Showing {pagination.total === 0 ? 0 : startIndex + 1} to {Math.min(startIndex + itemsPerPage, pagination.total)} of {pagination.total} records
                </span>
                <div className="flex items-center gap-2 border-l border-slate-200 dark:border-neutral-800 pl-4">
                  <span>Rows per page:</span>
                  <div className="w-[70px]">
                    <CustomSelect
                      value={itemsPerPage}
                      onChange={(val) => {
                        setItemsPerPage(Number(val));
                        setCurrentPage(1);
                      }}
                      options={[10, 25, 50, 100].map((size) => ({ value: size, label: size.toString() }))}
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 border border-slate-200 dark:border-neutral-800 rounded bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronDown className="w-4 h-4 rotate-90" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={cn(
                      'w-7 h-7 flex items-center justify-center rounded text-xs transition-colors',
                      currentPage === page
                        ? 'bg-blue-600 text-white font-medium'
                        : 'hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-600 dark:text-neutral-400'
                    )}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages || pagination.total === 0}
                  className="p-1.5 border border-slate-200 dark:border-neutral-800 rounded bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronDown className="w-4 h-4 -rotate-90" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <ConfirmDialog
        open={Boolean(deleteState.wo)}
        title="Delete Work Order"
        message={deleteState.wo ? `Delete ${deleteState.wo.project} (${deleteState.wo.woNumber})? This action cannot be undone.` : ''}
        confirmLabel="Delete Order"
        busy={deleteState.submitting}
        onCancel={() => setDeleteState({ wo: null, submitting: false })}
        onConfirm={handleConfirmDelete}
      />

      <EditWorkOrderDrawer
        isOpen={isEditDrawerOpen}
        workOrder={workOrderToEdit}
        onClose={() => {
          setIsEditDrawerOpen(false);
          setWorkOrderToEdit(null);
        }}
        onSave={handleSaveEditDrawer}
      />

      {canEditWorkOrder && menuState.wo && createPortal(
        <div
          className="fixed z-[999] w-36 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl dark:border-neutral-800 dark:bg-neutral-900 animate-in zoom-in-95 duration-100"
          style={{ top: menuState.top, left: menuState.left }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              setWorkOrderToEdit(menuState.wo);
              setIsEditDrawerOpen(true);
              setMenuState({ wo: null, top: 0, left: 0 });
            }}
            className="w-full px-4 py-2.5 text-left text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Edit
          </button>
          <button
            onClick={() => {
              setDeleteState({ wo: menuState.wo, submitting: false });
              setMenuState({ wo: null, top: 0, left: 0 });
            }}
            className="w-full px-4 py-2.5 text-left text-xs font-medium text-rose-600 transition-colors hover:bg-rose-50 dark:hover:bg-rose-900/20"
          >
            Delete
          </button>
        </div>,
        document.body
      )}

      <FeedbackToast toast={toast} />
    </div>
  );
};
