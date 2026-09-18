/**
 * GRAMSAARTHI — Scheme Service
 *
 * Handles government scheme recommendation, fetching, filtering,
 * and eligibility evaluation based on the official 10-scheme dataset.
 */

import { SCHEMES } from '../data/mockData.js';
import { apiFetch, isApiEnabled } from './api.js';

/**
 * Get all schemes matched to user profile.
 * Calls backend POST /api/schemes/recommend if profile provided, else GET /api/schemes.
 * Falls back to local SCHEMES array with custom matching if offline.
 *
 * @param {Object} [profile] - User assessment profile
 * @returns {Promise<Array>} Ranked schemes array
 */
export async function getSchemes(profile) {
  if (isApiEnabled) {
    try {
      if (profile && (profile.business || profile.business_interest || profile.capital || profile.ml_recommendation)) {
        const res = await apiFetch('/api/schemes/recommend', {
          method: 'POST',
          body: JSON.stringify({ profile }),
        });
        if (res && res.schemes && Array.isArray(res.schemes)) {
          return res.schemes.map((s, idx) => ({
            ...s,
            id: idx + 1,
            name: s.scheme_name,
            match: s.match_score,
            maxLoan: s.max_loan,
            interest: s.interest_rate,
            tenure: s.tenure || '3–5 years',
            tag: s.tag || s.government_level,
            tagColor: s.tag_color || (s.government_level === 'Central' ? 'blue' : 'green'),
            who: s.who || s.eligibility_criteria,
            benefit: s.benefits || s.benefit || s.short_description,
            benefits: s.benefits || s.benefit || s.short_description,
            why_eligible: s.why_eligible || s.relevance_reason,
            satisfied_conditions: s.satisfied_conditions || s.satisfied_criteria || [],
            missing_conditions: s.missing_conditions || s.unmet_criteria || [],
            required_documents: s.required_documents || s.docs || ['Aadhaar Card', 'Bank Account', 'Project DPR'],
            next_action: s.next_action,
            eligibility_status: s.eligibility_status,
            eligibility: s.eligibility_questions || [],
            docs: s.required_documents || s.docs || ['Aadhaar Card', 'Bank Account', 'Project DPR'],
            official_url: s.application_url || s.source_url,
          }));
        }
      }

      // Default GET /api/schemes
      const data = await apiFetch('/api/schemes');
      if (Array.isArray(data) && data.length > 0) {
        return data.map((s, idx) => ({
          ...s,
          id: s.id || idx + 1,
          name: s.name || s.scheme_name,
          benefit: s.benefits || s.benefit,
          benefits: s.benefits || s.benefit,
          why_eligible: s.why_eligible || s.relevance_reason,
          satisfied_conditions: s.satisfied_conditions || s.satisfied_criteria || [],
          missing_conditions: s.missing_conditions || s.unmet_criteria || [],
          required_documents: s.required_documents || s.docs || [],
          next_action: s.next_action,
        }));
      }

    } catch (err) {
      console.warn('[GRAMSAARTHI] Scheme API call failed, falling back to local dataset:', err);
    }
  }

  // Local fallback
  return computeLocalRecommendations(profile);
}

/**
 * Fetch a single scheme by ID.
 */
export async function getSchemeById(schemeId) {
  if (isApiEnabled && schemeId) {
    try {
      return await apiFetch(`/api/schemes/${encodeURIComponent(schemeId)}`);
    } catch (err) {
      console.warn(`[GRAMSAARTHI] Failed to fetch scheme ${schemeId}:`, err);
    }
  }
  return SCHEMES.find(s => s.scheme_id?.toUpperCase() === schemeId?.toUpperCase() || s.id === schemeId) || null;
}

/**
 * Evaluate user eligibility responses for a specific scheme.
 */
