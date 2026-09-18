/**
 * GRAMSAARTHI — Finance Service
 * Frontend API client for user-specific financial plan, calculations,
 * scheme matching, and loan eligibility.
 */

import { apiFetch, isApiEnabled } from './api.js';

/**
 * Fetch the authenticated user's saved financial plan.
 * Returns null if the user has not completed assessment or has no plan.
 */
export async function getFinanceProfile() {
  if (!isApiEnabled) return null;
  try {
    return await apiFetch('/api/finance/me');
  } catch (err) {
    // 404 means no plan created yet for this user
    if (err.status === 404) {
      return null;
    }
    console.warn('[FINANCE] Could not fetch finance profile:', err);
    return null;
  }
}

/**
 * Dynamically calculate financial projections on the backend.
 * @param {object} params - { business_type, user_capital, project_cost?, loan_amount?, interest_rate?, loan_tenure?, moratorium? }
 */
export async function calculateFinance(params) {
  if (!isApiEnabled) return null;
  return apiFetch('/api/finance/calculate', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

/**
 * Update and finalize the authenticated user's financial plan.
 * @param {object} updates - { user_capital?, project_cost?, loan_amount?, interest_rate?, loan_tenure?, moratorium?, status? }
 */
export async function updateFinance(updates) {
  if (!isApiEnabled) return null;
  return apiFetch('/api/finance/me', {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

/**
 * Fetch government schemes matched to the user's finance plan.
 */
export async function getFinanceSchemes() {
  if (!isApiEnabled) return [];
  try {
    return await apiFetch('/api/finance/schemes');
  } catch (err) {
    console.warn('[FINANCE] Could not fetch schemes:', err);
    return [];
  }
}

/**
 * Check estimated loan eligibility based on user's current finance plan.
 * @param {object} params - Optional overrides: { user_capital, requested_loan, existing_debt, existing_emi }
 */
export async function getLoanEligibility(params = {}) {
  if (!isApiEnabled) return null;
  try {
    const query = new URLSearchParams();
    if (params.user_capital) query.append('user_capital', params.user_capital);
    if (params.requested_loan) query.append('requested_loan', params.requested_loan);
    if (params.existing_debt) query.append('existing_debt', params.existing_debt);
    if (params.existing_emi) query.append('existing_emi', params.existing_emi);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return await apiFetch(`/api/finance/eligibility${queryString}`);
  } catch (err) {
    console.warn('[FINANCE] Could not check eligibility:', err);
    return null;
  }
}

/**
 * Evaluate connected Financial Feasibility, Bank Loan Assessment, and 8-Factor Risk Analysis.
 * @param {object} params - { business_type, user_capital, project_cost?, loan_amount?, existing_debt?, existing_emi?, experience? }
 */
export async function getComprehensiveAssessment(params) {
  if (!isApiEnabled) return null;
  try {
    return await apiFetch('/api/finance/comprehensive-assessment', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  } catch (err) {
    console.warn('[FINANCE] Could not evaluate comprehensive assessment:', err);
    return null;
  }
}

/**
 * Fetch authenticated user's active comprehensive assessment.
 */
export async function getMyComprehensiveAssessment() {
  if (!isApiEnabled) return null;
  try {
    return await apiFetch('/api/finance/comprehensive-assessment');
  } catch (err) {
    console.warn('[FINANCE] Could not fetch user comprehensive assessment:', err);
    return null;
  }
}

