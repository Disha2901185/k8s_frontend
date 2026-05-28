import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    AlertCircle,
    Building2,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Mail,
    MoreHorizontal,
    Phone,
    Search,
    Trash2,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { AddContactDrawer } from '../components/AddContactDrawer';
import { ContactDetailView } from '../components/ContactDetailView';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { contactApi } from '@/lib/api';
import { callApi } from '@/lib/apiService';

const Notice = ({ tone = 'info', children }) => {
    const toneMap = {
        error: 'border-rose-200 bg-rose-50/80 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300',
        success: 'border-emerald-200 bg-emerald-50/80 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300',
        info: 'border-slate-200 bg-slate-50/80 text-slate-700 dark:border-neutral-700 dark:bg-neutral-800/70 dark:text-neutral-300',
    };

    return <div className={`${toneMap[tone] || toneMap.info} rounded-2xl border px-4 py-3 text-sm leading-6`}>{children}</div>;
};

const formatLastContacted = (value) => {
    if (!value) return 'Never';
    return new Date(value).toLocaleDateString([], {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
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
                        <Trash2 className="h-4 w-4" />
                        {busy ? 'Deleting...' : confirmLabel}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export const ContactsPage = () => {
    const [contacts, setContacts] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [actionState, setActionState] = useState({ error: '', success: '' });
    const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
    const [editingContact, setEditingContact] = useState(null);
    const [selectedContact, setSelectedContact] = useState(null);
    const [deleteState, setDeleteState] = useState({ contact: null, submitting: false });
    const [menuState, setMenuState] = useState({ contact: null, top: 0, left: 0 });
    const menuCloseTimeoutRef = useRef(null);

    const clearMenuCloseTimeout = () => {
        if (menuCloseTimeoutRef.current) {
            window.clearTimeout(menuCloseTimeoutRef.current);
            menuCloseTimeoutRef.current = null;
        }
    };

    const scheduleMenuClose = () => {
        clearMenuCloseTimeout();
        menuCloseTimeoutRef.current = window.setTimeout(() => {
            setMenuState({ contact: null, top: 0, left: 0 });
        }, 120);
    };

    const openMenu = (contact, element) => {
        clearMenuCloseTimeout();
        const rect = element.getBoundingClientRect();
        setMenuState({
            contact,
            top: rect.bottom + 6,
            left: rect.right - 128,
        });
    };

    useEffect(() => {
        if (!menuState.contact) {
            return undefined;
        }

        const handleClose = () => setMenuState({ contact: null, top: 0, left: 0 });
        window.addEventListener('click', handleClose);
        window.addEventListener('resize', handleClose);
        window.addEventListener('scroll', handleClose, true);

        return () => {
            window.removeEventListener('click', handleClose);
            window.removeEventListener('resize', handleClose);
            window.removeEventListener('scroll', handleClose, true);
        };
    }, [menuState.contact]);

    useEffect(() => () => clearMenuCloseTimeout(), []);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => setDebouncedSearch(searchTerm.trim()), 250);
        return () => window.clearTimeout(timeoutId);
    }, [searchTerm]);

    const loadContacts = async (page = pagination.page, limit = pagination.limit, search = debouncedSearch) => {
        setIsLoading(true);
        setError('');

        try {
            const data = await callApi(contactApi.getAll, { page, limit, search: search || undefined });
            setContacts(data.items || []);
            setPagination(data.pagination || { page, limit, total: 0, totalPages: 1 });
        } catch (nextError) {
            setContacts([]);
            setError(nextError.message || 'Unable to load contacts.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadContacts(1, pagination.limit, debouncedSearch);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearch]);

    useEffect(() => {
        loadContacts(pagination.page, pagination.limit, debouncedSearch);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pagination.page, pagination.limit]);

    const paginatedContacts = useMemo(() => contacts, [contacts]);

    const handleEdit = (contact) => {
        setSelectedContact(null);
        setEditingContact(contact);
        setIsAddDrawerOpen(true);
    };

    const handleDelete = async (id) => {
        try {
            setActionState({ error: '', success: '' });
            const deletedContact = contacts.find((contact) => contact.id === id);
            await callApi(contactApi.delete, id);
            if (selectedContact?.id === id) {
                setSelectedContact(null);
            }

            const nextPage = contacts.length === 1 && pagination.page > 1 ? pagination.page - 1 : pagination.page;
            await loadContacts(nextPage, pagination.limit, debouncedSearch);
            setActionState({
                error: '',
                success: `${deletedContact?.name || 'Contact'} deleted successfully.`,
            });
        } catch (nextError) {
            const message = nextError.message || 'Unable to delete contact.';
            setError(message);
            setActionState({ error: message, success: '' });
        }
    };

    const handleSaved = async (savedContact) => {
        const isEdit = Boolean(editingContact?.id);
        setActionState({
            error: '',
            success: `${savedContact?.name || savedContact?.fullName || 'Contact'} ${isEdit ? 'updated' : 'created'} successfully.`,
        });
        setEditingContact(null);
        setIsAddDrawerOpen(false);
        await loadContacts(pagination.page, pagination.limit, debouncedSearch);
    };

    const totalPages = Math.max(1, pagination.totalPages || 1);
    const startIndex = pagination.total ? (pagination.page - 1) * pagination.limit + 1 : 0;
    const endIndex = Math.min(pagination.page * pagination.limit, pagination.total || 0);

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
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Contacts Directory</h1>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search contacts..."
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            className="pl-9 pr-4 py-2 border border-slate-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none w-64 dark:text-white"
                        />
                    </div>
                    <button
                        onClick={() => {
                            setEditingContact(null);
                            setIsAddDrawerOpen(true);
                        }}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                    >
                        + New Contact
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-slate-200 dark:border-neutral-800 shadow-sm overflow-visible">
                <div className="overflow-x-auto rounded-t-xl">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 dark:bg-neutral-900/50 text-slate-500 dark:text-neutral-500 font-medium border-b border-slate-200 dark:border-neutral-800">
                            <tr>
                                <th className="px-6 py-3">Name & Role</th>
                                <th className="px-6 py-3">Company</th>
                                <th className="px-6 py-3">Contact Info</th>
                                <th className="px-6 py-3">Last Contacted</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
                            {paginatedContacts.map((contact) => (
                                <tr key={contact.id} className="group hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer" onClick={() => setSelectedContact(contact)}>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs">
                                                {(contact.name || 'C').charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="font-semibold text-slate-900 dark:text-white">{contact.name}</div>
                                                <div className="text-xs text-slate-500 dark:text-slate-400">{contact.title || 'No role recorded'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                            {contact.companyName || 'No company'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            <span className="flex items-center gap-2 text-blue-600">
                                                <Mail className="w-3.5 h-3.5" /> {contact.email || 'No email'}
                                            </span>
                                            <span className="flex items-center gap-2 text-slate-500">
                                                <Phone className="w-3.5 h-3.5" /> {contact.phone || 'No phone'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                        {formatLastContacted(contact.lastContactedAt)}
                                    </td>
                                    <td className="px-6 py-4 text-right" onClick={(event) => event.stopPropagation()}>
                                        <div
                                            className="inline-block"
                                            onMouseEnter={(event) => openMenu(contact, event.currentTarget)}
                                            onMouseLeave={scheduleMenuClose}
                                        >
                                            <button
                                                onMouseEnter={(event) => openMenu(contact, event.currentTarget)}
                                                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                                            >
                                                <MoreHorizontal className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {!isLoading && !paginatedContacts.length && (
                        <div className="p-8 text-center text-slate-500 dark:text-neutral-400">
                            {error || 'No contacts found matching your search.'}
                        </div>
                    )}

                    {isLoading && (
                        <div className="p-8 text-center text-slate-500 dark:text-neutral-400">
                            Loading contacts...
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-900/30 text-xs text-slate-500 dark:text-neutral-400 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <span>
                            Showing {startIndex} to {endIndex} of {pagination.total || 0} records
                        </span>
                        <div className="flex items-center gap-2 border-l border-slate-200 dark:border-neutral-800 pl-4">
                            <span>Rows per page:</span>
                            <div className="w-[70px]">
                                <CustomSelect
                                    value={pagination.limit}
                                    onChange={(value) => setPagination((prev) => ({ ...prev, page: 1, limit: Number(value) }))}
                                    options={[10, 25, 50, 100].map((size) => ({ value: size, label: size.toString() }))}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPagination((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                            disabled={pagination.page === 1}
                            className="p-1.5 border border-slate-200 dark:border-neutral-800 rounded bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <div className="flex items-center gap-1 mx-2">
                            <span className="font-medium text-slate-900 dark:text-white">{pagination.page}</span>
                            <span>of</span>
                            <span>{totalPages}</span>
                        </div>
                        <button
                            onClick={() => setPagination((prev) => ({ ...prev, page: Math.min(totalPages, prev.page + 1) }))}
                            disabled={pagination.page >= totalPages}
                            className="p-1.5 border border-slate-200 dark:border-neutral-800 rounded bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            <AddContactDrawer
                isOpen={isAddDrawerOpen}
                onClose={() => {
                    setIsAddDrawerOpen(false);
                    setEditingContact(null);
                }}
                contact={editingContact}
                onSaved={handleSaved}
            />

            {selectedContact && (
                <ContactDetailView
                    contact={selectedContact}
                    onClose={() => setSelectedContact(null)}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                />
            )}

            {menuState.contact && createPortal(
                <div
                    className="fixed z-[140] w-32 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 rounded-lg shadow-xl overflow-hidden"
                    style={{ top: menuState.top, left: menuState.left }}
                    onClick={(event) => event.stopPropagation()}
                    onMouseEnter={clearMenuCloseTimeout}
                    onMouseLeave={scheduleMenuClose}
                >
                    <button
                        onClick={() => {
                            setSelectedContact(menuState.contact);
                            setMenuState({ contact: null, top: 0, left: 0 });
                        }}
                        className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300 font-medium"
                    >
                        View Profile
                    </button>
                    <button
                        onClick={() => {
                            handleEdit(menuState.contact);
                            setMenuState({ contact: null, top: 0, left: 0 });
                        }}
                        className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300 font-medium"
                    >
                        Edit Profile
                    </button>
                    <button
                        onClick={() => {
                            setDeleteState({ contact: menuState.contact, submitting: false });
                            setMenuState({ contact: null, top: 0, left: 0 });
                        }}
                        className="w-full text-left px-4 py-2 text-xs hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-600 font-medium"
                    >
                        Delete
                    </button>
                </div>,
                document.body
            )}

            <ConfirmDialog
                open={Boolean(deleteState.contact)}
                title="Delete Contact"
                message={
                    deleteState.contact?.name
                        ? `Delete ${deleteState.contact.name}? This action cannot be undone.`
                        : 'Delete this contact? This action cannot be undone.'
                }
                confirmLabel="Delete Contact"
                busy={deleteState.submitting}
                onCancel={() => setDeleteState({ contact: null, submitting: false })}
                onConfirm={async () => {
                    const contact = deleteState.contact;
                    if (!contact?.id) return;

                    setDeleteState({ contact, submitting: true });
                    try {
                        await handleDelete(contact.id);
                        setDeleteState({ contact: null, submitting: false });
                    } catch {
                        setDeleteState({ contact, submitting: false });
                    }
                }}
            />
        </div>
    );
};
