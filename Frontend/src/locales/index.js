/**
 * GRAMSAARTHI — Centralized Translation System
 *
 * Supports English (en), Hindi (hi), Gujarati (gu).
 * Other selected languages fall back to English.
 *
 * Usage:
 *   const t = useT();
 *   t('common.next')              → "Next" / "આગળ" / "आगे"
 *   t('common.step_of', { current: 2, total: 4 }) → "Step 2 of 4"
 */

import { useCallback } from 'react';
import { useApp } from '../context/AppContext.jsx';
import en from './en.json';
import hi from './hi.json';
import gu from './gu.json';

// Map display label or code → locale code
export function getLangCode(lang) {
  if (!lang) return 'en';
  const l = String(lang).trim().toLowerCase();
  if (l === 'hi' || l.startsWith('hi') || l.includes('hindi') || l.includes('हिन्दी')) return 'hi';
  if (l === 'gu' || l.startsWith('gu') || l.includes('gujarati') || l.includes('ગુજરાતી')) return 'gu';
  return 'en';
}

const LOCALES = { en, hi, gu };

/**
 * Safely format an unmapped key into a clean, human-readable Title Case string.
 * Ensures no user ever sees raw dot notation (e.g. auth.btn_login) or snake_case.
 */
function humanizeKey(key) {
  if (!key || typeof key !== 'string') return '';
  const knownFallbacks = {
    'profile.sec_personal': 'Personal Information',
    'profile.sec_personal_sub': 'Name, Age, Gender, Education, Occupation',
    'profile.sec_location': 'Location Details',
    'profile.sec_location_sub': 'State, District, Block, Village',
    'profile.sec_eligibility': 'Scheme Eligibility',
    'profile.sec_eligibility_sub': 'Category, Income, Special Category',
    'profile.sec_business': 'Business Profile',
    'profile.sec_business_sub': 'Status, Type, Investment, Revenue',
    'profile.sec_skills_resources': 'Skills & Resources',
    'profile.sec_skills_resources_sub': 'Skills, Land, Equipment, Bank Account',
    'profile.sec_preferences': 'Preferences',
    'profile.sec_preferences_sub': 'Opportunities, Goals, Location',
    'common.edit': 'Edit',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'auth.btn_login': 'Log In',
    'auth.login_title': 'Welcome Back',
    'auth.login_subtitle': 'Log in to manage your business and schemes',
    'auth.label_mobile_or_email': 'Mobile Number or Email',
    'auth.label_password': 'Password / PIN',
  };
  if (knownFallbacks[key]) return knownFallbacks[key];

  // Strip prefix like "auth.", "profile.", "common."
  const parts = key.split('.');
  const lastPart = parts[parts.length - 1];
  return lastPart
    .replace(/^label_|^btn_|^sec_|^link_|^err_/, '')
    .split('_')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Returns a translation function for the current language.
 * Falls back gracefully: current locale → English → provided fallback → humanized string.
 *
 * @returns {function(key: string, varsOrFallback?: object|string, maybeVars?: object): string}
 */
export function useT() {
  const { lang } = useApp();
  const code = getLangCode(lang);

  return useCallback(
    (key, varsOrFallback = {}, maybeVars = {}) => {
      if (!key) return '';

      const locale = LOCALES[code] || en;
      let str = locale[key] ?? en[key];

      if (str === undefined) {
        if (typeof varsOrFallback === 'string') {
          str = varsOrFallback;
        } else {
          str = humanizeKey(key);
        }
      }

      // Variable interpolation: {current}, {total}, etc.
      const vars = typeof varsOrFallback === 'object' && varsOrFallback !== null ? varsOrFallback : maybeVars;
      if (typeof str === 'string' && vars && typeof vars === 'object') {
        Object.entries(vars).forEach(([k, v]) => {
          str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
        });
      }

      return str;
    },
    [code]
  );
}

/**
 * Business category id → translated label
 * ML internal labels stay in English; only the UI display is translated.
 */
const BUSINESS_ID_MAP = {
  dairy:         'business.dairy',
  agriculture:   'business.agriculture',
  poultry:       'business.poultry',
  retail:        'business.retail',
  food:          'business.food',
  textile:       'business.textile',
  fisheries:     'business.fisheries',
  manufacturing: 'business.manufacturing',
  digital:       'business.digital',
  transport:     'business.transport',
  suggest:       'business.suggest',
};

/**
 * ML label (English canonical) → translation key
 * e.g. "Dairy" → "business.dairy"
 */
const ML_LABEL_MAP = {
  'Dairy':            'business.dairy',
  'Dairy Farming':    'business.dairy',
  'Agriculture':      'business.agriculture',
  'Poultry':          'business.poultry',
  'Poultry Farming':  'business.poultry',
  'Retail Shop':      'business.retail',
  'Retail':           'business.retail',
  'Food Business':    'business.food',
  'Food Processing':  'business.food',
  'Food':             'business.food',
  'Textile':          'business.textile',
  'Tailoring':        'business.textile',
  'Fisheries':        'business.fisheries',
  'Manufacturing':    'business.manufacturing',
  'Digital Services': 'business.digital',
  'Digital / IT':     'business.digital',
  'Transport':        'business.transport',
  'Logistics':        'business.transport',
  'Healthcare':       'business.healthcare',
};

/**
 * Translate a business category ID (e.g. "dairy") to the current language label.
 */
export function useBusinessLabel() {
  const t = useT();
  return (id) => t(BUSINESS_ID_MAP[id] || id);
}

/**
 * Translate an ML-returned English canonical label (e.g. "Dairy") to the current language.
 * Returns the English label unchanged if no mapping found.
 */
export function useMLLabel() {
  const t = useT();
  return (mlLabel) => {
    const key = ML_LABEL_MAP[mlLabel];
    return key ? t(key) : mlLabel;
  };
}

const REASON_KEY_MAP = {
  'High local demand': 'reason.high_demand',
  'Moderate competition': 'reason.mod_competition',
  'Good market access': 'reason.good_market',
  'Seasonal risk present': 'reason.seasonal_risk',
  'Moderate investment required': 'reason.mod_investment',
};

/**
 * Translate an assessment reason label if a mapping exists.
 */
export function useReasonLabel() {
  const t = useT();
  return (label) => {
    if (!label) return '';
    const key = REASON_KEY_MAP[label];
    return key ? t(key) : label;
  };
}

