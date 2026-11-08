const API_BASE = '/minibar-os/api';

export async function apiRequest(path, options = {}) {
  const endpoint = String(path || '').replace(/^\\/+/, '');
  const headers = new Headers(options.headers || {});
  headers.set('Accept', 'application/json');
  headers.set('X-Timezone-Offset', String(new Date().getTimezoneOffset()));
  let body = options.body;
  if (body != null && !(body instanceof FormData) && typeof body !== 'string' && !(body instanceof Blob)) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(body);
  }
  const response = await fetch(API_BASE + '/' + endpoint, { ...options, headers, body, cache: options.cache || 'no-store' });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(data?.error || 'Ошибка запроса (' + response.status + ')');
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}
export const api = {
  get: (path, options = {}) => apiRequest(path, { ...options, method: 'GET' }),
  post: (path, body, options = {}) => apiRequest(path, { ...options, method: 'POST', body }),
  patch: (path, body, options = {}) => apiRequest(path, { ...options, method: 'PATCH', body }),
  put: (path, body, options = {}) => apiRequest(path, { ...options, method: 'PUT', body }),
  delete: (path, options = {}) => apiRequest(path, { ...options, method: 'DELETE' })
};
export { API_BASE };
