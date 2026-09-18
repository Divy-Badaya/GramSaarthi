import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useT } from '../../locales/index.js';
import { useApp } from '../../context/AppContext.jsx';

export default function Footer({ showCta = true }) {
  const navigate = useNavigate();
  const t = useT();
  const { lang, setLang, assessment, user } = useApp();

  const hasChosenBusiness = Boolean(
    assessment?.business ||
    user?.business ||
    (assessment?.score && assessment.score > 0)
  );

  const shouldShowCta = showCta && !hasChosenBusiness;

  const footerCols = [
    {
      heading: t('landing.footer_col_platform', 'Platform'),
      links: [
        { label: t('landing.footer_link_find_biz', 'Find a Business'), path: '/business' },
        { label: t('landing.footer_link_schemes', 'Schemes & Funding'), path: '/schemes' },
        { label: t('landing.footer_link_biz_plan', 'Business Plan'), path: '/dpr' },
        { label: t('landing.footer_link_resources', 'Resources'), path: '/documents' },
      ],
    },
    {
      heading: t('landing.footer_col_company', 'Company'),
      links: [
        { label: t('landing.footer_link_about', 'About Us'), path: '/help' },
        { label: t('landing.footer_link_partners', 'Partners'), path: '/help' },
        { label: t('landing.footer_link_privacy', 'Privacy Policy'), path: '/help' },
        { label: t('landing.footer_link_contact', 'Contact'), path: '/help' },
      ],
    },
    {
      heading: t('landing.footer_col_languages', 'Languages'),
      links: [
        { label: 'English', action: () => setLang('English') },
        { label: 'हिन्दी', action: () => setLang('हिन्दी') },
        { label: 'ગુજરાતી', action: () => setLang('ગુજરાતી') },
      ],
    },
  ];

  return (
    <div>
      {/* ── Footer CTA (Pre-Footer) ── */}
      {shouldShowCta && (
        <section style={{ background: '#355E3B' }} className="py-20 text-center">
          <div className="max-w-2xl mx-auto px-6">
            <h2 className="text-[34px] lg:text-[46px] font-bold mb-5" style={{ color: '#FFF9F0', lineHeight: 1.2 }}>
              {t('landing.footer_cta_h2', 'Your business is waiting.')}
            </h2>
            <p className="text-[17px] lg:text-[18px] mb-10" style={{ color: '#A8C98A', lineHeight: 1.6 }}>
              {t('landing.footer_cta_body', "Start free. No experience needed. GramSaarthi will guide you — step by step.")}
            </p>
            <button
              onClick={() => navigate('/business/assessment')}
              className="text-[16px] lg:text-[17px] font-semibold px-10 py-4 rounded-xl hover:opacity-90 transition-opacity cursor-pointer inline-flex items-center justify-center gap-2"
              style={{ background: '#C96B3B', color: '#FFFFFF', minHeight: '56px', border: 'none' }}
            >
              {t('landing.footer_cta_btn', "Get Started — It's Free →")}
            </button>
          </div>
        </section>
      )}

      {/* ── Main Footer ── */}
      <footer style={{ background: '#24302A' }} className="py-14">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
          <div className="flex flex-col lg:flex-row gap-12 justify-between">
            <div className="max-w-xs">
              <div className="flex items-center gap-3 mb-4 cursor-pointer" onClick={() => navigate('/')}>
                <img
                  src="/logo.png"
                  alt="GramSaarthi Logo"
                  className="w-9 h-9 rounded-xl object-contain shadow-xs flex-shrink-0"
                />
                <div className="font-bold text-[17px]" style={{ color: '#FFF9F0' }}>
                  GramSaarthi
                </div>
              </div>
              <p className="text-[14px] leading-relaxed" style={{ color: '#8E968E' }}>
                {t('landing.footer_tagline') || "A trusted digital companion for India's rural and small-town entrepreneurs."}
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-8 lg:gap-16">
              {footerCols.map((col) => (
                <div key={col.heading}>
                  <div className="text-[12px] font-semibold uppercase tracking-widest mb-4" style={{ color: '#6F8F4E' }}>
                    {col.heading}
                  </div>
                  <div className="flex flex-col gap-3">
                    {col.links.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          if (item.action) item.action();
                          else if (item.path) navigate(item.path);
                        }}
                        className="text-left text-[14px] hover:opacity-80 transition-opacity cursor-pointer border-none bg-transparent p-0"
                        style={{ color: '#A1A8A1' }}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            className="mt-12 pt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-[13px]"
            style={{ borderTop: '1px solid rgba(255,249,240,0.08)', color: '#8E968E' }}
          >
            <span>{t('landing.footer_copy') || "© 2026 GramSaarthi. Made with care for rural India."}</span>
            <span>{t('landing.footer_gov') || "Ministry of MSME · Government of India Initiative"}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
