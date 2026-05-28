import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MessageSquare, Users, Calendar, Star,
    Plus, Mail, Edit2, Trash2, MoreHorizontal,
    Phone, Smartphone, Briefcase
} from 'lucide-react';
import { cn } from '@/lib/utils';

const MotionDiv = motion.div;

const formatCurrency = (amount, currency = 'INR') => (
    new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: currency || 'INR',
        maximumFractionDigits: 0,
    }).format(Number(amount || 0))
);

const formatDate = (value) => {
    if (!value) return null;

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;

    return new Intl.DateTimeFormat('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    }).format(date);
};

const getDealDateLabel = (deal) => {
    const closingDate = formatDate(deal?.poEndDate);
    if (closingDate) return `Closing ${closingDate}`;

    const updatedDate = formatDate(deal?.updatedAt || deal?.createdAt);
    return updatedDate ? `Updated ${updatedDate}` : 'Date not available';
};

export const CompanyWorkspace = ({ company, onAction }) => {
    const [activeTab, setActiveTab] = useState('contacts');
    const [openMenuId, setOpenMenuId] = useState(null);
    const menuCloseTimeoutRef = useRef(null);
    const contacts = company.contacts || [];
    const deals = company.deals || [];
    const notes = company.notes?.length ? company.notes : (company.activities || []);
    const [emails, setEmails] = useState(() => company.messages || []);

    const clearMenuCloseTimeout = () => {
        if (menuCloseTimeoutRef.current) {
            window.clearTimeout(menuCloseTimeoutRef.current);
            menuCloseTimeoutRef.current = null;
        }
    };

    const openActionMenu = (menuId) => {
        clearMenuCloseTimeout();
        setOpenMenuId(menuId);
    };

    const scheduleMenuClose = () => {
        clearMenuCloseTimeout();
        menuCloseTimeoutRef.current = window.setTimeout(() => {
            setOpenMenuId(null);
        }, 140);
    };

    const handleDelete = (type, id) => {
        switch (type) {
            case 'email': setEmails(prev => prev.filter(item => item.id !== id)); break;
            default: break;
        }
    };

    const tabs = [
        { id: 'contacts', label: 'Contacts', icon: Users },
        { id: 'deals', label: 'Deals', icon: Briefcase },
        { id: 'messages', label: 'Messages', icon: MessageSquare },
        { id: 'activities', label: 'Activities', icon: Calendar },
    ];

    return (
        <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl shadow-sm h-full flex flex-col overflow-hidden">
            <div className="border-b border-slate-200 dark:border-neutral-800 px-6 bg-slate-50/50 dark:bg-neutral-900/50">
                <div className="flex gap-8 overflow-x-auto no-scrollbar">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "relative py-4 text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap outline-none",
                                    isActive ? "text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:text-neutral-500 dark:hover:text-neutral-300"
                                )}
                            >
                                <Icon className={cn("w-4 h-4", isActive ? "text-blue-600 dark:text-blue-500" : "text-slate-400")} />
                                {tab.label}
                                {isActive && (
                                    <motion.div
                                        layoutId="workspaceTab"
                                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-500"
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="relative flex-1 overflow-hidden">
                <AnimatePresence mode="wait">
                    <MotionDiv
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute inset-0 overflow-y-auto custom-scrollbar p-6 space-y-8"
                    >
                        {activeTab === 'contacts' && (
                            <ContactsTab
                                contacts={contacts}
                                onAction={onAction}
                                openMenuId={openMenuId}
                                openActionMenu={openActionMenu}
                                scheduleMenuClose={scheduleMenuClose}
                            />
                        )}
                        {activeTab === 'deals' && (
                            <DealsTab
                                deals={deals}
                                financialSummary={company.financialSummary}
                                onAction={onAction}
                                openMenuId={openMenuId}
                                openActionMenu={openActionMenu}
                                scheduleMenuClose={scheduleMenuClose}
                            />
                        )}
                        {activeTab === 'messages' && (
                            <MessagesTab
                                emails={emails}
                                onAction={onAction}
                                onDelete={(id) => handleDelete('email', id)}
                                openMenuId={openMenuId}
                                openActionMenu={openActionMenu}
                                scheduleMenuClose={scheduleMenuClose}
                            />
                        )}
                        {activeTab === 'activities' && (
                            <ActivitiesTab
                                notes={notes}
                                onAction={onAction}
                                onDelete={(id, type) => handleDelete(type, id)}
                                openMenuId={openMenuId}
                                openActionMenu={openActionMenu}
                                scheduleMenuClose={scheduleMenuClose}
                            />
                        )}
                    </MotionDiv>
                </AnimatePresence>
            </div>
        </div>
    );
};

const SectionHeader = ({ title, onAdd, actionLabel = "Add New" }) => (
    <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">{title}</h3>
        {onAdd && (
            <button
                onClick={onAdd}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-600 dark:text-neutral-300 rounded-lg hover:border-blue-300 dark:hover:border-blue-700 hover:text-blue-600 dark:hover:text-blue-400 transition-all shadow-sm"
            >
                <Plus className="w-3.5 h-3.5" /> {actionLabel}
            </button>
        )}
    </div>
);

const ActionMenu = ({ id, isOpen, onOpen, onClose, onEdit, onDelete }) => (
    <div
        className="relative inline-block"
        onMouseEnter={() => onOpen(id)}
        onMouseLeave={onClose}
        onClick={(event) => event.stopPropagation()}
    >
        <button
            type="button"
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
        >
            <MoreHorizontal className="w-4 h-4" />
        </button>
        {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-neutral-900 rounded-lg shadow-xl border border-slate-100 dark:border-neutral-800 z-50 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-1">
                <button
                    onClick={(e) => { e.stopPropagation(); onClose(); onEdit && onEdit(); }}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-slate-600 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-neutral-800 rounded flex items-center gap-2"
                >
                    <Edit2 className="w-3 h-3" /> Edit
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onClose(); onDelete && onDelete(); }}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded flex items-center gap-2"
                >
                    <Trash2 className="w-3 h-3" /> Delete
                </button>
            </div>
        </div>
        )}
    </div>
);

