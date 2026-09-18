import React from 'react';
import { Sparkles } from 'lucide-react';
import { useT } from '../../locales/index.js';

/**
 * AIHeader — branded header bar for the AI Advisor page.
 * Styled with solid high-contrast Figma tokens (#214A32 dark green, #FFF9F0 text, #C96B3B accent).
 */
export default function AIHeader({ onStartAssessment }) {
  const t = useT();

  return (
    <div
      style={{
        padding: '16px 20px',
        background: '#214A32',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      {/* AI Avatar */}
      <div
        style={{
          width: '44px',
          height: '44px',
          borderRadius: '14px',
          background: '#C96B3B',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '0 4px 14px rgba(201, 107, 59, 0.35)',
        }}
      >
        <Sparkles size={20} color="#fff" />
      </div>

      {/* Identity */}
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '16px', fontWeight: 800, color: '#FFF9F0', letterSpacing: '-0.01em', margin: 0 }}>
          🌾 {t('nav.ai_advisor') || 'AI Advisor'}
        </p>
        <p
          style={{
            fontSize: '12px',
            color: '#A8C98A',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            margin: '3px 0 0 0',
          }}
        >
          <span
            style={{
              width: '7px',
              height: '7px',
              background: '#A8C98A',
              borderRadius: '50%',
              display: 'inline-block',
              boxShadow: '0 0 0 2px rgba(168,201,138,0.4)',
            }}
          />
          {t('advisor.online_status') || 'Online'} · GRAMSAARTHI AI
        </p>
      </div>

      {/* Assessment CTA */}
      {onStartAssessment && (
        <button
          className="gs-btn gs-btn-sm"
          style={{
            background: '#C96B3B',
            color: '#FFFFFF',
            flexShrink: 0,
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontWeight: 700,
            borderRadius: '10px',
            boxShadow: '0 2px 8px rgba(201, 107, 59, 0.3)',
            cursor: 'pointer',
          }}
          onClick={onStartAssessment}
        >
          <Sparkles size={13} /> {t('advisor.start_assessment') || 'Start Assessment'}
        </button>
      )}
    </div>
  );
}
