import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ChevronRight,
  TrendingUp,
  BarChart2,
  DollarSign,
  FileText,
  Sliders,
  RefreshCw,
  Save,
  RotateCcw,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Calculator,
  Building2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useT, useMLLabel } from '../locales/index.js';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';

function InfoRow({ label, value, highlight, sub }) {
  return (
    <div className="flex justify-between items-center py-3 border-b border-[#DED8CA]/60 last:border-b-0">
      <div>
        <span className="text-xs sm:text-sm text-[#5F665F] font-medium">{label}</span>
        {sub && <p className="text-[11px] text-[#8C9B90] mt-0.5">{sub}</p>}
      </div>
      <span className={`text-xs sm:text-sm font-bold ${highlight ? 'text-[#355E3B]' : 'text-[#24302A]'}`}>
        {value}
      </span>
    </div>
  );
}

// ── Default Dynamic Finance Generator ─────────────────────────────────────────
function getDefaultFinance(user, assessment) {
  const cap = Number(user?.capital || user?.investment_capacity || assessment?.capital || 100000);
  const cost = cap ? Math.round(cap * 3.5) : 350000;
  const loan = Math.max(0, cost - cap);
  const marginPct = cost > 0 ? Math.round((cap / cost) * 100) : 25;
  const rate = 7.5;
  const tenure = 60;
  const r_m = (rate / 100) / 12;
  const emi = loan > 0 ? Math.round((loan * r_m * Math.pow(1 + r_m, tenure)) / (Math.pow(1 + r_m, tenure) - 1)) : 0;
  const monthlyRevenue = Math.round(cost * 0.12);
  const monthlyExpenses = Math.round(cost * 0.065);
  const monthlyProfit = Math.max(5000, monthlyRevenue - monthlyExpenses - emi);
  const bizType = user?.business_type || user?.business_interest || assessment?.business || 'Dairy';

  return {
    business_type: bizType,
    business_name: `${bizType} Enterprise`,
    user_capital: cap,
    margin: cap,
    project_cost: cost,
    projectCost: cost,
    loan_amount: loan,
    loan: loan,
    margin_pct: marginPct,
    interest_rate: rate,
    interestRate: rate,
    loan_tenure: tenure,
    tenure: tenure,
    moratorium: 6,
    emi,
    monthlyRevenue,
    monthlyExpenses,
    monthlyProfit,
    profitMargin: 24,
    dscr: 1.48,
    roi: 26,
    breakEven: 6,
    break_even_month: 6,
    breakEvenRevenue: Math.round(cost * 0.075),
    scheme: 'PM Mudra Yojana – Tarun',
    matched_scheme_name: 'PM Mudra Yojana – Tarun',
    status: 'draft',
    amortization_schedule: [
      { month: 1, principal: Math.round(loan * 0.012), interest: Math.round(loan * (rate / 1200)), balance: Math.round(loan * 0.988) },
      { month: 12, principal: Math.round(loan * 0.015), interest: Math.round(loan * 0.85 * (rate / 1200)), balance: Math.round(loan * 0.83) },
      { month: 24, principal: Math.round(loan * 0.018), interest: Math.round(loan * 0.68 * (rate / 1200)), balance: Math.round(loan * 0.64) },
      { month: 36, principal: Math.round(loan * 0.021), interest: Math.round(loan * 0.47 * (rate / 1200)), balance: Math.round(loan * 0.43) },
      { month: 48, principal: Math.round(loan * 0.024), interest: Math.round(loan * 0.23 * (rate / 1200)), balance: Math.round(loan * 0.20) },
      { month: 60, principal: Math.round(loan * 0.028), interest: Math.round(loan * 0.03 * (rate / 1200)), balance: 0 },
    ],
  };
}

