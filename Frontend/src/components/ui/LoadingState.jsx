import React from 'react';

/**
 * Reusable LoadingState component.
 *
 * Props:
 *   type:    'dots' | 'spinner' | 'skeleton-card'
 *   message: string (optional message below loader)
 *   sub:     string (optional secondary message)
 */
export default function LoadingState({ type = 'dots', message, sub }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '40px 24px', gap: '16px',
      textAlign: 'center',
    }}>
      {type === 'dots' && (
        <div className="gs-dot-loader">
          <span /><span /><span />
        </div>
      )}
      {type === 'spinner' && (
        <div className="gs-spinner" style={{ width: '32px', height: '32px' }} />
      )}
      {type === 'skeleton-card' && (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="gs-skeleton" style={{ height: '80px', borderRadius: 'var(--gs-radius-xl)' }} />
          ))}
        </div>
      )}
      {message && (
        <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--gs-text-primary)' }}>
          {message}
        </p>
      )}
      {sub && (
        <p style={{ fontSize: '13px', color: 'var(--gs-text-muted)' }}>
          {sub}
        </p>
      )}
    </div>
  );
}
