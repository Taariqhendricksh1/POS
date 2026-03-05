import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// JWT interceptor — attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('pos_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — redirect to login on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('pos_token');
      localStorage.removeItem('pos_user');
      // Only redirect if not already on login
      if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/reset-password')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
  changePassword: (currentPassword, newPassword) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),
  requestReset: (email) => api.post('/auth/request-reset', { email }),
  resetPassword: (token, newPassword) => api.post('/auth/reset-password', { token, newPassword }),
  // Admin user management
  getUsers: () => api.get('/auth/users'),
  createUser: (email, name, password, role) =>
    api.post('/auth/users', { email, name, password, role }),
  deleteUser: (id) => api.delete(`/auth/users/${id}`),
  toggleUser: (id) => api.patch(`/auth/users/${id}/toggle`),
};

// Products API
export const productApi = {
  getAll: (shop) => api.get('/products', { params: shop ? { shop } : {} }),
  getActive: (shop) => api.get('/products/active', { params: shop ? { shop } : {} }),
  getById: (id) => api.get(`/products/${id}`),
  getByBarcode: (barcode) => api.get(`/products/barcode/${barcode}`),
  search: (query, shop) => api.get(`/products/search/${query}`, { params: shop ? { shop } : {} }),
  getLowStock: (shop) => api.get('/products/low-stock', { params: shop ? { shop } : {} }),
  getDashboard: (shop) => api.get('/products/dashboard', { params: shop ? { shop } : {} }),
  getShops: () => api.get('/products/shops'),
  create: (product) => api.post('/products', product),
  update: (id, product) => api.put(`/products/${id}`, product),
  updateStock: (id, quantityChange) => api.patch(`/products/${id}/stock`, { quantityChange }),
  deactivate: (id) => api.patch(`/products/${id}/deactivate`),
  activate: (id) => api.patch(`/products/${id}/activate`),
  delete: (id) => api.delete(`/products/${id}`),
};

// Orders API
export const orderApi = {
  create: (clientEmail, clientName, customerId, clientPhone) =>
    api.post('/orders', { clientEmail, clientName, customerId, clientPhone }),
  getById: (id) => api.get(`/orders/${id}`),
  getByInvoice: (invoiceNumber) => api.get(`/orders/invoice/${invoiceNumber}`),
  getRecent: (limit = 50) => api.get(`/orders/recent?limit=${limit}`),
  getSalesSummary: (from, to, shop) => api.get('/orders/sales-summary', { params: { from, to, ...(shop ? { shop } : {}) } }),
  addItem: (orderId, barcode) => api.post(`/orders/${orderId}/items`, { barcode }),
  updateItemQty: (orderId, productId, quantity) =>
    api.put(`/orders/${orderId}/items/${productId}`, { quantity }),
  updateItemDiscount: (orderId, productId, discountPercentage) =>
    api.patch(`/orders/${orderId}/items/${productId}/discount`, { discountPercentage }),
  removeItem: (orderId, productId) => api.delete(`/orders/${orderId}/items/${productId}`),
  complete: (orderId, paymentMethod) =>
    api.post(`/orders/${orderId}/complete`, { paymentMethod }),
  resendEmail: (orderId) => api.post(`/orders/${orderId}/resend-email`),
  markEftPaymentReceived: (orderId) => api.post(`/orders/${orderId}/eft-payment-received`),
  sendPaymentReminder: (orderId) => api.post(`/orders/${orderId}/send-payment-reminder`),
  cancel: (orderId) => api.post(`/orders/${orderId}/cancel`),
  delete: (orderId) => api.delete(`/orders/${orderId}`),
};

// Settings API
export const settingsApi = {
  get: () => api.get('/settings'),
  update: (settings) => api.put('/settings', settings),
  getShops: () => api.get('/settings/shops'),
};

// Stock Transfer API
export const stockTransferApi = {
  create: (recipientCompany, recipientContact, recipientPhone, recipientEmail, notes) =>
    api.post('/stock-transfers', { recipientCompany, recipientContact, recipientPhone, recipientEmail, notes }),
  getById: (id) => api.get(`/stock-transfers/${id}`),
  getRecent: (limit = 50) => api.get(`/stock-transfers/recent?limit=${limit}`),
  addItem: (transferId, barcode) => api.post(`/stock-transfers/${transferId}/items`, { barcode }),
  updateItemQty: (transferId, productId, quantity) =>
    api.put(`/stock-transfers/${transferId}/items/${productId}`, { quantity }),
  removeItem: (transferId, productId) => api.delete(`/stock-transfers/${transferId}/items/${productId}`),
  complete: (transferId) => api.post(`/stock-transfers/${transferId}/complete`),
  cancel: (transferId) => api.post(`/stock-transfers/${transferId}/cancel`),
  delete: (transferId) => api.delete(`/stock-transfers/${transferId}`),
  getSummary: (from, to) => api.get('/stock-transfers/summary', { params: { from, to } }),
};

// Customers API
export const customerApi = {
  getAll: () => api.get('/customers'),
  getById: (id) => api.get(`/customers/${id}`),
  getByEmail: (email) => api.get(`/customers/email/${email}`),
  search: (query) => api.get(`/customers/search/${query}`),
  create: (customer) => api.post('/customers', customer),
  update: (id, customer) => api.put(`/customers/${id}`, customer),
  deactivate: (id) => api.patch(`/customers/${id}/deactivate`),
  delete: (id) => api.delete(`/customers/${id}`),
};

export default api;
