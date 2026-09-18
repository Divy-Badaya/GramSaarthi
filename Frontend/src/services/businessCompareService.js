/**
 * GRAMSAARTHI — Business Comparison Service
 * Frontend API client for comparing businesses and retrieving available types.
 */

import { apiFetch, isApiEnabled } from './api.js';

/**
 * Compare multiple businesses using the backend comparison engine.
 * @param {string[]} businessIds - Array of business type IDs (e.g. ["dairy", "poultry", "food"])
 * @returns {Promise<object>} Comparison results with scores and recommendation
 */
export async function compareBusinesses(businessIds) {
  if (!isApiEnabled) {
    console.warn('[GRAMSAARTHI] API not enabled for business comparison');
    return null;
  }
  return apiFetch('/api/businesses/compare', {
    method: 'POST',
    body: JSON.stringify({ businesses: businessIds }),
  });
}

/**
 * Get available business types for the comparison selector.
 * @returns {Promise<Array>} Array of { id, name, category, emoji }
 */
export async function getBusinessTypes() {
  if (!isApiEnabled) {
    // Fallback business types when API is not available
    return [
      { id: 'dairy', name: 'Dairy Farming', category: 'Dairy', emoji: '🐄' },
      { id: 'poultry', name: 'Poultry Farming', category: 'Poultry', emoji: '🐔' },
      { id: 'retail', name: 'Retail Shop', category: 'Retail', emoji: '🏪' },
      { id: 'textile', name: 'Tailoring & Garment', category: 'Textile', emoji: '🧵' },
      { id: 'food', name: 'Food Processing & Flour Mill', category: 'Food', emoji: '🌾' },
      { id: 'fisheries', name: 'Fisheries', category: 'Fisheries', emoji: '🐟' },
      { id: 'transport', name: 'Rural Transport', category: 'Transport', emoji: '🚛' },
      { id: 'agriculture', name: 'Agri-Input Store', category: 'Agriculture', emoji: '🌱' },
    ];
  }
  return apiFetch('/api/businesses/types');
}