export async function evaluateEligibility(schemeId, answers = {}, profile = null) {
  if (isApiEnabled && schemeId) {
    try {
      return await apiFetch(`/api/schemes/${encodeURIComponent(schemeId)}/eligibility`, {
        method: 'POST',
        body: JSON.stringify({
          scheme_id: schemeId,
          answers,
          profile,
        }),
      });
    } catch (err) {
      console.warn(`[GRAMSAARTHI] Eligibility API failed for ${schemeId}:`, err);
    }
  }

  // Local fallback eligibility evaluation
  const scheme = SCHEMES.find(s => s.scheme_id?.toUpperCase() === schemeId?.toUpperCase()) || SCHEMES[0];
  const questions = scheme?.eligibility || [];
  const satisfied = [];
  const unmet = [];
  const missing = [];

  questions.forEach((q, idx) => {
    const ans = answers[String(idx)] || answers[q];
    if (!ans) {
      missing.push(q);
    } else if (String(ans).toLowerCase() === 'yes') {
      satisfied.push(q);
    } else {
      unmet.push(q);
    }
  });

  let status = 'check_eligibility';
  let statusText = 'Check Eligibility';
  if (unmet.length > 0) {
    status = 'likely_ineligible';
    statusText = 'Likely Not Eligible';
  } else if (missing.length === 0 && satisfied.length > 0) {
    status = 'likely_eligible';
    statusText = 'Likely Eligible';
  }

  return {
    scheme_id: schemeId,
    scheme_name: scheme?.name || schemeId,
    eligibility_status: statusText,
    status_code: status,
    satisfied_criteria: satisfied,
    unmet_criteria: unmet,
    missing_questions: missing,
    summary_note: unmet.length > 0 ? 'Some criteria not met' : 'All checked criteria met',
    disclaimer: 'Indicative guidance only. Final eligibility depends on government notifications and bank assessment.',
  };
}

/**
 * Filter schemes by category, government level, eligibility, and search query.
 */
export function filterSchemes(schemes = [], filters = {}) {
  if (!Array.isArray(schemes)) return [];

  const {
    category = 'All Schemes',
    governmentLevel = 'All',
    eligibilityStatus = 'All',
    searchQuery = '',
  } = typeof filters === 'string' ? { category: filters } : filters;

  return schemes.filter(scheme => {
    // 1. Category / Business Filter
    if (category && category !== 'All Schemes' && category !== 'All') {
      const catLower = category.toLowerCase();
      const schemeCat = (scheme.category || '').toLowerCase();
      const bizCats = (scheme.business_categories || []).map(b => b.toLowerCase());
      const allCats = (scheme.categories || []).map(c => c.toLowerCase());

      const matchCategory =
        schemeCat.includes(catLower) ||
        bizCats.some(b => b.includes(catLower) || catLower.includes(b)) ||
        allCats.some(c => c.includes(catLower) || catLower.includes(c));

      if (!matchCategory) return false;
    }

    // 2. Government Level Filter
    if (governmentLevel && governmentLevel !== 'All') {
      const level = (scheme.government_level || scheme.tag || '').toLowerCase();
      if (governmentLevel === 'Central' && !level.includes('central')) return false;
      if (governmentLevel === 'Central + State' && !level.includes('state')) return false;
    }

    // 3. Eligibility Filter
    if (eligibilityStatus && eligibilityStatus !== 'All') {
      const status = (scheme.eligibility_status || '').toLowerCase();
      const filterLower = eligibilityStatus.toLowerCase();
      if (!status.includes(filterLower)) return false;
    }

    // 4. Search Query Filter
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const searchable = [
        scheme.name,
        scheme.scheme_id,
        scheme.category,
        scheme.who,
        scheme.benefit,
        scheme.eligibility_criteria,
        ...(scheme.business_categories || []),
        ...(scheme.categories || []),
      ].filter(Boolean).join(' ').toLowerCase();

      if (!searchable.includes(q)) return false;
    }

    return true;
  });
}

/**
 * Compute local rule-based recommendations if backend is unreachable.
 */
function computeLocalRecommendations(profile) {
  if (!profile) return [...SCHEMES].sort((a, b) => b.match - a.match);

  const userBiz = (profile.business || profile.business_interest || '').toLowerCase();
  const mlBiz = (profile.ml_recommendation || '').toLowerCase();

  return [...SCHEMES].map(s => {
    let score = s.match || 75;
    const bizList = (s.business_categories || []).map(b => b.toLowerCase());

    if (userBiz && bizList.some(b => b.includes(userBiz) || userBiz.includes(b))) {
      score = Math.min(98, score + 12);
    } else if (mlBiz && bizList.some(b => b.includes(mlBiz) || mlBiz.includes(b))) {
      score = Math.min(95, score + 8);
    }

    return {
      ...s,
      match: score,
    };
  }).sort((a, b) => b.match - a.match);
}

/**
 * Get top matching scheme for current user.
 */
export function getTopScheme(schemes) {
  return schemes?.sort((a, b) => (b.match || b.match_score || 0) - (a.match || a.match_score || 0))[0] || null;
}
