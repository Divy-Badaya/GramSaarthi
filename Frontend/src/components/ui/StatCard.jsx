import React from 'react';

/**
 * Reusable StatCard (financial metric card) aligned with Figma design system.
 *
 * Props:
 *   label:  string (e.g. "Total money needed", "Your money")
 *   value:  string (e.g. "₹10,00,000")
 *   sub:    string (optional description)
 *   color:  'green' | 'terracotta' | 'orange' | 'sand' | 'amber' | 'blue' | 'navy'
 */
export default function StatCard({ label, value, sub, color = 'green' }) {
  const colorMap = {
    green:      { bg: '#E7F0DE', border: '#BEDCA7', accent: '#214A32' },
    terracotta: { bg: '#FBEADF', border: '#E5DAC6', accent: '#A94F2B' },
    orange:     { bg: '#FBEADF', border: '#E5DAC6', accent: '#A94F2B' },
    sand:       { bg: '#F4EBDD', border: '#DED8CA', accent: '#355E3B' },
    amber:      { bg: '#FDF3DF', border: '#EAD7B0', accent: '#8A6419' },
    blue:       { bg: '#E7F0DE', border: '#BEDCA7', accent: '#214A32' },
    navy:       { bg: '#F4EBDD', border: '#DED8CA', accent: '#214A32' },
  };

  const c = colorMap[color] || colorMap.green;

  return (
    <div
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: '16px',
        padding: '18px 20px',
        transition: 'transform 180ms ease, box-shadow 180ms ease',
      }}
    >
      <p
        style={{
          fontSize: '11.5px',
          fontWeight: 700,
          color: c.accent,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginBottom: '6px',
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontSize: '24px',
          fontWeight: 800,
          color: '#24302A',
          lineHeight: 1.2,
        }}
      >
        {value}
      </p>
      {sub && (
        <p
          style={{
            fontSize: '12.5px',
            color: '#5F665F',
            marginTop: '4px',
            lineHeight: 1.4,
          }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}
