import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { authApi, setApiAuthSession } from '@/lib/api';
import { callApi } from '@/lib/apiService';
import { getNavigation } from '@/features/access-control/api/accessControlApi';

const AuthContext = createContext(null);
const ACCOUNT_STORE_KEY = 'opserp_auth_accounts_v1';
const ACTIVE_ACCOUNT_KEY = 'opserp_active_account_id_v1';

const getAuthUser = (payload) => {
  if (!payload || typeof payload !== 'object') return null;
  if (payload.user && typeof payload.user === 'object') return payload.user;
  if (Array.isArray(payload.permissions) || Array.isArray(payload.roles)) return payload;
  return null;
};

const getAccountId = (user) => user?.id || user?._id || user?.email || null;

const getAccountSummary = (user, tokens = {}) => {
  const id = getAccountId(user);
  if (!id || !user?.email) return null;
  return {
    id: String(id),
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    email: user.email,
    roles: Array.isArray(user.roles) ? user.roles : [],
    tenantId: user.tenantId || null,
    accessToken: tokens.accessToken || null,
    refreshToken: tokens.refreshToken || null,
    lastUsedAt: Date.now(),
  };
};

const readStoredAccounts = () => {
  if (typeof window === 'undefined') return { accounts: [], activeAccountId: null };
  try {
    const accountsRaw = window.localStorage.getItem(ACCOUNT_STORE_KEY);
    const activeAccountId = window.localStorage.getItem(ACTIVE_ACCOUNT_KEY);
    const parsed = JSON.parse(accountsRaw || '[]');
    const accounts = Array.isArray(parsed)
      ? parsed.filter((account) => account?.id && account?.email && account?.accessToken && account?.refreshToken)
      : [];
    return { accounts, activeAccountId };
  } catch {
    return { accounts: [], activeAccountId: null };
  }
};

