import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Copy, Filter, MoreHorizontal, Pencil, Plus, RefreshCw, Search, Trash2, X } from 'lucide-react';
import { getApiErrorMessage, getRoles } from '@/features/access-control/api/accessControlApi';
import { createMember, deleteMember, listMembers, updateMember } from '@/features/settings/api/memberManagementApi';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { cn } from '@/lib/utils';

const STATUS_OPTIONS = ['ACTIVE', 'INVITED', 'DISABLED'];
const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  email: '',
  status: 'ACTIVE',
  roleIds: [],
};

const Notice = ({ tone = 'info', children }) => {
  const toneMap = {
    error:
      'border-rose-200 bg-rose-50/80 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300',
    success:
      'border-emerald-200 bg-emerald-50/80 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300',
    info:
      'border-slate-200 bg-slate-50/80 text-slate-700 dark:border-neutral-700 dark:bg-neutral-800/70 dark:text-neutral-300',
  };

  return <div className={cn('rounded-2xl border px-4 py-3 text-sm leading-6', toneMap[tone] || toneMap.info)}>{children}</div>;
};

const LoadingBlock = ({ label }) => (
  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 dark:border-neutral-700 dark:bg-neutral-900/60 dark:text-neutral-400">
    {label}
  </div>
);

const EmptyBlock = ({ message }) => (
  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500 dark:border-neutral-700 dark:bg-neutral-900/60 dark:text-neutral-400">
    {message}
  </div>
);

const StatusBadge = ({ value }) => {
  const tones = {
    ACTIVE: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
    INVITED: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
    DISABLED: 'bg-slate-100 text-slate-700 dark:bg-neutral-800 dark:text-neutral-300',
  };

  return (
    <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]', tones[value] || tones.DISABLED)}>
      {value}
    </span>
  );
};

