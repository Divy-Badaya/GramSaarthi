import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Sparkles, X, ShieldCheck } from 'lucide-react';
import { askAIAdvisor } from '../services/advisorService.js';
import { getSchemeById } from '../services/schemeService.js';
import { useApp } from '../context/AppContext.jsx';
import { useT, getLangCode } from '../locales/index.js';
import AIHeader from '../components/ai/AIHeader.jsx';
import ChatBubble from '../components/ai/ChatBubble.jsx';
import AIInput from '../components/ai/AIInput.jsx';

// Interactive quick-reply choices for missing profile fields in rural advisor flow
const QUICK_FIELD_OPTIONS = {
  occupation: {
    label: { en: 'Quick select your occupation:', hi: 'त्वरित अपना व्यवसाय चुनें:', gu: 'ઝડપથી તમારો વ્યવસાય પસંદ કરો:' },
    options: {
      en: ['Farmer / Dairy', 'Shopkeeper / Retail', 'Artisan / Handicraft', 'Labour / Services', 'Student / Unemployed'],
      hi: ['किसान / डेयरी', 'दुकानदार / खुदरा', 'कारीगर / हस्तशिल्प', 'मजदूर / श्रमिक', 'विद्यार्थी / बेरोजगार'],
      gu: ['ખેડૂત / ડેરી', 'દુકાનદાર / વેપાર', 'કારીગર / હસ્તકળા', 'મજૂર / શ્રમિક', 'વિદ્યાર્થી / બેરોજગાર'],
    }
  },
  current_occupation: {
    label: { en: 'Quick select your occupation:', hi: 'त्वरित अपना व्यवसाय चुनें:', gu: 'ઝડપથી તમારો વ્યવસાય પસંદ કરો:' },
    options: {
      en: ['Farmer / Dairy', 'Shopkeeper / Retail', 'Artisan / Handicraft', 'Labour / Services'],
      hi: ['किसान / डेयरी', 'दुकानदार / खुदरा', 'कारीगर / हस्तशिल्प', 'मजदूर / श्रमिक'],
      gu: ['ખેડૂત / ડેરી', 'દુકાનદાર / વેપાર', 'કારીગર / હસ્તકળા', 'મજૂર / શ્રમિક'],
    }
  },
  annual_family_income: {
    label: { en: 'Quick select your annual family income:', hi: 'त्वरित वार्षिक पारिवारिक आय चुनें:', gu: 'ઝડપથી વાર્ષિક પારિવારિક આવક પસંદ કરો:' },
    options: {
      en: ['Under ₹1,00,000', '₹1,00,000 – ₹2,50,000', '₹2,50,000 – ₹5,00,000', 'Above ₹5,00,000'],
      hi: ['₹1 लाख से कम', '₹1 लाख – ₹2.5 लाख', '₹2.5 लाख – ₹5 लाख', '₹5 लाख से अधिक'],
      gu: ['₹૧ લાખથી ઓછી', '₹૧ લાખ – ₹૨.૫ લાખ', '₹૨.૫ લાખ – ₹૫ લાખ', '₹૫ લાખથી વધુ'],
    }
  },
  annual_income_range: {
    label: { en: 'Quick select your annual family income:', hi: 'त्वरित वार्षिक पारिवारिक आय चुनें:', gu: 'ઝડપથી વાર્ષિક પારિવારિક આવક પસંદ કરો:' },
    options: {
      en: ['Under ₹1 Lakh', '₹1L – ₹2.5L', '₹2.5L – ₹5L', 'Above ₹5 Lakh'],
      hi: ['₹1 लाख से कम', '₹1 लाख – ₹2.5 लाख', '₹2.5 लाख – ₹5 लाख', '₹5 लाख से अधिक'],
      gu: ['₹૧ લાખથી ઓછી', '₹૧ લાખ – ₹૨.૫ લાખ', '₹૨.૫ લાખ – ₹૫ લાખ', '₹૫ લાખથી વધુ'],
    }
  },
  investment_capacity: {
    label: { en: 'Quick select your investment capacity:', hi: 'त्वरित निवेश पूंजी चुनें:', gu: 'ઝડપથી રોકાણ ક્ષમતા પસંદ કરો:' },
    options: {
      en: ['₹25,000', '₹50,000', '₹1,00,000', '₹2,50,000', '₹5,00,000+'],
      hi: ['₹25,000', '₹50,000', '₹1,00,000', '₹2,50,000', '₹5,00,000+'],
      gu: ['₹૨૫,૦૦૦', '₹૫૦,૦૦૦', '₹૧,૦૦,૦૦૦', '₹૨,૫૦,૦૦૦', '₹૫,૦૦,૦૦૦+'],
    }
  },
  capital: {
    label: { en: 'Quick select your available capital:', hi: 'त्वरित अपनी पूंजी चुनें:', gu: 'ઝડપથી મૂડી પસંદ કરો:' },
    options: {
      en: ['₹25,000', '₹50,000', '₹1,00,000', '₹2,50,000', '₹5,00,000+'],
      hi: ['₹25,000', '₹50,000', '₹1,00,000', '₹2,50,000', '₹5,00,000+'],
      gu: ['₹૨૫,૦૦૦', '₹૫૦,૦૦૦', '₹૧,૦૦,૦૦૦', '₹૨,૫૦,૦૦૦', '₹૫,૦૦,૦૦૦+'],
    }
  },
  social_category: {
    label: { en: 'Quick select social category:', hi: 'त्वरित सामाजिक श्रेणी चुनें:', gu: 'ઝડપથી સામાજિક શ્રેણી પસંદ કરો:' },
    options: {
      en: ['General', 'OBC', 'SC', 'ST'],
      hi: ['सामान्य (General)', 'ओबीसी (OBC)', 'अनुसूचित जाति (SC)', 'अनुसूचित जनजाति (ST)'],
      gu: ['સામાન્ય (General)', 'ઓબીસી (OBC)', 'અનુસૂચિત જાતિ (SC)', 'અનુસૂચિત જનજાતિ (ST)'],
    }
  },
  category: {
    label: { en: 'Quick select social category:', hi: 'त्वरित सामाजिक श्रेणी चुनें:', gu: 'ઝડપથી સામાજિક શ્રેણી પસંદ કરો:' },
    options: {
      en: ['General', 'OBC', 'SC', 'ST'],
      hi: ['सामान्य (General)', 'ओबीसी (OBC)', 'अनुसूचित जाति (SC)', 'अनुसूचित जनजाति (ST)'],
      gu: ['સામાન્ય (General)', 'ઓબીસી (OBC)', 'અનુસૂચિત જાતિ (SC)', 'અનુસૂચિત જનજાતિ (ST)'],
    }
  },
  gender: {
    label: { en: 'Quick select gender:', hi: 'त्वरित लिंग चुनें:', gu: 'ઝડપથી લિંગ પસંદ કરો:' },
    options: {
      en: ['Female', 'Male', 'Other'],
      hi: ['महिला', 'पुरुष', 'अन्य'],
      gu: ['મહિલા', 'પુરુષ', 'અન્ય'],
    }
  },
  land_ownership: {
    label: { en: 'Do you own land?', hi: 'क्या आपके पास कृषि भूमि है?', gu: 'શું તમારી પાસે જમીન છે?' },
    options: {
      en: ['Own Land (1-2 acres)', 'Own Land (3+ acres)', 'Landless / Rented'],
      hi: ['स्वयं की भूमि (1-2 एकड़)', 'स्वयं की भूमि (3+ एकड़)', 'भूमिहीन / किराए पर'],
      gu: ['પોતાની જમીન (૧-૨ એકર)', 'પોતાની જમીન (૩+ એકર)', 'જમીન વિહોણા / ભાડે'],
    }
  },
};

