import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, MoreHorizontal, ChevronLeft, ChevronRight, Check, ChevronUp, ChevronDown, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { companyApi } from '@/lib/api';
import { AddCompanyDrawer } from '../components/AddCompanyDrawer';
import { extractCompanyItems } from '../companyApiHelpers';
import { getCompanyErrorMessage, getCompanyWebsiteHref } from '../companyFormSchema';
import { formatCurrency } from '@/features/finance/financeApiHelpers';

const Notice = ({ tone = 'info', children }) => {
    const toneMap = {
        error: 'border-rose-200 bg-rose-50/80 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300',
        success: 'border-emerald-200 bg-emerald-50/80 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300',
        info: 'border-slate-200 bg-slate-50/80 text-slate-700 dark:border-neutral-700 dark:bg-neutral-800/70 dark:text-neutral-300',
    };

    return <div className={cn('rounded-2xl border px-4 py-3 text-sm leading-6', toneMap[tone] || toneMap.info)}>{children}</div>;
};

const ConfirmDialog = ({ open, title, message, confirmLabel, busy, onCancel, onConfirm }) => {
    if (!open) return null;

    return createPortal(
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 px-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-[24px] border border-slate-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-950">
                <div className="flex items-start gap-4">
                    <div className="inline-flex rounded-2xl bg-rose-50 p-3 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
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

export const CompaniesPage = () => {
    const navigate = useNavigate();
    const [companies, setCompanies] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [actionState, setActionState] = useState({ error: '', success: '' });
    const [deleteState, setDeleteState] = useState({ company: null, submitting: false });

    const [isAddCompanyOpen, setIsAddCompanyOpen] = useState(false);
    const [editingCompany, setEditingCompany] = useState(null);

    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [searchTerm, setSearchTerm] = useState('');

    const loadCompanies = async () => {
        setIsLoading(true);
        setLoadError('');

        try {
            const response = await companyApi.getAll({ limit: 500 });
            setCompanies(extractCompanyItems(response));
        } catch (error) {
            setLoadError(getCompanyErrorMessage(error, 'Unable to load companies'));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadCompanies();
    }, []);

    const handleEdit = (company) => {
        setEditingCompany(company);
        setIsAddCompanyOpen(true);
    };

    const handleDelete = (id) => {
        const company = companies.find((item) => item.id === id);
        if (!company) return;
        setDeleteState({ company, submitting: false });
    };

    const handleConfirmDelete = async () => {
        if (!deleteState.company) return;

        const targetCompany = deleteState.company;
        setDeleteState((current) => ({ ...current, submitting: true }));
        setActionState({ error: '', success: '' });

        try {
            await companyApi.delete(targetCompany.id);
            await loadCompanies();
            setCurrentPage(1);
            setSelectedIds((prev) => prev.filter((id) => id !== targetCompany.id));
            setActionState({
                error: '',
                success: `${targetCompany.name} deleted successfully.`,
            });
            setDeleteState({ company: null, submitting: false });
        } catch (error) {
            setDeleteState({ company: null, submitting: false });
            setActionState({
                error: getCompanyErrorMessage(error, 'Unable to delete company.'),
                success: '',
            });
        }
    };

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const filteredCompanies = useMemo(() => (
        companies.filter((company) =>
            company.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (company.industry || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (company.website || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (company.status || '').toLowerCase().includes(searchTerm.toLowerCase())
        )
    ), [companies, searchTerm]);

    const sortedCompanies = useMemo(() => {
        if (!sortConfig.key) return filteredCompanies;

        return [...filteredCompanies].sort((a, b) => {
            const aValue = a[sortConfig.key] ?? '';
            const bValue = b[sortConfig.key] ?? '';

            if (aValue < bValue) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
    }, [filteredCompanies, sortConfig]);

    const totalPages = Math.ceil(sortedCompanies.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedCompanies = sortedCompanies.slice(startIndex, startIndex + itemsPerPage);

    const toggleSelectAll = () => {
        if (selectedIds.length === paginatedCompanies.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(paginatedCompanies.map((company) => company.id));
        }
    };

    const toggleSelectOne = (id) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter((selectedId) => selectedId !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {actionState.error ? (
                <Notice tone="error">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{actionState.error}</span>
                    </div>
                </Notice>
            ) : null}

            {actionState.success ? (
                <Notice tone="success">
                    <div className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{actionState.success}</span>
                    </div>
                </Notice>
            ) : null}

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Company Master</h1>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-neutral-500" />
                        <input
                            type="text"
                            placeholder="Search companies..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="pl-9 pr-4 py-2 border border-slate-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none w-64 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-500"
                        />
                    </div>
                    <button className="p-2 border border-slate-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-neutral-800 text-slate-600 dark:text-neutral-400">
                        <Filter className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => {
                            setEditingCompany(null);
                            setIsAddCompanyOpen(true);
                        }}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                    >
                        + New Company
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-slate-200 dark:border-neutral-800 shadow-sm overflow-visible mb-8">
                <div className="overflow-x-auto overflow-y-visible">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 dark:bg-neutral-900/50 text-slate-500 dark:text-neutral-500 font-medium border-b border-slate-200 dark:border-neutral-800">
                            <tr>
                                <th className="w-12 px-6 py-3">
                                    <label className="relative flex items-center justify-center cursor-pointer p-2 -m-2">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.length === paginatedCompanies.length && paginatedCompanies.length > 0}
                                            onChange={toggleSelectAll}
                                            className="peer sr-only"
                                        />
                                        <div className="w-4 h-4 rounded border border-slate-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 peer-checked:bg-blue-600 dark:peer-checked:bg-blue-500/20 peer-checked:border-blue-600 dark:peer-checked:border-blue-500 transition-all shadow-sm"></div>
                                        <Check className="w-3 h-3 text-white dark:text-blue-500 absolute opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" strokeWidth={3} />
                                    </label>
                                </th>
                                {[
                                    { key: 'name', label: 'Company Name' },
                                    { key: 'industry', label: 'Industry' },
                                    { key: 'website', label: 'Website' },
                                    { key: 'status', label: 'Status' },
                                    { key: 'totalSpend', label: 'Total Spend', alignRight: true },
                                ].map((column) => (
                                    <th
                                        key={column.key}
                                        className={cn(
                                            "px-6 py-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors select-none group",
                                            column.alignRight && "text-right"
                                        )}
                                        onClick={() => handleSort(column.key)}
                                    >
                                        <div className={cn("flex items-center gap-1", column.alignRight && "justify-end")}>
                                            {column.label}
                                            <div className="flex flex-col">
                                                <ChevronUp className={cn("w-2 h-2", sortConfig.key === column.key && sortConfig.direction === 'asc' ? "text-blue-600 dark:text-white" : "text-slate-300 dark:text-neutral-600")} />
                                                <ChevronDown className={cn("w-2 h-2", sortConfig.key === column.key && sortConfig.direction === 'desc' ? "text-blue-600 dark:text-white" : "text-slate-300 dark:text-neutral-600")} />
                                            </div>
                                        </div>
                                    </th>
                                ))}
                                <th className="w-10 px-6 py-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-10 text-center text-slate-500 dark:text-neutral-400">
                                        Loading companies...
                                    </td>
                                </tr>
                            ) : loadError ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-10 text-center text-rose-500 font-medium">
                                        {loadError}
                                    </td>
                                </tr>
                            ) : paginatedCompanies.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-10 text-center text-slate-500 dark:text-neutral-400">
                                        No companies found.
                                    </td>
                                </tr>
                            ) : (
                                paginatedCompanies.map((company, index) => (
                                    <tr key={company.id} className="group hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer" onClick={() => navigate(`/companies/${company.id}`)}>
                                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                            <label className={cn(
                                                "relative flex items-center justify-center cursor-pointer p-2 -m-2 transition-opacity duration-200",
                                                selectedIds.includes(company.id) ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                                            )}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.includes(company.id)}
                                                    onChange={() => toggleSelectOne(company.id)}
                                                    className="peer sr-only"
                                                />
                                                <div className="w-4 h-4 rounded border border-slate-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 peer-checked:bg-blue-600 dark:peer-checked:bg-blue-500/20 peer-checked:border-blue-600 dark:peer-checked:border-blue-500 transition-all shadow-sm"></div>
                                                <Check className="w-3 h-3 text-white dark:text-blue-500 absolute opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" strokeWidth={3} />
                                            </label>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white hover:text-blue-600 transition-colors">{company.name}</td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-neutral-400">{company.industry || '-'}</td>
                                        <td className="px-6 py-4 text-blue-600 hover:underline cursor-pointer" onClick={(e) => {
                                            e.stopPropagation();
                                            const href = getCompanyWebsiteHref(company.website);
                                            if (href) window.open(href, '_blank');
                                        }}>
                                            {company.website || '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={cn(
                                                "px-2.5 py-1 rounded-md text-xs font-medium",
                                                company.status === 'Client'
                                                    ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                                                    : "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
                                            )}>
                                                {company.status || 'Prospect'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium text-slate-700 dark:text-neutral-200">
                                            {formatCurrency(company.totalSpend, 'INR')}
                                        </td>
                                        <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                            <div className="relative group/menu inline-block">
                                                <button className="p-1 rounded hover:bg-slate-200 dark:hover:bg-neutral-800 text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 transition-colors">
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </button>
                                                <div className={cn(
                                                    "absolute right-0 w-32 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-lg shadow-xl opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-20 overflow-hidden",
                                                    index === 0
                                                        ? "top-full mt-1 origin-top-right"
                                                        : "bottom-full mb-1 origin-bottom-right"
                                                )}>
                                                    <button onClick={() => handleEdit(company)} className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300 font-medium">Edit Company</button>
                                                    <button onClick={() => handleDelete(company.id)} className="w-full text-left px-4 py-2 text-xs hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-600 font-medium">Delete</button>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="px-6 py-4 border-t border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/30 text-xs text-slate-500 dark:text-neutral-500 flex justify-between items-center rounded-b-xl">
                    <div className="flex items-center gap-4">
                        <span>
                            Showing {filteredCompanies.length === 0 ? 0 : Math.min(startIndex + 1, filteredCompanies.length)} to {Math.min(startIndex + itemsPerPage, filteredCompanies.length)} of {filteredCompanies.length} records
                        </span>
                        <div className="flex items-center gap-2 border-l border-slate-200 dark:border-neutral-800 pl-4">
                            <span>Rows:</span>
                            <div className="w-20">
                                <CustomSelect
                                    value={itemsPerPage}
                                    onChange={(val) => {
                                        setItemsPerPage(Number(val));
                                        setCurrentPage(1);
                                    }}
                                    options={[10, 25, 50, 100].map((size) => ({ value: size, label: size }))}
                                    className="py-1 px-2 h-8"
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
                        <div className="flex items-center gap-1 mx-2">
                            {Array.from({ length: totalPages || 1 }, (_, i) => i + 1).map((page) => (
                                <button
                                    key={page}
                                    onClick={() => setCurrentPage(page)}
                                    className={cn(
                                        "w-8 h-8 flex items-center justify-center rounded-lg text-xs font-medium transition-all duration-200",
                                        currentPage === page
                                            ? "bg-blue-600 text-white shadow-md"
                                            : "hover:bg-slate-100 text-slate-500 hover:text-slate-900 dark:hover:bg-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
                                    )}
                                >
                                    {page}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => setCurrentPage((prev) => Math.min(totalPages || 1, prev + 1))}
                            disabled={currentPage === totalPages || totalPages === 0}
                            className="p-1.5 border border-slate-200 dark:border-neutral-800 rounded bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            <AddCompanyDrawer
                isOpen={isAddCompanyOpen}
                onClose={() => {
                    setIsAddCompanyOpen(false);
                    setEditingCompany(null);
                }}
                company={editingCompany}
                onSaved={loadCompanies}
                key={editingCompany ? editingCompany.id : 'new'}
            />
            <ConfirmDialog
                open={Boolean(deleteState.company)}
                title="Delete Company"
                message={
                    deleteState.company
                        ? `Delete ${deleteState.company.name}? This action cannot be undone.`
                        : ''
                }
                confirmLabel="Delete Company"
                busy={deleteState.submitting}
                onCancel={() => setDeleteState({ company: null, submitting: false })}
                onConfirm={handleConfirmDelete}
            />
        </div>
    );
};
