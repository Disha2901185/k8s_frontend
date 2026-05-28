import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DetailHeader } from './DetailHeader';
import { InfoSidebar } from './InfoSidebar';
import { cn } from '@/lib/utils';

export const DetailedViewLayout = ({
    title,
    subtitle,
    status,
    statusColor,
    onHeaderAction,
    backPath,
    sidebarSections,
    tabs = [] // { id, label, icon, content }
}) => {
    const [activeTab, setActiveTab] = useState(tabs[0]?.id);

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 animate-in fade-in duration-500">
            {/* 1. Header Area */}
            <DetailHeader
                title={title}
                subtitle={subtitle}
                status={status}
                statusColor={statusColor}
                onAction={onHeaderAction}
                backPath={backPath}
            />

            <div className="flex flex-1 overflow-hidden">
                {/* 2. Left Sidebar (Master Data) */}
                <div className="w-[320px] bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 hidden md:flex flex-col shrink-0 z-10">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/10">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Master Data</span>
                    </div>
                    <InfoSidebar sections={sidebarSections} />
                </div>

                {/* 3. Main Content Area */}
                <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50 dark:bg-slate-900/20">
                    {/* Tabs Navigation */}
                    <div className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 px-6 sticky top-0 z-10 flex gap-6 overflow-x-auto no-scrollbar">
                        {tabs.map((tab) => {
                            const isActive = activeTab === tab.id;
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        "relative py-4 text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap",
                                        isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                                    )}
                                >
                                    {Icon && <Icon className="w-4 h-4" />}
                                    {tab.label}
                                    {isActive && (
                                        <motion.div
                                            layoutId="activeTabIndicator"
                                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"
                                        />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Active Tab Content */}
                    <div className="flex-1 overflow-hidden relative">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                transition={{ duration: 0.2 }}
                                className="absolute inset-0 overflow-y-auto custom-scrollbar"
                            >
                                {tabs.find(t => t.id === activeTab)?.content}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
};
