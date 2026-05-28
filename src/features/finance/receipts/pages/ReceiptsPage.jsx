import React, { useState, useEffect } from 'react';
import { Search, Calendar, Download, Filter, Eye, MoreHorizontal, Wallet, CheckCircle, Clock, AlertCircle, CreditCard, Banknote, Building, ArrowUpRight, FileText, FileSpreadsheet, X, ChevronLeft, ChevronRight, Check, Loader2, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { financeOpsApi } from '@/lib/api';
import { callApi } from '@/lib/apiService';
import { extractListPayload, formatCurrency, normalizeApiError, formatDate } from '@/features/finance/financeApiHelpers';
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

export const ReceiptsPage = () => {
    const { user } = useAuth();
    const hasWriteAccess = user?.permissions?.includes('write:finance-ops.receipts');
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
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFrom, setDateFrom] = useState(initialDates.from);
    const [dateTo, setDateTo] = useState(initialDates.to);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [statusFilter, setStatusFilter] = useState('All'); 
    const [modeFilter, setModeFilter] = useState('All');
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [selectedReceipt, setSelectedReceipt] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);
    const [receipts, setReceipts] = useState([]);
    const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

    // Fetch Receipts
    const fetchReceipts = async () => {
        try {
            setLoading(true);
            setError('');
            
            const params = {
                search: searchTerm || undefined,
                page: currentPage,
                limit: itemsPerPage,
            };
            if (dateFrom) params.fromDate = dateFrom;
            if (dateTo) params.toDate = dateTo;
            if (dateFrom || dateTo) params.range = 'custom';
            if (statusFilter !== 'All') params.status = statusFilter;
            if (modeFilter !== 'All') params.paymentMode = modeFilter;

            const response = await callApi(financeOpsApi.listAllReceipts, params);
            const payload = extractListPayload(response);
            setReceipts(payload.items);
            setPagination(payload.pagination);
        } catch (err) {
            if (err?.status === 403) {
                setError('You do not have permission to view receipts.');
            } else if (err?.status === 404) {
                setError('Receipts service is temporarily unavailable. Please try again later.');
            } else {
                setError(normalizeApiError(err, 'Failed to load receipts'));
            }
            setReceipts([]);
            setPagination({ total: 0, totalPages: 1 });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReceipts();
    }, [searchTerm, currentPage, itemsPerPage, dateFrom, dateTo, statusFilter, modeFilter]);

    useEffect(() => {
        if (!toast.show) return undefined;
        const timer = window.setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 3000);
        return () => window.clearTimeout(timer);
    }, [toast]);

    const showToast = (message, type = 'success', errorDetails = null) => {
        setToast({ show: true, message, type, errorDetails });
        setTimeout(() => setToast({ show: false, message: '', type, errorDetails: null }), 3000);
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === receipts.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(receipts.map(rec => rec.id));
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
            case 'Received': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
            case 'Processing': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
            case 'Failed': return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400';
            default: return 'bg-slate-100 text-slate-700 dark:bg-neutral-800 dark:text-neutral-400';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'Received': return <CheckCircle className="w-3.5 h-3.5" />;
            case 'Processing': return <Clock className="w-3.5 h-3.5" />;
            case 'Failed': return <AlertCircle className="w-3.5 h-3.5" />;
            default: return null;
        }
    };

    const getPaymentModeIcon = (mode) => {
        const m = mode?.toLowerCase() || '';
        if (m.includes('card')) return <CreditCard className="w-4 h-4 text-slate-400" />;
        if (m.includes('wire') || m.includes('bank') || m.includes('transfer')) return <Building className="w-4 h-4 text-slate-400" />;
        if (m.includes('cheque') || m.includes('cash')) return <Banknote className="w-4 h-4 text-slate-400" />;
        return <Wallet className="w-4 h-4 text-slate-400" />;
    };

    const handleExport = () => {
        if (!hasWriteAccess) {
            showToast('Insufficient permissions', 'error', { error: 'Forbidden', statusCode: 403 });
            return;
        }
        if (!receipts.length) {
            showToast('No receipts to export', 'error');
            return;
        }
        const headers = ["Invoice No", "Project", "Client", "Amount", "TDS Ded.", "Withholding", "Date"];
        const rows = receipts.map(rec => [
            rec.invoiceNo || 'N/A',
            rec.project || 'N/A',
            rec.client || 'N/A',
            formatCurrency(rec.amountReceived, rec.currency),
            formatCurrency(rec.tds, rec.currency),
            formatCurrency(rec.withholding, rec.currency),
            formatDate(rec.receiptDate)
        ]);
        const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `receipts_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleRowClick = (rec) => {
        if (!rec.workOrderId) {
            showToast('Unable to navigate: Missing work order information', 'error');
            return;
        }
        navigate(`/client/${rec.workOrderId}/orders?tab=receipt`, {
            state: {
                from: 'receipts'
            }
        });
    };

    const hasActiveFilters = dateFrom || dateTo || statusFilter !== 'All' || modeFilter !== 'All';

    const clearFilters = () => {
        setDateFrom('');
        setDateTo('');
        setStatusFilter('All');
        setModeFilter('All');
        setIsFilterOpen(false);
    };

    const startIndex = pagination.total === 0 ? 0 : (currentPage - 1) * itemsPerPage;
    const totalPages = Math.max(1, pagination.totalPages || 1);

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
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
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Receipts</h1>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto items-center">
                    {/* Search */}
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search receipts..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
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
                                                <option value="Processing">Processing</option>
                                                <option value="Failed">Failed</option>
                                            </select>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Payment Mode</label>
                                            <select
                                                value={modeFilter}
                                                onChange={(e) => setModeFilter(e.target.value)}
                                                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-neutral-800 rounded-lg bg-slate-50 dark:bg-neutral-900/50 outline-none focus:border-blue-500 dark:text-white"
                                            >
                                                <option value="All">All Modes</option>
                                                <option value="Wire Transfer">Wire Transfer</option>
                                                <option value="Credit Card">Credit Card</option>
                                                <option value="Cheque">Cheque</option>
                                                <option value="UPI">UPI</option>
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
                        title="Export CSV"
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
                                <th className="px-6 py-4">Invoice No</th>
                                <th className="px-6 py-4">Project</th>
                                <th className="px-6 py-4">Client</th>
                                <th className="px-6 py-4 text-right">Amount</th>
                                <th className="px-6 py-4 text-right">TDS Ded.</th>
                                <th className="px-6 py-4 text-right">Withholding</th>
                                <th className="px-6 py-4">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="p-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center gap-2">
                                            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                                            <p>Loading receipts...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan="7" className="p-12 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <AlertCircle className="w-8 h-8 text-rose-500" />
                                            <p className="text-rose-500 font-medium">{error}</p>
                                            <button 
                                                onClick={fetchReceipts}
                                                className="mt-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-300 rounded-lg transition-colors text-xs font-semibold border border-slate-200 dark:border-neutral-700"
                                            >
                                                Retry Connection
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ) : receipts.length > 0 ? (
                                receipts.map((rec, index) => (
                                    <tr
                                        key={rec.id}
                                        onClick={() => handleRowClick(rec)}
                                        className="group hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer"
                                    >
                                        <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">
                                            <div className="flex items-center gap-2">
                                                <FileText className="w-4 h-4 text-blue-500" />
                                                {rec.invoiceNo || 'N/A'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-neutral-300">
                                            <div className="max-w-[180px] truncate" title={rec.project}>
                                                {rec.project}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-medium">{rec.client}</td>
                                        <td className="px-6 py-4 text-right font-bold text-slate-900 dark:text-neutral-200">
                                            {formatCurrency(rec.amountReceived, rec.currency)}
                                        </td>
                                        <td className="px-6 py-4 text-right text-slate-600 dark:text-neutral-400">
                                            {formatCurrency(rec.tds, rec.currency)}
                                        </td>
                                        <td className="px-6 py-4 text-right text-slate-600 dark:text-neutral-400">
                                            {formatCurrency(rec.withholding, rec.currency)}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-neutral-300 whitespace-nowrap">
                                            {formatDate(rec.receiptDate)}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" className="p-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center gap-2">
                                            <Wallet className="w-8 h-8 text-slate-300" />
                                            <p>No receipts found matching your criteria.</p>
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

            {/* Receipt Details Modal (Optional, keeping structure but focusing on navigation) */}
            {selectedReceipt && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedReceipt(null)} />
                    <div className="relative bg-white dark:bg-neutral-900 rounded-xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-neutral-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-neutral-800 flex justify-between items-center bg-slate-50 dark:bg-neutral-900/50">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Receipt Details</h3>
                                <p className="text-xs text-slate-500 mt-0.5">{selectedReceipt.id}</p>
                            </div>
                            <button onClick={() => setSelectedReceipt(null)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-lg flex justify-between items-center border border-emerald-100 dark:border-emerald-800/30">
                                <div>
                                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium uppercase tracking-wide">Amount Received</p>
                                    <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                                        {formatCurrency(selectedReceipt.amountReceived)}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <div className={cn(
                                        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-white dark:bg-neutral-900 border border-emerald-200 dark:border-emerald-800",
                                        getStatusColor(selectedReceipt.status || 'Received')
                                    )}>
                                        {getStatusIcon(selectedReceipt.status || 'Received')}
                                        {selectedReceipt.status || 'Received'}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-slate-500">Invoice Reference</p>
                                    <p className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                        <FileText className="w-3.5 h-3.5 text-blue-500" />
                                        {selectedReceipt.invoiceNo || 'N/A'}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-slate-500">Payment Date</p>
                                    <p className="text-sm font-medium text-slate-900 dark:text-white">{selectedReceipt.receiptDate}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-slate-500">Payment Mode</p>
                                    <div className="flex items-center gap-2">
                                        {getPaymentModeIcon(selectedReceipt.paymentMode)}
                                        <span className="text-sm font-medium text-slate-900 dark:text-white">{selectedReceipt.paymentMode}</span>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-slate-500">Client</p>
                                    <p className="text-sm font-medium text-slate-900 dark:text-white">{selectedReceipt.client}</p>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100 dark:border-neutral-800 grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-slate-500 mb-1">TDS Deducted</p>
                                    <p className="text-sm font-medium text-slate-700 dark:text-neutral-300">
                                        {formatCurrency(selectedReceipt.tds)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 mb-1">Charges & Levies</p>
                                    <p className="text-sm font-medium text-slate-700 dark:text-neutral-300">
                                        {formatCurrency(selectedReceipt.chargesAndLevies)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-slate-50 dark:bg-neutral-900/50 border-t border-slate-200 dark:border-neutral-800 flex justify-end gap-3">
                            <button
                                onClick={() => setSelectedReceipt(null)}
                                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 dark:text-neutral-300 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <FeedbackToast toast={toast} />
        </div>
    );
};
