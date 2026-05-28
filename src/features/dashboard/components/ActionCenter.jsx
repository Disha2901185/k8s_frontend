import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { 
    ChevronUp, 
    ChevronDown, 
    Trash2,
    Loader2,
    AlertCircle,
    CheckCircle2,
    ShieldAlert,
    RefreshCw,
    FileSpreadsheet
} from 'lucide-react';
import { financeOpsApi } from '@/lib/api';
import { callApi } from '@/lib/apiService';
import { formatCurrency, formatDate } from '@/features/finance/financeApiHelpers';
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

// ==========================================
// ActionTable Column Headers Configuration
// ==========================================

const invoicesToBePreparedHeaders = [
    { label: 'Sn.', key: 'sn' },
    { label: 'Customer Name', key: 'customerName' },
    { label: 'Project Name', key: 'projectName' },
    { label: 'Type', key: 'type' },
    { label: 'Amount', key: 'amount' }
];

const unpaidInvoicesHeaders = [
    { label: 'Sn.', key: 'sn' },
    { label: 'Invoice No', key: 'invoiceNo' },
    { label: 'Customer Name', key: 'customerName' },
    { label: 'Project Name', key: 'projectName' },
    { label: 'Date', key: 'date' },
    { label: 'Amount', key: 'amount' }
];

const latestInvoicesHeaders = [
    { label: 'Sn.', key: 'sn' },
    { label: 'Project Name', key: 'projectName' },
    { label: 'Invoice No', key: 'invoiceNo' },
    { label: 'Invoice Date', key: 'invoiceDate' },
    { label: 'Amount', key: 'amount' }
];

const receiptsHeaders = [
    { label: 'Sn.', key: 'sn' },
    { label: 'Project', key: 'project' },
    { label: 'Date', key: 'date' },
    { label: 'Amount', key: 'amount' }
];

const expiringPOsHeaders = [
    { label: 'Sn.', key: 'sn' },
    { label: 'Project Name', key: 'projectName' },
    { label: 'Project Type', key: 'projectType' },
    { label: 'Customer Name', key: 'customerName' },
    { label: 'Expiry Date', key: 'expiryDate' }
];

// ==========================================
// Reusable Component Helpers
// ==========================================

