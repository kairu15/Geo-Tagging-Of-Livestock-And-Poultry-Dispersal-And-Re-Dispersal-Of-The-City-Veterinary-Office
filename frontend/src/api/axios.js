import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

// ---------------------------------------------------------------------------
// Global error helper — extracts a consistent, actionable error message
// from any API response shape (DRF standard, custom, network errors).
// ---------------------------------------------------------------------------
export function getApiErrorMessage(error) {
  if (!error) return 'An unknown error occurred.';

  // Network / timeout / offline
  if (!error.response) {
    if (error.code === 'ECONNABORTED') return 'Request timed out. Please try again.';
    if (error.message === 'Network Error' || !navigator.onLine) {
      return 'You appear to be offline. Check your internet connection and try again.';
    }
    return error.message || 'An unexpected error occurred.';
  }

  const { status, data } = error.response;

  // DRF-style errors
  if (data) {
    // Single error string: { "error": "..." } or { "detail": "..." }
    if (typeof data === 'string') return data;
    if (data.error) return data.error;
    if (data.detail) return data.detail;
    if (data.non_field_errors) {
      const msgs = Array.isArray(data.non_field_errors)
        ? data.non_field_errors
        : [data.non_field_errors];
      return msgs.join(' ');
    }
    // Field-level errors: { "field": ["error1", ...] }
    const fieldErrors = Object.entries(data)
      .filter(([key]) => key !== 'type')
      .flatMap(([, val]) => (Array.isArray(val) ? val : [String(val)]));
    if (fieldErrors.length > 0) return fieldErrors.join(' ');
  }

  // Status-based fallback
  switch (status) {
    case 400: return 'Bad request. Please check your input.';
    case 401: return 'Session expired. Please log in again.';
    case 403: return 'You do not have permission to perform this action.';
    case 404: return 'The requested resource was not found.';
    case 429: return 'Too many requests. Please wait a moment and try again.';
    case 500: return 'Server error. Please try again later.';
    default: return `Error ${status}: ${data?.message || 'Request failed'}`;
  }
}

// Request interceptor: attach JWT access token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ---------------------------------------------------------------------------
// Response interceptor with refresh queue
// On 401, only ONE refresh request fires at a time. All other 401'd requests
// wait for that refresh to complete, then retry with the new token.
// ---------------------------------------------------------------------------
let isRefreshing = false;
let failedQueue = [];

function processQueue(error, token) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only handle 401s that haven't been retried yet
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // If a refresh is already in progress, queue this request
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    const refreshToken = localStorage.getItem('refresh_token');

    if (!refreshToken) {
      isRefreshing = false;
      processQueue(error, null);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      return Promise.reject(error);
    }

    try {
      const res = await axios.post('/api/v1/auth/token/refresh/', {
        refresh: refreshToken,
      });

      const newAccess = res.data.access;
      const newRefresh = res.data.refresh;

      localStorage.setItem('access_token', newAccess);
      if (newRefresh) {
        localStorage.setItem('refresh_token', newRefresh);
      }

      isRefreshing = false;
      processQueue(null, newAccess);

      // Retry the original request with the new token
      originalRequest.headers.Authorization = `Bearer ${newAccess}`;
      return api(originalRequest);
    } catch (refreshError) {
      // Refresh failed — clear everything
      isRefreshing = false;
      processQueue(refreshError, null);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      return Promise.reject(refreshError);
    }
  }
);

export default api;

// ---------------------------------------------------------------------------
// Online/offline helpers for components
// ---------------------------------------------------------------------------
export function useNetworkStatus() {
  // Simple hook-free check — components can call navigator.onLine directly
  // This function exists for centralization if needed later.
  return {
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  };
}
