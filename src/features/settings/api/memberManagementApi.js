import api from '@/lib/api';

export const listMembers = async () => {
  const response = await api.get('/users');
  return response.data;
};

export const createMember = async (payload) => {
  const response = await api.post('/users', payload);
  return response.data;
};

export const updateMember = async (memberId, payload) => {
  const response = await api.patch(`/users/${memberId}`, payload);
  return response.data;
};

export const deleteMember = async (memberId) => {
  const response = await api.delete(`/users/${memberId}`);
  return response.data;
};
