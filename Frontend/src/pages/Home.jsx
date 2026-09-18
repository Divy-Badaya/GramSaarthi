import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles, Mic, ArrowRight, Landmark,
  FileText, Calculator, ChevronRight, Clock,
  CheckCircle, AlertTriangle, Lightbulb, Compass, LayoutDashboard,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { RECENT_ACTIVITIES } from '../data/mockData';
import MatchScore from '../components/business/MatchScore.jsx';
import StatCard from '../components/ui/StatCard.jsx';
import BusinessRoadmap from '../components/roadmap/BusinessRoadmap.jsx';
import { useT, useMLLabel, useReasonLabel, getLangCode } from '../locales/index.js';

export default function Home() {
  const navigate = useNavigate();
  const { user, assessment, finance, profileCompletion, isAuthenticated, lang } = useApp();
  const t = useT();
  const tML = useMLLabel();
  const tReason = useReasonLabel();
  const currentLang = getLangCode(lang);


  const hasAssessment = assessment && assessment.score > 0;
  const firstName = user?.name?.split(' ')[0] || user?.full_name?.split(' ')[0] || 'Friend';
  const fmt = (v) => `₹${(v / 100000).toFixed(v % 100000 === 0 ? 0 : 1)}L`;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('home.greeting_morning') || 'Good Morning';
    if (hour < 17) return t('home.greeting_afternoon') || 'Good Afternoon';
    return t('home.greeting_evening') || 'Good Evening';
  };

  // ── 10 Business Categories from Figma Reference ──────────────────────────
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

  // ── Schemes from Figma Reference ─────────────────────────────────────────
  const SCHEMES_HIGHLIGHTS = [
    {
      name: currentLang === 'hi' ? 'पीएम मुद्रा योजना' : currentLang === 'gu' ? 'PM મુદ્રા યોજના' : 'PM Mudra Yojana',
      tag: currentLang === 'hi' ? '₹10 लाख तक लोन' : currentLang === 'gu' ? '₹૧૦ લાખ સુધી લોન' : 'Loan up to ₹10 Lakh',
      color: '#355E3B',
      schemeId: 'pm_mudra',
    },
    {
      name: currentLang === 'hi' ? 'स्टैंड-अप इंडिया' : currentLang === 'gu' ? 'સ્ટૅન્ડ-અપ ઇન્ડિયા' : 'Stand-Up India',
      tag: currentLang === 'hi' ? 'महिलाओं और SC/ST के लिए' : currentLang === 'gu' ? 'મહિલા અને SC/ST માટે' : 'For women & SC/ST',
      color: '#C96B3B',
      schemeId: 'stand_up_india',
    },
    {
      name: 'PMEGP',
      tag: currentLang === 'hi' ? '35% तक सब्सिडी' : currentLang === 'gu' ? '૩૫% સુધી સબ્સિડી' : 'Up to 35% subsidy',
      color: '#6F8F4E',
      schemeId: 'pmegp',
    },
    {
      name: currentLang === 'hi' ? 'स्टार्टअप इंडिया सीड फंड' : currentLang === 'gu' ? 'સ્ટાર્ટઅપ ઇન્ડિયા સીડ ફંડ' : 'Startup India Seed Fund',
      tag: currentLang === 'hi' ? 'शुरुआती व्यवसाय सहायता' : currentLang === 'gu' ? 'પ્રારંભિક વ્યવસાય સહાય' : 'Early business support',
      color: '#D9A441',
      schemeId: 'seed_fund',
    },
  ];

  // ── Success Stories from Figma Reference ──────────────────────────────────
  const STORIES = [
    {
      name: currentLang === 'hi' ? 'मीना देवी' : currentLang === 'gu' ? 'મીના દેવી' : 'Meena Devi',
      place: currentLang === 'hi' ? 'बांदा, उत्तर प्रदेश' : currentLang === 'gu' ? 'બાન્દા, ઉ.પ્ર.' : 'Banda, UP',
      business: currentLang === 'hi' ? 'अचार और पापड़ यूनिट' : currentLang === 'gu' ? 'અથાણું અને પાપડ યૂનિટ' : 'Pickle & Papad Unit',
      quote: currentLang === 'hi' ? 'ग्रामसाथी ने दिखाया कि मैं अपने घर से ही व्यवसाय शुरू कर सकती हूं।' : currentLang === 'gu' ? 'ગ્રામસારથીએ દેખાડ્યું કે હું ઘરેથી જ વ્યવસાય શરૂ કરી શકું.' : 'GramSaarthi showed me I could start a business right from home.',
      img: 'https://images.unsplash.com/photo-1777833804579-f38ad188427e?w=120&h=120&fit=crop&auto=format',
    },
    {
      name: currentLang === 'hi' ? 'रमेश पटेल' : currentLang === 'gu' ? 'રમેશ પટેલ' : 'Ramesh Patel',
      place: currentLang === 'hi' ? 'आनंद, गुजरात' : currentLang === 'gu' ? 'આણંદ, ગુજરાત' : 'Anand, Gujarat',
      business: currentLang === 'hi' ? 'मोबाइल रिपेयर शॉप' : currentLang === 'gu' ? 'મોબાઇલ રિપેર શોપ' : 'Mobile Repair Shop',
      quote: currentLang === 'hi' ? 'मुझे नहीं पता था कि लोन कैसे मिलेगा। ग्रामसाथी ने सब समझाया।' : currentLang === 'gu' ? 'મને ખ્યાલ ન હતો કે લોન કેવી રીતે મળે. ગ્રામસારથીએ બધું સમજાવ્યું.' : 'I had no idea how to get a loan. GramSaarthi explained everything.',
      img: 'https://images.unsplash.com/photo-1695398170358-99749f64c887?w=120&h=120&fit=crop&auto=format',
    },
    {
      name: currentLang === 'hi' ? 'सुनीता कुमारी' : currentLang === 'gu' ? 'સુનીતા કુમારી' : 'Sunita Kumari',
      place: currentLang === 'hi' ? 'मुज़फ़्फ़रपुर, बिहार' : currentLang === 'gu' ? 'મુઝફ્ફરપુર, બિહાર' : 'Muzaffarpur, Bihar',
      business: currentLang === 'hi' ? 'फूल और माला की दुकान' : currentLang === 'gu' ? 'ફૂલ અને માળાની સ્ટૉલ' : 'Flower & Garland Stall',
      quote: currentLang === 'hi' ? 'एक साल में मेरा व्यवसाय अच्छा चल रहा है। साथ मिल गया तो संभव हो गया।' : currentLang === 'gu' ? 'એક વર્ષમાં મારો વ્યવસાય સરસ ચાલી રહ્યો છે. સાથ મળ્યો તો શક્ય થયું.' : 'Within a year, my business is running well. When there is support, anything is possible.',
      img: 'https://images.unsplash.com/photo-1761753087548-5e4a7f2a6c0b?w=120&h=120&fit=crop&auto=format',
    },
  ];

  // ── Render Landing Page Sections ──────────────────────────────────────────
  const renderFigmaLanding = () => (
    <div className="w-full bg-[#FFF9F0]">
      {/* 1. Hero Section */}
      <section className="max-w-[1280px] mx-auto px-6 lg:px-10 py-16 lg:py-24">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          <div className="flex-1 max-w-xl">
            <span className="inline-block text-[13px] font-semibold uppercase tracking-widest px-3.5 py-1.5 rounded-full mb-6 bg-[#E7F0DE] text-[#355E3B]">
              {t('landing.hero_badge') || 'For Small Business Owners Across India'}
            </span>

            <h1 className="text-[42px] lg:text-[56px] font-bold leading-[1.1] mb-6 text-[#24302A]">
              {t('landing.hero_h1a') || 'Find the right'}{' '}
              <span className="handwritten-underline text-[#C96B3B]">
                {t('landing.hero_accent') || 'business'}
              </span>{' '}
              {t('landing.hero_h1b') || 'for you.'}
            </h1>

            <p className="text-[18px] leading-relaxed mb-8 max-w-lg text-[#5F665F]">
              {t('landing.hero_body') || 'Not sure where to start? Tell us what you are good at, where you live, and how much you can invest — we will find the right options for you.'}
            </p>

            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => navigate('/business/assessment')}
                className="text-[16px] font-semibold px-7 py-3.5 rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2 cursor-pointer shadow-sm"
                style={{ background: "#C96B3B", color: "#ffffff", minHeight: "52px", border: "none" }}
              >
                {t('landing.cta_primary', 'Find the Right Business')} →
              </button>

              <button
                onClick={() => navigate('/ai-advisor')}
                className="text-[16px] font-medium px-7 py-3.5 rounded-xl border-2 transition-colors flex items-center gap-2 cursor-pointer"
                style={{ borderColor: "#355E3B", color: "#355E3B", background: "transparent", minHeight: "52px" }}
              >
                {t('landing.cta_secondary', 'Talk to GramSaarthi →')}
              </button>
            </div>

            {/* Stats row */}
            <div className="flex flex-wrap gap-6 mt-10">
              {[
                { val: t('landing.stat1_val', '2.4 Lakh+'), label: t('landing.stat1_label', 'Entrepreneurs helped') },
                { val: t('landing.stat2_val', '450+'), label: t('landing.stat2_label', 'Business ideas') },
                { val: t('landing.stat3_val', '28 States'), label: t('landing.stat3_label', 'Across India') },
              ].map((b) => (
                <div key={b.label}>
                  <div className="text-[22px] font-bold" style={{ color: "#355E3B" }}>{b.val}</div>
                  <div className="text-[13px]" style={{ color: "#5F665F" }}>{b.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Hero Image / Illustration with floating card */}
          <div className="flex-1 max-w-lg w-full">
            <div className="relative rounded-2xl overflow-hidden" style={{ background: "#E7F0DE", aspectRatio: "4/3" }}>
              <img
                src="https://images.unsplash.com/photo-1695398170358-99749f64c887?w=700&h=520&fit=crop&auto=format"
                alt="Small business owner standing proudly in front of his shop"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-5 left-5 rounded-xl px-4 py-3 flex items-center gap-3 shadow-md" style={{ background: "#FFF9F0", maxWidth: "230px" }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-lg" style={{ background: "#E7F0DE" }}>
                  💡
                </div>
                <div>
                  <div className="text-[13px] font-semibold" style={{ color: "#24302A" }}>
                    {t('landing.floating_card_title', 'New idea found!')}
                  </div>
                  <div className="text-[11px]" style={{ color: "#6F8F4E" }}>
                    {t('landing.floating_card_desc', 'Mobile Repair Shop in your area')}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 text-right text-[14px]" style={{ color: "#795548", fontStyle: "italic" }}>
              {t('landing.handwritten', '"Local ideas. Real impact."')}
            </div>
          </div>
        </div>
      </section>

      {/* 2. How It Works (Three Easy Steps) */}
      <section className="bg-[#F4EBDD] py-20">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
          <div className="mb-12">
            <p className="text-[13px] font-semibold uppercase tracking-widest text-[#C96B3B] mb-3">
              {t('landing.how_label') || 'It is simple'}
            </p>
            <h2 className="text-[36px] lg:text-[42px] font-bold text-[#24302A]">
              {t('landing.how_h2') || 'Three easy steps to start.'}
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {[
              { num: '01', title: t('landing.step1_title') || 'Tell us about yourself', desc: t('landing.step1_desc') || 'What are you good at? How much can you invest? Where do you live?' },
              { num: '02', title: t('landing.step2_title') || "We'll find the right business", desc: t('landing.step2_desc') || 'GramSaarthi shows you ideas that fit your place, skills, and money.' },
              { num: '03', title: t('landing.step3_title') || 'Get your business plan ready', desc: t('landing.step3_desc') || 'Apply for funding, get a simple plan, and start with confidence.' },
            ].map((step) => (
              <div key={step.num} className="flex flex-col gap-4">
                <div className="text-[48px] font-bold leading-none text-[#DED8CA]">
                  {step.num}
                </div>
                <h3 className="text-[22px] font-bold text-[#24302A]">
                  {step.title}
                </h3>
                <p className="text-[17px] leading-relaxed text-[#5F665F]">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. 10 Business Categories */}
      <section className="bg-[#FFF9F0] py-20">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
          <div className="mb-12">
            <p className="text-[13px] font-semibold uppercase tracking-widest text-[#355E3B] mb-3">
              {t('landing.cat_label') || 'Every kind of business'}
            </p>
            <h2 className="text-[36px] lg:text-[42px] font-bold text-[#24302A] mb-3">
              {t('landing.cat_h2') || 'What would you like to do?'}
            </h2>
            <p className="text-[17px] text-[#5F665F]">
              {t('landing.cat_body') || 'Pick an area that feels right to you. We will take it from there.'}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.label}
                onClick={() => navigate(`/business/ideas?category=${encodeURIComponent(cat.catKey)}`)}
                className="text-left p-5 rounded-2xl border transition-all hover:shadow-sm group cursor-pointer"
                style={{ background: "#FFFFFF", borderColor: "#DED8CA" }}
              >
                <div className="text-3xl mb-3">{cat.icon}</div>
                <div className="text-[15px] font-semibold text-[#24302A] mb-1 group-hover:text-[#355E3B] transition-colors">
                  {cat.label}
                </div>
                <div className="text-[12px] text-[#5F665F] leading-snug">
                  {cat.desc}
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Schemes & Government Support (Dark Green Banner) */}
      <section className="bg-[#214A32] py-20" style={{ background: "#214A32" }}>
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12">
            <div>
              <p className="text-[13px] font-semibold uppercase tracking-widest text-[#D9A441] mb-3" style={{ color: "#D9A441" }}>
                {t('landing.schemes_label', 'Government support')}
              </p>
              <h2 className="text-[36px] lg:text-[42px] font-bold text-[#FFF9F0] leading-tight" style={{ color: "#FFF9F0" }}>
                {t('landing.schemes_h2a', 'Money is available.')}
                <br />
                {t('landing.schemes_h2b', 'Let us help you get it.')}
              </h2>
            </div>
            <button
              onClick={() => navigate('/schemes')}
              className="self-start text-[15px] font-semibold px-6 py-3 rounded-xl border-2 transition-opacity hover:opacity-80 cursor-pointer"
              style={{ borderColor: "#D9A441", color: "#D9A441", background: "transparent" }}
            >
              {t('landing.schemes_btn', 'See All Schemes →')}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {SCHEMES_HIGHLIGHTS.map((sch) => (
              <div
                key={sch.name}
                className="rounded-2xl p-6 flex flex-col gap-3"
                style={{ background: "rgba(255,249,240,0.07)", border: "1px solid rgba(255,249,240,0.12)" }}
              >
                <span
                  className="text-[11px] font-semibold uppercase tracking-widest px-3 py-1 rounded-full self-start"
                  style={{
                    background: `${sch.color}40`,
                    color: sch.color === '#D9A441' ? '#D9A441' : sch.color === '#6F8F4E' ? '#A8C98A' : sch.color === '#C96B3B' ? '#E89A70' : '#A8C98A',
                  }}
                >
                  {sch.tag}
                </span>
                <div className="text-[18px] font-bold text-[#FFF9F0]">{sch.name}</div>
                <button
                  onClick={() => navigate('/schemes')}
                  className="text-[13px] font-medium self-start mt-auto cursor-pointer"
                  style={{ color: "#DED8CA", background: "transparent", border: "none" }}
                >
                  {t('landing.scheme_link', 'See if you qualify →')}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Success Stories */}
      <section className="py-20" style={{ background: "#F4EBDD" }}>
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
          <div className="mb-12">
            <p className="text-[13px] font-semibold uppercase tracking-widest mb-3" style={{ color: "#C96B3B" }}>
              {t('landing.stories_label', 'Real people, real progress')}
            </p>
            <h2 className="text-[36px] lg:text-[42px] font-bold" style={{ color: "#24302A" }}>
              {t('landing.stories_h2', 'They started just like you.')}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-7">
            {STORIES.map((story) => (
              <div
                key={story.name}
                className="rounded-2xl p-7 flex flex-col gap-5"
                style={{ background: "#FFFFFF", border: "1px solid #DED8CA" }}
              >
                <p className="text-[16px] leading-relaxed italic flex-1" style={{ color: "#24302A" }}>
                  "{story.quote}"
                </p>
                <div className="pt-5 flex items-center gap-4" style={{ borderTop: "1px solid #DED8CA" }}>
                  <img
                    src={story.img}
                    alt={story.name}
                    className="w-12 h-12 rounded-full object-cover shrink-0"
                    style={{ background: "#E7F0DE" }}
                  />
                  <div>
                    <div className="text-[15px] font-bold" style={{ color: "#24302A" }}>{story.name}</div>
                    <div className="text-[13px]" style={{ color: "#6F8F4E" }}>{story.business} · {story.place}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. AI Saarthi Chat Preview Banner */}
      <section className="py-20" style={{ background: "#FFF9F0" }}>
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
          <div className="rounded-3xl p-10 lg:p-16 flex flex-col lg:flex-row items-center gap-10" style={{ background: "#E7F0DE" }}>
            <div className="flex-1">
              <div className="text-5xl mb-4">🙂</div>
              <h2 className="text-[34px] lg:text-[40px] font-bold mb-4 leading-tight" style={{ color: "#214A32" }}>
                {t('landing.chat_h2a', 'Not sure what to do?')}{' '}
                <br />
                {t('landing.chat_h2b', 'Ask GramSaarthi.')}
              </h2>
              <p className="text-[17px] leading-relaxed mb-8 max-w-md" style={{ color: "#5F665F" }}>
                {t('landing.chat_body', 'GramSaarthi is your local guide. Ask anything — what business to start, how to get a loan, which scheme fits you. Simple answers, in your language.')}
              </p>
              <button
                onClick={() => navigate('/ai-advisor')}
                className="text-[16px] font-semibold px-8 py-4 rounded-xl hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
                style={{ background: "#355E3B", color: "#ffffff", minHeight: "54px", border: "none" }}
              >
                {t('landing.chat_btn', 'Talk to GramSaarthi →')}
              </button>
            </div>

            {/* Interactive Chat Mockup */}
            <div className="flex-1 max-w-sm w-full rounded-2xl p-5 shadow-sm" style={{ background: "#FFF9F0", border: "1px solid #DED8CA" }}>
              <div className="flex items-center gap-3 pb-4 mb-4" style={{ borderBottom: "1px solid #DED8CA" }}>
                <img
                  src="/logo.png"
                  alt="GramSaarthi"
                  className="w-9 h-9 rounded-xl object-contain shrink-0 shadow-xs"
                />
                <div>
                  <div className="text-[14px] font-bold" style={{ color: "#24302A" }}>GramSaarthi</div>
                  <div className="text-[11px] flex items-center gap-1.5" style={{ color: "#6F8F4E" }}>
                    <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "#6F8F4E" }} />
                    {t('landing.chat_online', 'Online now')}
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <div className="rounded-2xl rounded-tl-xs px-4 py-3 self-start max-w-[85%]" style={{ background: "#E7F0DE" }}>
                  <p className="text-[14px]" style={{ color: "#24302A" }}>{t('landing.chat_msg1', 'Namaste! Tell me what you are good at and I will suggest the right business for you. 🙏')}</p>
                </div>
                <div className="rounded-2xl rounded-tr-xs px-4 py-3 self-end max-w-[80%]" style={{ background: "#355E3B", color: "#ffffff" }}>
                  <p className="text-[14px]">{t('landing.chat_msg2', 'I know tailoring. Can I open a tailoring shop?')}</p>
                </div>
                <div className="rounded-2xl rounded-tl-xs px-4 py-3 self-start max-w-[85%]" style={{ background: "#E7F0DE" }}>
                  <p className="text-[14px]" style={{ color: "#24302A" }}>{t('landing.chat_msg3', 'Absolutely! Tailoring is a great fit. You need around ₹50,000 to start. Let me show you 3 simple options...')}</p>
                </div>
              </div>
              <div
                onClick={() => navigate('/ai-advisor')}
                className="mt-4 flex items-center gap-2 rounded-xl px-4 py-2.5 cursor-pointer"
                style={{ background: "#F4EBDD", border: "1px solid #DED8CA" }}
              >
                <span className="text-[14px] flex-1 text-[#8E968E]">
                  {t('landing.chat_placeholder', 'Type your question here...')}
                </span>
                <button className="w-8 h-8 rounded-lg flex items-center justify-center text-white cursor-pointer" style={{ background: "#355E3B", border: "none" }}>
                  ↑
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Why GramSaarthi */}
      <section className="py-20" style={{ background: "#F4EBDD" }}>
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-[13px] font-semibold uppercase tracking-widest mb-3" style={{ color: "#355E3B" }}>
                {t('landing.why_label', 'Why trust us')}
              </p>
              <h2 className="text-[36px] lg:text-[42px] font-bold mb-6" style={{ color: "#24302A" }}>
                {t('landing.why_h2', 'We are built for people like you.')}
              </h2>
              <p className="text-[17px] leading-relaxed mb-10" style={{ color: "#5F665F" }}>
                {t('landing.why_body', 'GramSaarthi is not a big-city tech product. It is made for first-time business owners, rural entrepreneurs, and small-town dreamers who want a fair chance.')}
              </p>
              <div className="flex flex-col gap-7">
                {[
                  { icon: '🗣️', title: t('landing.why1_title', 'In your language'), desc: t('landing.why1_desc', 'Works in Hindi, Gujarati, and English. More languages coming soon.') },
                  { icon: '₹', title: t('landing.why2_title', 'Free to use'), desc: t('landing.why2_desc', 'No hidden fees. No subscription. Just free help when you need it.') },
                  { icon: '📍', title: t('landing.why3_title', 'Local to your area'), desc: t('landing.why3_desc', 'Ideas and schemes based on where you live, not a generic list.') },
                ].map((item) => (
                  <div key={item.title} className="flex gap-5 items-start">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ background: "#E7F0DE" }}>
                      {item.icon}
                    </div>
                    <div>
                      <div className="text-[17px] font-bold mb-1" style={{ color: "#24302A" }}>{item.title}</div>
                      <div className="text-[15px]" style={{ color: "#5F665F" }}>{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl overflow-hidden shadow-sm" style={{ background: "#DED8CA", aspectRatio: '4/3' }}>
              <img
                src="https://images.unsplash.com/photo-1636011203281-a76ae5a437dd?w=700&h=520&fit=crop&auto=format"
                alt="Busy local street market in India"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );

  // ── Render Authenticated User Dashboard ───────────────────────────────────
  const renderUserDashboard = () => (
    <div className="w-full bg-[#FFF9F0]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-8 lg:py-12">
        {/* Dashboard Header */}
        <div className="mb-8">
          <h1 className="text-[28px] lg:text-[34px] font-bold text-[#24302A] leading-tight">
            {getGreeting()}, {firstName} 👋
          </h1>
          <p className="text-[15px] text-[#5F665F] mt-1">
            {hasAssessment
              ? t('home.subtitle_progress', {
                  business: tML(assessment.business),
                  location: `${assessment.location?.village || assessment.location?.district || ''}, ${assessment.location?.state || ''}`,
                })
              : t('home.subtitle_default') || 'Find the right small business, funding, and government schemes for you.'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Column (8 cols on lg) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Progressive Profile Completion Card */}
            <div className="p-6 rounded-2xl border border-[#DED8CA] bg-white shadow-xs">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <p className="text-base font-bold text-[#24302A] flex items-center gap-2">
                    <Sparkles size={18} className="text-[#C96B3B]" />
                    {t('profile.completion_title') || 'Profile Completion'}
                  </p>
                  <p className="text-xs text-[#5F665F] mt-0.5">
                    {t('profile.completion_msg') || 'Complete your profile to get personalized government schemes and recommendations.'}
                  </p>
                </div>
                <span
                  className="text-sm font-bold px-3 py-1 rounded-full"
                  style={{
                    background: (profileCompletion?.percentage ?? 0) >= 80 ? '#E7F0DE' : '#FBEADF',
                    color: (profileCompletion?.percentage ?? 0) >= 80 ? '#214A32' : '#C96B3B',
                  }}
                >
                  {profileCompletion?.percentage ?? 0}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2.5 rounded-full bg-[#F4EBDD] overflow-hidden mb-4">
                <div
                  className="h-full rounded-full transition-all duration-400"
                  style={{
                    width: `${profileCompletion?.percentage ?? 0}%`,
                    background: (profileCompletion?.percentage ?? 0) >= 80 ? '#355E3B' : '#C96B3B',
                  }}
                />
              </div>

              <div className="flex flex-wrap justify-between items-center gap-3">
                <div className="flex gap-2 flex-wrap flex-1">
                  {profileCompletion?.missing_fields?.slice(0, 3).map((mf) => (
                    <span
                      key={mf.key}
                      className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#F4EBDD] border border-[#DED8CA] text-[#5F665F]"
                    >
                      ⚠ {mf.label}
                    </span>
                  ))}
                </div>
                <button
                  id="home-complete-profile"
                  onClick={() => navigate('/profile')}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#355E3B] bg-[#E7F0DE] hover:bg-[#D8EAC7] transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span>{t('profile.complete_profile_btn') || 'Complete Profile'}</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>

            {/* Dynamic Personalized Business Roadmap (only when assessment exists) */}
            {hasAssessment && <BusinessRoadmap compact={true} />}

            {/* Assessment / Recommendation Card */}
            {hasAssessment ? (
              <div className="p-6 rounded-2xl border border-[#DED8CA] bg-white shadow-xs">
                <div className="flex justify-between items-center mb-4">
                  <p className="text-base font-bold text-[#24302A]">{t('home.business_opportunity') || 'Recommended Business'}</p>
                  <button
                    onClick={() => navigate('/business/analysis')}
                    className="text-xs font-bold text-[#C96B3B] hover:underline flex items-center gap-1 cursor-pointer bg-transparent border-none"
                  >
                    {t('home.full_analysis') || 'View Full Feasibility'} <ChevronRight size={14} />
                  </button>
                </div>

                <div
                  className="flex flex-col sm:flex-row items-start sm:items-center gap-5 p-5 rounded-xl bg-[#E7F0DE]/40 border border-[#DED8CA] cursor-pointer"
                  onClick={() => navigate('/business/analysis')}
                >
                  <MatchScore score={assessment.score} size="md" color="green" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg font-bold text-[#24302A]">{tML(assessment.business)}</span>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#E7F0DE] text-[#214A32] border border-[#6F8F4E]/30">
                        {t('analysis.recommended') || 'High Match'}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1.5 mb-4">
                      {(assessment.reasons || []).slice(0, 3).map((r, i) => (
                        <p key={i} className="text-xs text-[#5F665F] flex items-center gap-2">
                          {r.positive
                            ? <CheckCircle size={14} className="text-[#355E3B]" />
                            : <AlertTriangle size={14} className="text-[#D9A441]" />
                          }
                          {tReason(r.label)}
                        </p>
                      ))}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate('/finance'); }}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#355E3B] hover:bg-[#214A32] transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      {t('home.build_plan') || 'Build Financial Plan'} <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                onClick={() => navigate('/business/assessment')}
                className="p-6 rounded-2xl bg-[#C96B3B] text-white flex items-center gap-5 cursor-pointer shadow-md hover:opacity-95 transition"
              >
                <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-3xl shrink-0">
                  🌾
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white leading-tight">
                    {t('home.start_assessment_title') || 'Find the Right Business for You'}
                  </h3>
                  <p className="text-xs text-white/85 mt-1">
                    {t('home.assessment_sub') || 'Step-by-step guidance based on your skills, budget, and local market'}
                  </p>
                </div>
                <ArrowRight size={22} className="text-white shrink-0" />
              </div>
            )}

            {/* Financial Snapshot */}
            {finance && (
              <div className="p-6 rounded-2xl border border-[#DED8CA] bg-white shadow-xs">
                <div className="flex justify-between items-center mb-4">
                  <p className="text-base font-bold text-[#24302A]">
                    {t('home.financial_snapshot') || 'Financial Snapshot'}
                  </p>
                  <button
                    onClick={() => navigate('/finance')}
                    className="text-xs font-bold text-[#C96B3B] hover:underline flex items-center gap-1 cursor-pointer bg-transparent border-none"
                  >
                    {t('home.details') || 'Full Finance Overview'} <ChevronRight size={14} />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatCard label={t('finance.your_money') || 'Your money'} value={fmt(finance.margin || finance.user_capital || 100000)} sub={t('home.capital_sub') || 'Promoter contribution'} color="sand" />
                  <StatCard label={t('finance.money_you_may_need') || 'Money you may need'} value={fmt(finance.loan || finance.loan_amount || 900000)} sub={t('home.loan_sub') || 'Potential bank loan'} color="green" />
                  <StatCard label={t('finance.total_money_needed') || 'Total money needed'} value={fmt(finance.projectCost || finance.project_cost || 1000000)} sub={tML(assessment?.business) || 'Total venture budget'} color="amber" />
                  <StatCard label={t('finance.monthly_payment') || 'Monthly payment'} value={`₹${(finance.emi || 0).toLocaleString()}`} sub={`Tenure: ${finance.tenure ? finance.tenure / 12 : 5} yrs @ ${finance.interestRate || 7.5}%`} color="terracotta" />
                </div>
              </div>
            )}
          </div>

          {/* Right / Sidebar Column (4 cols on lg) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Talk to AI Saarthi Box */}
            <div
              onClick={() => navigate('/ai-advisor')}
              className="p-6 rounded-2xl bg-[#355E3B] text-white cursor-pointer shadow-md hover:bg-[#2B4E30] transition"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-[#E7F0DE] flex items-center justify-center text-[#355E3B] shrink-0">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">
                    {t('home.ai_advisor_title') || 'Talk to GramSaarthi'}
                  </h3>
                  <span className="text-[11px] text-[#A8C98A]">AI Rural Business Guide</span>
                </div>
              </div>
              <p className="text-xs text-[#D2E5C3] leading-relaxed mb-4">
                {t('home.ai_advisor_sub') || 'Ask anything in Hindi, Gujarati or English about loans and business'}
              </p>
              <div className="flex items-center justify-between pt-3 border-t border-white/15">
                <span className="text-xs font-semibold text-white">Start Conversation →</span>
                <button
                  onClick={(e) => { e.stopPropagation(); navigate('/ai-advisor?voice=1'); }}
                  className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition text-white"
                  aria-label="Voice Advisor"
                >
                  <Mic size={15} />
                </button>
              </div>
            </div>

            {/* Quick Access Tools */}
            <div className="p-6 rounded-2xl border border-[#DED8CA] bg-white shadow-xs">
              <p className="text-sm font-bold text-[#24302A] mb-3">{t('home.quick_tools') || 'Explore Key Tools'}</p>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { icon: Landmark, label: t('home.govt_schemes') || 'Govt Schemes', path: '/schemes', bg: '#E7F0DE', color: '#214A32' },
                  { icon: FileText, label: t('finance.business_plan') || 'DPR Plan', path: '/dpr', bg: '#FBEADF', color: '#C96B3B' },
                  { icon: Calculator, label: t('home.calculators') || 'Loan Calculator', path: '/finance', bg: '#F4EBDD', color: '#355E3B' },
                  { icon: Lightbulb, label: t('home.business_ideas') || '450+ Ideas', path: '/business/ideas', bg: '#E7F0DE', color: '#355E3B' },
                ].map(({ icon: Icon, label, path, bg, color }) => (
                  <button
                    key={path}
                    onClick={() => navigate(path)}
                    className="flex flex-col items-start p-3.5 rounded-xl border border-[#DED8CA] hover:border-[#355E3B] transition text-left cursor-pointer bg-white"
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ background: bg, color }}>
                      <Icon size={16} />
                    </div>
                    <span className="text-xs font-bold text-[#24302A]">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="rounded-2xl border border-[#DED8CA] bg-white overflow-hidden shadow-xs">
              <div className="p-4 bg-[#F4EBDD] border-b border-[#DED8CA] flex items-center justify-between">
                <p className="text-xs font-bold text-[#24302A]">{t('home.recent_activity') || 'Recent Activity'}</p>
                <span className="text-[10px] text-[#5F665F] font-semibold">{t('home.last_days') || 'Last 7 days'}</span>
              </div>
              <div className="divide-y divide-[#EAE4D6]">
                {RECENT_ACTIVITIES.map((a) => (
                  <div key={a.id} className="p-3.5 flex items-center gap-3">
                    <span className="text-lg shrink-0">{a.icon}</span>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-[#24302A] leading-snug">{a.text}</p>
                      <p className="text-[10px] text-[#5F665F] mt-0.5 flex items-center gap-1">
                        <Clock size={10} /> {a.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Categories preview section */}
        <section className="mt-14 pt-12 border-t border-[#DED8CA]">
          <div className="flex justify-between items-end mb-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#355E3B] mb-1">
                {t('landing.cat_label') || 'Every kind of business'}
              </p>
              <h2 className="text-2xl font-bold text-[#24302A]">
                {t('landing.cat_h2') || 'What would you like to do?'}
              </h2>
            </div>
            <button
              onClick={() => navigate('/business/ideas')}
              className="text-xs font-bold text-[#355E3B] hover:underline flex items-center gap-1 cursor-pointer bg-transparent border-none"
            >
              View All 450+ Ideas <ChevronRight size={14} />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
            {CATEGORIES.slice(0, 10).map((cat) => (
              <button
                key={cat.label}
                onClick={() => navigate(`/business/ideas?category=${encodeURIComponent(cat.catKey)}`)}
                className="text-left p-4 rounded-xl border border-[#DED8CA] bg-white hover:border-[#355E3B] hover:shadow-xs transition group cursor-pointer"
              >
                <div className="text-2xl mb-2">{cat.icon}</div>
                <div className="text-xs font-bold text-[#24302A] group-hover:text-[#355E3B] mb-1">
                  {cat.label}
                </div>
                <div className="text-[11px] text-[#5F665F] line-clamp-2">
                  {cat.desc}
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );

  // When authenticated, directly open My Dashboard without overview option
  // When not authenticated, directly open the full Figma landing page
  return isAuthenticated ? renderUserDashboard() : renderFigmaLanding();
}
