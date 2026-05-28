import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Search, Calendar, Download, Filter, Eye, MoreHorizontal, FileText, CheckCircle, AlertCircle, Clock, FileSpreadsheet, X, Plus, Banknote, CreditCard, Wallet, Building, ChevronLeft, ChevronRight, Check, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { financeOpsApi, tenantApi } from '@/lib/api';
import { formatCurrency, extractListPayload, normalizeApiError } from '@/features/finance/financeApiHelpers';
import { useAuth } from '@/features/auth/context/AuthContext';

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

export const InvoicesPage = () => {
    const { user } = useAuth();
    const hasWriteAccess = user?.permissions?.includes('write:finance-ops.invoices');
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();

    const getInitialDates = (state) => {
        if (!state?.range) return { from: '', to: '' };
        const range = state.range;
        let from = '';
        let to = '';
        
        if (range === 'custom') {
            from = state.fromDate || '';
            to = state.toDate || '';
            return { from, to };
        }
        
        const pad = (n) => String(n).padStart(2, '0');
        const formatLocal = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        const now = new Date();

        if (range === 'thisMonth') {
            from = formatLocal(new Date(now.getFullYear(), now.getMonth(), 1));
            to = formatLocal(new Date(now.getFullYear(), now.getMonth() + 1, 0));
        } else if (range === 'lastMonth') {
            from = formatLocal(new Date(now.getFullYear(), now.getMonth() - 1, 1));
            to = formatLocal(new Date(now.getFullYear(), now.getMonth(), 0));
        } else if (range === 'thisQuarter') {
            const quarter = Math.floor(now.getMonth() / 3);
            from = formatLocal(new Date(now.getFullYear(), quarter * 3, 1));
            to = formatLocal(new Date(now.getFullYear(), quarter * 3 + 3, 0));
        } else if (range === 'thisYear' || range === 'thisFinYear') {
            from = formatLocal(new Date(now.getFullYear(), 0, 1));
            to = formatLocal(new Date(now.getFullYear(), 11, 31));
        }
        
        return { from, to };
    };

    const initialDates = getInitialDates(location.state);

    // State
    const [invoices, setInvoices] = useState([]);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 1,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFrom, setDateFrom] = useState(initialDates.from);
    const [dateTo, setDateTo] = useState(initialDates.to);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [selectedIds, setSelectedIds] = useState([]);
    const [statusFilter, setStatusFilter] = useState('All');
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // Modal State
    const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null);

    // Toast State
    const [toast, setToast] = useState({ show: false, message: '', type: 'success', errorDetails: null });
    const showToast = (message, type = 'success', errorDetails = null) => {
        setToast({ show: true, message, type, errorDetails });
        setTimeout(() => setToast({ show: false, message: '', type, errorDetails: null }), 3000);
    };

    // Fetch Logic
    const fetchInvoices = useCallback(async () => {
        try {
            setIsLoading(true);
            setIsError(false);

            let from = dateFrom ? dateFrom : undefined;
            let to = dateTo ? dateTo : undefined;

            const params = {
                page: currentPage,
                limit: itemsPerPage,
                search: searchTerm || undefined,
                status: statusFilter === 'All' ? undefined : statusFilter,
            };

            if (dateFrom) params.dateFrom = dateFrom;
            if (dateTo) params.dateTo = dateTo;
            if (dateFrom || dateTo) params.range = 'custom';

            const response = await financeOpsApi.listAllInvoices(params);
            const { items, pagination: pagData } = extractListPayload(response.data);
            setInvoices(items);
            setPagination(pagData);
        } catch (err) {
            setIsError(true);
            console.error(normalizeApiError(err, 'Failed to load invoices'));
        } finally {
            setIsLoading(false);
        }
    }, [currentPage, itemsPerPage, searchTerm, statusFilter, dateFrom, dateTo]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchInvoices();
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [fetchInvoices]);

    const toggleSelectAll = () => {
        if (selectedIds.length === invoices.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(invoices.map(inv => inv.id));
        }
    };

    const toggleSelectOne = (id) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(prev => prev.filter(item => item !== id));
        } else {
            setSelectedIds(prev => [...prev, id]);
        }
    };

    // Helpers
    const getStatusColor = (status) => {
        switch (status) {
            case 'Received': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400';
            case 'Partially Received': return 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400';
            case 'Pending': return 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400';
            case 'Overdue': return 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400';
            default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'Received': return <CheckCircle className="w-3.5 h-3.5" />;
            case 'Partially Received': return <Clock className="w-3.5 h-3.5 text-blue-500" />;
            case 'Pending': return <Clock className="w-3.5 h-3.5" />;
            case 'Overdue': return <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />;
            default: return null;
        }
    };

    const getPendingDays = (dateStr, status) => {
        if (status === 'Received') return '-';
        const invoiceDate = new Date(dateStr);
        const today = new Date();
        const diffTime = Math.abs(today - invoiceDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const handleExport = () => {
        if (!hasWriteAccess) {
            showToast('Insufficient permissions', 'error', { error: 'Forbidden', statusCode: 403 });
            return;
        }
        
        console.log("Exporting to Excel...", invoices);
        const headers = ["Invoice ID", "Client", "Project", "Amount", "Date", "Pending Days", "Status"];
        const rows = invoices.map(inv => [
            inv.invoiceNo,
            inv.client,
            inv.project,
            formatCurrency(inv.totalAmount, inv.currency),
            inv.invoiceDate,
            getPendingDays(inv.invoiceDate, inv.status),
            inv.status
        ]);
        const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows]
            .map(e => e.map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(","))
            .join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "invoices_export.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const hasActiveFilters = dateFrom || dateTo || statusFilter !== 'All';

    const clearFilters = () => {
        setDateFrom('');
        setDateTo('');
        setStatusFilter('All');
        setIsFilterOpen(false);
    };


    const handleOpenReceiptModal = (invoice) => {
        setSelectedInvoice(invoice);
        setIsReceiptModalOpen(true);
    };

    const handleCloseReceiptModal = () => {
        setIsReceiptModalOpen(false);
        setSelectedInvoice(null);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 relative">
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
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Invoices</h1>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto items-center">
                    {/* Search */}
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search invoices..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                        />
                    </div>

                    {/* Filter Button */}
                    <div className="relative z-20">
                        <button
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            className={cn(
                                "flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium transition-colors min-w-[100px] justify-center",
                                isFilterOpen || hasActiveFilters
                                    ? "bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400"
                                    : "bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 text-slate-700 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-neutral-800"
                            )}
                        >
                            <Filter className="w-4 h-4" />
                            <span>Filter</span>
                            {hasActiveFilters && (
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 absolute top-2 right-2"></span>
                            )}
                        </button>

                        {isFilterOpen && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setIsFilterOpen(false)} />
                                <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-neutral-900 rounded-xl shadow-xl border border-slate-200 dark:border-neutral-800 p-4 z-20 animate-in fade-in zoom-in-95 duration-200">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Filters</h3>
                                        <button onClick={() => setIsFilterOpen(false)} className="text-slate-400 hover:text-slate-600">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Date Range</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                <input
                                                    type="date"
                                                    value={dateFrom}
                                                    onChange={(e) => setDateFrom(e.target.value)}
                                                    className="w-full px-2 py-1.5 text-xs border border-slate-200 dark:border-neutral-800 rounded-lg bg-slate-50 dark:bg-neutral-900/50 outline-none focus:border-blue-500 dark:text-white"
                                                />
                                                <input
                                                    type="date"
                                                    value={dateTo}
                                                    onChange={(e) => setDateTo(e.target.value)}
                                                    className="w-full px-2 py-1.5 text-xs border border-slate-200 dark:border-neutral-800 rounded-lg bg-slate-50 dark:bg-neutral-900/50 outline-none focus:border-blue-500 dark:text-white"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Status</label>
                                            <select
                                                value={statusFilter}
                                                onChange={(e) => setStatusFilter(e.target.value)}
                                                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-neutral-800 rounded-lg bg-slate-50 dark:bg-neutral-900/50 outline-none focus:border-blue-500 dark:text-white"
                                            >
                                                <option value="All">All Status</option>
                                                <option value="Received">Received</option>
                                                <option value="Partially Received">Partially Received</option>
                                                <option value="Pending">Pending</option>
                                                <option value="Overdue">Overdue</option>
                                            </select>
                                        </div>

                                        {hasActiveFilters && (
                                            <button
                                                onClick={clearFilters}
                                                className="w-full py-2 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors font-medium border border-transparent hover:border-rose-200"
                                            >
                                                Clear Filters
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Export */}
                    <button
                        onClick={handleExport}
                        className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/30 rounded-lg transition-colors border border-emerald-200 dark:border-emerald-800"
                        title="Export Excel"
                    >
                        <FileSpreadsheet className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto min-h-[400px]">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 dark:bg-neutral-900/50 text-slate-500 dark:text-neutral-500 font-medium border-b border-slate-200 dark:border-neutral-800">
                            <tr>
                                <th className="px-6 py-4">Invoice ID</th>
                                <th className="px-6 py-4">Client</th>
                                <th className="px-6 py-4">Project</th>
                                <th className="px-6 py-4 text-right">Amount</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Pending Days</th>
                                <th className="px-6 py-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
                            {isLoading ? (
                                Array.from({ length: itemsPerPage }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-4"><div className="h-4 bg-slate-200 dark:bg-neutral-800 rounded w-24"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-slate-200 dark:bg-neutral-800 rounded w-32"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-slate-200 dark:bg-neutral-800 rounded w-40"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-slate-200 dark:bg-neutral-800 rounded w-20 ml-auto"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-slate-200 dark:bg-neutral-800 rounded w-24"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-slate-200 dark:bg-neutral-800 rounded w-16"></div></td>
                                        <td className="px-6 py-4"><div className="h-6 bg-slate-200 dark:bg-neutral-800 rounded-full w-20"></div></td>
                                    </tr>
                                ))
                            ) : isError ? (
                                <tr>
                                    <td colSpan="7" className="p-12 text-center text-rose-500">
                                        <div className="flex flex-col items-center gap-2">
                                            <AlertTriangle className="w-8 h-8" />
                                            <p>Error loading invoices. Please try again.</p>
                                            <button onClick={fetchInvoices} className="mt-2 text-sm text-blue-600 hover:underline">Retry</button>
                                        </div>
                                    </td>
                                </tr>
                            ) : invoices.length > 0 ? (
                                invoices.map((inv) => {
                                    const pendingDays = getPendingDays(inv.invoiceDate, inv.status);
                                    return (
                                        <tr key={inv.id} className="group hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer" onClick={() => navigate(`/client/${inv.workOrderId}/orders?tab=invoice&invoiceId=${inv.id}`, { state: { from: 'invoices' } })}>
                                            <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">
                                                <div className="flex items-center gap-2">
                                                    <FileText className="w-4 h-4 text-blue-500" />
                                                    {inv.invoiceNo}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 dark:text-neutral-300">{inv.client}</td>
                                            <td className="px-6 py-4 text-slate-600 dark:text-neutral-300">{inv.project}</td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="font-medium text-slate-900 dark:text-neutral-200">
                                                    {formatCurrency(inv.totalAmount, inv.currency)}
                                                </div>
                                                {String(inv.currency || 'INR').toUpperCase() !== 'INR' && (
                                                    <div className="mt-0.5 text-[10px] text-slate-500 dark:text-neutral-500 font-normal">
                                                        {formatCurrency(inv.inrTotalAmount || 0, 'INR')}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                                                {inv.invoiceDate}
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 dark:text-neutral-300">
                                                {inv.status !== 'Received' ? (
                                                    <span className={cn(
                                                        "font-medium",
                                                        pendingDays > 90 ? "text-rose-600" : "text-amber-600"
                                                    )}>
                                                        {pendingDays} days
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400 text-xs">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className={cn(
                                                    "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium",
                                                    getStatusColor(inv.status)
                                                )}>
                                                    {getStatusIcon(inv.status)}
                                                    {inv.status}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="7" className="p-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center gap-2">
                                            <FileText className="w-8 h-8 text-slate-300" />
                                            <p>No invoices found matching your criteria.</p>
                                        </div>
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
                            Showing {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} records
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
                        {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(page => (
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
                            onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
                            disabled={currentPage === pagination.totalPages || pagination.totalPages === 0}
                            className="p-1.5 border border-slate-200 dark:border-neutral-800 rounded bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Add Receipt Modal */}
            {isReceiptModalOpen && selectedInvoice && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={handleCloseReceiptModal} />
                    <div className="relative bg-white dark:bg-neutral-900 rounded-xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-neutral-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-neutral-800 flex justify-between items-center bg-slate-50 dark:bg-neutral-900/50">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Record Payment</h3>
                                <p className="text-xs text-slate-500 mt-0.5">Add payment details for {selectedInvoice.id}</p>
                            </div>
                            <button onClick={handleCloseReceiptModal} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg flex justify-between items-center">
                                <div>
                                    <p className="text-xs text-blue-600 dark:text-blue-400 font-medium uppercase tracking-wide">Total Amount</p>
                                    <p className="text-xl font-bold text-blue-700 dark:text-blue-300">
                                        {formatCurrency(selectedInvoice.totalAmount)}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-slate-500">Invoice Date</p>
                                    <p className="font-medium text-slate-700 dark:text-neutral-300">{selectedInvoice.date}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-500 uppercase">Received Amount</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-serif">₹</span>
                                            <input
                                                type="number"
                                                defaultValue={selectedInvoice.totalAmount}
                                                className="w-full pl-8 pr-3 py-2 border border-slate-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-900/50 text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-medium dark:text-white"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-500 uppercase">Payment Date</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input
                                                type="date"
                                                defaultValue={new Date().toISOString().split('T')[0]}
                                                className="w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-900/50 text-sm focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-500 uppercase">Payment Mode</label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {['Wire Transfer', 'Credit Card', 'Cheque', 'UPI'].map((mode) => (
                                            <button
                                                key={mode}
                                                onClick={(e) => {
                                                    // Simple toggle visual logic for demo
                                                    e.currentTarget.parentElement.querySelectorAll('button').forEach(b => {
                                                        b.classList.remove('ring-2', 'ring-emerald-500', 'bg-emerald-50', 'text-emerald-700');
                                                        b.classList.add('bg-white', 'text-slate-600');
                                                    });
                                                    e.currentTarget.classList.add('ring-2', 'ring-emerald-500', 'bg-emerald-50', 'text-emerald-700');
                                                }}
                                                className="flex flex-col items-center justify-center p-3 border border-slate-200 dark:border-neutral-700 rounded-xl hover:bg-slate-50 dark:hover:bg-neutral-800 transition-all gap-1.5 text-slate-600 dark:text-neutral-300 bg-white dark:bg-neutral-900"
                                            >
                                                {mode === 'Wire Transfer' && <Building className="w-5 h-5" />}
                                                {mode === 'Credit Card' && <CreditCard className="w-5 h-5" />}
                                                {mode === 'Cheque' && <Banknote className="w-5 h-5" />}
                                                {mode === 'UPI' && <Wallet className="w-5 h-5" />}
                                                <span className="text-[10px] font-medium text-center leading-tight">{mode}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-500 uppercase">Transaction Ref / Notes</label>
                                    <textarea
                                        rows="2"
                                        placeholder="Enter transaction ID or notes..."
                                        className="w-full px-3 py-2 border border-slate-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-900/50 text-sm focus:ring-2 focus:ring-emerald-500 outline-none resize-none dark:text-white"
                                    ></textarea>
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-slate-50 dark:bg-neutral-900/50 border-t border-slate-200 dark:border-neutral-800 flex justify-end gap-3">
                            <button
                                onClick={handleCloseReceiptModal}
                                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 dark:text-neutral-300 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    alert(`Payment recorded for ${selectedInvoice.id}`);
                                    handleCloseReceiptModal();
                                }}
                                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors flex items-center gap-2"
                            >
                                <CheckCircle className="w-4 h-4" />
                                Record Receipt
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <FeedbackToast toast={toast} />
        </div>
    );
};

