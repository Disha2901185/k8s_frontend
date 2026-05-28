import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export const ProgressHeader = ({ currentStep }) => {
    return (
        <div className="flex items-center justify-center space-x-4 mb-2">
            {/* Step 1 */}
            <div className="flex items-center">
                <div className={cn(
                    "flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold transition-colors duration-300 ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-900",
                    currentStep > 1
                        ? "bg-emerald-500 text-white ring-emerald-500"
                        : "bg-blue-600 text-white ring-blue-600"
                )}>
                    {currentStep > 1 ? <Check className="w-3.5 h-3.5" /> : "1"}
                </div>
                <span className={cn(
                    "ml-2 text-xs font-semibold uppercase tracking-wider transition-colors duration-300",
                    currentStep >= 1 ? "text-slate-900 dark:text-white" : "text-slate-400"
                )}>
                    Deal Info
                </span>
            </div>

            {/* Connector Line */}
            <div className="w-12 h-[2px] bg-slate-100 dark:bg-slate-800 relative overflow-hidden rounded-full">
                <motion.div
                    initial={{ x: '-100%' }}
                    animate={{ x: currentStep > 1 ? '0%' : '-100%' }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                    className="absolute inset-0 bg-emerald-500"
                />
            </div>

            {/* Step 2 */}
            <div className="flex items-center">
                <div className={cn(
                    "flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold transition-colors duration-300 ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 border",
                    currentStep === 2
                        ? "bg-blue-600 text-white border-blue-600 ring-blue-600"
                        : "bg-white dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-700 ring-transparent"
                )}>
                    2
                </div>
                <span className={cn(
                    "ml-2 text-xs font-semibold uppercase tracking-wider transition-colors duration-300",
                    currentStep === 2 ? "text-slate-900 dark:text-white" : "text-slate-400"
                )}>
                    Enrichment
                </span>
            </div>
        </div>
    );
};
