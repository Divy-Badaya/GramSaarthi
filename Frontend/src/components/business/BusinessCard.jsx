import React from 'react';
import { ArrowRight } from 'lucide-react';
import { useT, useMLLabel } from '../../locales/index.js';

const DEMAND_STYLE = {
  'Very High': 'text-[#355E3B]',
  'High':      'text-[#355E3B]',
  'Medium':    'text-[#C96B3B]',
  'Low':       'text-[#DC2626]',
};
const RISK_STYLE = {
  'Very Low':    'text-[#355E3B]',
  'Low':         'text-[#355E3B]',
  'Medium':      'text-[#C96B3B]',
  'Medium-High': 'text-[#D97706]',
  'High':        'text-[#DC2626]',
};

/**
 * BusinessCard — clean Figma-styled reusable card for business ideas list.
 */
export default function BusinessCard({ business, highlighted = false, onAnalyze, onCompare }) {
  const t = useT();
  const tML = useMLLabel();
  const biz = business;
  const demandCls = DEMAND_STYLE[biz.demand] || 'text-[#5F665F]';
  const riskCls   = RISK_STYLE[biz.risk]     || 'text-[#C96B3B]';

  // Translate demand/risk labels
  const translateDemand = v => {
    const map = {
      'Very High': t('card.demand_very_high'),
      'High': t('card.demand_high'),
      'Medium': t('card.demand_medium'),
      'Low': t('card.demand_low'),
    };
    return map[v] || v;
  };
  const translateRisk = v => {
    const map = {
      'Very Low': t('card.risk_very_low'),
      'Low': t('card.risk_low'),
      'Medium': t('card.risk_medium'),
      'Medium-High': t('card.risk_medium_high'),
      'High': t('card.risk_high'),
    };
    return map[v] || v;
  };

  return (
    <div
      onClick={onAnalyze}
      className={`rounded-2xl p-5 transition-all duration-200 cursor-pointer flex flex-col justify-between ${
        highlighted
          ? 'bg-gradient-to-br from-[#E7F0DE]/40 via-white to-white border-2 border-[#355E3B] shadow-md ring-1 ring-[#355E3B]/20'
          : 'bg-white border border-[#DED8CA] shadow-xs hover:border-[#355E3B] hover:shadow-md'
      }`}
    >
      <div>
        {/* Header row */}
        <div className="flex items-start gap-3.5 mb-4">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 border ${
              highlighted
                ? 'bg-[#E7F0DE] border-[#355E3B]/30'
                : 'bg-[#FFF9F0] border-[#DED8CA]'
            }`}
          >
            {biz.emoji}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h3 className="text-base font-bold text-[#24302A] tracking-tight truncate">
                {tML(biz.name)}
              </h3>
              {/* Score pill */}
              <div
                className={`flex items-center gap-0.5 rounded-full px-2.5 py-0.5 shrink-0 border text-xs font-bold ${
                  highlighted
                    ? 'bg-[#E7F0DE] text-[#214A32] border-[#355E3B]/30'
                    : 'bg-[#FFF9F0] text-[#24302A] border-[#DED8CA]'
                }`}
              >
                <span>{biz.score}</span>
                <span className="text-[10px] text-[#8C9B90] font-medium">/100</span>
              </div>
            </div>

            {/* Best-for-profile badge */}
            {highlighted && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#214A32] bg-[#E7F0DE] px-2 py-0.5 rounded-full mb-1">
                🌾 {t('card.best_for_profile')}
              </span>
            )}
          </div>
        </div>

        {/* Metrics grid */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {[
            { label: t('card.investment'), value: biz.investment, cls: 'text-[#24302A]' },
            { label: t('card.profit_month'), value: biz.profit, cls: 'text-[#355E3B]' },
            { label: t('card.demand'), value: translateDemand(biz.demand), cls: demandCls },
            { label: t('card.risk'), value: translateRisk(biz.risk), cls: riskCls },
          ].map(({ label, value, cls }) => (
            <div
              key={label}
              className="bg-[#FFF9F0]/60 border border-[#DED8CA]/70 rounded-xl px-3 py-2"
            >
              <p className="text-[10px] font-bold text-[#8C9B90] uppercase tracking-wider mb-0.5 truncate">
                {label}
              </p>
              <p className={`text-xs sm:text-sm font-bold truncate ${cls}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Match score bar */}
        <div className="mb-5">
          <div className="flex justify-between items-center text-xs mb-1.5">
            <span className="text-[#8C9B90] font-medium">{t('card.match_score')}</span>
            <span className={`font-bold ${highlighted ? 'text-[#355E3B]' : 'text-[#5F665F]'}`}>
              {biz.score}%
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-[#F4EBDD] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                highlighted ? 'bg-[#355E3B]' : 'bg-[#C96B3B]'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, biz.score))}%` }}
            />
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 pt-1 border-t border-[#DED8CA]/50">
        <button
          onClick={e => { e.stopPropagation(); onAnalyze?.(); }}
          className="flex-1 bg-[#355E3B] hover:bg-[#214A32] text-white rounded-xl py-2 px-3 text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
        >
          <span>{t('card.analyze')}</span>
          <ArrowRight size={13} />
        </button>
        <button
          onClick={e => { e.stopPropagation(); onCompare?.(); }}
          className="bg-[#F4EBDD] hover:bg-[#EAE4D6] text-[#24302A] rounded-xl py-2 px-3 text-xs font-semibold border border-[#DED8CA] transition cursor-pointer"
        >
          {t('card.compare')}
        </button>
      </div>
    </div>
  );
}
