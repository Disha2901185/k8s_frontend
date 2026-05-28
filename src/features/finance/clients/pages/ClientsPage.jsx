import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  MoreHorizontal,
  Building,
  ChevronLeft,
  ChevronRight,
  Trash2,
  X,
  User,
  Loader2,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { financeOpsApi } from '@/lib/api';
import { callApi } from '@/lib/apiService';
import { extractListPayload, normalizeApiError } from '@/features/finance/financeApiHelpers';

const ConfirmDialog = ({ open, title, message, confirmLabel, busy, onCancel, onConfirm }) => {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 px-4 backdrop-blur-sm">
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

const RowActionMenu = ({ onEdit, onDelete }) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!isOpen) return undefined;
    const close = () => setIsOpen(false);

    const onPointerDown = (event) => {
      if (
        triggerRef.current?.contains(event.target) ||
        menuRef.current?.contains(event.target)
      ) {
        return;
      }
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
    const menuHeight = 92;
    const gap = 8;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < menuHeight + gap && rect.top > menuHeight + gap;
    setPosition({
      top: openUpward ? rect.top - menuHeight - gap : rect.bottom + gap,
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
          <button
            onClick={() => {
              setIsOpen(false);
              onEdit?.();
            }}
            className="w-full px-4 py-2.5 text-left text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Edit
          </button>
          <button
            onClick={() => {
              setIsOpen(false);
              onDelete?.();
            }}
            className="w-full px-4 py-2.5 text-left text-xs font-medium text-rose-600 transition-colors hover:bg-rose-50 dark:hover:bg-rose-900/20"
          >
            Delete
          </button>
        </div>,
        document.body
      )}
    </>
  );
};

