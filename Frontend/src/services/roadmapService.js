/**
 * GRAMSAARTHI — Dynamic Business Roadmap Service
 * Frontend API client for fetching the user's live progress roadmap.
 */

import { apiFetch, isApiEnabled } from './api.js';

/**
 * Fetch the authenticated user's dynamic business roadmap.
 * @returns {Promise<object>} RoadmapResponse with steps, progress, and missing requirements.
 */
export async function getRoadmap() {
  if (!isApiEnabled) {
    return null;
  }
  return apiFetch('/api/journey/roadmap');
}
