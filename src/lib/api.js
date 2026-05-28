import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

const multipartApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/v1',
  withCredentials: true,
});

const countriesNowApiClient = axios.create({
  baseURL: 'https://countriesnow.space/api/v0.1',
});

let activeAuthSession = null;

export const setApiAuthSession = (session) => {
  activeAuthSession = session && session.accessToken && session.refreshToken ? session : null;
};

export const authApi = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  refresh: (data = {}) => api.post('/auth/refresh', data),
  getMe: () => api.get('/auth/me'),
  getSession: () => api.get('/auth/session'),
  getLeadApiCredential: () => api.get('/auth/lead-api-credential'),
};

export const companyApi = {
  getAll: (params) => api.get('/companies', { params }),
  create: (data) => api.post('/companies', data),
  getById: (id) => api.get(`/companies/${id}`),
  update: (id, data) => api.patch(`/companies/${id}`, data),
  delete: (id) => api.delete(`/companies/${id}`),
  createDeal: (id, data) => api.post(`/companies/${id}/deals`, data),
  updateDeal: (id, dealId, data) => api.patch(`/companies/${id}/deals/${dealId}`, data),
  deleteDeal: (id, dealId) => api.delete(`/companies/${id}/deals/${dealId}`),
};

export const contactApi = {
  getAll: (params) => api.get('/contacts', { params }),
  getById: (id) => api.get(`/contacts/${id}`),
  create: (data) => api.post('/contacts', data),
  update: (id, data) => api.patch(`/contacts/${id}`, data),
  delete: (id) => api.delete(`/contacts/${id}`),
};

export const associateApi = {
  getAll: (params) => api.get('/associates', { params }),
  getById: (id) => api.get(`/associates/${id}`),
  getSummary: (id) => api.get(`/associates/${id}/summary`),
  getDeals: (id) => api.get(`/associates/${id}/deals`),
  getInteractions: (id) => api.get(`/associates/${id}/interactions`),
  create: (data) => api.post('/associates', data),
  update: (id, data) => api.patch(`/associates/${id}`, data),
  delete: (id) => api.delete(`/associates/${id}`),
};

export const leadApi = {
  getAll: (params) => api.get('/leads', { params }),
  getById: (id) => api.get(`/leads/${id}`),
  create: (data) => api.post('/leads', data),
  update: (id, data) => api.patch(`/leads/${id}`, data),
  updateStatus: (id, status) => api.patch(`/leads/${id}/status`, { status }),
  archive: (id) => api.patch(`/leads/${id}/archive`),
  delete: (id) => api.delete(`/leads/${id}`),
  listCompanies: (params) => api.get('/leads/options/companies', { params }),
  createCompany: (data) => api.post('/leads/options/companies', data),
  convertToContact: (id, data) => api.post(`/leads/${id}/convert/contact`, data),
  convertToDeal: (id, data) => api.post(`/leads/${id}/convert/deal`, data),
};

export const dealApi = {
  getAll: (params) => api.get('/deals', { params }),
  getById: (id) => api.get(`/deals/${id}`),
  getWorkOrder: (id) => api.get(`/deals/${id}/work-order`),
  create: (data) => api.post('/deals', data),
  update: (id, data) => api.patch(`/deals/${id}`, data),
  delete: (id) => api.delete(`/deals/${id}`),
};

