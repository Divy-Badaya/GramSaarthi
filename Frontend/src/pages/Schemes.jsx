import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ChevronRight,
  Check,
  FileText,
  Search,
  X,
  ExternalLink,
  Sparkles,
  HelpCircle,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { SCHEMES } from '../data/mockData.js';
import { filterSchemes, getSchemes, evaluateEligibility } from '../services/schemeService.js';
import { useApp } from '../context/AppContext.jsx';
import { useT } from '../locales/index.js';
import { getLocalizedQuestion } from '../locales/schemeQuestions.js';
import { getLocalizedScheme } from '../locales/schemeDataI18n.js';

function SchemeCard({
  scheme,
  expanded,
  onToggle,
  onOpenCheck,
  onAskAdvisor,
  t,
}) {
  const isLikelyEligible =
    scheme.eligibility_status?.toLowerCase() === 'likely eligible' ||
    scheme.eligibility_status?.toLowerCase().includes('likely eligible') ||
    scheme.status_code === 'likely_eligible';
  const isPotentiallyEligible =
    scheme.eligibility_status?.toLowerCase() === 'potentially eligible' ||
    scheme.eligibility_status?.toLowerCase().includes('potentially eligible') ||
    scheme.eligibility_status?.toLowerCase().includes('check') ||
    scheme.status_code === 'potentially_eligible' ||
    scheme.status_code === 'check_eligibility';
  const isNotEligible =
    scheme.eligibility_status?.toLowerCase() === 'not eligible' ||
    scheme.eligibility_status?.toLowerCase().includes('not eligible') ||
    scheme.status_code === 'not_eligible' ||
    scheme.status_code === 'likely_ineligible';
  const isInsufficientInfo =
    scheme.eligibility_status?.toLowerCase() === 'insufficient information' ||
    scheme.eligibility_status?.toLowerCase().includes('insufficient') ||
    scheme.eligibility_status?.toLowerCase().includes('more info') ||
    scheme.status_code === 'insufficient_information' ||
    scheme.status_code === 'more_info';

  const statusBadgeClass = isLikelyEligible
    ? 'gs-badge-green'
    : isPotentiallyEligible
    ? 'gs-badge-orange'
    : isNotEligible
    ? 'gs-badge-red'
    : 'gs-badge-gray';

  const statusIcon = isLikelyEligible ? (
    <CheckCircle2 size={13} style={{ marginRight: '4px' }} />
  ) : isPotentiallyEligible ? (
    <Clock size={13} style={{ marginRight: '4px' }} />
  ) : isNotEligible ? (
    <XCircle size={13} style={{ marginRight: '4px' }} />
  ) : (
    <HelpCircle size={13} style={{ marginRight: '4px' }} />
  );

  const statusText = isLikelyEligible
    ? (t('schemes.status_likely_eligible') || 'Likely eligible')
    : isPotentiallyEligible
    ? (t('schemes.status_potentially_eligible') || t('schemes.status_check_eligibility') || 'Potentially eligible')
    : isNotEligible
    ? (t('schemes.status_not_eligible') || t('schemes.status_likely_ineligible') || 'Not eligible')
    : (t('schemes.status_insufficient_info') || t('schemes.status_more_info') || 'Insufficient information');

  const levelText =
    scheme.government_level === 'Central'
      ? t('schemes.badge_central')
      : scheme.government_level === 'Central + State'
      ? t('schemes.badge_central_state')
      : scheme.government_level === 'State'
      ? t('schemes.badge_state')
      : scheme.government_level || scheme.tag;

  const scorePct = scheme.match || scheme.match_score || 75;

  return (
    <div
      className={`gs-card ${scorePct >= 90 ? 'gs-card-green' : ''}`}
      style={{ marginBottom: '14px', overflow: 'hidden' }}
    >
      {/* Match indicator progress bar */}
      <div style={{ height: '4px', background: 'var(--gs-bg-muted)' }}>
        <div
          style={{
            height: '100%',
            width: `${scorePct}%`,
            background:
              scorePct >= 90
                ? 'var(--gs-green-500)'
                : scorePct >= 75
                ? 'var(--gs-blue-500)'
                : 'var(--gs-orange)',
            transition: 'width 0.8s ease',
          }}
        />
      </div>

      <div style={{ padding: '20px 22px' }}>
        {/* Header: Badges & Title */}
        <div style={{ marginBottom: '12px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              flexWrap: 'wrap',
              marginBottom: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span className={`gs-badge ${scheme.government_level === 'Central' ? 'gs-badge-blue' : 'gs-badge-purple'}`}>
                {levelText}
              </span>
              <span
                className={`gs-badge ${statusBadgeClass}`}
                style={{ display: 'inline-flex', alignItems: 'center' }}
              >
                {statusIcon}
                {statusText}
              </span>
            </div>

            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: scorePct >= 90 ? 'var(--gs-green-600)' : 'var(--gs-blue-600)',
                background: scorePct >= 90 ? 'rgba(45,156,45,0.1)' : 'rgba(30,136,229,0.1)',
                padding: '3px 9px',
                borderRadius: '12px',
              }}
            >
              {t('schemes.match_pct', { pct: scorePct })}
            </span>
          </div>

          <h3
            style={{
              fontSize: '17px',
              fontWeight: 800,
              color: 'var(--gs-text-primary)',
              lineHeight: 1.3,
              margin: '0 0 4px',
            }}
          >
            {scheme.name || scheme.scheme_name}
          </h3>

          <p style={{ fontSize: '13px', color: 'var(--gs-text-muted)', lineHeight: 1.4, margin: 0 }}>
            {scheme.who}
          </p>
        </div>

        {/* Why user appears eligible */}
        {(scheme.why_eligible || scheme.relevance_reason) && (
          <div
            style={{
              display: 'flex',
              gap: '8px',
              alignItems: 'flex-start',
              padding: '10px 12px',
              background: 'rgba(234, 112, 8, 0.08)',
              borderLeft: '3px solid var(--gs-orange)',
              borderRadius: 'var(--gs-radius-sm)',
              marginBottom: '14px',
            }}
          >
            <span style={{ fontSize: '14px', flexShrink: 0 }}>💡</span>
            <p style={{ fontSize: '12px', color: 'var(--gs-text-secondary)', lineHeight: 1.45, margin: 0 }}>
              <strong style={{ color: 'var(--gs-text-primary)' }}>
                {t('schemes.why_eligible') || 'Why you appear eligible'}:{' '}
              </strong>
              {scheme.why_eligible || scheme.relevance_reason}
            </p>
          </div>
        )}

        {/* 3 Metric Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '10px',
            marginBottom: '14px',
          }}
        >
          <div style={{ background: 'var(--gs-bg-muted)', borderRadius: 'var(--gs-radius-md)', padding: '10px 12px', textAlign: 'center' }}>
            <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--gs-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
              {t('schemes.max_loan')}
            </p>
            <p style={{ fontSize: '13px', fontWeight: 800, color: 'var(--gs-text-primary)', margin: 0 }}>
              {scheme.maxLoan || scheme.max_loan || t('schemes.stat_varies')}
            </p>
          </div>

          <div style={{ background: 'var(--gs-bg-muted)', borderRadius: 'var(--gs-radius-md)', padding: '10px 12px', textAlign: 'center' }}>
            <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--gs-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
              {t('schemes.interest')}
            </p>
            <p style={{ fontSize: '13px', fontWeight: 800, color: 'var(--gs-text-primary)', margin: 0 }}>
              {scheme.interest || scheme.interest_rate || t('schemes.stat_subsidized')}
            </p>
          </div>

          <div style={{ background: 'var(--gs-bg-muted)', borderRadius: 'var(--gs-radius-md)', padding: '10px 12px', textAlign: 'center' }}>
            <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--gs-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
              {t('schemes.tenure')}
            </p>
            <p style={{ fontSize: '13px', fontWeight: 800, color: 'var(--gs-text-primary)', margin: 0 }}>
              {scheme.tenure || t('schemes.stat_tenure_default')}
            </p>
          </div>
        </div>

        {/* Highlight Benefit from verified project data */}
        {(scheme.benefits || scheme.benefit) && (
          <div
            style={{
              display: 'flex',
              gap: '8px',
              alignItems: 'flex-start',
              padding: '10px 14px',
              background: scorePct >= 90 ? 'rgba(45,156,45,0.08)' : 'var(--gs-bg-muted)',
              borderLeft: '3px solid var(--gs-green-600)',
              borderRadius: 'var(--gs-radius-md)',
              marginBottom: '14px',
            }}
          >
            <span style={{ fontSize: '15px', flexShrink: 0 }}>✨</span>
            <div>
              <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gs-green-700)', textTransform: 'uppercase', margin: '0 0 2px' }}>
                {t('schemes.verified_project_benefits') || 'Verified Project Benefit'}
              </p>
              <p style={{ fontSize: '13px', color: 'var(--gs-text-secondary)', lineHeight: 1.5, margin: 0 }}>
                {scheme.benefits || scheme.benefit}
              </p>
            </div>
          </div>
        )}

        {/* Actionable Next Step Callout */}
        {scheme.next_action && (
          <div
            style={{
              padding: '10px 14px',
              background: 'var(--gs-navy-50)',
              border: '1px solid var(--gs-navy-100)',
              borderRadius: 'var(--gs-radius-md)',
              marginBottom: '14px',
            }}
          >
            <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gs-navy-800)', textTransform: 'uppercase', margin: '0 0 3px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span>🚀</span> {t('schemes.next_action') || 'Recommended Next Action'}:
            </p>
            <p style={{ fontSize: '12.5px', color: 'var(--gs-text-primary)', margin: 0, lineHeight: 1.45 }}>
              {scheme.next_action}
            </p>
          </div>
        )}


        {/* Expanded Details Section */}
        {expanded && (
          <div style={{ animation: 'gs-fade-in 0.25s ease', marginBottom: '16px' }}>
            {/* Criteria summary */}
            {scheme.eligibility_criteria && (
              <div style={{ marginBottom: '14px' }}>
                <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gs-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                  {t('schemes.criteria_heading')}
                </p>
                <div style={{ background: 'var(--gs-bg-muted)', borderRadius: 'var(--gs-radius-md)', padding: '10px 14px' }}>
                  <p style={{ fontSize: '13px', color: 'var(--gs-text-secondary)', lineHeight: 1.5, margin: 0 }}>
                    {scheme.eligibility_criteria}
                  </p>
                </div>
              </div>
            )}

            {/* Satisfied conditions */}
            {Array.isArray(scheme.satisfied_conditions) && scheme.satisfied_conditions.length > 0 && (
              <div style={{ marginBottom: '14px' }}>
                <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gs-green-700)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                  ✓ {t('schemes.criteria_satisfied') || 'Satisfied Conditions'} ({scheme.satisfied_conditions.length})
                </p>
                {scheme.satisfied_conditions.map((sc, i) => (
                  <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '6px' }}>
                    <Check size={14} color="var(--gs-green-500)" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span style={{ fontSize: '13px', color: 'var(--gs-text-secondary)', lineHeight: 1.4 }}>{sc}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Missing conditions / Verification required */}
            {Array.isArray(scheme.missing_conditions) && scheme.missing_conditions.length > 0 && (
              <div style={{ marginBottom: '14px' }}>
                <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gs-orange)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                  ⚠ {t('schemes.missing_conditions') || 'Conditions Requiring Verification'} ({scheme.missing_conditions.length})
                </p>
                {scheme.missing_conditions.map((mc, i) => (
                  <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '6px' }}>
                    <AlertCircle size={14} color="var(--gs-orange)" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span style={{ fontSize: '13px', color: 'var(--gs-text-secondary)', lineHeight: 1.4 }}>{mc}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Checklist / Eligibility points if no satisfied_conditions provided */}
            {(!scheme.satisfied_conditions || scheme.satisfied_conditions.length === 0) && Array.isArray(scheme.eligibility) && scheme.eligibility.length > 0 && (
              <div style={{ marginBottom: '14px' }}>
                <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gs-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                  {t('schemes.eligibility')}
                </p>
                {scheme.eligibility.map((e, i) => (
                  <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '6px' }}>
                    <Check size={14} color="var(--gs-green-500)" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span style={{ fontSize: '13px', color: 'var(--gs-text-secondary)', lineHeight: 1.4 }}>{e}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Documents required */}
            {Array.isArray(scheme.docs) && scheme.docs.length > 0 && (
              <div style={{ marginBottom: '14px' }}>
                <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gs-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                  {t('schemes.required_docs')}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px' }}>
                  {scheme.docs.map((d, i) => (
                    <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'var(--gs-bg-muted)', padding: '6px 10px', borderRadius: 'var(--gs-radius-sm)' }}>
                      <FileText size={13} color="var(--gs-blue-500)" style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: '12px', color: 'var(--gs-text-secondary)' }}>{d}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}


            {/* Official Links */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--gs-border)' }}>
              {scheme.source_url && (
                <a
                  href={scheme.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="gs-btn gs-btn-ghost gs-btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
                >
                  <ShieldCheck size={14} color="var(--gs-blue-500)" />
                  {t('schemes.official_source')}
                  <ExternalLink size={12} />
                </a>
              )}
              {scheme.application_url && (
                <a
                  href={scheme.application_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="gs-btn gs-btn-outline gs-btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
                >
                  <ExternalLink size={14} />
                  {t('schemes.official_apply')}
                </a>
              )}
            </div>
          </div>
        )}

        {/* Card Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            className="gs-btn gs-btn-ghost gs-btn-sm"
            onClick={onToggle}
            style={{ flex: '1 1 120px' }}
          >
            {expanded ? t('schemes.hide_details') : t('schemes.view_details')}
          </button>

          <button
            className="gs-btn gs-btn-outline gs-btn-sm"
            onClick={onOpenCheck}
            style={{
              flex: '1 1 150px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <CheckCircle2 size={14} color="var(--gs-green-600)" />
            {t('schemes.check_eligibility')}
          </button>

          {scheme.application_url && (
            <a
              href={scheme.application_url}
              target="_blank"
              rel="noopener noreferrer"
              className="gs-btn gs-btn-primary gs-btn-sm"
              style={{
                flex: '1 1 140px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                textDecoration: 'none',
              }}
            >
              {t('schemes.apply_now')}
              <ExternalLink size={13} />
            </a>
          )}

          <button
            className="gs-btn gs-btn-ghost gs-btn-sm"
            onClick={() => onAskAdvisor(scheme)}
            style={{
              flex: '1 1 100%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              marginTop: '4px',
              color: 'var(--gs-orange)',
              border: '1px dashed var(--gs-orange)',
              background: 'rgba(234, 112, 8, 0.05)',
            }}
          >
            <Sparkles size={14} />
            {t('schemes.ask_ai_scheme')}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Interactive Eligibility Questionnaire Modal
 */
function EligibilityModal({ scheme, onClose, onAskAdvisor, profile, t, lang }) {
  const [answers, setAnswers] = useState({});
  const [evaluating, setEvaluating] = useState(false);
  const [result, setResult] = useState(null);

  const questions = scheme.eligibility_questions || scheme.eligibility || [];

  const handleAnswer = (index, value) => {
    setAnswers(prev => ({
      ...prev,
      [String(index)]: value,
    }));
  };

  const handleEvaluate = async () => {
    setEvaluating(true);
    try {
      const res = await evaluateEligibility(scheme.scheme_id, answers, profile);
      setResult(res);
    } catch (err) {
      console.warn('[GRAMSAARTHI] Eligibility evaluation failed:', err);
    } finally {
      setEvaluating(false);
    }
  };

  const answeredCount = Object.keys(answers).length;
  const totalCount = questions.length;

  // Localized summary note
  const getLocalizedSummary = (res) => {
    if (!res) return '';
    if (res.status_code === 'likely_eligible') return t('schemes.summary_likely_eligible');
    if (res.status_code === 'potentially_eligible' || res.status_code === 'check_eligibility') return t('schemes.summary_potentially_eligible') || t('schemes.summary_check_eligibility');
    if (res.status_code === 'not_eligible' || res.status_code === 'likely_ineligible') return t('schemes.summary_not_eligible') || t('schemes.summary_likely_ineligible');
    return t('schemes.summary_insufficient_info') || t('schemes.summary_more_info');
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
        animation: 'gs-fade-in 0.2s ease',
      }}
      onClick={onClose}
    >
      <div
        className="gs-card"
        style={{
          width: '100%',
          maxWidth: '580px',
          maxHeight: '90vh',
          overflowY: 'auto',
          borderRadius: 'var(--gs-radius-xl)',
          padding: '24px',
          background: 'var(--gs-bg-card)',
          position: 'relative',
          boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '18px',
            right: '18px',
            background: 'none',
            border: 'none',
            color: 'var(--gs-text-muted)',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '50%',
          }}
          title={t('schemes.modal_close')}
        >
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div style={{ marginBottom: '18px', paddingRight: '28px' }}>
          <span className="gs-badge gs-badge-blue" style={{ marginBottom: '6px' }}>
            {scheme.government_level === 'Central'
              ? t('schemes.badge_central')
              : scheme.government_level === 'Central + State'
              ? t('schemes.badge_central_state')
              : scheme.government_level === 'State'
              ? t('schemes.badge_state')
              : scheme.government_level || scheme.tag}
          </span>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--gs-text-primary)', margin: '4px 0 6px' }}>
            {scheme.name || scheme.scheme_name}
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--gs-text-muted)', margin: 0 }}>
            {t('schemes.questions_heading')}
          </p>
        </div>

        {/* Result banner if evaluated */}
        {result && (
          <div
            style={{
              padding: '14px 16px',
              borderRadius: 'var(--gs-radius-md)',
              marginBottom: '18px',
              background:
                result.status_code === 'likely_eligible'
                  ? 'rgba(45,156,45,0.1)'
                  : result.status_code === 'not_eligible' || result.status_code === 'likely_ineligible'
                  ? 'rgba(211,47,47,0.1)'
                  : 'rgba(234,112,8,0.1)',
              border: `1px solid ${
                result.status_code === 'likely_eligible'
                  ? 'var(--gs-green-500)'
                  : result.status_code === 'not_eligible' || result.status_code === 'likely_ineligible'
                  ? 'var(--gs-red-500)'
                  : 'var(--gs-orange)'
              }`,
              animation: 'gs-fade-in 0.3s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              {result.status_code === 'likely_eligible' ? (
                <CheckCircle2 size={18} color="var(--gs-green-600)" />
              ) : result.status_code === 'not_eligible' || result.status_code === 'likely_ineligible' ? (
                <XCircle size={18} color="var(--gs-red-600)" />
              ) : (
                <AlertCircle size={18} color="var(--gs-orange)" />
              )}
              <strong
                style={{
                  fontSize: '14px',
                  color:
                    result.status_code === 'likely_eligible'
                      ? 'var(--gs-green-700)'
                      : result.status_code === 'not_eligible' || result.status_code === 'likely_ineligible'
                      ? 'var(--gs-red-600)'
                      : 'var(--gs-orange)',
                }}
              >
                {result.status_code === 'likely_eligible'
                  ? (t('schemes.status_likely_eligible') || 'Likely eligible')
                  : result.status_code === 'potentially_eligible' || result.status_code === 'check_eligibility'
                  ? (t('schemes.status_potentially_eligible') || t('schemes.status_check_eligibility') || 'Potentially eligible')
                  : result.status_code === 'not_eligible' || result.status_code === 'likely_ineligible'
                  ? (t('schemes.status_not_eligible') || t('schemes.status_likely_ineligible') || 'Not eligible')
                  : (t('schemes.status_insufficient_info') || t('schemes.status_more_info') || 'Insufficient information')}
              </strong>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--gs-text-primary)', margin: '0 0 8px', lineHeight: 1.4 }}>
              {getLocalizedSummary(result)}
            </p>

            {/* Next Action from result if available */}
            {result.next_action && (
              <div style={{ marginTop: '8px', padding: '8px 10px', background: 'rgba(255,255,255,0.7)', borderRadius: 'var(--gs-radius-sm)', border: '1px solid rgba(0,0,0,0.06)' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gs-navy-800)', margin: '0 0 2px' }}>
                  🚀 {t('schemes.next_action') || 'Recommended Next Action'}:
                </p>
                <p style={{ fontSize: '12px', color: 'var(--gs-text-primary)', margin: 0, lineHeight: 1.4 }}>
                  {result.next_action}
                </p>
              </div>
            )}


            {/* Satisfied items */}
            {result.satisfied_criteria?.length > 0 && (
              <div style={{ marginTop: '8px' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gs-green-700)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  ✓ {t('schemes.criteria_satisfied')} ({result.satisfied_criteria.length})
                </p>
                {result.satisfied_criteria.map((c, i) => (
                  <p key={i} style={{ fontSize: '12px', color: 'var(--gs-text-secondary)', margin: '2px 0 2px 14px' }}>
                    • {getLocalizedQuestion(c, lang) || c}
                  </p>
                ))}
              </div>
            )}

            {/* Unmet items */}
            {result.unmet_criteria?.length > 0 && (
              <div style={{ marginTop: '8px' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gs-red-600)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  ✗ {t('schemes.criteria_unmet')} ({result.unmet_criteria.length})
                </p>
                {result.unmet_criteria.map((c, i) => (
                  <p key={i} style={{ fontSize: '12px', color: 'var(--gs-red-600)', margin: '2px 0 2px 14px' }}>
                    • {getLocalizedQuestion(c, lang) || c}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Question instructions */}
        <p style={{ fontSize: '12px', color: 'var(--gs-text-secondary)', marginBottom: '14px', lineHeight: 1.4 }}>
          {t('schemes.question_instruction')}
        </p>

        {/* Questions list with full localization */}
        <div style={{ marginBottom: '20px' }}>
          {questions.map((q, idx) => {
            const currentAnswer = answers[String(idx)];
            const localizedQ = getLocalizedQuestion(q, lang);
            return (
              <div
                key={idx}
                style={{
                  padding: '12px 14px',
                  background: 'var(--gs-bg-muted)',
                  borderRadius: 'var(--gs-radius-md)',
                  marginBottom: '10px',
                }}
              >
                <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--gs-text-primary)', margin: '0 0 10px', lineHeight: 1.4 }}>
                  <span style={{ color: 'var(--gs-text-muted)', marginRight: '6px' }}>{idx + 1}.</span>
                  {localizedQ}
                </p>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => handleAnswer(idx, 'yes')}
                    className={`gs-btn gs-btn-sm ${currentAnswer === 'yes' ? 'gs-btn-primary' : 'gs-btn-outline'}`}
                    style={{ flex: 1, padding: '6px 12px', fontSize: '12px' }}
                  >
                    ✓ {t('schemes.question_yes')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAnswer(idx, 'no')}
                    className={`gs-btn gs-btn-sm ${currentAnswer === 'no' ? 'gs-btn-red' : 'gs-btn-outline'}`}
                    style={{
                      flex: 1,
                      padding: '6px 12px',
                      fontSize: '12px',
                      background: currentAnswer === 'no' ? '#fee2e2' : undefined,
                      borderColor: currentAnswer === 'no' ? '#ef4444' : undefined,
                      color: currentAnswer === 'no' ? '#b91c1c' : undefined,
                    }}
                  >
                    ✕ {t('schemes.question_no')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Official Disclaimer */}
        <div
          style={{
            padding: '10px 12px',
            background: 'var(--gs-bg-muted)',
            borderRadius: 'var(--gs-radius-sm)',
            marginBottom: '18px',
            fontSize: '11px',
            color: 'var(--gs-text-muted)',
            lineHeight: 1.4,
          }}
        >
          <strong>⚠️ {t('schemes.disclaimer_heading')}: </strong>
          {t('schemes.disclaimer_text')}
        </div>

        {/* Modal Actions */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            className="gs-btn gs-btn-primary gs-btn-sm"
            onClick={handleEvaluate}
            disabled={evaluating || answeredCount === 0}
            style={{
              flex: '2 1 180px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <CheckCircle2 size={15} />
            {evaluating ? t('schemes.evaluating') : `${t('schemes.check_eligibility')} (${answeredCount}/${totalCount})`}
          </button>

          {scheme.application_url && (
            <a
              href={scheme.application_url}
              target="_blank"
              rel="noopener noreferrer"
              className="gs-btn gs-btn-outline gs-btn-sm"
              style={{
                flex: '1 1 140px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                textDecoration: 'none',
              }}
            >
              {t('schemes.official_apply')}
              <ExternalLink size={12} />
            </a>
          )}

          <button
            className="gs-btn gs-btn-ghost gs-btn-sm"
            onClick={() => {
              onClose();
              onAskAdvisor(scheme, result ? { ...result, answers } : null);
            }}
            style={{
              flex: '1 1 100%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              color: 'var(--gs-orange)',
            }}
          >
            <Sparkles size={14} />
            {t('schemes.ask_ai_scheme')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Schemes() {
  const navigate = useNavigate();
  const t = useT();
  const { user, assessment, lang } = useApp();

  const [schemes, setSchemes] = useState(SCHEMES);
  const [expanded, setExpanded] = useState(null);
  const [activeCategory, setActiveCategory] = useState('All Schemes');
  const [activeLevel, setActiveLevel] = useState('All');
  const [activeStatus, setActiveStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalScheme, setModalScheme] = useState(null);
  const [loading, setLoading] = useState(false);

  // Build assessment profile for recommendation engine
  const userProfile = useMemo(() => {
    const inputs = assessment?._userInputs || {};
    const loc = assessment?.location || {};
    return {
      business: assessment?.business || user?.business || null,
      business_interest: inputs.businessInterest || assessment?.business || null,
      ml_recommendation: assessment?.business || null,
      ml_top3: assessment?.top3 || null,
      state: inputs.state || loc.state || user?.state || null,
      district: inputs.district || loc.district || user?.district || null,
      block: inputs.block || loc.block || null,
      village: inputs.village || loc.village || user?.village || null,
      capital: inputs.capital ?? assessment?.capital ?? user?.capital ?? null,
      project_cost: inputs.project_cost || assessment?.project_cost || user?.project_cost || null,
      investment: inputs.investment || inputs.project_cost || assessment?.project_cost || user?.project_cost || null,
      loan_amount: inputs.loan_amount || assessment?.loan_amount || user?.loan_amount || null,
      business_category: inputs.category || assessment?.category || user?.business_category || null,
      loan_needed: inputs.loanNeeded || null,
      experience: inputs.experience || null,
      resources: inputs.resources || [],
      is_woman: Boolean(user?.is_woman),
      is_sc_st: Boolean(user?.is_sc_st),
      language: lang,
    };
  }, [user, assessment, lang]);


  // Load schemes from backend service
  useEffect(() => {
    setLoading(true);
    getSchemes(userProfile)
      .then(data => {
        if (data && Array.isArray(data) && data.length > 0) {
          setSchemes(data);
        }
      })
      .catch(err => {
        console.warn('[GRAMSAARTHI] Failed to load schemes from backend:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [userProfile]);

  // Filter schemes
  const displayedSchemes = useMemo(() => {
    const localized = schemes.map(s => getLocalizedScheme(s, lang, userProfile));
    return filterSchemes(localized, {
      category: activeCategory,
      governmentLevel: activeLevel,
      eligibilityStatus: activeStatus,
      searchQuery,
    });
  }, [schemes, activeCategory, activeLevel, activeStatus, searchQuery, lang, userProfile]);

  // Advisor handoff with complete scheme context
  const handleAskAdvisor = (scheme, eligibilityInfo = null) => {
    const schemeContext = {
      scheme_id: scheme.scheme_id,
      scheme_name: scheme.name || scheme.scheme_name,
      government_level: scheme.government_level,
      category: scheme.category,
      categories: scheme.categories || [],
      business_categories: scheme.business_categories || [],
      benefits: scheme.benefit || scheme.short_description,
      benefit: scheme.benefit,
      max_loan: scheme.maxLoan || scheme.max_loan,
      interest: scheme.interest || scheme.interest_rate,
      subsidy: scheme.subsidy,
      tenure: scheme.tenure,
      who: scheme.who,
      eligibility_criteria: scheme.eligibility_criteria,
      eligibility_questions: scheme.eligibility_questions || scheme.eligibility || [],
      documents: scheme.docs || [],
      docs: scheme.docs || [],
      source_url: scheme.source_url,
      application_url: scheme.application_url || scheme.official_url,
      user_eligibility_status: eligibilityInfo?.eligibility_status || scheme.eligibility_status,
      status_code: eligibilityInfo?.status_code,
      satisfied_criteria: eligibilityInfo?.satisfied_criteria || [],
      unmet_criteria: eligibilityInfo?.unmet_criteria || [],
      missing_questions: eligibilityInfo?.missing_questions || [],
      user_answers: eligibilityInfo?.answers || {},
    };

    // Store in sessionStorage for multi-turn persistence
    try {
      sessionStorage.setItem('gs_active_scheme', JSON.stringify(schemeContext));
    } catch {
      // ignore
    }

    const promptText = t('advisor.scheme_prompt_template', {
      scheme_name: scheme.name || scheme.scheme_name,
    });

    navigate(`/ai-advisor?scheme=${encodeURIComponent(scheme.scheme_id)}&prompt=${encodeURIComponent(promptText)}`, {
      state: { schemeContext },
    });
  };

  const categoryOptions = [
    { key: 'All Schemes', label: t('schemes.filter_all') },
    { key: 'Dairy', label: t('schemes.category_dairy') },
    { key: 'Agriculture', label: t('schemes.category_agriculture') },
    { key: 'Food Business', label: t('schemes.category_food_business') },
    { key: 'Retail Shop', label: t('schemes.category_retail_shop') },
    { key: 'Textile', label: t('schemes.category_textile') },
    { key: 'Poultry', label: t('schemes.category_poultry') },
    { key: 'Fisheries', label: t('schemes.category_fisheries') },
  ];

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-8 lg:py-12">
      {/* Header & Breadcrumb */}
      <div style={{ padding: '24px 20px 16px' }} className="gs-animate-fade-up">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
          <button onClick={() => navigate('/business/analysis')} className="gs-breadcrumb-item">
            {t('biz.current_analysis')}
          </button>
          <span className="gs-breadcrumb-sep">›</span>
          <button onClick={() => navigate('/finance')} className="gs-breadcrumb-item">
            {t('nav.finance')}
          </button>
          <span className="gs-breadcrumb-sep">›</span>
          <span className="gs-breadcrumb-current">{t('nav.schemes')}</span>
          <span className="gs-breadcrumb-sep">›</span>
          <span style={{ fontSize: '12px', color: 'var(--gs-text-light)' }}>{t('nav.dpr')}</span>
        </div>

        <h1 className="gs-page-title">{t('schemes.title')}</h1>
        <p className="gs-page-subtitle">{t('schemes.subtitle')}</p>
      </div>

      {/* Search Input Bar */}
      <div style={{ padding: '0 16px 14px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--gs-bg-card)',
            border: '1px solid var(--gs-border)',
            borderRadius: 'var(--gs-radius-lg)',
            padding: '8px 14px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
          }}
        >
          <Search size={18} color="var(--gs-text-muted)" style={{ marginRight: '10px', flexShrink: 0 }} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t('schemes.search_placeholder')}
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              fontSize: '14px',
              color: 'var(--gs-text-primary)',
              outline: 'none',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                background: 'none',
                border: 'none',
                padding: '4px',
                cursor: 'pointer',
                color: 'var(--gs-text-muted)',
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Primary Category Chips */}
      <div style={{ padding: '0 16px 12px' }}>
        <div className="gs-scroll-row">
          {categoryOptions.map(cat => (
            <button
              key={cat.key}
              id={`scheme-cat-${cat.key.toLowerCase().replace(/\s+/g, '-')}`}
              className={`gs-chip ${activeCategory === cat.key ? 'selected' : ''}`}
              onClick={() => setActiveCategory(cat.key)}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Secondary Filter Controls */}
      <div
        style={{
          padding: '0 16px 16px',
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        {/* Government Level filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gs-text-muted)', textTransform: 'uppercase' }}>
            {t('schemes.filter_level')}:
          </span>
          <select
            value={activeLevel}
            onChange={e => setActiveLevel(e.target.value)}
            style={{
              background: 'var(--gs-bg-card)',
              border: '1px solid var(--gs-border)',
              borderRadius: 'var(--gs-radius-sm)',
              padding: '4px 8px',
              fontSize: '12px',
              color: 'var(--gs-text-secondary)',
              outline: 'none',
            }}
          >
            <option value="All">{t('schemes.filter_all')}</option>
            <option value="Central">{t('schemes.filter_central')}</option>
            <option value="Central + State">{t('schemes.filter_central_state')}</option>
            <option value="State">{t('schemes.filter_state')}</option>
          </select>
        </div>

        {/* Eligibility Status filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gs-text-muted)', textTransform: 'uppercase' }}>
            {t('schemes.filter_eligibility')}:
          </span>
          <select
            value={activeStatus}
            onChange={e => setActiveStatus(e.target.value)}
            style={{
              background: 'var(--gs-bg-card)',
              border: '1px solid var(--gs-border)',
              borderRadius: 'var(--gs-radius-sm)',
              padding: '4px 8px',
              fontSize: '12px',
              color: 'var(--gs-text-secondary)',
              outline: 'none',
            }}
          >
            <option value="All">{t('schemes.status_all') || 'All Statuses'}</option>
            <option value="Likely eligible">{t('schemes.status_likely_eligible') || 'Likely eligible'}</option>
            <option value="Potentially eligible">{t('schemes.status_potentially_eligible') || 'Potentially eligible'}</option>
            <option value="Not eligible">{t('schemes.status_not_eligible') || 'Not eligible'}</option>
            <option value="Insufficient information">{t('schemes.status_insufficient_info') || 'Insufficient information'}</option>
          </select>

        </div>

        {(activeCategory !== 'All Schemes' || activeLevel !== 'All' || activeStatus !== 'All' || searchQuery) && (
          <button
            onClick={() => {
              setActiveCategory('All Schemes');
              setActiveLevel('All');
              setActiveStatus('All');
              setSearchQuery('');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--gs-orange)',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              padding: '4px',
              textDecoration: 'underline',
            }}
          >
            {t('schemes.clear_filters')}
          </button>
        )}
      </div>

      {/* Schemes Results List */}
      <div style={{ padding: '0 16px' }}>
        <p className="gs-section-title">
          {t('schemes.matched_count', { count: displayedSchemes.length })}
        </p>

        {displayedSchemes.length === 0 ? (
          <div
            style={{
              background: 'var(--gs-bg-card)',
              borderRadius: 'var(--gs-radius-lg)',
              padding: '36px 20px',
              textAlign: 'center',
              color: 'var(--gs-text-muted)',
            }}
          >
            <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--gs-text-primary)', marginBottom: '8px' }}>
              {t('schemes.no_results')}
            </p>
            <button
              onClick={() => {
                setActiveCategory('All Schemes');
                setActiveLevel('All');
                setActiveStatus('All');
                setSearchQuery('');
              }}
              className="gs-btn gs-btn-outline gs-btn-sm"
            >
              {t('schemes.clear_filters')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {displayedSchemes.map((s, idx) => (
              <React.Fragment key={s.scheme_id || s.id || idx}>
                <SchemeCard
                  scheme={s}
                  expanded={expanded === (s.scheme_id || s.id)}
                  onToggle={() =>
                    setExpanded(expanded === (s.scheme_id || s.id) ? null : (s.scheme_id || s.id))
                  }
                  onOpenCheck={() => setModalScheme(s)}
                  onAskAdvisor={handleAskAdvisor}
                  t={t}
                />

                {/* In-feed AI Advisor Banner after the top scheme */}
                {idx === 0 && activeCategory === 'All Schemes' && (
                  <div
                    className="lg:col-span-2"
                    style={{
                      background: 'linear-gradient(135deg, #214A32 0%, #355E3B 100%)',
                      borderRadius: '16px',
                      padding: '18px 20px',
                      color: '#fff',
                      marginBottom: '14px',
                    }}
                  >
                  <p
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: 'rgba(255,255,255,0.55)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      marginBottom: '6px',
                    }}
                  >
                    {t('schemes.router_title')}
                  </p>
                  <p style={{ fontSize: '15px', fontWeight: 800, lineHeight: 1.3, marginBottom: '6px' }}>
                    {t('schemes.router_q')}
                  </p>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)', marginBottom: '14px' }}>
                    {t('schemes.router_sub')}
                  </p>
                  <button
                    onClick={() => {
                      const biz = userProfile.business || (lang === 'hi' ? 'ग्रामीण व्यवसाय' : lang === 'gu' ? 'ગ્રામીણ વ્યવસાય' : 'rural business');
                      const q = lang === 'hi'
                        ? `मेरे ${biz} के लिए कौन सी सरकारी योजना सबसे उपयुक्त है? मुद्रा (PMMY), PMEGP और KCC योजनाओं की तुलना करके बताएं।`
                        : lang === 'gu'
                        ? `મારા ${biz} માટે કઈ સરકારી યોજના સૌથી વધુ યોગ્ય છે? PMMY, PMEGP અને KCC ની સરખામણી કરીને જણાવો.`
                        : `Which government scheme is best suited for my ${biz}? Compare PMMY, PMEGP, and allied credit schemes for me.`;
                      navigate(`/ai-advisor?prompt=${encodeURIComponent(q)}`);
                    }}
                    style={{
                      background: 'var(--gs-orange)',
                      color: '#fff',
                      fontWeight: 700,
                      padding: '9px 18px',
                      borderRadius: 'var(--gs-radius-md)',
                      fontSize: '13px',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    {t('schemes.ask_advisor')} <ArrowRight size={14} />
                  </button>
                </div>
              )}
            </React.Fragment>
            ))}
          </div>
        )}
      </div>

      {/* Contextual CTA for DPR */}
      <div style={{ padding: '8px 16px 0' }}>
        <button
          onClick={() => navigate('/dpr')}
          className="gs-quick-action"
          style={{ background: 'var(--gs-bg-card)', width: '100%' }}
        >
          <div className="gs-quick-action-icon" style={{ background: 'var(--gs-earth-100)', fontSize: '22px' }}>
            📄
          </div>
          <div style={{ flex: 1 }}>
            <p className="gs-quick-action-title">{t('schemes.generate_dpr_cta')}</p>
            <p className="gs-quick-action-desc">{t('schemes.generate_dpr_sub')}</p>
          </div>
          <ChevronRight size={16} color="var(--gs-text-muted)" />
        </button>
      </div>

      {/* Interactive Eligibility Questionnaire Modal */}
      {modalScheme && (
        <EligibilityModal
          scheme={getLocalizedScheme(modalScheme, lang, userProfile)}
          onClose={() => setModalScheme(null)}
          onAskAdvisor={handleAskAdvisor}
          profile={userProfile}
          t={t}
          lang={lang}
        />
      )}
    </div>
  );
}