const isInvalidSessionError = (error) => {
  const status = error?.status || error?.response?.status || error?.originalError?.response?.status;
  const message = String(
    error?.message ||
    error?.response?.data?.message?.message ||
    error?.response?.data?.message ||
    ''
  ).toLowerCase();
  return status === 401 || status === 403 || message.includes('session is invalid') || message.includes('invalid');
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [navigation, setNavigation] = useState([]);
  const [navigationLoading, setNavigationLoading] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [activeAccountId, setActiveAccountId] = useState(null);
  const [accountSwitching, setAccountSwitching] = useState(false);
  const [accountTransition, setAccountTransition] = useState({
    title: '',
    subtitle: '',
  });

  const persistAccounts = useCallback((nextAccounts, nextActiveId) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(ACCOUNT_STORE_KEY, JSON.stringify(nextAccounts));
    if (nextActiveId) {
      window.localStorage.setItem(ACTIVE_ACCOUNT_KEY, nextActiveId);
    } else {
      window.localStorage.removeItem(ACTIVE_ACCOUNT_KEY);
    }
  }, []);

  const refreshNavigation = useCallback(async () => {
    if (!user) {
      setNavigation([]);
      return [];
    }

    setNavigationLoading(true);
    try {
      const nextNavigation = await getNavigation();
      setNavigation(Array.isArray(nextNavigation) ? nextNavigation : []);
      return nextNavigation;
    } catch (error) {
      console.error('Navigation fetch failed', error);
      setNavigation([]);
      return [];
    } finally {
      setNavigationLoading(false);
    }
  }, [user]);

  const upsertAccount = useCallback((nextUser, tokens) => {
    const summary = getAccountSummary(nextUser, tokens);
    if (!summary) return null;

    const nextActiveId = summary.id;
    setAccounts((prev) => {
      const existingIndex = prev.findIndex((account) => account.id === summary.id);
      const nextList = [...prev];
      if (existingIndex >= 0) {
        nextList[existingIndex] = { ...nextList[existingIndex], ...summary };
      } else {
        nextList.push(summary);
      }
      persistAccounts(nextList, nextActiveId);
      return nextList;
    });
    setActiveAccountId(nextActiveId);
    return summary;
  }, [persistAccounts]);

  const applyActiveAccount = useCallback(async (account, options = {}) => {
    if (!account?.accessToken || !account?.refreshToken || !account?.id) {
      throw new Error('Selected account is not authenticated. Please add this account again.');
    }

    setApiAuthSession({ accessToken: account.accessToken, refreshToken: account.refreshToken });

    let refreshData = null;
    try {
      refreshData = await callApi(authApi.refresh, { refreshToken: account.refreshToken });
    } catch (error) {
      if (isInvalidSessionError(error)) {
        throw new Error('Stored session expired for this account. Please add this account again.');
      }

      if (options.allowFallbackMe !== false) {
        const meData = await callApi(authApi.getMe);
        refreshData = {
          user: meData,
          accessToken: account.accessToken,
          refreshToken: account.refreshToken,
        };
      } else {
        throw error;
      }
    }

    const nextUser = getAuthUser(refreshData);
    if (!nextUser) {
      throw new Error('Unable to load selected account session.');
    }

    const nextTokens = {
      accessToken: refreshData.accessToken || account.accessToken,
      refreshToken: refreshData.refreshToken || account.refreshToken,
    };

    setApiAuthSession(nextTokens);
    setUser(nextUser);
    upsertAccount(nextUser, nextTokens);
    return nextUser;
  }, [upsertAccount]);

  const removeAccountById = useCallback((accountId) => {
    setAccounts((prev) => {
      const nextList = prev.filter((account) => account.id !== accountId);
      const nextActiveId = nextList[0]?.id || null;
      persistAccounts(nextList, nextActiveId);
      setActiveAccountId(nextActiveId);
      return nextList;
    });
  }, [persistAccounts]);

  const switchAccount = useCallback(async (accountId) => {
    const selected = accounts.find((account) => account.id === accountId);
    if (!selected) {
      throw new Error('Selected account was not found.');
    }

    setAccountTransition({
      title: `Switching to ${selected.email}`,
      subtitle: 'Loading selected profile...',
    });
    setAccountSwitching(true);
    try {
      await applyActiveAccount(selected);
    } catch (error) {
      if (isInvalidSessionError(error) || String(error?.message || '').toLowerCase().includes('stored session expired')) {
        removeAccountById(String(accountId));
      }
      const message = error?.message || 'Failed to switch account. Please try again.';
      throw new Error(message);
    } finally {
      setAccountSwitching(false);
      setAccountTransition({ title: '', subtitle: '' });
    }
  }, [accounts, applyActiveAccount, removeAccountById]);

  const checkAuth = useCallback(async () => {
    try {
      const stored = readStoredAccounts();
      setAccounts(stored.accounts);
      setActiveAccountId(stored.activeAccountId);

      const sorted = [...stored.accounts].sort((a, b) => (b.lastUsedAt || 0) - (a.lastUsedAt || 0));
      const initialAccount = stored.accounts.find((account) => account.id === stored.activeAccountId) || sorted[0] || null;

      if (initialAccount) {
        try {
          await applyActiveAccount(initialAccount, { allowFallbackMe: true });
          return;
        } catch (error) {
          console.error('Stored account restore failed', error);
          const nextAccounts = stored.accounts.filter((account) => account.id !== initialAccount.id);
          setAccounts(nextAccounts);
          setActiveAccountId(nextAccounts[0]?.id || null);
          persistAccounts(nextAccounts, nextAccounts[0]?.id || null);
        }
      }

      const data = await callApi(authApi.getSession);
      const nextUser = getAuthUser(data);
      if (nextUser) {
        setUser(nextUser);
      } else {
        setUser(null);
        setNavigation([]);
      }
    } catch {
      setUser(null);
      setNavigation([]);
    } finally {
      setLoading(false);
    }
  }, [applyActiveAccount, persistAccounts]);

  const login = async (email, password) => {
    const data = await callApi(authApi.login, { email, password });
    const nextUser = getAuthUser(data);
    if (!nextUser) {
      throw new Error('Unable to read user details after login.');
    }
    const nextTokens = { accessToken: data.accessToken, refreshToken: data.refreshToken };
    setApiAuthSession(nextTokens);
    setUser(nextUser);
    upsertAccount(nextUser, nextTokens);
    return data;
  };

  const logout = useCallback(async () => {
    const currentId = activeAccountId || getAccountId(user);
    const currentAccount = accounts.find((account) => account.id === String(currentId));
    const nextAccounts = currentId ? accounts.filter((account) => account.id !== String(currentId)) : [...accounts];

    setAccountTransition({
      title: currentAccount?.email ? `Logging out from ${currentAccount.email}` : 'Logging out...',
      subtitle: '',
    });
    setAccountSwitching(true);

    // Do not block client-side logout flow on network/API reliability.
    callApi(authApi.logout).catch((error) => {
      console.error('Logout API failed', error);
    });

    // Persist removal immediately so we never switch back to the just-logged-out profile.
    setAccounts(nextAccounts);
    const nextActiveId = nextAccounts[0]?.id || null;
    setActiveAccountId(nextActiveId);
    persistAccounts(nextAccounts, nextActiveId);

    const remainingAccounts = nextAccounts;
    if (remainingAccounts.length > 0) {
      const sortedRemaining = remainingAccounts.sort((a, b) => (b.lastUsedAt || 0) - (a.lastUsedAt || 0));
      for (const next of sortedRemaining) {
        setAccountTransition({
          title: currentAccount?.email ? `Logging out from ${currentAccount.email}` : 'Logging out...',
          subtitle: `Switching profile to ${next.email}`,
        });
        try {
          await applyActiveAccount(next, { allowFallbackMe: true });
          setAccountSwitching(false);
          setAccountTransition({ title: '', subtitle: '' });
          return;
        } catch (error) {
          console.error('Failed to switch to remaining account after logout', error);
          if (isInvalidSessionError(error) || String(error?.message || '').toLowerCase().includes('stored session expired')) {
            removeAccountById(String(next.id));
          }
        }
      }
    }

    setApiAuthSession(null);
    setUser(null);
    setNavigation([]);
    setAccountSwitching(false);
    setAccountTransition({ title: '', subtitle: '' });
  }, [activeAccountId, user, accounts, applyActiveAccount, persistAccounts]);

  useEffect(() => {
    checkAuth();

    const handleGlobalLogout = () => {
      const stored = readStoredAccounts();
      const currentId = stored.activeAccountId;
      if (currentId) {
        removeAccountById(String(currentId));
      }
      setApiAuthSession(null);
      setUser(null);
      setNavigation([]);
      setLoading(false);
    };

    const handleGlobalRefresh = (event) => {
      const payload = event.detail || {};
      const nextUser = getAuthUser(payload);
      if (!nextUser) return;
      const nextTokens = {
        accessToken: payload.accessToken,
        refreshToken: payload.refreshToken,
      };
      if (nextTokens.accessToken && nextTokens.refreshToken) {
        setApiAuthSession(nextTokens);
      }
      setUser(nextUser);
      upsertAccount(nextUser, nextTokens);
    };

    window.addEventListener('auth:logout', handleGlobalLogout);
    window.addEventListener('auth:refreshed', handleGlobalRefresh);

    return () => {
      window.removeEventListener('auth:logout', handleGlobalLogout);
      window.removeEventListener('auth:refreshed', handleGlobalRefresh);
    };
  }, [checkAuth, removeAccountById, upsertAccount]);

  useEffect(() => {
    if (!user) {
      setNavigation([]);
      setNavigationLoading(false);
      return;
    }

    refreshNavigation();
  }, [user, refreshNavigation]);

  const value = useMemo(() => ({
    user,
    loading,
    login,
    logout,
    checkAuth,
    navigation,
    navigationLoading,
    refreshNavigation,
    accounts,
    activeAccountId,
    switchAccount,
    accountSwitching,
    accountTransition,
  }), [user, loading, navigation, navigationLoading, refreshNavigation, accounts, activeAccountId, switchAccount, accountSwitching, accountTransition]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};