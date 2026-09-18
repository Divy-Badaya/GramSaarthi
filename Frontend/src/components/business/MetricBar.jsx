import React from 'react';
import ProgressBar from '../ui/ProgressBar.jsx';

const COLOR_MAP = {
  green: { bar: 'green', text: 'var(--gs-green-600)' },
  amber: { bar: 'amber', text: 'var(--gs-amber-600)' },
  blue:  { bar: 'blue',  text: 'var(--gs-blue-600)'  },
  red:   { bar: 'amber', text: 'var(--gs-danger)'    },
};

/**
 * MetricBar — horizontal metric with label, progress bar, and value tag.
 *
 * Props:
 *   name:   string
 *   value:  number (0–100)
 *   label:  string (e.g. "High", "Very Good")
 *   color:  'green' | 'amber' | 'blue' | 'red'
 */
export default function MetricBar({ name, value, label, color = 'green' }) {
  const c = COLOR_MAP[color] || COLOR_MAP.green;

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--gs-text-secondary)' }}>
          {name}
        </span>
        <span style={{ fontSize: '13px', fontWeight: 700, color: c.text }}>
          {label}
        </span>
      </div>
      <ProgressBar value={value} color={c.bar} height={8} />
    </div>
  );
}
