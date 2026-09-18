import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { USER } from '../data/mockData';
import {
  getUserProfile,
  updateUserProfile as apiUpdateProfile,
  getProfileCompletionData,
  getCompletionPct,
} from '../services/userService.js';
import {
  getFinanceProfile,
  calculateFinance as apiCalculateFinance,
  updateFinance as apiUpdateFinance,
} from '../services/financeService.js';
import { deleteCurrentJourney } from '../services/journeyService.js';
import { getLatestAssessment } from '../services/recommendationService.js';
import { getToken, setToken as saveToken, removeToken } from '../services/authService.js';
import { isApiEnabled } from '../services/api.js';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../services/notificationService.js';

const AppContext = createContext(null);

const LANG_STORAGE_KEY = 'gramsaarthi_lang';

export function AppProvider({ children }) {
  // ── Authentication State ──────────────────────────────────────────────────
  const [token, setTokenState] = useState(() => getToken());
  const [profileLoading, setProfileLoading] = useState(() => !!getToken());
  const isAuthenticated = !!token;

  // ── Language — restored from localStorage on reload ────────────────────────
  const [lang, setLangState] = useState(
    () => localStorage.getItem(LANG_STORAGE_KEY) || 'English'
  );

  const normalizeLangCode = (l) => {
    if (!l) return 'en';
    const s = String(l).trim().toLowerCase();
    if (s === 'hi' || s.startsWith('hi') || s.includes('hindi') || s.includes('हिन्दी')) return 'hi';
    if (s === 'gu' || s.startsWith('gu') || s.includes('gujarati') || s.includes('ગુજરાતી')) return 'gu';
    return 'en';
  };

  useEffect(() => {
    const code = normalizeLangCode(lang);
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.lang = code;
    }
  }, [lang]);

  const setLang = (newLang) => {
    setLangState(newLang);
    localStorage.setItem(LANG_STORAGE_KEY, newLang);
    setUser(prev => prev ? { ...prev, language: newLang, preferred_language: newLang } : prev);
    if (isApiEnabled && token) {
      apiUpdateProfile({ preferred_language: newLang, language: newLang }).catch(err => {
        console.warn('[AppContext] Could not sync preferred_language to profile:', err);
      });
    }
  };

  // Assessment & Finance state — NO fake demo finance data
  const [assessment, setAssessment] = useState(null);
  const [finance, setFinance] = useState(null);
  const [financeLoading, setFinanceLoading] = useState(false);
  const [user, setUser] = useState(USER);
  const [notificationsList, setNotificationsList] = useState([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((msg, type = 'success') => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);

  // Fetch real notifications from backend
  const refreshNotifications = useCallback(async () => {
    if (!isApiEnabled) return;
    try {
      setNotificationsLoading(true);
      const res = await getNotifications();
      if (res) {
        setNotificationsList(res.items || []);
        setUnreadNotificationsCount(res.unread_count || 0);
      }
    } catch (err) {
      console.warn('[AppContext] Failed to load notifications:', err);
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  // Mark single notification read
  const markAsRead = useCallback(async (id) => {
    setNotificationsList(prev =>
      prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadNotificationsCount(prev => Math.max(0, prev - 1));

    try {
      await markNotificationRead(id);
    } catch (err) {
      console.warn('[AppContext] Could not mark notification read:', err);
      refreshNotifications();
    }
  }, [refreshNotifications]);

  // Mark all notifications read
  const markAllAsRead = useCallback(async () => {
    setNotificationsList(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadNotificationsCount(0);

    try {
      await markAllNotificationsRead();
    } catch (err) {
      console.warn('[AppContext] Could not mark all notifications read:', err);
      refreshNotifications();
    }
  }, [refreshNotifications]);

  // ── Profile Completion State ───────────────────────────────────────────────
  const [profileCompletion, setProfileCompletion] = useState({
    percentage: getCompletionPct(USER),
    completed_fields: [],
    missing_fields: [],
    message: 'Complete your profile to get more personalized government schemes and business recommendations.',
  });

  // Fetch finance profile for current authenticated user
  const refreshFinance = useCallback(async () => {
    if (!isApiEnabled || !token) {
      return null;
    }
    setFinanceLoading(true);
    try {
      const plan = await getFinanceProfile();
      if (plan) {
        setFinance(plan);
        return plan;
      } else {
        setFinance(null);
        return null;
      }
    } catch (err) {
      console.warn('[GRAMSAARTHI] Failed to fetch finance plan:', err);
      setFinance(null);
      return null;
    } finally {
      setFinanceLoading(false);
    }
  }, [token]);

  // Fetch full profile and completion stats
  const refreshProfile = useCallback(async () => {
    if (!isApiEnabled) return;
    try {
      const [profileData, completionData, latestAssessment] = await Promise.all([
        getUserProfile(),
        getProfileCompletionData(),
        token ? getLatestAssessment() : Promise.resolve(null),
      ]);

      if (profileData) {
        setUser(prev => ({ ...prev, ...profileData }));

        // If user already had a completed assessment, hydrate assessment state
        if (latestAssessment) {
          setAssessment(prev => {
            if (prev && prev.score) return prev;
            const locParts = (latestAssessment.location || '').split(',').map(s => s.trim());
            const village = locParts[0] || profileData.village || '';
            const block = locParts.length >= 4 ? locParts[1] : (profileData.block || '');
            const district = locParts.length >= 4 ? locParts[2] : (locParts[1] || profileData.district || '');
            const state = locParts.length >= 4 ? locParts[3] : (locParts[2] || profileData.state || '');
            return {
              ...(prev || {}),
              business: latestAssessment.business_interest || profileData.business_interest || profileData.business_type || 'Dairy',
              capital: latestAssessment.capital || profileData.capital || 100000,
              experience: latestAssessment.experience || 'Beginner',
              location: { village, block, district, state },
              score: prev?.score || 84,
              recommendation: prev?.recommendation || 'Recommended',
            };
          });
        } else if (profileData.business_type || profileData.business_interest) {
          // Fallback seed from profile
          setAssessment(prev => prev || {
            business: profileData.business_type || profileData.business_interest,
            capital: profileData.capital || profileData.investment_capacity || 100000,
            experience: profileData.experience || 'Beginner',
            location: {
              village: profileData.village || '',
              district: profileData.district || '',
              state: profileData.state || '',
            },
            score: 84,
            recommendation: 'Recommended',
          });
        }
        // Sync language if profile specifies it
        const profLang = profileData.preferred_language || profileData.language;
        if (profLang) {
          const stored = localStorage.getItem(LANG_STORAGE_KEY);
          if (!stored) {
            setLangState(profLang);
            localStorage.setItem(LANG_STORAGE_KEY, profLang);
          }
        }
      }

      if (completionData) {
        setProfileCompletion(completionData);
      } else if (profileData) {
        setProfileCompletion(prev => ({
          ...prev,
          percentage: getCompletionPct(profileData),
        }));
      }

      // Concurrently refresh finance
      await refreshFinance();
    } catch (err) {
      console.warn('[GRAMSAARTHI] Failed to refresh profile:', err);
    } finally {
      setProfileLoading(false);
    }
  }, [refreshFinance]);

  // Update profile and immediately recalculate completion
  const updateProfile = async (updates) => {
    try {
      const updated = await apiUpdateProfile(updates);
      setUser(prev => ({ ...prev, ...updated }));
      await refreshProfile();
      addToast('Profile updated successfully!', 'success');
      return updated;
    } catch (err) {
      console.error('[GRAMSAARTHI] Profile update failed:', err);
      addToast(err.message || 'Failed to update profile', 'danger');
      throw err;
    }
  };

  // Update and finalize user finance plan
  const updateFinancePlan = async (updates) => {
    try {
      const updated = await apiUpdateFinance(updates);
      if (updated) {
        setFinance(updated);
        addToast('Financial plan updated successfully!', 'success');
      }
      return updated;
    } catch (err) {
      console.error('[GRAMSAARTHI] Update finance failed:', err);
      addToast(err.message || 'Failed to update financial plan', 'danger');
      throw err;
    }
  };

  // Calculate finance plan on-the-fly
  const calculateFinancePlan = async (params) => {
    try {
      return await apiCalculateFinance(params);
    } catch (err) {
      console.error('[GRAMSAARTHI] Calculate finance failed:', err);
      throw err;
    }
  };

  // Delete and reset active business journey
  const deleteJourney = async () => {
    try {
      if (isApiEnabled && token) {
        await deleteCurrentJourney();
      }
      setAssessment(null);
      setFinance(null);
      setUser(prev => {
        if (!prev) return prev;
        const next = { ...prev };
        next.business = null;
        next.business_type = null;
        next.business_interest = null;
        next.business_name = null;
        next.business_status = null;
        next.business_investment = null;
        next.business_goals = null;
        next.interested_business_types = null;
        next.desired_opportunities = null;
        next.preferred_business_location = null;
        next.years_in_business = null;
        next.monthly_revenue = null;
        next.number_of_employees = null;
        return next;
      });
      if (isApiEnabled && token) {
        try {
          await refreshProfile();
        } catch (e) {
          console.warn('[JOURNEY] Profile refresh note:', e);
        }
      }
      addToast('Your business journey has been reset. You can now start a new business!', 'success');
    } catch (err) {
      console.error('[GRAMSAARTHI] Failed to reset journey:', err);
      addToast(err.message || 'Failed to delete business journey', 'danger');
      throw err;
    }
  };

  // Login handler
  const login = (newToken, userData) => {
    saveToken(newToken);
    setTokenState(newToken);
    if (userData) {
      setUser(prev => ({ ...prev, ...userData }));
      if (userData.language) {
        setLang(userData.language);
      }
    }
    refreshProfile();
  };

  // Logout handler — cleanly resets all user data and finance state
  const logout = () => {
    removeToken();
    setTokenState(null);
    setUser(USER);
    setAssessment(null);
    setFinance(null);
    setProfileLoading(false);
    setProfileCompletion({
      percentage: getCompletionPct(USER),
      completed_fields: [],
      missing_fields: [],
      message: 'Complete your profile to get more personalized recommendations.',
    });
  };

  // Initial load & periodic notification poll
  useEffect(() => {
    refreshProfile();
    refreshNotifications();
    const interval = setInterval(refreshNotifications, 35000);
    return () => clearInterval(interval);
  }, [refreshProfile, refreshNotifications, token]);

  // Listen for session expiry from API calls
  useEffect(() => {
    const handleExpired = () => {
      logout();
      addToast('Session expired. Please log in again.', 'warning');
    };
    window.addEventListener('gramsaarthi_session_expired', handleExpired);
    return () => window.removeEventListener('gramsaarthi_session_expired', handleExpired);
  }, []);

  // Select a business from comparison and set it as the active business journey
  const selectBusiness = (businessType, businessName) => {
    setAssessment(prev => ({
      ...(prev || {}),
      business: businessType,
      businessName: businessName || businessType,
      capital: prev?.capital || user?.capital || 100000,
      location: prev?.location || {
        village: user?.village || '',
        district: user?.district || '',
        state: user?.state || '',
      },
    }));
    addToast(`${businessName || businessType} selected as your business!`, 'success');
  };

  return (
    <AppContext.Provider value={{
      token, isAuthenticated, login, logout,
      lang, setLang,
      profileLoading,
      assessment, setAssessment,
      finance, setFinance, financeLoading, refreshFinance,
      updateFinancePlan, calculateFinancePlan, deleteJourney,
      selectBusiness,
      user, setUser,
      profileCompletion, setProfileCompletion,
      refreshProfile, updateProfile,
      notifications: unreadNotificationsCount,
      notificationsList,
      unreadNotificationsCount,
      notificationsLoading,
      refreshNotifications,
      markAsRead,
      markAllAsRead,
      toasts, addToast,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
