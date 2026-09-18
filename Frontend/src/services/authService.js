/**
 * GRAMSAARTHI — Authentication Service
 *
 * Handles API calls for:
 * - sendOtp(mobile_number)
 * - signup(formData)
 * - login(identifier, password)
 * - logout()
 * - getCurrentUser()
 * - getProfileCompletion()
 * - Local token storage (gs_token)
 */

import { apiFetch, BASE_URL } from './api.js';

export const TOKEN_KEY = 'gramsaarthi_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || null;
}

export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * Send or generate OTP for phone verification.
 * @param {string} mobileNumber
 * @returns {Promise<{status: string, message: string, otp?: string}>}
 */
export async function sendOtp(mobileNumber) {
  return apiFetch('/api/auth/send-otp', {
    method: 'POST',
    body: JSON.stringify({ mobile_number: mobileNumber }),
  });
}

/**
 * Register a new user with 7 mandatory fields + optional email.
 * @param {object} formData
 * @returns {Promise<{access_token: string, user: object}>}
 */
export async function signupUser(formData) {
  const data = await apiFetch('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify(formData),
  });
  if (data?.access_token) {
    setToken(data.access_token);
  }
  return data;
}

/**
 * Authenticate user with mobile/email and password.
 * @param {string} identifier - Mobile number or email
 * @param {string} password - Password or PIN
 * @returns {Promise<{access_token: string, user: object}>}
 */
export async function loginUser(identifier, password) {
  const data = await apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier, password }),
  });
  if (data?.access_token) {
    setToken(data.access_token);
  }
  return data;
}

/**
 * Logout the current user session.
 */
export async function logoutUser() {
  try {
    await apiFetch('/api/auth/logout', { method: 'POST' });
  } catch {
    // Ignore server error on logout
  } finally {
    removeToken();
  }
}

/**
 * Get profile of currently authenticated user.
 * @returns {Promise<object>}
 */
export async function getMe() {
  return apiFetch('/api/auth/me');
}

/**
 * Get profile completion breakdown.
 * @returns {Promise<{percentage: number, completed_fields: Array, missing_fields: Array, message: string}>}
 */
export async function getProfileCompletion() {
  return apiFetch('/api/user/profile/completion');
}
