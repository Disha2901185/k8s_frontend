import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { KPIGrid } from '../components/KPIGrid';
import { DashboardCharts } from '../components/DashboardCharts';
import { ActionCenter } from '../components/ActionCenter';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { financeOpsApi } from '@/lib/api';
import { callApi } from '@/lib/apiService';

const FILTER_OPTIONS = [
    { label: 'Select', value: 'select' },
    { label: 'This Month', value: 'thisMonth' },
    { label: 'Last Month', value: 'lastMonth' },
    { label: 'This Quarter', value: 'thisQuarter' },
    { label: 'Last Quarter', value: 'lastQuarter' },
    { label: 'This Fin Year', value: 'thisFinYear' },
    { label: 'Custom', value: 'custom' }
];

const getTodayDate = () => new Date().toISOString().split('T')[0];

export const DashboardPage = () => {
    const location = useLocation();
    
    // Initialize from location.state if we navigated back from a sub-page
    const [selectedRange, setSelectedRange] = useState(location.state?.range || 'thisMonth');
    const [fromDate, setFromDate] = useState(location.state?.fromDate || '');
    const [toDate, setToDate] = useState(location.state?.toDate || '');
    const [kpiData, setKpiData] = useState([]);
    const [loading, setLoading] = useState(true);

    const maxSelectableDate = getTodayDate();
    const isCustomRange = selectedRange === 'custom';
    const hasInvalidCustomRange = isCustomRange && fromDate && toDate && fromDate > toDate;

    useEffect(() => {
        let active = true;

        const loadKpiData = async () => {
            if (selectedRange === 'custom') {
                if (!fromDate || !toDate || fromDate > toDate) {
                    setKpiData([
                        { title: 'New Orders', value: '0', trend: null, trendUp: true, description: 'Select a valid custom date range' },
                        { title: 'Collection', value: '0', trend: null, trendUp: true, description: 'Select a valid custom date range' },
                        { title: 'Billing', value: '0', trend: null, trendUp: true, description: 'Select a valid custom date range' },
                        { title: 'Order Value', value: '0', trend: null, trendUp: true, description: 'Select a valid custom date range' }
                    ]);
                    setLoading(false);
                    return;
                }
            }

            try {
                setLoading(true);
                const params = { range: selectedRange };
                if (selectedRange === 'custom') {
                    params.fromDate = fromDate;
                    params.toDate = toDate;
                }

                const data = await callApi(financeOpsApi.getDashboardKpis, params);
                if (active) {
                    setKpiData(data);
                }
            } catch (err) {
                console.error('Failed to fetch dashboard KPIs', err);
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        };

        loadKpiData();

        return () => {
            active = false;
        };
    }, [selectedRange, fromDate, toDate]);

    return (
        <div className="space-y-8 min-h-screen transition-colors duration-300">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                <div>
                    <h1 className="text-3xl font-medium tracking-tight text-main dark:text-white mb-1">
                        Master Dashboard
                    </h1>
                    <p className="text-sub dark:text-neutral-400 font-regular">
                        Real-time overview of financial performance and business metrics
                    </p>
                </div>

                <div className="w-full md:w-auto flex flex-col gap-2">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-3 w-full">
                        <div className="w-full lg:w-[180px]">
                            <CustomSelect
                                options={FILTER_OPTIONS}
                                value={selectedRange}
                                onChange={setSelectedRange}
                                placeholder="Select range"
                                className="h-11 rounded-2xl"
                            />
                        </div>

                        {isCustomRange && (
                            <>
                                <input
                                    type="date"
                                    value={fromDate}
                                    onChange={(event) => {
                                        setFromDate(event.target.value);
                                        setSelectedRange('custom');
                                    }}
                                    max={toDate || maxSelectableDate}
                                    className="h-11 w-full lg:w-[180px] px-3 text-sm bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl shadow-sm text-main dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-200 dark:focus:ring-neutral-800 disabled:opacity-60"
                                    disabled={!isCustomRange}
                                />

                                <input
                                    type="date"
                                    value={toDate}
                                    onChange={(event) => {
                                        setToDate(event.target.value);
                                        setSelectedRange('custom');
                                    }}
                                    min={fromDate || undefined}
                                    max={maxSelectableDate}
                                    className="h-11 w-full lg:w-[180px] px-3 text-sm bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl shadow-sm text-main dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-200 dark:focus:ring-neutral-800 disabled:opacity-60"
                                    disabled={!isCustomRange}
                                />
                            </>
                        )}
                    </div>

                    {hasInvalidCustomRange && (
                        <p className="text-xs text-rose-600 dark:text-rose-400">
                            `From Date` cannot be later than `To Date`.
                        </p>
                    )}
                </div>
            </div>

            {/* Top Row: KPIs */}
            <section>
                <KPIGrid 
                    cards={kpiData} 
                    loading={loading} 
                    selectedRange={selectedRange}
                    fromDate={fromDate}
                    toDate={toDate}
                />
            </section>

            {/* Middle Row: Visualizations */}
            <section>
                <DashboardCharts />
            </section>

            {/* Bottom Row: Action Queues */}
            <section>
                <ActionCenter />
            </section>
        </div>
    );
};

export default DashboardPage;
