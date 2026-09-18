import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sliders, Calculator, TrendingUp, Scale, Sparkles } from 'lucide-react';
import { useT } from '../locales/index.js';
import { useApp } from '../context/AppContext';

function CalcCard({ title, icon, iconBg = '#E7F0DE', iconColor = '#355E3B', children }) {
  return (
    <div className="bg-white border border-[#DED8CA] rounded-2xl p-6 shadow-xs hover:border-[#355E3B] transition flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
            style={{ background: iconBg, color: iconColor }}
          >
            {icon}
          </div>
          <h3 className="text-base font-bold text-[#24302A] tracking-tight">{title}</h3>
        </div>
        {children}
      </div>
    </div>
  );
}

function ResultRow({ label, value, highlight }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[#DED8CA]/50 last:border-b-0">
      <span className="text-xs font-medium text-[#5F665F]">{label}</span>
      <span className={`text-sm font-bold ${highlight ? 'text-[#355E3B]' : 'text-[#24302A]'}`}>
        {value}
      </span>
    </div>
  );
}

export default function FinanceCalculator() {
  const navigate = useNavigate();
  const t = useT();
  const { finance } = useApp();

  // EMI Calculator state initialized from user's active finance plan
  const [emi, setEmi] = useState(() => ({
    loan: finance?.loan || finance?.loan_amount || 500000,
    rate: finance?.interestRate || finance?.interest_rate || 7.5,
    tenure: finance?.tenure || finance?.loan_tenure || 60,
  }));

  const calcEmi = () => {
    const r = emi.rate / 1200;
    const n = emi.tenure;
    const p = emi.loan;
    if (p <= 0 || n <= 0) return 0;
    if (r <= 0) return Math.round(p / n);
    return Math.round(p * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1));
  };
  const emiVal = calcEmi();
  const totalPay = emiVal * emi.tenure;
  const totalInt = Math.max(0, totalPay - emi.loan);

  // Profit Calculator state
  const initRev = finance?.monthlyRevenue || finance?.expected_monthly_revenue || 60000;
  const initExp = finance?.monthlyExpenses || (finance?.fixed_monthly_expenses && finance?.variable_monthly_expenses ? finance.fixed_monthly_expenses + finance.variable_monthly_expenses : 35000);
  const initFixed = finance?.fixedMonthlyExpenses || finance?.fixed_monthly_expenses || Math.round(initExp * 0.30);
  const initVar = finance?.variableMonthlyExpenses || finance?.variable_monthly_expenses || Math.round(initExp * 0.70);

  const [profit, setProfit] = useState(() => ({
    revenue: initRev,
    cogs: initVar,
    overhead: initFixed,
  }));

  const grossProfit = profit.revenue - profit.cogs;
  const netProfit   = grossProfit - profit.overhead;
  const margin      = profit.revenue > 0 ? Math.round((netProfit / profit.revenue) * 100) : 0;

  // Break-even state
  const [be, setBe] = useState(() => ({
    fixed: initFixed + (finance?.monthlyEmi || finance?.emi || emiVal),
    varPct: initRev > 0 ? Math.min(95, Math.max(5, Math.round((initVar / initRev) * 100))) : 55,
    price: 45,
  }));

  const beContributionPerUnit = be.price - (be.price * (be.varPct / 100));
  const beUnits = beContributionPerUnit > 0 ? Math.ceil(be.fixed / beContributionPerUnit) : 0;
  const beRevenue = beUnits * be.price;

  const fmt = v => `₹${v.toLocaleString()}`;

  // No finance plan yet state
  if (!finance) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-12 text-center">
        <div className="max-w-md mx-auto bg-white border border-[#DED8CA] rounded-2xl p-10 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-[#E7F0DE] flex items-center justify-center text-3xl text-[#355E3B] mx-auto mb-4">
            🏦
          </div>
          <h2 className="text-xl font-bold text-[#24302A] mb-2">{t('calc.title') || 'Financial Calculators'}</h2>
          <p className="text-xs sm:text-sm text-[#5F665F] leading-relaxed mb-6">
            {t('finance.setup_desc') || 'Complete your business assessment to pre-fill the calculator with your real project data.'}
          </p>
          <button
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold text-white bg-[#355E3B] hover:bg-[#214A32] shadow-xs transition cursor-pointer border-0"
            onClick={() => navigate('/business/assessment')}
          >
            <span>{t('calc.start_assessment') || 'Start Assessment'}</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

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
        <span className="text-[#355E3B] font-semibold">{t('calc.title') || 'Calculators'}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <span className="inline-block text-xs font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full bg-[#E7F0DE] text-[#355E3B] mb-2.5">
            {t('calc.badge') || 'Financial Modeling'}
          </span>
          <h1 className="text-3xl lg:text-4xl font-bold text-[#24302A] tracking-tight">
            {t('calc.title') || 'Interactive Financial Calculators'}
          </h1>
          <p className="text-sm sm:text-base text-[#5F665F] mt-1.5 max-w-2xl">
            {t('calc.subtitle_plan') || 'Forecast EMIs, operating profits, and break-even points for your enterprise.'}
          </p>
        </div>
        <button
          onClick={() => navigate('/finance/simulation')}
          className="flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold text-white bg-[#355E3B] hover:bg-[#214A32] shadow-xs hover:shadow-md transition cursor-pointer border-0 shrink-0 self-start sm:self-center"
        >
          <Sliders size={15} />
          <span>{t('calc.what_if_studio') || 'What-If Studio'}</span>
        </button>
      </div>

      {/* 3-Column Calculator Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* 1. EMI Calculator */}
        <CalcCard title={t('calc.emi_title') || 'Bank Loan EMI Calculator'} icon="🏦" iconBg="#EBF3FE" iconColor="#1D4ED8">
          <div className="space-y-3.5 mb-5">
            <div>
              <label className="block text-xs font-bold text-[#24302A] mb-1.5">{t('calc.loan_amount') || 'Loan Amount'}</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-sm text-[#5F665F]">₹</span>
                <input
                  type="number"
                  className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-[#DED8CA] text-sm font-semibold text-[#24302A] outline-none focus:border-[#355E3B] focus:ring-1 focus:ring-[#355E3B] bg-[#FFF9F0]/40"
                  value={emi.loan}
                  onChange={e => setEmi(s => ({ ...s, loan: Math.max(0, parseInt(e.target.value) || 0) }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#24302A] mb-1.5">{t('calc.interest_rate') || 'Rate (% p.a.)'}</label>
                <input
                  type="number"
                  className="w-full px-3 py-2.5 rounded-xl border border-[#DED8CA] text-sm font-semibold text-[#24302A] outline-none focus:border-[#355E3B] focus:ring-1 focus:ring-[#355E3B] bg-[#FFF9F0]/40"
                  value={emi.rate}
                  step="0.1"
                  onChange={e => setEmi(s => ({ ...s, rate: Math.max(0, parseFloat(e.target.value) || 0) }))}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#24302A] mb-1.5">{t('calc.tenure_months') || 'Tenure (Months)'}</label>
                <input
                  type="number"
                  className="w-full px-3 py-2.5 rounded-xl border border-[#DED8CA] text-sm font-semibold text-[#24302A] outline-none focus:border-[#355E3B] focus:ring-1 focus:ring-[#355E3B] bg-[#FFF9F0]/40"
                  value={emi.tenure}
                  onChange={e => setEmi(s => ({ ...s, tenure: Math.max(1, parseInt(e.target.value) || 1) }))}
                />
              </div>
            </div>
          </div>
          <div className="bg-[#FFF9F0] border border-[#DED8CA] rounded-xl p-4">
            <ResultRow label={t('calc.monthly_emi') || 'Monthly EMI'} value={fmt(emiVal)} highlight />
            <ResultRow label={t('calc.total_payment') || 'Total Payment'} value={fmt(totalPay)} />
            <ResultRow label={t('calc.total_interest') || 'Total Interest'} value={fmt(totalInt)} />
          </div>
        </CalcCard>

        {/* 2. Profit & Loss Calculator */}
        <CalcCard title={t('calc.profit_title') || 'Operating Profit & Margin'} icon="📈" iconBg="#E7F0DE" iconColor="#355E3B">
          <div className="space-y-3.5 mb-5">
            {[
              { label: t('calc.monthly_revenue') || 'Expected Monthly Revenue', key: 'revenue' },
              { label: t('calc.cogs') || 'Raw Materials & Variable Cost', key: 'cogs' },
              { label: t('calc.monthly_overhead') || 'Fixed Monthly Overhead', key: 'overhead' },
            ].map(({ label, key }) => (
              <div key={key}>
                <label className="block text-xs font-bold text-[#24302A] mb-1.5">{label}</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-sm text-[#5F665F]">₹</span>
                  <input
                    type="number"
                    className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-[#DED8CA] text-sm font-semibold text-[#24302A] outline-none focus:border-[#355E3B] focus:ring-1 focus:ring-[#355E3B] bg-[#FFF9F0]/40"
                    value={profit[key]}
                    onChange={e => setProfit(s => ({ ...s, [key]: Math.max(0, parseInt(e.target.value) || 0) }))}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="bg-[#FFF9F0] border border-[#DED8CA] rounded-xl p-4">
            <ResultRow label={t('calc.gross_profit') || 'Gross Profit'} value={fmt(grossProfit)} />
            <ResultRow label={t('calc.net_profit') || 'Net Operating Profit'} value={fmt(netProfit)} highlight />
            <ResultRow label={t('calc.profit_margin') || 'Net Margin'} value={`${margin}%`} />
          </div>
        </CalcCard>

        {/* 3. Break-Even Analysis */}
        <CalcCard title={t('calc.break_even_title') || 'Break-Even Analysis'} icon="⚖️" iconBg="#FBEADF" iconColor="#C96B3B">
          <div className="space-y-3.5 mb-5">
            <div>
              <label className="block text-xs font-bold text-[#24302A] mb-1.5">{t('calc.fixed_costs') || 'Total Fixed Costs (Monthly)'}</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-sm text-[#5F665F]">₹</span>
                <input
                  type="number"
                  className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-[#DED8CA] text-sm font-semibold text-[#24302A] outline-none focus:border-[#355E3B] focus:ring-1 focus:ring-[#355E3B] bg-[#FFF9F0]/40"
                  value={be.fixed}
                  onChange={e => setBe(s => ({ ...s, fixed: Math.max(0, parseInt(e.target.value) || 0) }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#24302A] mb-1.5">{t('calc.var_cost_pct') || 'Variable Cost %'}</label>
                <input
                  type="number"
                  className="w-full px-3 py-2.5 rounded-xl border border-[#DED8CA] text-sm font-semibold text-[#24302A] outline-none focus:border-[#355E3B] focus:ring-1 focus:ring-[#355E3B] bg-[#FFF9F0]/40"
                  value={be.varPct}
                  onChange={e => setBe(s => ({ ...s, varPct: Math.min(99, Math.max(0, parseInt(e.target.value) || 0)) }))}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#24302A] mb-1.5">{t('calc.selling_price_unit') || 'Unit Price (₹)'}</label>
                <input
                  type="number"
                  className="w-full px-3 py-2.5 rounded-xl border border-[#DED8CA] text-sm font-semibold text-[#24302A] outline-none focus:border-[#355E3B] focus:ring-1 focus:ring-[#355E3B] bg-[#FFF9F0]/40"
                  value={be.price}
                  onChange={e => setBe(s => ({ ...s, price: Math.max(1, parseInt(e.target.value) || 1) }))}
                />
              </div>
            </div>
          </div>
          <div className="bg-[#FFF9F0] border border-[#DED8CA] rounded-xl p-4">
            <ResultRow label={t('calc.be_units') || 'Break-even Units'} value={beUnits.toLocaleString()} highlight />
            <ResultRow label={t('calc.be_revenue') || 'Break-even Revenue'} value={fmt(beRevenue)} />
          </div>
        </CalcCard>
      </div>

      {/* Bottom CTA to Loan Eligibility */}
      <div className="p-6 rounded-2xl border border-[#DED8CA] bg-white hover:border-[#355E3B] transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#E7F0DE] flex items-center justify-center text-2xl shrink-0">
            📊
          </div>
          <div>
            <h3 className="text-base font-bold text-[#24302A]">
              {t('calc.check_loan_eligibility') || 'Ready to check your official loan borrowing limit?'}
            </h3>
            <p className="text-xs text-[#5F665F] mt-0.5">
              Evaluate multi-constraint DSCR ratios and government priority lending rules.
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/finance/loan')}
          className="flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold text-white bg-[#355E3B] hover:bg-[#214A32] shadow-xs transition cursor-pointer border-0 shrink-0 self-end sm:self-center"
        >
          <span>Check Eligibility Now</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}
