import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  Briefcase,
  Building2,
  FileText,
  Kanban,
  KeyRound,
  LayoutDashboard,
  Magnet,
  PanelLeft,
  Receipt,
  Settings,
  Shield,
  UserCog,
  Users,
  Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import OpsEdgeLogo from '@/assets/opsedge-globe.svg';
import { NavItem } from './NavItem';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/context/AuthContext';

const ICON_MAP = {
  'bar-chart-3': BarChart3,
  'briefcase': Briefcase,
  'building-2': Building2,
  'file-text': FileText,
  'kanban': Kanban,
  'key-round': KeyRound,
  'layout-dashboard': LayoutDashboard,
  'magnet': Magnet,
  'receipt': Receipt,
  'settings': Settings,
  'shield': Shield,
  'user-cog': UserCog,
  'users': Users,
  'wallet': Wallet,
};

const normalizePath = (path) => {
  if (!path) {
    return '';
  }

  return path.replace(/\/+$/, '') || '/';
};

export const Sidebar = ({ isMobileOpen, setIsMobileOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, navigation, navigationLoading } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState(['Reports', 'Settings']);

  const isAdmin = user?.roles?.includes('admin');
  const canViewSettings = user?.permissions?.includes('read:system.settings');
  const canManageMembers = isAdmin && user?.permissions?.includes('read:users');
  const canManageAccessControl = isAdmin && user?.permissions?.includes('manage:access');
  const canViewMyKeys = isAdmin && user?.permissions?.includes('read:system.my-keys');
  const canManageTenantProfile = isAdmin && user?.permissions?.includes('read:system.tenant-profile');

  const toggleGroup = (group) => {
    setExpandedGroups((current) =>
      current.includes(group) ? current.filter((value) => value !== group) : [...current, group],
    );
  };

  const isPathActive = (targetPath, exact = false) => {
    const currentPath = normalizePath(location.pathname);
    const navPath = normalizePath(targetPath);

    if (!navPath) {
      return false;
    }

    if (navPath === '/') {
      return currentPath === '/';
    }

    if (exact) {
      return currentPath === navPath;
    }

    return currentPath === navPath || currentPath.startsWith(`${navPath}/`);
  };

  const handleNavigation = (path) => {
    if (!path) {
      return;
    }

    navigate(path);
    if (isMobileOpen) {
      setIsMobileOpen(false);
    }
  };

  const buildNavigationGroups = () => {
    const backendGroups = (navigation || []).map((moduleRecord) => ({
      title: moduleRecord.label,
      items: (moduleRecord.pages || []).map((page) => ({
        id: page.id,
        label: page.label,
        routePath: page.routePath,
        icon: ICON_MAP[page.iconKey] || Settings,
        subItems: (page.childPages || []).map((childPage) => ({
          id: childPage.id,
          label: childPage.label,
          routePath: childPage.routePath,
          icon: ICON_MAP[childPage.iconKey] || null,
        })),
      })),
    }));

    if (!canViewSettings) {
      return backendGroups;
    }

    const settingsSubItems = [
      ...(canViewMyKeys
        ? [{ id: 'settings-my-keys', label: 'My Keys', routePath: '/settings/my-keys', icon: KeyRound }]
        : []),
      ...(canManageTenantProfile
        ? [{ id: 'settings-tenant-profile', label: 'Profile', routePath: '/settings/tenant-profile', icon: Building2 }]
        : []),
      ...(canManageMembers
        ? [{ id: 'settings-members', label: 'Users', routePath: '/settings/members', icon: Users }]
        : []),
      ...(canManageAccessControl
        ? [{ id: 'settings-access-control', label: 'Access Control', routePath: '/settings/access-control', icon: Shield }]
        : []),
    ];

    const settingsGroupIndex = backendGroups.findIndex((group) => group.title === 'System');

    if (settingsGroupIndex === -1) {
      return [
        ...backendGroups,
        {
          title: 'System',
          items: [
            {
              id: 'settings-root',
              label: 'Settings',
              routePath: '/settings',
              icon: Settings,
              subItems: settingsSubItems,
            },
          ],
        },
      ];
    }

    return backendGroups.map((group) => {
      if (group.title !== 'System') {
        return group;
      }

      return {
        ...group,
        items: group.items.map((item) => {
          if (normalizePath(item.routePath) !== '/settings') {
            return item;
          }

          return {
            ...item,
            subItems: [
              ...(item.subItems || []),
              ...settingsSubItems,
            ].filter((subItem, index, allItems) =>
              allItems.findIndex((candidate) => candidate.routePath === subItem.routePath) === index,
            ),
          };
        }),
      };
    });
  };

  const menuGroups = buildNavigationGroups().filter((group) => group.items?.length);

  useEffect(() => {
    if (location.pathname.startsWith('/settings')) {
      setExpandedGroups((current) => (current.includes('Settings') ? current : [...current, 'Settings']));
    }
  }, [location.pathname]);

  const sidebarContent = (
    <div className="flex flex-col h-full py-4 px-3 overflow-y-auto">
      <div className={cn('flex items-center mb-8 px-3 transition-all duration-300 relative')}>
        {collapsed ? (
          <button
            onClick={() => setCollapsed(false)}
            className="flex items-center p-0 bg-transparent border-none cursor-pointer transition-opacity hover:opacity-80"
            title="Expand Sidebar"
          >
            <img
              src={OpsEdgeLogo}
              alt="OpsEdge"
              className="h-5 w-auto brightness-0 opacity-90 dark:invert"
            />
          </button>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <img
                src={OpsEdgeLogo}
                alt="OpsEdge"
                className="h-5 w-auto brightness-0 opacity-90 dark:invert"
              />
            </div>
            <button
              onClick={() => setCollapsed(true)}
              className="absolute right-1 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 text-main dark:text-white cursor-pointer"
            >
              <PanelLeft size={20} />
            </button>
          </>
        )}
      </div>

      {/* Absolute top loading progress bar (non-layout shifting) */}
      {navigationLoading && menuGroups.length > 0 ? (
        <div className="absolute top-0 left-0 w-full h-[3px] bg-transparent overflow-hidden z-[60]">
          <div className="h-full w-full bg-gradient-to-r from-transparent via-teal-500 dark:via-teal-400 to-transparent animate-loading-bar" />
        </div>
      ) : null}

      {navigationLoading && menuGroups.length === 0 ? (
        <div className="space-y-6 animate-pulse px-3">
          {[1, 2, 3].map((g) => (
            <div key={g} className="space-y-3">
              {/* Group Title Skeleton */}
              {!collapsed ? (
                <div className="h-3 w-16 bg-slate-200 dark:bg-neutral-800 rounded mb-2 mt-1" />
              ) : null}
              {/* Items Skeletons */}
              <div className="space-y-2">
                {[1, 2, 3].slice(0, g === 1 ? 1 : g === 2 ? 3 : 2).map((item) => (
                  <div key={item} className="flex items-center gap-3 py-1.5 px-3 rounded-lg">
                    {/* Icon Skeleton */}
                    <div className="h-4 w-4 rounded bg-slate-200 dark:bg-neutral-800 shrink-0" />
                    {/* Label Skeleton */}
                    {!collapsed ? (
                      <div className="h-3 w-24 bg-slate-200 dark:bg-neutral-800 rounded" />
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {menuGroups.map((group) => (
            <div key={group.title}>
              {!collapsed ? (
                <h3 className="mb-2 px-3 text-sm font-medium text-sub">{group.title}</h3>
              ) : null}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const hasSubItems = item.subItems?.length > 0;
                  const parentActive =
                    Boolean(item.routePath && isPathActive(item.routePath, !hasSubItems)) ||
                    item.subItems?.some((subItem) => isPathActive(subItem.routePath, true));

                  return (
                    <NavItem
                      key={item.id}
                      icon={item.icon}
                      label={item.label}
                      active={parentActive}
                      collapsed={collapsed}
                      onClick={() => {
                        if (hasSubItems) {
                          toggleGroup(item.label);
                          return;
                        }

                        handleNavigation(item.routePath);
                      }}
                    >
                      {!collapsed && hasSubItems && expandedGroups.includes(item.label) ? (
                        <div className="ml-6 mt-1 space-y-1 border-l border-slate-200 dark:border-slate-800">
                          {item.subItems.map((subItem) => (
                            <button
                              key={subItem.id}
                              onClick={() => handleNavigation(subItem.routePath)}
                              className={cn(
                                'w-full text-left px-4 py-1.5 text-sm transition-colors rounded-r-md flex items-center gap-2',
                                isPathActive(subItem.routePath, true)
                                  ? 'text-main bg-gray-100 dark:text-white dark:bg-neutral-800'
                                  : 'text-[#757575] hover:text-slate-900 dark:text-[#757575] dark:hover:text-white',
                              )}
                            >
                              {subItem.icon ? <subItem.icon className="h-4 w-4 shrink-0" /> : null}
                              {subItem.label}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </NavItem>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <>
      <aside
        className={cn(
          'hidden md:flex flex-col h-screen transition-all duration-300 border-r border-slate-200 bg-slate-50 dark:bg-black dark:border-neutral-800',
          collapsed ? 'w-[68px]' : 'w-56',
        )}
      >
        {sidebarContent}
      </aside>

      {isMobileOpen ? (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-56 bg-slate-50 dark:bg-slate-950 transition-transform duration-300 transform md:hidden',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
};



