import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  History,
  LoaderCircle,
  RefreshCw,
  Save,
  Shield,
  UserCog,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/features/auth/context/AuthContext';
import {
  assignUserRoles,
  createRole,
  getAccessAudit,
  getApiErrorMessage,
  getModules,
  getPermissionCatalog,
  getRoles,
  getUserPageAccess,
  getUsers,
  updateRole,
  updateUserPageAccess,
} from '@/features/access-control/api/accessControlApi';
import { authApi } from '@/lib/api';
import { callApi } from '@/lib/apiService';

const TABS = [
  { id: 'roles', label: 'Roles & Permissions', icon: Shield },
  { id: 'users', label: 'Member Access', icon: UserCog },
  { id: 'audit', label: 'Audit Log', icon: History },
];

const EMPTY_ROLE_FORM = { name: '', description: '', permissionKeys: [] };
const HIDDEN_PERMISSION_KEYS = new Set(['create:tenant', 'read:tenant']);
const HIDDEN_USER_ACCESS_PAGE_KEYS = new Set(['system-admin.tenant', 'system-admin.users']);

const formatDateTime = (value) =>
  value
    ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
    : 'N/A';

const Notice = ({ tone = 'info', message }) => {
  if (!message) return null;

  const toneMap = {
    error:
      'border-rose-200 bg-rose-50/80 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300',
    success:
      'border-emerald-200 bg-emerald-50/80 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300',
    info:
      'border-slate-200 bg-slate-50/80 text-slate-700 dark:border-neutral-700 dark:bg-neutral-800/70 dark:text-neutral-300',
  };

  return <div className={cn('rounded-xl border px-4 py-3 text-sm leading-6', toneMap[tone] || toneMap.info)}>{message}</div>;
};

const LoadingBlock = ({ label }) => (
  <div className="flex items-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600 dark:border-neutral-700 dark:bg-neutral-900/60 dark:text-neutral-400">
    <LoaderCircle className="h-4 w-4 animate-spin" />
    <span>{label}</span>
  </div>
);

const ErrorBlock = ({ message, onRetry }) => (
  <div className="rounded-xl border border-rose-200 bg-rose-50/90 px-4 py-4 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
    <div className="flex items-start gap-3">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <p>{message}</p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 rounded-full border border-rose-300 px-3 py-1.5 text-xs font-medium hover:bg-rose-100 dark:border-rose-400/30 dark:hover:bg-rose-500/10"
          >
            Retry
          </button>
        ) : null}
      </div>
    </div>
  </div>
);

const EmptyBlock = ({ message }) => (
  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 dark:border-neutral-700 dark:bg-neutral-900/60 dark:text-neutral-400">
    {message}
  </div>
);

const TogglePill = ({ checked, onChange, label }) => (
  <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-300">
    <input
      type="checkbox"
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
      className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
    />
    <span>{label}</span>
  </label>
);

const getOverrideState = (page, draft) => {
  const current = draft || null;

  if (current) {
    const matchesInherited =
      current.canRead === page.inheritedCanRead && current.canWrite === page.inheritedCanWrite;

    if (matchesInherited) {
      return {
        label: 'Pending reset to role default',
        tone: 'emerald',
      };
    }

    return {
      label: `Pending override: Read ${current.canRead ? 'Yes' : 'No'}, Write ${current.canWrite ? 'Yes' : 'No'}`,
      tone: 'amber',
    };
  }

  if (page.directCanRead === null && page.directCanWrite === null) {
    return {
      label: 'Using role default',
      tone: 'blue',
    };
  }

  return {
    label: `Direct override active: Read ${page.directCanRead ? 'Yes' : 'No'}, Write ${page.directCanWrite ? 'Yes' : 'No'}`,
    tone: 'amber',
  };
};

const filterModulesForTenantApp = (modules = []) =>
  modules
    .map((moduleRecord) => ({
      ...moduleRecord,
      pages: (moduleRecord.pages || [])
        .map(function filterPage(page) {
          const filteredChildPages = (page.childPages || [])
            .map(filterPage)
            .filter(
              (childPage) =>
                childPage.permissions.length > 0 || (childPage.childPages || []).length > 0,
            );

          const filteredPermissions = (page.permissions || []).filter(
            (permission) => !HIDDEN_PERMISSION_KEYS.has(permission.key),
          );

          return {
            ...page,
            permissions: filteredPermissions,
            childPages: filteredChildPages,
          };
        })
        .filter((page) => page.permissions.length > 0 || (page.childPages || []).length > 0),
    }))
    .filter((moduleRecord) => (moduleRecord.pages || []).length > 0);

