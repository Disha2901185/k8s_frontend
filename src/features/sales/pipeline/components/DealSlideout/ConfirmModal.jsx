import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, X, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

export const ConfirmModal = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title = "Discard Changes?", 
    message = "You have unsaved changes. Are you sure you want to revert? This action cannot be undone.",
    confirmLabel = "Revert Changes",
    cancelLabel = "Continue Editing"
}) => {
    if (!isOpen) return null;

    return createPortal(
        <AnimatePresence>
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-8 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900 text-left relative overflow-hidden"
                >
                    {/* Decorative Background Element */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none" />

                    <div className="flex items-start gap-5 relative z-10">
                        <div className="inline-flex rounded-2xl bg-amber-50 p-3.5 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 shrink-0 shadow-sm border border-amber-100 dark:border-amber-900/30">
                            <AlertCircle className="h-6 w-6" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3 className="text-xl font-bold text-slate-950 dark:text-white tracking-tight">{title}</h3>
                            <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-neutral-400 font-medium">
                                {message}
                            </p>
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end gap-3 relative z-10">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 sm:flex-none rounded-full px-6 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 dark:text-neutral-300 dark:hover:bg-neutral-800 transition-all border border-slate-200 dark:border-neutral-800"
                        >
                            {cancelLabel}
                        </button>
                        <button
                            type="button"
                            onClick={onConfirm}
                            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-6 py-3 text-sm font-bold text-white hover:bg-black dark:bg-white dark:text-black dark:hover:bg-slate-200 transition-all shadow-lg shadow-black/10"
                        >
                            <RotateCcw className="h-4 w-4" />
                            {confirmLabel}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>,
        document.body
    );
};
