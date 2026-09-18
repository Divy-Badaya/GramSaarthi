import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import AdminLayout from './AdminLayout';
import { useApp } from '../../context/AppContext';
import { useT } from '../../locales/index.js';
import {
  Home, Compass, Award, Sparkles, FileText, HelpCircle,
  User as UserIcon, LogIn, LogOut, ShieldCheck, ChevronRight, ChevronDown,
  CheckCircle, Lightbulb, ArrowLeftRight, IndianRupee, Calculator,
  FileSpreadsheet, Layers, FolderArchive
} from 'lucide-react';

export default function AppShell({ children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openSection, setOpenSection] = useState(null);
  const navigate = useNavigate();
  const t = useT();
  const { toasts, isAuthenticated, user, logout } = useApp();
  const { pathname } = useLocation();

  // Close mobile menu on page navigation
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // If viewing admin control panel, render dedicated AdminLayout
  if (pathname.startsWith('/admin')) {
    return <AdminLayout>{children}</AdminLayout>;
  }

  const isAuthPage = pathname === '/login' || pathname === '/signup';

  const toastBg = (type) => {
    if (type === 'error' || type === 'danger') return '#C94A3B';
    if (type === 'warning') return '#D9A441';
    if (type === 'success') return '#355E3B';
    return '#214A32';
  };

  if (isAuthPage) {
    return (
      <div className="min-h-screen bg-[#FFF9F0] flex flex-col justify-between">
        <Header onMenuToggle={() => setMobileMenuOpen(o => !o)} menuOpen={mobileMenuOpen} />
        <div className="flex-1 flex items-center justify-center p-4">
          {children}
        </div>
        {/* Toast notifications */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center pointer-events-none">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="text-white px-5 py-3 rounded-xl text-sm font-semibold shadow-lg pointer-events-auto max-w-sm text-center animate-fade-in"
              style={{ background: toastBg(toast.type) }}
            >
              {toast.msg}
            </div>
          ))}
        </div>
      </div>
    );
  }

  const SIGNED_OUT_NAV_ITEMS = [
    { label: t('landing.nav_home', 'Home'), path: '/', icon: Home },
    { label: t('landing.nav_find_business', 'Find a Business'), path: '/business', icon: Compass },
    { label: t('landing.nav_schemes', 'Schemes & Funding'), path: '/schemes', icon: Award },
    { label: t('landing.nav_resources', 'Resources'), path: '/dpr', icon: FileText },
    { label: t('landing.nav_about', 'About'), path: '/help', icon: HelpCircle },
    { label: t('nav.ai_advisor', 'AI Advisor'), path: '/ai-advisor', icon: Sparkles },
  ];

  const SIGNED_IN_GROUPS = [
    {
      id: 'discover',
      label: t('nav.discover', 'Discover'),
      icon: Compass,
      isActive: pathname.startsWith('/business') || pathname.startsWith('/assessment'),
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
      icon: IndianRupee,
      isActive: pathname.startsWith('/finance') || pathname.startsWith('/schemes') || pathname.startsWith('/dpr'),
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
      icon: Layers,
      isActive: pathname.startsWith('/applications') || pathname.startsWith('/documents') || pathname.startsWith('/profile'),
      items: [
        { label: t('nav.applications', 'Applications'), path: '/applications', icon: Layers },
        { label: t('nav.my_document', 'My document'), path: '/documents', icon: FolderArchive },
        { label: t('nav.profile', 'Profile'), path: '/profile', icon: UserIcon },
      ],
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#FFF9F0] text-[#24302A] font-sans antialiased">
      {/* Figma Sticky Header */}
      <Header onMenuToggle={() => setMobileMenuOpen(o => !o)} menuOpen={mobileMenuOpen} />

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-[#214A32]/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer Menu */}
          <div className="fixed inset-y-0 right-0 max-w-xs w-full bg-[#FFF9F0] shadow-2xl p-6 flex flex-col justify-between overflow-y-auto border-l border-[#DED8CA] z-50 animate-slide-in">
            <div>
              {/* Header inside drawer */}
              <div className="flex items-center justify-between pb-5 border-b border-[#DED8CA]">
                <div className="flex items-center gap-3">
                  <img
                    src="/logo.png"
                    alt="GramSaarthi Logo"
                    className="w-9 h-9 rounded-xl object-contain shadow-xs"
                  />
                  <div>
                    <span className="font-bold text-base text-[#214A32]">GramSaarthi</span>
                    <p className="text-[11px] text-[#5C6F64]">Saath Hai, Toh Sambhav Hai</p>
                  </div>
                </div>
              </div>

              {/* Navigation links */}
              <div className="py-5 space-y-1">
                {isAuthenticated ? (
                  <>
                    {/* Home button */}
                    <button
                      onClick={() => {
                        navigate('/');
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-semibold transition-colors cursor-pointer border-0 ${
                        pathname === '/' || pathname === '/home'
                          ? 'bg-[#E7F0DE] text-[#214A32]'
                          : 'text-[#5C6F64] hover:bg-[#F4EBDD] hover:text-[#24302A]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Home size={18} className={pathname === '/' || pathname === '/home' ? 'text-[#355E3B]' : 'text-[#5C6F64]'} />
                        <span>{t('landing.nav_home', 'Home')}</span>
                      </div>
                      <ChevronRight size={16} className="opacity-40" />
                    </button>

                    {/* Grouped sections */}
                    {SIGNED_IN_GROUPS.map((group) => {
                      const Icon = group.icon;
                      const isOpen = openSection === group.id || (openSection === null && group.isActive);

                      return (
                        <div key={group.id} className="pt-1">
                          <button
                            onClick={() => setOpenSection(openSection === group.id ? 'closed' : group.id)}
                            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer border-0 ${
                              group.isActive
                                ? 'bg-[#E7F0DE]/60 text-[#214A32]'
                                : 'text-[#24302A] hover:bg-[#F4EBDD]'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <Icon size={18} className={group.isActive ? 'text-[#355E3B]' : 'text-[#5C6F64]'} />
                              <span>{group.label}</span>
                            </div>
                            <ChevronDown
                              size={16}
                              className={`transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#355E3B]' : 'opacity-40'}`}
                            />
                          </button>

                          {isOpen && (
                            <div className="pl-6 pr-1 py-1 space-y-1">
                              {group.items.map((subItem) => {
                                const SubIcon = subItem.icon;
                                const isSubActive = pathname === subItem.path;
                                return (
                                  <button
                                    key={subItem.path}
                                    onClick={() => {
                                      navigate(subItem.path);
                                      setMobileMenuOpen(false);
                                    }}
                                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer border-0 ${
                                      isSubActive
                                        ? 'bg-[#355E3B] text-white font-semibold'
                                        : 'text-[#5C6F64] hover:bg-[#F4EBDD] hover:text-[#24302A]'
                                    }`}
                                  >
                                    <SubIcon size={14} />
                                    <span>{subItem.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* About */}
                    <button
                      onClick={() => {
                        navigate('/help');
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-semibold transition-colors cursor-pointer border-0 ${
                        pathname.startsWith('/help')
                          ? 'bg-[#E7F0DE] text-[#214A32]'
                          : 'text-[#5C6F64] hover:bg-[#F4EBDD] hover:text-[#24302A]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <HelpCircle size={18} className={pathname.startsWith('/help') ? 'text-[#355E3B]' : 'text-[#5C6F64]'} />
                        <span>{t('landing.nav_about', 'About')}</span>
                      </div>
                      <ChevronRight size={16} className="opacity-40" />
                    </button>

                    {/* AI Advisor */}
                    <button
                      onClick={() => {
                        navigate('/ai-advisor');
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-semibold transition-colors cursor-pointer border-0 ${
                        pathname.startsWith('/ai-advisor')
                          ? 'bg-[#E7F0DE] text-[#214A32]'
                          : 'text-[#5C6F64] hover:bg-[#F4EBDD] hover:text-[#24302A]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Sparkles size={18} className="text-[#355E3B]" />
                        <span>{t('nav.ai_advisor', 'AI Advisor')}</span>
                      </div>
                      <ChevronRight size={16} className="opacity-40" />
                    </button>
                  </>
                ) : (
                  // Signed-out navigation items
                  SIGNED_OUT_NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const isActive = item.path === '/'
                      ? pathname === '/' || pathname === '/home'
                      : pathname.startsWith(item.path);

                    return (
                      <button
                        key={item.path}
                        onClick={() => {
                          navigate(item.path);
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-semibold transition-colors cursor-pointer border-0 ${
                          isActive
                            ? 'bg-[#E7F0DE] text-[#214A32]'
                            : 'text-[#5C6F64] hover:bg-[#F4EBDD] hover:text-[#24302A]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon size={18} className={isActive ? 'text-[#355E3B]' : 'text-[#5C6F64]'} />
                          <span>{item.label}</span>
                        </div>
                        <ChevronRight size={16} className="opacity-40" />
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Bottom Actions inside drawer */}
            <div className="pt-4 border-t border-[#DED8CA] space-y-2">
              {isAuthenticated ? (
                <>
                  <button
                    onClick={() => {
                      navigate('/profile');
                      setMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-[#24302A] hover:bg-[#F4EBDD] cursor-pointer border-0 text-left"
                  >
                    <UserIcon size={18} className="text-[#355E3B]" />
                    <span>{user?.name || user?.full_name || 'My Profile'}</span>
                  </button>

                  {(user?.is_admin || user?.role === 'admin') && (
                    <button
                      onClick={() => {
                        navigate('/admin');
                        setMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-[#C96B3B] hover:bg-[#FBEADF] cursor-pointer border-0 text-left"
                    >
                      <ShieldCheck size={18} className="text-[#C96B3B]" />
                      <span>{t('admin.badge') || 'Admin Panel'}</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                      navigate('/');
                    }}
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-[#C94A3B] hover:bg-[#FEE8E8] cursor-pointer border-0 text-left"
                  >
                    <LogOut size={18} />
                    <span>{t('auth.logout') || 'Logout'}</span>
                  </button>
                </>
              ) : (
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => {
                      navigate('/login');
                      setMobileMenuOpen(false);
                    }}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold text-[#214A32] bg-[#F4EBDD] hover:bg-[#EAE4D6] transition cursor-pointer border-0"
                  >
                    {t('auth.login') || 'Login'}
                  </button>
                  <button
                    onClick={() => {
                      navigate('/signup');
                      setMobileMenuOpen(false);
                    }}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-[#355E3B] hover:bg-[#214A32] shadow-sm transition cursor-pointer border-0"
                  >
                    {t('auth.signup') || 'Sign Up'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area - Full width with desktop container */}
      <main className="flex-1 w-full" key={pathname}>
        {children}
      </main>

      {/* Figma 4-Column Footer with Pre-footer CTA */}
      <Footer />

      {/* Toast notifications */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="text-white px-5 py-3 rounded-xl text-sm font-semibold shadow-lg pointer-events-auto max-w-sm text-center animate-fade-in"
            style={{ background: toastBg(toast.type) }}
          >
            {toast.msg}
          </div>
        ))}
      </div>
    </div>
  );
}