const ActionTable = ({ headers, children, sortConfig, onSort }) => (
    <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-neutral-900 text-[#878787] font-normal border-b border-slate-200 dark:border-neutral-800">
                <tr>
                    {headers.map((h, i) => (
                        <th
                            key={i}
                            onClick={() => h.key && onSort(h.key)}
                            className={cn(
                                "px-6 py-3 font-medium cursor-pointer hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors select-none",
                                h.label === 'Action' && "text-right cursor-default hover:bg-transparent"
                            )}
                        >
                            <div className={cn("flex items-center gap-1 whitespace-nowrap", h.label === 'Action' && "justify-end")}>
                                {h.label}
                                {h.key && (
                                    <div className="flex flex-col">
                                        <ChevronUp className={cn("w-2 h-2", sortConfig.key === h.key && sortConfig.direction === 'asc' ? "text-main dark:text-white" : "text-slate-300 dark:text-neutral-600")} />
                                        <ChevronDown className={cn("w-2 h-2", sortConfig.key === h.key && sortConfig.direction === 'desc' ? "text-main dark:text-white" : "text-slate-300 dark:text-neutral-600")} />
                                    </div>
                                )}
                            </div>
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
                {children}
            </tbody>
        </table>
    </div>
);

const SkeletonRow = ({ columns }) => (
    <tr className="animate-pulse border-b border-slate-50 dark:border-neutral-800 last:border-0">
        {Array.from({ length: columns }).map((_, i) => (
            <td key={i} className="px-6 py-4">
                <div className="h-4 bg-slate-100 dark:bg-neutral-800 rounded w-24"></div>
            </td>
        ))}
    </tr>
);

// ==========================================
// Main ActionCenter Feature Component
// ==========================================

export const ActionCenter = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('invoicesToBePrepared');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(5);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

    const [toast, setToast] = useState({ show: false, message: '', type: 'success', errorDetails: null });
    const showToast = (message, type = 'success', errorDetails = null) => {
        setToast({ show: true, message, type, errorDetails });
        setTimeout(() => setToast({ show: false, message: '', type, errorDetails: null }), 3000);
    };

    // API Loading, Error & Data States
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [retryCount, setRetryCount] = useState(0);

    const [invoicesToBePrepared, setInvoicesToBePrepared] = useState([]);
    const [unpaidInvoices, setUnpaidInvoices] = useState([]);
    const [latestInvoices, setLatestInvoices] = useState([]);
    const [receipts, setReceipts] = useState([]);
    const [expiringPOs, setExpiringPOs] = useState([]);

    useEffect(() => {
        let active = true;

        const loadGenericData = async () => {
            try {
                setLoading(true);
                setError(null);

                // 1. Fetch live receipts using the exact Invoices & Receipts Page API
                const receiptsRes = await callApi(financeOpsApi.listAllReceipts, { limit: 100 });
                const rawReceipts = receiptsRes?.items ?? [];

                // 2. Fetch all Work Orders to aggregate client projects
                const workOrdersRes = await callApi(financeOpsApi.listAllWorkOrders, { limit: 100 });
                const workOrders = workOrdersRes?.items ?? [];

                // 3. Query invoices for each Work Order in parallel
                const invoicePromises = workOrders.map(async (wo) => {
                    try {
                        const res = await callApi(financeOpsApi.listInvoices, wo.id, { limit: 100 });
                        return (res?.items ?? []).map(inv => ({
                            ...inv,
                            workOrderId: wo.id,
                            client: wo.client,
                            project: wo.project,
                            currency: wo.currency,
                            projectType: wo.projectType
                        }));
                    } catch {
                        return [];
                    }
                });

                const invoicesResults = await Promise.all(invoicePromises);
                const allInvoices = invoicesResults.flat();

                if (!active) return;

                // -------------------------------------------------------------
                // A. Map: Invoices to be Prepared
                // (Work orders where sum of invoices is less than total contract value)
                // -------------------------------------------------------------
                const preparedList = [];
                workOrders.forEach((wo) => {
                    const woInvoices = allInvoices.filter(inv => inv.workOrderId === wo.id);
                    const totalInvoiced = woInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);
                    const woValue = Number(wo.value || 0);

                    if (totalInvoiced < woValue) {
                        preparedList.push({
                            id: wo.id,
                            customerName: wo.client || 'N/A',
                            projectName: wo.project || 'N/A',
                            type: wo.projectType || 'Fixed Bid',
                            amount: formatCurrency(woValue - totalInvoiced, wo.currency),
                            rawAmount: woValue - totalInvoiced
                        });
                    }
                });
                setInvoicesToBePrepared(preparedList.map((item, idx) => ({ ...item, sn: idx + 1 })));

                // -------------------------------------------------------------
                // B. Map: Unpaid Invoices
                // (Invoices that do not have any receipt recorded yet)
                // -------------------------------------------------------------
                const unpaidList = allInvoices
                    .filter(inv => !inv.receipt)
                    .map((inv, idx) => ({
                        id: inv.id,
                        invoiceNo: inv.invoiceNo,
                        customerName: inv.client || 'N/A',
                        projectName: inv.project || 'N/A',
                        date: formatDate(inv.invoiceDate),
                        amount: formatCurrency(inv.totalAmount, inv.currency),
                        rawAmount: Number(inv.totalAmount),
                        rawDate: inv.invoiceDate
                    }));
                setUnpaidInvoices(unpaidList.map((item, idx) => ({ ...item, sn: idx + 1 })));

                // -------------------------------------------------------------
                // C. Map: Latest Invoices
                // (All invoices sorted by date descending)
                // -------------------------------------------------------------
                const latestList = [...allInvoices]
                    .sort((a, b) => new Date(b.invoiceDate) - new Date(a.invoiceDate))
                    .map((inv, idx) => ({
                        id: inv.id,
                        projectName: inv.project || 'N/A',
                        invoiceNo: inv.invoiceNo,
                        invoiceDate: formatDate(inv.invoiceDate),
                        amount: formatCurrency(inv.totalAmount, inv.currency),
                        rawAmount: Number(inv.totalAmount),
                        rawDate: inv.invoiceDate
                    }));
                setLatestInvoices(latestList.map((item, idx) => ({ ...item, sn: idx + 1 })));

                // -------------------------------------------------------------
                // D. Map: Receipts
                // -------------------------------------------------------------
                const receiptsList = rawReceipts.map((rec, idx) => ({
                    id: rec.id,
                    project: rec.workOrder?.deal?.title ?? rec.project ?? 'N/A',
                    date: formatDate(rec.receiptDate),
                    amount: formatCurrency(rec.amountReceived, rec.currency),
                    rawAmount: Number(rec.amountReceived),
                    rawDate: rec.receiptDate
                }));
                setReceipts(receiptsList.map((item, idx) => ({ ...item, sn: idx + 1 })));

                // -------------------------------------------------------------
                // E. Map: PO's Expiring
                // (Work orders with active client purchase orders expiring in 60 days including today)
                // -------------------------------------------------------------
                const today = new Date();
                today.setHours(0, 0, 0, 0); // Start of today

                const sixtyDaysFromNow = new Date(today);
                sixtyDaysFromNow.setDate(today.getDate() + 59); // Including today, total 60 days
                sixtyDaysFromNow.setHours(23, 59, 59, 999); // End of the 60th day

                const expiringList = workOrders
                    .filter(wo => {
                        if (!wo.poExpiry) return false;
                        const expiryDate = new Date(wo.poExpiry);
                        return expiryDate >= today && expiryDate <= sixtyDaysFromNow;
                    })
                    .sort((a, b) => new Date(a.poExpiry) - new Date(b.poExpiry))
                    .map((wo, idx) => ({
                        id: wo.id,
                        projectName: wo.project || 'N/A',
                        projectType: wo.projectType || 'Fixed Bid',
                        customerName: wo.client || 'N/A',
                        expiryDate: formatDate(wo.poExpiry),
                        rawDate: wo.poExpiry
                    }));
                setExpiringPOs(expiringList.map((item, idx) => ({ ...item, sn: idx + 1 })));

            } catch (err) {
                if (active) {
                    console.error("Failed to load generic data from DB:", err);
                    setError("Unable to connect to the database. Please verify your connection.");
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        };

        loadGenericData();

        return () => {
            active = false;
        };
    }, [retryCount]);

    const tabs = [
        { id: 'invoicesToBePrepared', label: 'Invoices to be Prepared', count: invoicesToBePrepared.length, columns: 5 },
        { id: 'unpaidInvoices', label: 'Unpaid Invoices', count: unpaidInvoices.length, columns: 6 },
        { id: 'latestInvoices', label: 'Latest Invoices', count: latestInvoices.length, columns: 5 },
        { id: 'receipts', label: 'Receipts', count: receipts.length, columns: 4 },
        { id: 'expiringPOs', label: "PO's Expiring", count: expiringPOs.length, columns: 5 },
    ];

    const getActiveData = () => {
        switch (activeTab) {
            case 'invoicesToBePrepared': return invoicesToBePrepared;
            case 'unpaidInvoices': return unpaidInvoices;
            case 'latestInvoices': return latestInvoices;
            case 'receipts': return receipts;
            case 'expiringPOs': return expiringPOs;
            default: return [];
        }
    };

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const handleDeletePO = (sn) => {
        setExpiringPOs(prev => prev.filter(item => item.sn !== sn));
        setCurrentPage(1);
    };

    const getSortedData = (data) => {
        if (!sortConfig.key) return data;

        return [...data].sort((a, b) => {
            let aValue = a[sortConfig.key];
            let bValue = b[sortConfig.key];

            // Date sorting helper
            if (sortConfig.key.toLowerCase().includes('date') || sortConfig.key === 'rawDate') {
                const dateA = a.rawDate ? new Date(a.rawDate).getTime() : 0;
                const dateB = b.rawDate ? new Date(b.rawDate).getTime() : 0;
                return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
            }

            // Numeric amount sorting helper
            if (sortConfig.key === 'amount') {
                const amtA = a.rawAmount ?? 0;
                const amtB = b.rawAmount ?? 0;
                return sortConfig.direction === 'asc' ? amtA - amtB : amtB - amtA;
            }

            if (aValue < bValue) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
    };

    const currentData = getActiveData();
    const sortedData = getSortedData(currentData);
    const totalPages = Math.ceil(sortedData.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedData = sortedData.slice(startIndex, startIndex + itemsPerPage);

    const handleTabChange = (id) => {
        setActiveTab(id);
        setCurrentPage(1);
        setSortConfig({ key: null, direction: 'asc' });
    };

    const handleExport = () => {
        const hasWriteAccess = user?.permissions?.includes('write:main.dashboard');
        if (!hasWriteAccess) {
            showToast('Insufficient permissions', 'error', { error: 'Forbidden', statusCode: 403 });
            return;
        }

        let headers = [];
        let keys = [];
        let fileName = "";

        switch (activeTab) {
            case 'invoicesToBePrepared':
                headers = ["Sn.", "Customer Name", "Project Name", "Type", "Amount"];
                keys = ["sn", "customerName", "projectName", "type", "amount"];
                fileName = "invoices_to_be_prepared_export.csv";
                break;
            case 'unpaidInvoices':
                headers = ["Sn.", "Invoice No", "Customer Name", "Project Name", "Date", "Amount"];
                keys = ["sn", "invoiceNo", "customerName", "projectName", "date", "amount"];
                fileName = "unpaid_invoices_export.csv";
                break;
            case 'latestInvoices':
                headers = ["Sn.", "Project Name", "Invoice No", "Invoice Date", "Amount"];
                keys = ["sn", "projectName", "invoiceNo", "invoiceDate", "amount"];
                fileName = "latest_invoices_export.csv";
                break;
            case 'receipts':
                headers = ["Sn.", "Project", "Date", "Amount"];
                keys = ["sn", "project", "date", "amount"];
                fileName = "receipts_export.csv";
                break;
            case 'expiringPOs':
                headers = ["Sn.", "Project Name", "Project Type", "Customer Name", "Expiry Date"];
                keys = ["sn", "projectName", "projectType", "customerName", "expiryDate"];
                fileName = "expiring_pos_export.csv";
                break;
            default:
                return;
        }

        const escapeCSV = (val) => {
            if (val === undefined || val === null) return '';
            let str = String(val);
            if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
                str = `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };

        const csvRows = [
            headers.join(','),
            ...sortedData.map(item => 
                keys.map(key => escapeCSV(item[key])).join(',')
            )
        ];

        // Unicode BOM for Excel compatibility with currency symbols like ₹
        const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csvRows.join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const activeTabMeta = tabs.find(t => t.id === activeTab) || tabs[0];

    return (
        <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden flex flex-col h-full min-h-[480px]">
            <div className="px-6 py-5 dark:border-neutral-800 flex justify-between items-center">
                <h3 className="text-lg font-normal text-main dark:text-white">Action Center</h3>
                <div className="flex items-center gap-3">
                    {!loading && !error && currentData.length > 0 && (
                        <button
                            onClick={handleExport}
                            className="inline-flex items-center justify-center p-2 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20 rounded-xl transition-all cursor-pointer outline-none shadow-xs"
                            title={`Export ${activeTabMeta.label} to CSV`}
                        >
                            <FileSpreadsheet className="w-5 h-5" />
                        </button>
                    )}
                    {error && (
                        <button 
                            onClick={() => setRetryCount(prev => prev + 1)}
                            className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline bg-transparent border-0 outline-none cursor-pointer"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Retry Sync
                        </button>
                    )}
                </div>
            </div>

            {/* Premium Tab Bar with horizontal overflow scrolling */}
            <div className="flex gap-6 px-6 border-b border-slate-200 dark:border-neutral-800 bg-slate-50/50 dark:bg-transparent overflow-x-auto scrollbar-none transition-colors">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => handleTabChange(tab.id)}
                            className={cn(
                                "relative flex items-center gap-2 py-3 text-sm transition-colors whitespace-nowrap bg-transparent border-0 cursor-pointer outline-none",
                                isActive ? "text-main dark:text-white font-medium" : "text-sub hover:text-main dark:text-neutral-500 dark:hover:text-neutral-300"
                            )}
                        >
                            {tab.label}
                            {tab.count > 0 && (
                                <span className={cn(
                                    "px-1.5 py-0.5 rounded-full text-[10px] font-medium leading-none",
                                    isActive ? "bg-slate-200 text-slate-900 dark:bg-neutral-800 dark:text-white" : "bg-slate-100 text-slate-500 dark:bg-neutral-900 dark:text-neutral-500"
                                )}>
                                    {tab.count}
                                </span>
                            )}
                            {isActive && (
                                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-main dark:bg-white" />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Tables Container */}
            <div className="flex-1 overflow-auto bg-white dark:bg-transparent min-h-[250px]">
                {error ? (
                    <div className="p-8 text-center flex flex-col items-center justify-center gap-3 h-full">
                        <AlertCircle className="w-8 h-8 text-rose-500" />
                        <p className="text-sm font-medium text-rose-600 dark:text-rose-400">{error}</p>
                        <button 
                            onClick={() => setRetryCount(prev => prev + 1)}
                            className="mt-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-300 rounded-xl transition-all text-xs font-semibold border border-slate-200 dark:border-neutral-700 shadow-sm"
                        >
                            Retry Connection
                        </button>
                    </div>
                ) : (
                    <>
                        {activeTab === 'invoicesToBePrepared' && (
                            <ActionTable headers={invoicesToBePreparedHeaders} sortConfig={sortConfig} onSort={handleSort}>
                                {loading ? (
                                    Array.from({ length: itemsPerPage }).map((_, i) => (
                                        <SkeletonRow key={i} columns={activeTabMeta.columns} />
                                    ))
                                ) : paginatedData.length > 0 ? (
                                    paginatedData.map((item) => (
                                        <tr key={item.sn} className="group hover:bg-slate-50 dark:hover:bg-neutral-900 transition-colors border-b border-slate-50 dark:border-neutral-800 last:border-0">
                                            <td className="px-6 py-4 text-sm text-sub dark:text-neutral-400">{item.sn}</td>
                                            <td className="px-6 py-4 text-sm font-medium text-main dark:text-white">{item.customerName}</td>
                                            <td className="px-6 py-4 text-sm text-sub dark:text-neutral-400">{item.projectName}</td>
                                            <td className="px-6 py-4 text-sm text-sub dark:text-neutral-400">{item.type}</td>
                                            <td className="px-6 py-4 text-sm font-semibold text-main dark:text-white">{item.amount}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={activeTabMeta.columns} className="px-6 py-8 text-center text-sub dark:text-neutral-500">
                                            No records found.
                                        </td>
                                    </tr>
                                )}
                            </ActionTable>
                        )}

                        {activeTab === 'unpaidInvoices' && (
                            <ActionTable headers={unpaidInvoicesHeaders} sortConfig={sortConfig} onSort={handleSort}>
                                {loading ? (
                                    Array.from({ length: itemsPerPage }).map((_, i) => (
                                        <SkeletonRow key={i} columns={activeTabMeta.columns} />
                                    ))
                                ) : paginatedData.length > 0 ? (
                                    paginatedData.map((item) => (
                                        <tr key={item.sn} className="group hover:bg-slate-50 dark:hover:bg-neutral-900 transition-colors border-b border-slate-50 dark:border-neutral-800 last:border-0">
                                            <td className="px-6 py-4 text-sm text-sub dark:text-neutral-400">{item.sn}</td>
                                            <td className="px-6 py-4 text-sm font-medium text-main dark:text-white">{item.invoiceNo}</td>
                                            <td className="px-6 py-4 text-sm text-sub dark:text-neutral-400">{item.customerName}</td>
                                            <td className="px-6 py-4 text-sm text-sub dark:text-neutral-400">{item.projectName}</td>
                                            <td className="px-6 py-4 text-sm text-sub dark:text-neutral-400">{item.date}</td>
                                            <td className="px-6 py-4 text-sm font-semibold text-main dark:text-white">{item.amount}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={activeTabMeta.columns} className="px-6 py-8 text-center text-sub dark:text-neutral-500">
                                            No records found.
                                        </td>
                                    </tr>
                                )}
                            </ActionTable>
                        )}

                        {activeTab === 'latestInvoices' && (
                            <ActionTable headers={latestInvoicesHeaders} sortConfig={sortConfig} onSort={handleSort}>
                                {loading ? (
                                    Array.from({ length: itemsPerPage }).map((_, i) => (
                                        <SkeletonRow key={i} columns={activeTabMeta.columns} />
                                    ))
                                ) : paginatedData.length > 0 ? (
                                    paginatedData.map((item) => (
                                        <tr key={item.sn} className="group hover:bg-slate-50 dark:hover:bg-neutral-900 transition-colors border-b border-slate-50 dark:border-neutral-800 last:border-0">
                                            <td className="px-6 py-4 text-sm text-sub dark:text-neutral-400">{item.sn}</td>
                                            <td className="px-6 py-4 text-sm font-medium text-main dark:text-white">{item.projectName}</td>
                                            <td className="px-6 py-4 text-sm text-sub dark:text-neutral-400">{item.invoiceNo}</td>
                                            <td className="px-6 py-4 text-sm text-sub dark:text-neutral-400">{item.invoiceDate}</td>
                                            <td className="px-6 py-4 text-sm font-semibold text-main dark:text-white">{item.amount}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={activeTabMeta.columns} className="px-6 py-8 text-center text-sub dark:text-neutral-500">
                                            No records found.
                                        </td>
                                    </tr>
                                )}
                            </ActionTable>
                        )}

                        {activeTab === 'receipts' && (
                            <ActionTable headers={receiptsHeaders} sortConfig={sortConfig} onSort={handleSort}>
                                {loading ? (
                                    Array.from({ length: itemsPerPage }).map((_, i) => (
                                        <SkeletonRow key={i} columns={activeTabMeta.columns} />
                                    ))
                                ) : paginatedData.length > 0 ? (
                                    paginatedData.map((item) => (
                                        <tr key={item.sn} className="group hover:bg-slate-50 dark:hover:bg-neutral-900 transition-colors border-b border-slate-50 dark:border-neutral-800 last:border-0">
                                            <td className="px-6 py-4 text-sm text-sub dark:text-neutral-400">{item.sn}</td>
                                            <td className="px-6 py-4 text-sm font-medium text-main dark:text-white">{item.project}</td>
                                            <td className="px-6 py-4 text-sm text-sub dark:text-neutral-400">{item.date}</td>
                                            <td className="px-6 py-4 text-sm font-semibold text-main dark:text-white">{item.amount}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={activeTabMeta.columns} className="px-6 py-8 text-center text-sub dark:text-neutral-500">
                                            No records found.
                                        </td>
                                    </tr>
                                )}
                            </ActionTable>
                        )}

                        {activeTab === 'expiringPOs' && (
                            <ActionTable headers={expiringPOsHeaders} sortConfig={sortConfig} onSort={handleSort}>
                                {loading ? (
                                    Array.from({ length: itemsPerPage }).map((_, i) => (
                                        <SkeletonRow key={i} columns={activeTabMeta.columns} />
                                    ))
                                ) : paginatedData.length > 0 ? (
                                    paginatedData.map((item) => (
                                        <tr key={item.sn} className="group hover:bg-slate-50 dark:hover:bg-neutral-900 transition-colors border-b border-slate-50 dark:border-neutral-800 last:border-0">
                                            <td className="px-6 py-4 text-sm text-sub dark:text-neutral-400">{item.sn}</td>
                                            <td className="px-6 py-4 text-sm font-medium text-main dark:text-white">{item.projectName}</td>
                                            <td className="px-6 py-4 text-sm text-sub dark:text-neutral-400">{item.projectType}</td>
                                            <td className="px-6 py-4 text-sm text-sub dark:text-neutral-400">{item.customerName}</td>
                                            <td className="px-6 py-4 text-sm text-sub dark:text-neutral-400">{item.expiryDate}</td>
                                            {/* <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => handleDeletePO(item.sn)}
                                                    className="inline-flex items-center justify-center p-1.5 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-500/20 rounded-lg transition-colors cursor-pointer outline-none"
                                                    title="Delete PO"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td> */}
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={activeTabMeta.columns} className="px-6 py-8 text-center text-sub dark:text-neutral-500">
                                            No records found.
                                        </td>
                                    </tr>
                                )}
                            </ActionTable>
                        )}
                    </>
                )}
            </div>

            {/* Pagination Controls & Rows per page selector */}
            <div className="px-6 py-4 border-t border-slate-100 dark:border-neutral-800 flex justify-between items-center gap-4 bg-slate-50/20 dark:bg-transparent">
                <div className="flex items-center gap-2">
                    <span className="text-xs text-sub dark:text-neutral-500 font-medium">Rows per page:</span>
                    <select
                        value={itemsPerPage}
                        disabled={loading || error}
                        onChange={(e) => {
                            setItemsPerPage(Number(e.target.value));
                            setCurrentPage(1);
                        }}
                        className="bg-white dark:bg-neutral-800 text-xs font-semibold text-main dark:text-white border border-slate-200 dark:border-neutral-700 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-slate-300 dark:focus:ring-neutral-600 transition-all cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                    </select>
                </div>

                <div className="flex items-center gap-4">
                    <span className="text-xs text-sub dark:text-neutral-500 font-medium">
                        Page {currentPage} of {totalPages || 1}
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1 || loading || error}
                            className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-500 dark:text-neutral-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-slate-100 dark:border-neutral-800 shadow-xs cursor-pointer"
                        >
                            <span className="sr-only">Previous</span>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages || totalPages === 0 || loading || error}
                            className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-500 dark:text-neutral-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-slate-100 dark:border-neutral-800 shadow-xs cursor-pointer"
                        >
                            <span className="sr-only">Next</span>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                    </div>
                </div>
            </div>
            
            <FeedbackToast toast={toast} />
        </div>
    );
};