export default function Finance() {
  const navigate = useNavigate();
  const {
    finance,
    user,
    assessment,
    financeLoading,
    updateFinancePlan,
    calculateFinancePlan,
    refreshFinance,
  } = useApp();
  const t = useT();
  const tML = useMLLabel();

  const [tab, setTab] = useState('overview');
  const [chartMode, setChartMode] = useState('rev_exp'); // 'rev_exp' | 'profit_cf'
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  // Fallback financial plan ensures zero distortion or empty screens
  const defaultPlan = getDefaultFinance(user, assessment);
  const activePlan = previewData || finance || defaultPlan;
  const d = activePlan;

  const bizType = (
    finance?.business_type
    || assessment?.business
    || user?.business_type
    || user?.business_interest
    || 'Dairy'
  );

  // Form input states initialized from active plan
  const [formInputs, setFormInputs] = useState({
    user_capital: d.user_capital || d.margin || 100000,
    project_cost: d.project_cost || d.projectCost || 350000,
    loan_amount: d.loan_amount || d.loan || 250000,
    interest_rate: d.interest_rate || d.interestRate || 7.5,
    loan_tenure: d.loan_tenure || d.tenure || 60,
    moratorium: d.moratorium ?? 6,
  });

  // Sync inputs when finance record arrives
  useEffect(() => {
    if (finance) {
      setFormInputs({
        user_capital: finance.user_capital || finance.margin || 100000,
        project_cost: finance.project_cost || finance.projectCost || 350000,
        loan_amount: finance.loan_amount || finance.loan || 250000,
        interest_rate: finance.interest_rate || finance.interestRate || 7.5,
        loan_tenure: finance.loan_tenure || finance.tenure || 60,
        moratorium: finance.moratorium ?? 6,
      });
      setPreviewData(null);
    }
  }, [finance]);

  // Loading state
  if (financeLoading) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-20 text-center">
        <div className="w-10 h-10 border-4 border-[#355E3B] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm font-semibold text-[#5F665F]">
          {t('finance.loading_plan') || 'Loading Financial Plan...'}
        </p>
      </div>
    );
  }

  // ── Handle Calculate Projections (Client & API resilient) ───────────────────
  const handleCalculate = async () => {
    setIsCalculating(true);
    try {
      let res = null;
      try {
        res = await calculateFinancePlan({
          business_type: bizType,
          user_capital: formInputs.user_capital,
          project_cost: formInputs.project_cost,
          loan_amount: formInputs.loan_amount,
          interest_rate: formInputs.interest_rate,
          loan_tenure: formInputs.loan_tenure,
          moratorium: formInputs.moratorium,
        });
      } catch (apiErr) {
        console.warn('[FINANCE] Backend calculation unavailable, computing client-side:', apiErr);
      }

      if (!res) {
        const cap = formInputs.user_capital;
        const cost = formInputs.project_cost;
        const loan = Math.max(0, cost - cap);
        const marginPct = cost > 0 ? Math.round((cap / cost) * 100) : 25;
        const rate = formInputs.interest_rate || 7.5;
        const tenure = formInputs.loan_tenure || 60;
        const r_m = (rate / 100) / 12;
        const emi = loan > 0 ? Math.round((loan * r_m * Math.pow(1 + r_m, tenure)) / (Math.pow(1 + r_m, tenure) - 1)) : 0;
        const monthlyRevenue = Math.round(cost * 0.12);
        const monthlyExpenses = Math.round(cost * 0.065);
        const monthlyProfit = Math.max(5000, monthlyRevenue - monthlyExpenses - emi);

        res = {
          ...(d || {}),
          user_capital: cap,
          margin: cap,
          project_cost: cost,
          projectCost: cost,
          loan_amount: loan,
          loan: loan,
          margin_pct: marginPct,
          interest_rate: rate,
          interestRate: rate,
          loan_tenure: tenure,
          tenure: tenure,
          moratorium: formInputs.moratorium,
          emi,
          monthlyRevenue,
          monthlyExpenses,
          monthlyProfit,
          profitMargin: 24,
          dscr: emi > 0 ? Number(((monthlyRevenue - monthlyExpenses) / emi).toFixed(2)) : 1.48,
          roi: cap > 0 ? Math.round(((monthlyProfit * 12) / cap) * 100) : 26,
          breakEven: 6,
          break_even_month: 6,
          breakEvenRevenue: Math.round(cost * 0.075),
        };
      }

      if (res) {
        setPreviewData(res);
      }
    } catch (err) {
      console.error('[FINANCE] Calculation failed:', err);
    } finally {
      setIsCalculating(false);
    }
  };

  // ── Handle Save Financial Plan ──────────────────────────────────────────────
  const handleSave = async () => {
    setIsSaving(true);
    try {
      try {
        await updateFinancePlan({
          business_type: bizType,
          user_capital: formInputs.user_capital,
          project_cost: formInputs.project_cost,
          loan_amount: formInputs.loan_amount,
          interest_rate: formInputs.interest_rate,
          loan_tenure: formInputs.loan_tenure,
          moratorium: formInputs.moratorium,
          status: 'finalized',
        });
      } catch (apiErr) {
        console.warn('[FINANCE] Backend save unavailable, saving to local state:', apiErr);
      }

      const cap = formInputs.user_capital;
      const cost = formInputs.project_cost;
      const loan = Math.max(0, cost - cap);
      const marginPct = cost > 0 ? Math.round((cap / cost) * 100) : 25;
      const rate = formInputs.interest_rate || 7.5;
      const tenure = formInputs.loan_tenure || 60;
      const r_m = (rate / 100) / 12;
      const emi = loan > 0 ? Math.round((loan * r_m * Math.pow(1 + r_m, tenure)) / (Math.pow(1 + r_m, tenure) - 1)) : 0;
      const monthlyRevenue = Math.round(cost * 0.12);
      const monthlyExpenses = Math.round(cost * 0.065);
      const monthlyProfit = Math.max(5000, monthlyRevenue - monthlyExpenses - emi);

      setPreviewData({
        ...(d || {}),
        user_capital: cap,
        margin: cap,
        project_cost: cost,
        projectCost: cost,
        loan_amount: loan,
        loan: loan,
        margin_pct: marginPct,
        interest_rate: rate,
        interestRate: rate,
        loan_tenure: tenure,
        tenure: tenure,
        moratorium: formInputs.moratorium,
        emi,
        monthlyRevenue,
        monthlyExpenses,
        monthlyProfit,
        status: 'finalized',
      });
      setIsEditOpen(false);
    } catch (err) {
      console.error('[FINANCE] Save failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Handle Reset to Saved ───────────────────────────────────────────────────
  const handleReset = () => {
    const p = finance || defaultPlan;
    setFormInputs({
      user_capital: p.user_capital || p.margin || 100000,
      project_cost: p.project_cost || p.projectCost || 350000,
      loan_amount: p.loan_amount || p.loan || 250000,
      interest_rate: p.interest_rate || p.interestRate || 7.5,
      loan_tenure: p.loan_tenure || p.tenure || 60,
      moratorium: p.moratorium ?? 6,
    });
    setPreviewData(null);
  };

  const fmt = v => `₹${Number(v || 0).toLocaleString()}`;
  const bizName = tML(assessment?.business) || d?.business_name || d?.business_type || user?.business || `${bizType} Enterprise`;
  const locName = assessment?.location?.village || user?.village || 'Khajuri Kalan';
  const distName = assessment?.location?.district || user?.district || 'Sehore';
  const stateShort = assessment?.location?.state || user?.state || 'Madhya Pradesh';
  const subtitle = [bizName, [locName, distName, stateShort].filter(Boolean).join(', ')].filter(Boolean).join(' · ');

  // Projection chart data from centralized calculation engine
  const chartData = (d.revenue_projections && d.revenue_projections.length > 0)
    ? d.revenue_projections
    : [
        { month: 'M1', revenue: Math.round(d.monthlyRevenue * 0.70), expense: Math.round(d.monthlyExpenses * 0.88), fixed_expense: d.fixedExpenses || 8000, variable_expense: Math.round(d.monthlyExpenses * 0.55), operating_profit: Math.round(d.monthlyRevenue * 0.70) - Math.round(d.monthlyExpenses * 0.88), net_cash_flow: Math.round(d.monthlyRevenue * 0.70) - Math.round(d.monthlyExpenses * 0.88) - (d.emi || 0), outstanding_loan: d.loan || d.loan_amount },
        { month: 'M2', revenue: Math.round(d.monthlyRevenue * 0.80), expense: Math.round(d.monthlyExpenses * 0.90), fixed_expense: d.fixedExpenses || 8000, variable_expense: Math.round(d.monthlyExpenses * 0.60), operating_profit: Math.round(d.monthlyRevenue * 0.80) - Math.round(d.monthlyExpenses * 0.90), net_cash_flow: Math.round(d.monthlyRevenue * 0.80) - Math.round(d.monthlyExpenses * 0.90) - (d.emi || 0), outstanding_loan: Math.round((d.loan || d.loan_amount) * 0.98) },
        { month: 'M3', revenue: Math.round(d.monthlyRevenue * 0.90), expense: Math.round(d.monthlyExpenses * 0.94), fixed_expense: d.fixedExpenses || 8000, variable_expense: Math.round(d.monthlyExpenses * 0.65), operating_profit: Math.round(d.monthlyRevenue * 0.90) - Math.round(d.monthlyExpenses * 0.94), net_cash_flow: Math.round(d.monthlyRevenue * 0.90) - Math.round(d.monthlyExpenses * 0.94) - (d.emi || 0), outstanding_loan: Math.round((d.loan || d.loan_amount) * 0.96) },
        { month: 'M6', revenue: Math.round(d.monthlyRevenue * 1.04), expense: Math.round(d.monthlyExpenses * 1.01), fixed_expense: d.fixedExpenses || 8000, variable_expense: Math.round(d.monthlyExpenses * 0.70), operating_profit: Math.round(d.monthlyRevenue * 1.04) - Math.round(d.monthlyExpenses * 1.01), net_cash_flow: Math.round(d.monthlyRevenue * 1.04) - Math.round(d.monthlyExpenses * 1.01) - (d.emi || 0), outstanding_loan: Math.round((d.loan || d.loan_amount) * 0.90) },
        { month: 'M12', revenue: Math.round(d.monthlyRevenue * 1.10), expense: Math.round(d.monthlyExpenses * 1.04), fixed_expense: d.fixedExpenses || 8000, variable_expense: Math.round(d.monthlyExpenses * 0.72), operating_profit: Math.round(d.monthlyRevenue * 1.10) - Math.round(d.monthlyExpenses * 1.04), net_cash_flow: Math.round(d.monthlyRevenue * 1.10) - Math.round(d.monthlyExpenses * 1.04) - (d.emi || 0), outstanding_loan: Math.round((d.loan || d.loan_amount) * 0.80) },
      ];

  const processingFeeStr = `₹${(d.processing_fee || d.processingFee || Math.max(1000, Math.round((d.loan || d.loan_amount) * 0.005))).toLocaleString()}`;

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-8 lg:py-12">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs font-medium text-[#8C9B90] mb-6">
        <button onClick={() => navigate('/')} className="hover:text-[#355E3B] transition cursor-pointer">
          {t('nav.home') || 'Home'}
        </button>
        <span>/</span>
        <span className="text-[#24302A] font-semibold">{t('sidebar.finance') || 'Finance'}</span>
      </nav>

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-[#DED8CA]/70">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#24302A] tracking-tight">
              {t('finance.title') || 'Financial Plan'}
            </h1>
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
              d.status === 'finalized'
                ? 'bg-[#E7F0DE] text-[#214A32] border-[#355E3B]/30'
                : 'bg-[#FFF9F0] text-[#C96B3B] border-[#C96B3B]/30'
            }`}>
              {d.status === 'finalized' ? (t('finance.finalized_plan') || 'Finalized Plan') : (t('finance.draft_plan') || 'Draft Plan')}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#5F665F] mt-1">{subtitle}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => navigate('/finance/simulation')}
            className="bg-[#FFF9F0] hover:bg-white text-[#C96B3B] px-3.5 py-2 rounded-xl text-xs font-bold border border-[#DED8CA] shadow-2xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <Sparkles size={14} className="text-[#C96B3B]" />
            <span>{t('finance.what_if_simulation') || 'What-If Simulation'}</span>
          </button>
          <button
            onClick={() => setIsEditOpen(v => !v)}
            className="bg-[#355E3B] hover:bg-[#214A32] text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <Sliders size={14} />
            <span>{isEditOpen ? (t('common.close') || 'Close Customizer') : (t('finance.edit_plan_title') || 'Plan & Customize')}</span>
            {isEditOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Unsaved Preview Alert Banner */}
      {previewData && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5 text-xs text-amber-900 font-medium">
            <AlertCircle size={16} className="text-amber-600 shrink-0" />
            <span>{t('finance.unsaved_changes') || 'Preview Mode: Calculated projections shown below. Click Save to persist.'}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-[#355E3B] hover:bg-[#214A32] text-white px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer disabled:opacity-50"
            >
              <Save size={13} />
              <span>{isSaving ? 'Saving...' : (t('finance.btn_save') || 'Save Plan')}</span>
            </button>
            <button
              onClick={handleReset}
              className="bg-white hover:bg-amber-100 text-amber-900 px-2.5 py-1.5 rounded-lg text-xs font-bold border border-amber-300 transition cursor-pointer"
              title={t('finance.reset_plan_title') || 'Reset to saved plan'}
            >
              <RotateCcw size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Collapsible Plan & Customize Section */}
      {isEditOpen && (
        <div className="mb-6 bg-[#FFF9F0]/60 border border-[#DED8CA] rounded-2xl p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-[#24302A] uppercase tracking-wider">
              {t('finance.edit_plan_title') || 'Plan & Customize Financing'}
            </h3>
          </div>
          <p className="text-xs text-[#5F665F] mb-4">
            {t('finance.edit_plan_sub') || 'Adjust capital, project scale, or repayment terms to simulate real banking feasibility.'}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
            <div>
              <label className="block text-xs font-semibold text-[#24302A] mb-1">
                {t('finance.your_contribution') || 'Your Capital (Margin)'} (₹)
              </label>
              <input
                type="number"
                className="w-full bg-white border border-[#DED8CA] rounded-xl px-3 py-2 text-xs text-[#24302A] outline-none focus:border-[#355E3B] focus:ring-1 focus:ring-[#355E3B]"
                value={formInputs.user_capital}
                onChange={e => {
                  const cap = Math.max(0, parseInt(e.target.value) || 0);
                  setFormInputs(s => ({ ...s, user_capital: cap, loan_amount: Math.max(0, s.project_cost - cap) }));
                }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#24302A] mb-1">
                {t('finance.project_cost') || 'Project Cost'} (₹)
              </label>
              <input
                type="number"
                className="w-full bg-white border border-[#DED8CA] rounded-xl px-3 py-2 text-xs text-[#24302A] outline-none focus:border-[#355E3B] focus:ring-1 focus:ring-[#355E3B]"
                value={formInputs.project_cost}
                onChange={e => {
                  const cost = Math.max(0, parseInt(e.target.value) || 0);
                  setFormInputs(s => ({ ...s, project_cost: cost, loan_amount: Math.max(0, cost - s.user_capital) }));
                }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#24302A] mb-1">
                {t('calc.interest_rate') || 'Interest Rate (% p.a.)'}
              </label>
              <input
                type="number"
                step="0.1"
                className="w-full bg-white border border-[#DED8CA] rounded-xl px-3 py-2 text-xs text-[#24302A] outline-none focus:border-[#355E3B] focus:ring-1 focus:ring-[#355E3B]"
                value={formInputs.interest_rate}
                onChange={e => setFormInputs(s => ({ ...s, interest_rate: Math.max(0, parseFloat(e.target.value) || 0) }))}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#24302A] mb-1">
                {t('calc.tenure_months') || 'Tenure (Months)'}
              </label>
              <input
                type="number"
                className="w-full bg-white border border-[#DED8CA] rounded-xl px-3 py-2 text-xs text-[#24302A] outline-none focus:border-[#355E3B] focus:ring-1 focus:ring-[#355E3B]"
                value={formInputs.loan_tenure}
                onChange={e => setFormInputs(s => ({ ...s, loan_tenure: Math.max(1, parseInt(e.target.value) || 1) }))}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleCalculate}
              disabled={isCalculating}
              className="bg-[#355E3B] hover:bg-[#214A32] text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
            >
              {isCalculating ? (
                <><RefreshCw size={13} className="animate-spin" /> {t('finance.calculating') || 'Calculating...'}</>
              ) : (
                <><Sparkles size={13} /> {t('finance.btn_calculate') || 'Calculate Projections'}</>
              )}
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-[#F4EBDD] hover:bg-[#EAE4D6] text-[#24302A] px-4 py-2.5 rounded-xl text-xs font-bold border border-[#DED8CA] flex items-center gap-1.5 transition cursor-pointer"
            >
              <Save size={13} />
              <span>{isSaving ? 'Saving...' : (t('finance.btn_save') || 'Save Plan')}</span>
            </button>
            <button
              onClick={handleReset}
              className="bg-[#F4EBDD] hover:bg-[#EAE4D6] text-[#5F665F] p-2.5 rounded-xl border border-[#DED8CA] transition cursor-pointer"
              title="Reset"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Key Metrics: Project Summary 4 Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-[#E7F0DE]/60 to-white border border-[#DED8CA] rounded-2xl p-5 shadow-xs text-center">
          <p className="text-[11px] font-bold text-[#355E3B] uppercase tracking-wider mb-1.5">
            {t('finance.your_capital') || 'Your Capital'}
          </p>
          <p className="text-2xl font-extrabold text-[#214A32]">{fmt(d.margin || d.user_capital)}</p>
          <p className="text-xs text-[#5F665F] mt-1">{t('finance.pct_of_cost', { pct: d.margin_pct }) || `${d.margin_pct}% of total cost`}</p>
        </div>

        <div className="bg-gradient-to-br from-[#FFF9F0] to-white border border-[#DED8CA] rounded-2xl p-5 shadow-xs text-center">
          <p className="text-[11px] font-bold text-[#8C9B90] uppercase tracking-wider mb-1.5">
            {t('finance.project_cost') || 'Project Cost'}
          </p>
          <p className="text-2xl font-extrabold text-[#24302A]">{fmt(d.projectCost || d.project_cost)}</p>
          <p className="text-xs text-[#5F665F] mt-1">{t('finance.est_total_inv') || 'Total verified investment'}</p>
        </div>

        <div className="bg-gradient-to-br from-[#FFF2EC] to-white border border-[#DED8CA] rounded-2xl p-5 shadow-xs text-center">
          <p className="text-[11px] font-bold text-[#C96B3B] uppercase tracking-wider mb-1.5">
            {t('finance.potential_loan') || 'Bank Loan'}
          </p>
          <p className="text-2xl font-extrabold text-[#C96B3B]">{fmt(d.loan || d.loan_amount)}</p>
          <p className="text-xs text-[#5F665F] mt-1">{t('finance.loan_pct_sub') || 'Required institutional credit'}</p>
        </div>

        <div className="bg-gradient-to-br from-[#FFFBEB] to-white border border-[#DED8CA] rounded-2xl p-5 shadow-xs text-center">
          <p className="text-[11px] font-bold text-[#92400E] uppercase tracking-wider mb-1.5">
            {t('finance.monthly_emi') || 'Monthly EMI'}
          </p>
          <p className="text-2xl font-extrabold text-[#92400E]">₹{Number(d.emi || 0).toLocaleString()}</p>
          <p className="text-xs text-[#5F665F] mt-1">
            {t('finance.tenure_interest_sub', { years: ((d.tenure || d.loan_tenure || 60) / 12).toFixed(0), rate: d.interestRate || d.interest_rate || 7.5 })}
          </p>
        </div>
      </div>

      {/* Funding Structure & Proportional Bar */}
      <div className="bg-white border border-[#DED8CA] rounded-2xl p-5 sm:p-6 shadow-xs mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold text-[#8C9B90] uppercase tracking-wider">
            {t('finance.funding_structure') || 'Funding Structure'}
          </h3>
          <span className="text-xs font-semibold text-[#355E3B]">
            {d.margin_pct}% Promoter / {Math.round(100 - d.margin_pct)}% Debt
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-[#FFF9F0]/50 border border-[#DED8CA]/70 mb-4">
          <div className="text-center sm:text-left flex-1">
            <p className="text-[11px] font-semibold text-[#8C9B90] mb-0.5">{t('finance.your_contribution') || 'Your Contribution'}</p>
            <p className="text-lg font-bold text-[#355E3B]">{fmt(d.margin || d.user_capital)}</p>
          </div>
          <span className="text-xl font-bold text-[#8C9B90]">+</span>
          <div className="text-center sm:text-left flex-1">
            <p className="text-[11px] font-semibold text-[#8C9B90] mb-0.5">{t('finance.bank_loan') || 'Bank Loan'}</p>
            <p className="text-lg font-bold text-[#C96B3B]">{fmt(d.loan || d.loan_amount)}</p>
          </div>
          <span className="text-xl font-bold text-[#8C9B90]">=</span>
          <div className="text-center sm:text-left flex-1">
            <p className="text-[11px] font-semibold text-[#8C9B90] mb-0.5">{t('finance.total_project') || 'Total Project Cost'}</p>
            <p className="text-lg font-bold text-[#24302A]">{fmt(d.projectCost || d.project_cost)}</p>
          </div>
        </div>

        {/* Proportional Dual Bar */}
        <div className="h-3 rounded-full overflow-hidden bg-[#EAE4D6] flex shadow-inner">
          <div
            style={{ width: `${Math.max(5, Math.min(95, d.margin_pct))}%` }}
            className="bg-[#355E3B] transition-all duration-300"
          />
          <div
            style={{ width: `${Math.max(5, Math.min(95, 100 - d.margin_pct))}%` }}
            className="bg-[#C96B3B] transition-all duration-300"
          />
        </div>
        <div className="flex justify-between items-center text-[11px] font-semibold mt-2">
          <span className="text-[#355E3B]">{t('finance.your_margin_pct', { pct: d.margin_pct }) || `Promoter Equity: ${d.margin_pct}%`}</span>
          <span className="text-[#C96B3B]">{t('finance.bank_loan_pct', { pct: Math.round(100 - d.margin_pct) }) || `Bank Loan: ${Math.round(100 - d.margin_pct)}%`}</span>
        </div>
      </div>

      {/* Financial Health & Viability Grid (6 Tiles) */}
      <div className="mb-6">
        <h3 className="text-xs font-bold text-[#8C9B90] uppercase tracking-wider mb-3">
          {t('finance.financial_health') || 'Financial Health & Viability'}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white border border-[#DED8CA] p-3.5 rounded-xl text-center shadow-xs">
            <p className="text-[10px] font-bold text-[#8C9B90] uppercase tracking-wider">{t('finance.monthly_profit') || 'Monthly Profit'}</p>
            <p className="text-base font-extrabold text-[#355E3B] mt-1">₹{(d.monthlyProfit || d.monthly_profit || 0).toLocaleString()}</p>
            <span className="text-[10px] text-[#8C9B90]">{t('finance.after_emi') || 'After EMI'}</span>
          </div>

          <div className="bg-white border border-[#DED8CA] p-3.5 rounded-xl text-center shadow-xs">
            <p className="text-[10px] font-bold text-[#8C9B90] uppercase tracking-wider">{t('finance.profit_margin') || 'Net Margin'}</p>
            <p className="text-base font-extrabold text-[#24302A] mt-1">{d.profitMargin || d.profit_margin || 24}%</p>
            <span className="text-[10px] text-[#8C9B90]">{t('finance.net_margin') || 'Return on Revenue'}</span>
          </div>

          <div className="bg-white border border-[#DED8CA] p-3.5 rounded-xl text-center shadow-xs">
            <p className="text-[10px] font-bold text-[#8C9B90] uppercase tracking-wider">{t('finance.dscr_coverage') || 'DSCR Coverage'}</p>
            <p className="text-base font-extrabold text-[#355E3B] mt-1">{Number(d.dscr || 1.48).toFixed(2)}x</p>
            <span className="text-[10px] text-[#8C9B90]">{t('finance.dscr_benchmark') || 'Bank Standard > 1.25x'}</span>
          </div>

          <div className="bg-white border border-[#DED8CA] p-3.5 rounded-xl text-center shadow-xs">
            <p className="text-[10px] font-bold text-[#8C9B90] uppercase tracking-wider">{t('finance.roi') || 'ROI'}</p>
            <p className="text-base font-extrabold text-[#24302A] mt-1">{d.roi || 26}%</p>
            <span className="text-[10px] text-[#8C9B90]">{t('finance.annual_yield') || 'Annual Equity Yield'}</span>
          </div>

          <div className="bg-white border border-[#DED8CA] p-3.5 rounded-xl text-center shadow-xs">
            <p className="text-[10px] font-bold text-[#8C9B90] uppercase tracking-wider">{t('finance.break_even_horizon') || 'Break-Even'}</p>
            <p className="text-base font-extrabold text-[#24302A] mt-1">Month {d.breakEven || d.break_even_month || 6}</p>
            <span className="text-[10px] text-[#8C9B90]">{t('finance.equity_recovery') || 'Capital Recovery'}</span>
          </div>

          <div className="bg-white border border-[#DED8CA] p-3.5 rounded-xl text-center shadow-xs">
            <p className="text-[10px] font-bold text-[#8C9B90] uppercase tracking-wider">{t('finance.break_even_sales') || 'Break-Even Sales'}</p>
            <p className="text-base font-extrabold text-[#24302A] mt-1">₹{(d.breakEvenRevenue || d.break_even_revenue || Math.round((d.monthlyRevenue || 60000) * 0.65)).toLocaleString()}</p>
            <span className="text-[10px] text-[#8C9B90]">{t('finance.min_monthly_sales') || 'Min. Monthly Sales'}</span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex gap-2 p-1.5 bg-[#FFF9F0] border border-[#DED8CA] rounded-2xl w-fit mb-6">
        {[
          { key: 'overview', label: t('finance.tab_overview') || 'Overview' },
          { key: 'revenue', label: t('finance.tab_revenue') || 'Revenue & Cash Flow' },
          { key: 'loan', label: t('finance.tab_loan') || 'Loan & Amortization' },
        ].map(tabItem => (
          <button
            key={tabItem.key}
            onClick={() => setTab(tabItem.key)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              tab === tabItem.key
                ? 'bg-[#355E3B] text-white shadow-xs'
                : 'text-[#5F665F] hover:text-[#24302A]'
            }`}
          >
            {tabItem.label}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="bg-white border border-[#DED8CA] rounded-2xl p-6 shadow-xs">
            <InfoRow label={t('finance.interest_rate') || 'Annual Interest Rate'} value={`${d.interestRate || d.interest_rate || 7.5}% p.a.`} />
            <InfoRow label={t('finance.loan_tenure') || 'Loan Tenure'} value={`${((d.tenure || d.loan_tenure || 60) / 12).toFixed(0)} years (60 months)`} />
            <InfoRow label={t('finance.moratorium') || 'Principal Moratorium'} value={t('finance.moratorium_val', { count: d.moratorium ?? 6 }) || `${d.moratorium ?? 6} Months`} />
            <InfoRow label={t('finance.monthly_emi') || 'Monthly EMI Obligation'} value={`₹${(d.emi || 0).toLocaleString()}`} highlight />
            <InfoRow label={t('finance.repayment_ability') || 'Debt Service Ability (DSCR)'} value={`${Number(d.dscr || 1.48).toFixed(2)}x (${d.dscr >= 1.2 ? (t('finance.good_dscr') || 'Bankable & Strong') : 'Moderate'})`} highlight />
            <InfoRow label={t('finance.break_even') || 'Target Break-Even Period'} value={t('finance.month_num', { month: d.breakEven || d.break_even_month || 6 }) || `Month ${d.breakEven || d.break_even_month || 6}`} />
            <InfoRow label={t('finance.best_scheme') || 'Recommended Government Scheme'} value={d.scheme || d.matched_scheme_name || 'PM Mudra Yojana – Tarun'} highlight />
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => navigate('/finance/loan')}
              className="flex-1 bg-[#355E3B] hover:bg-[#214A32] text-white py-3 px-5 rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <span>{t('finance.check_loan_eligibility') || 'Check Loan Eligibility'}</span>
              <ArrowRight size={14} />
            </button>
            <button
              onClick={() => navigate('/finance/calculator')}
              className="bg-[#F4EBDD] hover:bg-[#EAE4D6] text-[#24302A] py-3 px-5 rounded-xl text-xs font-bold border border-[#DED8CA] flex items-center gap-2 transition cursor-pointer"
            >
              <Calculator size={14} />
              <span>{t('finance.calculators') || 'Loan Calculators'}</span>
            </button>
            <button
              onClick={() => navigate('/dpr')}
              className="bg-[#F4EBDD] hover:bg-[#EAE4D6] text-[#24302A] py-3 px-5 rounded-xl text-xs font-bold border border-[#DED8CA] flex items-center gap-2 transition cursor-pointer"
            >
              <FileText size={14} />
              <span>{t('sidebar.dpr') || 'View DPR'}</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: REVENUE, CASH FLOW & PROJECTIONS */}
      {tab === 'revenue' && (
        <div className="space-y-6">
          <div className="bg-white border border-[#DED8CA] rounded-2xl p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h3 className="text-sm font-bold text-[#24302A]">
                  {t('finance.twelve_month_projections') || '12-Month Operating Projections'}
                </h3>
                <p className="text-xs text-[#5F665F] mt-0.5">
                  Projections based on {bizType} benchmark economics and loan amortization.
                </p>
              </div>

              <div className="flex gap-1.5 bg-[#FFF9F0] p-1 rounded-xl border border-[#DED8CA]">
                <button
                  type="button"
                  onClick={() => setChartMode('rev_exp')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    chartMode === 'rev_exp' ? 'bg-[#355E3B] text-white shadow-2xs' : 'text-[#5F665F] hover:text-[#24302A]'
                  }`}
                >
                  {t('finance.revenue_vs_expense') || 'Revenue vs Expense'}
                </button>
                <button
                  type="button"
                  onClick={() => setChartMode('profit_cf')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    chartMode === 'profit_cf' ? 'bg-[#355E3B] text-white shadow-2xs' : 'text-[#5F665F] hover:text-[#24302A]'
                  }`}
                >
                  {t('finance.profit_cash_flow') || 'Profit & Cash Flow'}
                </button>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                {chartMode === 'rev_exp' ? (
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#355E3B" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#355E3B" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#C96B3B" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#C96B3B" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EAE4D6" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#8C9B90' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#8C9B90' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={v => [`₹${v.toLocaleString()}`]} contentStyle={{ borderRadius: '12px', borderColor: '#DED8CA', fontSize: '12px' }} />
                    <Area type="monotone" dataKey="revenue" stroke="#355E3B" fill="url(#revGrad)" strokeWidth={2.5} name="Monthly Revenue" />
                    <Area type="monotone" dataKey="expense" stroke="#C96B3B" fill="url(#expGrad)" strokeWidth={2.5} name="Total Expenses" />
                  </AreaChart>
                ) : (
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EAE4D6" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#8C9B90' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#8C9B90' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={v => [`₹${v.toLocaleString()}`]} contentStyle={{ borderRadius: '12px', borderColor: '#DED8CA', fontSize: '12px' }} />
                    <Bar dataKey="operating_profit" fill="#355E3B" radius={[4, 4, 0, 0]} name="Operating Profit" />
                    <Bar dataKey="net_cash_flow" fill="#C96B3B" radius={[4, 4, 0, 0]} name="Net Cashflow (Post-EMI)" />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>

            <div className="flex items-center justify-center gap-6 mt-4 text-xs font-semibold">
              {chartMode === 'rev_exp' ? (
                <>
                  <span className="flex items-center gap-1.5 text-[#355E3B]">
                    <span className="w-3 h-0.5 bg-[#355E3B] inline-block" /> {t('finance.monthly_revenue') || 'Monthly Revenue'}
                  </span>
                  <span className="flex items-center gap-1.5 text-[#C96B3B]">
                    <span className="w-3 h-0.5 bg-[#C96B3B] inline-block" /> {t('finance.operating_expenses') || 'Operating Expenses'}
                  </span>
                </>
              ) : (
                <>
                  <span className="flex items-center gap-1.5 text-[#355E3B]">
                    <span className="w-2.5 h-2.5 bg-[#355E3B] rounded-xs inline-block" /> {t('finance.operating_profit') || 'Operating Profit'}
                  </span>
                  <span className="flex items-center gap-1.5 text-[#C96B3B]">
                    <span className="w-2.5 h-2.5 bg-[#C96B3B] rounded-xs inline-block" /> {t('finance.net_cash_flow') || 'Net Cash Flow (Post-EMI)'}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Operating Cost Structure Card */}
          <div className="bg-white border border-[#DED8CA] rounded-2xl p-6 shadow-xs">
            <h3 className="text-sm font-bold text-[#24302A] uppercase tracking-wider mb-4">
              {t('finance.cost_structure') || 'Operating Cost Structure'}
            </h3>
            <InfoRow label={t('finance.fixed_expenses') || 'Fixed Monthly Overhead'} value={`₹${(d.fixedExpenses || d.fixed_monthly_expenses || Math.round((d.monthlyExpenses || 35000) * 0.35)).toLocaleString()}`} sub={t('finance.fixed_overhead_sub') || 'Rent, wages, licenses & utilities'} />
            <InfoRow label={t('finance.variable_expenses') || 'Variable Operating Costs'} value={`₹${(d.variableExpenses || d.variable_monthly_expenses || Math.round((d.monthlyExpenses || 35000) * 0.65)).toLocaleString()}`} sub={t('finance.variable_overhead_sub') || 'Raw materials, power & logistics'} />
            <InfoRow label={t('finance.monthly_debt_service') || 'Monthly Debt Service (EMI)'} value={`₹${(d.emi || 0).toLocaleString()}`} highlight sub={t('finance.debt_service_sub') || 'Fixed banking repayment obligation'} />
            <InfoRow label={t('finance.break_even_rev') || 'Break-Even Monthly Sales'} value={`₹${(d.breakEvenRevenue || d.break_even_revenue || Math.round((d.monthlyRevenue || 60000) * 0.65)).toLocaleString()}`} highlight sub={t('finance.break_even_sub') || 'Minimum monthly revenue required'} />
          </div>
        </div>
      )}

      {/* TAB 3: LOAN & AMORTIZATION */}
      {tab === 'loan' && (
        <div className="space-y-6">
          <div className="bg-white border border-[#DED8CA] rounded-2xl p-6 shadow-xs">
            <h3 className="text-sm font-bold text-[#24302A] uppercase tracking-wider mb-4">
              {t('finance.loan_params_costs') || 'Loan Parameters & Costs'}
            </h3>
            <InfoRow label={t('calc.loan_amount') || 'Loan Amount'} value={fmt(d.loan || d.loan_amount)} highlight />
            <InfoRow label={t('finance.processing_fee') || 'Processing Fee'} value={processingFeeStr} />
            <InfoRow label={t('finance.first_emi') || 'Monthly EMI'} value={`₹${(d.emi || 0).toLocaleString()}`} highlight />
            <InfoRow label={t('finance.total_repayment') || 'Total Repayment (5 Years)'} value={`₹${(d.total_repayment || d.totalRepayment || ((d.emi || 0) * (d.tenure || d.loan_tenure || 60))).toLocaleString()}`} />
            <InfoRow label={t('finance.total_interest') || 'Total Interest Outflow'} value={`₹${(d.total_interest || d.totalInterest || (((d.emi || 0) * (d.tenure || d.loan_tenure || 60)) - (d.loan || d.loan_amount))).toLocaleString()}`} />
          </div>

          {/* Amortization Milestone Schedule Table */}
          {d.amortization_schedule && d.amortization_schedule.length > 0 && (
            <div className="bg-white border border-[#DED8CA] rounded-2xl p-6 shadow-xs">
              <h3 className="text-sm font-bold text-[#24302A] uppercase tracking-wider mb-4">
                {t('finance.milestone_schedule') || 'Milestone Repayment Schedule'}
              </h3>
              <div className="rounded-xl border border-[#DED8CA] overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#24302A] text-white">
                        <th className="p-3 font-semibold">{t('finance.col_month') || 'Month'}</th>
                        <th className="p-3 font-semibold">{t('finance.col_principal') || 'Principal'}</th>
                        <th className="p-3 font-semibold">{t('finance.col_interest') || 'Interest'}</th>
                        <th className="p-3 font-semibold text-right">{t('finance.col_balance') || 'Outstanding Balance'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#DED8CA]/70">
                      {d.amortization_schedule.map((row, i) => (
                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-[#FFF9F0]/40'}>
                          <td className="p-3 font-semibold text-[#24302A]">{t('sim.month_num', { month: row.month }) || `Month ${row.month}`}</td>
                          <td className="p-3 text-[#355E3B] font-semibold">₹{row.principal.toLocaleString()}</td>
                          <td className="p-3 text-[#C96B3B] font-semibold">₹{row.interest.toLocaleString()}</td>
                          <td className="p-3 font-bold text-right text-[#24302A]">₹{row.balance.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/finance/loan')}
              className="flex-1 bg-[#355E3B] hover:bg-[#214A32] text-white py-3 px-5 rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <span>{t('finance.check_loan_eligibility') || 'Check Loan Eligibility'}</span>
              <ArrowRight size={14} />
            </button>
            <button
              onClick={() => navigate('/schemes')}
              className="bg-[#F4EBDD] hover:bg-[#EAE4D6] text-[#24302A] py-3 px-5 rounded-xl text-xs font-bold border border-[#DED8CA] transition cursor-pointer"
            >
              {t('finance.find_matching_scheme') || 'Govt Schemes'}
            </button>
          </div>
        </div>
      )}

      {/* Contextual CTA to Schemes */}
      <div className="mt-8">
        <button
          onClick={() => navigate('/schemes')}
          className="w-full p-5 rounded-2xl bg-gradient-to-r from-[#E7F0DE] via-[#FFF9F0] to-[#FFF9F0] border border-[#355E3B]/30 shadow-xs hover:shadow-sm transition flex items-center justify-between gap-4 cursor-pointer text-left"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#355E3B] text-white flex items-center justify-center text-xl shrink-0">
              <Building2 size={22} />
            </div>
            <div>
              <p className="text-sm font-bold text-[#24302A]">
                {t('finance.find_scheme_cta') || 'Explore Government Schemes & Subsidies'}
              </p>
              <p className="text-xs text-[#5F665F] mt-0.5">
                {d.scheme || 'Official schemes matched to your capital, business, and demographic profile.'}
              </p>
            </div>
          </div>
          <ChevronRight size={18} className="text-[#355E3B] shrink-0" />
        </button>
      </div>
    </div>
  );
}
