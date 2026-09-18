import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, ChevronRight, Phone, MessageSquare, HelpCircle, BookOpen, Sparkles } from 'lucide-react';
import { useT } from '../locales/index.js';

export default function Help() {
  const navigate = useNavigate();
  const t = useT();
  const [openFaq, setOpenFaq] = useState(null);

  const faqs = [
    { q: t('help.faq1_q') || 'Is GramSaarthi completely free to use?', a: t('help.faq1_a') || 'Yes, GramSaarthi is 100% free and unbiased for all rural and small-town entrepreneurs across India.' },
    { q: t('help.faq2_q') || 'How does the government scheme recommendation work?', a: t('help.faq2_a') || 'We evaluate your business profile, location, social category, and required investment against central and state government schemes (like PMEGP and Mudra).' },
    { q: t('help.faq3_q') || 'Can I download a bank-ready Detailed Project Report (DPR)?', a: t('help.faq3_a') || 'Yes, you can generate and download a formal multi-page PDF project report formatted according to standard banking guidelines.' },
    { q: t('help.faq4_q') || 'Which languages are supported?', a: t('help.faq4_a') || 'GramSaarthi currently supports Hindi, Gujarati, and English, with more regional Indian languages launching soon.' },
  ];

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-8 lg:py-12">
      {/* Header */}
      <div className="mb-8">
        <span className="inline-block text-xs font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full bg-[#E7F0DE] text-[#355E3B] mb-3">
          Support & Guidance
        </span>
        <h1 className="text-3xl lg:text-4xl font-bold text-[#24302A] tracking-tight">
          {t('help.title') || 'Help & Support'}
        </h1>
        <p className="text-base text-[#5F665F] mt-2 max-w-2xl leading-relaxed">
          {t('help.subtitle') || 'Find quick answers, speak with our AI advisor, or connect with our support team.'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column (7 cols): FAQs & Tutorials */}
        <div className="lg:col-span-7 space-y-8">
          {/* FAQs */}
          <div>
            <h2 className="text-xl font-bold text-[#24302A] mb-4">
              {t('help.faqs') || 'Frequently Asked Questions'}
            </h2>
            <div className="rounded-2xl border border-[#DED8CA] bg-white overflow-hidden shadow-xs divide-y divide-[#DED8CA]">
              {faqs.map((faq, i) => (
                <div key={i}>
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="flex items-center gap-3 p-4 sm:p-5 w-full text-left bg-transparent hover:bg-[#F4EBDD]/40 transition cursor-pointer"
                  >
                    <HelpCircle size={18} className="text-[#355E3B] shrink-0" />
                    <span className="flex-1 text-sm sm:text-base font-semibold text-[#24302A]">
                      {faq.q}
                    </span>
                    <ChevronRight
                      size={18}
                      className={`text-[#8C9B90] transition-transform duration-200 shrink-0 ${openFaq === i ? 'rotate-90 text-[#355E3B]' : ''}`}
                    />
                  </button>
                  {openFaq === i && (
                    <div className="px-5 pb-5 pt-1 pl-11 text-sm text-[#5F665F] leading-relaxed bg-[#FFF9F0]/40">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Quick Tutorials */}
          <div>
            <h2 className="text-xl font-bold text-[#24302A] mb-4">
              {t('help.tutorials') || 'Quick Step-by-Step Guides'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {[
                { title: t('help.tut_assessment') || 'How to find the right business', icon: '📊', path: '/business/assessment' },
                { title: t('help.tut_loan') || 'Calculating bank loan EMIs', icon: '🏦', path: '/finance' },
                { title: t('help.tut_dpr') || 'Generating your official DPR', icon: '📄', path: '/dpr' },
                { title: t('help.tut_mudra') || 'Applying for PM Mudra Yojana', icon: '🏛️', path: '/schemes' },
              ].map((item, i) => (
                <div
                  key={i}
                  onClick={() => navigate(item.path)}
                  className="flex items-center gap-3.5 p-4 rounded-xl border border-[#DED8CA] bg-white hover:border-[#355E3B] hover:shadow-xs transition cursor-pointer"
                >
                  <span className="text-2xl shrink-0">{item.icon}</span>
                  <p className="flex-1 text-xs sm:text-sm font-semibold text-[#24302A] leading-snug">
                    {item.title}
                  </p>
                  <ChevronRight size={16} className="text-[#8C9B90]" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): AI Advisor Box & Direct Support */}
        <div className="lg:col-span-5 space-y-6">
          {/* Ask AI Card */}
          <div className="p-6 rounded-2xl bg-[#214A32] text-white shadow-md">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#355E3B] flex items-center justify-center text-white shrink-0">
                <Sparkles size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold leading-tight">
                  {t('help.ask_ai_title') || 'Talk to GramSaarthi AI'}
                </h3>
                <p className="text-xs text-[#A8C98A]">Instant assistance in your language</p>
              </div>
            </div>
            <p className="text-xs text-white/85 mb-5 leading-relaxed">
              {t('help.ask_ai_desc') || 'Need immediate clarity on loans, documents, or business feasibility? Our AI advisor provides step-by-step guidance in Hindi, Gujarati, and English.'}
            </p>
            <button
              onClick={() => navigate('/ai-advisor')}
              className="w-full py-3 rounded-xl text-sm font-bold text-white bg-[#C96B3B] hover:opacity-90 transition shadow-sm cursor-pointer"
            >
              {t('help.ask_ai_now') || 'Start AI Conversation →'}
            </button>
          </div>

          {/* Contact Support */}
          <div className="p-6 rounded-2xl border border-[#DED8CA] bg-white shadow-xs">
            <h3 className="text-base font-bold text-[#24302A] mb-4">
              {t('help.contact_support') || 'Direct Helpdesk'}
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-[#F4EBDD] border border-[#DED8CA]">
                <div className="w-10 h-10 rounded-lg bg-[#E7F0DE] flex items-center justify-center text-[#355E3B] shrink-0">
                  <Phone size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#24302A]">Toll-Free Helpline</p>
                  <p className="text-xs text-[#5F665F]">1800-180-1551 (Mon–Sat, 9AM–6PM)</p>
                </div>
              </div>

              <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-[#F4EBDD] border border-[#DED8CA]">
                <div className="w-10 h-10 rounded-lg bg-[#E7F0DE] flex items-center justify-center text-[#25d366] shrink-0">
                  <MessageSquare size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#24302A]">WhatsApp Assistance</p>
                  <p className="text-xs text-[#5F665F]">+91 98765 43210</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
