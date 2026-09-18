/**
 * GRAMSAARTHI — Document Service
 * Frontend API client for document dashboard, secure upload,
 * replace, download, preview, and metadata updates.
 */

import { apiFetch, BASE_URL, isApiEnabled } from './api.js';

/**
 * Fetch documents for current user with optional filters.
 * @param {object} filters - { category?: string, status?: string, search?: string }
 * @returns {Promise<Array>}
 */
export async function getDocuments(filters = {}) {
  if (!isApiEnabled) return [];
  const params = new URLSearchParams();
  if (filters.category && filters.category !== 'All') params.append('category', filters.category);
  if (filters.status && filters.status !== 'All') params.append('status', filters.status);
  if (filters.search && filters.search.trim()) params.append('search', filters.search.trim());

  const qs = params.toString() ? `?${params.toString()}` : '';
  try {
    return await apiFetch(`/api/documents${qs}`);
  } catch (err) {
    console.warn('[DOCUMENTS] Could not fetch documents:', err);
    throw err;
  }
}

/**
 * Fetch document counts summary (total, uploaded, missing, etc.).
 * @returns {Promise<object>}
 */
export async function getDocumentSummary() {
  if (!isApiEnabled) return null;
  try {
    return await apiFetch('/api/documents/summary');
  } catch (err) {
    console.warn('[DOCUMENTS] Could not fetch document summary:', err);
    return null;
  }
}

/**
 * Upload a new document file with title and category.
 * @param {object} param0 - { file: File, title: string, category: string, remarks?: string }
 * @returns {Promise<object>}
 */
