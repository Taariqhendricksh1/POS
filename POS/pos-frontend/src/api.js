import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

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
  addItem: (orderId, barcode) => api.post(`/orders/${orderId}/items`, { barcode }),
  updateItemQty: (orderId, productId, quantity) =>
    api.put(`/orders/${orderId}/items/${productId}`, { quantity }),
  removeItem: (orderId, productId) => api.delete(`/orders/${orderId}/items/${productId}`),
  complete: (orderId, paymentMethod) =>
    api.post(`/orders/${orderId}/complete`, { paymentMethod }),
  cancel: (orderId) => api.post(`/orders/${orderId}/cancel`),
  delete: (orderId) => api.delete(`/orders/${orderId}`),
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
