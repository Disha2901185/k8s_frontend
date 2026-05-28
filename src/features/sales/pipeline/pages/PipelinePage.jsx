import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { User, AlertCircle, LayoutGrid, List, MoreHorizontal, ChevronRight, ChevronLeft, ChevronUp, ChevronDown, Loader2 } from 'lucide-react';
import { AddDealDrawer } from '@/features/sales/pipeline/components/DealSlideout/AddDealDrawer';
import { ConfirmModal } from '@/features/sales/pipeline/components/DealSlideout/ConfirmModal';
import { Trash2 } from 'lucide-react';
import { dealApi } from '@/lib/api';

const stages = ['DISCOVERY', 'PROPOSAL', 'NEGOTIATION', 'NOT_PROGRESSING', 'CLOSED_WON'];

const normalizeCurrency = (currency) => (currency || 'INR').toUpperCase();

const formatCurrency = (value, currency, options = {}) => {
    const amount = Number(value) || 0;
    const normalizedCurrency = normalizeCurrency(currency);

    try {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: normalizedCurrency,
            currencyDisplay: 'narrowSymbol',
            maximumFractionDigits: 0,
            ...options,
        }).format(amount);
    } catch {
        return `${normalizedCurrency} ${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
    }
};


const formatColumnTotal = (deals) => {
    const totalsByCurrency = deals.reduce((acc, deal) => {
        const currency = normalizeCurrency(deal.currency);
        acc[currency] = (acc[currency] || 0) + (Number(deal.value) || 0);
        return acc;
    }, {});

    const totals = Object.entries(totalsByCurrency);
    if (!totals.length) return formatCurrency(0, 'INR');

    return totals
        .map(([currency, total]) => formatCurrency(total, currency))
        .join(' + ');
};

const hasPendingClosedWonDetails = (deal) => {
    if (deal?.stage !== 'CLOSED_WON') return false;
    const requiredFields = [
        'taxId',
        'billingStreet',
        'billingCity',
        'billingState',
        'billingCountry',
        'billingZip',
        'paymentTerms',
        'projectType',
    ];

    return requiredFields.some((field) => {
        const value = deal?.[field];
        return value === undefined || value === null || String(value).trim() === '';
    });
};

const DealCard = ({ deal, isOverlay, onEdit, onOpenMenu }) => {
    const showPendingDot = hasPendingClosedWonDetails(deal);
    return (
        <div
            onClick={() => !isOverlay && onEdit && onEdit(deal)}
            className={cn(
                "relative bg-white dark:bg-neutral-800 p-3 rounded-lg border shadow-sm border-slate-200 dark:border-neutral-700 cursor-grab active:cursor-grabbing group hover:border-blue-400 dark:hover:border-neutral-600 transition-all",
                isOverlay ? "shadow-xl rotate-2 scale-105" : "hover:shadow-md"
            )}>
            {showPendingDot ? (
                <div className="absolute right-2 top-2 group/dot">
                    <div
                        className="h-2 w-2 rounded-full bg-amber-400 ring-2 ring-amber-400/25"
                    />
                    <div className="pointer-events-none absolute top-full mt-1 right-0 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[10px] font-semibold text-white opacity-0 shadow-lg transition-opacity group-hover/dot:opacity-100 dark:bg-neutral-100 dark:text-neutral-900">
                        Details Required
                    </div>
                </div>
            ) : null}
            <div className="flex justify-between items-start mb-1.5">
                <h4 className="font-medium text-slate-900 dark:text-neutral-100 text-sm truncate pr-2 leading-tight uppercase tracking-tight">{deal.title}</h4>
                <div className={cn(
                    "flex items-center gap-0.5 text-xs font-semibold text-slate-700 dark:text-neutral-300 shrink-0 bg-slate-100 dark:bg-neutral-700/50 px-1.5 py-0.5 rounded",
                    showPendingDot ? "mr-3" : ""
                )}>
                    {formatCurrency(deal.value, deal.currency)}
                </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-neutral-400">
                <div className="flex items-center gap-1.5 truncate max-w-[160px]">
                    <User className="w-3 h-3 text-slate-400 dark:text-neutral-500" />
                    <span className="truncate">{deal.company?.name || 'Unknown Company'}</span>
                </div>
                {!isOverlay && (
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            onOpenMenu?.(deal, event.currentTarget);
                        }}
                        onPointerDown={(event) => event.stopPropagation()}
                        className="deal-action-menu-trigger p-1 -m-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:text-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                        aria-label={`Open actions for ${deal.title}`}
                    >
                        <MoreHorizontal className="w-4 h-4" />
                    </button>
                )}
                {isOverlay && !deal.primaryContactId && (
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 ring-4 ring-amber-500/20" title="No Contact" />
                )}
            </div>
        </div>
    );
};

const SortableDeal = ({ deal, onEdit, onOpenMenu }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: deal.id, data: { ...deal } });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="mb-3">
            <DealCard deal={deal} onEdit={onEdit} onOpenMenu={onOpenMenu} />
        </div>
    );
};

const DroppableColumn = ({ id, title, children, deals }) => {
    const { setNodeRef } = useSortable({ id: id, data: { type: 'Column' } });

    const count = deals.length;
    return (
        <div
            ref={setNodeRef}
            id={`column-${id.toLowerCase()}`}
            className="flex flex-col min-w-[320px] w-80 h-full bg-slate-50/50 dark:bg-neutral-900/30 rounded-xl border border-slate-200/60 dark:border-neutral-800 shrink-0"
        >
            <div className="flex flex-col px-4 py-3 border-b border-slate-200/60 dark:border-neutral-800/80 bg-slate-50/80 dark:bg-neutral-900/80 backdrop-blur-sm sticky top-0 z-10 rounded-t-xl transition-colors">
                <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-slate-700 dark:text-neutral-200 text-[10px] uppercase tracking-wider">{title.replace('_', ' ')}</h3>
                    <span className="text-[10px] bg-white dark:bg-neutral-800 text-slate-500 dark:text-neutral-400 font-bold px-2 py-0.5 rounded-full border border-slate-100 dark:border-neutral-700 shadow-sm">
                        {count}
                    </span>
                </div>
                <div className="text-[11px] text-slate-400 dark:text-neutral-500 font-medium flex items-center gap-1">
                    Total: <span className="text-slate-700 dark:text-neutral-300 font-semibold">{formatColumnTotal(deals)}</span>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto px-2 py-3 custom-scrollbar">
                {children}
            </div>
        </div>
    );
};

export const PipelinePage = () => {
    const [deals, setDeals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeId, setActiveId] = useState(null);
    const [errorToast, setErrorToast] = useState(null);
    const [viewMode, setViewMode] = useState('kanban'); // 'kanban' or 'list'
    const [isAddDealOpen, setIsAddDealOpen] = useState(false);
    const [editingDeal, setEditingDeal] = useState(null);
    const [deletingDeal, setDeletingDeal] = useState(null);
    const [openMenuId, setOpenMenuId] = useState(null);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (openMenuId && !e.target.closest('.deal-action-menu-trigger') && !e.target.closest('.deal-action-menu-content')) {
                setOpenMenuId(null);
            }
        };
        const handleScroll = () => {
            if (openMenuId) setOpenMenuId(null);
        };
        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('scroll', handleScroll, true);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, [openMenuId]);

    useEffect(() => {
        fetchDeals();
    }, []);

    const fetchDeals = async () => {
        try {
            setLoading(true);
            const response = await dealApi.getAll();
            setDeals(response.data);
        } catch {
            showError("Failed to fetch deals");
        } finally {
            setLoading(false);
        }
    };

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const handleConfirmDelete = async () => {
        if (!deletingDeal) return;
        try {
            await dealApi.delete(deletingDeal.id);
            setDeals(prev => prev.filter(d => d.id !== deletingDeal.id));
            setDeletingDeal(null);
        } catch (error) {
            console.error("Failed to delete deal:", error);
            showError("Failed to delete deal");
        }
    };

    const getSortedDeals = (dealsToSort) => {
        if (!sortConfig.key) return dealsToSort;

        return [...dealsToSort].sort((a, b) => {
            let aValue = a[sortConfig.key];
            let bValue = b[sortConfig.key];

            // Handle nested objects
            if (sortConfig.key === 'company') {
                aValue = a.company?.name || '';
                bValue = b.company?.name || '';
            }

            // Value is numeric
            if (sortConfig.key === 'value') {
                aValue = parseFloat(aValue);
                bValue = parseFloat(bValue);
            }

            if (aValue < bValue) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
    };

    const handleEditDeal = (deal) => {
        setEditingDeal(deal);
        setIsAddDealOpen(true);
    };

    const handleOpenDealMenu = (deal, element) => {
        const rect = element.getBoundingClientRect();
        setMenuPosition({
            top: rect.bottom + window.scrollY,
            left: rect.right - 128 + window.scrollX,
        });
        setOpenMenuId(deal.id);
    };

    const handleCloseDrawer = () => {
        setIsAddDealOpen(false);
        setEditingDeal(null);
        fetchDeals(); // Refresh after edit/add
    };

    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

    // Pagination for List View
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const scrollContainerRef = React.useRef(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const sortedDeals = getSortedDeals(deals);
    const paginatedDeals = sortedDeals.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const scrollBoard = (direction) => {
        if (scrollContainerRef.current) {
            const scrollAmount = 350; // roughly one column width
            scrollContainerRef.current.scrollBy({
                left: direction === 'right' ? scrollAmount : -scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    useEffect(() => {
        if (viewMode !== 'kanban') return undefined;
        const container = scrollContainerRef.current;
        if (!container) return undefined;

        const updateScrollState = () => {
            const { scrollLeft, scrollWidth, clientWidth } = container;
            const maxScrollLeft = Math.max(0, scrollWidth - clientWidth);
            setCanScrollLeft(scrollLeft > 2);
            setCanScrollRight(scrollLeft < maxScrollLeft - 2);
        };

        updateScrollState();
        container.addEventListener('scroll', updateScrollState, { passive: true });
        window.addEventListener('resize', updateScrollState);

        return () => {
            container.removeEventListener('scroll', updateScrollState);
            window.removeEventListener('resize', updateScrollState);
        };
    }, [viewMode, deals.length]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragStart = (event) => {
        setActiveId(event.active.id);
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const activeDeal = deals.find(d => d.id === active.id);
        const overId = over.id;

        // Determine the target stage
        let targetStage = overId;

        if (!stages.includes(overId)) {
            const overDeal = deals.find(d => d.id === overId);
            if (overDeal) targetStage = overDeal.stage;
        }

        if (activeDeal.stage !== targetStage) {
            // CACHE old state before any optimistic changes
            const originalDeals = [...deals];
            const updatedDeal = { ...activeDeal, stage: targetStage };
            setDeals(prev => prev.map(deal =>
                deal.id === activeDeal.id ? updatedDeal : deal
            ));

            dealApi.update(activeDeal.id, { stage: targetStage }).then(() => {
                if (targetStage === 'CLOSED_WON') {
                    handleEditDeal(updatedDeal);
                }
            }).catch(err => {
                console.error("Failed to update deal stage:", err);
                showError("Failed to update deal stage");
                setDeals(originalDeals); // Revert to cached state
            });
        }
    };

    const showError = (msg) => {
        setErrorToast(msg);
        setTimeout(() => setErrorToast(null), 3000);
    };

    return (
        <div className="h-full flex flex-col animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">Deal Pipeline</h1>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex bg-slate-100 dark:bg-neutral-800 p-1 rounded-lg border border-slate-200 dark:border-neutral-700">
                        <button
                            onClick={() => setViewMode('kanban')}
                            className={cn(
                                "p-1.5 rounded-md transition-all",
                                viewMode === 'kanban'
                                    ? "bg-white dark:bg-neutral-700 shadow-sm text-blue-600 dark:text-blue-400"
                                    : "text-slate-500 hover:text-slate-700 dark:hover:text-neutral-300"
                            )}
                            title="Board View"
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={cn(
                                "p-1.5 rounded-md transition-all",
                                viewMode === 'list'
                                    ? "bg-white dark:bg-neutral-700 shadow-sm text-blue-600 dark:text-blue-400"
                                    : "text-slate-500 hover:text-slate-700 dark:hover:text-neutral-300"
                            )}
                            title="List View"
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                    <button
                        onClick={() => setIsAddDealOpen(true)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                    >
                        + New Deal
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 dark:text-neutral-500 gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    <p className="text-sm font-medium">Loading deals...</p>
                </div>
            ) : viewMode === 'kanban' ? (
                <div className="group/board grid grid-cols-1 grid-rows-1 relative h-full min-h-[500px]">
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                    >
                        {/* Layer 1: The Scrollable Board Content */}
                        <div
                            ref={scrollContainerRef}
                            className="col-start-1 row-start-1 flex gap-4 overflow-x-auto pb-4 items-start scroll-smooth no-scrollbar h-full"
                        >
                            {stages.map(stage => {
                                const stageDeals = deals.filter(d => d.stage === stage);
                                return (
                                    <DroppableColumn key={stage} id={stage} title={stage} deals={stageDeals}>
                                        <SortableContext
                                            items={stageDeals.map(d => d.id)}
                                            strategy={verticalListSortingStrategy}
                                        >
                                            {stageDeals.map(deal => (
                                                <SortableDeal
                                                    key={deal.id}
                                                    deal={deal}
                                                    onEdit={handleEditDeal}
                                                    onOpenMenu={handleOpenDealMenu}
                                                />
                                            ))}
                                        </SortableContext>
                                    </DroppableColumn>
                                );
                            })}
                        </div>
                        <DragOverlay>
                            {activeId ? <DealCard deal={deals.find(d => d.id === activeId)} isOverlay /> : null}
                        </DragOverlay>
                    </DndContext>

                    {/* Layer 2: Sticky Navigation Overlay */}
                    <div className="col-start-1 row-start-1 h-full pointer-events-none z-20">
                        <div className="sticky top-1/2 -translate-y-1/2 w-full flex justify-between px-2">
                            {canScrollLeft ? (
                                <button
                                    onClick={() => scrollBoard('left')}
                                    className="p-3 rounded-full bg-white dark:bg-neutral-800 shadow-xl border border-slate-200 dark:border-neutral-700 text-slate-600 dark:text-neutral-300 pointer-events-auto hover:scale-110 active:scale-95 transition-transform group/nav opacity-0 hover:opacity-100 focus:opacity-100 group-hover/board:opacity-100"
                                    aria-label="Scroll Left"
                                >
                                    <ChevronLeft className="w-6 h-6" />
                                </button>
                            ) : <span />}
                            {canScrollRight ? (
                                <button
                                    onClick={() => scrollBoard('right')}
                                    className="p-3 rounded-full bg-white dark:bg-neutral-800 shadow-xl border border-slate-200 dark:border-neutral-700 text-slate-600 dark:text-neutral-300 pointer-events-auto hover:scale-110 active:scale-95 transition-transform group/nav opacity-0 hover:opacity-100 focus:opacity-100 group-hover/board:opacity-100"
                                    aria-label="Scroll Right"
                                >
                                    <ChevronRight className="w-6 h-6" />
                                </button>
                            ) : <span />}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-white dark:bg-neutral-900 rounded-xl border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden animate-in slide-in-from-bottom-5">
                    <div className="overflow-x-auto overflow-y-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 dark:bg-neutral-900/50 text-slate-500 dark:text-neutral-500 font-medium border-b border-slate-200 dark:border-neutral-800">
                                <tr>
                                    {[
                                        { label: 'Project Title', key: 'title' },
                                        { label: 'Company', key: 'company' },
                                        { label: 'Stage', key: 'stage' },
                                        { label: 'Value', key: 'value', align: 'right' },
                                        { label: 'Created At', key: 'createdAt' }
                                    ].map((h, i) => (
                                        <th
                                            key={i}
                                            onClick={() => handleSort(h.key)}
                                            className={cn(
                                                "px-6 py-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors select-none",
                                                h.align === 'right' && "text-right"
                                            )}
                                        >
                                            <div className={cn("flex items-center gap-1", h.align === 'right' && "justify-end")}>
                                                <span className="text-[10px] uppercase tracking-wider">{h.label}</span>
                                                <div className="flex flex-col">
                                                    <ChevronUp className={cn("w-2 h-2", sortConfig.key === h.key && sortConfig.direction === 'asc' ? "text-main dark:text-white" : "text-slate-300 dark:text-neutral-600")} />
                                                    <ChevronDown className={cn("w-2 h-2", sortConfig.key === h.key && sortConfig.direction === 'desc' ? "text-main dark:text-white" : "text-slate-300 dark:text-neutral-600")} />
                                                </div>
                                            </div>
                                        </th>
                                    ))}
                                    <th className="w-10 px-6 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
                                {paginatedDeals.map((deal) => (
                                    <tr key={deal.id} className="group hover:bg-slate-50 dark:hover:bg-neutral-900/50 transition-colors cursor-pointer" onClick={() => handleEditDeal(deal)}>
                                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white uppercase tracking-tight text-xs">{deal.title}</td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-neutral-400 font-medium">{deal.company?.name || 'Unknown'}</td>
                                        <td className="px-6 py-4">
                                            <span className={cn(
                                                "px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider",
                                                deal.stage === 'CLOSED_WON' ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" :
                                                    deal.stage === 'NOT_PROGRESSING' ? "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400" :
                                                        "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
                                            )}>
                                                {deal.stage.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium text-slate-700 dark:text-neutral-200">
                                            {formatCurrency(deal.value, deal.currency)}
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 dark:text-neutral-500 text-xs">
                                            {new Date(deal.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                            <div className="relative inline-block">
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (openMenuId === deal.id) {
                                                            setOpenMenuId(null);
                                                        } else {
                                                            handleOpenDealMenu(deal, e.currentTarget);
                                                        }
                                                    }}
                                                    className="p-1 rounded hover:bg-slate-200 dark:hover:bg-neutral-800 text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 transition-colors deal-action-menu-trigger"
                                                >
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {deals.length === 0 && (
                            <div className="py-12 flex flex-col items-center justify-center text-slate-500 dark:text-neutral-500 gap-2">
                                <AlertCircle className="w-8 h-8 opacity-20" />
                                <p className="text-sm font-medium">No deals found in this pipeline.</p>
                            </div>
                        )}
                    </div>
                    {/* Pagination Controls */}
                    <div className="px-6 py-4 border-t border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/30 text-xs text-slate-500 dark:text-neutral-500 flex justify-between items-center rounded-b-xl">
                        <div className="flex items-center gap-4">
                            <span>
                                Showing {Math.min((currentPage - 1) * itemsPerPage + 1, deals.length)} to {Math.min(currentPage * itemsPerPage, deals.length)} of {deals.length} deals
                            </span>
                            <div className="flex items-center gap-2 border-l border-slate-200 dark:border-neutral-800 pl-4">
                                <span>Rows:</span>
                                <div className="w-20">
                                    <CustomSelect
                                        value={itemsPerPage}
                                        onChange={(val) => {
                                            setItemsPerPage(Number(val));
                                            setCurrentPage(1);
                                        }}
                                        options={[10, 25, 50].map(size => ({ value: size, label: size }))}
                                        className="py-1 px-2 h-8"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-1.5 border border-slate-200 dark:border-neutral-800 rounded bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <div className="flex items-center gap-1 mx-2">
                                {Array.from({ length: Math.ceil(deals.length / itemsPerPage) || 1 }, (_, i) => i + 1).map(page => (
                                    <button
                                        key={page}
                                        onClick={() => setCurrentPage(page)}
                                        className={cn(
                                            "w-8 h-8 flex items-center justify-center rounded-lg text-xs font-medium transition-all duration-200",
                                            currentPage === page
                                                ? "bg-blue-600 text-white shadow-md"
                                                : "hover:bg-slate-100 text-slate-500 hover:text-slate-900 dark:hover:bg-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
                                        )}
                                    >
                                        {page}
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(Math.ceil(deals.length / itemsPerPage), p + 1))}
                                disabled={currentPage === Math.ceil(deals.length / itemsPerPage) || deals.length === 0}
                                className="p-1.5 border border-slate-200 dark:border-neutral-800 rounded bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Error Toaster */}
            {errorToast && (
                <div className="fixed bottom-8 right-8 z-50 bg-rose-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-medium">{errorToast}</span>
                </div>
            )}

            <AddDealDrawer
                isOpen={isAddDealOpen}
                onClose={handleCloseDrawer}
                deal={editingDeal}
            />

            <ConfirmModal
                isOpen={!!deletingDeal}
                onClose={() => setDeletingDeal(null)}
                onConfirm={handleConfirmDelete}
                title="Delete Deal?"
                message={`Are you sure you want to delete "${deletingDeal?.title}"? This action will remove the deal from the pipeline.`}
                confirmLabel="Delete Deal"
                cancelLabel="Cancel"
            />

            {/* Global Portal-based Menu */}
            {openMenuId && createPortal(
                <div 
                    className="fixed w-32 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-lg shadow-xl z-[999] overflow-hidden transform origin-top-right deal-action-menu-content animate-in zoom-in-95 duration-100"
                    style={{ 
                        top: menuPosition.top - window.scrollY + 4, 
                        left: menuPosition.left - window.scrollX 
                    }}
                >
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            const deal = deals.find(d => d.id === openMenuId);
                            if (deal) handleEditDeal(deal);
                            setOpenMenuId(null);
                        }} 
                        className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300 font-medium transition-colors"
                    >
                        Edit Deal
                    </button>
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            const deal = deals.find(d => d.id === openMenuId);
                            if (deal) setDeletingDeal(deal);
                            setOpenMenuId(null);
                        }}
                        className="w-full text-left px-4 py-2 text-xs hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-600 font-medium flex items-center gap-2 transition-colors border-t border-slate-50 dark:border-neutral-800"
                    >
                        <Trash2 className="w-3 h-3" />
                        Delete
                    </button>
                </div>,
                document.body
            )}
        </div>
    );
};
