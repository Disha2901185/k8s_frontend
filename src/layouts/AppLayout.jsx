import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Menu } from 'lucide-react';
import { useAuth } from '@/features/auth/context/AuthContext';

export const AppLayout = ({ children }) => {
    const { user, accountSwitching, accountTransition } = useAuth();
    const [theme, setTheme] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('theme') || 'light';
        }
        return 'light';
    });

    const userRole = user?.roles?.[0] || 'user';
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    // Handle theme changes
    useEffect(() => {
        const root = window.document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

    return (
        <div className="flex h-screen overflow-hidden bg-white dark:bg-black transition-colors duration-200">
            {/* Sidebar Component */}
            <Sidebar
                isMobileOpen={isMobileOpen}
                setIsMobileOpen={setIsMobileOpen}
            />

            <div className="flex flex-col flex-1 overflow-hidden relative">
                {/* Mobile Header Toggle */}
                <button
                    onClick={() => setIsMobileOpen(true)}
                    className="absolute top-4 left-4 z-50 p-2 md:hidden bg-white dark:bg-neutral-900 rounded-md shadow-sm border border-slate-200 dark:border-neutral-800"
                >
                    <Menu className="w-5 h-5 text-slate-600 dark:text-neutral-400" />
                </button>

                {/* Global Header */}
                <Header
                    theme={theme}
                    toggleTheme={toggleTheme}
                    userRole={userRole}
                />


                {/* Main Content Area */}
                <main className="flex-1 overflow-y-auto p-6 md:p-8">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>

                {accountSwitching ? (
                    <div className="absolute inset-0 z-[70] bg-black/45 backdrop-blur-sm flex items-center justify-center">
                        <div className="rounded-2xl border border-white/15 bg-neutral-900/90 px-6 py-4 text-white shadow-2xl">
                            <div className="flex items-center gap-3">
                                <span className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                <div>
                                    <p className="text-sm font-medium">{accountTransition?.title || 'Switching profile...'}</p>
                                    {accountTransition?.subtitle ? (
                                        <p className="text-xs text-neutral-300 mt-0.5">{accountTransition.subtitle}</p>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
};
