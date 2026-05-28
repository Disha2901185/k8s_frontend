import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, FileText, PieChart, TrendingUp, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export const FinancialOverview = ({ data, isClosedWon }) => {
    if (!isClosedWon) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-10 text-center">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                    <DollarSign className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Financial Snapshot Locked</h3>
                <p className="text-slate-500 max-w-sm">
                    Financial details and milestone tracking are only available for deals in the <strong>Closed Won</strong> stage.
                </p>
            </div>
        );
    }

    const { totalValue, invoicedAmount, unallocatedAmount, milestones = [], outstandingAR } = data;
    const invoiceProgress = (invoicedAmount / totalValue) * 100;

    return (
        <div className="p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Top Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                    title="Total Contract Value"
                    value={formatCurrency(totalValue)}
                    icon={DollarSign}
                    color="blue"
                />
                <StatCard
                    title="Invoiced to Date"
                    value={formatCurrency(invoicedAmount)}
                    subValue={`${invoiceProgress.toFixed(1)}% Completed`}
                    icon={FileText}
                    color="emerald"
                />
                <StatCard
                    title="Unallocated Balance"
                    value={formatCurrency(unallocatedAmount)}
                    subValue="Requires Milestone"
                    icon={PieChart}
                    color="amber"
                />
            </div>

            {/* Invoicing Progress */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex justify-between items-end mb-4">
                    <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Invoicing Status</h4>
                        <p className="text-xs text-slate-500 mt-1">Real-time tracking of raised invoices against TCV.</p>
                    </div>
                    <div className="text-right">
                        <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">{Math.round(invoiceProgress)}%</span>
                    </div>
                </div>
                <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${invoiceProgress}%` }}
                        transition={{ duration: 1, ease: "circOut" }}
                        className="h-full bg-emerald-500"
                    />
                </div>
            </div>

            {/* Outstanding AR Warning */}
            {outstandingAR > 0 && (
                <div className="bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-800 p-4 rounded-xl flex items-start gap-4">
                    <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-full shrink-0">
                        <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-rose-700 dark:text-rose-300">Outstanding Accounts Receivable</h4>
                        <p className="text-sm text-rose-600 dark:text-rose-400 mt-1">
                            There are overdue invoices totaling <strong>{formatCurrency(outstandingAR)}</strong> for this account.
                            Please follow up before processing further milestones.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

const StatCard = ({ title, value, subValue, icon: Icon, color }) => {
    const colors = {
        blue: "bg-blue-50 text-blue-600 border-blue-200",
        emerald: "bg-emerald-50 text-emerald-600 border-emerald-200",
        amber: "bg-amber-50 text-amber-600 border-amber-200"
    };

    return (
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                    <div className={cn("p-1.5 rounded-md", colors[color])}>
                        <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</span>
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{value}</div>
                {subValue && <div className="text-xs font-medium text-slate-500 mt-1">{subValue}</div>}
            </div>
        </div>
    );
};

const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(val);
};