const ConfirmDialog = ({ open, title, message, confirmLabel, busy, onCancel, onConfirm }) => {
  if (!open) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[24px] border border-slate-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-950">
        <div className="flex items-start gap-4">
          <div className="inline-flex rounded-2xl bg-rose-50 p-3 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
            <Trash2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xl font-semibold text-slate-950 dark:text-white">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-neutral-400">{message}</p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-rose-500 disabled:opacity-60 dark:bg-rose-500 dark:hover:bg-rose-400"
          >
            <Trash2 className="h-4 w-4" />
            {busy ? 'Deleting...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

const RoleMultiSelect = ({ roles, selectedRoleIds, onChange }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef(null);
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0, openUpwards: false });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open || !triggerRef.current) {
      return;
    }

    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownHeight = 320;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpwards = spaceBelow < dropdownHeight && rect.top > spaceBelow;

    setPosition({
      top: openUpwards ? rect.top - dropdownHeight - 8 : rect.bottom + 8,
      left: rect.left,
      width: rect.width,
      openUpwards,
    });
  }, [open]);

  const selectedRoles = roles.filter((role) => selectedRoleIds.includes(role.id));
  const filteredRoles = roles.filter((role) => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return true;
    }

    return `${role.name} ${role.description || ''}`.toLowerCase().includes(query);
  });

  const toggleRole = (roleId) => {
    onChange(
      selectedRoleIds.includes(roleId)
        ? selectedRoleIds.filter((value) => value !== roleId)
        : [...selectedRoleIds, roleId],
    );
  };

  return (
    <div className="space-y-2" ref={wrapperRef}>
      <div>
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-900 transition hover:border-slate-300 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white dark:hover:border-neutral-600"
        >
          <span className={selectedRoles.length ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-neutral-400'}>
            {selectedRoles.length ? `${selectedRoles.length} role${selectedRoles.length > 1 ? 's' : ''} selected` : 'Select roles'}
          </span>
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {selectedRoles.length ? (
        <div className="flex flex-wrap gap-2">
          {selectedRoles.map((role) => (
            <span
              key={role.id}
              className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 dark:bg-neutral-800 dark:text-neutral-200"
            >
              {role.name}
              <button
                type="button"
                onClick={() => toggleRole(role.id)}
                className="rounded-full text-slate-500 transition hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      {open
        ? createPortal(
            <div
              ref={dropdownRef}
              style={{
                top: position.top,
                left: position.left,
                width: position.width,
              }}
              className="fixed z-[70] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-950"
            >
              <div className="border-b border-slate-100 p-3 dark:border-neutral-800">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search roles..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-10 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto p-2">
                {filteredRoles.length ? (
                  filteredRoles.map((role) => {
                    const selected = selectedRoleIds.includes(role.id);

                    return (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => toggleRole(role.id)}
                        className={cn(
                          'flex w-full items-start justify-between rounded-xl px-3 py-3 text-left transition',
                          selected
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300'
                            : 'hover:bg-slate-50 dark:hover:bg-neutral-900',
                        )}
                      >
                        <div>
                          <p className="text-sm font-semibold">{role.name}</p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">
                            {role.description || 'No description provided.'}
                          </p>
                        </div>
                        {selected ? <Check className="mt-0.5 h-4 w-4 shrink-0" /> : null}
                      </button>
                    );
                  })
                ) : (
                  <div className="px-3 py-6 text-center text-sm text-slate-500 dark:text-neutral-400">
                    No roles found.
                  </div>
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
};

const RoleFilterSelect = ({ roles, selectedRoles, onChange }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef(null);
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open || !triggerRef.current) {
      return;
    }

    const rect = triggerRef.current.getBoundingClientRect();
    setPosition({
      top: rect.bottom + 8,
      left: rect.left,
      width: rect.width,
    });
  }, [open]);

  const filteredRoles = roles.filter((role) => role.name.toLowerCase().includes(search.trim().toLowerCase()));

  const toggleRole = (roleName) => {
    onChange(
      selectedRoles.includes(roleName)
        ? selectedRoles.filter((value) => value !== roleName)
        : [...selectedRoles, roleName],
    );
  };

  return (
    <div ref={wrapperRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex h-11 w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-4 text-left text-sm text-slate-900 shadow-sm transition hover:border-slate-300 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
      >
        <span className="inline-flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400 dark:text-neutral-500" />
          <span className={selectedRoles.length ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-neutral-400'}>
          {selectedRoles.length ? `${selectedRoles.length} role${selectedRoles.length > 1 ? 's' : ''} selected` : 'Filter by roles'}
          </span>
        </span>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open
        ? createPortal(
            <div
              ref={dropdownRef}
              style={{ top: position.top, left: position.left, width: position.width }}
              className="fixed z-[70] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-950"
            >
              <div className="border-b border-slate-100 p-3 dark:border-neutral-800">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search roles..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-10 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto p-2">
                {filteredRoles.length ? (
                  filteredRoles.map((role) => {
                    const selected = selectedRoles.includes(role.name);

                    return (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => toggleRole(role.name)}
                        className={cn(
                          'flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm transition',
                          selected
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300'
                            : 'hover:bg-slate-50 dark:hover:bg-neutral-900',
                        )}
                      >
                        <span className="font-medium">{role.name}</span>
                        {selected ? <Check className="h-4 w-4 shrink-0" /> : null}
                      </button>
                    );
                  })
                ) : (
                  <div className="px-3 py-6 text-center text-sm text-slate-500 dark:text-neutral-400">No roles found.</div>
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
};

const MemberModal = ({
  open,
  roles,
  form,
  mode,
  submitting,
  error,
  onChange,
  onClose,
  onSubmit,
}) => {
  if (!open) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-950">
        <div className="border-b border-slate-200 px-6 py-5 dark:border-neutral-800">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-slate-950 dark:text-white">
                {mode === 'create' ? 'Create Member' : 'Edit Member'}
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-neutral-400">
                Password is assigned by the backend automatically.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              Close
            </button>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-5 px-6 py-6">
          {error ? (
            <Notice tone="error">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            </Notice>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700 dark:text-neutral-300">First name</span>
              <input
                value={form.firstName}
                onChange={(event) => onChange('firstName', event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white"
                required
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700 dark:text-neutral-300">Last name</span>
              <input
                value={form.lastName}
                onChange={(event) => onChange('lastName', event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white"
                required
              />
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium text-slate-700 dark:text-neutral-300">Email</span>
              <input
                type="email"
                value={form.email}
                onChange={(event) => onChange('email', event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white"
                required
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700 dark:text-neutral-300">Status</span>
              <select
                value={form.status}
                onChange={(event) => onChange('status', event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white"
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <div className="space-y-2 self-start">
              <span className="text-sm font-medium text-slate-700 dark:text-neutral-300">Roles</span>
              <RoleMultiSelect
                roles={roles}
                selectedRoleIds={form.roleIds}
                onChange={(value) => onChange('roleIds', value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
            >
              {mode === 'create' ? <Plus className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
              {submitting ? 'Saving...' : mode === 'create' ? 'Create Member' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export const MemberManagementPage = () => {
  const [membersState, setMembersState] = useState({ data: [], loading: true, error: '' });
  const [rolesState, setRolesState] = useState({ data: [], loading: true, error: '' });
  const [modalState, setModalState] = useState({ open: false, mode: 'create', memberId: '' });
  const [form, setForm] = useState(EMPTY_FORM);
  const [actionState, setActionState] = useState({ submitting: false, error: '', success: '' });
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [deleteState, setDeleteState] = useState({ member: null, submitting: false });
  const [filters, setFilters] = useState({ query: '', roles: [] });

  const loadMembers = async () => {
    setMembersState((current) => ({ ...current, loading: true, error: '' }));
    try {
      const data = await listMembers();
      setMembersState({ data: Array.isArray(data) ? data : [], loading: false, error: '' });
    } catch (error) {
      setMembersState({ data: [], loading: false, error: getApiErrorMessage(error, 'Unable to load members.') });
    }
  };

  const loadRoles = async () => {
    setRolesState((current) => ({ ...current, loading: true, error: '' }));
    try {
      const data = await getRoles();
      setRolesState({ data: Array.isArray(data) ? data : [], loading: false, error: '' });
    } catch (error) {
      setRolesState({ data: [], loading: false, error: getApiErrorMessage(error, 'Unable to load roles.') });
    }
  };

  useEffect(() => {
    loadMembers();
    loadRoles();
  }, []);

  const filteredMembers = useMemo(
    () =>
      membersState.data.filter((member) => {
        const fullName = `${member.firstName || ''} ${member.lastName || ''}`.trim().toLowerCase();
        const email = (member.email || '').toLowerCase();
        const query = filters.query.trim().toLowerCase();
        const matchesQuery = !query || fullName.includes(query) || email.includes(query);
        const matchesRoles =
          filters.roles.length === 0 || filters.roles.every((roleName) => (member.roles || []).includes(roleName));

        return matchesQuery && matchesRoles;
      }),
    [membersState.data, filters],
  );

  const sortedMembers = useMemo(
    () =>
      [...filteredMembers].sort(
        (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
      ),
    [filteredMembers],
  );

  const totalPages = Math.max(1, Math.ceil(sortedMembers.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedMembers = sortedMembers.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const openCreateModal = () => {
    setForm(EMPTY_FORM);
    setGeneratedPassword('');
    setActionState({ submitting: false, error: '', success: '' });
    setModalState({ open: true, mode: 'create', memberId: '' });
  };

  const openEditModal = (member) => {
    setForm({
      firstName: member.firstName || '',
      lastName: member.lastName || '',
      email: member.email || '',
      status: member.status || 'ACTIVE',
      roleIds: member.roleIds || [],
    });
    setGeneratedPassword('');
    setActionState({ submitting: false, error: '', success: '' });
    setModalState({ open: true, mode: 'edit', memberId: member.id });
  };

  const closeModal = () => {
    setModalState((current) => ({ ...current, open: false }));
  };

  const handleFormChange = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: field === 'roleIds' ? Array.from(new Set(value)) : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setActionState({ submitting: true, error: '', success: '' });
    setGeneratedPassword('');

    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      status: form.status,
      roleIds: form.roleIds,
    };

    try {
      if (modalState.mode === 'create') {
        const response = await createMember(payload);
        setGeneratedPassword(response?.temporaryPassword || '');
        setActionState({
          submitting: false,
          error: '',
          success: 'Member created successfully.',
        });
      } else {
        await updateMember(modalState.memberId, payload);
        setActionState({
          submitting: false,
          error: '',
          success: 'Member updated successfully.',
        });
      }

      await loadMembers();
      setCurrentPage(1);
      closeModal();
    } catch (error) {
      setActionState({
        submitting: false,
        error: getApiErrorMessage(error, 'Unable to save member.'),
        success: '',
      });
    }
  };

  const handleDelete = async (member) => {
    setDeleteState({ member, submitting: false });
  };

  const handleConfirmDelete = async () => {
    if (!deleteState.member) {
      return;
    }

    const targetMember = deleteState.member;
    setDeleteState((current) => ({ ...current, submitting: true }));
    setActionState({ submitting: false, error: '', success: '' });
    setGeneratedPassword('');

    try {
      await deleteMember(targetMember.id);
      await loadMembers();
      setCurrentPage(1);
      setActionState({ submitting: false, error: '', success: `Deleted ${targetMember.email}.` });
      setDeleteState({ member: null, submitting: false });
    } catch (error) {
      setDeleteState({ member: null, submitting: false });
      setActionState({
        submitting: false,
        error: getApiErrorMessage(error, 'Unable to delete member.'),
        success: '',
      });
    }
  };

  const copyGeneratedPassword = async () => {
    if (!generatedPassword) {
      return;
    }

    try {
      await navigator.clipboard.writeText(generatedPassword);
      setActionState({ submitting: false, error: '', success: 'Provisioned password copied to clipboard.' });
    } catch {
      setActionState({ submitting: false, error: 'Unable to copy password to clipboard.', success: '' });
    }
  };

  const clearFilters = () => {
    setFilters({ query: '', roles: [] });
  };

  const hasActiveFilters = Boolean(filters.query.trim()) || filters.roles.length > 0;

  return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-semibold tracking-tight text-main dark:text-white">
                  Member Management
                </h1>
                <div className="rounded-full bg-slate-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700 dark:bg-neutral-800 dark:text-neutral-300">
                  {sortedMembers.length} members
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3 lg:items-end">
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={loadMembers}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                >
                  <Plus className="h-4 w-4" />
                  Add Member
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                {hasActiveFilters ? (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm whitespace-nowrap hover:bg-slate-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  >
                    Clear Filters
                  </button>
                ) : null}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={filters.query}
                    onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
                    placeholder="Search members..."
                    className="h-11 w-full min-w-[300px] rounded-lg border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white dark:placeholder:text-neutral-500 lg:w-80"
                  />
                </div>
                <div className="w-full min-w-[200px] lg:w-52">
                  <RoleFilterSelect
                    roles={rolesState.data}
                    selectedRoles={filters.roles}
                    onChange={(value) => setFilters((current) => ({ ...current, roles: Array.from(new Set(value)) }))}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

      {actionState.error ? (
        <Notice tone="error">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{actionState.error}</span>
          </div>
        </Notice>
      ) : null}

      {actionState.success ? (
        <Notice tone="success">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{actionState.success}</span>
          </div>
        </Notice>
      ) : null}

      {generatedPassword ? (
        <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-500/20 dark:bg-emerald-500/10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
                Provisioned Password
              </p>
              <p className="mt-2 text-sm leading-6 text-emerald-800 dark:text-emerald-200">
                The backend assigned this password during member creation. Share it with the user if required.
              </p>
              <code className="mt-3 inline-flex rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-950 dark:bg-neutral-950 dark:text-white">
                {generatedPassword}
              </code>
            </div>
            <button
              type="button"
              onClick={copyGeneratedPassword}
              className="inline-flex items-center gap-2 rounded-full border border-emerald-300 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/30 dark:text-emerald-300 dark:hover:bg-emerald-500/10"
            >
              <Copy className="h-4 w-4" />
              Copy Password
            </button>
          </div>
        </div>
      ) : null}

      <div>
        <div className="bg-white dark:bg-neutral-900">
          <div className="mt-6">
            {membersState.loading ? <LoadingBlock label="Loading members..." /> : null}
            {!membersState.loading && membersState.error ? (
              <Notice tone="error">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{membersState.error}</span>
                </div>
              </Notice>
            ) : null}
            {!membersState.loading && !membersState.error && !sortedMembers.length ? (
              <EmptyBlock message="No tenant members are available yet." />
            ) : null}
            {!membersState.loading && !membersState.error && sortedMembers.length ? (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-slate-200 bg-white font-medium text-sub dark:border-neutral-800 dark:bg-neutral-900/50 dark:text-neutral-400">
                      <tr>
                        <th className="px-6 py-3 font-medium">Name</th>
                        <th className="px-6 py-3 font-medium">Email</th>
                        <th className="px-6 py-3 font-medium">Status</th>
                        <th className="px-6 py-3 font-medium">Roles</th>
                        <th className="px-6 py-3 font-medium text-right"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
                      {paginatedMembers.map((member) => (
                        <tr key={member.id} className="bg-white dark:bg-neutral-900">
                          <td className="px-6 py-4 align-top">
                            <p className="font-semibold text-main dark:text-white">
                              {member.firstName} {member.lastName}
                            </p>
                          </td>
                          <td className="px-6 py-4 align-top">
                            <p className="text-main dark:text-neutral-200">{member.email}</p>
                          </td>
                          <td className="px-6 py-4 align-top">
                            <StatusBadge value={member.status} />
                          </td>
                          <td className="px-6 py-4 align-top">
                            <div className="flex flex-wrap gap-2">
                              {(member.roles || []).map((roleName) => (
                                <span
                                  key={roleName}
                                  className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:bg-neutral-800 dark:text-neutral-300"
                                >
                                  {roleName}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td
                            className="px-6 py-4 text-right align-top"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <div className="relative group/menu inline-block">
                              <button
                                type="button"
                                className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </button>
                              <div className="absolute right-0 top-full z-10 mt-1 w-40 origin-top-right overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl opacity-0 invisible transition-all group-hover/menu:visible group-hover/menu:opacity-100 dark:border-neutral-800 dark:bg-neutral-900">
                                <button
                                  type="button"
                                  onClick={() => openEditModal(member)}
                                  className="inline-flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 dark:text-neutral-300 dark:hover:bg-neutral-800"
                                >
                                  <Pencil className="h-3.5 w-3.5 shrink-0" />
                                  Edit Member
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(member)}
                                  className="inline-flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10"
                                >
                                  <Trash2 className="h-3.5 w-3.5 shrink-0" />
                                  Delete Member
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between gap-4 border-t border-slate-200 bg-white px-6 py-4 text-xs text-slate-500 dark:border-neutral-800 dark:bg-neutral-900/30 dark:text-neutral-400">
                  <div className="flex items-center gap-4">
                    <span>
                      Showing {Math.min(startIndex + 1, sortedMembers.length)} to {Math.min(startIndex + itemsPerPage, sortedMembers.length)} of {sortedMembers.length} records
                    </span>
                    <div className="flex items-center gap-2 border-l border-slate-200 pl-4 dark:border-neutral-800">
                      <span>Rows:</span>
                      <div className="w-20">
                        <CustomSelect
                          value={itemsPerPage}
                          onChange={(value) => {
                            setItemsPerPage(Number(value));
                            setCurrentPage(1);
                          }}
                          options={[10, 25, 50, 100].map((size) => ({ value: size, label: size }))}
                          className="h-8 px-2 py-1"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                      disabled={currentPage === 1}
                      className="rounded border border-slate-200 bg-white p-1.5 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <div className="mx-2 flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                        <button
                          key={page}
                          type="button"
                          onClick={() => setCurrentPage(page)}
                          className={cn(
                            'flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium transition-all duration-200',
                            currentPage === page
                              ? 'bg-blue-600 text-white shadow-md dark:bg-blue-600 dark:text-white'
                              : 'text-slate-500 hover:bg-gray-100 hover:text-slate-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white',
                          )}
                        >
                          {page}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                      disabled={currentPage === totalPages}
                      className="rounded border border-slate-200 bg-white p-1.5 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {!rolesState.loading && rolesState.error ? (
            <div className="mt-4">
              <Notice tone="error">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{rolesState.error}</span>
                </div>
              </Notice>
            </div>
          ) : null}
        </div>
      </div>

      <MemberModal
        open={modalState.open}
        roles={rolesState.data}
        form={form}
        mode={modalState.mode}
        submitting={actionState.submitting}
        error={actionState.error}
        onChange={handleFormChange}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />
      <ConfirmDialog
        open={Boolean(deleteState.member)}
        title="Delete Member"
        message={
          deleteState.member
            ? `Delete ${deleteState.member.firstName} ${deleteState.member.lastName}? This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete Member"
        busy={deleteState.submitting}
        onCancel={() => setDeleteState({ member: null, submitting: false })}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};

export default MemberManagementPage;