export async function uploadDocument({ file, title, category = 'Other', remarks = '' }) {
  if (!isApiEnabled) return null;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('title', title);
  formData.append('category', category);
  if (remarks) formData.append('remarks', remarks);

  const token = localStorage.getItem('gramsaarthi_token');
  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(`${BASE_URL}/api/documents/upload`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({}));
    throw new Error(errJson.detail || `Upload failed: HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Replace the physical file of an existing document.
 * @param {number} docId
 * @param {File} file
 * @returns {Promise<object>}
 */
export async function replaceDocument(docId, file) {
  if (!isApiEnabled) return null;

  const formData = new FormData();
  formData.append('file', file);

  const token = localStorage.getItem('gramsaarthi_token');
  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(`${BASE_URL}/api/documents/${docId}/upload`, {
    method: 'PUT',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({}));
    throw new Error(errJson.detail || `Replacement failed: HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Update document metadata (title, category, remarks, status).
 * @param {number} docId
 * @param {object} updates
 * @returns {Promise<object>}
 */
export async function updateDocument(docId, updates) {
  if (!isApiEnabled) return null;
  return apiFetch(`/api/documents/${docId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

/**
 * Permanently delete a document and its stored file.
 * @param {number} docId
 * @returns {Promise<object>}
 */
export async function deleteDocument(docId) {
  if (!isApiEnabled) return null;
  return apiFetch(`/api/documents/${docId}`, {
    method: 'DELETE',
  });
}

/**
 * Securely download a document using authenticated streaming endpoint.
 * @param {number} docId
 * @param {string} fallbackFilename
 */
export async function downloadDocument(docId, fallbackFilename = 'document.pdf') {
  const token = localStorage.getItem('gramsaarthi_token');
  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(`${BASE_URL}/api/documents/${docId}/download`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({}));
    throw new Error(errJson.detail || `Download failed: HTTP ${response.status}`);
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fallbackFilename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

/**
 * Fetch document blob for in-browser authenticated preview.
 * @param {number} docId
 * @returns {Promise<{ url: string, contentType: string, revoke: Function }>}
 */
export async function getDocumentPreview(docId) {
  const token = localStorage.getItem('gramsaarthi_token');
  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(`${BASE_URL}/api/documents/${docId}/preview`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({}));
    throw new Error(errJson.detail || `Preview failed: HTTP ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || 'application/pdf';
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);

  return {
    url,
    contentType,
    revoke: () => window.URL.revokeObjectURL(url),
  };
}

/**
 * Initialize standard required checklist items for user.
 * @returns {Promise<Array>}
 */
export async function initializeChecklist() {
  if (!isApiEnabled) return [];
  return apiFetch('/api/documents/initialize-checklist', {
    method: 'POST',
  });
}

/**
 * Fetch dynamic smart document checklist connecting user assessment, loan, scheme, DPR & uploads.
 * @param {string|null} schemeId - Optional specific scheme to evaluate requirements for
 * @returns {Promise<object>}
 */
export async function getSmartChecklist(schemeId = null) {
  if (!isApiEnabled) return null;
  const qs = schemeId ? `?scheme_id=${encodeURIComponent(schemeId)}` : '';
  try {
    return await apiFetch(`/api/documents/checklist${qs}`);
  } catch (err) {
    console.warn('[DOCUMENTS] Could not fetch smart checklist:', err);
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GRAMSAARTHI Owner/Admin Manual Document Verification APIs
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch document verification statistics for the admin dashboard.
 * @returns {Promise<{ total_submitted: number, pending_review: number, verified: number, rejected: number, reupload_required: number }>}
 */
export async function adminGetDocumentStats() {
  if (!isApiEnabled) return null;
  return apiFetch('/api/admin/documents/stats');
}

/**
 * Fetch documents across all users for manual admin review.
 * @param {object} params - { status?: string, category?: string, search?: string, skip?: number, limit?: number }
 * @returns {Promise<Array>}
 */
export async function adminGetDocuments(params = {}) {
  if (!isApiEnabled) return [];
  const searchParams = new URLSearchParams();
  if (params.status && params.status !== 'All') searchParams.append('status', params.status);
  if (params.category && params.category !== 'All') searchParams.append('category', params.category);
  if (params.search && params.search.trim()) searchParams.append('search', params.search.trim());
  if (typeof params.skip === 'number') searchParams.append('skip', String(params.skip));
  if (typeof params.limit === 'number') searchParams.append('limit', String(params.limit));

  const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';
  return apiFetch(`/api/admin/documents${qs}`);
}

/**
 * Fetch detailed document information and system validation checks for admin review.
 * @param {number} docId
 * @returns {Promise<object>}
 */
export async function adminGetDocumentDetails(docId) {
  if (!isApiEnabled) return null;
  return apiFetch(`/api/admin/documents/${docId}`);
}

/**
 * Submit manual verification decision (VERIFIED, REJECTED, REUPLOAD_REQUIRED) with remark.
 * @param {number} docId
 * @param {{ decision: 'VERIFIED'|'REJECTED'|'REUPLOAD_REQUIRED', remark: string }} payload
 * @returns {Promise<object>}
 */
export async function adminVerifyDocument(docId, payload) {
  if (!isApiEnabled) return null;
  return apiFetch(`/api/admin/documents/${docId}/verify`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Fetch secure admin preview blob URL for a document.
 * @param {number} docId
 * @returns {Promise<{ url: string, contentType: string, revoke: Function }>}
 */
export async function adminGetDocumentPreview(docId) {
  const token = localStorage.getItem('gramsaarthi_token');
  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(`${BASE_URL}/api/admin/documents/${docId}/preview`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({}));
    throw new Error(errJson.detail || `Preview failed: HTTP ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || 'application/pdf';
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);

  return {
    url,
    contentType,
    revoke: () => window.URL.revokeObjectURL(url),
  };
}

/**
 * Download a document file as an admin.
 * @param {number} docId
 * @param {string} fallbackFilename
 */
export async function adminDownloadDocument(docId, fallbackFilename = 'document.pdf') {
  const token = localStorage.getItem('gramsaarthi_token');
  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(`${BASE_URL}/api/admin/documents/${docId}/download`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({}));
    throw new Error(errJson.detail || `Download failed: HTTP ${response.status}`);
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fallbackFilename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

/**
 * Fetch immutable audit trail of verification actions for a document.
 * @param {number} docId
 * @returns {Promise<Array>}
 */
export async function adminGetVerificationHistory(docId) {
  if (!isApiEnabled) return [];
  return apiFetch(`/api/admin/documents/${docId}/history`);
}



