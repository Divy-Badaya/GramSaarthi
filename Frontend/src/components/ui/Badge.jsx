import React from 'react';

/**
 * Reusable Badge component.
 *
 * Props:
 *   color: 'green' | 'blue' | 'amber' | 'red' | 'gray' | 'navy' | 'orange'
 *   dot:   boolean (show colored dot before text)
 */
export default function Badge({ color = 'gray', dot = false, children, style }) {
  return (
    <span className={`gs-badge gs-badge-${color}`} style={style}>
      {dot && (
        <span style={{
          width: '6px', height: '6px', borderRadius: '50%',
          background: 'currentColor', display: 'inline-block', flexShrink: 0,
        }} />
      )}
      {children}
    </span>
  );
}
