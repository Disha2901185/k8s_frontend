import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/features/auth/context/AuthContext';
import {
    Search, Filter, Mail, MessageSquare, Calendar, X,
    MoreHorizontal, ChevronLeft, ChevronRight, Magnet,
    Globe, FileText, Video, MessageCircle, User, Building,
    ArrowRight, CheckCircle, Archive, Trash2, Clock, Phone,
    Bot, Download, AtSign, UserPlus, CheckCircle2, Check, ChevronUp, ChevronDown,
    ShieldAlert, Plus, Loader2
} from 'lucide-react';
import { Icon } from '@iconify/react';
import { cn } from '@/lib/utils';

import { AddDealDrawer } from '../../pipeline/components/DealSlideout/AddDealDrawer';
import { QuickCreateContactModal } from '@/features/contacts/components/QuickCreateContactModal';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { SmartSelect } from '@/components/ui/SmartSelect';
import { leadApi } from '@/lib/api';
import { callApi } from '@/lib/apiService';

// --- Constants & Enums (Synced with Backend) ---

const LEAD_SOURCES = {
    WEB_FORM: 'WEB_FORM',
    AI_ASSISTANT: 'AI_ASSISTANT',
    WHATSAPP: 'WHATSAPP',
    RESOURCE_DOWNLOAD: 'RESOURCE_DOWNLOAD',
    EVENT_REGISTRATION: 'EVENT_REGISTRATION',
    EMAIL_INQUIRY: 'EMAIL_INQUIRY',
    LINKEDIN: 'LINKEDIN'
};

const LEAD_STATUS = {
    NEW: 'NEW',
    QUALIFIED: 'QUALIFIED',
    ARCHIVED: 'ARCHIVED',
    CONTACTED: 'CONTACTED'
};

const MotionDiv = motion.div;

// --- Helpers ---

const timeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return Math.floor(seconds) + " seconds ago";
};


// --- Components ---

// --- Components ---

const SourceIcon = ({ source }) => {
    switch (source) {
        case LEAD_SOURCES.WEB_FORM: return <Globe className="w-4 h-4 text-blue-500" />;
        case LEAD_SOURCES.AI_ASSISTANT: return <Bot className="w-4 h-4 text-purple-500" />;
        case LEAD_SOURCES.WHATSAPP: return <Icon icon="logos:whatsapp-icon" className="w-4 h-4" />;
        case LEAD_SOURCES.RESOURCE_DOWNLOAD: return <Download className="w-4 h-4 text-orange-500" />;
        case LEAD_SOURCES.EVENT_REGISTRATION: return <Video className="w-4 h-4 text-red-500" />;
        case LEAD_SOURCES.EMAIL_INQUIRY: return <AtSign className="w-4 h-4 text-indigo-500" />;
        case LEAD_SOURCES.LINKEDIN: return <Icon icon="logos:linkedin-icon" className="w-4 h-4" />;
        default: return <User className="w-4 h-4 text-slate-400" />;
    }
};

const StatusBadge = ({ status }) => {
    const styles = {
        [LEAD_STATUS.NEW]: 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
        [LEAD_STATUS.QUALIFIED]: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
        [LEAD_STATUS.ARCHIVED]: 'bg-gray-100 text-gray-600 dark:bg-neutral-800 dark:text-neutral-400',
        [LEAD_STATUS.CONTACTED]: 'bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
    };
    return (
        <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-bold", styles[status])}>
            {status.charAt(0) + status.slice(1).toLowerCase()}
        </span>
    );
};

