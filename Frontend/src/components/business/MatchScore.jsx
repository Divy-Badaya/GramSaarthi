import React, { useEffect, useState } from 'react';

/**
 * MatchScore — Animated SVG ring with score.
 *
 * Props:
 *   score:   number (0–100)
 *   size:   'sm' | 'md' | 'lg'
 *   color:   'green' | 'orange' | 'white' (for dark backgrounds)
 */
export default function MatchScore({ score = 0, size = 'md', color = 'green' }) {
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    let s = 0;
    const interval = setInterval(() => {
      s += 2;
      setDisplayed(s);
      if (s >= score) { clearInterval(interval); setDisplayed(score); }
    }, 16);
    return () => clearInterval(interval);
  }, [score]);

  const configs = {
    sm: { dim: 60,  r: 24, sw: 6,  textSize: '14px', denomSize: '9px' },
    md: { dim: 80,  r: 32, sw: 8,  textSize: '20px', denomSize: '10px' },
    lg: { dim: 96,  r: 38, sw: 10, textSize: '26px', denomSize: '12px' },
  };
  const { dim, r, sw, textSize, denomSize } = configs[size] || configs.md;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (circumference * displayed / 100);

  const colorMap = {
    green:  { ring: 'var(--gs-green-500)', bg: 'var(--gs-green-100)', text: 'var(--gs-green-700)' },
    orange: { ring: 'var(--gs-orange)',    bg: 'rgba(255,138,0,0.15)', text: '#fff' },
    white:  { ring: 'rgba(255,255,255,0.85)', bg: 'rgba(255,255,255,0.15)', text: '#fff' },
  };
  const c = colorMap[color] || colorMap.green;

  return (
    <div style={{ position: 'relative', width: `${dim}px`, height: `${dim}px`, flexShrink: 0 }}>
      <svg width={dim} height={dim} viewBox={`0 0 ${dim} ${dim}`}>
        <circle cx={dim/2} cy={dim/2} r={r} fill="none" stroke={c.bg} strokeWidth={sw} />
        <circle
          cx={dim/2} cy={dim/2} r={r} fill="none"
          stroke={c.ring} strokeWidth={sw}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${dim/2} ${dim/2})`}
          style={{ transition: 'stroke-dashoffset 0.04s linear' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
      }}>
        <span style={{ fontSize: textSize, fontWeight: 800, color: c.text, lineHeight: 1 }}>
          {displayed}
        </span>
        <span style={{ fontSize: denomSize, fontWeight: 600, color: color === 'green' ? 'var(--gs-text-muted)' : 'rgba(255,255,255,0.6)' }}>
          /100
        </span>
      </div>
    </div>
  );
}
