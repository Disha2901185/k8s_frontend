import api from '@/lib/api';

export const getPermissionCatalog = async () => {
  const response = await api.get('/access-control/permissions/catalog');
  return response.data;
};

export const getModules = async () => {
  const response = await api.get('/access-control/modules');
  return response.data;
};

export const getNavigation = async () => {
  const response = await api.get('/access-control/navigation');
  return response.data;
};

export const getRoles = async () => {
  const response = await api.get('/access-control/roles');
  return response.data;
};

export const createRole = async (payload) => {
  const response = await api.post('/access-control/roles', payload);
  return response.data;
};

export const updateRole = async (roleId, payload) => {
  const response = await api.patch(`/access-control/roles/${roleId}`, payload);
  return response.data;
};

export const assignUserRoles = async (userId, payload) => {
  const response = await api.post(`/access-control/users/${userId}/roles`, payload);
  return response.data;
};

export const getUserPageAccess = async (userId) => {
  const response = await api.get(`/access-control/users/${userId}/page-access`);
  return response.data;
};

export const updateUserPageAccess = async (userId, payload) => {
  const response = await api.patch(`/access-control/users/${userId}/page-access`, payload);
  return response.data;
};

export const getAccessAudit = async (params = {}) => {
  const response = await api.get('/access-control/audit', { params });
  return response.data;
};

export const getUsers = async () => {
  const response = await api.get('/users');
  return response.data;
};

export const getApiErrorMessage = (error, fallbackMessage = 'Something went wrong.') => {
  const payload = error?.response?.data;
  const status = error?.response?.status;

  if (Array.isArray(payload?.message)) {
    return payload.message.join(', ');
  }

  if (typeof payload?.message === 'string' && payload.message.trim()) {
    return payload.message;
  }

  if (typeof payload?.error === 'string' && payload.error.trim()) {
    return payload.error;
  }

  if (status === 403) {
    return 'You do not have permission to perform this action.';
  }

  if (status === 401) {
    return 'Your session has expired. Please sign in again.';
  }

  if (typeof error?.message === 'string' && error.message.trim()) {
    return error.message;
  }

  return fallbackMessage;
};
