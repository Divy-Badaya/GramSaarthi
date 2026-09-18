import React, { useRef, useEffect } from 'react';
import { Send, Mic, MicOff } from 'lucide-react';
import { useT } from '../../locales/index.js';

/**
 * AIInput — floating AI chat input with send + voice toggle.
 *
 * Props:
 *   value:       string
 *   onChange:    (string) => void
 *   onSend:      () => void
 *   onVoice:     () => void
 *   listening:   boolean
 *   loading:     boolean
 *   placeholder: string
 */
export default function AIInput({
  value,
  onChange,
  onSend,
  onVoice,
  listening = false,
  loading = false,
  placeholder,
}) {
  const t = useT();
  const inputRef = useRef(null);

  useEffect(() => {
    if (!loading) inputRef.current?.focus();
  }, [loading]);

  const handleKeyDown = e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!loading && value.trim()) onSend();
    }
  };

  return (
    <div style={{
      padding: '10px 16px 14px',
      background: 'rgba(255,255,255,0.98)',
      borderTop: '1px solid var(--gs-border-subtle)',
      backdropFilter: 'blur(10px)',
    }}>
      <div style={{
        display: 'flex', gap: '8px', alignItems: 'flex-end',
        background: 'var(--gs-bg-muted)',
        border: '1.5px solid var(--gs-border)',
        borderRadius: 'var(--gs-radius-xl)',
        padding: '8px 8px 8px 16px',
        transition: 'border-color 150ms ease, box-shadow 150ms ease',
      }}
        onFocus={e => {
          e.currentTarget.style.borderColor = 'var(--gs-green-primary)';
          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(53, 94, 59, 0.12)';
          e.currentTarget.style.background = '#fff';
        }}
        onBlur={e => {
          e.currentTarget.style.borderColor = 'var(--gs-border)';
          e.currentTarget.style.boxShadow = 'none';
          e.currentTarget.style.background = 'var(--gs-bg-muted)';
        }}
      >
        <textarea
          ref={inputRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || t('advisor.placeholder')}
          disabled={loading}
          rows={1}
          style={{
            flex: 1, background: 'none', border: 'none',
            resize: 'none', outline: 'none',
            fontSize: '14px', color: 'var(--gs-text-primary)',
            lineHeight: 1.5, maxHeight: '100px',
            paddingTop: '4px',
            fontFamily: 'var(--gs-font)',
          }}
          onInput={e => {
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
          }}
        />

        {/* Voice button */}
        <button
          className={`gs-voice-btn ${listening ? 'listening' : ''}`}
          onClick={onVoice}
          title={listening ? 'Stop listening' : 'Speak your question'}
          aria-label={listening ? 'Stop voice input' : 'Start voice input'}
          style={{ width: '36px', height: '36px', flexShrink: 0 }}
        >
          {listening ? <MicOff size={16} /> : <Mic size={16} />}
        </button>

        {/* Send button */}
        <button
          onClick={onSend}
          disabled={loading || !value.trim()}
          aria-label={t('common.send_message') || 'Send message'}
          style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: value.trim() && !loading ? 'var(--gs-green-primary)' : 'var(--gs-bg-sand)',
            color: value.trim() && !loading ? '#fff' : 'var(--gs-text-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 180ms ease', flexShrink: 0, border: 'none', cursor: value.trim() && !loading ? 'pointer' : 'not-allowed',
          }}
        >
          {loading ? (
            <span className="gs-spinner" style={{ width: '14px', height: '14px', borderWidth: '2px', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
          ) : (
            <Send size={15} />
          )}
        </button>
      </div>

      {listening && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '10px', marginTop: '10px',
        }}>
          <div className="gs-voice-wave">
            <span /><span /><span /><span /><span />
          </div>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--gs-terracotta)' }}>
            {t('advisor.listening')}
          </span>
        </div>
      )}
    </div>
  );
}
