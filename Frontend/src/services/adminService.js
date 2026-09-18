/**
 * GRAMSAARTHI — Admin Service
 * API client methods for Admin Control Panel: Dashboard stats, Users management,
 * Suspend/Blacklist/Restore account lifecycle, and Audit activity logs.
 */

import { apiFetch } from './api.js';

/**
 * Fetch live aggregate counts across users, documents, and recent audit activity.
 */
export async function getAdminDashboardStats() {
  return await apiFetch('/api/admin/dashboard/stats');
}

/**
 * Search and filter users list.
 * @param {Object} params - { search, status, limit, offset }
 */
export async function getAdminUsers({ search = '', status = 'ALL', limit = 50, offset = 0 } = {}) {
  const query = new URLSearchParams();
  if (search && search.trim()) query.append('search', search.trim());
  if (status && status !== 'ALL') query.append('status', status);
  query.append('limit', String(limit));
  query.append('offset', String(offset));
  return await apiFetch(`/api/admin/users?${query.toString()}`);
}

/**
 * Fetch comprehensive administrative details for a specific user.
 * @param {number|string} userId
 */
export async function getAdminUserDetails(userId) {
  return await apiFetch(`/api/admin/users/${userId}`);
}

/**
 * Suspend a user account with a mandatory reason.
 * @param {number|string} userId
 * @param {string} reason
 */
export async function suspendUser(userId, reason) {
  return await apiFetch(`/api/admin/users/${userId}/suspend`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

/**
 * Blacklist a user account with explicit phone number confirmation.
 * @param {number|string} userId
 * @param {string} reason
 * @param {string} confirmPhone
 */
export async function blacklistUser(userId, reason, confirmPhone) {
  return await apiFetch(`/api/admin/users/${userId}/blacklist`, {
    method: 'POST',
    body: JSON.stringify({ reason, confirm_phone: confirmPhone }),
  });
}

/**
 * Restore a suspended or blacklisted account back to ACTIVE status.
 * @param {number|string} userId
 * @param {string} [reason]
 */
export async function restoreUser(userId, reason = '') {
  return await apiFetch(`/api/admin/users/${userId}/restore`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

/**
 * Fetch chronological audit logs with search and action type filtering.
 * @param {Object} params - { action, search, limit, offset }
 */
export async function getAdminActivity({ action = 'ALL', search = '', limit = 100, offset = 0 } = {}) {
  const query = new URLSearchParams();
  if (action && action !== 'ALL') query.append('action', action);
  if (search && search.trim()) query.append('search', search.trim());
  query.append('limit', String(limit));
  query.append('offset', String(offset));
  return await apiFetch(`/api/admin/activity?${query.toString()}`);
}