const normalizeAccessModuleDisplay = (modules = []) => {
  const flattenSettingsPages = (pages = []) =>
    pages.flatMap((page) => {
      const basePage = {
        ...page,
        label: page.key === 'settings' ? 'Settings' : page.label,
        childPages: [],
      };

      const flattenedChildren = (page.childPages || []).map((childPage) => ({
        ...childPage,
        childPages: [],
      }));

      return [basePage, ...flattenedChildren];
    });

  const normalizedModules = modules.map((moduleRecord) => {
    if (moduleRecord.key === 'system-admin') {
      return {
        ...moduleRecord,
        label: 'Settings',
        description: 'Settings access and membership administration',
        pages: (moduleRecord.pages || []).map((page) => {
          if (page.key === 'users') {
            return {
              ...page,
              label: 'Member Management',
              description: 'Member administration',
            };
          }

          return page;
        }),
      };
    }

    return moduleRecord;
  });

  const settingsModule = normalizedModules.find((moduleRecord) => moduleRecord.key === 'system');
  const settingsAccessModule = normalizedModules.find((moduleRecord) => moduleRecord.key === 'system-admin');

  if (!settingsModule && !settingsAccessModule) {
    return normalizedModules;
  }

  const mergedSettingsModule = {
    id: settingsModule?.id || settingsAccessModule?.id || 'settings-access',
    key: 'settings-access',
    label: 'Settings',
    description: 'Settings, member management, and access control',
    pages: [
      ...flattenSettingsPages(settingsModule?.pages || []),
      ...(settingsAccessModule?.pages || []),
    ],
  };

  return [
    ...normalizedModules.filter(
      (moduleRecord) => !['system', 'system-admin'].includes(moduleRecord.key),
    ),
    mergedSettingsModule,
  ];
};

