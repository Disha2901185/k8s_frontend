import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, Filter, Phone, Mail, MoreHorizontal, MessageSquare, Calendar, CheckSquare, X, Briefcase, History, ChevronLeft, ChevronRight, LayoutDashboard, Clock, Building2, ExternalLink, Check, AlertCircle, CheckCircle2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { associateApi } from '@/lib/api';
import { callApi } from '@/lib/apiService';
import { AddAssociateModal } from '../../pipeline/components/DealSlideout/AddAssociateModal';
import { BroadcastModal } from '../../../contacts/components/BroadcastModal';
import { UserMessageModal } from '../../../contacts/components/UserMessageModal';

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
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 px-4 backdrop-blur-sm">
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
                        {busy ? 'Deleting...' : confirmLabel}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

const formatLastContacted = (value) => {
    if (!value) return 'Never';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Never';
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatTimelineDate = (value) => {
    if (!value) return 'Unknown';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Unknown';
    return date.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
};

const mapAssociateForList = (associate) => ({
    id: associate.id,
    name: associate.name,
    email: associate.email || '',
    phone: associate.phone || '',
    activeDealsCount: associate.summary?.activeDealsCount || 0,
    closedDealsCount: associate.summary?.closedDealsCount || 0,
    totalValue: associate.summary?.revenueWon || 0,
    lastActive: formatLastContacted(associate.lastContactedAt || associate.summary?.lastContactedAt),
    deals: [],
    lastContactedAt: associate.lastContactedAt || associate.summary?.lastContactedAt || null,
});

const mapDealForProfile = (deal) => ({
    id: deal.id,
    title: deal.title,
    company: deal.companyName || 'No company linked',
    value: Number(deal.value || 0),
    stage: deal.stageLabel || deal.stage,
    status: deal.status === 'active' ? 'Active' : 'Closed',
    date: deal.updatedAt,
});

const mapInteractionForProfile = (item) => ({
    id: item.id,
    type: item.channel === 'whatsapp' ? 'whatsapp' : 'email',
    date: formatTimelineDate(item.at),
    subject: item.subject || item.summary || 'Interaction',
    content: item.content || item.summary || 'No content available.',
    hasViewLink: item.channel === 'email',
});

export const AssociatesPage = () => {
    const [associates, setAssociates] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);
    const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [loadError, setLoadError] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [totalRecords, setTotalRecords] = useState(0);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingAssociate, setEditingAssociate] = useState(null);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [selectedProfileAssociate, setSelectedProfileAssociate] = useState(null);
    const [profileHistory, setProfileHistory] = useState([]);
    const [profileTab, setProfileTab] = useState('overview');
    const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
    const [messageChannel, setMessageChannel] = useState('email');
    const [actionState, setActionState] = useState({ error: '', success: '' });
    const [deleteState, setDeleteState] = useState({ associate: null, submitting: false });

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            setDebouncedSearchTerm(searchTerm.trim());
        }, 250);
        return () => window.clearTimeout(timeoutId);
    }, [searchTerm]);

    const loadAssociates = async (page = currentPage, limit = itemsPerPage, search = debouncedSearchTerm) => {
        setIsLoading(true);
        setLoadError('');
        try {
            // Note: This endpoint (options/associates) doesn't support 'page' parameter
            const data = await callApi(associateApi.getAll, { limit: 100, search: search || undefined });
            
            // Handle both paginated response (standard) or direct array (leads/options)
            const rawItems = Array.isArray(data) ? data : (data.items || []);
            const nextAssociates = rawItems.map(mapAssociateForList);
            
            setAssociates(nextAssociates);
            setTotalRecords(Array.isArray(data) ? rawItems.length : (data.pagination?.total || rawItems.length));
            setSelectedIds((prev) => prev.filter((id) => nextAssociates.some((associate) => associate.id === id)));
        } catch (error) {
            setAssociates([]);
            setTotalRecords(0);
            setLoadError(typeof error === 'object' ? error.message : String(error));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadAssociates(currentPage, itemsPerPage, debouncedSearchTerm);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPage, itemsPerPage, debouncedSearchTerm]);

    const filteredAssociates = associates;
    const totalPages = Math.max(1, Math.ceil(totalRecords / itemsPerPage));
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedAssociates = filteredAssociates.slice(startIndex, startIndex + itemsPerPage);

    const toggleSelectAll = () => {
        if (selectedIds.length === paginatedAssociates.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(paginatedAssociates.map((associate) => associate.id));
        }
    };

    const toggleSelectOne = (id) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter((selectedId) => selectedId !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const handleDelete = async (id) => {
        try {
            setActionState({ error: '', success: '' });
            const deletedAssociate = associates.find((associate) => associate.id === id);
            await callApi(associateApi.delete, id);
            if (selectedProfileAssociate?.id === id) {
                setIsProfileOpen(false);
                setSelectedProfileAssociate(null);
                setProfileHistory([]);
            }
            const nextPage = associates.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage;
            if (nextPage !== currentPage) {
                setCurrentPage(nextPage);
            } else {
                await loadAssociates(nextPage, itemsPerPage, debouncedSearchTerm);
            }
            setActionState({
                error: '',
                success: `${deletedAssociate?.name || 'Associate'} deleted successfully.`,
            });
        } catch (error) {
            setActionState({
                error: error.message || 'Unable to delete associate.',
                success: '',
            });
            throw error;
        }
    };

    const handleEdit = (associate) => {
        setEditingAssociate(associate);
        setIsAddModalOpen(true);
    };

    const handleViewProfile = async (associate) => {
        const baseAssociate = associates.find((item) => item.id === associate.id) || associate;
        setSelectedProfileAssociate(baseAssociate);
        setProfileHistory([]);
        setProfileTab('overview');
        setIsProfileOpen(true);
        try {
            const [details, summary, deals, interactions] = await Promise.all([
                callApi(associateApi.getById, associate.id),
                callApi(associateApi.getSummary, associate.id),
                callApi(associateApi.getDeals, associate.id),
                callApi(associateApi.getInteractions, associate.id),
            ]);
            setSelectedProfileAssociate({
                id: details.id,
                name: details.name,
                email: details.email || '',
                phone: details.phone || '',
                activeDealsCount: summary.activeDealsCount || 0,
                closedDealsCount: summary.closedDealsCount || 0,
                totalValue: summary.revenueWon || 0,
                lastActive: formatLastContacted(summary.lastContactedAt),
                deals: (deals.items || []).map(mapDealForProfile),
            });
            setProfileHistory((interactions.items || []).map(mapInteractionForProfile));
        } catch (error) {
            setProfileHistory([]);
            setActionState({
                error: error.message || 'Unable to load associate profile.',
                success: '',
            });
        }
    };

    const handleSave = async (associateData) => {
        const isEdit = Boolean(editingAssociate);
        const targetName = associateData?.name?.trim() || editingAssociate?.name || 'Associate';

        if (isEdit) {
            await callApi(associateApi.update, editingAssociate.id, associateData);
        } else {
            await callApi(associateApi.create, associateData);
        }

        const reloadPage = isEdit ? currentPage : 1;
        if (!isEdit && currentPage !== 1) {
            setCurrentPage(1);
        }
        await loadAssociates(reloadPage, itemsPerPage, debouncedSearchTerm);

        if (selectedProfileAssociate?.id && editingAssociate?.id === selectedProfileAssociate.id) {
            await handleViewProfile({ id: selectedProfileAssociate.id });
        }

        setActionState({
            error: '',
            success: `${targetName} ${isEdit ? 'updated' : 'created'} successfully.`,
        });
        setIsAddModalOpen(false);
        setEditingAssociate(null);
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
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Associates Management</h1>
                </div>
                <div className="flex items-center gap-3">
                    {selectedIds.length > 0 && (
                        <button
                            onClick={() => setIsBroadcastOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                        >
                            <Mail className="w-4 h-4" />
                            Broadcast ({selectedIds.length})
                        </button>
                    )}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search associates..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="pl-9 pr-4 py-2 border border-slate-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none w-64 dark:text-white"
                        />
                    </div>
                    <button
                        onClick={() => {
                            setEditingAssociate(null);
                            setIsAddModalOpen(true);
                        }}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm flex items-center gap-2"
                    >
                        + New Associate
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden mb-8">
                <div>
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 dark:bg-neutral-900/50 text-slate-500 dark:text-neutral-500 font-medium border-b border-slate-200 dark:border-neutral-800">
                            <tr>
                                <th className="w-12 px-6 py-3">
                                    <label className="relative flex items-center justify-center cursor-pointer p-2 -m-2">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.length === paginatedAssociates.length && paginatedAssociates.length > 0}
                                            onChange={toggleSelectAll}
                                            className="peer sr-only"
                                        />
                                        <div className="w-4 h-4 rounded border border-slate-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 peer-checked:bg-blue-600 dark:peer-checked:bg-blue-500/20 peer-checked:border-blue-600 dark:peer-checked:border-blue-500 transition-all shadow-sm"></div>
                                        <Check className="w-3 h-3 text-white dark:text-blue-500 absolute opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" strokeWidth={3} />
                                    </label>
                                </th>
                                <th className="px-6 py-3">Associate</th>
                                <th className="px-6 py-3">Contact Info</th>
                                <th className="px-6 py-3">Performance</th>
                                <th className="px-6 py-3">Last Contacted On</th>
                                <th className="px-6 py-3 text-right text-transparent">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
                            {paginatedAssociates.map((associate) => (
                                <tr key={associate.id} className="group hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer" onClick={() => handleViewProfile(associate)}>
                                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                        <label className={cn(
                                            "relative flex items-center justify-center cursor-pointer p-2 -m-2 transition-opacity duration-200",
                                            selectedIds.includes(associate.id) ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                                        )}>
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(associate.id)}
                                                onChange={(e) => { e.stopPropagation(); toggleSelectOne(associate.id); }}
                                                className="peer sr-only"
                                            />
                                            <div className="w-4 h-4 rounded border border-slate-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 peer-checked:bg-blue-600 dark:peer-checked:bg-blue-500/20 peer-checked:border-blue-600 dark:peer-checked:border-blue-500 transition-all shadow-sm"></div>
                                            <Check className="w-3 h-3 text-white dark:text-blue-500 absolute opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" strokeWidth={3} />
                                        </label>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs">
                                                {associate.name.charAt(0)}
                                            </div>
                                            <div className="font-semibold text-slate-900 dark:text-white">{associate.name}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            <a href={`mailto:${associate.email}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-2 text-blue-600 hover:underline">
                                                <Mail className="w-3.5 h-3.5" /> {associate.email}
                                            </a>
                                            <div className="flex items-center gap-2 text-slate-500">
                                                <Phone className="w-3.5 h-3.5" /> {associate.phone}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                                                <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                                                <span>{associate.activeDealsCount} Active / {associate.closedDealsCount} Closed</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumSignificantDigits: 3 }).format(associate.totalValue)}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                        {associate.lastActive}
                                    </td>
                                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                        <div className="relative group/menu inline-block">
                                            <button className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-neutral-700 text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 transition-colors">
                                                <MoreHorizontal className="w-4 h-4" />
                                            </button>
                                            <div className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 rounded-lg shadow-xl opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-10 overflow-hidden transform origin-top-right">
                                                <button onClick={() => handleViewProfile(associate)} className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300 font-medium">View Profile</button>
                                                <button onClick={() => handleEdit(associate)} className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300 font-medium">Edit Details</button>
                                                <button onClick={() => setDeleteState({ associate, submitting: false })} className="w-full text-left px-4 py-2 text-xs hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-600 font-medium">Delete</button>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {paginatedAssociates.length === 0 && (
                        <div className="p-8 text-center text-slate-500 dark:text-neutral-400">
                            {isLoading ? 'Loading associates...' : loadError || 'No associates found matching your search.'}
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-900/30 text-xs text-slate-500 dark:text-neutral-400 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <span>
                            Showing {totalRecords === 0 ? 0 : startIndex + 1} to {Math.min(startIndex + itemsPerPage, totalRecords)} of {totalRecords} records
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
                        <div className="flex items-center gap-1 mx-2">
                            {Array.from({ length: totalPages || 1 }, (_, i) => i + 1).map(page => (
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
                        </div>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages || totalPages === 0}
                            className="p-1.5 border border-slate-200 dark:border-neutral-800 rounded bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            <BroadcastModal
                isOpen={isBroadcastOpen}
                onClose={() => setIsBroadcastOpen(false)}
                recipientCount={selectedIds.length}
                recipientSamples={associates.filter(a => selectedIds.includes(a.id)).map(a => a.name)}
            />

            {isProfileOpen && selectedProfileAssociate && createPortal(
                <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-lg bg-white dark:bg-neutral-900 border-l border-slate-200 dark:border-neutral-800 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                        <div className="p-6 border-b border-slate-100 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-900/50">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                                        {selectedProfileAssociate.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">{selectedProfileAssociate.name}</h3>
                                        <div className="flex items-center gap-2 text-sm text-slate-500 mt-0.5">
                                            <Mail className="w-3.5 h-3.5" /> <span className="hover:text-blue-600 cursor-pointer transition-colors">{selectedProfileAssociate.email}</span>
                                        </div>
                                        <div className="flex items-center gap-3 mt-3">
                                            <button
                                                onClick={() => { setMessageChannel('email'); setIsMessageModalOpen(true); }}
                                                className="group flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 shadow-sm hover:shadow-md dark:shadow-none hover:border-blue-300 dark:hover:border-blue-500/50 transition-all cursor-pointer"
                                            >
                                                <div className="w-5 h-5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                    <Mail className="w-3 h-3" />
                                                </div>
                                                <span className="text-xs font-semibold text-slate-600 dark:text-neutral-300 group-hover:text-blue-600 dark:group-hover:text-blue-400">Email</span>
                                            </button>
                                            <button
                                                onClick={() => { setMessageChannel('whatsapp'); setIsMessageModalOpen(true); }}
                                                className="group flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 shadow-sm hover:shadow-md dark:shadow-none hover:border-emerald-300 dark:hover:border-emerald-500/50 transition-all cursor-pointer"
                                            >
                                                <div className="w-5 h-5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                                    <MessageSquare className="w-3 h-3" />
                                                </div>
                                                <span className="text-xs font-semibold text-slate-600 dark:text-neutral-300 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">WhatsApp</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => setIsProfileOpen(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-neutral-800 rounded-full text-slate-400 transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex gap-1 bg-slate-200/50 dark:bg-neutral-800 p-1 rounded-lg">
                                <button
                                    onClick={() => setProfileTab('overview')}
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all",
                                        profileTab === 'overview'
                                            ? "bg-white dark:bg-neutral-700 text-blue-600 dark:text-white shadow-sm"
                                            : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-200"
                                    )}
                                >
                                    <LayoutDashboard className="w-4 h-4" /> Deals
                                </button>
                                <button
                                    onClick={() => setProfileTab('history')}
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all",
                                        profileTab === 'history'
                                            ? "bg-white dark:bg-neutral-700 text-blue-600 dark:text-white shadow-sm"
                                            : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-200"
                                    )}
                                >
                                    <History className="w-4 h-4" /> Interactions
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            <AnimatePresence mode="wait">
                                {profileTab === 'overview' ? (
                                    <motion.div
                                        key="overview"
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        transition={{ duration: 0.2 }}
                                        className="space-y-8"
                                    >
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/50">
                                                <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">Total Active Deals</p>
                                                <p className="text-2xl font-bold text-slate-900 dark:text-white">{selectedProfileAssociate.activeDealsCount}</p>
                                            </div>
                                            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/50">
                                                <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1">Total Revenue Won</p>
                                                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumSignificantDigits: 3 }).format(selectedProfileAssociate.totalValue)}
                                                </p>
                                            </div>
                                        </div>

                                        <div>
                                            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                                <Briefcase className="w-4 h-4 text-blue-500" /> Active Pipeline
                                            </h4>
                                            <div className="space-y-3">
                                                {(selectedProfileAssociate.deals || []).filter(d => d.status === 'Active').length > 0 ? (
                                                    (selectedProfileAssociate.deals || []).filter(d => d.status === 'Active').map(deal => (
                                                        <div key={deal.id} className="p-4 rounded-lg border border-slate-200 dark:border-neutral-700 hover:border-blue-300 dark:hover:border-blue-800 transition-colors bg-white dark:bg-neutral-800">
                                                            <div className="flex justify-between items-start mb-2">
                                                                <p className="font-semibold text-slate-900 dark:text-white text-sm">{deal.title}</p>
                                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">{deal.stage}</span>
                                                            </div>
                                                            <div className="flex items-center justify-between text-xs text-slate-500">
                                                                <span className="flex items-center gap-1">
                                                                    <Building2 className="w-3 h-3" /> {deal.company}
                                                                </span>
                                                                <span className="font-medium text-slate-900 dark:text-white">
                                                                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumSignificantDigits: 3 }).format(deal.value)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="text-center py-6 border-2 border-dashed border-slate-100 dark:border-neutral-700 rounded-xl">
                                                        <p className="text-sm text-slate-400">No active deals found.</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div>
                                            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                                <CheckSquare className="w-4 h-4 text-emerald-500" /> Closed Deals
                                            </h4>
                                            <div className="space-y-3">
                                                {(selectedProfileAssociate.deals || []).filter(d => d.status === 'Closed').length > 0 ? (
                                                    (selectedProfileAssociate.deals || []).filter(d => d.status === 'Closed').map(deal => (
                                                        <div key={deal.id} className="p-4 rounded-lg border border-slate-200 dark:border-neutral-700 bg-slate-50/50 dark:bg-neutral-900/30 opacity-75 hover:opacity-100 transition-opacity">
                                                            <div className="flex justify-between items-start mb-2">
                                                                <p className="font-medium text-slate-700 dark:text-slate-300 text-sm decoration-slate-400">{deal.title}</p>
                                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">Won</span>
                                                            </div>
                                                            <div className="flex items-center justify-between text-xs text-slate-500">
                                                                <span className="flex items-center gap-1">
                                                                    <Building2 className="w-3 h-3" /> {deal.company}
                                                                </span>
                                                                <span className="font-medium text-slate-700 dark:text-slate-300">
                                                                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumSignificantDigits: 3 }).format(deal.value)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="text-center py-6 border-2 border-dashed border-slate-100 dark:border-neutral-700 rounded-xl">
                                                        <p className="text-sm text-slate-400">No closed deals yet.</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="history"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ duration: 0.2 }}
                                        className="relative pl-6 border-l-2 border-slate-200 dark:border-neutral-800 space-y-8 py-2"
                                    >
                                        {profileHistory.map((item) => (
                                            <div key={item.id} className="relative group">
                                                <div className={cn(
                                                    "absolute -left-[31px] top-1 w-4 h-4 rounded-full border-4 border-white dark:border-neutral-900 ring-1",
                                                    item.type === 'email' ? "bg-blue-500 ring-blue-100 dark:ring-blue-900" : "bg-green-500 ring-green-100 dark:ring-green-900"
                                                )}></div>

                                                <div className="flex items-center justify-between mb-1.5">
                                                    <p className="text-xs font-semibold text-slate-500 dark:text-neutral-500">{item.date}</p>
                                                    <div className={cn(
                                                        "flex items-center gap-1.5 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full",
                                                        item.type === 'email' ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                                    )}>
                                                        {item.type === 'email' ? <Mail className="w-3 h-3" /> : <MessageSquare className="w-3 h-3" />}
                                                        {item.type}
                                                    </div>
                                                </div>

                                                <div className="bg-slate-50 dark:bg-neutral-800/50 p-4 rounded-xl border border-slate-100 dark:border-neutral-700/50 hover:border-slate-300 dark:hover:border-neutral-600 transition-colors">
                                                    {item.type === 'email' ? (
                                                        <div className="space-y-2">
                                                            <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{item.subject}</p>
                                                            <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">{item.content}</p>
                                                            {item.hasViewLink && (
                                                                <button className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-1 mt-1 transition-colors">
                                                                    View Email <ExternalLink className="w-3 h-3" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-2">
                                                            <p className="text-sm text-slate-800 dark:text-slate-200 italic">"{item.content}"</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            <AddAssociateModal
                isOpen={isAddModalOpen}
                onClose={() => {
                    setIsAddModalOpen(false);
                    setEditingAssociate(null);
                }}
                onSave={handleSave}
                initialData={editingAssociate}
            />

            <ConfirmDialog
                open={Boolean(deleteState.associate)}
                title="Delete Associate"
                message={
                    deleteState.associate?.name
                        ? `Delete ${deleteState.associate.name}? This action cannot be undone.`
                        : 'Delete this associate? This action cannot be undone.'
                }
                confirmLabel="Delete Associate"
                busy={deleteState.submitting}
                onCancel={() => setDeleteState({ associate: null, submitting: false })}
                onConfirm={async () => {
                    const associate = deleteState.associate;
                    if (!associate?.id) {
                        setDeleteState({ associate: null, submitting: false });
                        return;
                    }

                    setDeleteState({ associate, submitting: true });
                    try {
                        await handleDelete(associate.id);
                    } catch {
                        // Error notice is shown on the page; the dialog should still close.
                    } finally {
                        setDeleteState({ associate: null, submitting: false });
                    }
                }}
            />

            <UserMessageModal
                isOpen={isMessageModalOpen}
                onClose={() => setIsMessageModalOpen(false)}
                contact={selectedProfileAssociate}
                initialChannel={messageChannel}
            />
        </div>
    );
};

