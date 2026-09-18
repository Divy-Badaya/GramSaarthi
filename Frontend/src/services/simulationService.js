/**
 * GRAMSAARTHI — What-If Financial Simulation Service
 * Frontend client for simulating variable parameters and comparing scenarios.
 */

import { apiFetch, isApiEnabled } from './api.js';

/**
 * Simulate a single what-if financial scenario.
 * @param {object} params - SimulationRequest parameters (investment, capital, revenue, expenses, etc.)
 * @returns {Promise<object>} SimulationResponse with recalculated metrics, risk, and assumptions.
 */
export async function simulateScenario(params) {
  if (!isApiEnabled) {
    return null;
  }
  return apiFetch('/api/finance/simulate', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

/**
 * Compare 2 to 4 what-if scenarios side-by-side.
 * @param {Array<object>} scenarios - List of SimulationRequest objects.
 * @returns {Promise<object>} ScenarioCompareResponse with comparison table, insights, and recommendation.
 */
export async function compareScenarios(scenarios) {
  if (!isApiEnabled) {
    return null;
  }
  return apiFetch('/api/finance/simulate/compare', {
    method: 'POST',
    body: JSON.stringify({ scenarios }),
  });
}
