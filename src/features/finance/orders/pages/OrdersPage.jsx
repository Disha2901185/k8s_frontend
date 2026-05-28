import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, MoreHorizontal, FileText, Building, FileSpreadsheet, ChevronLeft, ChevronRight, Check, Loader2, AlertCircle, Trash2, CheckCircle2, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { financeOpsApi } from '@/lib/api';
import { callApi } from '@/lib/apiService';
import { formatCurrency, normalizeApiError, formatDate } from '@/features/finance/financeApiHelpers';
import { useAuth } from '@/features/auth/context/AuthContext';

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

export const OrdersPage = () => {
    const { user } = useAuth();
    const hasWriteAccess = user?.permissions?.includes('write:finance-ops.orders');
    const hasReadAccess = user?.permissions?.includes('read:finance-ops.orders');

    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [selectedIds, setSelectedIds] = useState([]);
    const [activeActionRow, setActiveActionRow] = useState(null);

    const [orders, setOrders] = useState([]);
    const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [deleteState, setDeleteState] = useState({ order: null, submitting: false });
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

    useEffect(() => {
        if (hasReadAccess) {
            fetchOrders();
        } else {
            setLoading(false);
        }
    }, [searchTerm, currentPage, itemsPerPage, hasReadAccess, searchParams]);

    useEffect(() => {
        if (!toast.show) return undefined;
        const timer = window.setTimeout(() => setToast(prev => ({ ...prev, show: false })), 2500);
        return () => window.clearTimeout(timer);
    }, [toast]);

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
    };

    const handleConfirmDelete = async () => {
        if (!deleteState.order) return;
        try {
            setDeleteState(prev => ({ ...prev, submitting: true }));
            await callApi(financeOpsApi.deleteWorkOrder, deleteState.order.id);
            setDeleteState({ order: null, submitting: false });
            showToast('Order deleted successfully');
            fetchOrders();
        } catch (error) {
            setDeleteState(prev => ({ ...prev, submitting: false }));
            if (error.status === 403) {
                showToast('You do not have permission to delete this work order', 'error');
            } else {
                showToast(normalizeApiError(error, 'Failed to delete order'), 'error');
            }
        }
    };

    const fetchOrders = async () => {
        try {
            setLoading(true);
            setError('');
            
            const range = location.state?.range || searchParams.get('range');
            const fromDate = location.state?.fromDate || searchParams.get('fromDate');
            const toDate = location.state?.toDate || searchParams.get('toDate');
            
            const params = {
                search: searchTerm || undefined,
                page: currentPage,
                limit: itemsPerPage,
            };
            if (range) params.range = range;
            if (fromDate) params.fromDate = fromDate;
            if (toDate) params.toDate = toDate;

            const response = await callApi(financeOpsApi.listAllWorkOrders, params);
            setOrders(response.items || []);
            setPagination(response.pagination || { total: 0, totalPages: 1 });
        } catch (err) {
            if (err.status === 403) {
                setError('You do not have permission to view work orders.');
            } else {
                setError(normalizeApiError(err, 'Failed to load work orders'));
            }
            setOrders([]);
            setPagination({ total: 0, totalPages: 1 });
        } finally {
            setLoading(false);
        }
    };

    const toggleActionMenu = (id) => {
        if (activeActionRow === id) {
            setActiveActionRow(null);
        } else {
            setActiveActionRow(id);
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === orders.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(orders.map(order => order.id));
        }
    };

    const toggleSelectOne = (id) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(prev => prev.filter(item => item !== id));
        } else {
            setSelectedIds(prev => [...prev, id]);
        }
    };

    const handleExport = () => {
        if (!hasWriteAccess) {
            setToast({
                show: true,
                message: "Insufficient permissions",
                type: 'error',
                errorDetails: { error: 'Forbidden', statusCode: 403 }
            });
            return;
        }
        
        const headers = ["Project", "Client", "WO No", "WO Value", "WO Date", "WO Expiry Date", "WO Period"];
        const rows = orders.map(ord => [
            ord.project || 'N/A',
            ord.client || 'N/A',
            ord.poNumber || 'N/A',
            formatCurrency(ord.value, ord.currency) || 'N/A',
            formatDate(ord.date),
            formatDate(ord.poExpiry),
            ord.duration || (ord.startDate || ord.endDate ? `${formatDate(ord.startDate)} to ${formatDate(ord.endDate)}` : 'N/A')
        ]);

        const csvContent = "data:text/csv;charset=utf-8," +
            [headers, ...rows]
                .map(row => row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(","))
                .join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `work_orders_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const totalPages = Math.max(1, pagination.totalPages || 1);
    const startIndex = pagination.total === 0 ? 0 : (currentPage - 1) * itemsPerPage;

    if (!hasReadAccess) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-center animate-in fade-in">
                <div className="rounded-full bg-rose-50 p-6 dark:bg-rose-500/10 mb-4">
                    <AlertCircle className="h-10 w-10 text-rose-600 dark:text-rose-400" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Access Denied</h2>
                <p className="text-slate-500 dark:text-neutral-400 max-w-md mx-auto">
                    You do not have permission to view work orders. Please contact your system administrator to request access.
                </p>
            </div>
        );
    }

    return (
        <div
            className="space-y-6 animate-in fade-in duration-500 pb-20"
            onClick={() => setActiveActionRow(null)} // Close menu on outside click
        >
            {/* Lean Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    {location.state?.fromDashboard && (
                        <button 
                            onClick={() => navigate('/', { state: { range: location.state.range, fromDate: location.state.fromDate, toDate: location.state.toDate } })}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-neutral-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                    )}
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Work Orders</h1>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto items-center">
                    {/* Search */}
                    <div className="relative w-full sm:w-64">
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

                    {/* Export Button */}
                    <button
                        onClick={(e) => { e.stopPropagation(); handleExport(); }}
                        className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/30 rounded-lg transition-colors border border-emerald-200 dark:border-emerald-800"
                        title="Export Excel"
                    >
                        <FileSpreadsheet className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-slate-200 dark:border-neutral-800 shadow-sm">
                <div>
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 dark:bg-neutral-900/50 text-slate-500 dark:text-neutral-500 font-medium border-b border-slate-200 dark:border-neutral-800">
                            <tr>
                                <th className="w-12 px-6 py-4">
                                    <label className="relative flex items-center justify-center cursor-pointer p-2 -m-2">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.length === orders.length && orders.length > 0}
                                            onChange={toggleSelectAll}
                                            className="peer sr-only"
                                        />
                                        <div className="w-4 h-4 rounded border border-slate-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 peer-checked:bg-blue-600 dark:peer-checked:bg-blue-500/20 peer-checked:border-blue-600 dark:peer-checked:border-blue-500 transition-all shadow-sm"></div>
                                        <Check className="w-3 h-3 text-white dark:text-blue-500 absolute opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" strokeWidth={3} />
                                    </label>
                                </th>
                                <th className="px-6 py-4">Project</th>
                                <th className="px-6 py-4">Client</th>
                                <th className="px-6 py-4">WO No</th>
                                <th className="px-6 py-4">WO Value</th>
                                <th className="px-6 py-4">WO Date</th>
                                <th className="px-6 py-4">WO Expiry Date</th>
                                <th className="px-6 py-4">WO Period</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
                            {loading ? (
                                <tr>
                                    <td colSpan="9" className="p-12 text-center text-slate-500">
                                        <div className="inline-flex items-center gap-2">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Loading orders...
                                        </div>
                                    </td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan="9" className="p-12 text-center text-rose-500">
                                        <div className="inline-flex items-center justify-center gap-2">
                                            <AlertCircle className="w-4 h-4" />
                                            {error}
                                        </div>
                                    </td>
                                </tr>
                            ) : orders.length > 0 ? (
                                orders.map((order) => (
                                    <tr
                                        key={order.id}
                                        className="group hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer"
                                        onClick={() => navigate(`/client/${order.id}/orders`, { state: { from: 'orders' } })}
                                    >
                                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                            <label className={cn(
                                                "relative flex items-center justify-center cursor-pointer p-2 -m-2 transition-opacity duration-200",
                                                selectedIds.includes(order.id) ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                                            )}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.includes(order.id)}
                                                    onChange={(e) => { e.stopPropagation(); toggleSelectOne(order.id); }}
                                                    className="peer sr-only"
                                                />
                                                <div className="w-4 h-4 rounded border border-slate-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 peer-checked:bg-blue-600 dark:peer-checked:bg-blue-500/20 peer-checked:border-blue-600 dark:peer-checked:border-blue-500 transition-all shadow-sm"></div>
                                                <Check className="w-3 h-3 text-white dark:text-blue-500 absolute opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" strokeWidth={3} />
                                            </label>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                                            {order.project}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-neutral-300">
                                            <div className="flex items-center gap-2">
                                                <Building className="w-3.5 h-3.5 text-slate-400" />
                                                {order.client}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs font-semibold">
                                                <FileText className="w-3 h-3" />
                                                {order.poNumber || 'N/A'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-neutral-200">
                                            {formatCurrency(order.value, order.currency)}
                                        </td>
                                        <td className="px-6 py-4 text-slate-500">
                                            {formatDate(order.date)}
                                        </td>
                                        <td className="px-6 py-4 text-slate-500">
                                            {formatDate(order.poExpiry)}
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 text-xs">
                                            {order.duration ? (
                                                <span>{order.duration}</span>
                                            ) : (
                                                <div className="flex flex-col">
                                                    <span>{order.startDate || 'N/A'}</span>
                                                    <span className="text-slate-400">to</span>
                                                    <span>{order.endDate || 'N/A'}</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right relative">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); toggleActionMenu(order.id); }}
                                                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                                            >
                                                <MoreHorizontal className="w-4 h-4" />
                                            </button>

                                            {/* Action Menu Dropdown */}
                                            {activeActionRow === order.id && (
                                                <div
                                                    className="absolute right-8 top-8 z-50 w-36 bg-white dark:bg-neutral-900 rounded-lg shadow-xl border border-slate-200 dark:border-neutral-800 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <button
                                                        onClick={() => {
                                                            if (!hasWriteAccess) {
                                                                setToast({
                                                                    show: true,
                                                                    message: "Insufficient permissions",
                                                                    type: 'error',
                                                                    errorDetails: { error: 'Forbidden', statusCode: 403 }
                                                                });
                                                                setActiveActionRow(null);
                                                                return;
                                                            }
                                                            setDeleteState({ order, submitting: false });
                                                            setActiveActionRow(null);
                                                        }}
                                                        className="w-full px-4 py-2.5 text-left text-xs font-medium text-rose-600 transition-colors hover:bg-rose-50 dark:hover:bg-rose-900/20"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="9" className="p-12 text-center text-slate-500">
                                        <p>No work orders found.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
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
                                    options={[10, 25, 50, 100].map(size => ({ value: size, label: size.toString() }))}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="p-1.5 border border-slate-200 dark:border-neutral-800 rounded bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                            <button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                className={cn(
                                    "w-7 h-7 flex items-center justify-center rounded text-xs transition-colors",
                                    currentPage === page
                                        ? "bg-blue-600 text-white font-medium"
                                        : "hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-600 dark:text-neutral-400"
                                )}
                            >
                                {page}
                            </button>
                        ))}
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages || pagination.total === 0}
                            className="p-1.5 border border-slate-200 dark:border-neutral-800 rounded bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            <ConfirmDialog
                open={Boolean(deleteState.order)}
                title="Delete Work Order"
                message={deleteState.order ? `Are you sure you want to delete order ${deleteState.order.poNumber || deleteState.order.project}? This action cannot be undone.` : ''}
                confirmLabel="Delete Order"
                busy={deleteState.submitting}
                onCancel={() => setDeleteState({ order: null, submitting: false })}
                onConfirm={handleConfirmDelete}
            />

            <FeedbackToast toast={toast} />
        </div>
    );
};
