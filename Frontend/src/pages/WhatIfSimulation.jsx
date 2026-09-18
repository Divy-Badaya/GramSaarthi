import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sliders,
  TrendingUp,
  Landmark,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  Scale,
  ChevronRight,
} from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { useT, useMLLabel } from '../locales/index.js';
import { simulateScenario, compareScenarios } from '../services/simulationService.js';
import { updateFinance } from '../services/financeService.js';

// Available business sectors with icons
const SECTORS = [
  { id: 'dairy', name: 'Dairy Farming', emoji: '🐄', defaultCost: 1000000, defaultCap: 150000 },
  { id: 'poultry', name: 'Poultry Farming', emoji: '🐔', defaultCost: 600000, defaultCap: 100000 },
  { id: 'food', name: 'Food Processing', emoji: '🌾', defaultCost: 800000, defaultCap: 120000 },
  { id: 'retail', name: 'Retail Store', emoji: '🏪', defaultCost: 400000, defaultCap: 80000 },
  { id: 'textile', name: 'Tailoring & Garments', emoji: '🧵', defaultCost: 350000, defaultCap: 50000 },
  { id: 'fisheries', name: 'Fisheries / Aquaculture', emoji: '🐟', defaultCost: 900000, defaultCap: 150000 },
  { id: 'transport', name: 'Rural Transport', emoji: '🚛', defaultCost: 750000, defaultCap: 120000 },
  { id: 'agriculture', name: 'Agri-Input Center', emoji: '🌱', defaultCost: 500000, defaultCap: 100000 },
];