const ConfirmDialog = ({ open, title, message, confirmLabel, busy, onCancel, onConfirm }) => {
    if (!open) return null;

    return createPortal(
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 px-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-[24px] border border-slate-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-950 text-left">
                <div className="flex items-start gap-4">
                    <div className="inline-flex rounded-2xl bg-rose-50 p-3 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300 shrink-0">
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
                        className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={busy}
                        className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-rose-500 disabled:opacity-60 dark:bg-rose-500 dark:hover:bg-rose-400 transition-colors shadow-sm"
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

const getLeadFormDefaults = (lead) => ({
    name: lead?.name || '',
    email: lead?.email || '',
    phone: lead?.phone || '',
    companyId: lead?.companyId || '',
    companyName: lead?.company || '',
    subject: lead?.details?.subject || lead?.subject || '',
    messagePreview: lead?.details?.message || lead?.messagePreview || '',
    status: lead?.status || LEAD_STATUS.NEW,
});

const LeadFormModal = ({ open, lead, busy, error, onClose, onSave }) => {
    const [formData, setFormData] = useState(() => getLeadFormDefaults(lead));
    const [companySearch, setCompanySearch] = useState('');
    const [companyOptions, setCompanyOptions] = useState([]);
    const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);
    const [isCreatingCompany, setIsCreatingCompany] = useState(false);

    useEffect(() => {
        if (!open) return undefined;
        let ignore = false;
        const timer = window.setTimeout(async () => {
            setIsLoadingCompanies(true);
            try {
                const response = await callApi(leadApi.listCompanies, {
                    search: companySearch.trim() || undefined,
                    limit: 20,
                });
                if (!ignore) {
                    setCompanyOptions(Array.isArray(response) ? response : []);
                }
            } catch {
                if (!ignore) {
                    setCompanyOptions([]);
                }
            } finally {
                if (!ignore) {
                    setIsLoadingCompanies(false);
                }
            }
        }, 200);

        return () => {
            ignore = true;
            window.clearTimeout(timer);
        };
    }, [open, companySearch]);

    const updateField = (field) => (event) => {
        setFormData((current) => ({ ...current, [field]: event.target.value }));
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        onSave(formData);
    };

    if (!open) return null;

    return createPortal(
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
            <form
                onSubmit={handleSubmit}
                className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-950"
            >
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 dark:border-neutral-800">
                    <div>
                        <h2 className="text-lg font-bold text-slate-950 dark:text-white">{lead ? 'Edit Lead' : 'Add Lead'}</h2>
                        <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">Manage lead details before converting to contact or deal.</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={busy}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-60 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
                    <div className="space-y-2">
                        <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-neutral-400">Lead Name</label>
                        <input value={formData.name} onChange={updateField('name')} className={leadInputClasses} placeholder="Full name" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-neutral-400">Company</label>
                        <SmartSelect
                            icon={Building}
                            placeholder={isLoadingCompanies ? 'Loading companies...' : 'Search or create company'}
                            options={[...new Set([
                                ...companyOptions.map((company) => company.name).filter(Boolean),
                                formData.companyName,
                            ].filter(Boolean))]}
                            value={formData.companyName}
                            onChange={(value) => {
                                const matched = companyOptions.find((company) => company.name === value);
                                setFormData((current) => ({
                                    ...current,
                                    companyName: value,
                                    companyId: matched?.id || '',
                                }));
                                setCompanySearch(value);
                            }}
                            allowCreateFromSearch
                            onAddNew={async (newCompanyName) => {
                                const companyName = (newCompanyName || '').trim();
                                if (!companyName || busy || isCreatingCompany) return;

                                setIsCreatingCompany(true);
                                try {
                                    const created = await callApi(leadApi.createCompany, { name: companyName });
                                    setCompanyOptions((prev) => {
                                        const exists = prev.some((company) => company.id === created?.id || company.name === created?.name);
                                        return exists ? prev : [...prev, created];
                                    });
                                    setFormData((current) => ({
                                        ...current,
                                        companyName: created?.name || companyName,
                                        companyId: created?.id || '',
                                    }));
                                    setCompanySearch(created?.name || companyName);
                                } finally {
                                    setIsCreatingCompany(false);
                                }
                            }}
                            disabled={busy || isCreatingCompany}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-neutral-400">Email</label>
                        <input type="email" value={formData.email} onChange={updateField('email')} className={leadInputClasses} placeholder="name@company.com" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-neutral-400">Phone</label>
                        <input value={formData.phone} onChange={updateField('phone')} className={leadInputClasses} placeholder="+1 555 0123" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-neutral-400">Status</label>
                        <CustomSelect
                            value={formData.status}
                            onChange={(value) => setFormData((current) => ({ ...current, status: value }))}
                            options={Object.entries(LEAD_STATUS).map(([value, label]) => ({
                                value,
                                label: label.charAt(0) + label.slice(1).toLowerCase(),
                            }))}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-neutral-400">Subject</label>
                        <input value={formData.subject} onChange={updateField('subject')} className={leadInputClasses} placeholder="Lead context" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-neutral-400">Message</label>
                        <textarea
                            value={formData.messagePreview}
                            onChange={updateField('messagePreview')}
                            className={cn(leadInputClasses, 'min-h-28 resize-none')}
                            placeholder="Notes, enquiry details, or message preview"
                        />
                    </div>
                    {error && (
                        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300 md:col-span-2">
                            {error}
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-5 dark:border-neutral-800">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={busy}
                        className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-900"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={busy}
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                        {lead ? 'Save Lead' : 'Create Lead'}
                    </button>
                </div>
            </form>
        </div>,
        document.body
    );
};

const leadInputClasses = "w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white dark:placeholder:text-neutral-500";

const DetailView = ({ lead, isLoading, error, onClose, onConvertToDeal, onConvertToContact, onStatusChange, onArchive, onDelete }) => {
    if (!lead) return null;

    const renderSourceDetails = () => {
        if (isLoading) {
            return (
                <div className="space-y-4 animate-pulse">
                    <div className="h-32 bg-slate-100 dark:bg-neutral-800 rounded-xl"></div>
                    <div className="h-24 bg-slate-50 dark:bg-neutral-800/50 rounded-xl"></div>
                </div>
            );
        }

        if (error) {
            return (
                <div className="p-6 rounded-xl bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30 text-center">
                    <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-3" />
                    <p className="text-sm text-rose-600 dark:text-rose-400 font-medium">
                        {typeof error === 'object' ? (error.message || JSON.stringify(error)) : error}
                    </p>
                </div>
            );
        }

        const { details, source } = lead;
        if (!details || Object.keys(details).length === 0) {
            return <p className="text-sm text-slate-500 italic">No specific details available for this source.</p>;
        }

        switch (source) {
            case LEAD_SOURCES.WEB_FORM:
            case LEAD_SOURCES.EMAIL_INQUIRY:
                return (
                    <div className="space-y-6">
                        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-slate-200 dark:border-neutral-700 shadow-sm overflow-hidden p-5">
                            <div className="mb-4">
                                <h4 className="text-sm font-semibold text-slate-800 dark:text-neutral-200 mb-2">Message</h4>
                                <p className="font-semibold text-main dark:text-white text-sm mb-2">{details.subject}</p>
                                <p className="text-sm text-sub dark:text-neutral-300 leading-relaxed whitespace-pre-wrap">{details.message}</p>
                            </div>

                            {source === LEAD_SOURCES.EMAIL_INQUIRY && details.attachments && (
                                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-neutral-700">
                                    <span className="text-xs font-medium text-slate-500 mb-2 block">Attachments</span>
                                    <span className="text-xs bg-slate-100 dark:bg-neutral-700 px-2 py-1 rounded text-slate-600 dark:text-neutral-300 inline-block">
                                        {details.attachments.length} files
                                    </span>
                                </div>
                            )}
                        </div>

                        {details.pageSource && (
                            <div className="grid grid-cols-3 gap-4 p-4 rounded-lg bg-slate-50 dark:bg-neutral-800/50 border border-slate-100 dark:border-neutral-800">
                                <div className="col-span-1 text-xs font-medium text-slate-500 flex items-center gap-2">
                                    <Globe className="w-3.5 h-3.5" /> Source Page
                                </div>
                                <div className="col-span-2 text-sm text-slate-900 dark:text-white font-mono break-all">
                                    {details.pageSource}
                                </div>
                            </div>
                        )}
                    </div>
                );

            case LEAD_SOURCES.AI_ASSISTANT:
                return (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <h4 className="flex items-center gap-2 text-sm font-semibold text-purple-700 dark:text-purple-400">
                                <Bot className="w-4 h-4" /> Transcript
                            </h4>
                            <span className="text-xs bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-300 px-2 py-1 rounded-full">Duration: {details.sessionDuration}</span>
                        </div>

                        <div className="bg-slate-50 dark:bg-neutral-900/30 rounded-xl p-4 border border-slate-200 dark:border-neutral-700 space-y-4 max-h-[500px] overflow-y-auto">
                            {(details.chatLog || []).map((msg, i) => (
                                <div key={i} className={cn("flex flex-col max-w-[85%]", msg.sender === 'User' ? "items-end ml-auto" : "items-start")}>
                                    <div className="flex items-end gap-2">
                                        {msg.sender !== 'User' && (
                                            <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-purple-600 text-[10px] font-bold shrink-0">AI</div>
                                        )}
                                        <div className={cn(
                                            "p-3 rounded-2xl text-sm shadow-sm",
                                            msg.sender === 'User'
                                                ? "bg-blue-600 text-white rounded-br-sm"
                                                : "bg-white dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 border border-slate-100 dark:border-neutral-700 rounded-bl-sm"
                                        )}>
                                            {msg.text}
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-slate-400 mt-1 px-1">{msg.time}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                );

            case LEAD_SOURCES.WHATSAPP:
                return (
                    <div className="space-y-4">
                        <div className="bg-[#E5DDD5] dark:bg-neutral-900/50 p-4 rounded-xl border border-slate-200 dark:border-neutral-700 min-h-[300px] relative">
                            {/* WhatsApp Background Pattern Simulation */}
                            <div className="absolute inset-0 opacity-5 pointer-events-none bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')]"></div>

                            <div className="relative z-10 space-y-3">
                                {(details.chatHistory || []).map((msg, i) => (
                                    <div key={i} className={cn("flex flex-col max-w-[85%]", msg.direction === 'in' ? "items-start" : "items-end ml-auto")}>
                                        <div className={cn(
                                            "px-3 py-2 rounded-lg text-sm shadow-sm relative",
                                            msg.direction === 'out'
                                                ? "bg-[#dcf8c6] dark:bg-green-700 text-slate-800 dark:text-white"
                                                : "bg-white dark:bg-neutral-800 text-slate-800 dark:text-neutral-200"
                                        )}>
                                            {msg.text}
                                            <div className="text-[9px] text-slate-400 dark:text-white/60 text-right mt-1 -mb-1">{msg.time}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );

            case LEAD_SOURCES.EVENT_REGISTRATION:
                return (
                    <div className="space-y-6">
                        <div className="relative overflow-hidden bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 text-white shadow-lg">
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-3 opacity-90">
                                    <Video className="w-4 h-4" /> Webinar Registration
                                </div>
                                <h4 className="text-xl font-bold mb-2">{details.webinarTitle}</h4>
                                <div className="flex items-center gap-4 text-sm font-medium opacity-90">
                                    <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {new Date(details.webinarDate).toLocaleDateString()}</span>
                                    <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {new Date(details.webinarDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            </div>
                            {/* Decorative Details */}
                            <div className="absolute right-0 top-0 h-full w-1/3 bg-white/10 skew-x-12 transform translate-x-8"></div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-slate-50 dark:bg-neutral-800/50 rounded-xl border border-slate-100 dark:border-neutral-700">
                                <span className="text-xs uppercase text-slate-400 font-bold">Attendance</span>
                                <div className="flex items-center gap-2 mt-1">
                                    {details.attended ? (
                                        <>
                                            <CheckCircle className="w-5 h-5 text-green-500" />
                                            <span className="font-semibold text-slate-900 dark:text-white">Attended Live</span>
                                        </>
                                    ) : (
                                        <span className="font-semibold text-slate-500">Registered</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {details.questionsAsked && details.questionsAsked.length > 0 && (
                            <div>
                                <h5 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                                    <MessageSquare className="w-3 h-3" /> Q&A Activity
                                </h5>
                                <div className="space-y-2">
                                    {details.questionsAsked.map((q, i) => (
                                        <div key={i} className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg text-sm text-blue-800 dark:text-blue-300 border border-blue-100 dark:border-blue-900/30 italic">
                                            "{q}"
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                );

            case LEAD_SOURCES.RESOURCE_DOWNLOAD:
                return (
                    <div className="space-y-6">
                        <div className="p-6 bg-slate-50 dark:bg-neutral-800/50 rounded-xl border border-slate-200 dark:border-neutral-700 flex gap-4">
                            <div className="w-16 h-20 bg-white dark:bg-neutral-700 border border-slate-200 dark:border-neutral-600 shadow-sm rounded flex items-center justify-center shrink-0">
                                <FileText className="w-8 h-8 text-orange-500" />
                            </div>
                            <div>
                                <span className="text-xs font-bold text-orange-600 dark:text-orange-400">{details.contentType}</span>
                                <h4 className="text-lg font-bold text-slate-900 dark:text-white mt-1 mb-2">{details.contentTitle}</h4>
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <Download className="w-3 h-3" /> Downloaded on {details.downloadedAt}
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case LEAD_SOURCES.LINKEDIN:
                return (
                    <div className="space-y-6">
                        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 flex gap-4">
                            <div className="w-16 h-16 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 shadow-sm rounded flex items-center justify-center shrink-0">
                                <Icon icon="logos:linkedin-icon" className="w-8 h-8" />
                            </div>
                            <div>
                                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">LinkedIn Connection</span>
                                <h4 className="text-lg font-bold text-slate-900 dark:text-white mt-1 mb-2">Profile Visit</h4>
                                <a href={`https://${details.profileUrl}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-blue-500 hover:underline">
                                    <Icon icon="logos:linkedin-icon" className="w-3 h-3" /> View Profile
                                </a>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">Initial Message</h4>
                            <p className="text-sm text-sub dark:text-slate-300 leading-relaxed">"{details.message}"</p>
                        </div>
                    </div>
                );

            default:
                return <p className="text-sm text-slate-500 italic">No specific details available for this source.</p>;
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[100] flex justify-end bg-black/20 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div
                className="w-full max-w-lg bg-white dark:bg-neutral-900 border-l border-slate-200 dark:border-neutral-800 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
                onClick={e => e.stopPropagation()}
            >
                {/* Drawer Header */}
                <div className="p-6 border-b border-slate-100 dark:border-neutral-800">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex-1 min-w-0 pr-4">
                            <div className="flex items-center gap-2 mb-2">
                                <h3 className={cn("text-xl font-bold truncate", isLoading ? "bg-slate-100 dark:bg-neutral-800 h-7 w-48 rounded" : (!lead.name ? "text-sub italic" : "text-main dark:text-white"))}>
                                    {!isLoading && (lead.name || 'Unknown Lead')}
                                </h3>
                                <div className="inline-block relative group">
                                    {lead.status && (
                                        lead.status === LEAD_STATUS.ARCHIVED ? (
                                            <CustomSelect
                                                value={lead.status}
                                                onChange={(newStatus) => onStatusChange(lead.id, newStatus)}
                                                options={Object.entries(LEAD_STATUS)
                                                    .filter(([key]) => key !== 'CONTACTED')
                                                    .map(([key, label]) => ({
                                                        value: key,
                                                        label: label.charAt(0) + label.slice(1).toLowerCase()
                                                    }))
                                                }
                                                trigger={<StatusBadge status={lead.status} />}
                                            />
                                        ) : (
                                            <StatusBadge status={lead.status} />
                                        )
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-sub">
                                <div className={cn("flex items-center gap-1.5", isLoading && "bg-slate-50 dark:bg-neutral-800/50 h-4 w-32 rounded")}>
                                    {!isLoading && (
                                        <>
                                            <Building className="w-3.5 h-3.5" />
                                            <span className={cn(!lead.company && "italic text-sub opacity-70")}>{lead.company || 'Unknown Company'}</span>
                                        </>
                                    )}
                                </div>
                                <div className={cn("flex items-center gap-1.5", isLoading && "bg-slate-50 dark:bg-neutral-800/50 h-4 w-24 rounded")}>
                                    {!isLoading && (
                                        <>
                                            <Clock className="w-3.5 h-3.5" /> {lead.capturedOn || 'Captured just now'}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-neutral-800 rounded-full text-slate-400 transition-colors shrink-0">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex gap-2">
                        <div className="flex gap-2 flex-1">
                            <button
                                onClick={() => onConvertToContact(lead)}
                                title="Convert to Contact"
                                disabled={isLoading}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 hover:bg-slate-50 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-200 rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
                            >
                                <UserPlus className="w-4 h-4" /> To Contact
                            </button>
                            {lead.convertedDeal ? (
                                <button
                                    onClick={() => onConvertToDeal(lead)}
                                    title="View Converted Deal"
                                    disabled={isLoading}
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
                                >
                                    <CheckCircle2 className="w-4 h-4" /> Deal Done
                                </button>
                            ) : (
                                <button
                                    onClick={() => onConvertToDeal(lead)}
                                    title="Convert to Deal"
                                    disabled={isLoading}
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
                                >
                                    <CheckCircle className="w-4 h-4" /> To Deal
                                </button>
                            )}
                        </div>
                        <button
                            onClick={() => onArchive(lead)}
                            title="Archive Lead"
                            disabled={isLoading}
                            className="p-2.5 border border-slate-200 dark:border-neutral-700 rounded-lg text-slate-600 hover:bg-slate-50 dark:text-neutral-400 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
                        >
                            <Archive className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => onDelete(lead)}
                            title="Delete Lead"
                            disabled={isLoading}
                            className="p-2.5 border border-slate-200 dark:border-neutral-700 rounded-lg text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/20 transition-colors disabled:opacity-50"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Drawer Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-white dark:bg-neutral-900">
                    {/* Contact Info (Compact) */}
                    {lead.email || lead.phone ? (
                        <div className="flex flex-col gap-3 px-1">
                            {lead.email && (
                                <div className="flex items-center gap-3 text-sm group">
                                    <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-neutral-800 flex items-center justify-center text-slate-400 group-hover:text-blue-600 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors">
                                        <Mail className="w-4 h-4" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs text-slate-500">Email</span>
                                        <a
                                            href={`mailto:${lead.email}`}
                                            className="text-slate-900 dark:text-white hover:text-blue-600 font-medium truncate transition-colors"
                                        >
                                            {lead.email}
                                        </a>
                                    </div>
                                </div>
                            )}
                            {lead.phone && (
                                <div className="flex items-center gap-3 text-sm group">
                                    <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-neutral-800 flex items-center justify-center text-slate-400 group-hover:text-blue-600 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors">
                                        <Phone className="w-4 h-4" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs text-slate-500">Phone</span>
                                        <span className="text-slate-900 dark:text-white font-medium">{lead.phone}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : isLoading ? (
                        <div className="space-y-3 px-1 animate-pulse">
                            <div className="h-10 bg-slate-100 dark:bg-neutral-800 rounded-lg"></div>
                            <div className="h-10 bg-slate-100 dark:bg-neutral-800 rounded-lg"></div>
                        </div>
                    ) : null}

                    {/* Main Detail Section */}
                    <div>
                        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100 dark:border-neutral-800">
                            <span className="p-1.5 rounded-lg bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-300">
                                <SourceIcon source={lead.source} />
                            </span>
                            <span className="text-sm font-bold text-slate-900 dark:text-white">
                                {lead.source || 'Lead'} Details
                            </span>
                        </div>
                        {renderSourceDetails()}
                    </div>

                    {/* Converted Deal Info */}
                    {/* {!isLoading && lead.convertedDeal && (
                        <div className="pt-6 border-t border-dashed border-slate-200 dark:border-neutral-800">
                            <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
                                Converted to Deal
                            </h4>
                            <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl p-5 space-y-4">
                                <div className="flex justify-between items-start">
                                    <div className="min-w-0 flex-1 pr-4">
                                        <p className="text-xs text-slate-500 mb-1 uppercase tracking-wider font-bold">Deal Title</p>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{lead.convertedDeal.title}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-slate-500 mb-1 uppercase tracking-wider font-bold">Stage</p>
                                        <span className="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-full">
                                            {lead.convertedDeal.stage}
                                        </span>
                                    </div>
                                </div>

                                {lead.convertedDeal.poNumber && (
                                    <div className="flex items-center justify-between py-3 border-t border-blue-100/50 dark:border-blue-900/20">
                                        <div className="flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-blue-500" />
                                            <div>
                                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">PO Number</p>
                                                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{lead.convertedDeal.poNumber}</p>
                                            </div>
                                        </div>
                                        {lead.convertedDeal.poDocumentUrl && (
                                            <a 
                                                href={`${import.meta.env.VITE_API_URL || 'http://localhost:3000/v1'}${lead.convertedDeal.poDocumentUrl}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800 rounded-lg text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 transition-colors shadow-sm"
                                            >
                                                <Download className="w-3 h-3" />
                                                View PO Document
                                            </a>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )} */}
                </div>
            </div>
        </div >,
        document.body
    );
};


export const LeadsPage = () => {
    const { user } = useAuth();
    console.log(user, "user ");

    const canReadLeads = user?.permissions?.includes('read:sales.leads');
    const canWriteLeads = user?.permissions?.includes('write:sales.leads');

    const withWritePermission = (handler) => (...args) => {
        if (!canWriteLeads) {
            showErrorToast({
                message: "Insufficient permissions",
                error: "Forbidden",
                statusCode: 403
            });
            return;
        }
        return handler(...args);
    };

    const [leads, setLeads] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedLead, setSelectedLead] = useState(null);
    const [isDetailLoading, setIsDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState(null);
    const [statusFilter, setStatusFilter] = useState('All');
    const [selectedIds, setSelectedIds] = useState([]);
    const [deleteState, setDeleteState] = useState({ lead: null, submitting: false });
    const [menuState, setMenuState] = useState({ lead: null, top: 0, left: 0 });
    const [leadFormState, setLeadFormState] = useState({ open: false, lead: null, submitting: false, error: '' });
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
            setMenuState({ lead: null, top: 0, left: 0 });
        }, 120);
    };

    const openMenu = (lead, element) => {
        clearMenuCloseTimeout();
        const rect = element.getBoundingClientRect();
        setMenuState({
            lead,
            top: rect.bottom + 6,
            left: rect.right - 128,
        });
    };

    useEffect(() => {
        if (!menuState.lead) {
            return undefined;
        }

        const handleClose = () => setMenuState({ lead: null, top: 0, left: 0 });
        window.addEventListener('click', handleClose);
        window.addEventListener('resize', handleClose);
        window.addEventListener('scroll', handleClose, true);

        return () => {
            window.removeEventListener('click', handleClose);
            window.removeEventListener('resize', handleClose);
            window.removeEventListener('scroll', handleClose, true);
        };
    }, [menuState.lead]);

    useEffect(() => () => clearMenuCloseTimeout(), []);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);

    // Sorting State
    const [sortConfig, setSortConfig] = useState({ key: 'capturedAt', direction: 'desc' });

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
        setCurrentPage(1); // Reset to first page on sort change
    };

    const mapLead = useCallback((apiLead) => ({
        id: apiLead.id,
        name: apiLead.name,
        email: apiLead.email,
        phone: apiLead.phone,
        company: apiLead.company,
        companyId: apiLead.companyId,
        source: apiLead.sourceType,
        sourceLabel: apiLead.sourceLabel,
        status: apiLead.status,
        statusLabel: apiLead.statusLabel,
        subject: apiLead.subject,
        messagePreview: apiLead.messagePreview,
        capturedOn: apiLead.capturedAt ? timeAgo(apiLead.capturedAt) : 'Unknown',
        details: apiLead.details || {},
        convertedDeal: apiLead.convertedDeal || null
    }), []);

    const handleLeadClick = async (leadId) => {
        setIsDetailLoading(true);
        setDetailError(null);
        setSelectedLead({ id: leadId }); // Set ID immediately to show slideout skeleton if needed
        try {
            const response = await leadApi.getById(leadId);
            const fullLead = mapLead(response.data);
            setSelectedLead(fullLead);
        } catch (error) {
            console.error('Failed to fetch lead details:', error);
            setDetailError('Failed to load lead details. Please try again.');
        } finally {
            setIsDetailLoading(false);
        }
    };

    const fetchLeads = useCallback(async () => {
        setIsLoading(true);
        try {
            const params = {
                page: currentPage,
                limit: itemsPerPage,
                search: searchTerm,
                status: statusFilter === 'All' ? undefined : statusFilter,
                sortField: sortConfig.key,
                sortOrder: sortConfig.direction.toUpperCase()
            };
            const response = await leadApi.getAll(params);
            const { items, pagination } = response.data;
            setLeads(items.map(mapLead));
            setTotalItems(pagination.total);
        } catch (error) {
            console.error('Failed to fetch leads:', error);
        } finally {
            setIsLoading(false);
        }
    }, [currentPage, itemsPerPage, searchTerm, statusFilter, sortConfig, mapLead]);

    useEffect(() => {
        fetchLeads();
    }, [fetchLeads]);

    // Deal Conversion State
    // Toast State
    const [toast, setToast] = useState({ show: false, message: '', type: 'success', errorDetails: null });


    const showSuccessToast = (message) => {
        setToast({ show: true, message, type: 'success', errorDetails: null });
        setTimeout(() => setToast({ show: false, message: '', type: 'success', errorDetails: null }), 3000);
    };

    const showErrorToast = (errorObj) => {
        setToast({ show: true, message: errorObj.message, type: 'error', errorDetails: errorObj });
        setTimeout(() => setToast({ show: false, message: '', type: 'success', errorDetails: null }), 5000);
    };

    // Deal Conversion State
    const [isDealDrawerOpen, setIsDealDrawerOpen] = useState(false);
    const [dealInitialData, setDealInitialData] = useState(null);

    // Contact Conversion State
    const [isContactModalOpen, setIsContactModalOpen] = useState(false);
    const [contactInitialData, setContactInitialData] = useState(null);
    const [pendingLead, setPendingLead] = useState(null); // Stores lead to restore if user cancels contact creation

    const handleConvertToDeal = withWritePermission((leadToConvert = selectedLead) => {
        if (!leadToConvert) return;

        if (leadToConvert.convertedDeal) {
            // Already converted - pass existing deal details for editing/viewing
            setDealInitialData({
                ...leadToConvert.convertedDeal,
                leadId: leadToConvert.id,
            });
        } else {
            // New conversion
            setDealInitialData({
                leadId: leadToConvert.id,
                title: leadToConvert.details?.subject || `Deal - ${leadToConvert.company || leadToConvert.name || 'Untitled'}`,
                companyId: leadToConvert.companyId,
                companyName: leadToConvert.company,
                primaryContactId: '',
                primaryContact: leadToConvert.name,
                primaryContactEmail: leadToConvert.email,
                primaryContactPhone: leadToConvert.phone,
                description: leadToConvert.details?.message || leadToConvert.subject || ''
            });
        }
        setIsDealDrawerOpen(true);
    });

    const handleConvertToContact = withWritePermission((lead) => {
        setPendingLead(lead); // Remember this lead
        if (selectedLead && selectedLead.id === lead.id) setSelectedLead(null); // Close the slide-out

        setContactInitialData({
            name: lead.name,
            companyId: lead.companyId,
            company: lead.company,
            email: lead.email,
            phone: lead.phone
        });
        setIsContactModalOpen(true);
    });

    const handleContactModalClose = () => {
        setIsContactModalOpen(false);
        // If we have a pending lead (meaning we came from the slide-out and cancelled), restore it
        if (pendingLead) {
            setSelectedLead(pendingLead);
            setPendingLead(null);
        }
    };

    const handleSaveContact = async (contactData) => {
        try {
            if (pendingLead?.id) {
                // Perform the specialized conversion API call
                await callApi(leadApi.convertToContact, pendingLead.id, {
                    companyId: contactData.companyId,
                    firstName: contactData.firstName,
                    lastName: contactData.lastName,
                    email: contactData.email,
                    phone: contactData.phone,
                    title: contactData.title,
                });

                // Update UI immediately on success
                fetchLeads();
                handleLeadClick(pendingLead.id);
                showSuccessToast(`Lead converted to contact successfully!`);
            } else {
                // Standalone creation - should not really happen with the new modal logic
                // but kept for safety.
                showSuccessToast(`Contact "${contactData.firstName}" created successfully!`);
            }
        } catch (error) {
            console.error('Lead conversion failed', error);
            // The modal's setSubmitError will handle the visual feedback if needed, 
            // but here we ensure the UI doesn't crash.
            const errorMsg = typeof error === 'object' ? (error.message || 'Conversion failed') : error;
            showSuccessToast(`Error: ${errorMsg}`);
        } finally {
            setPendingLead(null);
            setIsContactModalOpen(false);
        }
    };

    const openAddLeadModal = withWritePermission(() => {
        setSelectedLead(null);
        setLeadFormState({ open: true, lead: null, submitting: false, error: '' });
    });

    const openEditLeadModal = withWritePermission((lead) => {
        if (!lead) return;
        setLeadFormState({ open: true, lead, submitting: false, error: '' });
    });

    const handleSaveLead = async (formData) => {
        const payload = {
            name: formData.name?.trim() || undefined,
            email: formData.email?.trim() || undefined,
            phone: formData.phone?.trim() || undefined,
            companyId: formData.companyId || undefined,
            companyName: formData.companyName?.trim() || undefined,
            subject: formData.subject?.trim() || undefined,
            messagePreview: formData.messagePreview?.trim() || undefined,
            status: formData.status || LEAD_STATUS.NEW,
        };

        if (!payload.name && !payload.email && !payload.phone) {
            setLeadFormState((current) => ({ ...current, error: 'Enter at least a name, email, or phone.' }));
            return;
        }

        setLeadFormState((current) => ({ ...current, submitting: true, error: '' }));
        try {
            const savedLead = leadFormState.lead?.id
                ? await callApi(leadApi.update, leadFormState.lead.id, payload)
                : await callApi(leadApi.create, payload);

            setLeadFormState({ open: false, lead: null, submitting: false, error: '' });
            fetchLeads();
            if (selectedLead?.id === savedLead.id || leadFormState.lead?.id) {
                handleLeadClick(savedLead.id);
            }
            showSuccessToast(leadFormState.lead?.id ? 'Lead updated successfully' : 'Lead created successfully');
        } catch (error) {
            setLeadFormState((current) => ({
                ...current,
                submitting: false,
                error: error?.message || 'Failed to save lead',
            }));
        }
    };

    const handleStatusChange = withWritePermission(async (leadId, newStatus) => {
        try {
            await leadApi.updateStatus(leadId, newStatus);

            // Sync leads list: remove if no longer matches filter, otherwise update
            setLeads(prevLeads => {
                const shouldStay = statusFilter === 'All' || newStatus === statusFilter;
                if (!shouldStay) {
                    return prevLeads.filter(l => l.id !== leadId);
                }
                return prevLeads.map(l => l.id === leadId ? { ...l, status: newStatus } : l);
            });

            if (selectedLead && selectedLead.id === leadId) {
                setSelectedLead(prev => ({ ...prev, status: newStatus }));
            }
            showSuccessToast('Status updated successfully');

            // Refresh counts/pagination in background
            fetchLeads();
        } catch (error) {
            console.error('Failed to update status:', error);
        }
    });

    const handleArchiveLead = withWritePermission(async (lead) => {
        try {
            await leadApi.archive(lead.id);
            
            // Sync leads list: remove if no longer matches filter, otherwise update
            setLeads(prevLeads => {
                const shouldStay = statusFilter === 'All' || statusFilter === LEAD_STATUS.ARCHIVED;
                if (!shouldStay) {
                    return prevLeads.filter(l => l.id !== lead.id);
                }
                return prevLeads.map(l => l.id === lead.id ? { ...l, status: LEAD_STATUS.ARCHIVED } : l);
            });

            if (selectedLead && selectedLead.id === lead.id) {
                setSelectedLead(prev => ({ ...prev, status: LEAD_STATUS.ARCHIVED }));
            }
            
            showSuccessToast('Lead archived successfully');
            
            // Refresh counts/pagination in background
            fetchLeads();
        } catch (error) {
            console.error('Failed to archive lead:', error);
        }
    });

    const handleDeleteLead = withWritePermission(async (lead) => {
        if (!lead) return;
        setDeleteState({ lead: lead, submitting: false });
    });

    const confirmDeleteLead = async () => {
        const lead = deleteState.lead;
        if (!lead) return;

        setDeleteState(prev => ({ ...prev, submitting: true }));
        try {
            await leadApi.delete(lead.id);
            setLeads(prev => prev.filter(l => l.id !== lead.id));
            if (selectedLead && selectedLead.id === lead.id) setSelectedLead(null);
            showSuccessToast('Lead deleted successfully');
            setDeleteState({ lead: null, submitting: false });
        } catch (error) {
            console.error('Failed to delete lead:', error);
            setDeleteState(prev => ({ ...prev, submitting: false }));
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === leads.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(leads.map(l => l.id));
        }
    };

    const toggleSelectOne = (id) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    if (!canReadLeads && !isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
                <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6">
                    <ShieldAlert className="w-10 h-10 text-rose-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Access Denied</h2>
                <p className="text-slate-500 dark:text-neutral-400 max-w-md mx-auto text-sm">
                    You do not have the required permissions (`read:sales.leads`) to view this page.
                </p>
                <button
                    onClick={() => window.history.back()}
                    className="mt-8 px-6 py-2.5 bg-black text-white rounded-xl font-semibold hover:opacity-90 transition-opacity"
                >
                    Go Back
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-main dark:text-white tracking-tight">Leads Inbox</h1>
                </div>
                <div className="flex items-center gap-3">
                    {canWriteLeads && (
                        <button
                            type="button"
                            onClick={openAddLeadModal}
                            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700"
                        >
                            <Plus className="h-4 w-4" />
                            Add Lead
                        </button>
                    )}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sub" />
                        <input
                            type="text"
                            placeholder="Search leads..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="pl-9 pr-4 py-2 border border-slate-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 text-main placeholder:text-sub w-64 shadow-sm transition-all"
                        />
                    </div>
                    {/* Status Filter Custom Select */}
                    <div className="w-40">
                        <CustomSelect
                            value={statusFilter}
                            onChange={setStatusFilter}
                            icon={Filter}
                            options={[
                                { value: "All", label: "All Status" },
                                ...Object.entries(LEAD_STATUS).map(([key, label]) => ({
                                    value: key,
                                    label: label.charAt(0) + label.slice(1).toLowerCase()
                                }))
                            ]}
                        />
                    </div>
                </div>
            </div>

            {/* Leads Table */}
            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-slate-200 dark:border-neutral-800 shadow-sm mb-8 overflow-hidden">
                <div className="overflow-x-auto overflow-y-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-white dark:bg-neutral-900/50 text-sub font-medium border-b border-slate-200 dark:border-neutral-800">
                            <tr>
                                <th className="w-12 px-6 py-3">
                                    <label className="relative flex items-center justify-center cursor-pointer p-2 -m-2">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.length === leads.length && leads.length > 0}
                                            onChange={toggleSelectAll}
                                            className="peer sr-only"
                                        />
                                        <div className="w-4 h-4 rounded border border-slate-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 peer-checked:bg-blue-600 dark:peer-checked:bg-blue-500/20 peer-checked:border-blue-600 dark:peer-checked:border-blue-500 transition-all shadow-sm"></div>
                                        <Check className="w-3 h-3 text-white dark:text-blue-500 absolute opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" strokeWidth={3} />
                                    </label>
                                </th>
                                {[
                                    { label: 'Lead Name', key: 'name' },
                                    { label: 'Source', key: 'source' },
                                    { label: 'Contact Info', key: 'email' },
                                    { label: 'Captured', key: 'capturedOn' }
                                ].map((h, i) => (
                                    <th
                                        key={i}
                                        onClick={() => handleSort(h.key)}
                                        className="px-6 py-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors select-none"
                                    >
                                        <div className="flex items-center gap-1">
                                            {h.label}
                                            <div className="flex flex-col">
                                                <ChevronUp className={cn("w-2 h-2", sortConfig.key === h.key && sortConfig.direction === 'asc' ? "text-main dark:text-white" : "text-slate-300 dark:text-neutral-600")} />
                                                <ChevronDown className={cn("w-2 h-2", sortConfig.key === h.key && sortConfig.direction === 'desc' ? "text-main dark:text-white" : "text-slate-300 dark:text-neutral-600")} />
                                            </div>
                                        </div>
                                    </th>
                                ))}
                                <th className="px-6 py-3 text-right"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
                            {leads.map((lead) => (
                                <tr
                                    key={lead.id}
                                    onClick={() => handleLeadClick(lead.id)}
                                    className={cn(
                                        "group hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer",
                                        selectedIds.includes(lead.id) ? "bg-blue-50/50 dark:bg-blue-900/10" : ""
                                    )}
                                >
                                    <td className="px-6 py-3" onClick={(e) => e.stopPropagation()}>
                                        <label className={cn(
                                            "relative flex items-center justify-center cursor-pointer p-2 -m-2 transition-opacity duration-200",
                                            selectedIds.includes(lead.id) ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                                        )}>
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(lead.id)}
                                                onChange={(e) => { e.stopPropagation(); toggleSelectOne(lead.id); }}
                                                className="peer sr-only"
                                            />
                                            <div className="w-4 h-4 rounded border border-slate-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 peer-checked:bg-blue-600 dark:peer-checked:bg-blue-500/20 peer-checked:border-blue-600 dark:peer-checked:border-blue-500 transition-all shadow-sm"></div>
                                            <Check className="w-3 h-3 text-white dark:text-blue-500 absolute opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" strokeWidth={3} />
                                        </label>
                                    </td>
                                    <td className="px-6 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0",
                                                !lead.name
                                                    ? "bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400"
                                                    : "bg-slate-100 text-slate-600 dark:bg-neutral-800 dark:text-neutral-400"
                                            )}>
                                                {lead.name ? lead.name.charAt(0) : <Bot className="w-4 h-4" />}
                                            </div>
                                            <div className="min-w-0">
                                                <div className={cn("font-medium text-main dark:text-white truncate", !lead.name && "text-sub dark:text-neutral-500 italic")}>
                                                    {lead.name || 'Unknown Lead'}
                                                </div>
                                                <div className="text-xs text-sub dark:text-neutral-400 truncate max-w-[180px]">
                                                    {lead.company ? (
                                                        <span className="flex items-center gap-1"><Building className="w-3 h-3" /> {lead.company}</span>
                                                    ) : (
                                                        <span className="flex items-center gap-1 italic text-sub dark:text-neutral-500"><Building className="w-3 h-3" /> Unknown Company</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3">
                                        <div className="flex items-center gap-2">
                                            <SourceIcon source={lead.source} />
                                            <span className="text-sub dark:text-neutral-400 font-medium">{lead.sourceLabel}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3">
                                        <div className="flex flex-col gap-1">
                                            <a
                                                href={`mailto:${lead.email}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                }}
                                                className="flex items-center gap-2 text-main dark:text-neutral-200 hover:text-blue-600 dark:hover:text-white transition-colors"
                                            >
                                                <Mail className="w-3.5 h-3.5" /> {lead.email}
                                            </a>
                                            {lead.phone && (
                                                <div className="flex items-center gap-2 text-sub dark:text-neutral-400">
                                                    <Phone className="w-3.5 h-3.5" /> {lead.phone}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-3 text-sub dark:text-neutral-400">
                                        {lead.capturedOn}
                                    </td>
                                    <td className="px-6 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                                        <div
                                            className="inline-block"
                                            onMouseEnter={(event) => openMenu(lead, event.currentTarget)}
                                            onMouseLeave={scheduleMenuClose}
                                        >
                                            <button
                                                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 transition-colors"
                                            >
                                                <MoreHorizontal className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {leads.length === 0 && (
                        <div className="p-12 text-center text-slate-500 dark:text-slate-400">
                            {isLoading ? 'Loading leads...' : 'No leads found matching your criteria.'}
                        </div>
                    )}
                </div>

                {/* Pagination Controls */}
                <div className="px-6 py-4 border-t border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/30 text-xs text-sub flex justify-between items-center rounded-b-xl">
                    <div className="flex items-center gap-4">
                        <span>
                            Showing {totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} records
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
                                    options={[10, 25, 50, 100].map(size => ({ value: size, label: size }))}
                                    className="py-1 px-2 h-8"
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
                            {Array.from({ length: Math.ceil(totalItems / itemsPerPage) }, (_, i) => i + 1).map(page => (
                                <button
                                    key={page}
                                    onClick={() => setCurrentPage(page)}
                                    className={cn(
                                        "w-8 h-8 flex items-center justify-center rounded-lg text-xs font-medium transition-all duration-200",
                                        currentPage === page
                                            ? "bg-blue-600 text-white shadow-md dark:bg-blue-600 dark:text-white"
                                            : "hover:bg-gray-100 text-sub hover:text-main dark:hover:bg-neutral-800"
                                    )}
                                >
                                    {page}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalItems / itemsPerPage), prev + 1))}
                            disabled={currentPage === Math.ceil(totalItems / itemsPerPage) || totalItems === 0}
                            className="p-1.5 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Detail Drawer */}
            <DetailView
                lead={selectedLead}
                isLoading={isDetailLoading}
                error={detailError}
                onClose={() => {
                    setSelectedLead(null);
                    setDetailError(null);
                }}
                onConvertToDeal={handleConvertToDeal}
                onConvertToContact={handleConvertToContact}
                onStatusChange={handleStatusChange}
                onArchive={handleArchiveLead}
                onDelete={handleDeleteLead}
            />

            {/* Deal Creation / Convert Drawer */}
            <AddDealDrawer
                isOpen={isDealDrawerOpen}
                onClose={() => setIsDealDrawerOpen(false)}
                deal={dealInitialData}
                onSubmit={async (payload) => {
                    if (!dealInitialData?.leadId) {
                        return;
                    }
                    await callApi(leadApi.convertToDeal, dealInitialData.leadId, payload);
                    // The backend returns the updated lead/deal. We refresh the list AND the selected lead detail.
                    fetchLeads();
                    handleLeadClick(dealInitialData.leadId);
                    showSuccessToast('Conversion completed successfully!');
                }}
            />
            {/* Contact Conversion Modal */}
            <QuickCreateContactModal
                isOpen={isContactModalOpen}
                onClose={handleContactModalClose}
                onSave={handleSaveContact}
                initialData={contactInitialData}
            />

            <LeadFormModal
                key={`${leadFormState.open ? 'open' : 'closed'}-${leadFormState.lead?.id || 'new'}`}
                open={leadFormState.open}
                lead={leadFormState.lead}
                busy={leadFormState.submitting}
                error={leadFormState.error}
                onClose={() => setLeadFormState({ open: false, lead: null, submitting: false, error: '' })}
                onSave={handleSaveLead}
            />

            {/* Global Toast Notification */}
            {createPortal(
                <AnimatePresence>
                    {toast.show && (
                        <MotionDiv
                            initial={{ opacity: 0, y: 20, x: '-50%' }}
                            animate={{ opacity: 1, y: 0, x: '-50%' }}
                            exit={{ opacity: 0, y: 20, x: '-50%' }}
                            className={cn(
                                "fixed bottom-8 left-1/2 z-[2000] text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 min-w-[300px]",
                                toast.type === 'error' ? "bg-rose-600" : "bg-emerald-600"
                            )}
                        >
                            {toast.type === 'error' ? <ShieldAlert className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                            <div className="flex flex-col">
                                <span className="font-bold text-sm tracking-wide">
                                    {typeof toast.message === 'string' ? toast.message : (toast.message?.message || 'Error')}
                                </span>
                                {toast.type === 'error' && (
                                    <span className="text-[10px] opacity-80 font-mono">
                                        {toast.errorDetails?.error} ({toast.errorDetails?.statusCode})
                                    </span>
                                )}
                            </div>
                        </MotionDiv>
                    )}
                </AnimatePresence>,
                document.body
            )}

            <ConfirmDialog
                open={Boolean(deleteState.lead)}
                title="Delete Lead"
                message={
                    deleteState.lead?.name
                        ? `Delete ${deleteState.lead.name}? This action cannot be undone.`
                        : 'Delete this lead? This action cannot be undone.'
                }
                confirmLabel="Delete Lead"
                busy={deleteState.submitting}
                onCancel={() => setDeleteState({ lead: null, submitting: false })}
                onConfirm={confirmDeleteLead}
            />

            {menuState.lead && createPortal(
                <div
                    className="fixed z-[140] w-32 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 rounded-lg shadow-xl overflow-hidden"
                    style={{ top: menuState.top, left: menuState.left }}
                    onClick={(event) => event.stopPropagation()}
                    onMouseEnter={clearMenuCloseTimeout}
                    onMouseLeave={scheduleMenuClose}
                >
                    <button
                        onClick={() => {
                            handleLeadClick(menuState.lead.id);
                            setMenuState({ lead: null, top: 0, left: 0 });
                        }}
                        className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300 font-medium"
                    >
                        View Details
                    </button>
                    <button
                        onClick={() => {
                            openEditLeadModal(menuState.lead);
                            setMenuState({ lead: null, top: 0, left: 0 });
                        }}
                        className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300 font-medium"
                    >
                        Edit Lead
                    </button>
                    <button
                        onClick={() => {
                            handleConvertToContact(menuState.lead);
                            setMenuState({ lead: null, top: 0, left: 0 });
                        }}
                        className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300 font-medium"
                    >
                        Convert to Contact
                    </button>
                    <button
                        onClick={() => {
                            handleConvertToDeal(menuState.lead);
                            setMenuState({ lead: null, top: 0, left: 0 });
                        }}
                        className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300 font-medium"
                    >
                        Convert to Deal
                    </button>
                    <button
                        onClick={() => {
                            handleArchiveLead(menuState.lead);
                            setMenuState({ lead: null, top: 0, left: 0 });
                        }}
                        className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 dark:hover:bg-neutral-800 text-slate-500 font-medium"
                    >
                        Archive
                    </button>
                    <button
                        onClick={() => {
                            handleDeleteLead(menuState.lead);
                            setMenuState({ lead: null, top: 0, left: 0 });
                        }}
                        className="w-full text-left px-4 py-2 text-xs hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-600 font-medium"
                    >
                        Delete
                    </button>
                </div>,
                document.body
            )}
        </div>
    );
};
