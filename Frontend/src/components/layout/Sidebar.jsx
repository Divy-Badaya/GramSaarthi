import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Home, Briefcase, Bot, Map, BookOpen, GitCompare,
  TrendingUp, PiggyBank, Calculator, Landmark, FileText,
  ClipboardList, FolderOpen, User, HelpCircle, Sparkles,
  LogOut, LogIn, ShieldCheck,
} from 'lucide-react';
import { useT } from '../../locales/index.js';
import { useApp } from '../../context/AppContext.jsx';

export default function Sidebar({ onClose }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const t = useT();
  const { user, isAuthenticated, logout, profileCompletion } = useApp();

  const SECTIONS = [
    {
      title: null,
      items: [
        { path: '/', label: t('nav.home') || 'Home', icon: Home },
      ],
    },
    {
      title: t('sidebar.discover') || 'Discover',
      items: [
        { path: '/business', label: t('sidebar.business_overview') || 'Business Hub', icon: Briefcase },
        { path: '/business/assessment', label: t('nav.assessment') || 'Assessment', icon: Map },
        { path: '/business/ideas', label: t('sidebar.business_ideas') || 'Business Ideas', icon: BookOpen },
        { path: '/business/compare', label: t('sidebar.compare') || 'Compare Options', icon: GitCompare },
      ],
    },
    {
      title: t('nav.finance') || 'Finance & Schemes',
      items: [
        { path: '/finance', label: t('nav.finance') || 'Financial Plan', icon: TrendingUp },
        { path: '/finance/loan', label: t('sidebar.loan_calc') || 'Loan Eligibility', icon: PiggyBank },
        { path: '/finance/calculator', label: t('sidebar.calculators') || 'Calculators', icon: Calculator },
        { path: '/schemes', label: t('nav.schemes') || 'Govt Schemes', icon: Landmark },
        { path: '/dpr', label: t('nav.dpr') || 'Business Plan (DPR)', icon: FileText },
      ],
    },
    {
      title: t('sidebar.my_space') || 'My Workspace',
      items: [
        { path: '/applications', label: t('sidebar.applications') || 'Applications', icon: ClipboardList },
        { path: '/documents', label: t('sidebar.documents') || 'Documents', icon: FolderOpen },
        { path: '/profile', label: t('nav.profile') || 'Profile', icon: User },
      ],
    },
    ...((user?.is_admin || user?.role === 'admin') ? [{
      title: t('admin.badge') || 'Admin Area',
      items: [
        { path: '/admin', label: t('admin.nav_dashboard') || 'Admin Dashboard', icon: ShieldCheck },
        { path: '/admin/documents', label: t('admin.nav_doc_verification') || 'Document Verification', icon: FileText },
      ],
    }] : []),
    {
      title: t('sidebar.support') || 'Support',
      items: [
        { path: '/help', label: t('nav.help') || 'Help & Support', icon: HelpCircle },
      ],
    },
  ];

  const isActive = (path) => (path === '/' ? pathname === '/' || pathname === '/home' : pathname.startsWith(path));

  const handleNav = (path) => {
    navigate(path);
    onClose?.();
  };

  return (
    <aside className="app-sidebar" style={{ background: '#FFF9F0' }}>
      {/* AI Advisor promo banner at top */}
      <div style={{ margin: '4px 8px 16px' }}>
        <button
          onClick={() => handleNav('/ai-advisor')}
          style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            width: '100%', padding: '12px 14px',
            background: isActive('/ai-advisor') ? '#214A32' : '#355E3B',
            borderRadius: '14px', border: 'none', cursor: 'pointer',
            transition: 'all 180ms ease', textAlign: 'left',
            boxShadow: '0 3px 10px rgba(53,94,59,0.25)',
          }}
        >
          <div
            style={{
              width: '32px', height: '32px', borderRadius: '10px',
              background: '#E7F0DE', display: 'flex', alignItems: 'center',
              justifyContent: 'center', flexShrink: 0,
            }}
          >
            <Sparkles size={16} color="#355E3B" />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '13.5px', fontWeight: 700, color: '#FFFFFF' }}>
              {t('nav.ai_advisor') || 'Talk to GramSaarthi'}
            </p>
            <p style={{ fontSize: '10.5px', color: '#D2E5C3', marginTop: '1px' }}>
              {t('sidebar.ask_anything') || 'Ask any business query'}
            </p>
          </div>
          <span
            style={{
              fontSize: '10px', fontWeight: 700,
              background: '#C96B3B', color: '#FFFFFF',
              padding: '2px 7px', borderRadius: '999px',
            }}
          >
            {t('sidebar.live') || 'Online'}
          </span>
        </button>
      </div>

      {/* Sections */}
      {SECTIONS.map((section, si) => (
        <div key={si} style={{ marginBottom: '8px' }}>
          {section.title && (
            <p
              style={{
                padding: '8px 16px 4px',
                fontSize: '11px', fontWeight: 700,
                color: '#6F8F4E',
                textTransform: 'uppercase', letterSpacing: '0.08em',
              }}
            >
              {section.title}
            </p>
          )}
          {section.items.map(({ path, label, icon: Icon }) => {
            const active = isActive(path);
            return (
              <button
                key={path}
                className={`gs-nav-item ${active ? 'active' : ''}`}
                onClick={() => handleNav(path)}
                style={{ width: 'calc(100% - 16px)' }}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={18} strokeWidth={active ? 2.5 : 1.8} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '14px' }}>{label}</span>
              </button>
            );
          })}
          {si < SECTIONS.length - 1 && (
            <div style={{ height: '1px', background: '#DED8CA', margin: '8px 16px', opacity: 0.7 }} />
          )}
        </div>
      ))}

      {/* User Auth Card & Action */}
      <div
        style={{
          margin: '16px 8px 6px', padding: '14px',
          background: '#FFFFFF', borderRadius: '14px',
          border: '1px solid #DED8CA',
        }}
      >
        {isAuthenticated ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ overflow: 'hidden' }}>
                <p style={{ fontSize: '13.5px', fontWeight: 700, color: '#24302A', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  {user?.name || user?.full_name || 'User'}
                </p>
                <p style={{ fontSize: '11.5px', color: '#5F665F', marginTop: '1px' }}>
                  {profileCompletion?.percentage || 0}% {t('profile.completed') || 'Profile Complete'}
                </p>
              </div>
              <button
                onClick={() => {
                  logout();
                  handleNav('/login');
                }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#5F665F', padding: '6px', borderRadius: '6px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
                title={t('auth.logout') || 'Logout'}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#C94A3B'; e.currentTarget.style.background = '#FEE8E8'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#5F665F'; e.currentTarget.style.background = 'none'; }}
              >
                <LogOut size={16} />
              </button>
            </div>
            <div className="gs-progress" style={{ height: '5px', marginTop: '10px' }}>
              <div className="gs-progress-fill" style={{ width: `${profileCompletion?.percentage || 0}%` }} />
            </div>
          </div>
        ) : (
          <button
            onClick={() => handleNav('/login')}
            className="gs-btn gs-btn-primary"
            style={{
              width: '100%', fontSize: '13px', padding: '10px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '6px', minHeight: '40px', borderRadius: '10px',
            }}
          >
            <LogIn size={15} />
            <span>{t('auth.login') || 'Sign In / Register'}</span>
          </button>
        )}
      </div>

      {/* Version Tagline */}
      <div style={{ padding: '12px 16px 8px' }}>
        <p style={{ fontSize: '11px', color: '#7D847D', textAlign: 'center' }}>
          GramSaarthi · Saath Hai, Toh Sambhav Hai
        </p>
      </div>
    </aside>
  );
}