const ContactsTab = ({ contacts = [], onAction, openMenuId, openActionMenu, scheduleMenuClose }) => (
    <div>
        <SectionHeader title="Key Stakeholders" onAdd={() => onAction && onAction('create_contact')} actionLabel="Add Contact" />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {contacts.map((contact) => (
                <div key={contact.id} className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 p-4 rounded-xl shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] hover:shadow-md transition-shadow group">
                    <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-neutral-800 dark:to-neutral-900 flex items-center justify-center font-bold text-sm text-slate-600 dark:text-neutral-300">
                                {(contact.name || '?').charAt(0)}
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900 dark:text-white text-sm">{contact.name}</h4>
                                <p className="text-xs text-slate-500">{contact.role || 'Role not available'}</p>
                            </div>
                        </div>
                        <ActionMenu
                            id={`contact-${contact.id}`}
                            isOpen={openMenuId === `contact-${contact.id}`}
                            onOpen={openActionMenu}
                            onClose={scheduleMenuClose}
                            onEdit={() => onAction('edit_contact', contact)}
                            onDelete={() => onAction('delete_contact', contact)}
                        />
                    </div>

                    <div className="space-y-2 mt-4">
                        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-neutral-400 p-1.5">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            <span className="truncate">{contact.email || 'Email not available'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-neutral-400 p-1.5">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>{contact.phone || 'Phone not available'}</span>
                        </div>
                    </div>

                    {contact.isPrimary && (
                        <div className="mt-3 pt-3 border-t border-slate-50 dark:border-neutral-800">
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded border border-amber-100 dark:border-amber-900/50">
                                <Star className="w-3 h-3 fill-amber-500/20 text-amber-500" /> Primary
                            </span>
                        </div>
                    )}
                </div>
            ))}

            <button
                onClick={() => onAction && onAction('create_contact')}
                className="flex flex-col items-center justify-center gap-2 h-full min-h-[160px] border border-dashed border-slate-300 dark:border-neutral-700 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-neutral-300 hover:border-slate-400 dark:hover:border-neutral-600 hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition-all group/add"
            >
                <div className="p-3 bg-slate-50 dark:bg-neutral-800 group-hover/add:bg-white dark:group-hover/add:bg-neutral-700 rounded-full transition-colors border border-slate-100 dark:border-neutral-700">
                    <Plus className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium">Add New Contact</span>
            </button>
        </div>
    </div>
);

