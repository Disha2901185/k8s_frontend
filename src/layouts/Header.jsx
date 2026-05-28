import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell, Sun, Moon, LogOut, ChevronDown, Plus, Check, AlertCircle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/context/AuthContext';
import { cn } from '@/lib/utils';

const initials = (account) => `${account?.firstName?.[0] || ''}${account?.lastName?.[0] || ''}` || 'U';

export const Header = ({ theme, toggleTheme, userRole }) => {
    const { user, logout, accounts, activeAccountId, switchAccount } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [switchingAccountId, setSwitchingAccountId] = useState(null);
    const [accountActionError, setAccountActionError] = useState('');
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
                setAccountActionError('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSwitchAccount = async (accountId) => {
        if (accountId === activeAccountId || switchingAccountId) return;
        setAccountActionError('');
        setSwitchingAccountId(accountId);
        try {
            await switchAccount(accountId);
            setIsDropdownOpen(false);
        } catch (error) {
            setAccountActionError(error?.message || 'Unable to switch account.');
        } finally {
            setSwitchingAccountId(null);
        }
    };

    const handleAddAccount = () => {
        setIsDropdownOpen(false);
        navigate('/login', {
            state: {
                addAccount: true,
                from: { pathname: location.pathname },
            },
        });
    };

    const secondaryAccounts = accounts.filter((account) => account.id !== activeAccountId);

    return (
        <header className="sticky top-0 z-30 flex items-center justify-between w-full h-16 px-6 bg-white border-b border-slate-200 dark:bg-black dark:border-neutral-800 transition-colors duration-200">
            <div className="flex-1 max-w-2xl mx-auto">
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <Search className="w-4 h-4 text-slate-400 group-focus-within:text-blue-500" />
                    </div>
                    <input
                        type="search"
                        className={cn(
                            'block w-full p-2 pl-10 text-sm border rounded-lg',
                            'bg-slate-50 border-slate-200 text-slate-900 focus:ring-blue-500 focus:border-blue-500',
                            'dark:bg-neutral-900 dark:border-neutral-800 dark:text-white dark:focus:ring-blue-600 dark:focus:border-blue-600',
                            'transition-all duration-200'
                        )}
                        placeholder="Search Companies, Contacts, Orders..."
                    />
                </div>
            </div>

            <div className="flex items-center space-x-4">
                <button className="p-2 text-slate-600 rounded-full hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 relative">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 border-2 border-white dark:border-slate-900 rounded-full"></span>
                </button>

                <button
                    onClick={toggleTheme}
                    className="p-2 text-slate-600 rounded-full hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                    {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>

                <div className="relative ml-2 border-l border-slate-200 dark:border-slate-800 pl-6" ref={dropdownRef}>
                    <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="flex items-center space-x-3 focus:outline-none group"
                    >
                        <div className="hidden md:flex flex-col items-end">
                            <span className="text-[12px] text-slate-500 dark:text-slate-400 font-medium capitalize">
                                {userRole || user?.roles?.[0] || 'User'}
                            </span>
                        </div>
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#1A56DB] text-white font-bold text-[15px] uppercase shadow-sm overflow-hidden group-hover:ring-2 group-hover:ring-blue-100 transition-all">
                            {initials(user)}
                        </div>
                        <ChevronDown className={cn('w-4 h-4 text-slate-400 transition-transform duration-200 ', isDropdownOpen && 'rotate-180')} />
                    </button>

                    {isDropdownOpen && (
                        <div className="absolute right-0 mt-4 w-72 origin-top-right bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="p-4 border-b border-slate-100 dark:border-neutral-800">
                                <p className="text-md font-bold text-slate-900 dark:text-white">{user?.firstName} {user?.lastName}</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{user?.email}</p>
                                <span className="inline-flex mt-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 rounded">
                                    {user?.roles?.[0] || 'User'}
                                </span>
                            </div>

                            <div className="p-2 border-b border-slate-100 dark:border-neutral-800">
                                <p className="px-2 pb-1 text-[11px] uppercase tracking-wide text-slate-400">Accounts</p>
                                {secondaryAccounts.map((account) => {
                                    const isActive = account.id === activeAccountId;
                                    const isSwitching = switchingAccountId === account.id;
                                    return (
                                        <button
                                            key={account.id}
                                            onClick={() => handleSwitchAccount(account.id)}
                                            disabled={isSwitching || isActive}
                                            className={cn(
                                                'flex items-center gap-3 w-full px-2 py-2 rounded-lg text-left transition-colors',
                                                isActive ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-slate-50 dark:hover:bg-neutral-800',
                                                (isSwitching || isActive) && 'cursor-default'
                                            )}
                                        >
                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-700 dark:bg-neutral-700 dark:text-slate-200 text-xs font-semibold uppercase">
                                                {initials(account)}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{account.firstName} {account.lastName}</p>
                                                <p className="truncate text-xs text-slate-500 dark:text-slate-400">{account.email}</p>
                                            </div>
                                            {isActive ? <Check className="h-4 w-4 text-blue-600" /> : null}
                                            {isSwitching ? <span className="text-xs text-slate-400">...</span> : null}
                                        </button>
                                    );
                                })}

                                <button
                                    onClick={handleAddAccount}
                                    className="mt-1 flex items-center gap-2 w-full px-2 py-2 rounded-lg text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-neutral-800"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add another account
                                </button>

                                {accountActionError ? (
                                    <div className="mt-2 flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-2 py-1.5 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
                                        <AlertCircle className="mt-0.5 h-3.5 w-3.5" />
                                        <span>{accountActionError}</span>
                                    </div>
                                ) : null}
                            </div>

                            <div className="p-1">
                                <button
                                    onClick={() => {
                                        setIsDropdownOpen(false);
                                        logout();
                                    }}
                                    className="flex items-center w-full px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-neutral-800 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-colors group"
                                >
                                    <LogOut className="w-4 h-4 mr-3 text-slate-400 group-hover:text-red-600 transition-colors" />
                                    Logout current account
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};
