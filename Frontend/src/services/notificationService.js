/**
 * GRAMSAARTHI — Notification Service
 * Client-side API functions for retrieving, creating, and marking notifications as read.
 */

import { apiFetch } from './api.js';

/**
 * Fetch all notifications for current user with unread count.
 * @param {number} limit
 * @returns {Promise<{ items: Array, unread_count: number, total: number }>}
 */
export async function getNotifications(limit = 50) {
  return apiFetch(`/api/notifications?limit=${limit}`);
}

/**
 * Mark a single notification as read.
 * @param {number} notificationId
 * @returns {Promise<Object>}
 */
export async function markNotificationRead(notificationId) {
  return apiFetch(`/api/notifications/${notificationId}/read`, {
    method: 'PUT',
  });
}

/**
 * Mark all unread notifications as read.
 * @returns {Promise<{ marked_count: number, message: string }>}
 */
export async function markAllNotificationsRead() {
  return apiFetch('/api/notifications/read-all', {
    method: 'PUT',
  });
}

/**
 * Create a new notification (for client-initiated actions or testing).
 * @param {Object} payload { title, message, type, link, user_id }
 * @returns {Promise<Object>}
 */
export async function createNotification(payload) {
  return apiFetch('/api/notifications', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
