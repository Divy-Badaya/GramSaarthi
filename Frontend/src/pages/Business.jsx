import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Map, Lightbulb, BarChart2, Bookmark, ArrowRight, ChevronRight, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useT, useMLLabel, getLangCode } from '../locales/index.js';

export default function Business() {
  const navigate = useNavigate();
  const { assessment, lang } = useApp();
  const t = useT();
  const tML = useMLLabel();
  const currentLang = getLangCode(lang);

  const CATEGORIES = [
    { icon: '🏪', label: currentLang === 'hi' ? 'खुदरा और व्यापार' : currentLang === 'gu' ? 'છૂટક અને વ્યાપાર' : 'Retail & Trading', desc: currentLang === 'hi' ? 'किराना, जनरल स्टोर, थोक व्यापार' : currentLang === 'gu' ? 'કિરાણા, જનરલ સ્ટોર, જથ્થાબંધ' : 'Kirana, general stores, wholesale', catKey: 'Retail' },
    { icon: '🍲', label: currentLang === 'hi' ? 'खाना-पीना' : currentLang === 'gu' ? 'ખાણી-પીણી' : 'Food & Beverages', desc: currentLang === 'hi' ? 'टिफिन, चाय, नाश्ता, केटरिंग' : currentLang === 'gu' ? 'ટિફિન, ચા, નાસ્તો, કૅટરિંગ' : 'Tiffin, chai, snacks, catering', catKey: 'Food' },
    { icon: '🔧', label: currentLang === 'hi' ? 'कुशल सेवाएं' : currentLang === 'gu' ? 'કુશળ સેવાઓ' : 'Skilled Services', desc: currentLang === 'hi' ? 'इलेक्ट्रीशियन, प्लंबर, कारपेंटर' : currentLang === 'gu' ? 'ઇલેક્ટ્રિશિયન, પ્લમ્બર, સુથાર' : 'Electrician, plumber, carpenter', catKey: 'Services' },
    { icon: '🌱', label: currentLang === 'hi' ? 'कृषि और संबद्ध' : currentLang === 'gu' ? 'ખેતી અને સંલગ્ન' : 'Agriculture & Allied', desc: currentLang === 'hi' ? 'खेती, मुर्गीपालन, डेयरी, नर्सरी' : currentLang === 'gu' ? 'ખેતી, મરઘાં, ડેરી, નર્સરી' : 'Farming, poultry, dairy, nursery', catKey: 'Agriculture' },
    { icon: '🏭', label: currentLang === 'hi' ? 'निर्माण' : currentLang === 'gu' ? 'ઉત્પાદન' : 'Manufacturing', desc: currentLang === 'hi' ? 'मिट्टी के बर्तन, कपड़े, कागज, एग्रो-प्रोसेसिंग' : currentLang === 'gu' ? 'માટીના વાસણ, કાપડ, કાગળ, એગ્રો-પ્રોસેસિંગ' : 'Pottery, textiles, paper, agro-processing', catKey: 'Manufacturing' },
    { icon: '🚚', label: currentLang === 'hi' ? 'परिवहन और लॉजिस्टिक्स' : currentLang === 'gu' ? 'પરિવહન અને લૉજિસ્ટિક્સ' : 'Transport & Logistics', desc: currentLang === 'hi' ? 'ऑटो, ट्रक, डिलीवरी, कोल्ड-चेन' : currentLang === 'gu' ? 'ઑટો, ટ્રક, ડિલિવરી, કોલ્ડ-ચેઇન' : 'Auto, truck, delivery, cold-chain', catKey: 'Transport' },
    { icon: '💻', label: currentLang === 'hi' ? 'डिजिटल सेवाएं' : currentLang === 'gu' ? 'ડિજિટલ સેવાઓ' : 'Digital Services', desc: currentLang === 'hi' ? 'प्रिंटिंग, मोबाइल रिपेयर, ब्राउज़िंग' : currentLang === 'gu' ? 'પ્રિન્ટિંગ, મોબાઇલ રિપેર, બ્રાઉઝિંગ' : 'Printing, mobile repair, browsing', catKey: 'Digital' },
    { icon: '🧵', label: currentLang === 'hi' ? 'घर और व्यक्तिगत देखभाल' : currentLang === 'gu' ? 'ઘર અને વ્યક્તિગત સંભાળ' : 'Home & Personal Care', desc: currentLang === 'hi' ? 'टेलरिंग, ब्यूटी, लॉन्ड्री' : currentLang === 'gu' ? 'ટેઇલરિંગ, બ્યૂટી, લૉન્ડ્રી' : 'Tailoring, beauty, laundry', catKey: 'Personal Care' },
    { icon: '📚', label: currentLang === 'hi' ? 'शिक्षा और प्रशिक्षण' : currentLang === 'gu' ? 'શિક્ષણ અને તાલીમ' : 'Education & Training', desc: currentLang === 'hi' ? 'कोचिंग, ट्यूशन, कौशल प्रशिक्षण' : currentLang === 'gu' ? 'કોચિંગ, ટ્યૂશન, કૌશલ્ય તાલીમ' : 'Coaching, tuition, skill training', catKey: 'Education' },
    { icon: '👥', label: currentLang === 'hi' ? 'स्थानीय सेवाएं' : currentLang === 'gu' ? 'સ્થાનિક સેવાઓ' : 'Local Services', desc: currentLang === 'hi' ? 'कार्यक्रम, सफाई, सुरक्षा, मरम्मत' : currentLang === 'gu' ? 'ઈવેન્ટ, સફાઈ, સુરક્ષા, સમારકામ' : 'Event, cleaning, security, repair', catKey: 'Local' },
  ];

  const actions = [
    {
      icon: Map,
      label: t('biz.start_assessment') || 'Start Business Assessment',
      sub: t('biz.start_assessment_sub') || 'Step-by-step guidance based on skills and budget',
      path: '/business/assessment',
      primary: true,
      color: '#ffffff',
      bg: '#C96B3B',
    },
    {
      icon: Bot,
      label: t('biz.ai_advisor') || 'Talk to AI Advisor',
      sub: t('biz.ai_advisor_sub') || 'Ask questions in your language',
      path: '/ai-advisor',
      primary: false,
      color: '#355E3B',
      bg: '#E7F0DE',
    },
    {
      icon: Lightbulb,
      label: t('biz.ideas') || 'Browse 450+ Business Ideas',
      sub: t('biz.ideas_sub') || 'Filtered by village, town & budget',
      path: '/business/ideas',
      primary: false,
      color: '#214A32',
      bg: '#F4EBDD',
    },
    {
      icon: BarChart2,
      label: t('biz.compare') || 'Compare Businesses',
      sub: t('biz.compare_sub') || 'Side-by-side feasibility & profit analysis',
      path: '/business/compare',
      primary: false,
      color: '#C96B3B',
      bg: '#FBEADF',
    },
  ];

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-8 lg:py-12">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs font-medium text-[#5F665F] mb-6">
        <button
          onClick={() => navigate('/')}
          className="hover:text-[#355E3B] transition bg-transparent border-0 cursor-pointer p-0 text-[#5F665F]"
        >
          {t('landing.nav_home', 'Home')}
        </button>
        <span className="opacity-40">/</span>
        <span>{t('nav.discover', 'Discover')}</span>
        <span className="opacity-40">/</span>
        <span className="text-[#355E3B] font-semibold">{t('biz.overview_label', 'Business Overview')}</span>
      </div>

      {/* Header */}
      <div className="mb-10">
        <span className="inline-block text-xs font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full bg-[#E7F0DE] text-[#355E3B] mb-3">
          {t('biz.category_badge') || 'Venture Opportunities'}
        </span>
        <h1 className="text-3xl lg:text-4xl font-bold text-[#24302A] tracking-tight">
          {t('biz.title') || 'Find the Right Business for You'}
        </h1>
        <p className="text-base text-[#5F665F] mt-2 max-w-2xl leading-relaxed">
          {t('biz.subtitle') || 'Explore business opportunities tailored for rural and small-town entrepreneurs across India.'}
        </p>
      </div>

      {/* Current analysis banner if assessment exists */}
      {assessment?.score > 0 && (
        <div className="mb-10">
          <div
            className="p-6 rounded-2xl border border-[#DED8CA] bg-white shadow-xs hover:border-[#355E3B] transition cursor-pointer"
            onClick={() => navigate('/business/analysis')}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#E7F0DE] flex items-center justify-center text-3xl shrink-0">
                  💡
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#355E3B]">
                      {t('biz.current_analysis') || 'Your Active Assessment'}
                    </span>
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#E7F0DE] text-[#214A32]">
                      {assessment.score}/100 Match
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-[#24302A] mt-0.5">
                    {tML(assessment.business)}
                  </h3>
                  <p className="text-xs text-[#5F665F]">
                    {assessment.location?.village ? `${assessment.location.village}, ` : ''}{assessment.location?.district || ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-center">
                <button
                  onClick={(e) => { e.stopPropagation(); navigate('/finance'); }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#355E3B] hover:bg-[#214A32] transition cursor-pointer border-0"
                >
                  View Financials
                </button>
                <div className="w-9 h-9 rounded-xl bg-[#F4EBDD] flex items-center justify-center text-[#355E3B]">
                  <ChevronRight size={18} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Cards Grid - Perfectly aligned uniform height */}
      <div className="mb-14">
        <h2 className="text-xl font-bold text-[#24302A] mb-5">
          {t('biz.pathways_heading') || 'Explore Business Pathways'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {actions.map(({ icon: Icon, label, sub, path, color, bg, primary }) => (
            <button
              key={label}
              onClick={() => navigate(path)}
              className={`p-6 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[220px] h-full ${
                primary
                  ? 'bg-[#C96B3B] border-[#C96B3B] text-white shadow-md hover:opacity-95'
                  : 'bg-white border-[#DED8CA] text-[#24302A] hover:border-[#355E3B] hover:shadow-xs'
              }`}
            >
              <div>
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-xl"
                  style={{ background: primary ? 'rgba(255,255,255,0.2)' : bg, color: primary ? '#ffffff' : color }}
                >
                  <Icon size={22} />
                </div>
                <h3 className={`text-base font-bold mb-1.5 ${primary ? 'text-white' : 'text-[#24302A]'}`}>
                  {label}
                </h3>
                <p className={`text-xs leading-relaxed ${primary ? 'text-white/85' : 'text-[#5F665F]'}`}>
                  {sub}
                </p>
              </div>
              <div className="mt-6 flex items-center gap-1.5 text-xs font-bold">
                <span>Continue</span>
                <ArrowRight size={14} />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 10 Categories from Figma - Balanced 5-column grid */}
      <div className="pt-10 border-t border-[#DED8CA]">
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-wider text-[#355E3B] mb-1">
            {t('landing.cat_label') || 'Every kind of business'}
          </p>
          <h2 className="text-2xl font-bold text-[#24302A]">
            {t('landing.cat_h2') || 'What would you like to do?'}
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.label}
              onClick={() => navigate(`/business/ideas?category=${encodeURIComponent(cat.catKey)}`)}
              className="p-5 rounded-2xl border border-[#DED8CA] bg-white hover:border-[#355E3B] hover:shadow-xs transition text-left cursor-pointer group flex flex-col justify-between min-h-[160px] h-full"
            >
              <div>
                <div className="text-3xl mb-3">{cat.icon}</div>
                <h3 className="text-sm font-bold text-[#24302A] group-hover:text-[#355E3B] transition mb-1">
                  {cat.label}
                </h3>
                <p className="text-xs text-[#5F665F] line-clamp-2 leading-relaxed">
                  {cat.desc}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
