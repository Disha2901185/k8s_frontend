import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Building2, Loader2, Trash2 } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { companyApi, contactApi } from '@/lib/api';
import { callApi } from '@/lib/apiService';
import { AddContactDrawer } from '@/features/contacts/components/AddContactDrawer';
import { AddDealDrawer } from '@/features/sales/pipeline/components/DealSlideout/AddDealDrawer';
import { getCompanyErrorMessage } from '../companyFormSchema';
import { CompanyDetailLayout } from '../components/layout/CompanyDetailLayout';

const PageState = ({ icon, title, description, tone = 'default' }) => {
    const IconComponent = icon;
    const toneClass = tone === 'error'
        ? 'border-rose-200 bg-rose-50/80 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300'
        : 'border-slate-200 bg-white text-slate-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300';

    return (
        <div className="h-screen flex items-center justify-center bg-white dark:bg-black px-6">
            <div className={`w-full max-w-lg rounded-3xl border p-8 shadow-sm ${toneClass}`}>
                <div className="flex items-start gap-4">
                    <div className="mt-0.5 rounded-2xl bg-white/70 p-3 dark:bg-black/20">
                        <IconComponent className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold">{title}</h1>
                        <p className="mt-2 text-sm leading-6 opacity-90">{description}</p>
                    </div>
                </div>
            </div>
        </div>
    );
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

const NOTES_STORAGE_PREFIX = 'company-workspace-notes';

const toCompanyDealPayload = (payload) => {
    const companyDealPayload = { ...payload };
    delete companyDealPayload.companyId;
    delete companyDealPayload.companyName;
    delete companyDealPayload.primaryContactEmail;
    delete companyDealPayload.primaryContactPhone;
    delete companyDealPayload.associateEmail;
    delete companyDealPayload.associatePhone;

    return companyDealPayload;
};

const NoteDialog = ({ open, busy, note, onClose, onSave }) => {
    const [title, setTitle] = useState(note?.title || '');
    const [content, setContent] = useState(note?.content || '');

    if (!open) return null;

    const handleSubmit = async (event) => {
        event.preventDefault();
        await onSave({
            ...note,
            title: title.trim() || 'Note',
            content: content.trim(),
        });
    };

    return createPortal(
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 px-4 backdrop-blur-sm">
            <form
                onSubmit={handleSubmit}
                className="w-full max-w-xl rounded-[24px] border border-slate-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-950"
            >
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h3 className="text-xl font-semibold text-slate-950 dark:text-white">
                            {note?.id ? 'Edit Note' : 'Add Note'}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-neutral-400">
                            Notes are stored locally in this browser for this company workspace.
                        </p>
                    </div>
                </div>

                <div className="mt-6 space-y-4">
                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-neutral-300">Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(event) => setTitle(event.target.value)}
                            placeholder="Enter note title"
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
                        />
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-neutral-300">Note</label>
                        <textarea
                            value={content}
                            onChange={(event) => setContent(event.target.value)}
                            placeholder="Write note details"
                            rows={6}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
                        />
                    </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={busy}
                        className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={busy || !content.trim()}
                        className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-60 dark:bg-blue-500 dark:hover:bg-blue-400"
                    >
                        {busy ? 'Saving...' : 'Save Note'}
                    </button>
                </div>
            </form>
        </div>,
        document.body
    );
};

export const CompanyDetailPage = () => {
    const { id } = useParams();
    const [company, setCompany] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [isAddContactOpen, setIsAddContactOpen] = useState(false);
    const [editingContact, setEditingContact] = useState(null);
    const [isAddDealOpen, setIsAddDealOpen] = useState(false);
    const [editingDeal, setEditingDeal] = useState(null);
    const [deleteState, setDeleteState] = useState({ contact: null, submitting: false });
    const [deleteDealState, setDeleteDealState] = useState({ deal: null, submitting: false });
    const [companyNotes, setCompanyNotes] = useState([]);
    const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
    const [editingNote, setEditingNote] = useState(null);
    const [isSavingNote, setIsSavingNote] = useState(false);

    const notesStorageKey = id ? `${NOTES_STORAGE_PREFIX}:${id}` : null;

    const buildCompanyPayload = (companyRecord, updates = {}) => ({
        name: updates.name ?? companyRecord.name ?? '',
        industry: updates.industry ?? companyRecord.industry ?? '',
        phone: updates.phone ?? companyRecord.phone ?? '',
        website: updates.website ?? companyRecord.website ?? '',
        status: updates.status ?? companyRecord.status ?? 'Prospect',
        taxId: updates.taxId ?? companyRecord.taxId ?? companyRecord.gstIn ?? '',
        paymentTerms: updates.paymentTerms ?? companyRecord.paymentTerms ?? '',
        currency: updates.currency ?? companyRecord.currency ?? '',
        billingStreet: updates.billingStreet ?? companyRecord.billingStreet ?? companyRecord.address?.line1 ?? '',
        billingCity: updates.billingCity ?? companyRecord.billingCity ?? companyRecord.address?.city ?? '',
        billingState: updates.billingState ?? companyRecord.billingState ?? companyRecord.address?.state ?? '',
        billingCountry: updates.billingCountry ?? companyRecord.billingCountry ?? companyRecord.address?.country ?? '',
        billingZip: updates.billingZip ?? companyRecord.billingZip ?? companyRecord.address?.pincode ?? '',
        placeOfSupply: updates.placeOfSupply ?? companyRecord.placeOfSupply ?? '',
    });

    const loadCompany = async (companyId, isMounted = true, showLoader = true) => {
        if (!companyId) {
            if (!isMounted) return;
            setCompany(null);
            setLoadError('Company ID is missing.');
            if (showLoader) setIsLoading(false);
            return;
        }

        if (showLoader) setIsLoading(true);
        setLoadError('');

        try {
            const response = await callApi(companyApi.getById, companyId);
            if (!isMounted) return;
            setCompany(response ?? null);
        } catch (error) {
            if (!isMounted) return;
            setCompany(null);
            setLoadError(getCompanyErrorMessage(error, 'Unable to load company details.'));
        } finally {
            if (isMounted) {
                if (showLoader) setIsLoading(false);
            }
        }
    };

    useEffect(() => {
        let isMounted = true;
        loadCompany(id, isMounted);

        return () => {
            isMounted = false;
        };
    }, [id]);

    useEffect(() => {
        if (!notesStorageKey) {
            setCompanyNotes([]);
            return;
        }

        try {
            const raw = window.localStorage.getItem(notesStorageKey);
            const parsed = raw ? JSON.parse(raw) : [];
            setCompanyNotes(Array.isArray(parsed) ? parsed : []);
        } catch {
            setCompanyNotes([]);
        }
    }, [notesStorageKey]);

    const persistCompanyNotes = (nextNotes) => {
        setCompanyNotes(nextNotes);
        if (!notesStorageKey) return;
        window.localStorage.setItem(notesStorageKey, JSON.stringify(nextNotes));
    };

    const handleAction = async (actionType, payload) => {
        if (actionType === 'create_contact') {
            setEditingContact(null);
            setIsAddContactOpen(true);
            return;
        }

        if (actionType === 'edit_contact' && payload?.id) {
            setEditingContact(payload);
            setIsAddContactOpen(true);
            return;
        }

        if (actionType === 'create_deal') {
            setEditingDeal(null);
            setIsAddDealOpen(true);
            return;
        }

        if (actionType === 'edit_deal' && payload?.id) {
            setEditingDeal(payload);
            setIsAddDealOpen(true);
            return;
        }

        if (actionType === 'delete_contact' && payload?.id) {
            setDeleteState({ contact: payload, submitting: false });
            return;
        }

        if (actionType === 'delete_deal' && payload?.id) {
            setDeleteDealState({ deal: payload, submitting: false });
            return;
        }

        if (actionType === 'create_note') {
            setEditingNote(null);
            setIsNoteDialogOpen(true);
            return;
        }

        if (actionType === 'edit_note' && payload?.id) {
            setEditingNote(payload);
            setIsNoteDialogOpen(true);
            return;
        }

        if (actionType === 'delete_note' && payload?.id) {
            persistCompanyNotes(companyNotes.filter((note) => note.id !== payload.id));
            return;
        }

        console.log('Action triggered:', actionType);
    };

    if (isLoading) {
        return (
            <PageState
                icon={Loader2}
                title="Loading company"
                description="Fetching company details and related records for this workspace."
            />
        );
    }

    if (loadError) {
        return (
            <PageState
                icon={AlertCircle}
                title="Unable to load company"
                description={loadError}
                tone="error"
            />
        );
    }

    if (!company) {
        return (
            <PageState
                icon={Building2}
                title="Company not available"
                description="No company data was returned for the selected record."
            />
        );
    }

    const workspaceNotes = [...companyNotes, ...(company.activities || [])]
        .sort((left, right) => new Date(right.date || right.updatedAt || 0).getTime() - new Date(left.date || left.updatedAt || 0).getTime());

    return (
        <>
            <CompanyDetailLayout
                key={company.id}
                company={{ ...company, notes: workspaceNotes }}
                onAction={handleAction}
                onUpdateCompany={async (updates) => {
                    try {
                        const payload = buildCompanyPayload(company, updates);
                        await callApi(companyApi.update, company.id, payload);
                        await loadCompany(id, true, false);
                    } catch (error) {
                        setLoadError(getCompanyErrorMessage(error, 'Unable to update company.'));
                        throw error;
                    }
                }}
            />
            <NoteDialog
                key={`${isNoteDialogOpen ? 'open' : 'closed'}-${editingNote?.id || 'new'}`}
                open={isNoteDialogOpen}
                busy={isSavingNote}
                note={editingNote}
                onClose={() => {
                    setIsNoteDialogOpen(false);
                    setEditingNote(null);
                }}
                onSave={async (noteInput) => {
                    setIsSavingNote(true);
                    try {
                        const timestamp = new Date().toISOString();
                        const nextNote = {
                            id: noteInput.id || `note-${Date.now()}`,
                            title: noteInput.title,
                            content: noteInput.content,
                            date: noteInput.date || timestamp,
                            updatedAt: timestamp,
                        };

                        const nextNotes = noteInput.id
                            ? companyNotes.map((item) => (item.id === noteInput.id ? nextNote : item))
                            : [nextNote, ...companyNotes];

                        persistCompanyNotes(nextNotes);
                        setIsNoteDialogOpen(false);
                        setEditingNote(null);
                    } finally {
                        setIsSavingNote(false);
                    }
                }}
            />
            <AddContactDrawer
                isOpen={isAddContactOpen}
                onClose={() => {
                    setIsAddContactOpen(false);
                    setEditingContact(null);
                }}
                contact={editingContact}
                lockedCompany={{ id: company.id, name: company.name }}
                onSaved={async () => {
                    setIsAddContactOpen(false);
                    setEditingContact(null);
                    await loadCompany(id, true, false);
                }}
            />
            <AddDealDrawer
                isOpen={isAddDealOpen}
                onClose={() => {
                    setIsAddDealOpen(false);
                    setEditingDeal(null);
                }}
                deal={editingDeal}
                lockedCompany={{ id: company.id, name: company.name }}
                onSubmit={async (payload) => {
                    const companyDealPayload = toCompanyDealPayload(payload);
                    if (editingDeal?.id) {
                        await callApi(companyApi.updateDeal, company.id, editingDeal.id, companyDealPayload);
                    } else {
                        await callApi(companyApi.createDeal, company.id, companyDealPayload);
                    }
                    await loadCompany(id, true, false);
                }}
            />
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
                        await callApi(contactApi.delete, contact.id);
                        setDeleteState({ contact: null, submitting: false });
                        await loadCompany(id, true, false);
                    } catch (error) {
                        setDeleteState({ contact, submitting: false });
                        setLoadError(getCompanyErrorMessage(error, 'Unable to delete contact.'));
                    }
                }}
            />
            <ConfirmDialog
                open={Boolean(deleteDealState.deal)}
                title="Delete Deal"
                message={
                    deleteDealState.deal?.title
                        ? `Delete ${deleteDealState.deal.title}? This action cannot be undone.`
                        : 'Delete this deal? This action cannot be undone.'
                }
                confirmLabel="Delete Deal"
                busy={deleteDealState.submitting}
                onCancel={() => setDeleteDealState({ deal: null, submitting: false })}
                onConfirm={async () => {
                    const deal = deleteDealState.deal;
                    if (!deal?.id) return;

                    setDeleteDealState({ deal, submitting: true });
                    try {
                        await callApi(companyApi.deleteDeal, company.id, deal.id);
                        setDeleteDealState({ deal: null, submitting: false });
                        await loadCompany(id, true, false);
                    } catch (error) {
                        setDeleteDealState({ deal, submitting: false });
                        setLoadError(getCompanyErrorMessage(error, 'Unable to delete deal.'));
                    }
                }}
            />
        </>
    );
};
