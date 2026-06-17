const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:3000/api'
  : '/api';

async function apiRequest(path, options = {}) {
  const headers = {
    'X-Timezone-Offset': String(new Date().getTimezoneOffset()),
    ...(options.headers || {})
  };
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

const api = {
  async getDeadlineTargets() {
    return apiRequest(`/deadlines/targets?_t=${Date.now()}`, {
      cache: 'no-store'
    });
  },
  async getDeadlineStats() {
    return apiRequest(`/deadlines/stats?_t=${Date.now()}`, {
      cache: 'no-store'
    });
  },
  async getRoomProductStatuses(roomId) {
    return apiRequest(`/rooms/${roomId}/product-statuses`);
  },
  async saveRoomProductStatuses(roomId, items, roomStatus) {
    return apiRequest(`/rooms/${roomId}/product-statuses`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, roomStatus })
    });
  },
  async clearRoomProductStatuses(roomId, roomStatus) {
    return apiRequest(`/rooms/${roomId}/product-statuses`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomStatus })
    });
  },
  async resetAllDeadlines() {
    return apiRequest('/rooms/reset-all-deadlines', { method: 'POST' });
  },
  async getRooms(filters = {}) {
    const params = new URLSearchParams(filters);
    const query = params.toString();
    return apiRequest(`/rooms${query ? `?${query}` : ''}`);
  },
  async updateRoomStatus(roomId, status) {
    return apiRequest(`/rooms/${roomId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expiryStatus: status })
    });
  },
  async getProducts() {
    return apiRequest('/products');
  },
  async createProduct(data) {
    return apiRequest('/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },
  async updateProduct(id, data) {
    return apiRequest(`/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },
  async deleteProduct(id) {
    return apiRequest(`/products/${id}`, { method: 'DELETE' });
  },
  async getTemplates() {
    return apiRequest('/templates');
  },
  async updateTemplateItems(templateId, items) {
    return apiRequest(`/templates/${templateId}/items`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items })
    });
  },
  async getChecks(limit = 50) {
    return apiRequest(`/checks?limit=${limit}`);
  },
  async getExcises() {
    return apiRequest('/excises');
  },
  async createExcise(markNumber) {
    return apiRequest('/excises', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mark_number: markNumber })
    });
  },
  async deleteExcise(id) {
    return apiRequest(`/excises/${id}`, { method: 'DELETE' });
  },
  async deleteAllExcises() {
    return apiRequest('/excises', { method: 'DELETE' });
  },
  async getLists() {
    return apiRequest('/lists');
  },
  async getMonthProducts() {
    return apiRequest(`/deadlines/month-products?_t=${Date.now()}`, {
      cache: 'no-store'
    });
  },
  async getMonthProductsManage() {
    return apiRequest(`/deadlines/month-products/manage?_t=${Date.now()}`, {
      cache: 'no-store'
    });
  },
  async setMonthProduct(productId, period, checkId = null) {
    return apiRequest(`/deadlines/month-products/${productId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ period, checkId })
    });
  },
  async deleteMonthCheck(checkId) {
    return apiRequest(`/deadlines/month-products/check/${checkId}`, { method: 'DELETE' });
  },
  async deleteMonthProduct(productId) {
    return apiRequest(`/deadlines/month-products/${productId}`, { method: 'DELETE' });
  },
  async getReplacementSummary() {
    return apiRequest(`/deadlines/replacement-summary?_t=${Date.now()}`, {
      cache: 'no-store'
    });
  }
};

window.api = api;
window.API_BASE = API_BASE;

document.addEventListener('DOMContentLoaded', () => {
  if (window.App) {
    window.App.api = api;
  }
});