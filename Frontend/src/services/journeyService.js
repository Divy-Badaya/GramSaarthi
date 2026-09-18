/**
 * GRAMSAARTHI — Journey Service
 * Frontend API client for resetting or deleting the active business journey.
 */

import { apiFetch, isApiEnabled } from './api.js';

/**
 * Delete the active business journey for the authenticated user.
 * Calls DELETE /api/journey/me
 */
export async function deleteCurrentJourney() {
  if (!isApiEnabled) return { status: 'success' };
  return apiFetch('/api/journey/me', {
    method: 'DELETE',
  });
}