const DealsTab = ({ deals = [], financialSummary, onAction, openMenuId, openActionMenu, scheduleMenuClose }) => (
    <div className="space-y-10">
        <div className="grid grid-cols-3 gap-6">
            {[
                {
                    label: 'Total Outstanding',
                    value: formatCurrency(financialSummary?.totalOutstanding, financialSummary?.currency),
                    color: 'text-rose-500',
                    helper: 'Pipeline value in open deals',
                },
                {
                    label: 'YTD Revenue',
                    value: formatCurrency(financialSummary?.ytdRevenue, financialSummary?.currency),
                    color: 'text-emerald-500',
                    helper: `${financialSummary?.ytdRevenueProjects || 0} projects received so far`,
                },
                {
                    label: 'Open Orders',
                    value: `${financialSummary?.openOrders || 0} / ${financialSummary?.totalOrders || 0}`,
                    color: 'text-blue-500',
                    helper: 'Open deals / total deals',
                },
            ].map((stat, idx) => (
                <div key={idx} className="p-1">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-wider mb-1">{stat.label}</p>
                    <h3 className={cn("text-2xl font-bold tracking-tight", stat.color)}>{stat.value}</h3>
                    <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">{stat.helper}</p>
                </div>
            ))}
        </div>

        <div className="space-y-4">
            <SectionHeader title="Active Opportunities" onAdd={() => onAction && onAction('create_deal')} actionLabel="New Deal" />

            <div className="flex flex-col gap-3">
                {deals.length > 0 ? deals.map((deal) => (
                    <div key={deal.id} className="group flex flex-col sm:flex-row gap-4 p-4 rounded-xl bg-slate-50 dark:bg-neutral-800/50 border border-slate-200 dark:border-neutral-800/50 hover:bg-white dark:hover:bg-neutral-800 hover:border-blue-200 dark:hover:border-blue-900/50 transition-all">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                                <h4 className="font-bold text-slate-900 dark:text-white text-base truncate">{deal.title}</h4>
                                <span className="px-2.5 py-0.5 text-[10px] font-bold bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 rounded-md border border-blue-200 dark:border-blue-500/20">
                                    {deal.stageLabel || deal.stage}
                                </span>
                            </div>
                            <div className="flex items-center gap-6 text-xs text-slate-500 dark:text-neutral-400">
                                <span className="flex items-center gap-1.5 font-medium">
                                    <span className="text-slate-400 dark:text-neutral-600">Value:</span>
                                    <span className="text-slate-700 dark:text-neutral-200 font-mono">{formatCurrency(deal.value, deal.currency)}</span>
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                    <span>{getDealDateLabel(deal)}</span>
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-6 w-full sm:w-auto mt-2 sm:mt-0">
                            <div className="flex-1 sm:w-48">
                                <div className="flex justify-between text-[10px] font-bold text-slate-400 dark:text-neutral-500 mb-1.5">
                                    <span>Probability</span>
                                    <span className={cn(
                                        deal.probability > 70 ? "text-emerald-500" : "text-blue-500"
                                    )}>{`${deal.probability || 0}%`}</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                                    <div
                                        className={cn("h-full rounded-full bg-gradient-to-r", deal.probability > 70 ? "from-emerald-500 to-emerald-400" : "from-blue-500 to-blue-400")}
                                        style={{ width: `${deal.probability || 0}%` }}
                                    />
                                </div>
                            </div>
                            <ActionMenu
                                id={`deal-${deal.id}`}
                                isOpen={openMenuId === `deal-${deal.id}`}
                                onOpen={openActionMenu}
                                onClose={scheduleMenuClose}
                                onEdit={() => onAction('edit_deal', deal)}
                                onDelete={() => onAction('delete_deal', deal)}
                            />
                        </div>
                    </div>
                )) : (
                    <div className="text-sm text-slate-400 dark:text-neutral-600 italic py-8 text-center border border-dashed border-slate-200 dark:border-neutral-800 rounded-xl">
                        No deals available for this company.
                    </div>
                )}
            </div>
        </div>
    </div>
);