export const financeOpsApi = {
  getDashboardKpis: (params) => api.get('/finance-ops/dashboard/kpis', { params }),
  listClients: (params) => api.get('/finance-ops/clients', { params }),
  getItemTypes: () => api.get('/finance-ops/options/item-types'),
  getClientDetails: (id, params) => api.get(`/finance-ops/clients/${id}`, { params }),
  updateClient: (id, data) => api.patch(`/finance-ops/clients/${id}`, data),
  deleteClient: (id) => api.delete(`/finance-ops/clients/${id}`),
  getOrderFormOptions: (params) => api.get('/finance-ops/clients/options/order-form', { params }),
  listAllWorkOrders: (params) => api.get('/finance-ops/work-orders', { params }),
  listCollectionProjection: (params) => api.get('/finance-ops/collection-projection', { params }),
  listAllInvoices: (params) => api.get('/finance-ops/invoices', { params }),
  createWorkOrder: (clientId, data) => api.post(`/finance-ops/clients/${clientId}/work-orders`, data),
  getWorkOrder: (id) => api.get(`/finance-ops/work-orders/${id}`),
  updateWorkOrder: (id, data) => api.patch(`/finance-ops/work-orders/${id}`, data),
  deleteWorkOrder: (id) => api.delete(`/finance-ops/work-orders/${id}`),
  listItems: (workOrderId, params) => api.get(`/finance-ops/work-orders/${workOrderId}/items`, { params }),
  createItem: (workOrderId, data) => api.post(`/finance-ops/work-orders/${workOrderId}/items`, data),
  updateItem: (workOrderId, itemId, data) => api.patch(`/finance-ops/work-orders/${workOrderId}/items/${itemId}`, data),
  deleteItem: (workOrderId, itemId) => api.delete(`/finance-ops/work-orders/${workOrderId}/items/${itemId}`),
  listSchedules: (workOrderId, params) => api.get(`/finance-ops/work-orders/${workOrderId}/schedules`, { params }),
  getScheduleItemOptions: (workOrderId) => api.get(`/finance-ops/work-orders/${workOrderId}/schedule-item-options`),
  autoGenerateSchedules: (workOrderId, data) => api.post(`/finance-ops/work-orders/${workOrderId}/schedules/auto-generate`, data),
  createSchedule: (workOrderId, data) => api.post(`/finance-ops/work-orders/${workOrderId}/schedules`, data),
  updateSchedule: (workOrderId, scheduleId, data) => api.patch(`/finance-ops/work-orders/${workOrderId}/schedules/${scheduleId}`, data),
  deleteSchedule: (workOrderId, scheduleId) => api.delete(`/finance-ops/work-orders/${workOrderId}/schedules/${scheduleId}`),
  listInvoices: (workOrderId, params) => api.get(`/finance-ops/work-orders/${workOrderId}/invoices`, { params }),
  createInvoice: (workOrderId, data) => api.post(`/finance-ops/work-orders/${workOrderId}/invoices`, data),
  updateInvoice: (workOrderId, invoiceId, data) => api.patch(`/finance-ops/work-orders/${workOrderId}/invoices/${invoiceId}`, data),
  deleteInvoice: (workOrderId, invoiceId) => api.delete(`/finance-ops/work-orders/${workOrderId}/invoices/${invoiceId}`),
  getInvoice: (id) => api.get(`/finance-ops/invoices/detail/${id}`),
  getInvoiceOptions: () => api.get('/finance-ops/options/invoice'),
  createHsnSacCode: (data) => api.post('/finance-ops/options/invoice/hsn-sac', data),
  listReceipts: (workOrderId, params) => api.get(`/finance-ops/work-orders/${workOrderId}/receipts`, { params }),
  listAllReceipts: (params) => api.get('/finance-ops/receipts', { params }),
  createReceipt: (workOrderId, data) => api.post(`/finance-ops/work-orders/${workOrderId}/receipts`, data),
  updateReceipt: (workOrderId, receiptId, data) => api.patch(`/finance-ops/work-orders/${workOrderId}/receipts/${receiptId}`, data),
  deleteReceipt: (workOrderId, receiptId) => api.delete(`/finance-ops/work-orders/${workOrderId}/receipts/${receiptId}`),
};

export const tenantApi = {
  getById: (() => {
    const inFlight = new Map();
    return (id) => {
      if (!id) {
        return Promise.reject(new Error('Tenant id is required'));
      }
      const key = String(id);
      if (inFlight.has(key)) {
        return inFlight.get(key);
      }
      const request = api.get(`/tenants/${key}`).finally(() => {
        inFlight.delete(key);
      });
      inFlight.set(key, request);
      return request;
    };
  })(),
  updateProfile: (id, data) => api.patch(`/tenants/${id}/profile`, data),
};

export const fileApi = {
  upload: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return multipartApi.post('/files/upload', formData);
  },
  uploadTenantLogo: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3000/v1').replace(/\/+$/, '');
    const response = await fetch(`${baseUrl}/files/upload/tenant-logo`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data?.message || 'Logo upload failed');
      error.response = { status: response.status, data };
      throw error;
    }
    return { data };
  },
};

export const countriesNowApi = {
  getCountries: () => countriesNowApiClient.get('/countries'),
  getCitiesInState: (country, state) =>
    countriesNowApiClient.post('/countries/state/cities', { country, state }),
};

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

api.interceptors.request.use((config) => {
  if (!config.headers) {
    config.headers = {};
  }

  if (activeAuthSession?.accessToken) {
    config.headers.Authorization = `Bearer ${activeAuthSession.accessToken}`;
  } else {
    delete config.headers.Authorization;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    const is401 = error.response?.status === 401;
    const is403 = error.response?.status === 403;
    const isRetry = originalRequest?._retry;
    const isAuthRoute = originalRequest?.url?.includes('/auth/login') ||
      originalRequest?.url?.includes('/auth/register') ||
      originalRequest?.url?.includes('/auth/refresh');

    if ((is401 || is403) && !isRetry && !isAuthRoute) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => api(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await authApi.refresh(activeAuthSession?.refreshToken ? { refreshToken: activeAuthSession.refreshToken } : {});
        const refreshData = response.data;

        if (refreshData.accessToken && refreshData.refreshToken) {
          setApiAuthSession({
            accessToken: refreshData.accessToken,
            refreshToken: refreshData.refreshToken,
          });
        }

        if (refreshData.user) {
          window.dispatchEvent(
            new CustomEvent('auth:refreshed', {
              detail: refreshData
            })
          );
        }

        processQueue(null);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);

        if (refreshError.response?.status === 401 || refreshError.response?.status === 403) {
          window.dispatchEvent(new CustomEvent('auth:logout'));
        }

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
