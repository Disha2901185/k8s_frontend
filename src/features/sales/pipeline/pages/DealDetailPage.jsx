import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { DetailedViewLayout } from '@/features/shared/components/DetailedViewLayout';
import { EnhancedActivityTimeline } from '@/features/shared/components/EnhancedActivityTimeline';
import { FinancialOverview } from '@/features/sales/pipeline/components/FinancialOverview';
import { DocumentsTab } from '@/features/sales/pipeline/components/DocumentsTab';
import { History, CheckCircle2, DollarSign, FileText, Loader2, AlertCircle } from 'lucide-react';
import { dealApi } from '@/lib/api';

const STAGES = ['DISCOVERY', 'PROPOSAL', 'NEGOTIATION', 'NOT_PROGRESSING', 'CLOSED_WON'];

export const DealDetailPage = () => {
    const { id } = useParams();
    const [deal, setDeal] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showEnrichmentGate, setShowEnrichmentGate] = useState(false);

    useEffect(() => {
        fetchDeal();
    }, [id]);

    const fetchDeal = async () => {
        try {
            setLoading(true);
            const response = await dealApi.getById(id);
            setDeal(response.data);
            setError(null);
        } catch (err) {
            setError("Failed to fetch deal details");
        } finally {
            setLoading(false);
        }
    };

    const handleStageChange = (newStage) => {
        if (newStage === 'CLOSED_WON') {
            setShowEnrichmentGate(true);
        } else {
            // In real app, trigger API update
            console.log('Update stage to:', newStage);
        }
    };

    const handleEnrichmentComplete = () => {
        setDeal(prev => ({ ...prev, stage: 'CLOSED_WON' }));
        setShowEnrichmentGate(false);
    };

    if (loading) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <p className="text-sm font-medium">Loading deal details...</p>
            </div>
        );
    }

    if (error || !deal) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-3">
                <AlertCircle className="w-8 h-8 text-rose-500" />
                <p className="text-sm font-medium">{error || "Deal not found"}</p>
            </div>
        );
    }

    const sidebarSections = [
        {
            title: 'Deal Info',
            items: [
                { label: 'Deal Value', value: `₹ ${parseFloat(deal.value).toLocaleString('en-IN')}`, editable: true },
                { label: 'Currency', value: deal.currency || 'INR', editable: true },
                { label: 'Created At', value: new Date(deal.createdAt).toLocaleDateString(), editable: false }
            ]
        },
        {
            title: 'Related Entities',
            items: [
                { label: 'Company', value: deal.company?.name || 'N/A', type: 'link', href: `/companies/${deal.companyId}` },
                { label: 'Primary Contact', value: deal.primaryContact?.fullName || 'N/A', type: 'link', href: deal.primaryContactId ? `/contacts/${deal.primaryContactId}` : null }
            ]
        },
        {
            title: 'Compliance & Project',
            items: [
                { label: 'GSTIN', value: deal.taxId || 'Not Provided', editable: true },
                { label: 'Project Type', value: deal.projectType || '', editable: true },
                { label: 'Payment Terms', value: deal.paymentTerms || 'Standard', editable: true }
            ]
        }
    ];

    const tabs = [
        {
            id: 'timeline',
            label: 'Activity & Audit',
            icon: History,
            content: <EnhancedActivityTimeline activities={[]} /> // Activities would come from another API call or relation
        },
        {
            id: 'documents',
            label: 'Docs & PO',
            icon: FileText,
            content: <DocumentsTab documents={[]} />
        },
        {
            id: 'financial',
            label: 'Financials',
            icon: DollarSign,
            content: <FinancialOverview data={{ totalValue: parseFloat(deal.value), invoicedAmount: 0, unallocatedAmount: parseFloat(deal.value), outstandingAR: 0, milestones: [] }} isClosedWon={deal.stage === 'CLOSED_WON'} />
        }
    ];

    return (
        <>
            <DetailedViewLayout
                title={deal.title}
                subtitle={`Associated with ${deal.company?.name || 'Unknown'}`}
                stages={STAGES}
                currentStage={deal.stage}
                onStageClick={handleStageChange}
                backPath="/pipeline"
                sidebarSections={sidebarSections}
                tabs={tabs}
                onHeaderAction={(action) => console.log('Action:', action)}
            />

            {/* Enrichment Gate Modal */}
            {showEnrichmentGate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200 text-left">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-full">
                                    <CheckCircle2 className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">Deal Won! Finalize Details</h3>
                            </div>
                            <p className="text-slate-500 text-sm">Before closing this deal, please confirm the following accounting details to generate the Sales Order.</p>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">PO Number <span className="text-rose-500">*</span></label>
                                    <input className="w-full mt-1 px-3 py-2 border dark:border-slate-800 dark:bg-slate-950 rounded-lg text-sm" placeholder="PO-XXXX" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">PO Date</label>
                                    <input type="date" className="w-full mt-1 px-3 py-2 border dark:border-slate-800 dark:bg-slate-950 rounded-lg text-sm" />
                                </div>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-800">
                                <h4 className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">System Validation</h4>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-sm text-emerald-600">
                                        <CheckCircle2 className="w-4 h-4" /> Valid GSTIN Present
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-emerald-600">
                                        <CheckCircle2 className="w-4 h-4" /> Primary Contact Assigned
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
                            <button
                                onClick={() => setShowEnrichmentGate(false)}
                                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleEnrichmentComplete}
                                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg shadow-lg shadow-emerald-600/20 transition-all uppercase tracking-tight"
                            >
                                Confirm & Close Won
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
