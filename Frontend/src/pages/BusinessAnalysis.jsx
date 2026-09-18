import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  MapPin,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronRight,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import MetricBar from '../components/business/MetricBar.jsx';
import MatchScore from '../components/business/MatchScore.jsx';
import ProgressBar from '../components/ui/ProgressBar.jsx';
import Badge from '../components/ui/Badge.jsx';
import { useT, useMLLabel, useReasonLabel } from '../locales/index.js';
import { getComprehensiveAssessment } from '../services/financeService.js';

export default function BusinessAnalysis() {
  const navigate = useNavigate();
  const { assessment, setAssessment, deleteJourney, profileLoading } = useApp();
  const t = useT();
  const tML = useMLLabel();
  const tReason = useReasonLabel();

  // ── All Hooks must be declared unconditionally at top of component ─────────
  const [phase, setPhase] = useState('loading');
  const [loadStep, setLoadStep] = useState(0);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedBizIndex, setSelectedBizIndex] = useState(0);
  const [comprehensiveData, setComprehensiveData] = useState(null);
  const [loadingComprehensive, setLoadingComprehensive] = useState(false);
  const [activeAnalysisTab, setActiveAnalysisTab] = useState('feasibility');
  const hasAnimatedRef = React.useRef(false);

  const LOADING_STEPS = [
    { msg: t('analysis.loading.step1'), sub: t('analysis.loading.step1_sub') },
    { msg: t('analysis.loading.step2'), sub: t('analysis.loading.step2_sub') },
    { msg: t('analysis.loading.step3'), sub: t('analysis.loading.step3_sub') },
    { msg: t('analysis.loading.step4'), sub: t('analysis.loading.step4_sub') },
    { msg: t('analysis.loading.step5'), sub: t('analysis.loading.step5_sub') },
    { msg: t('analysis.loading.step6'), sub: t('analysis.loading.step6_sub') },
  ];

  const METRIC_KEY_MAP = {
    'Market Demand':        'analysis.metric.demand',
    'Competition':          'analysis.metric.competition',
    'Profit Potential':     'analysis.metric.profit',
    'Location Suitability': 'analysis.metric.location',
    'Risk Level':           'analysis.metric.risk',
    'Investment Required':  'analysis.metric.investment',
  };
  const getMetricName = (name) => {
    const key = METRIC_KEY_MAP[name];
    return key ? t(key) : name;
  };

  const getRecommendationLabel = (rec) => {
    if (rec === 'Recommended') return t('analysis.recommended');
    if (rec === 'Feasible') return t('analysis.feasible');
    if (rec === 'Risky') return t('analysis.risky');
    return rec;
  };

  const METRIC_LABEL_MAP = {
    'Very High':  'metric.very_high',
    'High':       'metric.high',
    'Good':       'metric.good',
    'Very Good':  'metric.very_good',
    'Moderate':   'metric.moderate',
    'Medium':     'metric.medium',
    'Low-Medium': 'metric.low_medium',
    'Low':        'metric.low',
    'Very Low':   'metric.very_low',
  };
  const getMetricLabel = (label) => {
    const key = METRIC_LABEL_MAP[label];
    return key ? t(key) : label;
  };

  const top3List = assessment?.top3 && assessment.top3.length > 0 ? assessment.top3 : [assessment?.business || 'Dairy'];
  const top3Exps = assessment?.top3_explanations || [];

  const activeExplanation = (top3Exps.length > selectedBizIndex && top3Exps[selectedBizIndex])
    ? top3Exps[selectedBizIndex]
    : (assessment?.explanation || null);

  const activeBusinessName = activeExplanation?.business || top3List[selectedBizIndex] || assessment?.business || 'Dairy';
  const activeScore = activeExplanation?.recommendation_score || (selectedBizIndex === 0 ? assessment?.score : 75);
  const activeMatchPct = activeExplanation?.match_percentage || activeScore;
  const activeRec = activeScore >= 80 ? 'Recommended' : activeScore >= 60 ? 'Feasible' : 'Risky';

  const activePositiveFactors = (activeExplanation?.positive_factors && activeExplanation.positive_factors.length > 0)
    ? activeExplanation.positive_factors
    : (assessment?.reasons || []).filter(r => r.positive).map(r => ({ title: r.label, detail: '', impact: 'positive', metric_source: 'Assessment' }));

  const activeNegativeFactors = (activeExplanation?.negative_factors && activeExplanation.negative_factors.length > 0)
    ? activeExplanation.negative_factors
    : (assessment?.reasons || []).filter(r => !r.positive).map(r => ({ title: r.label, detail: '', impact: 'negative', metric_source: 'Assessment' }));

  const activeLocSuit = activeExplanation?.location_suitability;
  const activeInvSuit = activeExplanation?.investment_suitability;
  const activeProfileSuit = activeExplanation?.user_profile_suitability;
  const activeRiskLevel = activeExplanation?.risk_level || 'Moderate';
  const activeAssumptions = activeExplanation?.assumptions || [];

  // Timer hook for analysis animation
  useEffect(() => {
    if (!assessment || !assessment.score) return;
    if (hasAnimatedRef.current) {
      setPhase('result');
      return;
    }
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setLoadStep(i);
      if (i >= LOADING_STEPS.length - 1) {
        clearInterval(timer);
        hasAnimatedRef.current = true;
        setTimeout(() => setPhase('result'), 400);
      }
    }, 450);
    return () => clearInterval(timer);
  }, [assessment?.score, assessment?.business]);

  // Comprehensive assessment loader hook
  useEffect(() => {
    if (!activeBusinessName) return;
    let isMounted = true;
    const loadAssessment = async () => {
      setLoadingComprehensive(true);
      try {
        const capital = assessment?.capital || 100000;
        const res = await getComprehensiveAssessment({
          business_type: activeBusinessName,
          user_capital: capital,
          experience: assessment?.experience,
        });
        if (isMounted && res) {
          setComprehensiveData(res);
        }
      } catch (err) {
        console.warn('[COMPREHENSIVE] Error fetching assessment:', err);
      } finally {
        if (isMounted) setLoadingComprehensive(false);
      }
    };
    loadAssessment();
    return () => { isMounted = false; };
  }, [activeBusinessName, assessment?.capital, assessment?.experience]);

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteJourney();
      setShowConfirmModal(false);
      navigate('/home');
    } catch (err) {
      console.error('[JOURNEY] Failed to reset journey:', err);
      setShowConfirmModal(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBuildFinance = () => {
    if (setAssessment && activeBusinessName && activeBusinessName !== assessment?.business) {
      setAssessment(prev => ({
        ...prev,
        business: activeBusinessName,
        score: activeScore,
        recommendation: activeRec,
      }));
    }
    navigate('/finance');
  };

  // ── Conditional Render Screens ─────────────────────────────────────────────

  if (isDeleting) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-20 text-center">
        <div className="w-10 h-10 border-4 border-[#355E3B] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-base font-bold text-[#24302A]">
          {t('analysis.resetting') || 'Resetting your business journey...'}
        </p>
      </div>
    );
  }

  if (profileLoading && !assessment) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-20 text-center">
        <div className="w-10 h-10 border-4 border-[#355E3B] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-base font-semibold text-[#5F665F]">
          {t('analysis.loading') || 'Loading business analysis...'}
        </p>
      </div>
    );
  }

  if (!assessment || !assessment.score) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-[#FFF9F0] border border-[#DED8CA] flex items-center justify-center mx-auto mb-5 text-3xl shadow-xs">
          📊
        </div>
        <h2 className="text-2xl font-bold text-[#24302A] mb-2">
          {t('analysis.no_analysis_title')}
        </h2>
        <p className="text-sm text-[#5F665F] max-w-md mx-auto mb-8 leading-relaxed">
          {t('analysis.no_analysis_desc')}
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <button
            id="analysis-empty-start-assessment"
            onClick={() => navigate('/business/assessment')}
            className="bg-[#355E3B] hover:bg-[#214A32] text-white px-6 py-3 rounded-xl font-semibold text-sm shadow-xs inline-flex items-center gap-2 transition cursor-pointer"
          >
            {t('biz.start_assessment') || 'Start Business Assessment'} <ArrowRight size={16} />
          </button>
          <button
            id="analysis-empty-browse-ideas"
            onClick={() => navigate('/business')}
            className="bg-[#F4EBDD] hover:bg-[#EAE4D6] text-[#24302A] px-6 py-3 rounded-xl font-semibold text-sm border border-[#DED8CA] transition cursor-pointer"
          >
            {t('biz.title') || 'Select Business'}
          </button>
        </div>
      </div>
    );
  }

  // ── Loading Animation Screen ───────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 py-12 text-center">
        <img src="/logo.png" alt="" className="h-12 mx-auto mb-6 opacity-85" />
        <div className="w-12 h-12 border-4 border-[#355E3B] border-t-transparent rounded-full animate-spin mx-auto mb-6" />
        <h3 className="text-xl font-bold text-[#24302A] mb-2">
          {LOADING_STEPS[loadStep]?.msg}
        </h3>
        <p className="text-xs sm:text-sm text-[#5F665F] max-w-sm mx-auto mb-4 leading-relaxed">
          {LOADING_STEPS[loadStep]?.sub}
        </p>
        <div className="w-48 h-1.5 rounded-full bg-[#DED8CA] overflow-hidden mb-2">
          <div
            className="h-full bg-[#355E3B] transition-all duration-300 rounded-full"
            style={{ width: `${((loadStep + 1) / LOADING_STEPS.length) * 100}%` }}
          />
        </div>
        <p className="text-xs text-[#8C9B90]">
          {t('common.step_of', { current: loadStep + 1, total: LOADING_STEPS.length })}
        </p>
      </div>
    );
  }

  // ── Main Analysis Results Screen ───────────────────────────────────────────
  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-8 lg:py-12">
      {/* Top Action & Breadcrumb Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-[#DED8CA]/70">
        <nav className="flex items-center gap-2 text-xs font-medium text-[#8C9B90]">
          <button onClick={() => navigate('/')} className="hover:text-[#355E3B] transition cursor-pointer">
            {t('nav.home') || 'Home'}
          </button>
          <span>/</span>
          <button onClick={() => navigate('/business')} className="hover:text-[#355E3B] transition cursor-pointer">
            {t('nav.discover') || 'Discover'}
          </button>
          <span>/</span>
          <span className="text-[#24302A] font-semibold">{t('analysis.page_title') || 'Business Analysis'}</span>
        </nav>

        <button
          id="analysis-start-new-journey-top-btn"
          onClick={() => setShowConfirmModal(true)}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white text-red-600 border border-red-200 text-xs font-bold hover:bg-red-50 hover:border-red-300 transition shadow-2xs self-start sm:self-auto cursor-pointer"
        >
          <RotateCcw size={13} />
          <span>{t('analysis.start_new_journey')}</span>
        </button>
      </div>

      {/* Hero Banner with Score and Match Gauge */}
      <div className="bg-gradient-to-r from-[#214A32] to-[#355E3B] rounded-2xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden mb-8">
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#E7F0DE] bg-white/15 px-3 py-1 rounded-full backdrop-blur-xs border border-white/20">
                <MapPin size={13} />
                <span>
                  {tML(activeBusinessName)} · {assessment?.location?.village || ''}{assessment?.location?.district ? `, ${assessment.location.district}` : ''}
                </span>
              </span>
              {(assessment?.ml_source === 'production_ml' || assessment?.ml_source === 'rf_model' || assessment?.ml_source === 'csv_lookup') && (
                <span className="text-xs font-semibold text-[#E7F0DE] bg-white/15 px-2.5 py-1 rounded-full border border-white/20">
                  🌾 {t('analysis.ml_powered')}
                </span>
              )}
            </div>

            <p className="text-xs uppercase tracking-widest text-[#E7F0DE]/80 font-bold mb-1">
              {t('analysis.score_label')}
            </p>
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-5xl sm:text-6xl font-extrabold tracking-tight">
                {activeScore}
              </span>
              <span className="text-xl sm:text-2xl font-semibold text-white/60">/100</span>
            </div>

            <div className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-white/20 border border-white/30 backdrop-blur-xs">
              <CheckCircle size={14} className="text-[#E7F0DE]" />
              <span>{getRecommendationLabel(activeRec)}</span>
            </div>
          </div>

          <div className="shrink-0 flex items-center justify-start md:justify-end">
            <MatchScore score={activeScore} size="lg" color="white" />
          </div>
        </div>
      </div>

      {/* Interactive ML Top-3 Alternatives */}
      {top3List && top3List.length > 1 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-[#24302A]">
              {t('analysis.also_consider')} {assessment?.location?.district || t('ideas.your_area')}
            </h2>
            <span className="text-xs text-[#8C9B90]">
              {t('analysis.switch_business_hint')}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {top3List.map((biz, i) => {
              const isSelected = selectedBizIndex === i;
              const rankLabel = i === 0 ? t('analysis.top_pick') : i === 1 ? t('analysis.option2') : t('analysis.option3');
              const expForBiz = top3Exps[i];
              const scoreForBiz = expForBiz ? expForBiz.recommendation_score : (i === 0 ? assessment?.score : 75);

              return (
                <button
                  key={biz}
                  id={`analysis-top3-btn-${i}`}
                  type="button"
                  onClick={() => setSelectedBizIndex(i)}
                  className={`p-4 rounded-2xl text-left transition cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-br from-[#E7F0DE]/40 via-white to-white border-2 border-[#355E3B] shadow-sm ring-1 ring-[#355E3B]/20'
                      : 'bg-white border border-[#DED8CA] hover:border-[#355E3B] shadow-xs'
                  }`}
                >
                  <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${
                    isSelected ? 'text-[#355E3B]' : 'text-[#8C9B90]'
                  }`}>
                    {rankLabel}
                  </p>
                  <p className="text-sm font-bold text-[#24302A] mb-1 truncate">
                    {tML(biz)}
                  </p>
                  <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-md ${
                    isSelected ? 'bg-[#E7F0DE] text-[#214A32]' : 'bg-[#FFF9F0] text-[#5F665F] border border-[#DED8CA]'
                  }`}>
                    {scoreForBiz}% match
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* ── Left Column (7 cols): Detailed Analysis & Feasibility Tabs ── */}
        <div className="lg:col-span-7 space-y-6">
          {/* Why This Fits (Positive Factors) */}
          <div className="bg-white border border-[#DED8CA] rounded-2xl p-6 shadow-xs">
            <h3 className="text-base font-bold text-[#24302A] flex items-center gap-2 mb-4">
              <CheckCircle size={18} className="text-[#355E3B]" />
              <span>{t('analysis.why_fits')} ({activeMatchPct}% Match)</span>
            </h3>
            <div className="divide-y divide-[#DED8CA]/70">
              {activePositiveFactors.map((factor, i) => (
                <div key={i} className="py-3.5 first:pt-0 last:pb-0 flex items-start gap-3">
                  <CheckCircle size={16} className="text-[#355E3B] shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-[#24302A]">
                      {tReason(factor.title)}
                    </p>
                    {factor.detail && (
                      <p className="text-xs text-[#5F665F] mt-1 leading-relaxed">
                        {factor.detail}
                      </p>
                    )}
                  </div>
                  {factor.metric_source && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#355E3B] bg-[#E7F0DE] px-2 py-0.5 rounded-full shrink-0">
                      {factor.metric_source}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Important Considerations & Concerns (if any) */}
          {activeNegativeFactors.length > 0 && (
            <div className="bg-white border border-[#DED8CA] border-l-4 border-l-[#C96B3B] rounded-2xl p-6 shadow-xs">
              <h3 className="text-base font-bold text-[#24302A] flex items-center gap-2 mb-4">
                <AlertTriangle size={18} className="text-[#C96B3B]" />
                <span>{t('analysis.concerns_title')}</span>
              </h3>
              <div className="divide-y divide-[#DED8CA]/70">
                {activeNegativeFactors.map((factor, i) => (
                  <div key={i} className="py-3.5 first:pt-0 last:pb-0 flex items-start gap-3">
                    <AlertTriangle size={16} className="text-[#C96B3B] shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-[#24302A]">
                        {tReason(factor.title)}
                      </p>
                      {factor.detail && (
                        <p className="text-xs text-[#5F665F] mt-1 leading-relaxed">
                          {factor.detail}
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-[#C96B3B] bg-[#FFF9F0] border border-[#DED8CA] px-2 py-0.5 rounded-full shrink-0">
                      {t('analysis.caution')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Connected Feasibility, Loan Assessment & Risk Tabs */}
          <div className="bg-white border border-[#DED8CA] rounded-2xl p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-base font-bold text-[#24302A]">
                  {t('phase4.financial_feasibility_title')} &amp; {t('phase4.risk_analysis_title')}
                </h3>
                <p className="text-xs text-[#8C9B90] mt-0.5">
                  Connected financial analysis and loan viability for {tML(activeBusinessName)}
                </p>
              </div>
              {comprehensiveData?.financial_feasibility && (
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${
                  comprehensiveData.financial_feasibility.is_feasible
                    ? 'bg-[#E7F0DE] text-[#214A32]'
                    : 'bg-[#FEF3C7] text-[#92400E]'
                }`}>
                  {comprehensiveData.financial_feasibility.feasibility_status}
                </span>
              )}
            </div>

            {/* Tab buttons */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#FFF9F0] border border-[#DED8CA] rounded-xl mb-5">
              {[
                { id: 'feasibility', label: t('analysis.tab_feasibility') || '1. Feasibility', icon: '💰' },
                { id: 'loan',        label: t('analysis.tab_loan') || '2. Loan Assessment', icon: '🏦' },
                { id: 'risk',        label: t('analysis.tab_risk') || '3. Risk Analysis', icon: '🛡️' },
              ].map(tab => (
                <button
                  key={tab.id}
                  id={`analysis-tab-${tab.id}`}
                  type="button"
                  onClick={() => setActiveAnalysisTab(tab.id)}
                  className={`py-2 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    activeAnalysisTab === tab.id
                      ? 'bg-[#355E3B] text-white shadow-xs'
                      : 'text-[#5F665F] hover:text-[#24302A] hover:bg-[#F4EBDD]'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Tab 1: Financial Feasibility */}
            {activeAnalysisTab === 'feasibility' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-[#FFF9F0]/60 border border-[#DED8CA]/70 p-3 rounded-xl">
                    <span className="text-[10px] font-bold text-[#8C9B90] uppercase block mb-1 truncate">{t('phase4.estimated_investment')}</span>
                    <p className="text-base font-extrabold text-[#24302A]">
                      ₹{(comprehensiveData?.financial_feasibility?.project_cost || activeInvSuit?.typical_project_cost || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-[#FFF9F0]/60 border border-[#DED8CA]/70 p-3 rounded-xl">
                    <span className="text-[10px] font-bold text-[#8C9B90] uppercase block mb-1 truncate">{t('phase4.own_contribution')}</span>
                    <p className="text-base font-extrabold text-[#355E3B]">
                      ₹{(comprehensiveData?.financial_feasibility?.user_capital || assessment?.capital || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-[#FFF9F0]/60 border border-[#DED8CA]/70 p-3 rounded-xl">
                    <span className="text-[10px] font-bold text-[#8C9B90] uppercase block mb-1 truncate">{t('phase4.monthly_net_profit')}</span>
                    <p className="text-base font-extrabold text-[#24302A]">
                      ₹{(comprehensiveData?.financial_feasibility?.monthly_profit || 22000).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-[#FFF9F0]/60 border border-[#DED8CA]/70 p-3 rounded-xl">
                    <span className="text-[10px] font-bold text-[#8C9B90] uppercase block mb-1 truncate">{t('phase4.breakeven_months')}</span>
                    <p className="text-base font-extrabold text-[#24302A]">
                      {t('loan.months_val', { count: comprehensiveData?.financial_feasibility?.break_even_month || 12 }) || `${comprehensiveData?.financial_feasibility?.break_even_month || 12} Months`}
                    </p>
                  </div>
                </div>

                {comprehensiveData?.financial_feasibility?.production_scale && (
                  <div className="flex items-center gap-2 p-3 bg-[#E7F0DE]/60 border border-[#355E3B]/20 rounded-xl text-xs font-semibold text-[#214A32]">
                    <span>📊</span>
                    <span>{t('common.scale') || 'Scale'}: {comprehensiveData.financial_feasibility.production_scale}</span>
                  </div>
                )}

                <div>
                  <p className="text-xs font-bold text-[#5F665F] uppercase tracking-wider mb-2">
                    {t('phase4.assumptions')}:
                  </p>
                  <ul className="space-y-1.5 pl-4 list-disc text-xs text-[#5F665F] leading-relaxed">
                    {(comprehensiveData?.financial_feasibility?.assumptions || activeAssumptions).map((asm, i) => (
                      <li key={i}>{asm}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Tab 2: Bank Loan Assessment */}
            {activeAnalysisTab === 'loan' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#DED8CA]/60">
                  <span className="text-sm font-bold text-[#24302A]">
                    {t('analysis.loan_viability_status') || 'Loan Viability Status'}
                  </span>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    comprehensiveData?.loan_assessment?.status === 'Eligible'
                      ? 'bg-[#E7F0DE] text-[#214A32]'
                      : comprehensiveData?.loan_assessment?.status === 'Potentially eligible' || comprehensiveData?.loan_assessment?.status === 'Potentially Eligible'
                      ? 'bg-[#FEF3C7] text-[#92400E]'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {comprehensiveData?.loan_assessment?.status || 'Eligible'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-[#FFF9F0]/60 border border-[#DED8CA]/70 p-3 rounded-xl">
                    <span className="text-[10px] font-bold text-[#8C9B90] uppercase block mb-1 truncate">{t('phase4.funding_requirement')}</span>
                    <p className="text-base font-extrabold text-[#24302A]">
                      ₹{(comprehensiveData?.loan_assessment?.funding_requirement || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-[#FFF9F0]/60 border border-[#DED8CA]/70 p-3 rounded-xl">
                    <span className="text-[10px] font-bold text-[#8C9B90] uppercase block mb-1 truncate">{t('phase4.possible_loan')}</span>
                    <p className="text-base font-extrabold text-[#355E3B]">
                      ₹{(comprehensiveData?.loan_assessment?.maximum_eligible_loan || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-[#FFF9F0]/60 border border-[#DED8CA]/70 p-3 rounded-xl">
                    <span className="text-[10px] font-bold text-[#8C9B90] uppercase block mb-1 truncate">{t('analysis.monthly_emi_est') || 'Monthly EMI'}</span>
                    <p className="text-base font-extrabold text-[#24302A]">
                      ₹{(comprehensiveData?.loan_assessment?.monthly_emi || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-[#FFF9F0]/60 border border-[#DED8CA]/70 p-3 rounded-xl">
                    <span className="text-[10px] font-bold text-[#8C9B90] uppercase block mb-1 truncate">{t('analysis.dscr_coverage_label') || 'DSCR Coverage'}</span>
                    <p className="text-base font-extrabold text-[#24302A]">
                      {comprehensiveData?.loan_assessment?.dscr || 1.35}x
                    </p>
                  </div>
                </div>

                {comprehensiveData?.loan_assessment?.matched_scheme && (
                  <div className="p-3.5 bg-[#E7F0DE]/60 border border-[#355E3B]/25 rounded-xl">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#355E3B] mb-0.5">
                      {t('analysis.recommended_priority_scheme') || 'RECOMMENDED PRIORITY SCHEME'}
                    </p>
                    <p className="text-xs sm:text-sm font-bold text-[#214A32]">
                      🏛️ {comprehensiveData.loan_assessment.matched_scheme.name}
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-xs font-bold text-[#5F665F] uppercase tracking-wider mb-2">
                    {t('phase4.important_conditions')}:
                  </p>
                  <ul className="space-y-1.5 pl-4 list-disc text-xs text-[#5F665F] leading-relaxed">
                    {(comprehensiveData?.loan_assessment?.important_conditions || [
                      "Maintain minimum 10%–15% promoter margin equity contribution.",
                      "Maintain operational Debt Service Coverage Ratio (DSCR) above 1.20x.",
                      "Valid KYC documents, Aadhaar verification, and active priority-sector savings/current bank account.",
                      "Clear credit appraisal and satisfactory CIBIL track record (no active willful default history)."
                    ]).map((cond, i) => (
                      <li key={i}>{cond}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Tab 3: Risk Analysis */}
            {activeAnalysisTab === 'risk' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#DED8CA]/60">
                  <span className="text-sm font-bold text-[#24302A]">
                    {t('phase4.overall_risk')}
                  </span>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    comprehensiveData?.risk_analysis?.overall_risk === 'LOW'
                      ? 'bg-[#E7F0DE] text-[#214A32]'
                      : comprehensiveData?.risk_analysis?.overall_risk === 'MEDIUM'
                      ? 'bg-[#FEF3C7] text-[#92400E]'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {comprehensiveData?.risk_analysis?.overall_risk || activeRiskLevel.toUpperCase()} RISK
                  </span>
                </div>

                {comprehensiveData?.risk_analysis?.summary && (
                  <p className="text-xs text-[#5F665F] leading-relaxed">
                    {comprehensiveData.risk_analysis.summary}
                  </p>
                )}

                <div className="space-y-2.5">
                  {(comprehensiveData?.risk_analysis?.factors || []).map((rf, i) => (
                    <div key={i} className="p-3 rounded-xl bg-[#FFF9F0]/60 border border-[#DED8CA]/70">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-[#24302A]">{rf.category}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          rf.level === 'LOW' ? 'bg-[#E7F0DE] text-[#214A32]' : rf.level === 'MEDIUM' ? 'bg-[#FEF3C7] text-[#92400E]' : 'bg-red-100 text-red-700'
                        }`}>
                          {rf.level}
                        </span>
                      </div>
                      <p className="text-xs text-[#5F665F] leading-relaxed mb-1">
                        <strong className="text-[#24302A]">{t('common.reason') || 'Reason'}:</strong> {rf.reason}
                      </p>
                      <p className="text-xs text-[#355E3B] leading-relaxed">
                        <strong>{t('common.mitigation') || 'Mitigation'}:</strong> {rf.mitigation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Right Column (5 cols): Suitability, Metrics & Actions ── */}
        <div className="lg:col-span-5 space-y-6">
          {/* Suitability Dimensions Breakdown */}
          {(activeLocSuit || activeInvSuit || activeProfileSuit) && (
            <div className="bg-white border border-[#DED8CA] rounded-2xl p-6 shadow-xs space-y-4">
              <h3 className="text-base font-bold text-[#24302A]">
                {t('analysis.suitability_breakdown')}
              </h3>

              {activeLocSuit && (
                <div className="p-3.5 bg-[#FFF9F0]/60 border border-[#DED8CA]/70 rounded-xl">
                  <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                    <span className="text-[#8C9B90] uppercase tracking-wider">{t('analysis.loc_suitability')}</span>
                    <span className="text-[#355E3B]">{activeLocSuit.score}/100</span>
                  </div>
                  <ProgressBar value={activeLocSuit.score} color={activeLocSuit.score >= 70 ? 'green' : 'amber'} height={6} />
                  <p className="text-xs font-bold text-[#24302A] mt-2">{activeLocSuit.label}</p>
                  <p className="text-[11px] text-[#5F665F] mt-0.5 leading-relaxed">{activeLocSuit.description}</p>
                </div>
              )}

              {activeInvSuit && (
                <div className="p-3.5 bg-[#FFF9F0]/60 border border-[#DED8CA]/70 rounded-xl">
                  <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                    <span className="text-[#8C9B90] uppercase tracking-wider">{t('analysis.inv_suitability')}</span>
                    <span className="text-[#2563EB]">{activeInvSuit.score}/100</span>
                  </div>
                  <ProgressBar value={activeInvSuit.score} color={activeInvSuit.score >= 70 ? 'blue' : 'amber'} height={6} />
                  <p className="text-xs font-bold text-[#24302A] mt-2">{activeInvSuit.label}</p>
                  <p className="text-[11px] text-[#5F665F] mt-0.5 leading-relaxed">{activeInvSuit.description}</p>
                </div>
              )}

              {activeProfileSuit && (
                <div className="p-3.5 bg-[#FFF9F0]/60 border border-[#DED8CA]/70 rounded-xl">
                  <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                    <span className="text-[#8C9B90] uppercase tracking-wider">{t('analysis.profile_suitability')}</span>
                    <span className="text-[#C96B3B]">{activeProfileSuit.score}/100</span>
                  </div>
                  <ProgressBar value={activeProfileSuit.score} color={activeProfileSuit.score >= 70 ? 'orange' : 'amber'} height={6} />
                  <p className="text-xs font-bold text-[#24302A] mt-2">{activeProfileSuit.label}</p>
                  <p className="text-[11px] text-[#5F665F] mt-0.5 leading-relaxed">{activeProfileSuit.description}</p>
                </div>
              )}
            </div>
          )}

          {/* Business Metrics */}
          <div className="bg-white border border-[#DED8CA] rounded-2xl p-6 shadow-xs">
            <h3 className="text-base font-bold text-[#24302A] mb-4">
              {t('analysis.metrics_for')} {tML(activeBusinessName)}
            </h3>
            <div className="space-y-3">
              {(assessment?.metrics || []).map(m => (
                <MetricBar key={m.name} name={getMetricName(m.name)} value={m.value} label={getMetricLabel(m.label)} color={m.color} />
              ))}
            </div>
          </div>

          {/* Next Steps Card */}
          <div className="bg-white border border-[#DED8CA] rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-[#24302A]">
              {t('analysis.next_step')}
            </h3>

            {/* Primary Action Button */}
            <button
              id="analysis-build-finance"
              onClick={handleBuildFinance}
              className="w-full bg-[#355E3B] hover:bg-[#214A32] text-white p-4 rounded-xl flex items-center justify-between shadow-xs transition cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center text-xl shrink-0">
                  💰
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold leading-tight">{t('analysis.build_finance')}</p>
                  <p className="text-xs text-[#E7F0DE] mt-0.5">{t('analysis.build_finance_sub')}</p>
                </div>
              </div>
              <ArrowRight size={18} className="text-white/80 shrink-0" />
            </button>

            {/* Secondary Actions 3-col Grid */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { labelKey: 'analysis.loan_eligibility', path: '/finance/loan', icon: '🏦' },
                { labelKey: 'analysis.find_scheme',      path: '/schemes',      icon: '🏛️' },
                { labelKey: 'analysis.generate_dpr',    path: '/dpr',          icon: '📄' },
              ].map(({ labelKey, path, icon }) => (
                <button
                  key={path}
                  id={`analysis-secondary-${path.replace(/\//g, '-')}`}
                  onClick={() => navigate(path)}
                  className="p-3 bg-[#FFF9F0] hover:bg-[#F4EBDD] border border-[#DED8CA] rounded-xl flex flex-col items-center justify-center text-center transition cursor-pointer"
                >
                  <span className="text-xl mb-1">{icon}</span>
                  <span className="text-[11px] font-semibold text-[#24302A] leading-tight line-clamp-2">
                    {t(labelKey)}
                  </span>
                </button>
              ))}
            </div>

            {/* Ask AI Advisor Card */}
            <button
              id="analysis-ask-advisor"
              onClick={() => navigate('/ai-advisor')}
              className="w-full bg-[#24302A] hover:bg-[#1B2420] text-white p-4 rounded-xl flex items-center justify-between shadow-xs transition cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#355E3B] flex items-center justify-center text-xl shrink-0">
                  <Sparkles size={20} className="text-[#E7F0DE]" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold leading-tight">{t('analysis.ask_advisor')}</p>
                  <p className="text-xs text-[#8C9B90] mt-0.5">{t('analysis.ask_advisor_sub')}</p>
                </div>
              </div>
              <ArrowRight size={18} className="text-white/70 shrink-0" />
            </button>
          </div>

          {/* Option to explore another business */}
          <div className="p-4 rounded-2xl bg-[#FFF9F0]/60 border border-dashed border-[#DED8CA] text-center space-y-2">
            <p className="text-xs font-bold text-[#24302A]">
              {t('analysis.explore_another_title') || 'Want to explore another business?'}
            </p>
            <p className="text-[11px] text-[#8C9B90] leading-relaxed">
              {t('analysis.explore_another_desc') || 'You can delete this current journey and choose a fresh business to assess.'}
            </p>
            <button
              id="analysis-start-new-journey-bottom-btn"
              onClick={() => setShowConfirmModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-red-600 border border-red-200 text-xs font-bold hover:bg-red-50 hover:border-red-300 transition shadow-2xs cursor-pointer"
            >
              <RotateCcw size={13} />
              <span>{t('analysis.start_new_journey')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Start New Journey Confirmation Modal */}
      {showConfirmModal && (
        <div
          id="journey-delete-modal-overlay"
          onClick={e => { if (e.target === e.currentTarget && !isDeleting) setShowConfirmModal(false); }}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white border border-[#DED8CA] rounded-2xl p-6 shadow-xl max-w-md w-full text-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-14 h-14 rounded-full bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mx-auto text-2xl">
              <AlertTriangle size={28} />
            </div>

            <h3 className="text-lg font-bold text-[#24302A]">
              {t('analysis.delete_confirm_title')}
            </h3>

            <p className="text-sm font-medium text-[#5F665F] leading-relaxed">
              {t('analysis.delete_confirm_msg')}
            </p>

            <p className="text-xs text-[#8C9B90] leading-relaxed">
              {t('analysis.delete_confirm_sub')}
            </p>

            <div className="flex gap-3 pt-2">
              <button
                id="journey-modal-cancel-btn"
                type="button"
                disabled={isDeleting}
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 bg-[#F4EBDD] hover:bg-[#EAE4D6] text-[#24302A] py-2.5 px-4 rounded-xl text-xs font-bold border border-[#DED8CA] transition cursor-pointer"
              >
                {t('analysis.delete_confirm_cancel')}
              </button>
              <button
                id="journey-modal-confirm-btn"
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 px-4 rounded-xl text-xs font-bold shadow-xs transition inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{t('business.resetting') || 'Resetting...'}</span>
                  </>
                ) : (
                  t('analysis.delete_confirm_yes')
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
