import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    MessageSquare,
    Mail,
    FileText,
    Clock,
    CheckCircle2,
    AlertCircle,
    Send,
    Calendar,
    MoreHorizontal
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SmartSelect } from '@/components/ui/SmartSelect';

export const ActivityTimeline = ({ activities = [] }) => {
    const [note, setNote] = useState('');

    return (
        <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/20">
            {/* Sticky "Quick Note" Input */}
            <div className="p-4 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 shadow-sm">
                <div className="relative">
                    <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Log a call, add a note, or paste a message..."
                        className="w-full min-h-[80px] p-3 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none transition-all"
                    />
                    <div className="flex items-center justify-between mt-2">
                        <div className="flex gap-2">
                            <button className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-md transition-colors" title="Set Reminder">
                                <Calendar className="w-4 h-4" />
                            </button>
                            <button className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-md transition-colors" title="Mark Complete">
                                <CheckCircle2 className="w-4 h-4" />
                            </button>
                        </div>
                        <button
                            disabled={!note.trim()}
                            className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-bold uppercase tracking-wide transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Send className="w-3 h-3" />
                            Save
                        </button>
                    </div>
                </div>
            </div>

            {/* Timeline Feed */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {activities.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-sm">
                        No activity yet. Start by adding a note!
                    </div>
                ) : (
                    activities.map((activity, index) => (
                        <TimelineItem key={activity.id || index} activity={activity} isLast={index === activities.length - 1} />
                    ))
                )}
            </div>
        </div>
    );
};

const TimelineItem = ({ activity, isLast }) => {
    const icons = {
        system: AlertCircle,
        note: FileText,
        email: Mail,
        whatsapp: MessageSquare,
        meeting: Clock
    };

    const colors = {
        system: "bg-slate-100 text-slate-600 border-slate-200",
        note: "bg-amber-100 text-amber-600 border-amber-200",
        email: "bg-blue-100 text-blue-600 border-blue-200",
        whatsapp: "bg-emerald-100 text-emerald-600 border-emerald-200",
        meeting: "bg-purple-100 text-purple-600 border-purple-200"
    };

    const Icon = icons[activity.type] || FileText;
    const styleClass = colors[activity.type] || colors.note;

    return (
        <div className="flex gap-4 group">
            {/* Icon Column */}
            <div className="flex flex-col items-center">
                <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center border shrink-0 z-10",
                    styleClass
                )}>
                    <Icon className="w-4 h-4" />
                </div>
                {!isLast && (
                    <div className="w-px h-full bg-slate-200 dark:bg-slate-800 my-2 group-hover:bg-slate-300 transition-colors" />
                )}
            </div>

            {/* Content Card */}
            <div className="flex-1 pb-4">
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                            {activity.title || activity.type}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                            {activity.timestamp}
                        </span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {activity.content}
                    </p>

                    {activity.meta && (
                        <div className="mt-3 pt-2 border-t border-slate-50 dark:border-slate-800/50 flex flex-wrap gap-2">
                            {activity.meta.map((tag, i) => (
                                <span key={i} className="px-2 py-0.5 bg-slate-50 dark:bg-slate-800 text-slate-500 text-[10px] rounded-md border border-slate-100 dark:border-slate-700 font-medium">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
