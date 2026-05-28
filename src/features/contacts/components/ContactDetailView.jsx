import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    Building,
    History,
    Mail,
    MessageSquare,
    Phone,
    Trash2,
    User,
    X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { contactApi } from '@/lib/api';
import { callApi } from '@/lib/apiService';
import { UserMessageModal } from './UserMessageModal';

const formatInteractionDate = (value) => {
    if (!value) return 'Unknown date';
    return new Date(value).toLocaleString([], {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
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

export const ContactDetailView = ({ contact, onClose, onEdit, onDelete }) => {
    const [activeTab, setActiveTab] = useState('details');
    const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
    const [messageChannel, setMessageChannel] = useState('email');
    const [detail, setDetail] = useState(contact);
    const [isLoading, setIsLoading] = useState(false);
    const [deleteState, setDeleteState] = useState({ open: false, submitting: false });

    useEffect(() => {
        let ignore = false;

        const loadDetail = async () => {
            if (!contact?.id) {
                setDetail(contact);
                return;
            }

            setIsLoading(true);
            try {
                const data = await callApi(contactApi.getById, contact.id);
                if (!ignore) {
                    setDetail(data);
                }
            } catch {
                if (!ignore) {
                    setDetail(contact);
                }
            } finally {
                if (!ignore) {
                    setIsLoading(false);
                }
            }
        };

        loadDetail();
        setActiveTab('details');

        return () => {
            ignore = true;
        };
    }, [contact]);

    const initials = useMemo(() => {
        const name = detail?.name || detail?.fullName || '';
        return name ? name.charAt(0).toUpperCase() : 'C';
    }, [detail]);

    if (!contact) return null;

    return createPortal(
        <>
            <div className="fixed inset-0 z-[100] flex justify-end bg-black/20 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
                <div className="w-full max-w-lg bg-white dark:bg-neutral-900 border-l border-slate-200 dark:border-neutral-800 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300" onClick={(event) => event.stopPropagation()}>
                    <div className="p-6 border-b border-slate-100 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-900/50">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                                    {initials}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">{detail?.name || detail?.fullName || 'Contact'}</h3>
                                    <div className="flex flex-col gap-1 mt-0.5">
                                        <div className="flex items-center gap-2 text-sm text-slate-500">
                                            <Mail className="w-3.5 h-3.5" /> <span>{detail?.email || 'No email'}</span>
                                        </div>
                                        <div className="flex items-center gap-3 mt-3">
                                            <button
                                                onClick={() => { setMessageChannel('email'); setIsMessageModalOpen(true); }}
                                                className="group flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 shadow-sm hover:shadow-md dark:shadow-none hover:border-blue-300 dark:hover:border-blue-500/50 transition-all"
                                            >
                                                <Mail className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                                                <span className="text-xs font-semibold text-slate-600 dark:text-neutral-300">Email</span>
                                            </button>
                                            <button
                                                onClick={() => { setMessageChannel('whatsapp'); setIsMessageModalOpen(true); }}
                                                className="group flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 shadow-sm hover:shadow-md dark:shadow-none hover:border-emerald-300 dark:hover:border-emerald-500/50 transition-all"
                                            >
                                                <MessageSquare className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                                <span className="text-xs font-semibold text-slate-600 dark:text-neutral-300">WhatsApp</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex gap-1 bg-slate-200/50 dark:bg-neutral-800 p-1 rounded-lg">
                            <button
                                onClick={() => setActiveTab('details')}
                                className={cn(
                                    "flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all",
                                    activeTab === 'details'
                                        ? "bg-white dark:bg-neutral-700 text-blue-600 dark:text-white shadow-sm"
                                        : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-200"
                                )}
                            >
                                <User className="w-4 h-4" /> Details
                            </button>
                            <button
                                onClick={() => setActiveTab('interactions')}
                                className={cn(
                                    "flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all",
                                    activeTab === 'interactions'
                                        ? "bg-white dark:bg-neutral-700 text-blue-600 dark:text-white shadow-sm"
                                        : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-200"
                                )}
                            >
                                <History className="w-4 h-4" /> Interactions
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        {isLoading ? (
                            <div className="text-sm text-slate-500 dark:text-neutral-400">Loading contact details...</div>
                        ) : (
                            <AnimatePresence mode="wait">
                                {activeTab === 'details' ? (
                                    <motion.div
                                        key="details"
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        transition={{ duration: 0.2 }}
                                        className="space-y-6"
                                    >
                                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-slate-100 dark:border-neutral-700">
                                            <div className="space-y-4">
                                                <div>
                                                    <p className="text-xs font-bold text-slate-400 dark:text-neutral-500 mb-1">Company & Role</p>
                                                    <div className="flex items-center gap-2">
                                                        <Building className="w-4 h-4 text-slate-400 dark:text-neutral-500" />
                                                        <span className="font-semibold text-slate-900 dark:text-white">{detail?.companyName || detail?.company?.name || 'No company'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <User className="w-4 h-4 text-slate-400 dark:text-neutral-500" />
                                                        <span className="text-sm text-slate-600 dark:text-neutral-300">{detail?.title || 'No role recorded'}</span>
                                                    </div>
                                                </div>
                                                <div className="w-full h-px bg-slate-200 dark:bg-neutral-700" />
                                                <div>
                                                    <p className="text-xs font-bold text-slate-400 dark:text-neutral-500 mb-1">Contact Info</p>
                                                    <div className="flex items-center gap-2">
                                                        <Phone className="w-4 h-4 text-slate-400 dark:text-neutral-500" />
                                                        <span className="text-sm text-slate-700 dark:text-neutral-300">{detail?.phone || 'No phone'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <Mail className="w-4 h-4 text-slate-400 dark:text-neutral-500" />
                                                        <span className="text-sm text-slate-700 dark:text-neutral-300">{detail?.email || 'No email'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-slate-100 dark:border-neutral-700">
                                            <p className="text-xs font-bold text-slate-400 dark:text-neutral-500 mb-2">Notes</p>
                                            <p className="text-sm text-slate-500 dark:text-neutral-400 italic">{detail?.notes || 'No notes recorded for this contact.'}</p>
                                        </div>

                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="interactions"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ duration: 0.2 }}
                                        className="space-y-4"
                                    >
                                        {(detail?.interactions || []).length ? (
                                            detail.interactions.map((interaction) => (
                                                <div key={interaction.id} className="rounded-xl border border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800/50 p-4">
                                                    <div className="flex items-center justify-between gap-4">
                                                        <div>
                                                            <p className="text-sm font-semibold text-slate-900 dark:text-white">{interaction.label}</p>
                                                            <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">{interaction.summary}</p>
                                                        </div>
                                                        <div className="text-[11px] font-medium text-slate-400 dark:text-neutral-500 text-right">
                                                            {formatInteractionDate(interaction.at)}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-sm text-slate-500 dark:text-neutral-400">No interactions recorded yet.</div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        )}
                    </div>
                </div>
            </div>
            <UserMessageModal
                isOpen={isMessageModalOpen}
                onClose={() => setIsMessageModalOpen(false)}
                contact={detail}
                initialChannel={messageChannel}
            />
            <ConfirmDialog
                open={deleteState.open}
                title="Delete Contact"
                message={
                    detail?.name
                        ? `Delete ${detail.name}? This action cannot be undone.`
                        : 'Delete this contact? This action cannot be undone.'
                }
                confirmLabel="Delete Contact"
                busy={deleteState.submitting}
                onCancel={() => setDeleteState({ open: false, submitting: false })}
                onConfirm={async () => {
                    setDeleteState({ open: true, submitting: true });
                    try {
                        await onDelete?.(detail.id);
                    } finally {
                        setDeleteState({ open: false, submitting: false });
                    }
                }}
            />
        </>,
        document.body
    );
};
