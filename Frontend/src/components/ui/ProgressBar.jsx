import React from 'react';

/**
 * Reusable ProgressBar component with warm theme tokens.
 *
 * Props:
 *   value:    0–100
 *   color:    'green' | 'terracotta' | 'orange' | 'amber' | 'blue' | 'navy'
 *   height:   number (px, default 8)
 *   label:    boolean (show percentage label)
 */
export default function ProgressBar({
  value = 0,
  color = 'green',
  height = 8,
  label = false,
  style = {},
}) {
  const colorMap = {
    green:      '#355E3B',
    terracotta: '#C96B3B',
    orange:     '#C96B3B',
    amber:      '#D9A441',
    blue:       '#355E3B',
    navy:       '#214A32',
  };

  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div style={style}>
      <div
        className="gs-progress"
        style={{ height: `${height}px`, background: '#F4EBDD' }}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="gs-progress-bar"
          style={{
            width: `${clamped}%`,
            background: colorMap[color] || colorMap.green,
          }}
        />
      </div>
      {label && (
        <p
          style={{
            fontSize: '12px',
            fontWeight: 700,
            color: colorMap[color] || '#355E3B',
            marginTop: '4px',
            textAlign: 'right',
          }}
        >
          {clamped}%
        </p>
      )}
    </div>
  );
}
