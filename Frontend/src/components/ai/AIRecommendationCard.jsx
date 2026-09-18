import React from 'react';
import { ArrowRight, CheckCircle, AlertTriangle } from 'lucide-react';
import MatchScore from '../business/MatchScore.jsx';
import Badge from '../ui/Badge.jsx';
import { useT, useReasonLabel } from '../../locales/index.js';

/**
 * AIRecommendationCard — shows the top business recommendation from AI.
 * Used in AIAdvisor chat responses and Home dashboard.
 *
 * Props:
 *   business:      string (business name)
 *   emoji:         string
 *   score:         number (0–100)
 *   reasons:       Array<{ label: string, positive: boolean }>
 *   location:      string
 *   onViewAnalysis: () => void
 */
export default function AIRecommendationCard({ business, emoji, score, reasons, location, onViewAnalysis }) {
  const t = useT();
  const tReason = useReasonLabel();

  return (
    <div style={{
      background: 'var(--gs-bg-card)',
      border: '1.5px solid var(--gs-green-200)',
      borderRadius: 'var(--gs-radius-xl)',
      overflow: 'hidden',
      margin: '8px 0',
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, var(--gs-navy-900) 0%, var(--gs-navy-800) 100%)',
        padding: '16px 18px',
        display: 'flex', alignItems: 'center', gap: '14px',
      }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: 'var(--gs-radius-lg)',
          background: 'rgba(255,255,255,0.10)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '24px', flexShrink: 0,
        }}>
          {emoji}
        </div>
        <div style={{ flex: 1 }}>
          <Badge color="orange" style={{ marginBottom: '6px' }}>
            {t('advisor.top_recommendation')}
          </Badge>
          <p style={{ fontSize: '16px', fontWeight: 800, color: '#fff' }}>{business}</p>
          {location && (
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)', marginTop: '2px' }}>
              {location}
            </p>
          )}
        </div>
        <MatchScore score={score} size="sm" color="white" />
      </div>

      {/* Reasons */}
      {reasons && reasons.length > 0 && (
        <div style={{ padding: '12px 18px' }}>
          {reasons.slice(0, 3).map((r, i) => (
            <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
              {r.positive
                ? <CheckCircle size={14} color="var(--gs-green-500)" style={{ flexShrink: 0 }} />
                : <AlertTriangle size={14} color="var(--gs-amber-500)" style={{ flexShrink: 0 }} />
              }
              <span style={{ fontSize: '13px', color: 'var(--gs-text-secondary)', lineHeight: 1.4 }}>
                {tReason(r.label)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* CTA */}
      <div style={{ padding: '0 18px 16px' }}>
        <button
          className="gs-btn gs-btn-primary gs-btn-full"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          onClick={onViewAnalysis}
        >
          {t('analysis.view_full_analysis')} <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
}