const MessagesTab = ({ emails = [], onAction, onDelete, openMenuId, openActionMenu, scheduleMenuClose }) => (
    <div>
        <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Timeline</h3>
            <div className="flex gap-3">
                <button onClick={() => onAction && onAction('compose_email')} className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold border border-slate-200 dark:border-neutral-700 rounded-lg hover:bg-slate-50 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300 transition-colors">
                    <Mail className="w-3.5 h-3.5" /> Compose
                </button>
                <button onClick={() => onAction && onAction('send_whatsapp')} className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors">
                    <Smartphone className="w-3.5 h-3.5" /> WhatsApp
                </button>
            </div>
        </div>

        {emails.length === 0 ? (
            <div className="text-sm text-slate-400 dark:text-neutral-600 italic py-8 text-center border border-dashed border-slate-200 dark:border-neutral-800 rounded-xl">
                No company messages available.
            </div>
        ) : (
            <div className="relative border-l border-slate-200 dark:border-neutral-800 ml-4 space-y-8 pb-4">
                {emails.map((msg) => (
                    <div key={msg.id} className="relative pl-8 group">
                        <div className={cn(
                            "absolute -left-3 top-0 w-6 h-6 rounded-full border-4 border-white dark:border-black flex items-center justify-center text-[10px]",
                            msg.type === 'email' ? "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400" : "bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400"
                        )}>
                            <div className="w-2 h-2 rounded-full bg-current" />
                        </div>

                        <div className="bg-slate-50 dark:bg-neutral-900/50 border border-slate-200 dark:border-neutral-800 rounded-xl p-4 transition-all hover:border-slate-300 dark:hover:border-neutral-700">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-2">
                                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide",
                                        msg.type === 'email' ? "bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400" : "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                    )}>
                                        {msg.type === 'email' ? 'Email' : 'WhatsApp'}
                                    </span>
                                </div>
                                <span className="text-xs text-slate-400 dark:text-neutral-500">{formatDate(msg.date) || 'Date not available'}</span>
                            </div>

                            <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1">{msg.title || 'Untitled message'}</h4>
                            <p className="text-sm text-slate-600 dark:text-neutral-400 leading-relaxed font-medium">
                                {msg.content || 'Message content not available'}
                            </p>

                            <div className="mt-3 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                <ActionMenu
                                    id={`message-${msg.id}`}
                                    isOpen={openMenuId === `message-${msg.id}`}
                                    onOpen={openActionMenu}
                                    onClose={scheduleMenuClose}
                                    onEdit={() => onAction('edit_msg')}
                                    onDelete={() => onDelete(msg.id)}
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}
    </div>
);

const ActivitiesTab = ({ notes = [], onAction, onDelete, openMenuId, openActionMenu, scheduleMenuClose }) => (
    <div className="space-y-4">
        <div className="space-y-4">
            <SectionHeader title="Notes" onAdd={() => onAction && onAction('create_note')} actionLabel="Add Note" />
            <div className="grid grid-cols-1 gap-3">
                {notes.map((note) => (
                    <div key={note.id} className="bg-yellow-50/50 dark:bg-neutral-900 border border-yellow-100/50 dark:border-neutral-800 p-4 rounded-xl relative group hover:shadow-sm transition-all">
                        <div className="absolute top-0 left-0 w-1 h-full bg-yellow-400 dark:bg-neutral-700 rounded-l-xl opacity-50 dark:opacity-100" />

                        <div className="pl-2">
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-bold text-slate-800 dark:text-white text-sm">{note.title || 'Activity'}</h4>
                                <span className="text-[10px] font-mono text-slate-400 dark:text-neutral-500">{formatDate(note.date) || 'Date not available'}</span>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-neutral-400 leading-relaxed">
                                {note.content || 'No activity details available.'}
                            </p>
                        </div>

                        {String(note.id).startsWith('note-') && (
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <ActionMenu
                                    id={`note-${note.id}`}
                                    isOpen={openMenuId === `note-${note.id}`}
                                    onOpen={openActionMenu}
                                    onClose={scheduleMenuClose}
                                    onEdit={() => onAction && onAction('edit_note', note)}
                                    onDelete={() => onAction ? onAction('delete_note', note) : onDelete(note.id, 'note')}
                                />
                            </div>
                        )}
                    </div>
                ))}
                {notes.length === 0 && (
                    <div className="text-sm text-slate-400 dark:text-neutral-600 italic py-8 text-center border border-dashed border-slate-200 dark:border-neutral-800 rounded-xl">
                        No notes added.
                    </div>
                )}
            </div>
        </div>
    </div>
);
