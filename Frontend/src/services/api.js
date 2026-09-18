/**
 * GRAMSAARTHI API Configuration
 *
 * Connects React frontend to FastAPI backend.
 * Automatically attaches JWT Authorization Bearer token from localStorage.
 *
 * In development: /api/* is proxied to http://localhost:8001 via vite.config.js
 * In production: set VITE_API_URL to your backend origin.
 */

export const BASE_URL = import.meta.env.VITE_API_URL || '';
export const isApiEnabled = true;

/**
 * Generic fetch wrapper for API calls.
 * Automatically adds Authorization header if token exists.
 * Throws structured error containing the backend error detail message.
 */
export async function apiFetch(endpoint, options = {}) {
  if (!isApiEnabled) {
    console.warn('[GRAMSAARTHI] API not configured. Set VITE_API_URL to enable.');
    return null;
  }

  const token = localStorage.getItem('gramsaarthi_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    if (res.status === 401) {
      try {
        localStorage.removeItem('gramsaarthi_token');
        window.dispatchEvent(new CustomEvent('gramsaarthi_session_expired'));
      } catch {
        // ignore in non-browser env
      }
    }
    let errorDetail = `API error: ${res.status}`;
    try {
      const errData = await res.json();
      if (errData?.detail) {
        errorDetail = typeof errData.detail === 'string' ? errData.detail : JSON.stringify(errData.detail);
      }
    } catch {
      // ignore json parse error
    }
    const err = new Error(errorDetail);
    err.status = res.status;
    throw err;
  }

  return res.json();
}
