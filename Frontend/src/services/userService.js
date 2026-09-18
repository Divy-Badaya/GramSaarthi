/**
 * GRAMSAARTHI — User Service
 *
 * Handles user profile, activity, and completeness calculations.
 */

import { USER, RECENT_ACTIVITIES, DOCUMENTS } from '../data/mockData.js';
import { apiFetch, isApiEnabled } from './api.js';

/**
 * Get the current user profile.
 * @returns {Promise<object>}
 */
export async function getUserProfile() {
  if (isApiEnabled) {
    try {
      return await apiFetch('/api/user/profile');
    } catch {
      return { ...USER };
    }
  }
  return { ...USER };
}

/**
 * Update the user profile.
 * @param {object} updates
 * @returns {Promise<object>}
 */
export async function updateUserProfile(updates) {
  if (isApiEnabled) {
    return apiFetch('/api/user/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }
  return { ...USER, ...updates };
}

/**
 * Get recent activity history.
 * @returns {Promise<Array>}
 */
export async function getActivityHistory() {
  if (isApiEnabled) {
    try {
      return await apiFetch('/api/user/activity');
    } catch {
      return [...RECENT_ACTIVITIES];
    }
  }
  return [...RECENT_ACTIVITIES];
}

/**
 * Get live profile completion status from backend.
 * @returns {Promise<object>}
 */
export async function getProfileCompletionData() {
  if (isApiEnabled) {
    try {
      return await apiFetch('/api/user/profile/completion');
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Client-side fallback to calculate profile completeness percentage.
 * @param {object} user
 * @returns {number} 0–100
 */
export function getCompletionPct(user) {
  if (!user) return 0;
  if (typeof user.completion_percentage === 'number' && user.completion_percentage > 0) {
    return user.completion_percentage;
  }

  let score = 0;
  // Basic (25%)
  if (user.name || user.full_name) score += 5;
  if (user.phone || user.mobile_number) score += 5;
  if (user.language || user.preferred_language) score += 5;
  if (user.state) score += 5;
  if (user.district) score += 5;

  // Personal (25%)
  if (user.age) score += 5;
  if (user.gender) score += 5;
  if (user.education) score += 5;
  if (user.occupation) score += 10;

  // Eligibility (20%)
  if (user.social_category) score += 5;
  if (user.annual_family_income || user.annual_income_range) score += 10;
  if (user.special_categories) score += 5;

  // Business (20%)
  if (user.business_status) score += 5;
  if (user.business_type || user.business_interest) score += 5;
  if (user.capital || user.investment_capacity) score += 10;

  // Skills & Resources (10%)
  if (user.skills || user.experience || user.work_experience) score += 5;
  if (user.has_bank_account || user.has_land || user.has_commercial_space || user.has_equipment) score += 5;

  return Math.min(100, Math.max(0, score));
}

/**
 * Derive user initials from full name.
 * @param {string} name - Full name e.g. "Ramesh Kumar"
 * @returns {string} e.g. "RK"
 */
export function getUserInitials(name) {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Get time-appropriate greeting.
 * @returns {string} "Good morning" | "Good afternoon" | "Good evening"
 */
export function getTimeGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
