import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import {
  ArrowLeft,
  Plus,
  Calendar,
  FileText,
  FileSpreadsheet,
  Package,
  Receipt,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Check,
  ShieldAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AddOrderItemDrawer } from '@/features/finance/orders/components/AddOrderItemDrawer';
import { AddScheduleItemDrawer } from '@/features/finance/orders/components/AddScheduleItemDrawer';
import { AddInvoiceDrawer } from '@/features/finance/orders/components/AddInvoiceDrawer';
import { EditReceiptDrawer } from '@/features/finance/orders/components/EditReceiptDrawer';
import { TableCard } from '@/features/shared/components/TableCard';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { financeOpsApi, tenantApi } from '@/lib/api';
import { callApi } from '@/lib/apiService';
import { extractListPayload, formatCurrency, normalizeApiError, formatDate } from '@/features/finance/financeApiHelpers';
import { useAuth } from '@/features/auth/context/AuthContext';
import { CURRENCY_OPTIONS, INDIA_GST_STATE_OPTIONS, OVERSEAS_PLACE_OF_SUPPLY_CODE, TENANT_INVOICE_PROFILE } from '@/lib/const';

const ORDER_TABS = ['items', 'schedule', 'invoice', 'receipt'];

const TabItem = ({ icon: Icon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={cn(
      'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
      isActive
        ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-500'
        : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300 dark:text-neutral-400 dark:hover:text-white dark:hover:border-neutral-700'
    )}
  >
    <Icon className="w-4 h-4" />
    {label}
  </button>
);

const ActionMenu = ({
  openDownward = false,
  showDownload = false,
  showEdit = true,
  onDownload,
  onEdit,
  onDelete,
  editLabel = 'Edit',
  canWrite = true,
  onPermissionError
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!isOpen) return undefined;
    const close = () => setIsOpen(false);
    const onPointerDown = (event) => {
      if (triggerRef.current?.contains(event.target) || menuRef.current?.contains(event.target)) return;
      close();
    };
    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    return () => {
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [isOpen]);

  const toggleMenu = (event) => {
    event.stopPropagation();
    if (isOpen) {
      setIsOpen(false);
      return;
    }
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const menuWidth = 144;
    const menuHeight = showDownload ? 128 : 92;
    const gap = 8;
    const openDown = openDownward || !(rect.top > menuHeight + gap);
    setPosition({
      top: openDown ? rect.bottom + gap : rect.top - menuHeight - gap,
      left: Math.min(window.innerWidth - menuWidth - gap, Math.max(gap, rect.right - menuWidth)),
    });
    setIsOpen(true);
  };

  return (
    <>
      <button
        ref={triggerRef}
        onClick={toggleMenu}
        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {isOpen && createPortal(
        <div
          ref={menuRef}
          className="fixed z-[999] w-36 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl dark:border-neutral-800 dark:bg-neutral-900 animate-in zoom-in-95 duration-100"
          style={{ top: position.top, left: position.left }}
          onClick={(e) => e.stopPropagation()}
        >
          {showDownload ? (
            <button
              onClick={() => {
                setIsOpen(false);
                onDownload?.();
              }}
              className="w-full px-4 py-2.5 text-left text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10 transition-colors"
            >
              Download
            </button>
          ) : null}
          {showEdit ? (
            <button
              onClick={() => {
                setIsOpen(false);
                if (!canWrite) return onPermissionError?.();
                onEdit?.();
              }}
              className="w-full px-4 py-2.5 text-left text-xs font-medium text-slate-700 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-neutral-800 transition-colors"
            >
              {editLabel}
            </button>
          ) : null}
          <button
            onClick={() => {
              setIsOpen(false);
              if (!canWrite) return onPermissionError?.();
              onDelete?.();
            }}
            className="w-full px-4 py-2.5 text-left text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
          >
            Delete
          </button>
        </div>,
        document.body
      )}
    </>
  );
};

const ConfirmDialog = ({ open, title, message, confirmLabel, busy, onCancel, onConfirm }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/45 px-4 backdrop-blur-sm">
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
    </div>
  );
};

const getReceiptButtonClasses = (status) => {
  if (status === 'Paid' || status === 'Received') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20';
  }

  if (status === 'Pending' || status === 'Partially Received') {
    return 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900/40 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20';
  }

  return 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700';
};

const FeedbackToast = ({ toast }) => {
  if (!toast.show) return null;
  const isError = toast.type === 'error';
  return (
    <div
      className={cn(
        'fixed bottom-8 left-1/2 -translate-x-1/2 z-[2000] flex items-center gap-3 rounded-2xl px-6 py-4 text-white shadow-2xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 min-w-[320px]',
        isError ? 'bg-rose-600' : 'bg-emerald-600'
      )}
    >
      {isError ? <ShieldAlert className="h-6 w-6 shrink-0" /> : <CheckCircle2 className="h-6 w-6 shrink-0" />}
      <div className="flex flex-col">
        <span className="text-sm font-bold tracking-wide">{toast.message}</span>
        {isError && toast.errorDetails && (
          <span className="text-[10px] opacity-90 font-mono mt-0.5">
            {toast.errorDetails.error} ({toast.errorDetails.statusCode})
          </span>
        )}
      </div>
    </div>
  );
};

const createPageState = () => ({ page: 1, limit: 10, total: 0, totalPages: 1, sortKey: null, sortDirection: 'asc' });

const getTabFromSearchParams = (params) => {
  const tab = params.get('tab');
  return ORDER_TABS.includes(tab) ? tab : 'items';
};

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

const getPlaceOfSupplyLabel = (value) => {
  if (!value) return '-';
  if (value === OVERSEAS_PLACE_OF_SUPPLY_CODE) return 'Overseas (00)';
  const option = INDIA_GST_STATE_OPTIONS.find((item) => item.value === value);
  if (!option) return value;
  const name = option.label.replace(/^\d{2}\s+/, '').trim();
  return `${name} (${option.value})`;
};

const resolveAssetUrl = (url) => {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  const apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:3000/v1').replace(/\/+$/, '');
  const origin = apiBase.replace(/\/v\d+$/, '');
  return `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
};

const resolveFrontendPublicUrl = (url) => {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  const origin = window.location.origin;
  return `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
};

