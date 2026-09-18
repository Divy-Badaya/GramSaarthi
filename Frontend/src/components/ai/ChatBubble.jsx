import React from 'react';
import { Sparkles, RotateCcw, AlertCircle } from 'lucide-react';
import { parseMarkdownSafe } from '../../services/advisorService.js';
import { useT } from '../../locales/index.js';

/**
 * ChatBubble — renders a chat message bubble with safe markdown parsing.
 * Does NOT use dangerouslySetInnerHTML.
 *
 * Props:
 *   role: 'user' | 'bot'
 *   text: string (may contain **bold**, - bullets, newlines)
 *   isError?: boolean
 *   onRetry?: () => void
 */
export default function ChatBubble({ role, text, isError = false, onRetry = null }) {
  const t = useT();
  if (role === 'user') {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div className="gs-ai-bubble-user">
          <p style={{ margin: 0, lineHeight: 1.6 }}>{text}</p>
        </div>
      </div>
    );
  }

  // Bot message with safe markdown rendering
  const segments = parseMarkdownSafe(text);

  return (
    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
      {/* Bot avatar */}
      <div style={{
        width: '32px', height: '32px', borderRadius: '50%',
        background: isError 
          ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)'
          : 'linear-gradient(135deg, var(--gs-navy-800) 0%, var(--gs-navy-900) 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, marginTop: '2px',
        boxShadow: '0 2px 8px rgba(11,19,43,0.20)',
      }}>
        {isError ? <AlertCircle size={14} color="#fff" /> : <Sparkles size={14} color="var(--gs-orange)" />}
      </div>

      <div
        className="gs-ai-bubble-bot"
        style={isError ? { borderColor: 'rgba(239, 68, 68, 0.4)', background: 'rgba(239, 68, 68, 0.04)' } : undefined}
      >
        {segments.map((seg, i) => {
          if (seg.type === 'break') {
            return <div key={i} style={{ height: '6px' }} />;
          }
          if (seg.type === 'bullet') {
            return (
              <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '3px', alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--gs-orange)', fontWeight: 700, flexShrink: 0, marginTop: '1px' }}>•</span>
                <span style={{ lineHeight: 1.6 }}>
                  {renderInline(seg.parts)}
                </span>
              </div>
            );
          }
          // line
          return (
            <p key={i} style={{ margin: '2px 0', lineHeight: 1.6 }}>
              {renderInline(seg.parts)}
            </p>
          );
        })}

        {isError && onRetry && (
          <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center' }}>
            <button
              onClick={onRetry}
              className="gs-btn"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                fontSize: '12px',
                borderRadius: '6px',
                background: 'var(--gs-bg-card)',
                border: '1px solid var(--gs-border)',
                color: 'var(--gs-text-primary)',
                cursor: 'pointer',
              }}
            >
              <RotateCcw size={12} />
              <span>{t('common.retry_question') || 'Retry Question'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function renderInline(parts) {
  return parts.map((p, i) => {
    if (p.type === 'bold') {
      return <strong key={i} style={{ fontWeight: 700, color: 'var(--gs-text-primary)' }}>{p.content}</strong>;
    }
    return <span key={i}>{p.content}</span>;
  });
}
