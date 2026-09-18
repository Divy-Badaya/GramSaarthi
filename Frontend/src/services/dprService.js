/**
 * GRAMSAARTHI — DPR (Detailed Project Report) Service
 * Frontend API client for DPR pre-flight checks, generation,
 * regeneration, section updates, and PDF download.
 */

import { apiFetch, BASE_URL, isApiEnabled } from './api.js';

/**
 * Check if the current user has completed Business, Assessment, and Finance prerequisites.
 * Also returns staleness status if Finance has changed since the DPR was created.
 */
export async function getDprStatus() {
  if (!isApiEnabled) return null;
  try {
    return await apiFetch('/api/dpr/status');
  } catch (err) {
    console.warn('[DPR] Could not fetch DPR status:', err);
    return null;
  }
}

/**
 * Retrieve the current authenticated user's generated DPR.
 * Returns null if no DPR exists yet (404).
 */
export async function getMyDpr() {
  if (!isApiEnabled) return null;
  try {
    return await apiFetch('/api/dpr/me');
  } catch (err) {
    if (err.status === 404) {
      return null;
    }
    console.warn('[DPR] Could not fetch DPR:', err);
    return null;
  }
}

/**
 * Request generation or regeneration of the DPR.
 * @param {string} language - 'English' | 'Hindi' | 'Gujarati'
 * @param {object|null} sectionCustomizations - optional promoter overrides/notes
 */
export async function generateDpr(language = 'English', sectionCustomizations = null) {
  if (!isApiEnabled) return null;
  return apiFetch('/api/dpr/generate', {
    method: 'POST',
    body: JSON.stringify({
      language,
      section_customizations: sectionCustomizations,
    }),
  });
}

/**
 * Update section notes or status on existing DPR.
 * @param {object} updates - { section_notes?: object, status?: string }
 */
export async function updateDpr(updates) {
  if (!isApiEnabled) return null;
  return apiFetch('/api/dpr/me', {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

/**
 * Delete the user's DPR.
 */
export async function deleteDpr() {
  if (!isApiEnabled) return null;
  return apiFetch('/api/dpr/me', {
    method: 'DELETE',
  });
}

/**
 * Download the DPR as a PDF from the backend ReportLab service.
 */
export async function downloadDprPdf(businessName = 'Rural_Enterprise') {
  const token = localStorage.getItem('gramsaarthi_token');
  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(`${BASE_URL}/api/dpr/download`, {
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
  const safeName = (businessName || 'DPR').replace(/[^a-zA-Z0-9_-]/g, '_');
  a.download = `GramSaarthi_DPR_${safeName}.pdf`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
