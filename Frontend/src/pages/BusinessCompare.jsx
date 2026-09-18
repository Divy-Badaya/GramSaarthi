import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Trophy, ArrowRight, RefreshCw, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { useT } from '../locales/index.js';
import { useApp } from '../context/AppContext';
import { compareBusinesses, getBusinessTypes } from '../services/businessCompareService.js';

// ── Emoji lookup for business types ──────────────────────────────────────────
const EMOJI_MAP = {
  dairy: '🐄', poultry: '🐔', retail: '🏪', textile: '🧵',
  food: '🌾', fisheries: '🐟', transport: '🚛', agriculture: '🌱',
};

export default function BusinessCompare() {
  const navigate = useNavigate();
  const location = useLocation();
  const t = useT();
  const { user, assessment, selectBusiness } = useApp();

  // ── State ──────────────────────────────────────────────────────────────────
  const [availableTypes, setAvailableTypes] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [phase, setPhase] = useState('loading'); // 'select' | 'loading' | 'result' | 'error'

  // ── Load available business types on mount ─────────────────────────────────
  useEffect(() => {
    getBusinessTypes()
      .then(types => {
        if (types && Array.isArray(types)) {
          setAvailableTypes(types);
        }
      })
      .catch(err => {
        console.warn('[COMPARE] Failed to load business types:', err);
        setAvailableTypes([
          { id: 'dairy', name: 'Dairy Farming', emoji: '🐄' },
          { id: 'poultry', name: 'Poultry Farming', emoji: '🐔' },
          { id: 'retail', name: 'Retail Shop', emoji: '🏪' },
          { id: 'food', name: 'Food Processing', emoji: '🌾' },
          { id: 'textile', name: 'Tailoring', emoji: '🧵' },
          { id: 'fisheries', name: 'Fisheries', emoji: '🐟' },
          { id: 'transport', name: 'Transport', emoji: '🚛' },
          { id: 'agriculture', name: 'Agriculture', emoji: '🌱' },
        ]);
      });
  }, []);

  // ── Run comparison ─────────────────────────────────────────────────────────
  const runComparison = useCallback(async (idsToCompare = selectedIds) => {
    if (!idsToCompare || idsToCompare.length < 2) {
      setPhase('select');
      return;
    }
    setLoading(true);
    setError(null);
    setPhase('loading');

    try {
      const result = await compareBusinesses(idsToCompare);
      if (result && result.businesses) {
        setComparisonData(result);
        setPhase('result');
      } else {
        setError(t('compare.error_generic', 'Failed to load comparison data'));
        setPhase('error');
      }
    } catch (err) {
      console.error('[COMPARE] Comparison failed:', err);
      setError(err.message || t('compare.error_generic', 'Something went wrong'));
      setPhase('error');
    } finally {
      setLoading(false);
    }
  }, [selectedIds, t]);

  // ── Determine initial selection on mount and run comparison ────────────────
  useEffect(() => {
    let initial = ['dairy', 'retail', 'food'];
    if (location.state?.selected && Array.isArray(location.state.selected) && location.state.selected.length >= 2) {
      initial = location.state.selected.slice(0, 4);
    } else if (location.state?.business) {
      const b = location.state.business;
      const defaults = ['dairy', 'retail', 'food'].filter(x => x !== b);
      initial = [b, ...defaults].slice(0, 3);
    } else if (assessment?.business) {
      const b = assessment.business;
      const defaults = ['dairy', 'retail', 'food'].filter(x => x !== b);
      initial = [b, ...defaults].slice(0, 3);
    }
    setSelectedIds(initial);
    runComparison(initial);
  }, []);

  // ── Toggle business selection ──────────────────────────────────────────────
  const toggleBusiness = useCallback((id) => {
    setSelectedIds(prev => {
      let next;
      if (prev.includes(id)) {
        next = prev.filter(x => x !== id);
      } else {
        if (prev.length >= 4) return prev;
        next = [...prev, id];
      }
      return next;
    });
  }, []);

  // ── Handle CTA: Analyze ────────────────────────────────────────────────────
  const handleAnalyze = useCallback((biz) => {
    navigate('/business/analysis', {
      state: {
        business: biz.business_type || biz.id,
        businessName: biz.business_name || biz.name,
      },
    });
  }, [navigate]);

  // ── Handle CTA: Select This Business ───────────────────────────────────────
  const handleSelectThis = useCallback((biz) => {
    if (selectBusiness) {
      selectBusiness(biz.business_type || biz.id);
    }
    navigate('/finance', {
      state: {
        business: biz.business_type || biz.id,
        businessName: biz.business_name || biz.name,
      },
    });
  }, [navigate, selectBusiness]);

  // ── Metric configuration ───────────────────────────────────────────────────
  const metrics = [
    { key: 'market_demand_score',   label: t('compare.metric_demand', 'Market Demand') },
    { key: 'profit_margin_score',   label: t('compare.metric_profit', 'Profit Margin') },
    { key: 'competition_score',     label: t('compare.metric_competition', 'Low Competition') },
    { key: 'setup_ease_score',      label: t('compare.metric_setup_ease', 'Ease of Setup') },
    { key: 'location_suitability',  label: t('compare.metric_location', 'Location Fit') },
    { key: 'user_profile_fit',      label: t('compare.metric_profile_fit', 'Profile Fit') },
  ];

  const overviewRows = [
    { label: t('compare.investment', 'Typical Investment'), key: 'typical_investment' },
    { label: t('compare.demand_level', 'Market Demand'),    key: 'demand' },
    { label: t('compare.risk_level', 'Risk Level'),          key: 'risk' },
    { label: t('compare.expected_profit', 'Expected Monthly Profit'), key: 'expected_monthly_profit' },
    { label: t('compare.breakeven', 'Break-even Period'),   key: 'breakeven_months' },
    { label: t('compare.recommended_scheme', 'Best Govt Scheme'), key: 'recommended_scheme' },
  ];

  const locStr = [
    assessment?.location?.village || user?.village,
    assessment?.location?.district || user?.district,
  ].filter(Boolean).join(', ') || t('compare.your_location', 'your location');

  const businesses = comparisonData?.businesses || [];
  const recommended = comparisonData?.recommended_business;

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
        <span>{t('nav.discover', 'Discover')}</span>
        <span className="opacity-40">/</span>
        <span className="text-[#355E3B] font-semibold">{t('compare.title', 'Compare Businesses')}</span>
      </div>

      {/* Header */}
      <div className="mb-8">
        <span className="inline-block text-xs font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full bg-[#E7F0DE] text-[#355E3B] mb-2.5">
          {t('compare.badge', 'Side-by-Side Analysis')}
        </span>
        <h1 className="text-3xl lg:text-4xl font-bold text-[#24302A] tracking-tight">
          {t('compare.title', 'Compare Businesses')}
        </h1>
        <p className="text-sm sm:text-base text-[#5F665F] mt-1.5 max-w-2xl">
          {t('compare.subtitle_dynamic', 'Side-by-side feasibility, profit, and risk comparison for {location}', { location: locStr })}
        </p>
      </div>

      {/* ── Business Selector Card ── */}
      <div className="bg-white border border-[#DED8CA] rounded-2xl p-6 shadow-xs mb-8">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-bold text-[#24302A]">
            {t('compare.select_businesses', 'Select 2–4 businesses to compare')}
          </p>
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${
            selectedIds.length >= 2 ? 'bg-[#E7F0DE] text-[#214A32]' : 'bg-[#F4EBDD] text-[#5F665F]'
          }`}>
            {selectedIds.length} / 4 Selected
          </span>
        </div>

        <div className="flex flex-wrap gap-2.5 mb-5">
          {availableTypes.map(bt => {
            const isSelected = selectedIds.includes(bt.id);
            return (
              <button
                key={bt.id}
                onClick={() => toggleBusiness(bt.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                  isSelected
                    ? 'bg-[#E7F0DE] text-[#214A32] border-[#355E3B] shadow-xs'
                    : 'bg-[#FFF9F0] text-[#5F665F] border-[#DED8CA] hover:bg-[#F4EBDD]'
                } ${selectedIds.length >= 4 && !isSelected ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span className="text-base">{bt.emoji || EMOJI_MAP[bt.id] || '🏢'}</span>
                <span>{bt.name}</span>
                {isSelected && <CheckCircle2 size={15} className="text-[#355E3B]" />}
              </button>
            );
          })}
        </div>

        {selectedIds.length >= 2 && (
          <button
            disabled={loading}
            onClick={() => runComparison(selectedIds)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#355E3B] hover:bg-[#214A32] shadow-xs transition cursor-pointer border-0"
          >
            {loading ? (
              <><RefreshCw size={14} className="animate-spin" /> {t('compare.loading', 'Comparing...')}</>
            ) : (
              <><RefreshCw size={14} /> {t('compare.compare_btn', 'Update Comparison')}</>
            )}
          </button>
        )}
      </div>

      {/* ── State 1: Loading State ── */}
      {phase === 'loading' && (
        <div className="bg-white border border-[#DED8CA] rounded-2xl p-12 text-center shadow-xs mb-8">
          <RefreshCw size={36} className="text-[#355E3B] animate-spin mx-auto mb-4" />
          <h3 className="text-lg font-bold text-[#24302A] mb-1">
            {t('compare.loading_title', 'Analyzing businesses...')}
          </h3>
          <p className="text-xs sm:text-sm text-[#5F665F] mb-6">
            {t('compare.loading_sub', 'Calculating financial projections, market scores and suitability')}
          </p>
          <div className="space-y-2 max-w-md mx-auto">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-8 bg-[#F4EBDD]/60 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      )}

      {/* ── State 9: Error State ── */}
      {phase === 'error' && (
        <div className="bg-white border border-[#DED8CA] rounded-2xl p-10 text-center shadow-xs mb-8">
          <AlertCircle size={36} className="text-[#C94A3B] mx-auto mb-3" />
          <h3 className="text-lg font-bold text-[#24302A] mb-1">
            {t('compare.error_title', 'Comparison Failed')}
          </h3>
          <p className="text-xs sm:text-sm text-[#5F665F] mb-5">
            {error || t('compare.error_generic', 'Unable to calculate comparison. Please try again.')}
          </p>
          <button
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#355E3B] hover:bg-[#214A32] transition cursor-pointer border-0"
            onClick={() => runComparison(selectedIds)}
          >
            {t('compare.retry', 'Retry')}
          </button>
        </div>
      )}

      {/* ── Recommendation Banner ── */}
      {phase === 'result' && recommended && selectedIds.length >= 2 && (
        <div className="bg-[#E7F0DE] border border-[#355E3B]/30 rounded-2xl p-5 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#355E3B] text-white flex items-center justify-center shrink-0">
              <Trophy size={24} />
            </div>
            <div>
              <p className="text-base font-bold text-[#214A32] flex items-center gap-2">
                <span>{recommended.name}</span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#355E3B] text-white">Top Recommendation</span>
              </p>
              <p className="text-xs text-[#5F665F] mt-0.5 leading-relaxed">
                {recommended.reason}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              const biz = businesses.find(b => b.business_type === recommended.id) || { business_type: recommended.id, business_name: recommended.name };
              handleAnalyze(biz);
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#355E3B] hover:bg-[#214A32] shadow-xs transition cursor-pointer border-0 shrink-0 self-end sm:self-center"
          >
            <span>Analyze Details</span>
            <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* ── Comparison Table ── */}
      {phase === 'result' && businesses.length >= 2 && (
        <div className="bg-white border border-[#DED8CA] rounded-2xl shadow-xs overflow-hidden overflow-x-auto">
          {/* Top Headers Row */}
          <div
            className="grid border-b border-[#DED8CA]"
            style={{
              gridTemplateColumns: `180px repeat(${businesses.length}, minmax(170px, 1fr))`,
            }}
          >
            <div className="p-4 bg-[#FFF9F0] border-r border-[#DED8CA] flex items-center">
              <span className="text-xs font-bold text-[#5F665F] uppercase tracking-wider">Metrics</span>
            </div>
            {businesses.map(b => (
              <div
                key={b.business_type}
                className={`p-5 text-center border-r border-[#DED8CA] last:border-r-0 relative ${
                  b.is_recommended ? 'bg-[#E7F0DE]/40' : 'bg-white'
                }`}
              >
                {b.is_recommended && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-[#355E3B] text-white text-[9px] font-bold px-3 py-0.5 rounded-b-lg uppercase tracking-wider">
                    Best Match
                  </div>
                )}
                <div className="text-3xl mb-2 mt-2">{EMOJI_MAP[b.business_type] || '🏢'}</div>
                <h4 className="text-sm font-bold text-[#24302A] mb-1">{b.business_name}</h4>
                <div className="inline-flex items-baseline gap-1">
                  <span className={`text-2xl font-bold ${b.is_recommended ? 'text-[#355E3B]' : 'text-[#24302A]'}`}>
                    {b.overall_score}
                  </span>
                  <span className="text-xs text-[#8C9B90]">/100</span>
                </div>
              </div>
            ))}
          </div>

          {/* Overview Rows */}
          {overviewRows.map(({ label, key }) => (
            <div
              key={key}
              className="grid border-b border-[#DED8CA] hover:bg-[#FFF9F0]/40 transition"
              style={{
                gridTemplateColumns: `180px repeat(${businesses.length}, minmax(170px, 1fr))`,
              }}
            >
              <div className="p-3.5 px-4 bg-[#FFF9F0]/60 border-r border-[#DED8CA] flex items-center">
                <span className="text-xs font-semibold text-[#5F665F]">{label}</span>
              </div>
              {businesses.map(b => (
                <div
                  key={b.business_type}
                  className={`p-3.5 px-4 text-center border-r border-[#DED8CA] last:border-r-0 flex items-center justify-center ${
                    b.is_recommended ? 'bg-[#E7F0DE]/20' : ''
                  }`}
                >
                  <span className="text-xs font-bold text-[#24302A]">
                    {key === 'demand' ? t(`card.demand_${(b[key] || 'medium').toLowerCase()}`, b[key]) :
                     key === 'risk' ? t(`card.risk_${(b[key] || 'medium').toLowerCase()}`, b[key]) :
                     b[key] || '—'}
                  </span>
                </div>
              ))}
            </div>
          ))}

          {/* Metric Score Rows */}
          {metrics.map(({ key, label }) => {
            const bestVal = Math.max(...businesses.map(b => b[key] || 0));
            return (
              <div
                key={key}
                className="grid border-b border-[#DED8CA] hover:bg-[#FFF9F0]/40 transition"
                style={{
                  gridTemplateColumns: `180px repeat(${businesses.length}, minmax(170px, 1fr))`,
                }}
              >
                <div className="p-3.5 px-4 bg-[#FFF9F0]/60 border-r border-[#DED8CA] flex items-center">
                  <span className="text-xs font-semibold text-[#5F665F]">{label}</span>
                </div>
                {businesses.map(b => {
                  const val = b[key] || 0;
                  const isBest = val === bestVal && val > 0;
                  return (
                    <div
                      key={b.business_type}
                      className={`p-3.5 px-4 text-center border-r border-[#DED8CA] last:border-r-0 flex flex-col items-center justify-center gap-1.5 ${
                        b.is_recommended ? 'bg-[#E7F0DE]/20' : ''
                      }`}
                    >
                      <span className={`text-xs font-bold ${isBest ? 'text-[#355E3B]' : 'text-[#24302A]'}`}>
                        {val}%
                      </span>
                      <div className="w-full max-w-[120px] h-1.5 bg-[#DED8CA]/60 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${val}%`,
                            background: isBest ? '#355E3B' : '#8C9B90',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* Bottom Action Row */}
          <div
            className="grid"
            style={{
              gridTemplateColumns: `180px repeat(${businesses.length}, minmax(170px, 1fr))`,
            }}
          >
            <div className="p-4 bg-[#FFF9F0]/60 border-r border-[#DED8CA]" />
            {businesses.map(b => (
              <div
                key={b.business_type}
                className={`p-4 text-center border-r border-[#DED8CA] last:border-r-0 ${
                  b.is_recommended ? 'bg-[#E7F0DE]/20' : ''
                }`}
              >
                <button
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition cursor-pointer border-0 ${
                    b.is_recommended
                      ? 'bg-[#355E3B] text-white hover:bg-[#214A32] shadow-xs'
                      : 'bg-[#F4EBDD] text-[#24302A] hover:bg-[#EAE4D6]'
                  }`}
                  onClick={() => b.is_recommended ? handleSelectThis(b) : handleAnalyze(b)}
                >
                  {b.is_recommended ? t('compare.select_this', 'Select This →') : t('compare.analyze', 'Analyze')}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
