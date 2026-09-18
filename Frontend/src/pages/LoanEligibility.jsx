import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Info,
  RefreshCw,
  Sparkles,
  Building2,
  HelpCircle,
  Clock,
  Landmark,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useT } from '../locales/index.js';
import { calculateFinance, getLoanEligibility } from '../services/financeService.js';

export default function LoanEligibility() {
  const navigate = useNavigate();
  const { finance, user, assessment } = useApp();
  const t = useT();

  const initialMargin = finance?.margin || finance?.user_capital || user?.capital || 100000;
  const [margin, setMargin] = useState(initialMargin);
  const [existingEmi, setExistingEmi] = useState(0);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [eligibilityResult, setEligibilityResult] = useState(null);
  const [calcData, setCalcData] = useState(finance);

  // Fetch or evaluate dynamic eligibility
  const runEvaluation = useCallback(async (currentMargin, currentExistingEmi) => {
    setCalculating(true);
    const savedCapital = finance?.user_capital || finance?.margin;
    const isCapitalChanged = savedCapital ? currentMargin !== savedCapital : true;

    try {
      const params = {};
      if (isCapitalChanged && currentMargin > 0) {
        params.user_capital = currentMargin;
      }
      if (currentExistingEmi > 0) {
        params.existing_emi = currentExistingEmi;
      }

      // Fetch comprehensive multi-constraint loan eligibility
      const eligRes = await getLoanEligibility(params);
      if (eligRes) {
        setEligibilityResult(eligRes);
        setCalcData(eligRes);
      }
    } catch (err) {
      console.warn('[LOAN_ELIGIBILITY] Evaluation notice:', err);
    } finally {
      setCalculating(false);
      setLoading(false);
    }
  }, [finance]);

  useEffect(() => {
    if (!finance && !assessment) {
      setLoading(false);
      return;
    }
    runEvaluation(margin, existingEmi);
  }, [runEvaluation]);

  const handleRecalculate = () => {
    runEvaluation(margin, existingEmi);
  };

  // ── Missing Data States ───────────────────────────────────────────────────

  // State 1: No business selected
  const hasBusiness = Boolean(finance?.business_type || assessment?.business || user?.business_type || user?.business_interest);
  if (!loading && !hasBusiness) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-12 text-center">
        <div className="max-w-md mx-auto bg-white border border-[#DED8CA] rounded-2xl p-10 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-[#E7F0DE] flex items-center justify-center text-3xl text-[#355E3B] mx-auto mb-4">
            <Building2 size={32} />
          </div>
          <h2 className="text-xl font-bold text-[#24302A] mb-2">{t('loan.title') || 'Loan Eligibility'}</h2>
          <p className="text-xs sm:text-sm text-[#5F665F] leading-relaxed mb-6">
            {t('loan.empty_no_business') || 'Select a business to calculate loan eligibility and determine your borrowing capacity.'}
          </p>
          <button
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold text-white bg-[#355E3B] hover:bg-[#214A32] shadow-xs transition cursor-pointer border-0"
            onClick={() => navigate('/business')}
          >
            <span>{t('loan.select_business') || 'Select a Business'}</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  // State 2: Assessment incomplete
  if (!loading && !assessment && !finance) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-12 text-center">
        <div className="max-w-md mx-auto bg-white border border-[#DED8CA] rounded-2xl p-10 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-[#FBEADF] flex items-center justify-center text-3xl text-[#C96B3B] mx-auto mb-4">
            📋
          </div>
          <h2 className="text-xl font-bold text-[#24302A] mb-2">{t('loan.title') || 'Loan Eligibility'}</h2>
          <p className="text-xs sm:text-sm text-[#5F665F] leading-relaxed mb-6">
            {t('loan.empty_no_assessment') || 'Complete your business assessment to calculate your real-time bank borrowing power.'}
          </p>
          <button
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold text-white bg-[#355E3B] hover:bg-[#214A32] shadow-xs transition cursor-pointer border-0"
            onClick={() => navigate('/business/assessment')}
          >
            <span>{t('loan.start_assessment') || 'Start Assessment'}</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  // Key metric derivations
  const projectCost = eligibilityResult?.project_cost || calcData?.project_cost || calcData?.projectCost || 1000000;
  const userCapital = margin;
  const requestedLoan = eligibilityResult?.requested_loan || calcData?.loan || calcData?.loan_amount || (projectCost - margin);
  const maxEligibleLoan = eligibilityResult?.maximum_eligible_loan || Math.round(projectCost * 0.90);
  const recommendedLoan = eligibilityResult?.recommended_loan || Math.min(requestedLoan, maxEligibleLoan);
  const marginPct = eligibilityResult?.margin_pct || Math.round((userCapital / Math.max(1, projectCost)) * 100);
  const rate = eligibilityResult?.interest_rate || calcData?.interestRate || calcData?.interest_rate || 7.0;
  const tenure = eligibilityResult?.loan_tenure || calcData?.tenure || calcData?.loan_tenure || 60;
  const emi = eligibilityResult?.monthly_emi || calcData?.emi || 0;
  const moratorium = eligibilityResult?.moratorium || calcData?.moratorium || 6;
  const dscr = eligibilityResult?.dscr || calcData?.dscr || 1.35;
  const score = eligibilityResult?.score || eligibilityResult?.eligibility_score || 75;

  // Status handling
  const statusLabel = eligibilityResult?.status || (marginPct >= 10 && dscr >= 1.2 ? 'Eligible' : 'Potentially Eligible');
  const isEligible = statusLabel === 'Eligible';
  const isPartial = statusLabel === 'Potentially Eligible' || statusLabel === 'Partially Eligible';

  // Matched scheme
  const matchedScheme = eligibilityResult?.matched_scheme;
  const matchedSchemeName = matchedScheme?.name || calcData?.scheme || calcData?.matched_scheme_name || 'PM Mudra Yojana';
  const matchedSchemeBenefit = matchedScheme
    ? `${matchedScheme.loan_amount || `₹${recommendedLoan.toLocaleString()}`} at ${matchedScheme.interest_rate || `${rate}% p.a.`} · ${matchedScheme.subsidy_amount || 'Credit Guarantee'}`
    : `Collateral-free loan up to ₹${(recommendedLoan / 100000).toFixed(1)}L under priority lending guidelines.`;

  const fmt = v => `₹${v >= 100000 ? (v / 100000).toFixed(v % 100000 === 0 ? 0 : 1) + 'L' : (v / 1000).toFixed(0) + 'K'}`;

  // Factors
  const factors = eligibilityResult?.factors || [];
  const positiveFactors = eligibilityResult?.positive_factors || [];
  const limitingFactors = eligibilityResult?.limiting_factors || [];
  const recommendations = eligibilityResult?.recommendations || [];

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-8 lg:py-12">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-medium text-[#5F665F] mb-6">
        <button
          onClick={() => navigate('/')}
          className="hover:text-[#355E3B] transition bg-transparent border-0 cursor-pointer p-0 text-[#5F665F]"
        >
          {t('landing.nav_home', 'Home')}
        </button>
        <span className="opacity-40">/</span>
        <span>{t('nav.finance', 'Finance')}</span>
        <span className="opacity-40">/</span>
        <span className="text-[#355E3B] font-semibold">{t('loan.title') || 'Loan Eligibility'}</span>
      </div>

      {/* Header */}
      <div className="mb-8">
        <span className="inline-block text-xs font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full bg-[#E7F0DE] text-[#355E3B] mb-2.5">
          {t('loan.badge') || 'Bank Viability & Lending Rules'}
        </span>
        <h1 className="text-3xl lg:text-4xl font-bold text-[#24302A] tracking-tight">
          {t('loan.title') || 'Borrowing Power & Loan Eligibility'}
        </h1>
        <p className="text-sm sm:text-base text-[#5F665F] mt-1.5 max-w-2xl">
          {t('loan.subtitle') || 'Calculate how much financing you can safely access based on institutional banking rules.'}
        </p>
      </div>

      {/* 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Interactive Controls & Funding Structure (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Interactive Capital & Debt Controls */}
          <div className="bg-white border border-[#DED8CA] rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-[#24302A]">
                {t('loan.margin_label') || 'Available Capital (Margin Money)'}
              </label>
              <span className="text-[11px] font-semibold text-[#355E3B]">Min 10% Required</span>
            </div>

            <div className="relative mb-3.5">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-[#5F665F]">₹</span>
              <input
                type="number"
                className="w-full pl-9 pr-4 py-3 rounded-xl border border-[#DED8CA] text-lg font-bold text-[#24302A] outline-none focus:border-[#355E3B] focus:ring-1 focus:ring-[#355E3B] bg-[#FFF9F0]/40"
                value={margin}
                onChange={e => setMargin(parseInt(e.target.value) || 0)}
              />
            </div>

            {/* Quick preset chips */}
            <div className="flex gap-2 flex-wrap mb-5">
              {[50000, 100000, 200000, 500000].map(p => (
                <button
                  key={p}
                  onClick={() => setMargin(p)}
                  type="button"
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                    margin === p
                      ? 'bg-[#355E3B] text-white border-[#355E3B]'
                      : 'bg-[#FFF9F0] text-[#5F665F] border-[#DED8CA] hover:bg-[#F4EBDD]'
                  }`}
                >
                  {fmt(p)}
                </button>
              ))}
            </div>

            {/* Optional Existing Debt field */}
            <div className="pt-4 border-t border-[#DED8CA]/60 mb-5">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-[#24302A]">
                  {t('loan.existing_debt_label') || 'Existing Monthly EMI (Optional)'}
                </label>
                <span className="text-[11px] text-[#8C9B90]">Other Active Loans</span>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[#8C9B90]">₹</span>
                <input
                  type="number"
                  placeholder="0"
                  className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-[#DED8CA] text-sm font-semibold text-[#24302A] outline-none focus:border-[#355E3B] focus:ring-1 focus:ring-[#355E3B] bg-[#FFF9F0]/40"
                  value={existingEmi || ''}
                  onChange={e => setExistingEmi(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>

            <button
              onClick={handleRecalculate}
              disabled={calculating}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold text-white bg-[#355E3B] hover:bg-[#214A32] shadow-xs transition cursor-pointer border-0"
            >
              {calculating ? (
                <><RefreshCw size={16} className="animate-spin" /> {t('loan.evaluating') || 'Evaluating...'}</>
              ) : (
                <><Sparkles size={16} /> {t('loan.recalculate_btn') || 'Recalculate Eligibility'}</>
              )}
            </button>
          </div>

          {/* Visual Funding Breakdown Card */}
          <div className="bg-white border border-[#DED8CA] rounded-2xl p-6 shadow-xs">
            <p className="text-xs font-bold text-[#24302A] uppercase tracking-wider mb-4">
              {t('loan.structure_title') || 'Your Funding Structure'}
            </p>
            <div className="grid grid-cols-3 gap-2 text-center mb-4">
              <div className="p-3 rounded-xl bg-[#E7F0DE] border border-[#355E3B]/20">
                <p className="text-[10px] font-bold text-[#355E3B] uppercase mb-1">Your Capital</p>
                <p className="text-sm font-bold text-[#214A32]">{fmt(userCapital)}</p>
              </div>
              <div className="p-3 rounded-xl bg-[#EBF3FE] border border-[#1D4ED8]/20">
                <p className="text-[10px] font-bold text-[#1D4ED8] uppercase mb-1">Bank Loan</p>
                <p className="text-sm font-bold text-[#1D4ED8]">{fmt(recommendedLoan)}</p>
              </div>
              <div className="p-3 rounded-xl bg-[#F4EBDD] border border-[#DED8CA]">
                <p className="text-[10px] font-bold text-[#5F665F] uppercase mb-1">Total Cost</p>
                <p className="text-sm font-bold text-[#24302A]">{fmt(projectCost)}</p>
              </div>
            </div>

            {/* Split Progress Bar */}
            <div className="h-3 rounded-full overflow-hidden flex gap-1 bg-[#F4EBDD] mb-2">
              <div
                style={{ width: `${marginPct}%` }}
                className="bg-[#355E3B] rounded-l-full"
              />
              <div
                style={{ width: `${100 - marginPct}%` }}
                className="bg-[#1D4ED8] rounded-r-full"
              />
            </div>
            <div className="flex justify-between text-[11px] font-bold">
              <span className="text-[#355E3B]">{marginPct}% Equity</span>
              <span className="text-[#1D4ED8]">{Math.round(100 - marginPct)}% Debt</span>
            </div>
          </div>

          {/* Key Parameters */}
          <div className="bg-white border border-[#DED8CA] rounded-2xl p-6 shadow-xs">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: t('loan.interest_rate') || 'Interest Rate', value: `${rate}% p.a.` },
                { label: t('loan.tenure') || 'Repayment Tenure', value: `${(tenure / 12).toFixed(0)} Years` },
                { label: t('loan.moratorium') || 'Moratorium', value: `${moratorium} Months` },
                { label: t('finance.monthly_emi') || 'Monthly EMI', value: `₹${emi.toLocaleString()}`, highlight: true },
              ].map(({ label, value, highlight }) => (
                <div
                  key={label}
                  className={`p-3.5 rounded-xl border ${
                    highlight
                      ? 'bg-[#E7F0DE] border-[#355E3B]/30'
                      : 'bg-[#FFF9F0] border-[#DED8CA]'
                  }`}
                >
                  <p className="text-[10px] font-bold text-[#5F665F] uppercase tracking-wider mb-1">{label}</p>
                  <p className={`text-base font-bold ${highlight ? 'text-[#355E3B]' : 'text-[#24302A]'}`}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Score, Comparison, Schemes & Recommendations (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Overall Indicative Score & Status Banner */}
          <div className={`p-6 rounded-2xl border flex items-center justify-between gap-4 shadow-xs ${
            isEligible ? 'bg-[#E7F0DE] border-[#355E3B]/30' : isPartial ? 'bg-[#FEF3C7] border-[#F59E0B]' : 'bg-[#FEE2E2] border-[#EF4444]'
          }`}>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center font-bold text-xl text-[#355E3B] shadow-xs shrink-0">
                {score}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck size={18} className="text-[#355E3B]" />
                  <h3 className="text-base font-bold text-[#214A32]">
                    {isEligible ? (t('loan.status_eligible') || 'Eligible for Bank Loan') : isPartial ? (t('loan.status_partial') || 'Potentially Eligible') : (t('loan.status_not_eligible') || 'Not Currently Eligible')}
                  </h3>
                </div>
                <p className="text-xs text-[#5F665F] mt-1">
                  Indicative Score: <span className="font-bold text-[#24302A]">{score}/100</span> · Debt Service Coverage (DSCR): <span className="font-bold text-[#24302A]">{Number(dscr).toFixed(2)}x</span>
                </p>
              </div>
            </div>
            <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-white shadow-xs shrink-0 self-start sm:self-center">
              {statusLabel}
            </span>
          </div>

          {/* 3-Way Loan Comparison */}
          <div className="bg-white border border-[#DED8CA] rounded-2xl p-6 shadow-xs">
            <p className="text-xs font-bold text-[#5F665F] uppercase tracking-wider mb-4">
              {t('loan.capacity_assessment') || 'Borrowing Capacity Assessment'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="p-4 rounded-xl bg-[#FFF9F0] border border-[#DED8CA]">
                <p className="text-[10px] font-bold text-[#8C9B90] uppercase">{t('loan.requested_loan') || 'Requested Loan'}</p>
                <p className="text-lg font-bold text-[#24302A] mt-1">₹{requestedLoan.toLocaleString()}</p>
                <span className="text-[10px] text-[#8C9B90]">From your plan</span>
              </div>
              <div className="p-4 rounded-xl bg-[#EBF3FE] border border-[#1D4ED8]/20">
                <p className="text-[10px] font-bold text-[#1D4ED8] uppercase">{t('loan.max_eligible') || 'Max Eligible'}</p>
                <p className="text-lg font-bold text-[#1D4ED8] mt-1">₹{maxEligibleLoan.toLocaleString()}</p>
                <span className="text-[10px] text-[#1D4ED8]/80">Policy limit</span>
              </div>
              <div className="p-4 rounded-xl bg-[#E7F0DE] border border-[#355E3B]/20">
                <p className="text-[10px] font-bold text-[#355E3B] uppercase">{t('loan.recommended_loan') || 'Recommended'}</p>
                <p className="text-lg font-bold text-[#355E3B] mt-1">₹{recommendedLoan.toLocaleString()}</p>
                <span className="text-[10px] text-[#355E3B]/80">Safe repayment</span>
              </div>
            </div>

            {requestedLoan > maxEligibleLoan && (
              <div className="mt-4 p-3.5 rounded-xl bg-[#FEF3C7] border border-[#F59E0B] text-xs text-[#92400E] flex items-center gap-2.5">
                <Info size={16} className="shrink-0" />
                <span>
                  {t('loan.exceeds_capacity') || `Requested loan of ₹${requestedLoan.toLocaleString()} exceeds your verified debt capacity of ₹${maxEligibleLoan.toLocaleString()}. We recommend applying for ₹${recommendedLoan.toLocaleString()}.`}
                </span>
              </div>
            )}
          </div>

          {/* Matched Scheme Card */}
          <div className="bg-white border border-[#DED8CA] rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#E7F0DE] flex items-center justify-center text-xl shrink-0">
                  🏛️
                </div>
                <div>
                  <h4 className="text-base font-bold text-[#24302A]">{matchedSchemeName}</h4>
                  <p className="text-xs text-[#5F665F]">Priority rural enterprise lending scheme</p>
                </div>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#E7F0DE] text-[#214A32]">
                Best Scheme Match
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#5F665F] leading-relaxed mb-4">
              {matchedSchemeBenefit}
            </p>
            <div className="pt-3 border-t border-[#DED8CA]/60 flex items-center justify-between text-xs">
              <span className="text-[#5F665F] font-medium">📋 Required bank documentation:</span>
              <button
                onClick={() => navigate('/documents')}
                className="font-bold text-[#355E3B] hover:underline bg-transparent border-0 cursor-pointer p-0"
              >
                View Smart Checklist →
              </button>
            </div>
          </div>

          {/* Factors and Criteria */}
          {factors.length > 0 && (
            <div className="bg-white border border-[#DED8CA] rounded-2xl p-6 shadow-xs">
              <p className="text-xs font-bold text-[#24302A] uppercase tracking-wider mb-4">
                {t('loan.factors_title') || 'Banking Eligibility Factors & Benchmarks'}
              </p>
              <div className="space-y-2.5">
                {factors.map((f, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl border border-[#DED8CA]/60 bg-[#FFF9F0]/40"
                  >
                    <div className="flex items-center gap-2.5">
                      {f.status === 'Good' ? (
                        <CheckCircle2 size={16} className="text-[#355E3B] shrink-0" />
                      ) : f.status === 'Moderate' ? (
                        <AlertCircle size={16} className="text-[#B45309] shrink-0" />
                      ) : (
                        <AlertTriangle size={16} className="text-[#C94A3B] shrink-0" />
                      )}
                      <div>
                        <p className="text-xs font-bold text-[#24302A]">{f.name}</p>
                        <p className="text-[11px] text-[#5F665F]">{f.value} · <span className="italic">{f.benchmark}</span></p>
                      </div>
                    </div>
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                      f.status === 'Good' ? 'bg-[#E7F0DE] text-[#214A32]' : f.status === 'Moderate' ? 'bg-[#FEF3C7] text-[#92400E]' : 'bg-[#FEE2E2] text-[#991B1B]'
                    }`}>
                      {f.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Recommendations */}
          {recommendations.length > 0 && (
            <div className="p-5 rounded-2xl bg-[#E7F0DE]/60 border border-[#355E3B]/20">
              <p className="text-xs font-bold text-[#214A32] flex items-center gap-2 mb-2">
                <TrendingUp size={16} className="text-[#355E3B]" />
                <span>Actionable Next Steps</span>
              </p>
              <ul className="text-xs text-[#5F665F] space-y-1.5 pl-5 list-disc">
                {recommendations.map((text, i) => (
                  <li key={i}>{text}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Navigation Action Buttons */}
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-white bg-[#355E3B] hover:bg-[#214A32] transition cursor-pointer border-0 shadow-xs"
              onClick={() => navigate('/schemes')}
            >
              <span>{t('loan.find_schemes') || 'Explore Schemes'}</span>
              <ArrowRight size={14} />
            </button>
            <button
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-[#24302A] bg-white border border-[#DED8CA] hover:bg-[#F4EBDD] transition cursor-pointer"
              onClick={() => navigate('/documents')}
            >
              <CheckCircle2 size={14} />
              <span>{t('sidebar.documents') || 'Required Docs'}</span>
            </button>
            <button
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-[#24302A] bg-[#F4EBDD] hover:bg-[#EAE4D6] transition cursor-pointer border-0"
              onClick={() => navigate('/dpr')}
            >
              <span>{t('loan.generate_dpr') || 'View DPR'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