export default function WhatIfSimulation() {
  const navigate = useNavigate();
  const t = useT();
  const tML = useMLLabel();
  const { user, assessment, finance } = useApp();

  // Active view tab: 'simulate' | 'compare'
  const [activeTab, setActiveTab] = useState('simulate');

  // Simulation variables state
  const [sector, setSector] = useState(() => {
    const userBiz = finance?.business_type || assessment?.business || user?.business_type || 'dairy';
    const found = SECTORS.find(s => s.id === userBiz.toLowerCase() || s.name.toLowerCase().includes(userBiz.toLowerCase()));
    return found ? found.id : 'dairy';
  });

  const [projectCost, setProjectCost] = useState(() => finance?.project_cost || finance?.projectCost || 1000000);
  const [userCapital, setUserCapital] = useState(() => finance?.user_capital || finance?.margin || 200000);
  const [customLoan, setCustomLoan] = useState(() => finance?.loan_amount || finance?.loan || null);
  const [autoLoan, setAutoLoan] = useState(true);
  const [revenueMultiplier, setRevenueMultiplier] = useState(1.0);
  const [expenseMultiplier, setExpenseMultiplier] = useState(1.0);
  const [tenure, setTenure] = useState(() => finance?.loan_tenure || finance?.tenure || 60);

  // Simulation results
  const [simResult, setSimResult] = useState(null);
  const [loadingSim, setLoadingSim] = useState(false);
  const [simError, setSimError] = useState(null);
  const [appliedNotice, setAppliedNotice] = useState(false);

  // Comparison state
  const [comparisonPreset, setComparisonPreset] = useState('dairy_vs_poultry');
  const [compareData, setCompareData] = useState(null);
  const [loadingCompare, setLoadingCompare] = useState(false);

  // ── Run Single Simulation ───────────────────────────────────────────────────
  const runSimulation = useCallback(async () => {
    setLoadingSim(true);
    setSimError(null);
    try {
      const payload = {
        business_type: sector,
        user_capital: Number(userCapital),
        project_cost: Number(projectCost),
        loan_amount: autoLoan ? null : (customLoan ? Number(customLoan) : null),
        loan_tenure: Number(tenure),
        revenue_multiplier: Number(revenueMultiplier),
        expense_multiplier: Number(expenseMultiplier),
        label: 'Current Scenario',
      };
      const result = await simulateScenario(payload);
      if (result) {
        setSimResult(result);
      }
    } catch (err) {
      console.error('[SIMULATION] Error running simulation:', err);
      setSimError(err.message || 'Simulation calculation failed.');
    } finally {
      setLoadingSim(false);
    }
  }, [sector, userCapital, projectCost, customLoan, autoLoan, tenure, revenueMultiplier, expenseMultiplier]);

  useEffect(() => {
    runSimulation();
  }, [runSimulation]);

  // ── Run Scenario Comparison ─────────────────────────────────────────────────
  const runComparePreset = useCallback(async (presetKey) => {
    setLoadingCompare(true);
    setComparisonPreset(presetKey);
    try {
      let scenarios = [];

      if (presetKey === 'dairy_vs_poultry') {
        scenarios = [
          {
            business_type: 'dairy',
            user_capital: 150000,
            project_cost: 800000,
            label: 'Dairy Farming (₹8L Outlay)',
          },
          {
            business_type: 'poultry',
            user_capital: 150000,
            project_cost: 800000,
            label: 'Poultry Farming (₹8L Outlay)',
          },
        ];
      } else if (presetKey === 'scale_2l_vs_5l_vs_10l') {
        scenarios = [
          {
            business_type: sector,
            user_capital: 50000,
            project_cost: 250000,
            label: 'Micro Scale (₹2.5L Outlay)',
          },
          {
            business_type: sector,
            user_capital: 100000,
            project_cost: 500000,
            label: 'Small Scale (₹5.0L Outlay)',
          },
          {
            business_type: sector,
            user_capital: 200000,
            project_cost: 1000000,
            label: 'Commercial Scale (₹10.0L Outlay)',
          },
        ];
      } else if (presetKey === 'margin_safety') {
        scenarios = [
          {
            business_type: sector,
            user_capital: Math.round(projectCost * 0.15),
            project_cost: projectCost,
            label: 'High Debt / Low Margin (15%)',
          },
          {
            business_type: sector,
            user_capital: Math.round(projectCost * 0.35),
            project_cost: projectCost,
            label: 'Conservative / Safe Margin (35%)',
          },
        ];
      }

      const compResult = await compareScenarios(scenarios);
      if (compResult) {
        setCompareData(compResult);
      }
    } catch (err) {
      console.error('[SIMULATION] Compare failed:', err);
    } finally {
      setLoadingCompare(false);
    }
  }, [sector, projectCost]);

  useEffect(() => {
    if (activeTab === 'compare') {
      runComparePreset(comparisonPreset);
    }
  }, [activeTab, runComparePreset, comparisonPreset]);

  // ── Apply Scenario as Active Finance Plan ───────────────────────────────────
  const handleApplyToPlan = async () => {
    if (!simResult) return;
    try {
      await updateFinance({
        business_type: simResult.business_type,
        business_name: simResult.business_name,
        project_cost: simResult.project_cost,
        user_capital: simResult.user_capital,
        loan_amount: simResult.loan_amount,
        interest_rate: simResult.interest_rate,
        loan_tenure: simResult.loan_tenure,
        moratorium: simResult.moratorium,
        status: 'draft',
      });
      setAppliedNotice(true);
      setTimeout(() => setAppliedNotice(false), 3000);
    } catch (err) {
      console.error('[SIMULATION] Failed to apply plan:', err);
    }
  };

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-8 lg:py-12">
      {/* Top Header & Breadcrumb */}
      <div className="mb-6 pb-4 border-b border-[#DED8CA]/70">
        <nav className="flex items-center gap-2 text-xs font-medium text-[#8C9B90] mb-3">
          <button onClick={() => navigate('/')} className="hover:text-[#355E3B] transition cursor-pointer">
            {t('nav.home') || 'Home'}
          </button>
          <span>/</span>
          <button onClick={() => navigate('/finance')} className="hover:text-[#355E3B] transition cursor-pointer">
            {t('nav.finance') || 'Finance'}
          </button>
          <span>/</span>
          <span className="text-[#24302A] font-semibold">{t('finance.what_if_simulation') || 'What-If Simulation'}</span>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#24302A] tracking-tight">
              {t('sim.title', 'What-If Business & Financial Simulator')}
            </h1>
            <p className="text-xs sm:text-sm text-[#5F665F] mt-1 max-w-2xl">
              {t('sim.subtitle', 'Model financial scenarios, stress test investments, and compare business options side-by-side')}
            </p>
          </div>

          <div className="flex gap-2 p-1 bg-[#FFF9F0] border border-[#DED8CA] rounded-xl self-start sm:self-auto">
            <button
              onClick={() => setActiveTab('simulate')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'simulate'
                  ? 'bg-[#355E3B] text-white shadow-xs'
                  : 'text-[#5F665F] hover:text-[#24302A] hover:bg-[#F4EBDD]'
              }`}
            >
              <Sliders size={14} />
              <span>{t('sim.tab_simulate', 'Single Model Simulator')}</span>
            </button>
            <button
              onClick={() => setActiveTab('compare')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'compare'
                  ? 'bg-[#355E3B] text-white shadow-xs'
                  : 'text-[#5F665F] hover:text-[#24302A] hover:bg-[#F4EBDD]'
              }`}
            >
              <Scale size={14} />
              <span>{t('sim.tab_compare', 'Side-by-Side Comparison')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Applied Notice Banner */}
      {appliedNotice && (
        <div className="mb-6 p-4 rounded-xl bg-[#E7F0DE] border border-[#355E3B]/30 flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#214A32] shadow-xs">
          <CheckCircle2 size={18} className="text-[#355E3B] shrink-0" />
          <span>{t('sim.applied_banner') || 'Financial simulation parameters successfully saved to your active plan!'}</span>
        </div>
      )}

      {/* ── TAB 1: INTERACTIVE SIMULATOR ────────────────────────────────────────── */}
      {activeTab === 'simulate' && (
        <div className="space-y-6">
          {/* Sector Selector Strip */}
          <div className="bg-white border border-[#DED8CA] rounded-2xl p-4 sm:p-5 shadow-xs">
            <p className="text-[11px] font-bold text-[#8C9B90] uppercase tracking-wider mb-3">
              {t('sim.select_sector')}
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {SECTORS.map((s) => {
                const isSel = sector === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => {
                      setSector(s.id);
                      setProjectCost(s.defaultCost);
                      setUserCapital(s.defaultCap);
                    }}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap border transition cursor-pointer ${
                      isSel
                        ? 'bg-[#355E3B] text-white border-[#355E3B] shadow-xs'
                        : 'bg-[#FFF9F0] text-[#24302A] border-[#DED8CA] hover:border-[#355E3B]'
                    }`}
                  >
                    <span>{s.emoji}</span>
                    <span>{tML(s.name)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Simulation 2-Col Layout: Controls (Left) + KPIs (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Variable Adjustment Controls Card (7 cols) */}
            <div className="lg:col-span-6 bg-white border border-[#DED8CA] rounded-2xl p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[#DED8CA]/70">
                <h3 className="text-base font-bold text-[#24302A] flex items-center gap-2">
                  <Sliders size={18} className="text-[#355E3B]" />
                  <span>{t('sim.variable_inputs')}</span>
                </h3>
                <button
                  onClick={runSimulation}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#355E3B] bg-[#E7F0DE] hover:bg-[#d8e6cb] transition cursor-pointer"
                >
                  <RefreshCw size={12} className={loadingSim ? 'animate-spin' : ''} />
                  <span>{t('sim.recalculate')}</span>
                </button>
              </div>

              {/* 1. Project Investment Outlay */}
              <div>
                <div className="flex justify-between items-center mb-1.5 text-xs">
                  <label className="font-bold text-[#24302A]">{t('sim.total_investment_outlay')}</label>
                  <span className="font-extrabold text-sm text-[#355E3B]">₹{Number(projectCost).toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min="100000"
                  max="5000000"
                  step="25000"
                  value={projectCost}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setProjectCost(val);
                    if (userCapital > val) setUserCapital(Math.round(val * 0.20));
                  }}
                  className="w-full accent-[#355E3B] cursor-pointer"
                />
                <div className="flex gap-1.5 mt-2">
                  {[200000, 500000, 1000000, 2500000].map(amt => (
                    <button
                      key={amt}
                      onClick={() => setProjectCost(amt)}
                      className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#FFF9F0] border border-[#DED8CA] text-[#5F665F] hover:text-[#24302A] hover:border-[#355E3B] transition cursor-pointer"
                    >
                      ₹{amt / 100000}L
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Own Capital Contribution */}
              <div>
                <div className="flex justify-between items-center mb-1.5 text-xs">
                  <label className="font-bold text-[#24302A]">{t('sim.own_contribution_margin')}</label>
                  <span className="font-extrabold text-sm text-[#355E3B]">
                    ₹{Number(userCapital).toLocaleString()} ({roundMargin(userCapital, projectCost)}%)
                  </span>
                </div>
                <input
                  type="range"
                  min="10000"
                  max={projectCost}
                  step="10000"
                  value={userCapital}
                  onChange={(e) => setUserCapital(Number(e.target.value))}
                  className="w-full accent-[#355E3B] cursor-pointer"
                />
                <p className="text-[11px] text-[#8C9B90] mt-1">{t('sim.bank_mandate_margin')}</p>
              </div>

              {/* 3. Loan Amount Mode */}
              <div className="p-3.5 bg-[#FFF9F0]/60 border border-[#DED8CA] rounded-xl">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-[#24302A]">{t('sim.bank_term_loan')}</label>
                  <button
                    onClick={() => setAutoLoan(!autoLoan)}
                    className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#E7F0DE] text-[#214A32] cursor-pointer border border-[#355E3B]/20"
                  >
                    {autoLoan ? t('sim.auto_balanced') : t('sim.custom_amount')}
                  </button>
                </div>
                {!autoLoan ? (
                  <input
                    type="number"
                    value={customLoan || ''}
                    onChange={(e) => setCustomLoan(e.target.value ? Number(e.target.value) : 0)}
                    placeholder={t('sim.enter_loan_placeholder')}
                    className="w-full bg-white border border-[#DED8CA] rounded-xl px-3 py-2 text-xs text-[#24302A] outline-none focus:border-[#355E3B]"
                  />
                ) : (
                  <p className="text-xs font-bold text-[#C96B3B]">
                    ₹{Math.max(0, projectCost - userCapital).toLocaleString()} ({t('sim.balancing_note')})
                  </p>
                )}
              </div>

              {/* 4. Revenue Sensitivity Factor */}
              <div>
                <div className="flex justify-between items-center mb-1.5 text-xs">
                  <label className="font-bold text-[#24302A]">{t('sim.revenue_sensitivity_title')}</label>
                  <span className={`font-bold ${revenueMultiplier >= 1 ? 'text-[#355E3B]' : 'text-[#C96B3B]'}`}>
                    {Math.round((revenueMultiplier - 1) * 100)}% ({revenueMultiplier}x {t('sim.baseline')})
                  </span>
                </div>
                <input
                  type="range"
                  min="0.70"
                  max="1.30"
                  step="0.05"
                  value={revenueMultiplier}
                  onChange={(e) => setRevenueMultiplier(Number(e.target.value))}
                  className="w-full accent-[#355E3B] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-[#8C9B90] mt-1">
                  <span>{t('sim.demand_deficit')}</span>
                  <span>{t('sim.baseline')}</span>
                  <span>{t('sim.peak_demand')}</span>
                </div>
              </div>

              {/* 5. Operating Cost Shock Factor */}
              <div>
                <div className="flex justify-between items-center mb-1.5 text-xs">
                  <label className="font-bold text-[#24302A]">{t('sim.operating_cost_variance')}</label>
                  <span className={`font-bold ${expenseMultiplier <= 1 ? 'text-[#355E3B]' : 'text-[#C96B3B]'}`}>
                    {Math.round((expenseMultiplier - 1) * 100)}% ({expenseMultiplier}x {t('sim.baseline')})
                  </span>
                </div>
                <input
                  type="range"
                  min="0.80"
                  max="1.40"
                  step="0.05"
                  value={expenseMultiplier}
                  onChange={(e) => setExpenseMultiplier(Number(e.target.value))}
                  className="w-full accent-[#355E3B] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-[#8C9B90] mt-1">
                  <span>{t('sim.cheaper_inputs')}</span>
                  <span>{t('sim.baseline')}</span>
                  <span>{t('sim.price_inflation')}</span>
                </div>
              </div>

              {/* 6. Repayment Tenure */}
              <div>
                <div className="flex justify-between items-center mb-1.5 text-xs">
                  <label className="font-bold text-[#24302A]">{t('sim.amortization_tenure')}</label>
                  <span className="font-bold text-[#5F665F]">
                    {t('sim.tenure_months_years', { months: tenure, years: (tenure / 12).toFixed(1) })}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[36, 48, 60, 84].map((tMonths) => (
                    <button
                      key={tMonths}
                      onClick={() => setTenure(tMonths)}
                      className={`py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        tenure === tMonths
                          ? 'bg-[#355E3B] text-white border-[#355E3B] shadow-xs'
                          : 'bg-[#FFF9F0] text-[#5F665F] border-[#DED8CA] hover:border-[#355E3B]'
                      }`}
                    >
                      {t('sim.tenure_years_btn', { years: tMonths / 12 })}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Recalculated Techno-Economic Dashboard (Right, 6 cols) */}
            <div className="lg:col-span-6 space-y-6">
              {simResult ? (
                <>
                  {/* Primary Output KPIs Card */}
                  <div className="bg-white border border-[#DED8CA] rounded-2xl p-6 shadow-xs space-y-5">
                    <div className="flex items-center justify-between pb-3 border-b border-[#DED8CA]/70">
                      <div>
                        <p className="text-[11px] font-bold text-[#8C9B90] uppercase tracking-wider">
                          {t('sim.enterprise_scale')}
                        </p>
                        <h4 className="text-base font-bold text-[#24302A]">
                          {simResult.business_name} ({simResult.scale_description})
                        </h4>
                      </div>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                        simResult.dscr >= 1.2 ? 'bg-[#E7F0DE] text-[#214A32]' : 'bg-[#FEF3C7] text-[#92400E]'
                      }`}>
                        {simResult.dscr >= 1.2 ? t('sim.bank_viable') : t('sim.tight_debt_cushion')}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-center">
                      <div className="bg-[#FFF9F0]/60 border border-[#DED8CA]/70 p-3.5 rounded-xl">
                        <p className="text-[11px] font-bold text-[#8C9B90] uppercase">{t('sim.monthly_profit_after_emi')}</p>
                        <p className={`text-xl font-extrabold mt-1 ${simResult.monthly_profit > 0 ? 'text-[#355E3B]' : 'text-red-600'}`}>
                          ₹{simResult.monthly_profit.toLocaleString()}
                        </p>
                        <p className="text-[11px] text-[#5F665F] mt-1">{t('sim.net_margin', { margin: simResult.profit_margin })}</p>
                      </div>

                      <div className="bg-[#FFF9F0]/60 border border-[#DED8CA]/70 p-3.5 rounded-xl">
                        <p className="text-[11px] font-bold text-[#8C9B90] uppercase">{t('sim.monthly_debt_service')}</p>
                        <p className="text-xl font-extrabold text-[#24302A] mt-1">
                          ₹{simResult.emi.toLocaleString()}
                        </p>
                        <p className="text-[11px] text-[#5F665F] mt-1">{t('sim.rate_over_tenure', { rate: simResult.interest_rate, tenure: simResult.loan_tenure })}</p>
                      </div>

                      <div className="bg-[#FFF9F0]/60 border border-[#DED8CA]/70 p-3.5 rounded-xl">
                        <p className="text-[11px] font-bold text-[#8C9B90] uppercase">{t('sim.debt_service_coverage')}</p>
                        <p className={`text-xl font-extrabold mt-1 ${simResult.dscr >= 1.2 ? 'text-[#355E3B]' : 'text-[#C96B3B]'}`}>
                          {simResult.dscr.toFixed(2)}x
                        </p>
                        <p className="text-[11px] text-[#5F665F] mt-1">{t('sim.benchmark_dscr')}</p>
                      </div>

                      <div className="bg-[#FFF9F0]/60 border border-[#DED8CA]/70 p-3.5 rounded-xl">
                        <p className="text-[11px] font-bold text-[#8C9B90] uppercase">{t('sim.payback_horizon')}</p>
                        <p className="text-xl font-extrabold text-[#24302A] mt-1">
                          {t('sim.month_num', { month: simResult.break_even_month })}
                        </p>
                        <p className="text-[11px] text-[#5F665F] mt-1">{t('sim.roi_pa', { roi: simResult.roi })}</p>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={handleApplyToPlan}
                        className="flex-1 bg-[#355E3B] hover:bg-[#214A32] text-white py-3 px-4 rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition cursor-pointer"
                      >
                        <Sparkles size={15} />
                        <span>{t('sim.apply_active_plan')}</span>
                      </button>
                      <button
                        onClick={() => navigate('/dpr')}
                        className="bg-[#F4EBDD] hover:bg-[#EAE4D6] text-[#24302A] py-3 px-4 rounded-xl text-xs font-semibold border border-[#DED8CA] transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>{t('sim.view_dpr')}</span>
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Multi-Dimensional Risk Appraisal Card */}
                  <div className="bg-white border border-[#DED8CA] rounded-2xl p-6 shadow-xs space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-[#DED8CA]/60">
                      <h4 className="text-sm font-bold text-[#24302A] flex items-center gap-2">
                        <ShieldAlert size={16} className="text-[#C96B3B]" />
                        <span>{t('sim.risk_appraisal_title')}</span>
                      </h4>
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-md ${
                        simResult.risk_summary.overall_risk === 'LOW' ? 'bg-[#E7F0DE] text-[#214A32]' : simResult.risk_summary.overall_risk === 'HIGH' ? 'bg-red-100 text-red-700' : 'bg-[#FEF3C7] text-[#92400E]'
                      }`}>
                        {t('sim.risk_badge', { risk: simResult.risk_summary.overall_risk, score: simResult.risk_summary.overall_score })}
                      </span>
                    </div>
                    <p className="text-xs text-[#5F665F] leading-relaxed">
                      {simResult.risk_summary.summary}
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                      {simResult.risk_summary.factors?.map((f, fIdx) => (
                        <div
                          key={fIdx}
                          className="p-2.5 rounded-xl bg-[#FFF9F0]/60 border border-[#DED8CA]/70"
                        >
                          <p className="text-[10px] font-bold text-[#8C9B90] uppercase truncate">{f.category}</p>
                          <p className="text-xs font-bold text-[#24302A] mt-0.5">{f.level}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Matched Scheme & Verified Benefits */}
                  <div className="p-4 rounded-2xl bg-[#E7F0DE]/50 border border-[#355E3B]/25">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Landmark size={16} className="text-[#355E3B]" />
                      <p className="text-xs font-bold text-[#214A32]">
                        {t('sim.matched_scheme_title', { scheme: simResult.matched_scheme.scheme_name })}
                      </p>
                    </div>
                    <p className="text-xs text-[#5F665F] leading-relaxed">
                      {simResult.matched_scheme.verified_benefits}
                    </p>
                  </div>
                </>
              ) : (
                <div className="p-12 text-center bg-white border border-[#DED8CA] rounded-2xl">
                  <div className="w-8 h-8 border-3 border-[#355E3B] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-xs text-[#8C9B90]">{t('sim.calculating_metrics')}</p>
                </div>
              )}
            </div>
          </div>

          {/* Model Assumptions Callout Block */}
          {simResult && simResult.assumptions && (
            <div className="bg-white border border-dashed border-[#DED8CA] rounded-2xl p-6 shadow-xs">
              <p className="text-xs font-bold text-[#8C9B90] uppercase tracking-wider mb-2">
                {t('sim.model_assumptions')}
              </p>
              <ul className="space-y-1.5 pl-4 list-disc text-xs text-[#5F665F] leading-relaxed">
                {simResult.assumptions.map((asm, idx) => (
                  <li key={idx}>{asm}</li>
                ))}
              </ul>
              <p className="text-[11px] text-[#8C9B90] mt-3">
                {t('sim.guidelines_footer')}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: SIDE-BY-SIDE COMPARISON ──────────────────────────────────────── */}
      {activeTab === 'compare' && (
        <div className="space-y-6">
          {/* Preset Buttons */}
          <div className="flex gap-2 flex-wrap">
            {[
              { id: 'dairy_vs_poultry', label: t('sim.preset_dairy_poultry') },
              { id: 'scale_2l_vs_5l_vs_10l', label: t('sim.preset_scale_outlay') },
              { id: 'margin_safety', label: t('sim.preset_margin_safety') },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => runComparePreset(p.id)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                  comparisonPreset === p.id
                    ? 'bg-[#355E3B] text-white border-[#355E3B] shadow-xs'
                    : 'bg-white text-[#24302A] border-[#DED8CA] hover:border-[#355E3B]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {loadingCompare ? (
            <div className="p-16 text-center bg-white border border-[#DED8CA] rounded-2xl shadow-xs">
              <div className="w-8 h-8 border-3 border-[#355E3B] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs text-[#8C9B90]">{t('sim.evaluating_compare')}</p>
            </div>
          ) : compareData ? (
            <div className="space-y-6">
              {/* Comparative Insights Box */}
              {compareData.insights && compareData.insights.length > 0 && (
                <div className="p-5 bg-[#E7F0DE]/60 border border-[#355E3B]/25 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-[#355E3B]" />
                    <h4 className="text-sm font-bold text-[#214A32]">
                      {t('sim.comparative_takeaways')}
                    </h4>
                  </div>
                  <ul className="space-y-1.5 pl-4 list-disc text-xs text-[#24302A] leading-relaxed">
                    {compareData.insights.map((ins, iIdx) => (
                      <li key={iIdx}><strong>{ins}</strong></li>
                    ))}
                  </ul>
                  {compareData.recommended_scenario_label && (
                    <div className="pt-1 flex items-center gap-2 text-xs">
                      <span className="text-[#5F665F]">{t('sim.balanced_recommendation')}</span>
                      <span className="font-bold px-2.5 py-0.5 rounded-full bg-[#355E3B] text-white text-[11px]">
                        ✓ {compareData.recommended_scenario_label}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Side-by-Side Matrix Table */}
              <div className="bg-white border border-[#DED8CA] rounded-2xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#24302A] text-white">
                        <th className="p-3.5 font-bold w-60 border-b border-[#DED8CA]">
                          {t('sim.comparative_parameter')}
                        </th>
                        {compareData.scenarios.map((s, sIdx) => (
                          <th key={sIdx} className="p-3.5 font-bold border-b border-[#DED8CA]">
                            {s.scenario_label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#DED8CA]/70">
                      {compareData.comparison_table.map((row, rIdx) => {
                        const isHighlight = row.Metric.includes('Net Monthly Profit') || row.Metric.includes('DSCR');
                        return (
                          <tr
                            key={rIdx}
                            className={isHighlight ? 'bg-[#E7F0DE]/30 font-semibold' : (rIdx % 2 === 0 ? 'bg-white' : 'bg-[#FFF9F0]/40')}
                          >
                            <td className="p-3.5 text-[#24302A] font-semibold">
                              {row.Metric}
                            </td>
                            {compareData.scenarios.map((s, sIdx) => (
                              <td
                                key={sIdx}
                                className={`p-3.5 ${isHighlight ? 'text-[#355E3B] font-bold' : 'text-[#5F665F]'}`}
                              >
                                {row[s.scenario_label] || '—'}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function roundMargin(capital, cost) {
  if (!cost || cost <= 0) return 0;
  return Math.round((capital / cost) * 100);
}
