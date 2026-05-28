import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowLeft, Check, Loader2, ArrowRight, Building2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDealWorkflow } from '../../hooks/useDealWorkflow';
import { DealStep1 } from './DealStep1';
import { EnrichmentStep2 } from './EnrichmentStep2';


const MotionDiv = motion.div;

export const AddDealDrawer = ({ isOpen, onClose, deal = null, onSubmit = null, lockedCompany = null }) => {
    const [showToast, setShowToast] = useState(false);

    // Intercept generic onClose to show success toast first
    const handleSuccess = () => {
        setShowToast(true);
        setTimeout(() => {
            setShowToast(false);
            onClose();
        }, 1500);
    };

    const {
        currentStep,
        form,
        isSubmitting,
        submitError,
        stage,
        handleNext,
        handleBack,
    } = useDealWorkflow(handleSuccess, deal, onSubmit);

    if (!isOpen && !showToast) return null;

    const handleCloseRequest = () => onClose();

    return createPortal(
        <div className="fixed inset-0 z-[150] overflow-hidden">
            {/* Backdrop */}
            <AnimatePresence>
                {isOpen && (
                    <MotionDiv
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleCloseRequest}
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                    />
                )}
            </AnimatePresence>

            {/* Right Drawer */}
            <MotionDiv
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="absolute inset-y-0 right-0 w-full md:w-[500px] bg-white dark:bg-neutral-900 shadow-2xl flex flex-col h-full border-l border-slate-100 dark:border-neutral-800"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md z-10 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                            <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
                                {currentStep === 1 ? (deal ? "Edit Deal Details" : "Add New Deal") : "Enrich Order Details"}
                            </h2>
                        </div>
                    </div>
                    <button
                        onClick={handleCloseRequest}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-neutral-800 rounded-md transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    <div className="h-full space-y-6">
                        <AnimatePresence mode="wait">
                            {currentStep === 1 && (
                                <DealStep1 key="step1" form={form} lockedCompany={lockedCompany} />
                            )}
                            {currentStep === 2 && (
                                <EnrichmentStep2 key="step2" form={form} />
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-5 border-t border-slate-100 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md flex gap-3 sticky bottom-0 z-10 shrink-0">
                    {submitError && (
                        <div className="absolute left-6 right-6 -top-10 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-500">
                            {submitError}
                        </div>
                    )}
                    {currentStep === 2 && (
                        <button
                            type="button"
                            onClick={handleBack}
                            className="px-4 py-2.5 text-[10px] font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-neutral-800 rounded-md transition-colors border border-slate-200 dark:border-neutral-800 flex items-center gap-2"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" /> Back
                        </button>
                    )}

                    <button
                        onClick={handleCloseRequest}
                        className={cn(
                            "flex-1 px-4 py-2.5 border border-slate-200 dark:border-neutral-800 text-slate-600 dark:text-slate-300 font-bold rounded-md hover:bg-slate-50 dark:hover:bg-neutral-800 transition-colors text-xs",
                            currentStep === 2 ? "hidden" : "block"
                        )}
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        onClick={handleNext}
                        disabled={isSubmitting}
                        className={cn(
                            "flex-[1.5] px-4 py-2.5 relative font-bold rounded-md shadow-lg transition-all duration-200 text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        )}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Processing</span>
                            </>
                        ) : currentStep === 1 ? (
                            stage === 'Closed Won' ? (
                                <>
                                    <span>Next Step</span>
                                    <ArrowRight className="w-3.5 h-3.5" />
                                </>
                            ) : (
                                deal ? "Save Changes" : "Create Deal"
                            )
                        ) : (
                            <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Confirm Order</span>
                            </>
                        )}
                    </button>
                </div>
            </MotionDiv>

            {/* Success Toast */}
            <AnimatePresence>
                {showToast && (
                    <MotionDiv
                        initial={{ opacity: 0, y: 20, x: '-50%' }}
                        animate={{ opacity: 1, y: 0, x: '-50%' }}
                        exit={{ opacity: 0, y: 20, x: '-50%' }}
                        className="fixed bottom-8 left-1/2 z-[200] bg-emerald-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3"
                    >
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="font-semibold text-sm tracking-wide">
                            {deal ? "Deal Updated Successfully!" : "Deal Created Successfully!"}
                        </span>
                    </MotionDiv>
                )}
            </AnimatePresence>

        </div>,
        document.body
    );
};
