import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { formatCurrency } from '@/features/finance/financeApiHelpers';

const getTargetRoute = (title) => {
    switch (title) {
        case 'New Orders': return '/orders';
        case 'Collection': return '/receipts';
        case 'Billing': return '/invoices';
        case 'Order Value': return '/orders';
        default: return '/';
    }
};

const KPICard = ({ title, value, children, loading, selectedRange, fromDate, toDate }) => {
    if (loading) {
        return (
            <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-slate-200 dark:border-neutral-800 shadow-sm min-h-[140px] flex flex-col justify-between animate-pulse">
                <div className="flex justify-between items-center w-full">
                    <div className="h-4 bg-slate-200 dark:bg-neutral-800 rounded w-1/3"></div>
                    <div className="h-5 bg-slate-200 dark:bg-neutral-800 rounded-lg w-5"></div>
                </div>
                <div className="h-8 bg-slate-200 dark:bg-neutral-800 rounded w-1/2 mt-4"></div>
            </div>
        );
    }

    const isCurrency = title !== 'New Orders';
    const displayValue = isCurrency ? formatCurrency(value, 'INR') : value;

    const targetRoute = getTargetRoute(title);
    const navState = {
        fromDashboard: true,
        range: selectedRange,
        fromDate,
        toDate
    };

    return (
        <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-slate-200 dark:border-neutral-800 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between min-h-[140px]">
            <div className="flex justify-between items-start w-full">
                <h3 className="text-sm font-normal text-main dark:text-slate-100 truncate">{title}</h3>
                <Link 
                    to={targetRoute} 
                    state={navState}
                    className="text-[#878787] hover:text-indigo-600 dark:text-neutral-500 dark:hover:text-indigo-400 transition-all duration-200 p-1.5 -mt-1.5 -mr-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-neutral-800"
                    title={`Go to ${title}`}
                >
                    <ArrowUpRight className="w-4 h-4" />
                </Link>
            </div>

            <div>
                {children || <p className="text-3xl font-semibold text-main dark:text-white tracking-tight">{displayValue}</p>}
            </div>
        </div>
    );
};

const DEFAULT_CARDS = [
    { title: 'New Orders', value: '1' },
    { title: 'Collection', value: '84202' },
    { title: 'Billing', value: '386238.36' },
    { title: 'Order Value', value: '80900' }
];

export const KPIGrid = ({ cards = DEFAULT_CARDS, loading = false, selectedRange, fromDate, toDate }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {loading ? (
                Array.from({ length: 4 }).map((_, idx) => (
                    <KPICard key={idx} loading={true} />
                ))
            ) : (
                cards.map((card) => (
                    <KPICard
                        key={card.title}
                        title={card.title}
                        value={card.value}
                        selectedRange={selectedRange}
                        fromDate={fromDate}
                        toDate={toDate}
                    />
                ))
            )}
        </div>
    );
};
