import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FileCheck,
  Activity,
  LogOut,
  Menu,
  X,
  Globe,
  ChevronDown,
  Shield,
  Bell,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useT, getLangCode } from '../../locales/index.js';
import { LANGUAGES } from '../../data/mockData';

export default function AdminLayout({ children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const t = useT();
  const {
    user,
    logout,
    lang,
    setLang,
    toasts,
    notificationsList,
    unreadNotificationsCount,
    markAsRead,
    markAllAsRead,
  } = useApp();

  const currentCode = getLangCode(lang);
  const displayLabel = currentCode === 'hi' ? 'हिन्दी' : currentCode === 'gu' ? 'ગુજરાતી' : 'English';

  const NAV_ITEMS = [
    {
      id: 'dashboard',
      path: '/admin',
      altPath: '/admin/dashboard',
      label: t('admin.nav_dashboard') || 'Dashboard',
      icon: LayoutDashboard,
      emoji: '📊',
    },
    {
      id: 'users',
      path: '/admin/users',
      label: t('admin.nav_users') || 'Users',
      icon: Users,
      emoji: '👥',
    },
    {
      id: 'documents',
      path: '/admin/documents',
      label: t('admin.nav_doc_verification') || 'Document Verification',
      icon: FileCheck,
      emoji: '📄',
    },
    {
      id: 'activity',
      path: '/admin/activity',
      label: t('admin.nav_activity') || 'Admin Activity',
      icon: Activity,
      emoji: '🕵️',
    },
  ];

  const isActive = (item) => {
    if (item.id === 'dashboard') {
      return pathname === '/admin' || pathname === '/admin/' || pathname === '/admin/dashboard';
    }
    return pathname.startsWith(item.path);
  };

  const handleNav = (path) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toastBg = (type) => {
    if (type === 'error' || type === 'danger') return '#C94A3B';
    if (type === 'warning') return '#D9A441';
    if (type === 'success') return '#355E3B';
    return '#214A32';
  };

  return (
    <div className="app-shell" style={{ minHeight: '100vh', background: '#FFF9F0' }}>
      {/* ── Admin Header ────────────────────────────────────────────── */}
      <header className="app-header" style={{ borderBottom: '1px solid #DED8CA', background: '#FFF9F0' }}>
        <div className="app-header-inner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '0 24px', maxWidth: '1400px', margin: '0 auto' }}>
          {/* Left: Mobile Toggle & Admin Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              className="gs-header-btn hide-desktop"
              onClick={() => setMobileMenuOpen(o => !o)}
              aria-label={mobileMenuOpen ? 'Close admin navigation' : 'Open admin navigation'}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px' }}
            >
              {mobileMenuOpen ? <X size={20} color="#355E3B" /> : <Menu size={20} color="#355E3B" />}
            </button>

            <button
              onClick={() => navigate('/admin')}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              }}
            >
              <img
                src="/logo.png"
                alt="GramSaarthi Logo"
                style={{
                  width: '38px', height: '38px', borderRadius: '10px',
                  objectFit: 'contain', flexShrink: 0,
                  boxShadow: '0 2px 6px rgba(53,94,59,0.15)',
                }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '17px', fontWeight: 800, color: '#24302A' }}>
                  GramSaarthi
                </span>
                <span
                  style={{
                    fontSize: '11px', fontWeight: 800, letterSpacing: '0.06em',
                    background: '#C96B3B', color: '#FFFFFF',
                    padding: '3px 8px', borderRadius: '6px',
                    textTransform: 'uppercase',
                  }}
                >
                  {t('admin.badge') || 'ADMIN'}
                </span>
              </div>
            </button>
          </div>

          {/* Right Header Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Language Selector */}
            <div style={{ position: 'relative' }}>
              <button
                className="gs-lang-pill"
                onClick={() => setLangOpen(o => !o)}
                aria-label={t('common.change_language') || 'Change language'}
                style={{ height: '38px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Globe size={14} color="#5F665F" />
                <span>{displayLabel}</span>
                <ChevronDown size={12} style={{ transform: langOpen ? 'rotate(180deg)' : 'none', transition: 'transform 150ms ease' }} />
              </button>

              {langOpen && (
                <div
                  style={{
                    position: 'absolute', top: '44px', right: 0,
                    background: '#FFF9F0', border: '1px solid #DED8CA',
                    borderRadius: '12px', boxShadow: 'var(--gs-shadow-lg)',
                    zIndex: 200, minWidth: '160px', padding: '6px',
                  }}
                >
                  {LANGUAGES.map(l => {
                    const isSelected = getLangCode(l) === currentCode;
                    return (
                      <button
                        key={l}
                        onClick={() => { setLang(l); setLangOpen(false); }}
                        style={{
                          display: 'block', width: '100%', textAlign: 'left',
                          padding: '8px 12px', borderRadius: '6px',
                          fontSize: '13px', fontWeight: isSelected ? 700 : 500,
                          color: isSelected ? '#214A32' : '#5F665F',
                          background: isSelected ? '#E7F0DE' : 'transparent',
                          border: 'none', cursor: 'pointer',
                        }}
                      >
                        {l}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Admin Notifications Bell */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setNotifOpen(o => !o)}
                aria-label="Admin Notifications"
                title="Notifications"
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#5C6F64',
                  background: '#FFFFFF',
                  border: '1px solid #DED8CA',
                  cursor: 'pointer',
                  position: 'relative',
                }}
              >
                <Bell size={17} />
                {unreadNotificationsCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-3px',
                      right: '-3px',
                      minWidth: '17px',
                      height: '17px',
                      padding: '0 4px',
                      borderRadius: '999px',
                      background: '#C96B3B',
                      color: '#FFFFFF',
                      fontSize: '10px',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid #FFF9F0',
                    }}
                  >
                    {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '46px',
                    right: 0,
                    width: '340px',
                    maxHeight: '440px',
                    background: '#FFF9F0',
                    border: '1px solid #DED8CA',
                    borderRadius: '16px',
                    boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
                    zIndex: 200,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <div
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid #DED8CA',
                      background: 'rgba(244, 235, 221, 0.6)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#24302A' }}>
                      Admin Alerts
                    </span>
                    {unreadNotificationsCount > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markAllAsRead();
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          fontSize: '11px',
                          fontWeight: 700,
                          color: '#355E3B',
                          cursor: 'pointer',
                        }}
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  <div style={{ overflowY: 'auto', maxHeight: '360px' }}>
                    {notificationsList.length === 0 ? (
                      <div style={{ padding: '30px 16px', textAlign: 'center', color: '#5F665F', fontSize: '12px' }}>
                        No pending alerts.
                      </div>
                    ) : (
                      notificationsList.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            markAsRead(n.id);
                            if (n.link) navigate(n.link);
                            setNotifOpen(false);
                          }}
                          style={{
                            padding: '12px 14px',
                            borderBottom: '1px solid #EAE4D6',
                            background: !n.is_read ? '#FFF9F0' : 'rgba(255,255,255,0.4)',
                            cursor: 'pointer',
                            display: 'flex',
                            gap: '10px',
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <p style={{ margin: 0, fontSize: '12px', fontWeight: !n.is_read ? 700 : 500, color: '#24302A' }}>
                                {n.title}
                              </p>
                              {!n.is_read && (
                                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#C96B3B' }} />
                              )}
                            </div>
                            <p style={{ margin: '3px 0 0', fontSize: '11px', color: '#5C6F64', lineHeight: 1.4 }}>
                              {n.message}
                            </p>
                            <span style={{ fontSize: '10px', color: '#8C9B90', marginTop: '4px', display: 'block' }}>
                              {n.time_ago || 'Recently'}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Admin Badge & Logout */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  height: '38px', padding: '0 14px', background: '#E7F0DE',
                  borderRadius: '12px', border: '1px solid #BEDCA7',
                }}
              >
                <Shield size={14} color="#355E3B" />
                <span className="hide-mobile" style={{ fontSize: '13px', fontWeight: 700, color: '#214A32' }}>
                  {user?.name || 'Administrator'}
                </span>
              </div>

              <button
                onClick={handleLogout}
                title={t('auth.logout') || 'Logout'}
                aria-label={t('auth.logout') || 'Logout'}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  height: '38px', padding: '0 14px', borderRadius: '12px',
                  background: '#FEE8E8', border: '1px solid #F3C7C7',
                  color: '#C94A3B', cursor: 'pointer',
                  fontSize: '12px', fontWeight: 700,
                }}
              >
                <LogOut size={14} />
                <span className="hide-mobile">{t('auth.logout') || 'Logout'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Click outside to close language or notifications menu */}
        {(langOpen || notifOpen) && (
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 150 }}
            onClick={() => { setLangOpen(false); setNotifOpen(false); }}
          />
        )}
      </header>

      {/* ── Admin Body & Sidebar ───────────────────────────────────── */}
      <div className="app-body" style={{ display: 'flex', minHeight: 'calc(100vh - 72px)', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Mobile Drawer Backdrop */}
        {mobileMenuOpen && (
          <div
            style={{
              position: 'fixed', inset: 0, zIndex: 90,
              background: 'rgba(33, 74, 50, 0.35)', backdropFilter: 'blur(3px)',
            }}
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Desktop and Mobile Sidebar */}
        <aside
          className={`app-sidebar ${mobileMenuOpen ? 'show-mobile-drawer' : 'hide-mobile'}`}
          style={{
            width: '260px',
            background: '#FFF9F0',
            borderRight: '1px solid #DED8CA',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '16px 12px',
            zIndex: mobileMenuOpen ? 95 : 10,
            ...(mobileMenuOpen ? {
              position: 'fixed',
              top: '72px',
              left: 0,
              bottom: 0,
              boxShadow: 'var(--gs-shadow-xl)',
            } : {}),
          }}
        >
          <div>
            {/* Control Panel Title Banner */}
            <div
              style={{
                padding: '14px 16px', marginBottom: '16px',
                background: '#214A32',
                borderRadius: '14px', color: '#FFF9F0',
              }}
            >
              <p style={{ fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#D9A441', fontWeight: 800 }}>
                {t('admin.owner_control_panel') || 'Control Panel'}
              </p>
              <p style={{ fontSize: '15px', fontWeight: 800, marginTop: '2px', color: '#FFF9F0' }}>
                {t('admin.panel_title') || 'GRAMSAARTHI ADMIN'}
              </p>
            </div>

            {/* Strictly Administrative Navigation */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {NAV_ITEMS.map((item) => {
                const active = isActive(item);
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNav(item.path)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: '10px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '13.5px',
                      fontWeight: active ? 700 : 500,
                      color: active ? '#214A32' : '#5F665F',
                      background: active ? '#E7F0DE' : 'transparent',
                      transition: 'all 150ms ease',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => {
                      if (!active) e.currentTarget.style.background = '#F4EBDD';
                    }}
                    onMouseLeave={(e) => {
                      if (!active) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <span style={{ fontSize: '16px', lineHeight: 1 }}>{item.emoji}</span>
                    <span style={{ flex: 1 }}>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom Card: Admin Info & Logout */}
          <div
            style={{
              padding: '14px',
              background: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #DED8CA',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ overflow: 'hidden' }}>
                <p style={{ fontSize: '13px', fontWeight: 800, color: '#24302A', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  {user?.name || 'Administrator'}
                </p>
                <p style={{ fontSize: '11.5px', color: '#5F665F' }}>
                  {user?.phone || user?.email || 'admin@gramsaarthi.in'}
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                width: '100%',
                padding: '9px',
                borderRadius: '8px',
                background: '#FEE8E8',
                border: '1px solid #F3C7C7',
                color: '#C94A3B',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              <LogOut size={14} />
              <span>{t('auth.logout') || 'Logout'}</span>
            </button>
          </div>
        </aside>

        {/* ── Main Admin Content ────────────────────────────────────── */}
        <main className="app-main gs-animate-fade-in" key={pathname} style={{ flex: 1, padding: '24px', width: '100%' }}>
          {children}
        </main>
      </div>

      {/* ── Toasts ─────────────────────────────────────────────────── */}
      <div
        style={{
          position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 500, display: 'flex', flexDirection: 'column', gap: '8px',
          alignItems: 'center', pointerEvents: 'none',
        }}
      >
        {toasts.map(t => (
          <div
            key={t.id}
            style={{
              background: toastBg(t.type), color: '#FFFFFF', padding: '12px 22px',
              borderRadius: '12px', fontSize: '14px', fontWeight: 600,
              boxShadow: 'var(--gs-shadow-lg)', animation: 'gs-fade-up 0.3s ease',
              pointerEvents: 'auto', maxWidth: '360px', textAlign: 'center',
            }}
          >
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}