const PermissionTree = ({ modules, selectedKeys, onToggle, readOnly = false, expanded = [], onToggleSection }) => {
  if (!modules?.length) {
    return <EmptyBlock message="No purchased modules or permissions are available for this tenant." />;
  }

  const renderPage = (page, moduleLabel, level = 0) => {
    const allSelected =
      page.permissions.length > 0 && page.permissions.every((permission) => selectedKeys.includes(permission.key));
    return (
      <div key={page.id} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className={cn('rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]', level > 0 ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300' : 'bg-slate-100 text-slate-600 dark:bg-neutral-800 dark:text-neutral-400')}>
                {level > 0 ? 'Child' : 'Page'}
              </span>
              <h4 className="text-base font-semibold text-slate-950 dark:text-white">{page.label}</h4>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:bg-neutral-800 dark:text-neutral-400">
                {moduleLabel}
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-neutral-400">
              {page.description || page.routePath || `Permissions for ${page.label}`}
            </p>
          </div>

          {!readOnly && page.permissions.length ? (
            <button
              type="button"
              onClick={() => page.permissions.forEach((permission) => onToggle(permission.key, !allSelected))}
              className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              {allSelected ? 'Clear Page' : 'Select Page'}
            </button>
          ) : null}
        </div>

        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {page.permissions.map((permission) => (
            <label
              key={permission.id}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium',
                selectedKeys.includes(permission.key)
                  ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300'
                  : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300',
              )}
            >
              {!readOnly ? (
                <input
                  type="checkbox"
                  checked={selectedKeys.includes(permission.key)}
                  onChange={(event) => onToggle(permission.key, event.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
              ) : null}
              <span>{permission.key}</span>
            </label>
          ))}
        </div>

        {page.childPages?.length ? (
          <div className="space-y-3 border-l border-slate-200 pl-4 dark:border-neutral-800">
            {page.childPages.map((childPage) => renderPage(childPage, moduleLabel, level + 1))}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {modules.map((moduleRecord) => {
        const isOpen = expanded.includes(moduleRecord.id);
        return (
          <div key={moduleRecord.id} className="overflow-hidden rounded-[20px] border border-slate-200 bg-slate-50/70 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/60">
            <div className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left">
              <div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-slate-950 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white dark:bg-white dark:text-slate-950">
                    {moduleRecord.label}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-neutral-400">
                    {moduleRecord.pages.length} pages
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-600 dark:text-neutral-400">
                  {moduleRecord.description || 'Purchased module and page permissions'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onToggleSection?.(moduleRecord.id)}
                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200">
                {isOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
              </button>
            </div>
            {isOpen ? <div className="space-y-4 border-t border-slate-200 px-5 py-5 dark:border-neutral-800">{moduleRecord.pages.map((page) => renderPage(page, moduleRecord.label))}</div> : null}
          </div>
        );
      })}
    </div>
  );
};

export const AccessControlPage = () => {
  const { user, checkAuth, refreshNavigation } = useAuth();
  const [activeTab, setActiveTab] = useState('roles');
  const [catalogState, setCatalogState] = useState({ data: [], loading: true, error: '' });
  const [modulesState, setModulesState] = useState({ data: [], loading: true, error: '' });
  const [rolesState, setRolesState] = useState({ data: [], loading: true, error: '' });
  const [usersState, setUsersState] = useState({ data: [], loading: true, error: '' });
  const [auditState, setAuditState] = useState({ data: [], loading: true, error: '' });
  const [roleForm, setRoleForm] = useState(EMPTY_ROLE_FORM);
  const [roleEditorId, setRoleEditorId] = useState('');
  const [roleActionState, setRoleActionState] = useState({ submitting: false, error: '', success: '' });
  const [selectedUserId, setSelectedUserId] = useState('');
  const [assignedRoleIds, setAssignedRoleIds] = useState([]);
  const [userAccessState, setUserAccessState] = useState({ data: null, loading: false, error: '' });
  const [pageOverrides, setPageOverrides] = useState({});
  const [userRoleActionState, setUserRoleActionState] = useState({ submitting: false, error: '', success: '' });
  const [pageAccessActionState, setPageAccessActionState] = useState({ submitting: false, error: '', success: '' });
  const [auditLimit, setAuditLimit] = useState(50);
  const [expandedPermissionModules, setExpandedPermissionModules] = useState([]);

  useEffect(() => {
    setExpandedPermissionModules([]);
  }, [roleEditorId]);

  const togglePermissionModule = (moduleId) => {
    setExpandedPermissionModules((current) =>
      current.includes(moduleId)
        ? current.filter((value) => value !== moduleId)
        : [...current, moduleId],
    );
  };
  const loadCatalog = async () => {
    setCatalogState((current) => ({ ...current, loading: true, error: '' }));
    try {
      const data = await getPermissionCatalog();
      setCatalogState({ data: Array.isArray(data) ? data : [], loading: false, error: '' });
    } catch (error) {
      setCatalogState({ data: [], loading: false, error: getApiErrorMessage(error, 'Unable to load permission catalog.') });
    }
  };

  const loadModules = async () => {
    setModulesState((current) => ({ ...current, loading: true, error: '' }));
    try {
      const data = await getModules();
      setModulesState({ data: Array.isArray(data) ? data : [], loading: false, error: '' });
    } catch (error) {
      setModulesState({ data: [], loading: false, error: getApiErrorMessage(error, 'Unable to load purchased modules.') });
    }
  };

  const loadRoles = async () => {
    setRolesState((current) => ({ ...current, loading: true, error: '' }));
    try {
      const data = await getRoles();
      setRolesState({ data: Array.isArray(data) ? data : [], loading: false, error: '' });
    } catch (error) {
      setRolesState({ data: [], loading: false, error: getApiErrorMessage(error, 'Unable to load tenant roles.') });
    }
  };

  const loadUsers = async () => {
    setUsersState((current) => ({ ...current, loading: true, error: '' }));
    try {
      const data = await getUsers();
      const nextUsers = Array.isArray(data) ? data : [];
      setUsersState({ data: nextUsers, loading: false, error: '' });
      setSelectedUserId((current) => current || nextUsers[0]?.id || '');
    } catch (error) {
      setUsersState({ data: [], loading: false, error: getApiErrorMessage(error, 'Unable to load users.') });
    }
  };

  const loadAudit = async (limit = auditLimit) => {
    setAuditState((current) => ({ ...current, loading: true, error: '' }));
    try {
      const data = await getAccessAudit({ limit });
      setAuditState({ data: Array.isArray(data) ? data : [], loading: false, error: '' });
    } catch (error) {
      setAuditState({ data: [], loading: false, error: getApiErrorMessage(error, 'Unable to load audit log.') });
    }
  };

  const loadUserAccess = async (userId) => {
    if (!userId) {
      setUserAccessState({ data: null, loading: false, error: '' });
      setAssignedRoleIds([]);
      setPageOverrides({});
      return;
    }

    setUserAccessState({ data: null, loading: true, error: '' });
    setUserRoleActionState({ submitting: false, error: '', success: '' });
    setPageAccessActionState({ submitting: false, error: '', success: '' });
    setPageOverrides({});

    try {
      const data = await getUserPageAccess(userId);
      setUserAccessState({ data, loading: false, error: '' });
      setAssignedRoleIds(data?.user?.roleIds || []);
    } catch (error) {
      setUserAccessState({ data: null, loading: false, error: getApiErrorMessage(error, 'Unable to load page access for the selected user.') });
      setAssignedRoleIds([]);
    }
  };

  const syncCurrentSessionPermissions = async () => {
    await callApi(authApi.refresh);
    await checkAuth();
    await refreshNavigation();
  };

  useEffect(() => {
    loadCatalog();
    loadModules();
    loadRoles();
    loadUsers();
    loadAudit(auditLimit);
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      loadUserAccess(selectedUserId);
    }
  }, [selectedUserId]);

  const resetRoleForm = () => {
    setRoleForm(EMPTY_ROLE_FORM);
    setRoleEditorId('');
    setRoleActionState({ submitting: false, error: '', success: '' });
  };

  const togglePermission = (permissionKey, checked) => {
    setRoleForm((current) => {
      const nextKeys = new Set(current.permissionKeys);
      const isWritePermission = permissionKey.startsWith('write:');
      const isReadPermission = permissionKey.startsWith('read:');
      const pairedReadPermission = isWritePermission ? permissionKey.replace(/^write:/, 'read:') : null;
      const pairedWritePermission = isReadPermission ? permissionKey.replace(/^read:/, 'write:') : null;

      if (checked) {
        nextKeys.add(permissionKey);
        if (pairedReadPermission) {
          nextKeys.add(pairedReadPermission);
        }
      } else {
        nextKeys.delete(permissionKey);
        if (pairedWritePermission) {
          nextKeys.delete(pairedWritePermission);
        }
      }

      return {
        ...current,
        permissionKeys: Array.from(nextKeys),
      };
    });
  };

  const handleEditRole = (role) => {
    const editableRolePermissions = role.permissions
      .map((permission) => permission.key)
      .filter((permissionKey) => editablePermissionKeys.size === 0 || editablePermissionKeys.has(permissionKey));

    setRoleEditorId(role.id);
    setRoleForm({
      name: role.name || '',
      description: role.description || '',
      permissionKeys: editableRolePermissions,
    });
    setRoleActionState({ submitting: false, error: '', success: '' });
    setActiveTab('roles');
  };

  const handleRoleSubmit = async (event) => {
    event.preventDefault();
    setRoleActionState({ submitting: true, error: '', success: '' });

    const payload = {
      name: roleForm.name.trim(),
      description: roleForm.description.trim(),
      permissionKeys: roleForm.permissionKeys,
    };

    try {
      if (roleEditorId) {
        await updateRole(roleEditorId, payload);
      } else {
        await createRole(payload);
      }

      await loadRoles();
      setRoleActionState({
        submitting: false,
        error: '',
        success: roleEditorId ? 'Role updated successfully.' : 'Role created successfully.',
      });

      if (!roleEditorId) {
        setRoleForm(EMPTY_ROLE_FORM);
      }

      if (roleEditorId && user?.roleIds?.includes(roleEditorId)) {
        await syncCurrentSessionPermissions();
      }
    } catch (error) {
      setRoleActionState({
        submitting: false,
        error: getApiErrorMessage(error, 'Unable to save the role.'),
        success: '',
      });
    }
  };

  const toggleAssignedRole = (roleId, checked) => {
    setAssignedRoleIds((current) =>
      checked ? Array.from(new Set([...current, roleId])) : current.filter((value) => value !== roleId),
    );
  };

  const getEffectiveOverride = (page) => {
    const draft = pageOverrides[page.pageId];
    if (draft) return draft;
    return {
      canRead: page.directCanRead ?? page.inheritedCanRead,
      canWrite: page.directCanWrite ?? page.inheritedCanWrite,
    };
  };

  const togglePageOverride = (page, field, checked) => {
    const next = { ...getEffectiveOverride(page), [field]: checked };
    if (field === 'canWrite' && checked) next.canRead = true;
    if (field === 'canRead' && !checked) next.canWrite = false;
    setPageOverrides((current) => ({ ...current, [page.pageId]: next }));
  };

  const resetPageOverride = (page) => {
    setPageOverrides((current) => ({
      ...current,
      [page.pageId]: {
        canRead: page.inheritedCanRead,
        canWrite: page.inheritedCanWrite,
      },
    }));
  };

  const hasExplicitOverride = (page) => {
    const draft = pageOverrides[page.pageId];
    if (draft) {
      return draft.canRead !== page.inheritedCanRead || draft.canWrite !== page.inheritedCanWrite;
    }

    return page.directCanRead !== null || page.directCanWrite !== null;
  };

  const handleUserRoleSubmit = async () => {
    if (!selectedUserId) return;

    setUserRoleActionState({ submitting: true, error: '', success: '' });
    try {
      await assignUserRoles(selectedUserId, { roleIds: assignedRoleIds });
      await loadUserAccess(selectedUserId);
      await loadRoles();
      await loadAudit(auditLimit);

      if (selectedUserId === user?.id) {
        await syncCurrentSessionPermissions();
      }

      setUserRoleActionState({ submitting: false, error: '', success: 'User role assignment updated successfully.' });
    } catch (error) {
      setUserRoleActionState({ submitting: false, error: getApiErrorMessage(error, 'Unable to update user roles.'), success: '' });
    }
  };

  const handlePageAccessSubmit = async () => {
    if (!selectedUserId) return;

    const entries = Object.entries(pageOverrides).map(([pageId, value]) => ({
      pageId,
      canRead: Boolean(value.canRead),
      canWrite: Boolean(value.canWrite),
    }));

    if (!entries.length) {
      setPageAccessActionState({ submitting: false, error: 'No page access changes are pending.', success: '' });
      return;
    }

    setPageAccessActionState({ submitting: true, error: '', success: '' });
    try {
      await updateUserPageAccess(selectedUserId, { entries });
      await loadUserAccess(selectedUserId);
      await loadAudit(auditLimit);

      if (selectedUserId === user?.id) {
        await syncCurrentSessionPermissions();
      }

      setPageAccessActionState({ submitting: false, error: '', success: 'User page access updated successfully.' });
    } catch (error) {
      setPageAccessActionState({ submitting: false, error: getApiErrorMessage(error, 'Unable to update page access.'), success: '' });
    }
  };

  const purchasedPageCount = modulesState.data.reduce((count, moduleRecord) => {
    const walkPages = (pages) => pages.reduce((pageCount, page) => pageCount + 1 + walkPages(page.childPages || []), 0);
    return count + walkPages(moduleRecord.pages || []);
  }, 0);

  const selectedUser = usersState.data.find((candidate) => candidate.id === selectedUserId);
  const visibleUserAccessPages = (userAccessState.data?.pages || []).filter(
    (page) => !HIDDEN_USER_ACCESS_PAGE_KEYS.has(`${page.moduleKey}.${page.pageKey}`),
  );
  const pageGroups = visibleUserAccessPages.reduce((groups, page) => {
    const nextGroup = groups[page.moduleLabel] || [];
    nextGroup.push(page);
    groups[page.moduleLabel] = nextGroup;
    return groups;
  }, {});
  const visibleCatalogModules = normalizeAccessModuleDisplay(filterModulesForTenantApp(catalogState.data));
  const editableCatalogModules = visibleCatalogModules;
  const editablePermissionKeys = new Set(
    editableCatalogModules.flatMap((moduleRecord) =>
      (moduleRecord.pages || []).flatMap(function walkPages(page) {
        return [
          ...((page.permissions || []).map((permission) => permission.key)),
          ...((page.childPages || []).flatMap(walkPages)),
        ];
      }),
    ),
  );
  const hiddenSystemPermissionCount = roleForm.permissionKeys.filter(
    (permissionKey) => !editablePermissionKeys.has(permissionKey),
  ).length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="border-b border-slate-200 bg-[linear-gradient(180deg,_rgba(248,250,252,0.98),_rgba(255,255,255,1))] px-8 py-8 dark:border-neutral-800 dark:bg-[linear-gradient(180deg,_rgba(23,23,23,0.98),_rgba(10,10,10,1))]">
          <div className="mt-3 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-slate-950 dark:text-white">Access Control</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-neutral-400">
                Centralize role management, user access review, direct page overrides, and audit visibility from one admin workspace.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 dark:border-neutral-800 dark:bg-neutral-950">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-neutral-400">Modules</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{visibleCatalogModules.length}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 dark:border-neutral-800 dark:bg-neutral-950">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-neutral-400">Pages</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{purchasedPageCount}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 dark:border-neutral-800 dark:bg-neutral-950">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-neutral-400">Roles</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{rolesState.data.length}</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition',
                isActive
                  ? 'bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950'
                  : 'text-slate-600 hover:bg-slate-50 dark:text-neutral-300 dark:hover:bg-neutral-800',
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'roles' ? (
        <section className="grid gap-6 xl:grid-cols-[380px,minmax(0,1fr)]">
          <div className="space-y-6 self-start">
            <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/70 dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-black/30">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-950 dark:text-white">Roles Library</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-neutral-400">Choose a role to review its permissions or start a new role configuration.</p>
                </div>
                <button type="button" onClick={loadRoles} className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800">
                  <RefreshCw className="h-3.5 w-3.5" />
                  Refresh
                </button>
              </div>
              <div className="mt-6 space-y-3">
                {rolesState.loading ? <LoadingBlock label="Loading roles..." /> : null}
                {!rolesState.loading && rolesState.error ? <ErrorBlock message={rolesState.error} onRetry={loadRoles} /> : null}
                {!rolesState.loading && !rolesState.error && !rolesState.data.length ? <EmptyBlock message="No roles exist for this tenant yet." /> : null}
                {!rolesState.loading && !rolesState.error
                  ? rolesState.data.map((role) => (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => handleEditRole(role)}
                        className={cn(
                          'w-full rounded-xl border px-4 py-4 text-left transition',
                          roleEditorId === role.id
                            ? 'border-slate-900 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-950'
                            : 'border-slate-200 bg-slate-50/70 hover:bg-slate-100 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:bg-neutral-800',
                        )}
                      >
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <div className="flex items-center gap-3">
                              <h3 className={cn('text-base font-semibold', roleEditorId === role.id ? 'text-white dark:text-slate-950' : 'text-slate-950 dark:text-white')}>{role.name}</h3>
                              <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-medium', roleEditorId === role.id ? 'bg-white/15 text-white dark:bg-slate-100 dark:text-slate-700' : 'bg-white text-slate-600 dark:bg-neutral-800 dark:text-neutral-300')}>{role.assignedUsersCount} members</span>
                            </div>
                            <p className={cn('mt-2 text-sm leading-6', roleEditorId === role.id ? 'text-white/80 dark:text-slate-600' : 'text-slate-600 dark:text-neutral-400')}>{role.description || 'No description provided.'}</p>
                          </div>
                          <span className={cn('text-xs', roleEditorId === role.id ? 'text-white/75 dark:text-slate-600' : 'text-slate-500 dark:text-neutral-400')}>{role.permissions.length} permissions</span>
                        </div>
                      </button>
                    ))
                  : null}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-950 dark:text-white">Configure Role</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-neutral-400">Update role details and assignable permissions. Changes here affect every user mapped to this role.</p>
                </div>
                <button type="button" onClick={resetRoleForm} className="rounded-full border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800">
                  New Role
                </button>
              </div>

              <form className="mt-6 space-y-5" onSubmit={handleRoleSubmit}>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-slate-700 dark:text-neutral-300">Name</span>
                    <input type="text" value={roleForm.name} onChange={(event) => setRoleForm((current) => ({ ...current, name: event.target.value }))} placeholder="sales-executive" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white" required />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-slate-700 dark:text-neutral-300">Description</span>
                    <input type="text" value={roleForm.description} onChange={(event) => setRoleForm((current) => ({ ...current, description: event.target.value }))} placeholder="Controlled access for a specific team" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white" />
                  </label>
                </div>

                <Notice
                  tone={roleActionState.error ? 'error' : roleActionState.success ? 'success' : 'info'}
                  message={
                    roleActionState.error ||
                    roleActionState.success ||
                    (hiddenSystemPermissionCount > 0
                      ? `${roleForm.permissionKeys.length} assignable permissions selected. ${hiddenSystemPermissionCount} system permissions are backend-managed and excluded from editing.`
                      : `${roleForm.permissionKeys.length} permissions selected.`)
                  }
                />

                <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 md:flex-row md:items-center md:justify-between dark:border-neutral-800 dark:bg-neutral-950">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">Permission Selection</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">Use module groups below to grant only the permissions this role needs.</p>
                  </div>
                  <button type="submit" disabled={roleActionState.submitting} className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200">
                    {roleActionState.submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {roleEditorId ? 'Update Role' : 'Create Role'}
                  </button>
                </div>

                {catalogState.loading ? <LoadingBlock label="Loading permission catalog..." /> : null}
                {!catalogState.loading && catalogState.error ? <ErrorBlock message={catalogState.error} onRetry={loadCatalog} /> : null}
                {!catalogState.loading && !catalogState.error ? (
                  <PermissionTree
                    modules={editableCatalogModules}
                    selectedKeys={roleForm.permissionKeys}
                    onToggle={togglePermission}
                    expanded={expandedPermissionModules}
                    onToggleSection={togglePermissionModule}
                  />
                ) : null}
              </form>
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === 'users' ? (
        <section className="space-y-6">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-950 dark:text-white">Member Access Management</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-neutral-400">Assign roles, inspect effective page access, and persist direct page overrides for a selected member.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-[minmax(240px,320px),auto]">
                <select value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white">
                  <option value="">Select a member</option>
                  {usersState.data.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.firstName} {candidate.lastName} ({candidate.email})</option>)}
                </select>
                <button type="button" onClick={loadUsers} className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800">
                  <RefreshCw className="h-4 w-4" />
                  Refresh Members
                </button>
              </div>
            </div>
            <div className="mt-6">
              {usersState.loading ? <LoadingBlock label="Loading users..." /> : null}
              {!usersState.loading && usersState.error ? <ErrorBlock message={usersState.error} onRetry={loadUsers} /> : null}
              {!usersState.loading && !usersState.error && !usersState.data.length ? <EmptyBlock message="No members are available for role assignment." /> : null}
            </div>
          </div>

          {selectedUser ? (
            <div className="grid gap-6 xl:grid-cols-[0.88fr,1.12fr]">
              <div className="space-y-6">
                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                  <h3 className="text-lg font-semibold text-slate-950 dark:text-white">Selected Member</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-neutral-400">Review the current role assignment before applying changes.</p>
                  <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-neutral-800 dark:bg-neutral-950">
                    <p className="text-base font-semibold text-slate-950 dark:text-white">{selectedUser.firstName} {selectedUser.lastName}</p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-neutral-400">{selectedUser.email}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(selectedUser.roles || []).map((roleName) => <span key={roleName} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 dark:bg-neutral-800 dark:text-neutral-300">{roleName}</span>)}
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-950 dark:text-white">Assign Roles</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-neutral-400">Save one or more role assignments for the selected member.</p>
                    </div>
                    <button type="button" onClick={handleUserRoleSubmit} disabled={userRoleActionState.submitting || !selectedUserId} className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200">
                      {userRoleActionState.submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Save Roles
                    </button>
                  </div>
                  <div className="mt-5 space-y-3">
                    <Notice tone={userRoleActionState.error ? 'error' : userRoleActionState.success ? 'success' : 'info'} message={userRoleActionState.error || userRoleActionState.success || 'Select the tenant roles that should apply to this user.'} />
                    {rolesState.loading ? <LoadingBlock label="Loading roles..." /> : null}
                    {!rolesState.loading && !rolesState.error && !rolesState.data.length ? <EmptyBlock message="Create a role first before assigning it to a user." /> : null}
                    {!rolesState.loading && !rolesState.error
                      ? rolesState.data.map((role) => (
                          <label key={role.id} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-neutral-800 dark:bg-neutral-950">
                            <input type="checkbox" checked={assignedRoleIds.includes(role.id)} onChange={(event) => toggleAssignedRole(role.id, event.target.checked)} className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                            <div>
                              <p className="text-sm font-semibold text-slate-950 dark:text-white">{role.name}</p>
                              <p className="mt-1 text-sm text-slate-600 dark:text-neutral-400">{role.description || 'No description provided.'}</p>
                            </div>
                          </label>
                        ))
                      : null}
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-950 dark:text-white">Page Access Matrix</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-neutral-400">Effective access combines role-derived permissions with direct page overrides. Saving sends the backend entries payload structure.</p>
                  </div>
                  <button type="button" onClick={handlePageAccessSubmit} disabled={pageAccessActionState.submitting || !selectedUserId} className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200">
                    {pageAccessActionState.submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Page Access
                  </button>
                </div>
                <div className="mt-5 space-y-4">
                  <Notice tone={pageAccessActionState.error ? 'error' : pageAccessActionState.success ? 'success' : 'info'} message={pageAccessActionState.error || pageAccessActionState.success || 'Change any page toggles below and save only the pending overrides.'} />
                  {userAccessState.loading ? <LoadingBlock label="Loading page access matrix..." /> : null}
                  {!userAccessState.loading && userAccessState.error ? <ErrorBlock message={userAccessState.error} onRetry={() => loadUserAccess(selectedUserId)} /> : null}
                  {!userAccessState.loading && !userAccessState.error && !visibleUserAccessPages.length ? <EmptyBlock message="No purchased pages are available for direct page access overrides." /> : null}
                  {!userAccessState.loading && !userAccessState.error && visibleUserAccessPages.length ? (
                    <div className="space-y-4">
                      {Object.entries(pageGroups).map(([moduleLabel, pages]) => (
                        <div key={moduleLabel} className="overflow-hidden rounded-[24px] border border-slate-200 dark:border-neutral-800">
                          <div className="border-b border-slate-200 bg-slate-50 px-5 py-4 dark:border-neutral-800 dark:bg-neutral-950">
                            <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-600 dark:text-neutral-300">{moduleLabel}</h4>
                          </div>
                          <div className="divide-y divide-slate-200 dark:divide-neutral-800">
                            {pages.map((page) => {
                              const effective = getEffectiveOverride(page);
                              const draft = pageOverrides[page.pageId];
                              const overrideState = getOverrideState(page, draft);
                              return (
                                <div key={page.pageId} className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="text-sm font-semibold text-slate-950 dark:text-white">{page.pageLabel}</p>
                                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600 dark:bg-neutral-800 dark:text-neutral-400">{page.routePath || page.pageKey}</span>
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-medium">
                                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600 dark:bg-neutral-800 dark:text-neutral-400">Inherited read: {page.inheritedCanRead ? 'Yes' : 'No'}</span>
                                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600 dark:bg-neutral-800 dark:text-neutral-400">Inherited write: {page.inheritedCanWrite ? 'Yes' : 'No'}</span>
                                      <span className={cn(
                                        'rounded-full px-2.5 py-1',
                                        overrideState.tone === 'amber'
                                          ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
                                          : overrideState.tone === 'emerald'
                                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                                            : 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300',
                                      )}>
                                        {overrideState.label}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {hasExplicitOverride(page) ? (
                                      <button
                                        type="button"
                                        onClick={() => resetPageOverride(page)}
                                        className="rounded-full border border-amber-200 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50 dark:border-amber-500/30 dark:text-amber-300 dark:hover:bg-amber-500/10"
                                      >
                                        Use Role Default
                                      </button>
                                    ) : null}
                                    <TogglePill checked={effective.canRead} onChange={(checked) => togglePageOverride(page, 'canRead', checked)} label="Read" />
                                    <TogglePill checked={effective.canWrite} onChange={(checked) => togglePageOverride(page, 'canWrite', checked)} label="Write" />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {activeTab === 'audit' ? (
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-950 dark:text-white">Access Audit Log</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-neutral-400">Audit records are loaded from the access-control audit endpoint and ordered by most recent activity.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <select value={auditLimit} onChange={(event) => { const nextLimit = Number(event.target.value); setAuditLimit(nextLimit); loadAudit(nextLimit); }} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white">
                {[25, 50, 100, 200].map((value) => <option key={value} value={value}>{value} records</option>)}
              </select>
              <button type="button" onClick={() => loadAudit(auditLimit)} className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800">
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>
          <div className="mt-6">
            {auditState.loading ? <LoadingBlock label="Loading access audit records..." /> : null}
            {!auditState.loading && auditState.error ? <ErrorBlock message={auditState.error} onRetry={() => loadAudit(auditLimit)} /> : null}
            {!auditState.loading && !auditState.error && !auditState.data.length ? <EmptyBlock message="No access audit records are available yet." /> : null}
            {!auditState.loading && !auditState.error && auditState.data.length ? (
              <div className="overflow-hidden rounded-[24px] border border-slate-200 dark:border-neutral-800">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600 dark:bg-neutral-950 dark:text-neutral-400">
                      <tr>
                        <th className="px-5 py-3 font-medium">Event</th>
                        <th className="px-5 py-3 font-medium">Actor</th>
                        <th className="px-5 py-3 font-medium">Target</th>
                        <th className="px-5 py-3 font-medium">Entity</th>
                        <th className="px-5 py-3 font-medium">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-neutral-800">
                      {auditState.data.map((record) => (
                        <tr key={record.id} className="bg-white dark:bg-neutral-900">
                          <td className="px-5 py-4 align-top">
                            <p className="font-semibold text-slate-950 dark:text-white">{record.summary}</p>
                            <p className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-neutral-400">{record.eventType}</p>
                          </td>
                          <td className="px-5 py-4 align-top text-slate-600 dark:text-neutral-300">{record.actorUser ? <div><p>{record.actorUser.firstName} {record.actorUser.lastName}</p><p className="text-xs text-slate-500 dark:text-neutral-400">{record.actorUser.email}</p></div> : 'System'}</td>
                          <td className="px-5 py-4 align-top text-slate-600 dark:text-neutral-300">{record.targetUser ? <div><p>{record.targetUser.firstName} {record.targetUser.lastName}</p><p className="text-xs text-slate-500 dark:text-neutral-400">{record.targetUser.email}</p></div> : record.role?.name || 'N/A'}</td>
                          <td className="px-5 py-4 align-top text-slate-600 dark:text-neutral-300"><p>{record.entityType}</p><p className="text-xs text-slate-500 dark:text-neutral-400">{record.entityId}</p></td>
                          <td className="px-5 py-4 align-top text-slate-600 dark:text-neutral-300">{formatDateTime(record.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

    </div>
  );
};

export default AccessControlPage;





