/**
 * GRAMSAARTHI — Recommendation Service
 *
 * Handles business recommendation logic.
 * TODO: Replace mock with ML model API call.
 */

import { DEMO_ASSESSMENT, BUSINESS_IDEAS } from '../data/mockData.js';
import { apiFetch, isApiEnabled } from './api.js';

/**
 * Save a completed assessment to the backend.
 * @param {object} assessmentData - { location, capital, business_interest, experience }
 * @returns {Promise<{assessment_id: number, status: string}>}
 *
 * Only called when API is enabled — no mock path needed (assessment is stored in context for mock mode).
 */
export async function saveAssessment(assessmentData) {
  return apiFetch('/api/assessments', {
    method: 'POST',
    body: JSON.stringify(assessmentData),
  });
}

/**
 * Fetch the authenticated user's latest saved assessment.
 * @returns {Promise<object|null>}
 */
export async function getLatestAssessment() {
  if (isApiEnabled) {
    try {
      return await apiFetch('/api/assessments/latest');
    } catch {
      return null;
    }
  }
  return null;
}


/**
 * Analyze a completed assessment and return recommendation data.
 * @param {object} assessmentData - { location, capital, business, experience }
 * @returns {Promise<object>} Full assessment result with score, metrics, reasons
 *
 * TODO: POST to /api/recommend with assessmentData, get ML model response.
 */
export async function analyzeAssessment(assessmentData) {
  if (isApiEnabled) {
    return apiFetch('/api/recommend', {
      method: 'POST',
      body: JSON.stringify(assessmentData),
    });
  }
  // Mock: return demo assessment data
  await new Promise(r => setTimeout(r, 2200));
  return { ...DEMO_ASSESSMENT };
}

/**
 * Get top business recommendations for a location/profile.
 * @param {object} profile - { location, capital, business, experience }
 * @returns {Promise<Array>} Array of business ideas with scores
 *
 * TODO: GET /api/recommend/ideas?location=...&capital=...
 */
export async function getRecommendations(profile = {}) {
  if (isApiEnabled) {
    const params = new URLSearchParams();
    if (profile.location)   params.set('location', profile.location);
    if (profile.capital)    params.set('capital', profile.capital);
    if (profile.business)   params.set('business', profile.business);
    if (profile.experience) params.set('experience', profile.experience);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiFetch(`/api/recommend/ideas${query}`);
  }
  await new Promise(r => setTimeout(r, 500));
  return [...BUSINESS_IDEAS].sort((a, b) => b.score - a.score);
}

/**
 * Filter business ideas by category type.
 */
export function filterBusinessIdeas(ideas, filter) {
  if (!filter || filter === 'All') return ideas;

  return ideas.filter(biz => {
    switch (filter) {
      case 'Low Investment': {
        const low = parseInt(biz.investment.replace(/[^0-9]/g, ''));
        return low <= 3;
      }
      case 'High Demand':
        return biz.demand === 'High' || biz.demand === 'Very High';
      case 'Low Risk':
        return biz.risk === 'Low' || biz.risk === 'Very Low';
      case 'High Profit': {
        const profitStr = biz.profit.replace(/[^0-9–]/g, '').split('–');
        const maxProfit = parseInt(profitStr[profitStr.length - 1]);
        return maxProfit >= 50;
      }
      default:
        return true;
    }
  });
}