const EditClientDrawer = ({ isOpen, onClose, client, onSave }) => {
  const MotionDiv = motion.div;
  const [formData, setFormData] = useState({
    customerName: '',
    contactPerson: '',
    phone: '',
    email: '',
    gst: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setError('');
      setIsSaving(false);
      return;
    }

    if (client) {
      setFormData({
        customerName: client.customerName || '',
        contactPerson: client.contactPerson || '',
        phone: client.phone || '',
        email: client.email || '',
        gst: client.gst || '',
      });
    }
  }, [client, isOpen]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError('');
      await onSave(formData);
      onClose();
    } catch (saveError) {
      setError(normalizeApiError(saveError, 'Failed to update client'));
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const inputClasses =
    'w-full px-4 py-2.5 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 hover:border-slate-300 dark:hover:border-neutral-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-lg outline-none transition-all duration-300 text-sm font-medium text-slate-900 dark:text-white';

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
        className="absolute inset-y-0 right-0 w-full md:w-[450px] bg-white dark:bg-[#121212] shadow-2xl flex flex-col h-full border-l border-slate-100 dark:border-neutral-800"
      >
        <div className="px-6 py-6 border-b border-slate-100 dark:border-neutral-800 shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 dark:bg-[#1A1A1A] rounded-xl border border-blue-100 dark:border-blue-900/30">
                <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Edit Client
                </h2>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-lg transition-colors">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 ml-1">Customer Name</label>
              <input type="text" value={formData.customerName} onChange={(e) => setFormData({ ...formData, customerName: e.target.value })} className={inputClasses} />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 ml-1">Contact Person</label>
              <input type="text" value={formData.contactPerson} onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })} className={inputClasses} />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 ml-1">Email</label>
              <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className={inputClasses} />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 ml-1">Phone</label>
              <input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className={inputClasses} />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 ml-1">GST Number</label>
              <input type="text" value={formData.gst} onChange={(e) => setFormData({ ...formData, gst: e.target.value })} className={inputClasses} />
            </div>

            {error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-900/40 dark:bg-rose-500/10 dark:text-rose-300">
                {error}
              </div>
            ) : null}
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 dark:border-neutral-800 bg-white/80 dark:bg-[#121212]/90 backdrop-blur-md flex gap-3 shrink-0">
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

export const ClientsPage = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: 'customerName', direction: 'asc' });
  const [clients, setClients] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteState, setDeleteState] = useState({ client: null, submitting: false });
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  useEffect(() => {
    fetchClients();
  }, [searchTerm, currentPage, itemsPerPage, sortConfig]);

  useEffect(() => {
    if (!toast.show) return undefined;
    const timer = window.setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 2500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await callApi(financeOpsApi.listClients, {
        search: searchTerm || undefined,
        page: currentPage,
        limit: itemsPerPage,
        sortBy: sortConfig.key,
        sortDirection: sortConfig.direction,
      });
      const payload = extractListPayload(response);
      setClients(payload.items);
      setPagination(payload.pagination);
    } catch (fetchError) {
      setError(normalizeApiError(fetchError, 'Failed to load clients'));
      setClients([]);
      setPagination({ total: 0, totalPages: 1 });
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
  };

  const handleSaveEditDrawer = async (savedData) => {
    const updated = await callApi(financeOpsApi.updateClient, clientToEdit.id, savedData);
    setClients((prev) => prev.map((client) => (client.id === updated.id ? updated : client)));
    showToast('Client updated successfully');
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleDelete = (client) => {
    setDeleteState({ client, submitting: false });
  };

  const handleConfirmDelete = async () => {
    if (!deleteState.client) return;
    try {
      setDeleteState((prev) => ({ ...prev, submitting: true }));
      await callApi(financeOpsApi.deleteClient, deleteState.client.id);
      setDeleteState({ client: null, submitting: false });
      showToast('Client deleted successfully');
      if (clients.length === 1 && currentPage > 1) {
        setCurrentPage((prev) => prev - 1);
      } else {
        fetchClients();
      }
    } catch (deleteError) {
      setDeleteState((prev) => ({ ...prev, submitting: false }));
      showToast(normalizeApiError(deleteError, 'Failed to delete client'), 'error');
    }
  };

  const startIndex = pagination.total === 0 ? 0 : (currentPage - 1) * itemsPerPage;
  const totalPages = Math.max(1, pagination.totalPages || 1);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Clients</h1>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto items-center">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search Clients..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
            />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-neutral-900/50 text-slate-500 dark:text-neutral-500 font-medium border-b border-slate-200 dark:border-neutral-800">
              <tr>
                <th className="px-6 py-4">Sr No</th>
                {[
                  { label: 'Customer Name', key: 'customerName' },
                  { label: 'Contact Person', key: 'contactPerson' },
                  { label: 'Phone', key: 'phone' },
                  { label: 'Email', key: 'email' },
                  { label: 'GST', key: 'gst' },
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
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
              {loading ? (
                <tr>
                  <td colSpan="7" className="p-12 text-center text-slate-500">
                    <div className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading clients...
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="7" className="p-12 text-center text-rose-500">
                    {error}
                  </td>
                </tr>
              ) : clients.length > 0 ? (
                clients.map((client, index) => (
                  <tr
                    key={client.id}
                    onClick={() => navigate(`/clients/${client.id}/details`)}
                    className="group hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                      {startIndex + index + 1}
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-neutral-300 relative z-10">
                      <div className="flex items-center gap-2 transition-colors font-medium">
                        <Building className="w-3.5 h-3.5 text-slate-400" />
                        {client.customerName}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs font-semibold">
                        {client.contactPerson || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-neutral-200">
                      {client.phone || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-slate-500">{client.email || 'N/A'}</td>
                    <td className="px-6 py-4 text-slate-500 text-xs">{client.gst || 'N/A'}</td>
                    <td className="px-6 py-4 text-right relative">
                      <RowActionMenu
                        onEdit={() => {
                          setClientToEdit(client);
                          setIsEditDrawerOpen(true);
                        }}
                        onDelete={() => handleDelete(client)}
                      />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="p-12 text-center text-slate-500">
                    <p>No clients found.</p>
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
              <ChevronLeft className="w-4 h-4" />
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
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(deleteState.client)}
        title="Delete Client"
        message={deleteState.client ? `Delete ${deleteState.client.customerName}? This action cannot be undone.` : ''}
        confirmLabel="Delete Client"
        busy={deleteState.submitting}
        onCancel={() => setDeleteState({ client: null, submitting: false })}
        onConfirm={handleConfirmDelete}
      />

      <EditClientDrawer
        isOpen={isEditDrawerOpen}
        client={clientToEdit}
        onClose={() => {
          setIsEditDrawerOpen(false);
          setClientToEdit(null);
        }}
        onSave={handleSaveEditDrawer}
      />

      <FeedbackToast toast={toast} />
    </div>
  );
};
