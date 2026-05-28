import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Filter, MessageSquare, StickyNote, Mail, AlertCircle, ArrowUp, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

export const EnhancedActivityTimeline = ({ activities = [] }) => {
    const [note, setNote] = useState('');
    const [filter, setFilter] = useState('all'); // all, note, system, communication

    const filteredActivities = activities.filter(activity => {
        if (filter === 'all') return true;

        if (filter === 'communication') {
            return ['email', 'whatsapp', 'call'].includes(activity.type);
        }

        return activity.type === filter;
    });

    return (
        <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/20">
            {/* Sticky "Quick Note" Input */}
            <div className="p-4 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 shadow-sm transition-all group focus-within:shadow-md">
                <div className="relative">
                    <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Log a call, add a note, or paste a message (Cmd+K)..."
                        className="w-full min-h-[60px] focus:min-h-[100px] p-3 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none transition-all"
                    />
                    <div className="flex items-center justify-between mt-2 opacity-0 group-focus-within:opacity-100 transition-opacity">
                        <div className="flex gap-2 text-xs">
                            <button className="flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-600">
                                <StickyNote className="w-3 h-3" /> Note
                            </button>
                            <button className="flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-600">
                                <DollarSign className="w-3 h-3" /> Financial
                            </button>
                        </div>
                        <button
                            disabled={!note.trim()}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wide transition-all disabled:opacity-50"
                        >
                            Save Note
                        </button>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="px-4 py-3 flex gap-2 overflow-x-auto no-scrollbar border-b border-slate-100 dark:border-slate-800/50">
                <FilterButton label="All" active={filter === 'all'} onClick={() => setFilter('all')} />
                <FilterButton label="Notes" active={filter === 'note'} onClick={() => setFilter('note')} />
                <FilterButton label="Communications" active={filter === 'communication'} onClick={() => setFilter('communication')} />
                <FilterButton label="System Events" active={filter === 'system'} onClick={() => setFilter('system')} />
            </div>

            {/* Timeline Feed */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {filteredActivities.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-sm">
                        No interactions found.
                    </div>
                ) : (
                    filteredActivities.map((activity, index) => (
                        <div key={activity.id || index} className="flex gap-4 group">
                            {/* Icon Line */}
                            <div className="flex flex-col items-center">
                                <ActivityIcon type={activity.type} />
                                {index < filteredActivities.length - 1 && (
                                    <div className="w-px h-full bg-slate-200 dark:bg-slate-800 my-2 group-hover:bg-slate-300 transition-colors" />
                                )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 pb-4">
                                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg p-4 shadow-sm hover:border-blue-200 dark:hover:border-blue-800 transition-colors">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-slate-900 dark:text-white">{activity.title}</span>
                                            {activity.author && (
                                                <span className="text-[10px] text-slate-400 font-medium px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full">by {activity.author}</span>
                                            )}
                                        </div>
                                        <span className="text-[10px] text-slate-400">{activity.timestamp}</span>
                                    </div>
                                    <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                                        {activity.content}
                                    </p>
                                    {activity.tags && (
                                        <div className="mt-3 flex gap-2">
                                            {activity.tags.map((tag, i) => (
                                                <span key={i} className="text-[10px] font-medium px-2 py-0.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded text-slate-500">
                                                    #{tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

const FilterButton = ({ label, active, onClick }) => (
    <button
        onClick={onClick}
        className={cn(
            "px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all whitespace-nowrap",
            active
                ? "bg-slate-800 text-white border-slate-800 dark:bg-white dark:text-slate-900"
                : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-700"
        )}
    >
        {label}
    </button>
);

const ActivityIcon = ({ type }) => {
    const icons = {
        system: { icon: AlertCircle, color: "bg-slate-100 text-slate-500 border-slate-200" },
        note: { icon: StickyNote, color: "bg-amber-100 text-amber-600 border-amber-200" },
        email: { icon: Mail, color: "bg-blue-100 text-blue-600 border-blue-200" },
        whatsapp: { icon: MessageSquare, color: "bg-emerald-100 text-emerald-600 border-emerald-200" },
        financial: { icon: DollarSign, color: "bg-purple-100 text-purple-600 border-purple-200" },
    };

    const style = icons[type] || icons.note;
    const Icon = style.icon;

    return (
        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center border shrink-0 z-10", style.color)}>
            <Icon className="w-4 h-4" />
        </div>
    );
};
