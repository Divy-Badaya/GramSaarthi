import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Briefcase, TrendingUp, Sparkles, User } from 'lucide-react';
import { useT } from '../../locales/index.js';

export default function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const t = useT();

  const NAV = [
    { path: '/', label: t('nav.home') || 'Home', icon: Home },
    { path: '/business/assessment', label: t('nav.assessment') || 'Assessment', icon: Briefcase },
    { path: '/ai-advisor', label: 'AI Saarthi', icon: Sparkles, accent: true },
    { path: '/finance', label: t('nav.finance') || 'Finance', icon: TrendingUp },
    { path: '/profile', label: t('nav.profile') || 'Profile', icon: User },
  ];

  const isActive = (path) => (path === '/' ? pathname === '/' || pathname === '/home' : pathname.startsWith(path));

  return (
    <nav className="gs-bottom-nav hide-desktop" role="navigation" aria-label={t('common.main_nav') || 'Main navigation'}>
      {NAV.map(({ path, label, icon: Icon, accent }) => {
        const active = isActive(path);
        return (
          <button
            key={path}
            className={`gs-bottom-nav-item ${active ? 'active' : ''}`}
            onClick={() => navigate(path)}
            aria-current={active ? 'page' : undefined}
            style={{
              color: active ? '#355E3B' : '#5F665F',
              background: 'none', border: 'none',
            }}
          >
            {accent && !active && (
              <span
                style={{
                  position: 'absolute',
                  top: '6px',
                  right: '50%',
                  transform: 'translateX(10px)',
                  width: '6px',
                  height: '6px',
                  background: '#C96B3B',
                  borderRadius: '50%',
                  display: 'block',
                }}
              />
            )}
            <Icon
              size={active && accent ? 24 : 22}
              strokeWidth={active ? 2.5 : 1.8}
              color={active ? '#355E3B' : accent ? '#C96B3B' : '#5F665F'}
            />
            <span style={{ fontSize: '10.5px', fontWeight: active ? 700 : 500 }}>
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
