import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Mail, StickyNote, ArrowLeft, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

export const DetailHeader = ({
    title,
    subtitle,
    status,
    statusColor = "blue",
    stages = [],
    currentStage,
    onStageClick,
    onAction,
    backPath
}) => {
    const navigate = useNavigate();

    const getStatusColor = (color) => {
        const colors = {
            blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800",
            green: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
            amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800",
            rose: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 border-rose-200 dark:border-rose-800",
            slate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
        };
        return colors[color] || colors.slate;
    };

    return (
        <div className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 shadow-sm transition-all">
            <div className="px-6 py-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                        {backPath && (
                            <button
                                onClick={() => navigate(backPath)}
                                className="p-2 -ml-2 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                        )}

                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{title}</h1>
                                {status && !stages.length && (
                                    <span className={cn(
                                        "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border",
                                        getStatusColor(statusColor)
                                    )}>
                                        {status}
                                    </span>
                                )}
                            </div>
                            {subtitle && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">{subtitle}</p>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <ActionButton
                            icon={MessageCircle}
                            color="text-emerald-600 dark:text-emerald-400"
                            bg="bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40"
                            label="WhatsApp"
                            onClick={() => onAction && onAction('whatsapp')}
                        />
                        <ActionButton
                            icon={Mail}
                            color="text-blue-600 dark:text-blue-400"
                            bg="bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40"
                            label="Email"
                            onClick={() => onAction && onAction('email')}
                        />
                        <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-1" />
                        <ActionButton
                            icon={StickyNote}
                            color="text-amber-600 dark:text-amber-400"
                            bg="bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 dark:hover:bg-amber-900/40"
                            label="Log Note"
                            onClick={() => onAction && onAction('note')}
                        />
                    </div>
                </div>

                {/* Deal Stage Progress Bar */}
                {stages.length > 0 && (
                    <div className="w-full flex items-center bg-slate-100 dark:bg-slate-900/50 rounded-lg p-1">
                        {stages.map((stage, index) => {
                            const isCompleted = stages.indexOf(currentStage) > index;
                            const isCurrent = currentStage === stage;

                            return (
                                <button
                                    key={stage}
                                    onClick={() => onStageClick && onStageClick(stage)}
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold uppercase tracking-wider transition-all rounded-lg relative group",
                                        isCompleted ? "bg-emerald-500 text-white" : "",
                                        isCurrent ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" : "",
                                        !isCompleted && !isCurrent ? "text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800" : ""
                                    )}
                                >
                                    {isCompleted && <Check className="w-3.5 h-3.5" />}
                                    {stage}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

const ActionButton = ({ icon: Icon, color, bg, label, onClick }) => (
    <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onClick}
        className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors border border-transparent",
            bg,
            color
        )}
    >
        <Icon className="w-4 h-4" />
        <span className="text-xs font-bold hidden sm:inline-block">{label}</span>
    </motion.button>
);