export const WorkOrderDetailsPage = () => {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTabState] = useState(() => {
    if (location.state?.activeTab && ORDER_TABS.includes(location.state.activeTab)) {
      return location.state.activeTab;
    }
    return getTabFromSearchParams(searchParams);
  });
  const [workOrder, setWorkOrder] = useState(null);
  const [tenantProfile, setTenantProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [isAddItemDrawerOpen, setIsAddItemDrawerOpen] = useState(false);
  const [isScheduleDrawerOpen, setIsScheduleDrawerOpen] = useState(false);
  const [isInvoiceDrawerOpen, setIsInvoiceDrawerOpen] = useState(false);
  const [isCreateInvoiceModalOpen, setIsCreateInvoiceModalOpen] = useState(false);
  const [createInvoiceToEdit, setCreateInvoiceToEdit] = useState(null);
  const [isReceiptDrawerOpen, setIsReceiptDrawerOpen] = useState(false);
  const [orderItems, setOrderItems] = useState([]);
  const [scheduleRecords, setScheduleRecords] = useState([]);
  const [invoiceRecords, setInvoiceRecords] = useState([]);
  const [receiptRecords, setReceiptRecords] = useState([]);
  const [scheduleItemToEdit, setScheduleItemToEdit] = useState(null);
  const [invoiceToEdit, setInvoiceToEdit] = useState(null);
  const [receiptToEdit, setReceiptToEdit] = useState(null);
  const [itemToEdit, setItemToEdit] = useState(null);
  const [invoiceForReceipt, setInvoiceForReceipt] = useState(null);
  const [scheduleItemOptions, setScheduleItemOptions] = useState([]);
  const [deleteState, setDeleteState] = useState({ type: '', item: null, submitting: false });
  const [itemsPageState, setItemsPageState] = useState(createPageState());
  const [schedulePageState, setSchedulePageState] = useState(createPageState());
  const [invoicePageState, setInvoicePageState] = useState(createPageState());
  const [receiptPageState, setReceiptPageState] = useState(createPageState());
  const [tabLoading, setTabLoading] = useState({ items: false, schedule: false, invoice: false, receipt: false });
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [selectedItemIds, setSelectedItemIds] = useState([]);
  const [isAutoGeneratingSchedules, setIsAutoGeneratingSchedules] = useState(false);
  const [invoiceOptions, setInvoiceOptions] = useState({ nextInvoiceNo: '', hsnSac: '998313', hsnSacCodes: ['998313'], taxRates: [] });
  const [invoiceTrackingByScheduleId, setInvoiceTrackingByScheduleId] = useState({});
  const invoiceItemOptions = useMemo(() => orderItems.map((item) => item.itemDetails), [orderItems]);
  const can = (permissionKey) => user?.permissions?.includes(permissionKey);
  const tabPermissionMap = {
    items: 'read:finance-ops.clients.work-orders.items',
    schedule: 'read:finance-ops.clients.work-orders.schedules',
    invoice: 'read:finance-ops.clients.work-orders.invoices',
    receipt: 'read:finance-ops.clients.work-orders.receipts',
  };
  const allowedTabs = ORDER_TABS.filter((tab) => can(tabPermissionMap[tab]));
  const canWriteItems = can('write:finance-ops.clients.work-orders.items');
  const canWriteSchedules = can('write:finance-ops.clients.work-orders.schedules');
  const canWriteInvoices = can('write:finance-ops.clients.work-orders.invoices');
  const canWriteReceipts = can('write:finance-ops.clients.work-orders.receipts');
  const hasOrderItems = orderItems.length > 0;

  useEffect(() => {
    loadWorkOrder();
  }, [id]);

  useEffect(() => {
    let mounted = true;
    const loadTenant = async () => {
      if (!user?.tenantId) return;
      try {
        const data = await callApi(tenantApi.getById, user.tenantId);
        if (mounted) setTenantProfile(data || null);
      } catch {
        if (mounted) setTenantProfile(null);
      }
    };
    loadTenant();
    return () => {
      mounted = false;
    };
  }, [user?.tenantId]);


  useEffect(() => {
    const tabFromUrl = getTabFromSearchParams(searchParams);
    setActiveTabState((current) => (current === tabFromUrl ? current : tabFromUrl));
  }, [searchParams]);

  useEffect(() => {
    if (!allowedTabs.length) return;
    if (!allowedTabs.includes(activeTab)) {
      setActiveTab(allowedTabs[0]);
    }
  }, [activeTab, allowedTabs]);

  useEffect(() => {
    if (!workOrder) return;
    fetchItems();
  }, [workOrder, itemsPageState.page, itemsPageState.limit, itemsPageState.sortKey, itemsPageState.sortDirection]);

  useEffect(() => {
    if (!workOrder) return;
    if (activeTab === 'schedule') fetchSchedules();
    if (activeTab === 'invoice') fetchInvoices();
    if (activeTab === 'receipt') fetchReceipts();
  }, [activeTab, workOrder, schedulePageState.page, schedulePageState.limit, schedulePageState.sortKey, schedulePageState.sortDirection, invoicePageState.page, invoicePageState.limit, invoicePageState.sortKey, invoicePageState.sortDirection, receiptPageState.page, receiptPageState.limit, receiptPageState.sortKey, receiptPageState.sortDirection]);

  useEffect(() => {
    if (!toast.show) return undefined;
    const timer = window.setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 2500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    setSelectedItemIds((prev) => prev.filter((itemId) => orderItems.some((item) => item.id === itemId)));
  }, [orderItems]);

  const setActiveTab = (tab) => {
    setActiveTabState(tab);
    const nextParams = new URLSearchParams(searchParams);
    if (tab === 'items') nextParams.delete('tab');
    else nextParams.set('tab', tab);
    setSearchParams(nextParams, { state: location.state });
  };

  const showToast = (message, type = 'success', errorDetails = null) => {
    setToast({ show: true, message, type, errorDetails });
  };

  const handlePermissionError = () => {
    showToast("Insufficient permissions", 'error', { error: 'Forbidden', statusCode: 403 });
  };

  const setLoadingFor = (tab, value) => {
    setTabLoading((prev) => ({ ...prev, [tab]: value }));
  };

  const toggleItemSelection = (itemId) => {
    setSelectedItemIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  const toggleSelectAllItems = () => {
    if (!orderItems.length) {
      return;
    }

    const allVisibleSelected = orderItems.every((item) => selectedItemIds.includes(item.id));
    setSelectedItemIds(allVisibleSelected ? [] : orderItems.map((item) => item.id));
  };

  const loadWorkOrder = async () => {
    try {
      setLoading(true);
      setPageError('');
      const response = await callApi(financeOpsApi.getWorkOrder, id);
      setWorkOrder(response);
    } catch (error) {
      setPageError(normalizeApiError(error, 'Failed to load work order'));
    } finally {
      setLoading(false);
    }
  };

  const fetchItems = async () => {
    try {
      setLoadingFor('items', true);
      const response = await callApi(financeOpsApi.listItems, id, {
        page: itemsPageState.page,
        limit: itemsPageState.limit,
        sortBy: itemsPageState.sortKey || undefined,
        sortDirection: itemsPageState.sortDirection,
      });
      const payload = extractListPayload(response);
      setOrderItems(payload.items);
      setItemsPageState((prev) => ({ ...prev, ...payload.pagination }));
    } catch (error) {
      showToast(normalizeApiError(error, 'Failed to load items'), 'error');
    } finally {
      setLoadingFor('items', false);
    }
  };

  const fetchSchedules = async () => {
    try {
      setLoadingFor('schedule', true);
      const response = await callApi(financeOpsApi.listSchedules, id, {
        page: schedulePageState.page,
        limit: schedulePageState.limit,
        sortBy: schedulePageState.sortKey || undefined,
        sortDirection: schedulePageState.sortDirection,
      });
      const payload = extractListPayload(response);
      setScheduleRecords(payload.items);
      setSchedulePageState((prev) => ({ ...prev, ...payload.pagination }));
    } catch (error) {
      showToast(normalizeApiError(error, 'Failed to load schedules'), 'error');
    } finally {
      setLoadingFor('schedule', false);
    }
  };

  const fetchScheduleItemOptions = async () => {
    try {
      const response = await callApi(financeOpsApi.getScheduleItemOptions, id);
      setScheduleItemOptions(response || []);
    } catch (error) {
      showToast(normalizeApiError(error, 'Failed to load item options'), 'error');
    }
  };

  const fetchInvoices = async () => {
    try {
      setLoadingFor('invoice', true);
      const response = await callApi(financeOpsApi.listInvoices, id, {
        page: invoicePageState.page,
        limit: invoicePageState.limit,
        sortBy: invoicePageState.sortKey || undefined,
        sortDirection: invoicePageState.sortDirection,
      });
      const payload = extractListPayload(response);
      setInvoiceRecords(payload.items);
      setInvoicePageState((prev) => ({ ...prev, ...payload.pagination }));
    } catch (error) {
      showToast(normalizeApiError(error, 'Failed to load invoices'), 'error');
    } finally {
      setLoadingFor('invoice', false);
    }
  };

  const fetchInvoiceOptions = async () => {
    try {
      const response = await callApi(financeOpsApi.getInvoiceOptions);
      setInvoiceOptions({
        nextInvoiceNo: response?.nextInvoiceNo || '',
        hsnSac: response?.hsnSac || '998313',
        hsnSacCodes: response?.hsnSacCodes?.length ? response.hsnSacCodes : [response?.hsnSac || '998313'],
        taxRates: response?.taxRates || [],
      });
    } catch (error) {
      showToast(normalizeApiError(error, 'Failed to load invoice options'), 'error');
    }
  };

  const fetchReceipts = async () => {
    try {
      setLoadingFor('receipt', true);
      const response = await callApi(financeOpsApi.listReceipts, id, {
        page: receiptPageState.page,
        limit: receiptPageState.limit,
        sortBy: receiptPageState.sortKey || undefined,
        sortDirection: receiptPageState.sortDirection,
      });
      const payload = extractListPayload(response);
      setReceiptRecords(payload.items);
      setReceiptPageState((prev) => ({ ...prev, ...payload.pagination }));
    } catch (error) {
      showToast(normalizeApiError(error, 'Failed to load receipts'), 'error');
    } finally {
      setLoadingFor('receipt', false);
    }
  };

  const buildScheduleInvoiceTracking = (invoices) => {
    const statusMap = {};
    for (const invoice of invoices || []) {
      const rowItems = Array.isArray(invoice.invoiceItems) ? invoice.invoiceItems : [];
      for (const row of rowItems) {
        if (!row?.workOrderScheduleId) continue;
        const existing = statusMap[row.workOrderScheduleId];
        const nextLevel = invoice.status === 'Received' ? 2 : 1;
        const currentLevel = existing?.level ?? 0;
        if (nextLevel >= currentLevel) {
          statusMap[row.workOrderScheduleId] = {
            level: nextLevel,
            status: nextLevel === 2 ? 'green' : 'orange',
            message: nextLevel === 2 ? 'Invoice created and receipt received' : 'Invoice created but receipt is pending',
            invoiceNo: invoice.invoiceNo,
          };
        }
      }
    }
    return statusMap;
  };

  const openCreateInvoiceModal = async (invoiceToEdit = null) => {
    setInvoiceToEdit(null);
    setCreateInvoiceToEdit(invoiceToEdit);
    try {
      const [scheduleResponse, invoiceResponse] = await Promise.all([
        callApi(financeOpsApi.listSchedules, id, { page: 1, limit: 100 }),
        callApi(financeOpsApi.listInvoices, id, { page: 1, limit: 500 }),
        fetchInvoiceOptions(),
      ]);
      const schedulePayload = extractListPayload(scheduleResponse);
      const invoicePayload = extractListPayload(invoiceResponse);
      setScheduleRecords(schedulePayload.items);
      setInvoiceTrackingByScheduleId(buildScheduleInvoiceTracking(invoicePayload.items));
    } catch (error) {
      showToast(normalizeApiError(error, 'Failed to load invoice schedule data'), 'error');
    }
    setIsCreateInvoiceModalOpen(true);
  };

  const handleSortChange = (state, setter, key) => {
    const nextDirection = state.sortKey === key && state.sortDirection === 'asc' ? 'desc' : 'asc';
    setter((prev) => ({ ...prev, sortKey: key, sortDirection: nextDirection, page: 1 }));
  };

  const setPage = (setter, page) => setter((prev) => ({ ...prev, page }));
  const setLimit = (setter, limit) => setter((prev) => ({ ...prev, limit, page: 1 }));

  const renderTableFooter = (state, setState) => {
    const startIndex = state.total === 0 ? 0 : (state.page - 1) * state.limit;
    const totalPages = Math.max(1, state.totalPages || 1);

    return (
      <>
        <div className="flex items-center gap-4">
          <span>
            Showing {state.total === 0 ? 0 : startIndex + 1} to {Math.min(startIndex + state.limit, state.total)} of {state.total} records
          </span>
          <div className="flex items-center gap-2 border-l border-slate-200 dark:border-neutral-800 pl-4">
            <span>Rows per page:</span>
            <div className="w-[70px]">
              <CustomSelect
                value={state.limit}
                onChange={(val) => setLimit(setState, Number(val))}
                options={[10, 25, 50, 100].map((size) => ({ value: size, label: size.toString() }))}
              />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(setState, Math.max(1, state.page - 1))}
            disabled={state.page === 1}
            className="p-1.5 border border-slate-200 dark:border-neutral-800 rounded bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => setPage(setState, page)}
              className={cn(
                'w-7 h-7 flex items-center justify-center rounded text-xs transition-colors',
                state.page === page ? 'bg-blue-600 text-white font-medium' : 'hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-600 dark:text-neutral-400'
              )}
            >
              {page}
            </button>
          ))}
          <button
            onClick={() => setPage(setState, Math.min(totalPages, state.page + 1))}
            disabled={state.page === totalPages || state.total === 0}
            className="p-1.5 border border-slate-200 dark:border-neutral-800 rounded bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </>
    );
  };

  const saveItem = async (savedItem) => {
    await callApi(savedItem.id ? financeOpsApi.updateItem : financeOpsApi.createItem, id, ...(savedItem.id ? [savedItem.id] : []), {
      itemDetails: savedItem.itemDetails,
      itemType: savedItem.itemType,
      itemAmount: Number(savedItem.itemAmount),
      billingFrequency: savedItem.billingFrequency,
    });
    showToast(savedItem.id ? 'Item updated successfully' : 'Item added successfully');
    setItemToEdit(null);
    fetchItems();
  };

  const saveSchedule = async (savedItem) => {
    await callApi(savedItem.id ? financeOpsApi.updateSchedule : financeOpsApi.createSchedule, id, ...(savedItem.id ? [savedItem.id] : []), {
      workOrderItemId: savedItem.workOrderItemId || undefined,
      itemDetails: savedItem.itemDetails,
      amount: Number(savedItem.amount),
      scheduleDate: savedItem.scheduleDate,
      installmentLabel: savedItem.installmentLabel || undefined,
    });
    showToast(savedItem.id ? 'Schedule updated successfully' : 'Schedule added successfully');
    setScheduleItemToEdit(null);
    fetchSchedules();
  };

  const autoGenerateSchedules = async () => {
    if (!selectedItemIds.length) {
      return;
    }

    try {
      setIsAutoGeneratingSchedules(true);
      await callApi(financeOpsApi.autoGenerateSchedules, id, { itemIds: selectedItemIds });
      setSelectedItemIds([]);
      fetchSchedules();
      showToast('Schedules generated successfully');
      setActiveTab('schedule');
    } catch (error) {
      showToast(normalizeApiError(error, 'Failed to auto-generate schedules'), 'error');
    } finally {
      setIsAutoGeneratingSchedules(false);
    }
  };

  const saveInvoice = async (savedInvoice) => {
    const response = await callApi(savedInvoice.id ? financeOpsApi.updateInvoice : financeOpsApi.createInvoice, id, ...(savedInvoice.id ? [savedInvoice.id] : []), {
      itemDetails: savedInvoice.itemDetails,
      invoiceNo: savedInvoice.invoiceNo,
      invoiceDate: savedInvoice.invoiceDate,
      amount: Number(savedInvoice.amount),
      tax: Number(savedInvoice.tax || 0),
      totalAmount: Number(savedInvoice.totalAmount),
      waiveOff: Boolean(savedInvoice.waiveOff),
      waiveOffAmount: Number(savedInvoice.waiveOffAmount || 0),
      waiveOffReason: savedInvoice.waiveOffReason || '',
      customerNotes: savedInvoice.customerNotes || '',
      termsAndConditions: savedInvoice.termsAndConditions || '',
      placeOfSupply: savedInvoice.placeOfSupply || '',
      taxType: savedInvoice.taxType || '',
      gstPercent: Number(savedInvoice.gstPercent || 0),
      igstAmount: Number(savedInvoice.igstAmount || 0),
      cgstAmount: Number(savedInvoice.cgstAmount || 0),
      sgstAmount: Number(savedInvoice.sgstAmount || 0),
      createdFromInvoiceBuilder: Boolean(savedInvoice.createdFromInvoiceBuilder),
      savedAndDownloaded: Boolean(savedInvoice.savedAndDownloaded),
      invoiceItems: Array.isArray(savedInvoice.invoiceItems) ? savedInvoice.invoiceItems : [],
    });
    showToast(savedInvoice.id ? 'Invoice updated successfully' : 'Invoice created successfully');
    setInvoiceToEdit(null);
    fetchInvoices();
    fetchReceipts();
    return response;
  };

  const downloadCreatedInvoice = async (invoice) => {
    const currency = workOrder?.currency || 'INR';
    const invoiceNo = invoice?.invoiceNo || 'Invoice';
    const invoiceDate = invoice?.invoiceDate || '';
    const dueDate = invoice?.dueDate || invoiceDate;
    const paymentTerms = invoice?.paymentTerms || 'Due on Receipt';
    const customerName = workOrder?.customerName || workOrder?.client?.name || 'Client Company';
    const customerAddress = [workOrder?.client?.billingStreet, workOrder?.client?.billingCity, workOrder?.client?.billingState, workOrder?.client?.billingZip, workOrder?.client?.billingCountry]
      .filter(Boolean)
      .join(', ');
    const customerTaxId = workOrder?.client?.taxId || '';
    const subtotal = Number(invoice?.amount) || 0;
    const tax = Number(invoice?.tax) || 0;
    const rawItems = Array.isArray(invoice?.invoiceItems) && invoice.invoiceItems.length
      ? invoice.invoiceItems
      : String(invoice?.itemDetails || '')
        .split(',')
        .map((label) => ({ itemLabel: label.trim() }))
        .filter((row) => row.itemLabel);
    const placeOfSupplyCode = invoice?.placeOfSupply || workOrder?.client?.placeOfSupply || '';
    const resolvedTenantProfile = tenantProfile || TENANT_INVOICE_PROFILE;
    const tenantStateCode = getStateCodeFromPlaceOfSupply(resolvedTenantProfile.billingStateCode || resolvedTenantProfile.billingState);
    const clientStateCode = getStateCodeFromPlaceOfSupply(placeOfSupplyCode);
    const taxType = invoice?.taxType || (clientStateCode === OVERSEAS_PLACE_OF_SUPPLY_CODE ? 'OVERSEAS' : (tenantStateCode && tenantStateCode === clientStateCode ? 'INTRA_STATE' : 'INTER_STATE'));
    const gstPercent = Number(invoice?.gstPercent || (subtotal > 0 && tax > 0 ? ((tax * 100) / subtotal) : 18));
    const computedTaxFromRows = rawItems.reduce((sum, row) => sum + (Number(row?.tax) || 0), 0);
    const effectiveTax = tax > 0 ? tax : computedTaxFromRows;
    const rawIgstAmount = Number(invoice?.igstAmount);
    const rawCgstAmount = Number(invoice?.cgstAmount);
    const rawSgstAmount = Number(invoice?.sgstAmount);
    const igstAmount = taxType === 'INTER_STATE'
      ? (rawIgstAmount > 0 ? rawIgstAmount : effectiveTax)
      : 0;
    const cgstAmount = taxType === 'INTRA_STATE'
      ? (rawCgstAmount > 0 ? rawCgstAmount : (effectiveTax / 2))
      : 0;
    const sgstAmount = taxType === 'INTRA_STATE'
      ? (rawSgstAmount > 0 ? rawSgstAmount : (effectiveTax / 2))
      : 0;
    const total = Number(invoice?.totalAmount) || subtotal + tax;

    try {
      const formatPdfCurrency = (value) => {
        const num = Number(value || 0);
        const formattedNum = new Intl.NumberFormat('en-IN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }).format(num);
        const normalizedCurrency = String(currency || 'INR').toUpperCase();
        const prefix = CURRENCY_OPTIONS.find((option) => option.value === normalizedCurrency)?.value || normalizedCurrency;

        return `${prefix} ${formattedNum}`;
      };
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = 210;
      const margin = 14;
      const rightX = pageWidth - margin;
      let y = 16;
      const loadImageForPdf = async (src) => {
        let response;
        try {
          response = await fetch(src, { credentials: 'include', cache: 'no-store' });
        } catch {
          response = await fetch(src, { cache: 'no-store' });
        }
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${src} (${response.status})`);
        }
        const blob = await response.blob();
        if (!blob || !blob.size) {
          throw new Error(`Empty image blob: ${src}`);
        }
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Failed to initialize canvas for logo');

        try {
          const bitmap = await createImageBitmap(blob);
          canvas.width = Math.max(1, bitmap.width || 300);
          canvas.height = Math.max(1, bitmap.height || 120);
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(bitmap, 0, 0);
          return { dataUrl: canvas.toDataURL('image/png'), format: 'PNG', width: canvas.width, height: canvas.height };
        } catch {
          const objectUrl = URL.createObjectURL(blob);
          try {
            const image = await new Promise((resolve, reject) => {
              const img = new Image();
              img.decoding = 'async';
              img.onload = () => resolve(img);
              img.onerror = reject;
              img.src = objectUrl;
            });
            canvas.width = Math.max(1, image.naturalWidth || 300);
            canvas.height = Math.max(1, image.naturalHeight || 120);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(image, 0, 0);
            return { dataUrl: canvas.toDataURL('image/png'), format: 'PNG', width: canvas.width, height: canvas.height };
          } finally {
            URL.revokeObjectURL(objectUrl);
          }
        }
      };

      const write = (text, x, yy, opts = {}) => {
        const { size = 10, bold = false, align = 'left', color = [17, 24, 39] } = opts;
        pdf.setFont('helvetica', bold ? 'bold' : 'normal');
        pdf.setFontSize(size);
        pdf.setTextColor(color[0], color[1], color[2]);
        if (Array.isArray(text)) {
          pdf.text(text, x, yy, { align, lineHeightFactor: 1.3 });
          return;
        }
        pdf.text(String(text ?? ''), x, yy, { align });
      };

      const hasCustomTenantLogo = Boolean(resolvedTenantProfile.logoUrl);
      const sellerLogo = hasCustomTenantLogo
        ? resolveAssetUrl(resolvedTenantProfile.logoUrl)
        : resolveFrontendPublicUrl('/inv_logo.png');
      const sellerName = resolvedTenantProfile.legalName || resolvedTenantProfile.name || 'Tenant';
      const sellerLine1 = resolvedTenantProfile.billingStreet || '';
      const sellerLine2 = [resolvedTenantProfile.billingCity, resolvedTenantProfile.billingState, resolvedTenantProfile.billingZip].filter(Boolean).join(', ');
      const sellerLine3 = resolvedTenantProfile.billingCountry || '';
      const sellerTaxId = resolvedTenantProfile.taxId || '';

      try {
        const logoAsset = await loadImageForPdf(sellerLogo);
        const boxW = 30;
        const boxH = 10;
        const srcW = Math.max(1, Number(logoAsset.width || boxW));
        const srcH = Math.max(1, Number(logoAsset.height || boxH));
        const scale = Math.min(boxW / srcW, boxH / srcH);
        const drawW = srcW * scale;
        const drawH = srcH * scale;
        const drawX = margin;
        const drawY = (y - 1) + ((boxH - drawH) / 2);
        pdf.addImage(logoAsset.dataUrl, logoAsset.format, drawX, drawY, drawW, drawH);
      } catch (logoError) {
        // Do not show incorrect brand fallback when tenant has a custom logo.
        if (!hasCustomTenantLogo) {
          try {
            const fallbackAsset = await loadImageForPdf(resolveFrontendPublicUrl('/inv_logo.png'));
            const boxW = 30;
            const boxH = 10;
            const srcW = Math.max(1, Number(fallbackAsset.width || boxW));
            const srcH = Math.max(1, Number(fallbackAsset.height || boxH));
            const scale = Math.min(boxW / srcW, boxH / srcH);
            const drawW = srcW * scale;
            const drawH = srcH * scale;
            const drawX = margin;
            const drawY = (y - 1) + ((boxH - drawH) / 2);
            pdf.addImage(fallbackAsset.dataUrl, fallbackAsset.format, drawX, drawY, drawW, drawH);
          } catch (fallbackError) {
            console.error('Invoice default logo render failed in PDF generation:', logoError, fallbackError);
          }
        } else {
          console.error('Invoice tenant logo render failed in PDF generation:', logoError);
        }
      }
      write(sellerName, margin, y + 14, { size: 13, bold: true });
      y += 19;
      if (sellerLine1) {
        write(sellerLine1, margin, y, { size: 9 });
        y += 4.5;
      }
      if (sellerLine2) {
        write(sellerLine2, margin, y, { size: 9 });
        y += 4.5;
      }
      if (sellerLine3) {
        write(sellerLine3, margin, y, { size: 9 });
        y += 4.5;
      }
      if (sellerTaxId) {
        write(`GSTIN ${sellerTaxId}`, margin, y, { size: 9 });
        y += 6;
      }

      write('Original Tax Invoice', rightX, 19, { size: 18, align: 'right' });
      write(`# ${invoiceNo}`, rightX, 26, { size: 11, bold: true, align: 'right' });
      write('Balance Due', rightX, 34, { size: 9, bold: true, align: 'right' });
      write(formatPdfCurrency(total), rightX, 41, { size: 13, bold: true, align: 'right' });

      y = Math.max(58, y + 3);
      write('Bill To', margin, y, { size: 11 });
      y += 5;
      write(customerName.toUpperCase(), margin, y, { size: 10, bold: true, color: [37, 99, 235] });
      y += 4.5;
      const addrLines = pdf.splitTextToSize(customerAddress || '-', 95);
      write(addrLines, margin, y, { size: 9 });
      y += addrLines.length * 4;
      if (customerTaxId) {
        write(`GSTIN ${customerTaxId}`, margin, y + 1, { size: 9 });
      }

      const metaStartY = 60;
      write('Invoice Date :', 132, metaStartY, { size: 9 });
      write(invoiceDate || 'YYYY-MM-DD', rightX, metaStartY, { size: 9, align: 'right' });
      write('Terms :', 132, metaStartY + 6, { size: 9 });
      write(paymentTerms || '-', rightX, metaStartY + 6, { size: 9, align: 'right' });
      write('Due Date :', 132, metaStartY + 12, { size: 9 });
      write(dueDate || invoiceDate || 'YYYY-MM-DD', rightX, metaStartY + 12, { size: 9, align: 'right' });

      y = 86;
      write(`Place Of Supply: ${getPlaceOfSupplyLabel(placeOfSupplyCode)}`, margin, y, { size: 9 });
      y += 6;

      pdf.setFillColor(38, 38, 38);
      pdf.rect(margin, y, pageWidth - margin * 2, 8, 'F');
      write('Item & Description', margin + 2, y + 5.5, { size: 9, color: [255, 255, 255] });
      write('HSN/SAC', 94, y + 5.5, { size: 9, color: [255, 255, 255] });
      write('Qty', 116, y + 5.5, { size: 9, align: 'right', color: [255, 255, 255] });
      write('Rate', 144, y + 5.5, { size: 9, align: 'right', color: [255, 255, 255] });
      write(taxType === 'INTRA_STATE' ? 'CGST+SGST' : 'IGST', 169, y + 5.5, { size: 9, align: 'right', color: [255, 255, 255] });
      write('Amount', rightX - 2, y + 5.5, { size: 9, align: 'right', color: [255, 255, 255] });
      y += 15;

      rawItems.forEach((row, index) => {
        const qty = Number(row.qty) || 1;
        const rate = Number(row.rate) || 0;
        const rowTax = Number(row.tax) || 0;
        const amount = Number(row.amount) || qty * rate;
        const taxPercent = Number(row.taxPercent) || ((amount > 0 && rowTax > 0) ? Math.round((rowTax * 100) / amount) : 0);
        const itemLabelText = String(row.itemLabel || '');
        const [label, ...descriptionParts] = itemLabelText.split('\n');
        const itemDescription = descriptionParts.join('\n').trim();
        const numberedLabel = `${index + 1}. ${label || ''}`.trim();
        const itemLines = pdf.splitTextToSize(numberedLabel, 78);
        const descriptionLines = itemDescription ? pdf.splitTextToSize(itemDescription, 74) : [];
        const lineGap = 4.6;

        write(itemLines, margin + 2, y, { size: 9 });
        if (descriptionLines.length) {
          write(descriptionLines, margin + 6, y + (itemLines.length * lineGap) + 0.2, { size: 8, color: [71, 85, 105] });
        }
        write(row.hsnSac || '', 94, y, { size: 9 });
        write(qty, 116, y, { size: 9, align: 'right' });
        write(formatPdfCurrency(rate), 144, y, { size: 9, align: 'right' });
        write(formatPdfCurrency(rowTax), 169, y, { size: 9, align: 'right' });
        if (taxPercent > 0) {
          write(`${taxPercent}%`, 169, y + lineGap, { size: 8, align: 'right' });
        }
        write(formatPdfCurrency(amount), rightX - 2, y, { size: 9, align: 'right' });
        y += Math.max((itemLines.length * lineGap) + (descriptionLines.length * lineGap) + 2.8, 11);
      });

      pdf.setDrawColor(203, 213, 225);
      pdf.line(margin, y + 1, rightX, y + 1);
      y += 10;

      const totalsBoxX = 126;
      const totalsBoxY = y - 4;
      const totalsBoxW = rightX - totalsBoxX;
      const totalsBoxH = taxType === 'INTRA_STATE' ? 28 : 23;
      write('Sub Total', totalsBoxX + 4, totalsBoxY + 7, { size: 9 });
      write(formatPdfCurrency(subtotal), rightX - 2, totalsBoxY + 7, { size: 9, align: 'right' });
      if (taxType === 'INTRA_STATE') {
        write(`CGST (${(gstPercent / 2).toFixed(2)}%)`, totalsBoxX + 4, totalsBoxY + 13, { size: 9 });
        write(formatPdfCurrency(cgstAmount), rightX - 2, totalsBoxY + 13, { size: 9, align: 'right' });
        write(`SGST (${(gstPercent / 2).toFixed(2)}%)`, totalsBoxX + 4, totalsBoxY + 18, { size: 9 });
        write(formatPdfCurrency(sgstAmount), rightX - 2, totalsBoxY + 18, { size: 9, align: 'right' });
      } else {
        write(`IGST (${gstPercent.toFixed(2)}%)`, totalsBoxX + 4, totalsBoxY + 13, { size: 9 });
        write(formatPdfCurrency(igstAmount), rightX - 2, totalsBoxY + 13, { size: 9, align: 'right' });
      }
      const totalRowY = taxType === 'INTRA_STATE' ? totalsBoxY + 21 : totalsBoxY + 16;
      pdf.setFillColor(243, 244, 246);
      pdf.rect(totalsBoxX + 1, totalRowY, totalsBoxW - 2, 7, 'F');
      pdf.setDrawColor(203, 213, 225);
      pdf.line(totalsBoxX + 1, totalRowY, rightX - 1, totalRowY);
      write('Total', totalsBoxX + 4, totalRowY + 5, { size: 10, bold: true });
      write(formatPdfCurrency(total), rightX - 2, totalRowY + 5, { size: 10, bold: true, align: 'right' });

      const leftInfoMaxWidth = totalsBoxX - margin - 8;
      let leftInfoY = totalsBoxY + 3;
      write(`Po No. ${workOrder?.woNumber || '-'} Dated: ${workOrder?.woDate || '-'}`, margin, leftInfoY, { size: 9 });
      leftInfoY += 8;
      if (invoice?.customerNotes) {
        write('Customer Notes', margin, leftInfoY, { size: 10, bold: true });
        leftInfoY += 5;
        const customerNoteLines = pdf.splitTextToSize(invoice.customerNotes, leftInfoMaxWidth);
        write(customerNoteLines, margin, leftInfoY, { size: 9 });
        leftInfoY += customerNoteLines.length * 4.2 + 3;
      }

      y = Math.max(totalsBoxY + totalsBoxH + 8, leftInfoY + 4);
      write('Terms & Conditions', margin, y, { size: 11, bold: true });
      y += 5;
      const termsLines = pdf.splitTextToSize(invoice?.termsAndConditions || '', pageWidth - margin * 2);
      write(termsLines, margin, y, { size: 9 });
      y += termsLines.length * 4.2 + 8;
      write('Authorized Signatory', margin, y, { size: 12 });
      pdf.line(margin + 44, y - 1.5, margin + 108, y - 1.5);

      pdf.save(`${invoiceNo || 'invoice'}.pdf`);
    } catch (downloadError) {
      showToast(normalizeApiError(downloadError, 'Failed to generate PDF'), 'error');
    }
  };

  const downloadReceiptPdf = async (receipt) => {
    const currency = workOrder?.currency || 'INR';
    const resolvedTenantProfile = tenantProfile || TENANT_INVOICE_PROFILE;
    const sellerName = resolvedTenantProfile.legalName || resolvedTenantProfile.name || 'Tenant';
    const sellerLine1 = resolvedTenantProfile.billingStreet || '';
    const sellerLine2 = [resolvedTenantProfile.billingCity, resolvedTenantProfile.billingState, resolvedTenantProfile.billingZip].filter(Boolean).join(', ');
    const sellerLine3 = resolvedTenantProfile.billingCountry || '';
    const sellerTaxId = resolvedTenantProfile.taxId || '';
    const hasCustomTenantLogo = Boolean(resolvedTenantProfile.logoUrl);
    const sellerLogo = hasCustomTenantLogo
      ? resolveAssetUrl(resolvedTenantProfile.logoUrl)
      : resolveFrontendPublicUrl('/inv_logo.png');
    const formatPdfCurrency = (value) => formatCurrency(value, currency, 2, 2);
    const formatNumber = (value) =>
      new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
        Number(value || 0)
      );

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 16;
      const rightX = pageWidth - margin;

      const loadImageForPdf = async (src) => {
        let response;
        try {
          response = await fetch(src, { credentials: 'include', cache: 'no-store' });
        } catch {
          response = await fetch(src, { cache: 'no-store' });
        }
        if (!response.ok) throw new Error(`Failed to fetch image: ${src} (${response.status})`);
        const blob = await response.blob();
        if (!blob || !blob.size) throw new Error(`Empty image blob: ${src}`);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Failed to initialize canvas for logo');
        const objectUrl = URL.createObjectURL(blob);
        try {
          const image = await new Promise((resolve, reject) => {
            const img = new Image();
            img.decoding = 'async';
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = objectUrl;
          });
          canvas.width = Math.max(1, image.naturalWidth || 300);
          canvas.height = Math.max(1, image.naturalHeight || 120);
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(image, 0, 0);
          return { dataUrl: canvas.toDataURL('image/png'), format: 'PNG', width: canvas.width, height: canvas.height };
        } finally {
          URL.revokeObjectURL(objectUrl);
        }
      };

      const write = (text, x, y, opts = {}) => {
        const { size = 10, bold = false, align = 'left', color = [17, 24, 39] } = opts;
        pdf.setFont('helvetica', bold ? 'bold' : 'normal');
        pdf.setFontSize(size);
        pdf.setTextColor(color[0], color[1], color[2]);
        pdf.text(String(text ?? ''), x, y, { align });
      };

      let y = 18;
      try {
        const logoAsset = await loadImageForPdf(sellerLogo);
        const boxW = 32;
        const boxH = 12;
        const srcW = Math.max(1, Number(logoAsset.width || boxW));
        const srcH = Math.max(1, Number(logoAsset.height || boxH));
        const scale = Math.min(boxW / srcW, boxH / srcH);
        const drawW = srcW * scale;
        const drawH = srcH * scale;
        pdf.addImage(logoAsset.dataUrl, logoAsset.format, margin, y + ((boxH - drawH) / 2), drawW, drawH);
      } catch (logoError) {
        if (!hasCustomTenantLogo) {
          try {
            const fallbackAsset = await loadImageForPdf(resolveFrontendPublicUrl('/inv_logo.png'));
            pdf.addImage(fallbackAsset.dataUrl, fallbackAsset.format, margin, y, 30, 10);
          } catch {
            console.error('Receipt logo render failed:', logoError);
          }
        } else {
          console.error('Receipt tenant logo render failed:', logoError);
        }
      }

      const headerLeft = margin + 58;
      write(sellerName, headerLeft, y + 3, { size: 11, bold: true });
      let sellerY = y + 10;
      if (sellerLine1) { write(sellerLine1, headerLeft, sellerY, { size: 8, color: [107, 114, 128] }); sellerY += 4; }
      if (sellerLine2) { write(sellerLine2, headerLeft, sellerY, { size: 8, color: [107, 114, 128] }); sellerY += 4; }
      if (sellerLine3) { write(sellerLine3, headerLeft, sellerY, { size: 8, color: [107, 114, 128] }); sellerY += 4; }
      if (sellerTaxId) { write(`GSTIN ${sellerTaxId}`, headerLeft, sellerY, { size: 8, color: [107, 114, 128] }); }

      y = 50;
      pdf.setDrawColor(229, 231, 235);
      pdf.line(margin, y, rightX, y);
      y += 13;

      write('PAYMENT RECEIPT', pageWidth / 2, y, { size: 11, bold: true, align: 'center' });
      y += 16;

      const labelX = margin;
      const valueX = margin + 43;
      const ruleEndX = margin + 122;
      const rightBoxX = pageWidth - margin - 46;
      const rightBoxY = y - 2;
      const rightBoxW = 46;
      const rightBoxH = 27;

      const drawMetaRow = (label, value, rowY) => {
        write(label, labelX, rowY, { size: 8.5, color: [75, 85, 99] });
        write(value || '', valueX, rowY, { size: 9, bold: true });
        pdf.setDrawColor(229, 231, 235);
        pdf.line(valueX, rowY + 1.8, ruleEndX, rowY + 1.8);
      };

      drawMetaRow('Payment Date', receipt?.receiptDate || '-', y + 4);
      drawMetaRow('Reference Number', receipt?.invoiceNo || '-', y + 13);
      drawMetaRow('Payment Mode', receipt?.paymentMode || '-', y + 22);

      pdf.setFillColor(125, 175, 78);
      pdf.rect(rightBoxX, rightBoxY, rightBoxW, rightBoxH, 'F');
      write('Amount Received', rightBoxX + (rightBoxW / 2), rightBoxY + 12, { size: 8.5, align: 'center', color: [255, 255, 255] });
      write(formatNumber(receipt?.amountReceived || 0), rightBoxX + (rightBoxW / 2), rightBoxY + 19, { size: 12, align: 'center', color: [255, 255, 255] });

      y += 45;

      write('Received From', margin, y, { size: 9, bold: true, color: [75, 85, 99] });
      y += 9;
      const clientName = workOrder?.customerName || workOrder?.client?.name || '-';
      write(String(clientName).toUpperCase(), margin, y, { size: 10, bold: true });
      y += 6;

      const clientAddress = [
        workOrder?.client?.billingStreet,
        workOrder?.client?.billingAddress,
        workOrder?.billingAddress,
        [workOrder?.client?.billingCity || workOrder?.billingCity, workOrder?.client?.billingState || workOrder?.billingState, workOrder?.client?.billingZip || workOrder?.billingZip].filter(Boolean).join(', '),
        workOrder?.client?.billingCountry || workOrder?.billingCountry,
      ].filter(Boolean).join('\n');
      if (clientAddress) {
        const addrLines = pdf.splitTextToSize(clientAddress, pageWidth - (margin * 2));
        write(addrLines, margin, y, { size: 8.5, color: [55, 65, 81] });
        y += (addrLines.length * 4.2) + 2;
      }

      y = Math.max(y + 18, 178);
      pdf.setDrawColor(229, 231, 235);
      pdf.line(margin, y, rightX, y);
      y += 16;

      write('Payment for', margin, y, { size: 12, bold: true });
      y += 6;

      const tableX = margin;
      const tableW = pageWidth - margin * 2;
      const headerH = 10;
      const rowH = 9;
      const colWidths = [32, 32, 36, 30, tableW - 130];
      const colLabels = ['Invoice Number', 'Invoice Date', 'Invoice Amount', 'Withholding Tax', 'Payment Amount'];
      const values = [
        receipt?.invoiceNo || '-',
        receipt?.receiptDate || '-',
        formatNumber((Number(receipt?.amountReceived || 0) + Number(receipt?.withholding || 0))),
        formatNumber(receipt?.withholding || 0),
        formatNumber(receipt?.amountReceived || 0),
      ];

      let currentX = tableX;
      pdf.setFillColor(243, 244, 246);
      pdf.rect(tableX, y, tableW, headerH, 'F');
      pdf.setDrawColor(229, 231, 235);
      pdf.rect(tableX, y, tableW, headerH + rowH);

      colLabels.forEach((label, index) => {
        write(label, currentX + 2.5, y + 6.5, { size: 8.2, bold: true, color: [55, 65, 81] });
        currentX += colWidths[index];
        if (index < colLabels.length - 1) pdf.line(currentX, y, currentX, y + headerH + rowH);
      });
      pdf.line(tableX, y + headerH, tableX + tableW, y + headerH);

      currentX = tableX;
      values.forEach((value, index) => {
        const isNumeric = index >= 2;
        write(value, isNumeric ? currentX + colWidths[index] - 2.5 : currentX + 2.5, y + headerH + 6, {
          size: 8.5,
          align: isNumeric ? 'right' : 'left',
          color: [17, 24, 39],
        });
        currentX += colWidths[index];
      });

      write('1', rightX - 2, pageHeight - 6, { size: 8, align: 'right', color: [107, 114, 128] });

      const fileName = `receipt_${receipt?.invoiceNo || 'payment'}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      showToast(normalizeApiError(error, 'Failed to generate receipt PDF'), 'error');
    }
  };

  const saveReceipt = async (savedReceipt) => {
    await callApi(savedReceipt.id ? financeOpsApi.updateReceipt : financeOpsApi.createReceipt, id, ...(savedReceipt.id ? [savedReceipt.id] : []), {
      invoiceId: invoiceForReceipt?.invoiceId || savedReceipt.invoiceId || undefined,
      invoiceNo: savedReceipt.invoiceNo,
      receiptDate: savedReceipt.receiptDate,
      amountReceived: Number(savedReceipt.amountReceived),
      tds: Number(savedReceipt.tds || 0),
      chargesAndLevies: Number(savedReceipt.chargesAndLevies || 0),
      withholding: Number(savedReceipt.withholding || 0),
      paymentMode: savedReceipt.paymentMode,
      details: savedReceipt.details || '',
    });
    showToast(savedReceipt.id ? 'Receipt updated successfully' : 'Receipt saved successfully');
    setReceiptToEdit(null);
    setInvoiceForReceipt(null);
    fetchInvoices();
    fetchReceipts();
  };

  const openDeleteDialog = (type, item) => {
    setDeleteState({ type, item, submitting: false });
  };

  const handleConfirmDelete = async () => {
    if (!deleteState.item) return;
    try {
      setDeleteState((prev) => ({ ...prev, submitting: true }));

      if (deleteState.type === 'item') {
        await callApi(financeOpsApi.deleteItem, id, deleteState.item.id);
        fetchItems();
      }
      if (deleteState.type === 'schedule') {
        await callApi(financeOpsApi.deleteSchedule, id, deleteState.item.id);
        fetchSchedules();
      }
      if (deleteState.type === 'invoice') {
        await callApi(financeOpsApi.deleteInvoice, id, deleteState.item.id);
        fetchInvoices();
        fetchReceipts();
      }
      if (deleteState.type === 'receipt') {
        await callApi(financeOpsApi.deleteReceipt, id, deleteState.item.id);
        fetchReceipts();
        fetchInvoices();
      }

      setDeleteState({ type: '', item: null, submitting: false });
      showToast('Record deleted successfully');
    } catch (error) {
      setDeleteState((prev) => ({ ...prev, submitting: false }));
      showToast(normalizeApiError(error, 'Delete failed'), 'error');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500 pb-20">
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading work order...
          </div>
        </div>
      </div>
    );
  }

  if (pageError || !workOrder) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500 pb-20">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-12 text-center text-rose-600 shadow-sm dark:border-rose-900/40 dark:bg-rose-500/10 dark:text-rose-300">
          {pageError || 'Work order not found'}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 animate-in fade-in duration-500 pb-20">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              if (location.state?.from === 'invoices') {
                navigate('/invoices');
              } else if (location.state?.from === 'orders') {
                navigate('/orders');
              } else if (location.state?.from === 'invoices') {
                navigate('/invoices');
              } else if (location.state?.from === 'receipts') {
                navigate('/receipts');
              } else {
                navigate(`/clients/${workOrder.clientId}/details`);
              }
            }}
            className="p-2.5 border border-slate-200 dark:border-neutral-800 bg-transparent rounded-xl hover:bg-slate-50 dark:hover:bg-neutral-800 transition-colors text-slate-500 dark:text-neutral-400"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 text-[15px] font-medium text-slate-500 dark:text-neutral-400">
              <span className="cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors" onClick={() => navigate('/clients')}>Clients</span>
              <span>/</span>
              <span className="cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors" onClick={() => navigate(`/clients/${workOrder.clientId}/details`)}>{workOrder.customerName}</span>
              <span>/</span>
              <span className="text-slate-900 dark:text-white font-semibold">Orders</span>
              <span>/</span>
              <span className="text-slate-900 dark:text-white font-semibold">{workOrder.woNumber}</span>
            </div>
            <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{workOrder.project}</h1>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-slate-200 dark:border-neutral-800 shadow-sm overflow-visible">
          <div className="px-6 py-5 border-b border-slate-200 dark:border-neutral-800">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4 text-sm">
              <div>
                <div className="text-slate-500 dark:text-neutral-400">Work Order No</div>
                <div className="mt-1 font-semibold text-slate-900 dark:text-white">{workOrder.woNumber}</div>
              </div>
              <div>
                <div className="text-slate-500 dark:text-neutral-400">Order Value</div>
                <div className="mt-1 font-semibold text-slate-900 dark:text-white">{formatCurrency(workOrder.woValue, workOrder.currency)}</div>
              </div>
              <div>
                <div className="text-slate-500 dark:text-neutral-400">Order Date</div>
                <div className="mt-1 font-semibold text-slate-900 dark:text-white">{workOrder.woDate}</div>
              </div>
              <div>
                <div className="text-slate-500 dark:text-neutral-400">Period</div>
                <div className="mt-1 font-semibold text-slate-900 dark:text-white">{workOrder.woPeriod || 'N/A'}</div>
              </div>
            </div>
          </div>

          <div className="border-b border-slate-200 dark:border-neutral-800 px-6">
            <div className="flex items-center gap-1 overflow-x-auto">
              {can('read:finance-ops.clients.work-orders.items') ? <TabItem icon={Package} label="Items" isActive={activeTab === 'items'} onClick={() => setActiveTab('items')} /> : null}
              {can('read:finance-ops.clients.work-orders.schedules') ? <TabItem icon={Calendar} label="Schedule" isActive={activeTab === 'schedule'} onClick={() => setActiveTab('schedule')} /> : null}
              {can('read:finance-ops.clients.work-orders.invoices') ? <TabItem icon={FileText} label="Invoice" isActive={activeTab === 'invoice'} onClick={() => setActiveTab('invoice')} /> : null}
              {can('read:finance-ops.clients.work-orders.receipts') ? <TabItem icon={Receipt} label="Receipt" isActive={activeTab === 'receipt'} onClick={() => setActiveTab('receipt')} /> : null}
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'items' && (
              <TableCard
                title="Order Items"
                action={(
                  <div className="flex items-center gap-2">
                    {canWriteSchedules && selectedItemIds.length > 0 ? (
                      <button
                        onClick={autoGenerateSchedules}
                        disabled={isAutoGeneratingSchedules}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-500/20 text-sm font-medium rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isAutoGeneratingSchedules ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        Auto Generate Schedule
                      </button>
                    ) : null}
                    {canWriteItems ? <button
                      onClick={() => {
                        setItemToEdit(null);
                        setIsAddItemDrawerOpen(true);
                      }}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-sm font-medium rounded-lg transition-colors"
                    >
                      <Plus className="w-4 h-4" /> Add Item
                    </button> : null}
                  </div>
                )}
                headers={[
                  {
                    key: 'select',
                    label: (
                      <label className="relative inline-flex items-center justify-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={orderItems.length > 0 && orderItems.every((item) => selectedItemIds.includes(item.id))}
                          onChange={toggleSelectAllItems}
                          className="peer sr-only"
                        />
                        <div className="w-4 h-4 rounded border border-slate-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 peer-checked:bg-blue-600 dark:peer-checked:bg-blue-500/20 peer-checked:border-blue-600 dark:peer-checked:border-blue-500 transition-all shadow-sm"></div>
                        <Check className="w-3 h-3 text-white dark:text-blue-500 absolute opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" strokeWidth={3} />
                      </label>
                    ),
                    className: 'w-[56px]',
                  },
                  { key: 'itemDetails', label: 'Item Details', sortable: true },
                  { key: 'itemType', label: 'Item Type', sortable: true },
                  { key: 'itemAmount', label: 'Item Amount', className: 'w-[220px] text-right', sortable: true },
                  { key: 'billingFrequency', label: 'Billing Frequency', className: 'w-[220px]', sortable: true },
                  { key: 'action', label: 'Action', className: 'w-[120px] text-right' },
                ]}
                footer={renderTableFooter(itemsPageState, setItemsPageState)}
                sortConfig={{ key: itemsPageState.sortKey, direction: itemsPageState.sortDirection }}
                onSort={(key) => handleSortChange(itemsPageState, setItemsPageState, key)}
              >
                {tabLoading.items ? (
                  <tr><td colSpan="6" className="p-12 text-center text-slate-500"><div className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Loading items...</div></td></tr>
                ) : orderItems.length ? orderItems.map((item, index) => (
                  <tr
                    key={item.id}
                    className={cn(
                      'group hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition-colors',
                      selectedItemIds.includes(item.id) ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                    )}
                  >
                    <td className="w-[56px] px-6 py-4">
                      <label
                        className={cn(
                          'relative inline-flex items-center justify-center cursor-pointer transition-opacity',
                          selectedItemIds.includes(item.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={selectedItemIds.includes(item.id)}
                          onChange={() => toggleItemSelection(item.id)}
                          className="peer sr-only"
                        />
                        <div className="w-4 h-4 rounded border border-slate-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 peer-checked:bg-blue-600 dark:peer-checked:bg-blue-500/20 peer-checked:border-blue-600 dark:peer-checked:border-blue-500 transition-all shadow-sm"></div>
                        <Check className="w-3 h-3 text-white dark:text-blue-500 absolute opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" strokeWidth={3} />
                      </label>
                    </td>
                    <td className="px-6 py-4 text-slate-900 dark:text-white font-medium">{item.itemDetails}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-neutral-300">{item.itemType}</td>
                    <td className="w-[220px] px-6 py-4 text-right text-slate-900 dark:text-white font-medium">{formatCurrency(item.itemAmount, workOrder.currency)}</td>
                    <td className="w-[220px] px-6 py-4 text-slate-500 dark:text-neutral-400">{item.billingFrequency}</td>
                    <td className="w-[120px] px-6 py-4 text-right relative">
                      <ActionMenu
                        openDownward={index === 0}
                        canWrite={canWriteItems}
                        onPermissionError={handlePermissionError}
                        onEdit={() => {
                          setItemToEdit(item);
                          setIsAddItemDrawerOpen(true);
                        }}
                        onDelete={() => openDeleteDialog('item', item)}
                      />
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan="6" className="p-12 text-center text-slate-500 dark:text-neutral-400">No items added yet.</td></tr>
                )}
              </TableCard>
            )}

            {activeTab === 'schedule' && (
              <TableCard
                title="Billing Schedule"
                action={(
                  canWriteSchedules ? <button
                    onClick={() => {
                      setScheduleItemToEdit(null);
                      fetchScheduleItemOptions();
                      setIsScheduleDrawerOpen(true);
                    }}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-sm font-medium rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Add Schedule Item
                  </button> : null
                )}
                headers={[
                  { key: 'itemDetails', label: 'Item Details', sortable: true },
                  { key: 'amount', label: 'Amount', className: 'text-right', sortable: true },
                  { key: 'scheduleDate', label: 'Schedule Date', sortable: true },
                  { key: 'action', label: 'Action', className: 'text-right' },
                ]}
                footer={renderTableFooter(schedulePageState, setSchedulePageState)}
                sortConfig={{ key: schedulePageState.sortKey, direction: schedulePageState.sortDirection }}
                onSort={(key) => handleSortChange(schedulePageState, setSchedulePageState, key)}
              >
                {tabLoading.schedule ? (
                  <tr><td colSpan="4" className="p-12 text-center text-slate-500"><div className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Loading schedules...</div></td></tr>
                ) : scheduleRecords.length ? scheduleRecords.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition-colors">
                    <td className="px-6 py-4 text-slate-900 dark:text-white font-medium">
                      <div className="space-y-1">
                        <div>{item.itemDetails}</div>
                        <div className="text-xs text-slate-500 dark:text-neutral-400">{item.installmentLabel || 'Manual entry'}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-slate-900 dark:text-white font-medium">{formatCurrency(item.amount, workOrder.currency)}</td>
                    <td className="px-6 py-4 text-slate-500 dark:text-neutral-400">{item.scheduleDate}</td>
                    <td className="px-6 py-4 text-right relative">
                      <ActionMenu
                        openDownward={index === 0}
                        canWrite={canWriteSchedules}
                        onPermissionError={handlePermissionError}
                        onEdit={() => {
                          setScheduleItemToEdit(item);
                          fetchScheduleItemOptions();
                          setIsScheduleDrawerOpen(true);
                        }}
                        onDelete={() => openDeleteDialog('schedule', item)}
                      />
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan="4" className="p-12 text-center text-slate-500 dark:text-neutral-400">No schedule items added yet.</td></tr>
                )}
              </TableCard>
            )}

            {activeTab === 'invoice' && (
              <TableCard
                title="Linked Invoices"
                action={(
                  <div className="flex items-center gap-3">
                    {canWriteInvoices ? <button
                      onClick={() => {
                        if (!hasOrderItems) return;
                        setInvoiceToEdit(null);
                        setIsInvoiceDrawerOpen(true);
                      }}
                      disabled={!hasOrderItems}
                      title={!hasOrderItems ? 'Add at least one item in this work order to record invoice.' : undefined}
                      className={cn(
                        'inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
                        hasOrderItems
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20'
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-neutral-800 dark:text-neutral-500'
                      )}
                    >
                      <Plus className="w-4 h-4" /> Record Invoice
                    </button> : null}
                    {canWriteInvoices ? <button
                      onClick={openCreateInvoiceModal}
                      disabled={!hasOrderItems}
                      title={!hasOrderItems ? 'Add at least one item in this work order to create invoice.' : undefined}
                      className={cn(
                        'inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
                        hasOrderItems
                          ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20'
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-neutral-800 dark:text-neutral-500'
                      )}
                    >
                      <FileSpreadsheet className="w-4 h-4" /> Create Invoice
                    </button> : null}
                  </div>
                )}
                headers={[
                  { key: 'itemDetails', label: 'Item Details', sortable: true },
                  { key: 'invoiceNo', label: 'Invoice No', sortable: true },
                  { key: 'invoiceDate', label: 'Invoice Date', sortable: true },
                  { key: 'amount', label: 'Amount', className: 'text-right', sortable: true },
                  { key: 'tax', label: 'Tax', className: 'text-right', sortable: true },
                  { key: 'totalAmount', label: 'Total Amount', className: 'text-right', sortable: true },
                  { key: 'waiveOff', label: 'Waive Off', sortable: true },
                  { key: 'receipt', label: 'Receipt' },
                  { key: 'action', label: 'Action', className: 'text-right' },
                ]}
                footer={renderTableFooter(invoicePageState, setInvoicePageState)}
                sortConfig={{ key: invoicePageState.sortKey, direction: invoicePageState.sortDirection }}
                onSort={(key) => handleSortChange(invoicePageState, setInvoicePageState, key)}
              >
                {tabLoading.invoice ? (
                  <tr><td colSpan="9" className="p-12 text-center text-slate-500"><div className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Loading invoices...</div></td></tr>
                ) : invoiceRecords.length ? invoiceRecords.map((invoice, index) => (
                  <tr key={invoice.id} className="hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition-colors">
                    <td className="px-6 py-4 text-slate-600 dark:text-neutral-300 font-medium">{invoice.itemDetails}</td>
                    <td className="px-6 py-4 text-slate-900 dark:text-white font-medium">
                      <div className="space-y-1">
                        <div>{invoice.invoiceNo}</div>
                        {invoice.createdFromInvoiceBuilder && !invoice.savedAndDownloaded ? (
                          <span className="inline-flex rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:border-amber-900/40 dark:bg-amber-500/10 dark:text-amber-300">
                            Draft - Create Invoice
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-neutral-400">{formatDate(invoice.invoiceDate)}</td>
                    <td className="px-6 py-4 text-right text-slate-900 dark:text-white font-medium">{formatCurrency(invoice.amount, workOrder.currency)}</td>
                    <td className="px-6 py-4 text-right text-slate-500 dark:text-neutral-400">{formatCurrency(invoice.tax, workOrder.currency)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="font-medium text-slate-900 dark:text-white">
                        {formatCurrency(invoice.totalAmount, workOrder.currency)}
                      </div>
                      {String(workOrder?.currency || 'INR').toUpperCase() !== 'INR' ? (
                        <div className="mt-0.5 text-xs text-slate-500 dark:text-neutral-400">
                          {formatCurrency(
                            invoice.inrTotalAmount ?? ((Number(invoice.totalAmount) || 0) * (Number(invoice.conversionRate) || 1)),
                            'INR',
                          )}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-neutral-400">{invoice.waiveOff ? 'Yes' : 'No'}</td>
                    <td className="px-6 py-4">
                      {(() => {
                        const isCreateInvoiceDraft = invoice.createdFromInvoiceBuilder && !invoice.savedAndDownloaded;
                        return (
                          <button
                            onClick={() => {
                              if (isCreateInvoiceDraft) {
                                showToast('This is a Create Invoice draft. Complete it in Create Invoice before recording receipt.', 'error');
                                return;
                              }
                              setReceiptToEdit(invoice.receipt || receiptRecords.find((receipt) => receipt.invoiceId === invoice.invoiceId) || null);
                              setInvoiceForReceipt(invoice);
                              setIsReceiptDrawerOpen(true);
                            }}
                            title={isCreateInvoiceDraft ? 'Draft invoice: receipt can be added after final Save and Download' : undefined}
                            className={cn('inline-flex items-center rounded-md border px-3 py-1.5 text-xs font-medium transition-colors', getReceiptButtonClasses(invoice.status))}
                          >
                            {invoice.status}
                          </button>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 text-right relative z-[210]">
                      <ActionMenu
                        openDownward={true}
                        showDownload={Boolean(invoice.savedAndDownloaded)}
                        showEdit={!invoice.receiptId && !invoice.receipt}
                        canWrite={canWriteInvoices}
                        onPermissionError={handlePermissionError}
                        onDownload={() => downloadCreatedInvoice(invoice)}
                        editLabel={invoice.createdFromInvoiceBuilder ? 'Edit in Create Invoice' : 'Edit'}
                        onEdit={() => {
                          if (invoice.createdFromInvoiceBuilder) {
                            openCreateInvoiceModal(invoice);
                            return;
                          }
                          setInvoiceToEdit(invoice);
                          setIsInvoiceDrawerOpen(true);
                        }}
                        onDelete={() => openDeleteDialog('invoice', invoice)}
                      />
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan="9" className="p-12 text-center text-slate-500 dark:text-neutral-400">No invoices generated yet.</td></tr>
                )}
              </TableCard>
            )}

            {activeTab === 'receipt' && (
              <TableCard
                title="Payment Receipts"
                headers={[
                  { key: 'invoiceNo', label: 'Invoice No', sortable: true },
                  { key: 'receiptDate', label: 'Receipt Date', sortable: true },
                  { key: 'amountReceived', label: 'Amount Received', className: 'text-right', sortable: true },
                  { key: 'tds', label: 'TDS', className: 'text-right', sortable: true },
                  { key: 'chargesAndLevies', label: 'Charges & Levies', className: 'text-right', sortable: true },
                  { key: 'withholding', label: 'Withholding', className: 'text-right', sortable: true },
                  { key: 'paymentMode', label: 'Payment Mode', sortable: true },
                  { key: 'action', label: 'Action', className: 'text-right' },
                ]}
                footer={renderTableFooter(receiptPageState, setReceiptPageState)}
                sortConfig={{ key: receiptPageState.sortKey, direction: receiptPageState.sortDirection }}
                onSort={(key) => handleSortChange(receiptPageState, setReceiptPageState, key)}
              >
                {tabLoading.receipt ? (
                  <tr><td colSpan="8" className="p-12 text-center text-slate-500"><div className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Loading receipts...</div></td></tr>
                ) : receiptRecords.length ? receiptRecords.map((receipt, index) => (
                  <tr key={receipt.id} className="hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition-colors">
                    <td className="px-6 py-4 text-slate-900 dark:text-white font-medium">{receipt.invoiceNo}</td>
                    <td className="px-6 py-4 text-slate-500 dark:text-neutral-400">{formatDate(receipt.receiptDate)}</td>
                    <td className="px-6 py-4 text-right text-slate-900 dark:text-white font-medium">{formatCurrency(receipt.amountReceived, workOrder.currency)}</td>
                    <td className="px-6 py-4 text-right text-slate-500 dark:text-neutral-400">{formatCurrency(receipt.tds, workOrder.currency)}</td>
                    <td className="px-6 py-4 text-right text-slate-500 dark:text-neutral-400">{formatCurrency(receipt.chargesAndLevies, workOrder.currency)}</td>
                    <td className="px-6 py-4 text-right text-slate-500 dark:text-neutral-400">{formatCurrency(receipt.withholding, workOrder.currency)}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-neutral-300">{receipt.paymentMode}</td>
                    <td className="px-6 py-4 text-right relative">
                      <ActionMenu
                        openDownward={index === 0}
                        showDownload
                        canWrite={canWriteReceipts}
                        onPermissionError={handlePermissionError}
                        onDownload={() => downloadReceiptPdf(receipt)}
                        onEdit={() => {
                          setReceiptToEdit(receipt);
                          setInvoiceForReceipt(invoiceRecords.find((invoice) => invoice.invoiceId === receipt.invoiceId) || null);
                          setIsReceiptDrawerOpen(true);
                        }}
                        onDelete={() => openDeleteDialog('receipt', receipt)}
                      />
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan="8" className="p-12 text-center text-slate-500 dark:text-neutral-400">No receipts recorded yet.</td></tr>
                )}
              </TableCard>
            )}
          </div>
        </div>
      </div>

      <AddOrderItemDrawer
        isOpen={isAddItemDrawerOpen}
        item={itemToEdit}
        currency={workOrder?.currency}
        orderValue={workOrder?.woValue}
        orderItems={orderItems}
        onClose={() => {
          setIsAddItemDrawerOpen(false);
          setItemToEdit(null);
        }}
        onSave={saveItem}
      />
      <AddScheduleItemDrawer
        isOpen={isScheduleDrawerOpen}
        scheduleItem={scheduleItemToEdit}
        itemOptions={scheduleItemOptions}
        orderItems={orderItems}
        scheduleRecords={scheduleRecords}
        currency={workOrder?.currency}
        onClose={() => {
          setIsScheduleDrawerOpen(false);
          setScheduleItemToEdit(null);
        }}
        onSave={saveSchedule}
      />
      <AddInvoiceDrawer
        isOpen={isInvoiceDrawerOpen}
        invoice={invoiceToEdit}
        itemOptions={invoiceItemOptions}
        tenantProfile={tenantProfile}
        currency={workOrder?.currency}
        onClose={() => {
          setIsInvoiceDrawerOpen(false);
          setInvoiceToEdit(null);
        }}
        onSave={saveInvoice}
        onDownloadInvoice={downloadCreatedInvoice}
        invoiceTrackingByScheduleId={invoiceTrackingByScheduleId}
      />
      <AddInvoiceDrawer
        isOpen={isCreateInvoiceModalOpen}
        mode="modal"
        invoice={createInvoiceToEdit}
        itemOptions={invoiceItemOptions}
        orderItems={orderItems}
        scheduleRecords={scheduleRecords}
        workOrder={workOrder}
        tenantProfile={tenantProfile}
        invoiceOptions={invoiceOptions}
        currency={workOrder?.currency}
        onClose={() => {
          setIsCreateInvoiceModalOpen(false);
          setCreateInvoiceToEdit(null);
        }}
        onSave={saveInvoice}
        onDownloadInvoice={downloadCreatedInvoice}
        invoiceTrackingByScheduleId={invoiceTrackingByScheduleId}
      />
      <EditReceiptDrawer
        isOpen={isReceiptDrawerOpen}
        receipt={receiptToEdit}
        invoice={invoiceForReceipt}
        currency={workOrder?.currency}
        onClose={() => {
          setIsReceiptDrawerOpen(false);
          setReceiptToEdit(null);
          setInvoiceForReceipt(null);
        }}
        onSave={saveReceipt}
      />
      <ConfirmDialog
        open={Boolean(deleteState.item)}
        title={`Delete ${deleteState.type === 'item' ? 'Item' : deleteState.type === 'schedule' ? 'Schedule Item' : deleteState.type === 'invoice' ? 'Invoice' : 'Receipt'}`}
        message={
          deleteState.item
            ? `Delete ${deleteState.type === 'invoice' ? deleteState.item.invoiceNo : deleteState.type === 'receipt' ? deleteState.item.invoiceNo : deleteState.item.itemDetails}? This action cannot be undone.`
            : ''
        }
        confirmLabel={`Delete ${deleteState.type === 'item' ? 'Item' : deleteState.type === 'schedule' ? 'Schedule' : deleteState.type === 'invoice' ? 'Invoice' : 'Receipt'}`}
        busy={deleteState.submitting}
        onCancel={() => setDeleteState({ type: '', item: null, submitting: false })}
        onConfirm={handleConfirmDelete}
      />
      <FeedbackToast toast={toast} />
    </>
  );
};
