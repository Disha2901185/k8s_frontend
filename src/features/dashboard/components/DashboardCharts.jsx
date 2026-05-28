import React, { useState, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { financeOpsApi } from '@/lib/api';
import { callApi } from '@/lib/apiService';

const convertToInr = (value, currency, rates) => {
    const fromCurrency = (currency || 'INR').toUpperCase();
    if (fromCurrency === 'INR') return Number(value || 0);
    const activeRates = rates || {
        USD: 1,
        INR: 96.6491,
        EUR: 0.8612,
        GBP: 0.7463,
        AED: 3.6725
    };
    const usdToInr = activeRates.INR || 96.6491;
    if (fromCurrency === 'USD') return Number(value || 0) * usdToInr;
    const usdToFrom = activeRates[fromCurrency] || 1;
    return Number(value || 0) * (usdToInr / usdToFrom);
};

const CollectionTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 p-3 rounded-xl shadow-xl">
                <p className="text-xs font-semibold text-slate-500 dark:text-neutral-400 mb-2">{label}</p>
                <div className="space-y-1">
                    {payload.map((entry, index) => (
                        <div key={index} className="text-xs flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
                            <span className="text-slate-700 dark:text-slate-200 font-medium">Projected Collection:</span>
                            <span className="text-slate-900 dark:text-white font-bold ml-auto pl-4">
                                ₹{entry.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

const OrderTypeTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const entry = payload[0];
        return (
            <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 p-3 rounded-xl shadow-xl">
                <div className="text-xs flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
                    <span className="text-slate-700 dark:text-slate-200 font-medium">{entry.name}:</span>
                    <span className="text-slate-900 dark:text-white font-bold ml-auto pl-4">
                        ₹{entry.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                </div>
            </div>
        );
    }
    return null;
};

const CollectionProjectionChart = React.memo(() => {
    const [projectionData, setProjectionData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [retryCount, setRetryCount] = useState(0);

    useEffect(() => {
        let active = true;

        const fetchProjections = async () => {
            try {
                setLoading(true);
                setError(null);

                // Dynamically compute 12-month sequence from current month
                const monthsList = [];
                const current = new Date();
                for (let i = 0; i < 12; i++) {
                    const targetDate = new Date(current.getFullYear(), current.getMonth() + i, 1);
                    const year = targetDate.getFullYear();
                    const monthStr = String(targetDate.getMonth() + 1).padStart(2, '0');
                    const monthLabel = targetDate.toLocaleString('default', { month: 'short' });
                    
                    monthsList.push({
                        queryKey: `${year}-${monthStr}`,
                        label: monthLabel,
                        year: year
                    });
                }

                // Query database projection for all 12 months concurrently
                const promises = monthsList.map(m => 
                    callApi(financeOpsApi.listCollectionProjection, { month: m.queryKey })
                        .catch(() => ({ totalAmount: 0 }))
                );

                const results = await Promise.all(promises);

                if (!active) return;

                // Scale Rupee totalAmount to Lakhs (divide by 100,000)
                const mappedData = monthsList.map((m, idx) => {
                    const res = results[idx];
                    const amountInRupees = res?.totalAmount ?? 0;
                    const amountInLakhs = amountInRupees / 100000;
                    return {
                        name: m.label,
                        amount: parseFloat(amountInLakhs.toFixed(2)),
                        rawAmount: amountInRupees,
                        year: m.year
                    };
                });

                setProjectionData(mappedData);
            } catch (err) {
                if (active) {
                    console.error("Failed to load collection projections:", err);
                    setError("Failed to connect and sync with projection database.");
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        };

        fetchProjections();

        return () => {
            active = false;
        };
    }, [retryCount]);

    return (
        <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden flex flex-col h-[450px]">
            <div className="px-6 pt-6 pb-2 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-main dark:text-white">Collection Projection</h3>
                {error && (
                    <button 
                        onClick={() => setRetryCount(prev => prev + 1)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline bg-transparent border-0 cursor-pointer outline-none"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Retry Sync
                    </button>
                )}
            </div>
            
            <div className="px-6 pb-6 flex-1 flex flex-col justify-center">
                {loading ? (
                    <div className="h-80 w-full flex flex-col justify-between animate-pulse">
                        {/* Cartesian gridlines skeleton */}
                        <div className="w-full flex-1 flex flex-col justify-between border-b border-slate-100 dark:border-neutral-800/80 pb-2 relative">
                            <div className="absolute inset-x-0 top-[20%] border-t border-dashed border-slate-100 dark:border-neutral-800/50" />
                            <div className="absolute inset-x-0 top-[40%] border-t border-dashed border-slate-100 dark:border-neutral-800/50" />
                            <div className="absolute inset-x-0 top-[60%] border-t border-dashed border-slate-100 dark:border-neutral-800/50" />
                            <div className="absolute inset-x-0 top-[80%] border-t border-dashed border-slate-100 dark:border-neutral-800/50" />
                            
                            <div className="flex justify-between items-end h-full px-2 pt-6 relative z-10">
                                {[55, 30, 75, 45, 90, 60, 40, 85, 50, 70, 35, 65].map((h, i) => (
                                    <div key={i} className="flex flex-col items-center gap-2 w-6">
                                        <div 
                                            className="bg-slate-100 dark:bg-neutral-800 w-full rounded-t-md" 
                                            style={{ height: `${h}%` }}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                        {/* X-Axis labels skeleton */}
                        <div className="flex justify-between px-2 pt-3">
                            {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => (
                                <div key={i} className="h-3.5 w-6 bg-slate-100 dark:bg-neutral-800 rounded shrink-0" />
                            ))}
                        </div>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                        <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">{error}</p>
                        <button 
                            onClick={() => setRetryCount(prev => prev + 1)}
                            className="px-4 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-300 rounded-xl transition-all text-xs font-semibold border border-slate-200 dark:border-neutral-700 shadow-sm"
                        >
                            Retry Connection
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="h-80 w-full animate-in fade-in duration-300">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={projectionData}
                                    margin={{ top: 20, right: 10, left: -20, bottom: 5 }}
                                    barSize={24}
                                >
                                    <defs>
                                        <linearGradient id="collectionGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#86efac" />
                                            <stop offset="100%" stopColor="#22c55e" />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-grid)" vertical={false} />
                                    <XAxis
                                        dataKey="name"
                                        stroke="var(--color-grid)"
                                        tick={{ fontSize: 10, fill: '#878787', fontWeight: 500 }}
                                        tickLine={false}
                                        axisLine={false}
                                        dy={10}
                                    />
                                    <YAxis
                                        stroke="#94a3b8"
                                        tick={{ fontSize: 10, fill: '#878787', fontWeight: 500 }}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <RechartsTooltip
                                        cursor={{ fill: 'transparent' }}
                                        content={<CollectionTooltip />}
                                    />
                                    <Bar
                                        dataKey="amount"
                                        fill="url(#collectionGradient)"
                                        radius={[6, 6, 0, 0]}
                                        isAnimationActive={false}
                                        label={{
                                            position: 'top',
                                            fill: '#878787',
                                            fontSize: 9,
                                            fontWeight: 'bold',
                                            formatter: (val) => val > 0 ? val.toFixed(2) : ''
                                        }}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        
               
                    </>
                )}
            </div>
        </div>
    );
});

const OrdersByTypeChart = React.memo(() => {
    const [workOrders, setWorkOrders] = useState([]);
    const [loadingOrders, setLoadingOrders] = useState(true);
    const [ordersError, setOrdersError] = useState(null);
    const [ordersRetryCount, setOrdersRetryCount] = useState(0);
    const [selectedFY, setSelectedFY] = useState('');
    const [fyOptions, setFyOptions] = useState([]);
    const [currencyRates, setCurrencyRates] = useState(null);
    const [itemTypes, setItemTypes] = useState([]);
    const [hoveredSlice, setHoveredSlice] = useState(null);

    useEffect(() => {
        // Generate FY options dynamically based on the current date
        const current = new Date();
        const currentYear = current.getFullYear();
        const currentMonth = current.getMonth() + 1; // 1-indexed
        
        // Financial year starts in April (month 4)
        const activeStartYear = currentMonth >= 4 ? currentYear : currentYear - 1;
        
        const options = [];
        // Show current FY, past two FYs, and future FY (total of 4 years)
        for (let i = 1; i >= -2; i--) {
            const start = activeStartYear + i;
            const end = start + 1;
            const endShort = String(end).slice(-2);
            options.push({
                label: `Fin Year ${start}-${endShort}`,
                value: `${start}-${end}`
            });
        }
        
        setFyOptions(options);
        setSelectedFY(`${activeStartYear}-${activeStartYear + 1}`); // Default to current FY
    }, []);

    useEffect(() => {
        let active = true;
        
        const fetchOrders = async () => {
            try {
                setLoadingOrders(true);
                setOrdersError(null);
                const res = await callApi(financeOpsApi.listAllWorkOrders, { limit: 250 });
                if (active) {
                    setWorkOrders(res?.items ?? []);
                    if (res?.currencyRates) {
                        setCurrencyRates(res.currencyRates);
                    }
                    if (res?.itemTypes) {
                        setItemTypes(res.itemTypes);
                    }
                }
            } catch (err) {
                if (active) {
                    console.error("Failed to load work orders for pie chart:", err);
                    setOrdersError("Failed to sync work orders database.");
                }
            } finally {
                if (active) {
                    setLoadingOrders(false);
                }
            }
        };
        
        fetchOrders();
        
        return () => {
            active = false;
        };
    }, [ordersRetryCount]);

    const getOrdersByTypeData = () => {
        if (!selectedFY) return { chartData: [], totalValue: 0 };
        
        const [startYear, endYear] = selectedFY.split('-').map(Number);
        const fyStart = new Date(`${startYear}-04-01T00:00:00.000Z`);
        const fyEnd = new Date(`${endYear}-03-31T23:59:59.999Z`);
        
        // Filter by date or poDate in selected FY
        const fyOrders = workOrders.filter(wo => {
            const orderDate = wo.date || wo.poDate;
            if (!orderDate) return false;
            const d = new Date(orderDate);
            return d >= fyStart && d <= fyEnd;
        });

        // Group by itemType or projectType and convert currency to INR
        const groups = {};
        fyOrders.forEach(wo => {
            if (Array.isArray(wo.orderItems) && wo.orderItems.length > 0) {
                wo.orderItems.forEach(item => {
                    const type = item.itemType || 'Other';
                    const inrValue = convertToInr(item.amount, wo.currency, currencyRates);
                    groups[type] = (groups[type] || 0) + inrValue;
                });
            } else {
                const type = wo.projectType || 'Other';
                const inrValue = convertToInr(wo.value, wo.currency, currencyRates);
                groups[type] = (groups[type] || 0) + inrValue;
            }
        });

        const PREMIUM_PALETTE = [
            "#d35400", "#EA580C", "#F97316", "#FB923C", "#FDBA74", "#f4511e", "#ff7043"
        ];

        const list = Object.entries(groups).map(([name, value]) => ({ name, value }));
        
        const nonOthers = list.filter(item => item.name !== 'Other' && item.name !== 'Others');
        const others = list.filter(item => item.name === 'Other' || item.name === 'Others');
        
        const sortedNonOthers = nonOthers.sort((a, b) => b.value - a.value);
        const sorted = [...sortedNonOthers, ...others];
        
        const totalValue = sorted.reduce((sum, item) => sum + item.value, 0);

        const minPercentage = 0.015;
        const minValue = totalValue * minPercentage;

        let nonOtherCount = 0;
        const finalChartData = sorted.map((item) => {
            let fill;
            if (item.name === 'Other' || item.name === 'Others') {
                fill = '#E2E8F0';
            } else {
                fill = PREMIUM_PALETTE[nonOtherCount % PREMIUM_PALETTE.length];
                nonOtherCount++;
            }
            return {
                ...item,
                fill,
                chartValue: Math.max(item.value, minValue)
            };
        });

        return { chartData: finalChartData, totalValue };
    };

    const { chartData, totalValue } = getOrdersByTypeData();

    return (
        <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden flex flex-col h-[450px]">
            <div className="px-6 pt-6 pb-2 flex justify-between items-start">
                <div className="flex flex-col gap-1">
                    <h3 className="text-lg font-semibold text-main dark:text-white">Orders By Type</h3>
                  
                </div>
                
                <div className="flex items-center gap-3">
                    {ordersError && (
                        <button 
                            onClick={() => setOrdersRetryCount(prev => prev + 1)}
                            className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline bg-transparent border-0 cursor-pointer outline-none"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Retry
                        </button>
                    )}
                    
                    <select
                        value={selectedFY}
                        onChange={(e) => setSelectedFY(e.target.value)}
                        className="bg-slate-50 dark:bg-neutral-800 text-main dark:text-white text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 dark:border-neutral-700 outline-none cursor-pointer hover:bg-slate-100 dark:hover:bg-neutral-700 transition-colors"
                    >
                        {fyOptions.map((opt) => (
                            <option key={opt.value} value={opt.value} className="bg-white dark:bg-neutral-900 text-main dark:text-white">
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="px-6 pb-6 flex-1 flex flex-col justify-between">
                {loadingOrders ? (
                    <div className="flex flex-col items-center justify-between flex-1 py-4 animate-pulse">
                        <div className="h-64 w-full flex items-center justify-center relative">
                            <div className="h-44 w-44 rounded-full border-[18px] border-slate-100 dark:border-neutral-800 flex items-center justify-center relative">
                                <div className="flex flex-col items-center gap-1.5 z-10">
                                    <div className="h-2.5 w-10 bg-slate-200 dark:bg-neutral-800 rounded" />
                                    <div className="h-4.5 w-16 bg-slate-200 dark:bg-neutral-800 rounded" />
                                </div>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-x-8 gap-y-3 w-full mt-4 px-2">
                            {[1, 2, 3, 4, 5].map((idx) => (
                                <div key={idx} className="flex flex-col gap-1.5 animate-pulse">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2.5 h-2.5 rounded-full bg-slate-100 dark:bg-neutral-800 shrink-0" />
                                        <div className="h-3 w-14 bg-slate-100 dark:bg-neutral-800 rounded" />
                                    </div>
                                    <div className="h-2.5 w-10 bg-slate-100 dark:bg-neutral-800 rounded ml-4" />
                                </div>
                            ))}
                        </div>
                    </div>
                ) : ordersError ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center flex-1">
                        <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">{ordersError}</p>
                        <button 
                            onClick={() => setOrdersRetryCount(prev => prev + 1)}
                            className="px-4 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-300 rounded-xl transition-all text-xs font-semibold border border-slate-200 dark:border-neutral-700 shadow-sm"
                        >
                            Retry Sync
                        </button>
                    </div>
                ) : chartData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-20 text-center flex-1">
                        <p className="text-sm font-medium text-slate-400 dark:text-neutral-500">No work orders found for this financial year.</p>
                    </div>
                ) : (
                    <>
                        <div className="flex-1 relative min-h-[220px] animate-in fade-in duration-300">
                            <div className="absolute inset-0 flex flex-col items-center justify-end pb-8 pointer-events-none z-10">
                                <span className="text-[10px] text-sub dark:text-neutral-500 font-medium mb-0.5">Total Value</span>
                                <span className="text-xl font-bold text-main dark:text-white tracking-tight">
                                    ₹{(totalValue / 100000).toFixed(2)}L
                                </span>
                            </div>
                            
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={chartData}
                                        cx="50%"
                                        cy="90%"
                                        startAngle={180}
                                        endAngle={0}
                                        innerRadius={130}
                                        outerRadius={160}
                                        paddingAngle={2}
                                        cornerRadius={6}
                                        dataKey="chartValue"
                                        stroke="none"
                                        onMouseEnter={(data, index) => setHoveredSlice({ data, index })}
                                        onMouseLeave={() => setHoveredSlice(null)}
                                    >
                                        {chartData.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={entry.fill}
                                            />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip 
                                        content={<OrderTypeTooltip />} 
                                        position={hoveredSlice?.index === 0 ? { x: 15, y: 15 } : undefined}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="grid grid-cols-3 gap-x-8 gap-y-4 mt-2 px-2">
                            {chartData.map((entry, index) => {
                                const percent = ((entry.value / totalValue) * 100).toFixed(1);
                                return (
                                    <div key={`param-${index}`} className="flex flex-col gap-0">
                                        <div className="flex items-center gap-1.5">
                                            <div
                                                className="w-2 h-2 rounded-full shrink-0"
                                                style={{ backgroundColor: entry.fill }}
                                            />
                                            <span className="text-xs text-sub dark:text-neutral-400 font-medium truncate max-w-[90px]" title={entry.name}>
                                                {entry.name}
                                            </span>
                                        </div>
                                        <div className="flex items-baseline gap-1 pl-3.5">
                                            <span className="text-[11px] font-semibold text-main dark:text-white">
                                                ₹{(entry.value / 100000).toFixed(2)}L
                                            </span>
                                            <span className="text-[9px] text-sub dark:text-neutral-500 font-normal tracking-tight">
                                                ({percent}%)
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
});

export const DashboardCharts = () => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CollectionProjectionChart />
            <OrdersByTypeChart />
        </div>
    );
};
