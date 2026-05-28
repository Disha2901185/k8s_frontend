import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, ChevronRight, KeyRound, LockKeyhole, ShieldCheck, Users } from 'lucide-react';
import { useAuth } from '@/features/auth/context/AuthContext';

export const SettingsPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.roles?.includes('admin');
  const canManageMembers = isAdmin && user?.permissions?.includes('read:users');
  const canViewMyKeys = isAdmin && user?.permissions?.includes('read:system.my-keys');
  const canManageTenantProfile = isAdmin && user?.permissions?.includes('read:system.tenant-profile');

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-600 dark:text-blue-400">
          System
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950 dark:text-white">
          Settings
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-neutral-400">
          Centralize tenant-level controls here. Access Control is available from this menu for admin users.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-4 inline-flex rounded-2xl bg-violet-50 p-3 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400">
                <KeyRound className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-semibold text-slate-950 dark:text-white">
                My Keys
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-neutral-400">
                View the tenant lead intake credentials, integration guidance, request examples, and response samples in one place.
              </p>
            </div>
          </div>

          {canViewMyKeys ? (
            <Link
              to="/settings/my-keys"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
            >
              Open My Keys
              <ChevronRight className="h-4 w-4" />
            </Link>
          ) : (
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
              <LockKeyhole className="h-4 w-4" />
              Admin access required
            </div>
          )}
        </div>

        <div className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-4 inline-flex rounded-2xl bg-blue-50 p-3 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-semibold text-slate-950 dark:text-white">
                Access Control
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-neutral-400">
                Manage roles, permission bundles, user role assignment, page-level overrides, and access audit activity.
              </p>
            </div>
          </div>

          {isAdmin ? (
            <Link
              to="/settings/access-control"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
            >
              Open Access Control
              <ChevronRight className="h-4 w-4" />
            </Link>
          ) : (
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
              <LockKeyhole className="h-4 w-4" />
              Admin access required
            </div>
          )}
        </div>

        <div className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-4 inline-flex rounded-2xl bg-cyan-50 p-3 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-400">
                <Building2 className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-semibold text-slate-950 dark:text-white">
                Tenant Profile
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-neutral-400">
                Manage tenant logo, registered address, GST details, and state code used in invoices and tax logic.
              </p>
            </div>
          </div>

          {canManageTenantProfile ? (
            <Link
              to="/settings/tenant-profile"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
            >
              Open Tenant Profile
              <ChevronRight className="h-4 w-4" />
            </Link>
          ) : (
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
              <LockKeyhole className="h-4 w-4" />
              Admin access required
            </div>
          )}
        </div>

        <div className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-4 inline-flex rounded-2xl bg-emerald-50 p-3 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                <Users className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-semibold text-slate-950 dark:text-white">
                Member Management
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-neutral-400">
                Manage tenant users through `/v1/users`, including create, edit, delete, status control, and role assignment.
              </p>
            </div>
          </div>

          {canManageMembers ? (
            <Link
              to="/settings/members"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
            >
              Open Member Management
              <ChevronRight className="h-4 w-4" />
            </Link>
          ) : (
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
              <LockKeyhole className="h-4 w-4" />
              Admin user permission required
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;

