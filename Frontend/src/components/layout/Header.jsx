import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Globe, Menu, X, Bell, User as UserIcon, LogOut,
  ShieldCheck, FileText, FileCheck, CheckCircle, AlertTriangle, ChevronDown, Sparkles,
  Compass, Lightbulb, ArrowLeftRight, IndianRupee, Calculator, Award,
  FileSpreadsheet, Layers, FolderArchive
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getUserInitials } from '../../services/userService.js';
import { useT, getLangCode } from '../../locales/index.js';

export default function Header({ onMenuToggle, menuOpen }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const t = useT();
  const {
    notifications,
    notificationsList,
    unreadNotificationsCount,
    markAsRead,
    markAllAsRead,
    lang,
    setLang,
    user,
    isAuthenticated,
    logout,
    profileCompletion,
  } = useApp();
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const timeoutRef = useRef(null);

  // Close menus when route changes
  useEffect(() => {
    setActiveDropdown(null);
    setNotifOpen(false);
    setProfileOpen(false);
  }, [pathname]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleMouseEnter = (menuId) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setActiveDropdown(menuId);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setActiveDropdown(null);
    }, 220);
  };

  const handleDropdownClick = (menuId) => {
    setActiveDropdown((prev) => (prev === menuId ? null : menuId));
  };

  const handleItemClick = (path) => {
    setActiveDropdown(null);
    navigate(path);
  };

  const getNotifIconConfig = (type) => {
    switch (type) {
      case 'document':
        return { icon: FileCheck, color: '#355E3B', bg: '#E7F0DE' };
      case 'dpr':
        return { icon: FileSpreadsheet, color: '#C96B3B', bg: '#FBEADF' };
      case 'scheme':
      case 'application':
        return { icon: Award, color: '#D9A441', bg: '#FEF9E7' };
      default:
        return { icon: Sparkles, color: '#355E3B', bg: '#E7F0DE' };
    }
  };

  const initials = getUserInitials(user?.name || user?.full_name || 'Ramesh Kumar');

  // Signed-out navigation links matching Figma exactly
  const SIGNED_OUT_NAV_LINKS = [
    { label: t('landing.nav_home', 'Home'), path: '/' },
    { label: t('landing.nav_find_business', 'Find a business'), path: '/business' },
    { label: t('landing.nav_schemes', 'Schemes & Funding'), path: '/schemes' },
    { label: t('landing.nav_resources', 'Resources'), path: '/dpr' },
    { label: t('landing.nav_about', 'About'), path: '/help' },
  ];

  // Signed-in grouped navigation
  const SIGNED_IN_MENUS = [
    {
      id: 'home',
      label: t('landing.nav_home', 'Home'),
      path: '/',
      isActive: pathname === '/' || pathname === '/home',
      hasDropdown: false,
    },
    {
      id: 'discover',
      label: t('nav.discover', 'Discover'),
      isActive: pathname.startsWith('/business') || pathname.startsWith('/assessment'),
      hasDropdown: true,
      items: [
        { label: t('nav.biz_overview', 'Business overview'), path: '/business', icon: Compass },
        { label: t('nav.start_assessment', 'Start assessment'), path: '/business/assessment', icon: CheckCircle },
        { label: t('nav.biz_ideas', 'Business ideas'), path: '/business/ideas', icon: Lightbulb },
        { label: t('nav.compare_biz', 'Compare business'), path: '/business/compare', icon: ArrowLeftRight },
      ],
    },
    {
      id: 'finance',
      label: t('nav.finance', 'Finance'),
      isActive: pathname.startsWith('/finance') || pathname.startsWith('/schemes') || pathname.startsWith('/dpr'),
      hasDropdown: true,
      items: [
        { label: t('nav.finance', 'Finance'), path: '/finance', icon: IndianRupee },
        { label: t('nav.loan_eligibility', 'Loan eligibility'), path: '/finance/loan', icon: Calculator },
        { label: t('nav.calculators', 'Calculators'), path: '/finance/calculator', icon: Calculator },
        { label: t('nav.schemes', 'Schemes'), path: '/schemes', icon: Award },
        { label: t('nav.dpr', 'DPR'), path: '/dpr', icon: FileSpreadsheet },
      ],
    },
    {
      id: 'myspace',
      label: t('nav.myspace', 'My space'),
      isActive: pathname.startsWith('/applications') || pathname.startsWith('/documents') || pathname.startsWith('/profile'),
      hasDropdown: true,
      items: [
        { label: t('nav.applications', 'Applications'), path: '/applications', icon: Layers },
        { label: t('nav.my_document', 'My document'), path: '/documents', icon: FolderArchive },
        { label: t('nav.profile', 'Profile'), path: '/profile', icon: UserIcon },
      ],
    },
    {
      id: 'about',
      label: t('landing.nav_about', 'About'),
      path: '/help',
      isActive: pathname.startsWith('/help'),
      hasDropdown: false,
    },
  ];

  const isNavActive = (path) => {
    if (path === '/') return pathname === '/' || pathname === '/home';
    return pathname.startsWith(path);
  };

  return (
    <header className="sticky top-0 z-50 bg-[#FFF9F0]/95 backdrop-blur border-b border-[#DED8CA]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 h-[72px] flex items-center justify-between">
        {/* Left: Brand */}
        <div
          onClick={() => navigate('/')}
          className="flex items-center gap-3 cursor-pointer select-none group"
        >
          <img
            src="/logo.png"
            alt="GramSaarthi Logo"
            className="w-10 h-10 rounded-xl object-contain shadow-xs transition-transform group-hover:scale-105"
          />
          <div>
            <div className="font-bold text-xl text-[#214A32] tracking-tight leading-none">
              GramSaarthi
            </div>
            <div className="text-xs text-[#5C6F64] tracking-wide mt-1">
              {t('landing.tagline') || 'Saath Hai, Toh Sambhav Hai'}
            </div>
          </div>
        </div>

        {/* Center: Desktop Nav with Full Height Hover Zone */}
        <nav className="h-full hidden lg:flex items-center gap-1 xl:gap-2">
          {isAuthenticated ? (
            // Authenticated: Grouped dropdowns
            SIGNED_IN_MENUS.map((menu) => {
              if (!menu.hasDropdown) {
                return (
                  <button
                    key={menu.id}
                    onClick={() => navigate(menu.path)}
                    className={`h-full flex items-center text-sm font-medium transition-colors bg-transparent border-0 cursor-pointer px-3.5 relative ${
                      menu.isActive
                        ? 'text-[#355E3B] font-semibold'
                        : 'text-[#24302A] hover:text-[#355E3B]'
                    }`}
                  >
                    <span>{menu.label}</span>
                    {menu.isActive && (
                      <span className="absolute bottom-0 left-3 right-3 h-[3px] bg-[#355E3B] rounded-t-full" />
                    )}
                  </button>
                );
              }

              const isOpen = activeDropdown === menu.id;

              return (
                <div
                  key={menu.id}
                  className="h-full flex items-center relative group"
                  onMouseEnter={() => handleMouseEnter(menu.id)}
                  onMouseLeave={handleMouseLeave}
                >
                  <button
                    onClick={() => handleDropdownClick(menu.id)}
                    className={`h-full flex items-center gap-1.5 text-sm font-medium transition-colors bg-transparent border-0 cursor-pointer px-3.5 relative ${
                      menu.isActive
                        ? 'text-[#355E3B] font-semibold'
                        : 'text-[#24302A] group-hover:text-[#355E3B]'
                    }`}
                  >
                    <span>{menu.label}</span>
                    <ChevronDown
                      size={14}
                      className={`transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-[#355E3B]' : 'text-[#7B827A] group-hover:text-[#355E3B] group-hover:rotate-180'
                      }`}
                    />
                    {menu.isActive && (
                      <span className="absolute bottom-0 left-3 right-3 h-[3px] bg-[#355E3B] rounded-t-full" />
                    )}
                  </button>

                  {/* Dropdown panel - Dual CSS group-hover & JS isOpen support */}
                  <div
                    className={`absolute top-full left-0 pt-1 z-50 transition-all duration-150 ${
                      isOpen
                        ? 'opacity-100 pointer-events-auto translate-y-0 visible'
                        : 'opacity-0 pointer-events-none -translate-y-1 invisible group-hover:opacity-100 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:visible'
                    }`}
                    onMouseEnter={() => handleMouseEnter(menu.id)}
                    onMouseLeave={handleMouseLeave}
                  >
                    <div className="w-56 bg-[#FFF9F0] border border-[#DED8CA] rounded-2xl shadow-xl overflow-hidden p-2 space-y-1">
                      {menu.items.map((item) => {
                        const Icon = item.icon;
                        const isItemActive = pathname === item.path;
                        return (
                          <button
                            key={item.path}
                            onClick={() => handleItemClick(item.path)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition text-left cursor-pointer border-0 ${
                              isItemActive
                                ? 'bg-[#E7F0DE] text-[#214A32]'
                                : 'text-[#24302A] hover:bg-[#F4EBDD]'
                            }`}
                          >
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                isItemActive ? 'bg-[#355E3B] text-white' : 'bg-[#F4EBDD] text-[#355E3B]'
                              }`}
                            >
                              <Icon size={14} />
                            </div>
                            <span className="truncate">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            // Signed-Out: Direct Figma Nav Links
            SIGNED_OUT_NAV_LINKS.map((item) => {
              const active = isNavActive(item.path);
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`h-full flex items-center text-sm font-medium transition-colors bg-transparent border-0 cursor-pointer px-3.5 relative ${
                    active
                      ? 'text-[#355E3B] font-semibold'
                      : 'text-[#24302A] hover:text-[#355E3B]'
                  }`}
                >
                  <span>{item.label}</span>
                  {active && (
                    <span className="absolute bottom-0 left-3 right-3 h-[3px] bg-[#355E3B] rounded-t-full" />
                  )}
                </button>
              );
            })
          )}
        </nav>

        {/* Right Actions (Desktop) */}
        <div className="hidden lg:flex items-center gap-3">
          {/* Language Selector (Native styled select matching Figma) */}
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            className="h-[38px] text-[13px] font-semibold border rounded-xl px-3 outline-none cursor-pointer transition-colors shadow-2xs"
            style={{ borderColor: "#DED8CA", color: "#5F665F", background: "#FFF9F0" }}
          >
            <option>English</option>
            <option>हिन्दी</option>
            <option>ગુજરાતી</option>
          </select>

          {/* Notifications button (when logged in or general alerts) */}
          {isAuthenticated && (
            <div className="relative">
              <button
                className="w-[38px] h-[38px] rounded-xl flex items-center justify-center text-[#5C6F64] hover:bg-[#F4EBDD] transition-colors relative cursor-pointer border border-[#DED8CA] bg-white shadow-2xs"
                title={t('header.notifications') || 'Notifications'}
                aria-label="Notifications"
                onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); }}
              >
                <Bell size={18} />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#C96B3B] text-white text-[10px] font-extrabold flex items-center justify-center border-2 border-[#FFF9F0]">
                    {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute top-12 right-0 bg-[#FFF9F0] border border-[#DED8CA] rounded-2xl shadow-xl z-50 w-[360px] overflow-hidden flex flex-col max-h-[480px]">
                  {/* Dropdown Header */}
                  <div className="p-3.5 border-b border-[#DED8CA] flex justify-between items-center bg-[#F4EBDD]/60 shrink-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-[#24302A]">{t('header.notifications') || 'Notifications'}</p>
                      {unreadNotificationsCount > 0 && (
                        <span className="text-[11px] font-bold bg-[#FBEADF] text-[#C96B3B] px-2 py-0.5 rounded-full">
                          {unreadNotificationsCount} {t('common.new') || 'new'}
                        </span>
                      )}
                    </div>
                    {unreadNotificationsCount > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markAllAsRead();
                        }}
                        className="text-[11px] font-bold text-[#355E3B] hover:text-[#214A32] hover:underline cursor-pointer bg-transparent border-0 p-0"
                      >
                        {t('notif.mark_all_read') || 'Mark all as read'}
                      </button>
                    )}
                  </div>

                  {/* Dropdown Items List */}
                  <div className="divide-y divide-[#EAE4D6] overflow-y-auto max-h-[380px]">
                    {notificationsList.length === 0 ? (
                      <div className="py-10 px-4 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-[#E7F0DE] text-[#355E3B] flex items-center justify-center mx-auto mb-2.5">
                          <Bell size={22} />
                        </div>
                        <p className="text-xs font-bold text-[#24302A]">All caught up!</p>
                        <p className="text-[11px] text-[#5F665F] mt-1">No pending notifications at this moment.</p>
                      </div>
                    ) : (
                      notificationsList.map((n) => {
                        const iconConfig = getNotifIconConfig(n.type);
                        const Icon = iconConfig.icon;
                        const isUnread = !n.is_read;

                        return (
                          <div
                            key={n.id}
                            onClick={() => {
                              markAsRead(n.id);
                              if (n.link) navigate(n.link);
                              setNotifOpen(false);
                            }}
                            className={`flex gap-3 p-3.5 hover:bg-[#F4EBDD] cursor-pointer transition-colors ${
                              isUnread ? 'bg-[#FFF9F0]' : 'bg-white/40'
                            }`}
                          >
                            <div
                              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                              style={{ background: iconConfig.bg }}
                            >
                              <Icon size={17} color={iconConfig.color} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <p className={`text-xs ${isUnread ? 'font-bold text-[#24302A]' : 'font-medium text-[#5F665F]'} truncate`}>
                                  {n.title}
                                </p>
                                {isUnread && (
                                  <span className="w-2 h-2 rounded-full bg-[#C96B3B] shrink-0" />
                                )}
                              </div>
                              <p className="text-[11px] text-[#5C6F64] mt-0.5 line-clamp-2 leading-relaxed">
                                {n.message}
                              </p>
                              <p className="text-[10px] text-[#8C9B90] mt-1 font-medium">
                                {n.time_ago || 'Recently'}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Auth State: Profile dropdown if logged in, otherwise Login/Signup */}
          {isAuthenticated ? (
            <div className="relative">
              <button
                className="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-[#355E3B]/20 transition cursor-pointer border-0 bg-transparent"
                onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); }}
                aria-label="User Profile"
              >
                <div className="w-9 h-9 rounded-xl bg-[#355E3B] text-white flex items-center justify-center text-sm font-bold shadow-sm">
                  {initials}
                </div>
              </button>

              {profileOpen && (
                <div className="absolute top-12 right-0 bg-[#FFF9F0] border border-[#DED8CA] rounded-2xl shadow-xl z-50 w-64 overflow-hidden">
                  <div className="p-4 border-b border-[#DED8CA] bg-[#F4EBDD]/30">
                    <p className="font-bold text-sm text-[#24302A] truncate">
                      {user?.name || user?.full_name || 'Entrepreneur'}
                    </p>
                    <p className="text-xs text-[#5C6F64] mt-0.5 truncate">
                      {user?.mobile_number || user?.phone || user?.email || '+91 98765 43210'}
                    </p>
                    <div className="mt-3">
                      <div className="flex justify-between text-[11px] font-semibold text-[#5C6F64] mb-1">
                        <span>{t('profile.completion') || 'Profile Completion'}</span>
                        <span className="text-[#355E3B] font-bold">{profileCompletion?.percentage || 0}%</span>
                      </div>
                      <div className="w-full bg-[#EAE4D6] h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[#355E3B] h-full rounded-full transition-all duration-300"
                          style={{ width: `${profileCompletion?.percentage || 0}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-2 space-y-1">
                    <button
                      onClick={() => { setProfileOpen(false); navigate('/profile'); }}
                      className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-semibold text-[#24302A] hover:bg-[#F4EBDD] transition text-left cursor-pointer border-0"
                    >
                      <UserIcon size={15} className="text-[#355E3B]" />
                      <span>{t('nav.profile') || 'My Profile'}</span>
                    </button>

                    <button
                      onClick={() => { setProfileOpen(false); navigate('/applications'); }}
                      className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-semibold text-[#24302A] hover:bg-[#F4EBDD] transition text-left cursor-pointer border-0"
                    >
                      <FileText size={15} className="text-[#355E3B]" />
                      <span>{t('nav.applications') || 'My Applications'}</span>
                    </button>

                    {(user?.is_admin || user?.role === 'admin') && (
                      <button
                        onClick={() => { setProfileOpen(false); navigate('/admin'); }}
                        className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-semibold text-[#C96B3B] hover:bg-[#FBEADF] transition text-left cursor-pointer border-0"
                      >
                        <ShieldCheck size={15} className="text-[#C96B3B]" />
                        <span>{t('admin.badge') || 'Admin Panel'}</span>
                      </button>
                    )}

                    <div className="border-t border-[#DED8CA] my-1 pt-1">
                      <button
                        onClick={() => {
                          setProfileOpen(false);
                          logout();
                          navigate('/');
                        }}
                        className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-semibold text-[#C94A3B] hover:bg-[#FEE8E8] transition text-left cursor-pointer border-0"
                      >
                        <LogOut size={15} className="text-[#C94A3B]" />
                        <span>{t('auth.logout') || 'Logout'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => navigate('/login')}
                className="text-[15px] font-medium px-4 py-2 rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                style={{ color: "#355E3B", background: "transparent", border: "none" }}
              >
                {t('landing.login', 'Login')}
              </button>
              <button
                onClick={() => navigate('/signup')}
                className="text-[15px] font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                style={{ background: "#355E3B", color: "#ffffff", border: "none" }}
              >
                {t('landing.signup', 'Sign Up')}
              </button>
            </div>
          )}
        </div>

        {/* Mobile hamburger menu toggle */}
        <button
          onClick={onMenuToggle}
          className="lg:hidden text-2xl p-2 rounded-xl transition-colors cursor-pointer"
          style={{ color: "#355E3B", background: "none", border: "none" }}
          aria-label={menuOpen ? 'Close Menu' : 'Open Menu'}
        >
          {menuOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Backdrop for open modals (notifications or profile) */}
      {(notifOpen || profileOpen) && (
        <div
          className="fixed inset-0 z-40 bg-transparent"
          onClick={() => { setNotifOpen(false); setProfileOpen(false); }}
        />
      )}
    </header>
  );
}