export default function AIAdvisor() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const t = useT();

  // Real user context from AppContext
  const { user, assessment, lang, refreshProfile, addToast } = useApp();

  // Active scheme context (if user arrived from Government Schemes)
  const [activeScheme, setActiveScheme] = useState(() => {
    if (location.state?.schemeContext) return location.state.schemeContext;
    if (location.state?.scheme) return location.state.scheme;
    try {
      const stored = sessionStorage.getItem('gs_active_scheme');
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }
    return null;
  });

  const schemeParam = searchParams.get('scheme');
  useEffect(() => {
    if (schemeParam && (!activeScheme || (activeScheme.scheme_id !== schemeParam && activeScheme.id !== schemeParam))) {
      getSchemeById(schemeParam).then(scheme => {
        if (scheme) {
          const schemeCtx = {
            scheme_id: scheme.scheme_id,
            scheme_name: scheme.name || scheme.scheme_name,
            government_level: scheme.government_level,
            category: scheme.category,
            categories: scheme.categories || [],
            business_categories: scheme.business_categories || [],
            benefits: scheme.benefit || scheme.short_description,
            benefit: scheme.benefit,
            max_loan: scheme.maxLoan || scheme.max_loan,
            interest: scheme.interest || scheme.interest_rate,
            subsidy: scheme.subsidy,
            tenure: scheme.tenure,
            who: scheme.who,
            eligibility_criteria: scheme.eligibility_criteria,
            eligibility_questions: scheme.eligibility_questions || scheme.eligibility || [],
            documents: scheme.docs || [],
            docs: scheme.docs || [],
            source_url: scheme.source_url,
            application_url: scheme.application_url || scheme.official_url,
            user_eligibility_status: scheme.eligibility_status,
          };
          setActiveScheme(schemeCtx);
          sessionStorage.setItem('gs_active_scheme', JSON.stringify(schemeCtx));
        }
      });
    }
  }, [schemeParam]);

  const [messages, setMessages] = useState([
    { role: 'bot', text: t('advisor.greeting') },
  ]);
  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeMissingField, setActiveMissingField] = useState(null);
  const [lastUpdatedProfileNotice, setLastUpdatedProfileNotice] = useState(null);
  const [contextSummary, setContextSummary] = useState(() => ({
    profile: !!(user?.name || user?.full_name || user?.village),
    assessment: !!(assessment?.business || assessment?.capital),
    finance: !!(assessment?.business),
    loan_eligibility: !!(assessment?.business),
    risk: !!(assessment?.business),
    dpr: !!(assessment?.business),
    roadmap: !!(assessment?.business),
  }));
  const bottomRef = useRef(null);

  // Keep greeting in sync when language changes if conversation has not started
  useEffect(() => {
    setMessages(prev => {
      if (prev.length === 1 && prev[0].role === 'bot') {
        return [{ role: 'bot', text: t('advisor.greeting') }];
      }
      return prev;
    });
  }, [lang, t]);

  // Auto-trigger voice if ?voice=1
  useEffect(() => {
    if (searchParams.get('voice') === '1') {
      setTimeout(() => setListening(true), 500);
      setTimeout(() => setListening(false), 3000);
    }
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, activeMissingField]);

  /**
   * Build the user profile from AppContext to send to the backend.
   * Passes complete assessment context including location, financial,
   * skills, ML recommendations, demographics, and language code.
   */
  const buildUserProfile = () => {
    const profile = {};
    const inputs = assessment?._userInputs || {};
    const loc = assessment?.location || {};

    // User identity
    if (user?.name || user?.full_name) profile.name = user.name || user.full_name;

    // Location details
    profile.village  = inputs.village  || loc.village  || user?.village  || '';
    profile.block    = inputs.block    || loc.block    || user?.block    || '';
    profile.district = inputs.district || loc.district || user?.district || '';
    profile.state    = inputs.state    || loc.state    || user?.state    || '';
    profile.location = [profile.village, profile.block, profile.district, profile.state].filter(Boolean).join(', ') || user?.location || '';

    // Financial & Capacity
    profile.capital              = inputs.capital ?? assessment?.capital ?? user?.capital ?? user?.investment_capacity ?? null;
    profile.loan_needed          = inputs.loanNeeded || user?.loan_needed || null;
    profile.experience           = inputs.experience || user?.experience_level || 'Beginner';
    profile.resources            = inputs.resources || user?.resources || [];
    profile.is_woman             = Boolean(user?.is_woman || user?.gender?.toLowerCase() === 'female');
    profile.is_sc_st             = Boolean(user?.is_sc_st || ['sc', 'st'].includes((user?.social_category || user?.category || '').toLowerCase()));
    profile.age                  = user?.age || null;
    profile.gender               = user?.gender || null;
    profile.education            = user?.education || user?.education_level || null;
    profile.occupation           = user?.occupation || user?.current_occupation || null;
    profile.social_category      = user?.social_category || user?.category || null;
    profile.annual_family_income = user?.annual_family_income || null;
    profile.annual_income_range  = user?.annual_income_range || null;
    profile.business_status      = user?.business_status || null;
    profile.business_type        = user?.business_type || null;
    profile.skills               = user?.skills || null;

    // Business & ML context
    profile.business_interest = inputs.businessInterest || assessment?.business || user?.business_interest || null;
    profile.ml_recommendation = assessment?.business || null;
    profile.ml_top3           = assessment?.top3 || null;
    profile.ml_source         = assessment?.ml_source || null;

    // Attach active scheme context directly in profile too for completeness
    if (activeScheme) {
      profile.scheme_context = activeScheme;
    }

    // Language code for Gemini (e.g. 'en', 'hi', 'gu')
    profile.language = getLangCode(lang);

    return profile;
  };

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return;

    const newUserMsg = { role: 'user', text };
    setMessages(m => [...m, newUserMsg]);
    setInput('');
    setActiveMissingField(null);
    setLoading(true);

    try {
      const userProfile = buildUserProfile();

      // Pass conversation history for multi-turn Gemini context
      const historyToSend = [...messages, newUserMsg];

      const result = await askAIAdvisor(text, userProfile, historyToSend, activeScheme);
      const responseText = typeof result === 'string' ? result : (result?.response || '');
      setMessages(m => [...m, { role: 'bot', text: responseText }]);

      // Handle progressive data collection responses and context updates
      if (typeof result === 'object' && result !== null) {
        if (result.context_summary) {
          setContextSummary(prev => ({ ...prev, ...result.context_summary }));
        }

        if (result.updated_profile_fields && Object.keys(result.updated_profile_fields).length > 0) {
          refreshProfile?.();
          const updatedKeys = Object.keys(result.updated_profile_fields);
          const noticeMsg = `✓ Profile updated: ${updatedKeys.join(', ')}${result.completion_percentage ? ` (${result.completion_percentage}% completed)` : ''}`;
          setLastUpdatedProfileNotice(noticeMsg);
          setTimeout(() => setLastUpdatedProfileNotice(null), 5000);
          if (addToast) {
            addToast(noticeMsg, 'success');
          }
        }

        if (result.missing_fields && result.missing_fields.length > 0) {
          setActiveMissingField(result.missing_fields[0]);
        }
      }
    } catch {
      setMessages(m => [...m, { role: 'bot', text: t('advisor.error'), isError: true, failedText: text }]);
    } finally {
      setLoading(false);
    }
  };

  // Auto-send prompt if provided via ?prompt= URL parameter
  const promptParam = searchParams.get('prompt');
  const promptSentRef = useRef(false);
  useEffect(() => {
    if (promptParam && !promptSentRef.current) {
      promptSentRef.current = true;
      sendMessage(promptParam);
    }
  }, [promptParam]);

  const recognitionRef = useRef(null);

  const toggleVoice = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      addToast?.(t('advisor.speech_not_supported') || 'Speech recognition is not supported in this browser.', 'warning');
      return;
    }

    if (listening) {
      try {
        recognitionRef.current?.stop();
      } catch {
        // ignore
      }
      setListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      // Select speech language based on user active language
      const currentLangCode = getLangCode(lang);
      if (currentLangCode === 'hi') {
        recognition.lang = 'hi-IN';
      } else if (currentLangCode === 'gu') {
        recognition.lang = 'gu-IN';
      } else {
        recognition.lang = 'en-IN';
      }

      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setListening(true);
      };

      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(r => r[0].transcript)
          .join('');
        if (transcript) {
          setInput(transcript);
        }
      };

      recognition.onerror = (event) => {
        console.warn('[AIAdvisor] Speech recognition error:', event.error);
        setListening(false);
        if (event.error === 'not-allowed') {
          addToast?.(t('advisor.mic_permission_denied') || 'Microphone permission denied. Please allow microphone access in your browser.', 'danger');
        } else if (event.error === 'no-speech') {
          addToast?.('No voice detected. Please tap the microphone and speak clearly.', 'info');
        } else if (event.error === 'network') {
          addToast?.('Network error during speech recognition. Please try again.', 'warning');
        }
      };

      recognition.onend = () => {
        setListening(false);
      };

      recognition.start();
    } catch (err) {
      console.error('[AIAdvisor] Failed to start speech recognition:', err);
      setListening(false);
    }
  };

  // Cleanup speech recognition on unmount
  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop();
      } catch {
        // ignore
      }
    };
  }, []);

  const suggestions = activeScheme ? [
    t('advisor.scheme_suggestion_eligible'),
    t('advisor.scheme_suggestion_docs'),
    t('advisor.scheme_suggestion_apply'),
    t('advisor.scheme_suggestion_benefits'),
    t('advisor.suggestion1'),
    'Am I eligible for a bank loan?',
  ] : [
    t('advisor.suggestion1'),
    'Am I eligible for a bank loan?',
    'What are the risks and mitigations for my venture?',
    'Give me an executive summary of my project',
    'What is my next recommended roadmap step?',
    t('advisor.suggestion3'),
  ];

  const langCode = getLangCode(lang);

  return (
    <div className="max-w-[1080px] mx-auto w-full px-4 sm:px-6 py-4 flex flex-col h-[calc(100vh-72px)]">

      {/* AI Brand Header */}
      <AIHeader onStartAssessment={() => navigate('/business/assessment')} />

      {/* Active Scheme Context Banner */}
      {activeScheme && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          background: 'rgba(30, 136, 229, 0.08)',
          borderBottom: '1px solid rgba(30, 136, 229, 0.2)',
          animation: 'gs-fade-in 0.2s ease',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
            <span style={{ fontSize: '15px' }}>🏛️</span>
            <span style={{
              fontSize: '12px',
              fontWeight: 700,
              color: 'var(--gs-blue-700)',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
            }}>
              {t('advisor.scheme_context_badge', {
                name: activeScheme.scheme_name || activeScheme.name || activeScheme.scheme_id,
              })}
            </span>
            {activeScheme.user_eligibility_status && (
              <span
                className={`gs-badge ${
                  activeScheme.user_eligibility_status.toLowerCase().includes('likely eligible')
                    ? 'gs-badge-green'
                    : 'gs-badge-orange'
                }`}
                style={{ fontSize: '10px', padding: '2px 8px', flexShrink: 0 }}
              >
                {activeScheme.user_eligibility_status}
              </span>
            )}
          </div>
          <button
            onClick={() => {
              setActiveScheme(null);
              sessionStorage.removeItem('gs_active_scheme');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--gs-text-muted)',
              fontSize: '11px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              flexShrink: 0,
              padding: '2px 6px',
              borderRadius: '4px',
            }}
            title={t('advisor.clear_scheme')}
          >
            <X size={13} />
            {t('advisor.clear_scheme')}
          </button>
        </div>
      )}

      {/* Active Enterprise Context Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 16px',
        background: 'var(--gs-bg-card)',
        borderBottom: '1px solid var(--gs-border-subtle)',
        fontSize: '11px',
        color: 'var(--gs-text-secondary)',
        overflowX: 'auto',
        whiteSpace: 'nowrap',
      }}>
        <span style={{ fontWeight: 700, color: 'var(--gs-text-primary)', display: 'inline-flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
          <span>⚡</span>
          <span>{t('advisor.active_context') || 'Active Context:'}</span>
        </span>
        <span className={`gs-badge ${contextSummary?.assessment ? 'gs-badge-green' : 'gs-badge-gray'}`} style={{ fontSize: '10px', padding: '2px 6px', flexShrink: 0 }}>
          {contextSummary?.assessment ? `✓ ${t('sidebar.assessment') || 'Assessment'}` : `○ ${t('sidebar.assessment') || 'Assessment'}`}
        </span>
        <span className={`gs-badge ${contextSummary?.finance ? 'gs-badge-green' : 'gs-badge-gray'}`} style={{ fontSize: '10px', padding: '2px 6px', flexShrink: 0 }}>
          {contextSummary?.finance ? `✓ ${t('sidebar.finance') || 'Finance'}` : `○ ${t('sidebar.finance') || 'Finance'}`}
        </span>
        <span className={`gs-badge ${contextSummary?.loan_eligibility ? 'gs-badge-green' : 'gs-badge-gray'}`} style={{ fontSize: '10px', padding: '2px 6px', flexShrink: 0 }}>
          {contextSummary?.loan_eligibility ? `✓ ${t('sidebar.loan_calc') || 'Loan Eligibility'}` : `○ ${t('sidebar.loan_calc') || 'Loan Eligibility'}`}
        </span>
        <span className={`gs-badge ${contextSummary?.risk ? 'gs-badge-green' : 'gs-badge-gray'}`} style={{ fontSize: '10px', padding: '2px 6px', flexShrink: 0 }}>
          {contextSummary?.risk ? `✓ ${t('common.risk') || 'Risk'}` : `○ ${t('common.risk') || 'Risk'}`}
        </span>
        <span className={`gs-badge ${contextSummary?.dpr ? 'gs-badge-green' : 'gs-badge-gray'}`} style={{ fontSize: '10px', padding: '2px 6px', flexShrink: 0 }}>
          {contextSummary?.dpr ? `✓ ${t('sidebar.dpr') || 'DPR'}` : `○ ${t('sidebar.dpr') || 'DPR'}`}
        </span>
        <span className={`gs-badge ${contextSummary?.roadmap ? 'gs-badge-green' : 'gs-badge-gray'}`} style={{ fontSize: '10px', padding: '2px 6px', flexShrink: 0 }}>
          {contextSummary?.roadmap ? `✓ ${t('sidebar.roadmap') || 'Roadmap'}` : `○ ${t('sidebar.roadmap') || 'Roadmap'}`}
        </span>
      </div>

      {/* Suggestion chips */}
      <div style={{
        padding: '10px 16px',
        background: 'var(--gs-bg-card)',
        borderBottom: '1px solid var(--gs-border-subtle)',
      }}>
        <div className="gs-scroll-row">
          {suggestions.map((s, idx) => (
            <button
              key={idx}
              onClick={() => sendMessage(s)}
              className="gs-chip"
              style={{ fontSize: '12px', padding: '6px 14px', flexShrink: 0 }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Chat messages */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '20px 16px',
        display: 'flex', flexDirection: 'column', gap: '16px',
        background: 'var(--gs-bg)',
      }}>
        {messages.map((m, i) => (
          <ChatBubble
            key={i}
            role={m.role}
            text={m.text}
            isError={m.isError}
            onRetry={m.failedText ? () => sendMessage(m.failedText) : null}
          />
        ))}

        {/* Typing indicator */}
        {loading && (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0, marginTop: '2px',
              background: 'linear-gradient(135deg, var(--gs-green-800) 0%, var(--gs-green-900) 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Sparkles size={14} color="var(--gs-mustard)" />
            </div>
            <div style={{
              background: 'var(--gs-bg-card)', border: '1px solid var(--gs-border-subtle)',
              borderRadius: '18px 18px 18px 4px', padding: '14px 18px',
              boxShadow: 'var(--gs-shadow-xs)',
            }}>
              <div className="gs-dot-loader"><span /><span /><span /></div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Active Missing Field Quick-Fill Chips */}
      {activeMissingField && QUICK_FIELD_OPTIONS[activeMissingField] && (
        <div style={{
          padding: '12px 16px',
          background: 'var(--gs-bg-sand)',
          borderTop: '1px solid var(--gs-border)',
          borderBottom: '1px solid var(--gs-border-subtle)',
          animation: 'gs-fade-in 0.25s ease',
        }}>
          <div style={{
            fontSize: '11px',
            fontWeight: 700,
            color: 'var(--gs-terracotta)',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
            <span>⚡</span>
            <span>
              {QUICK_FIELD_OPTIONS[activeMissingField].label[langCode] ||
               QUICK_FIELD_OPTIONS[activeMissingField].label.en}
            </span>
          </div>
          <div className="gs-scroll-row" style={{ gap: '8px' }}>
            {(QUICK_FIELD_OPTIONS[activeMissingField].options[langCode] ||
              QUICK_FIELD_OPTIONS[activeMissingField].options.en).map((opt, idx) => (
              <button
                key={idx}
                onClick={() => sendMessage(opt)}
                className="gs-btn"
                style={{
                  fontSize: '12px',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  background: '#ffffff',
                  border: '1.5px solid var(--gs-terracotta)',
                  color: 'var(--gs-terracotta)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  flexShrink: 0,
                  boxShadow: '0 2px 6px rgba(201, 107, 59, 0.1)',
                }}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Saved to Profile Live Notice */}
      {lastUpdatedProfileNotice && (
        <div style={{
          padding: '6px 16px',
          background: 'rgba(46, 125, 50, 0.1)',
          borderTop: '1px solid rgba(46, 125, 50, 0.2)',
          color: 'var(--gs-green)',
          fontSize: '11px',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}>
          <ShieldCheck size={14} />
          <span>{lastUpdatedProfileNotice}</span>
        </div>
      )}

      {/* Input bar (includes voice waveform when listening) */}
      <AIInput
        value={input}
        onChange={setInput}
        onSend={() => sendMessage(input)}
        onVoice={toggleVoice}
        listening={listening}
        loading={loading}
        placeholder={t('advisor.placeholder')}
      />
    </div>
  );
}
