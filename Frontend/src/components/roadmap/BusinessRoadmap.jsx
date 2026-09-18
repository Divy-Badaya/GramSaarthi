import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  ArrowRight,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  MapPin,
  Building2,
  FileText,
  DollarSign,
  ShieldCheck,
  Award,
  Layers,
  Send,
  Rocket,
  RefreshCw,
} from 'lucide-react';
import { getRoadmap } from '../../services/roadmapService.js';
import { useT } from '../../locales/index.js';

// Step icon mapping
const STEP_ICONS = {
  profile: '👤',
  assessment: '📋',
  select_business: '🏢',
  finance: '💰',
  loan_eligibility: '🏦',
  schemes: '📜',
  dpr: '📑',
  documents: '📁',
  application: '📤',
  start_business: '🚀',
};

export default function BusinessRoadmap({ compact = false }) {
  const navigate = useNavigate();
  const t = useT();

  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(!compact);

  const fetchRoadmap = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getRoadmap();
      if (data) {
        setRoadmap(data);
      }
    } catch (err) {
      console.warn('[ROADMAP] Failed to fetch roadmap:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoadmap();
  }, [fetchRoadmap]);

  if (loading && !roadmap) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{
          width: '32px', height: '32px', margin: '0 auto 8px', borderRadius: '50%',
          border: '2.5px solid var(--gs-navy-100)', borderTopColor: 'var(--gs-navy-700)',
          animation: 'gs-spin 0.8s linear infinite',
        }} />
        <p style={{ fontSize: '13px', color: 'var(--gs-text-muted)' }}>{t('roadmap.loading') || 'Loading business roadmap...'}</p>
      </div>
    );
  }

  if (!roadmap || !roadmap.steps || roadmap.steps.length === 0) {
    return null;
  }

  const { steps, overall_progress_pct, completed_steps, total_steps, summary_message, business_name } = roadmap;
  const currentStep = steps.find(s => s.status === 'current' || s.status === 'needs_update') || steps[0];

  return (
    <div className="gs-card" style={{
      margin: '0 0 20px',
      overflow: 'hidden',
      border: '1.5px solid var(--gs-border-subtle)',
      boxShadow: '0 4px 16px rgba(13, 44, 84, 0.04)',
    }}>
      {/* Header Banner */}
      <div style={{
        padding: '16px 20px',
        background: 'linear-gradient(135deg, var(--gs-navy-900) 0%, var(--gs-navy-800) 100%)',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '38px', height: '38px', borderRadius: 'var(--gs-radius-md)',
            background: 'rgba(255, 255, 255, 0.12)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '20px',
          }}>
            🧭
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <p style={{ fontSize: '16px', fontWeight: 800, color: '#fff', letterSpacing: '-0.2px' }}>
                {t('roadmap.title', 'Personalized Business Roadmap')}
              </p>
              {business_name && (
                <span style={{
                  fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px',
                  background: 'rgba(235, 140, 52, 0.25)', color: '#FDBA74', border: '1px solid rgba(235, 140, 52, 0.4)',
                }}>
                  {business_name}
                </span>
              )}
            </div>
            <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.75)', marginTop: '2px' }}>
              {t('roadmap.milestones_completed', '{completed} of {total} Milestones Completed · {progress}% Ready', {
                completed: completed_steps,
                total: total_steps,
                progress: overall_progress_pct
              })}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {compact && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="gs-btn gs-btn-sm"
              style={{
                background: 'rgba(255, 255, 255, 0.15)', color: '#fff', border: 'none',
                display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', padding: '6px 12px',
              }}
            >
              {expanded ? <>{t('roadmap.hide_details', 'Hide Details')} <ChevronUp size={14} /></> : <>{t('roadmap.view_all_steps', 'View All 10 Steps')} <ChevronDown size={14} /></>}
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar Strip */}
      <div style={{ height: '6px', width: '100%', background: 'var(--gs-bg-muted)' }}>
        <div style={{
          height: '100%',
          width: `${overall_progress_pct}%`,
          background: overall_progress_pct >= 80
            ? 'var(--gs-green-500)'
            : 'linear-gradient(90deg, var(--gs-orange) 0%, var(--gs-green-500) 100%)',
          transition: 'width 0.5s ease',
        }} />
      </div>

      {/* Active Next Action Card */}
      {currentStep && (
        <div style={{
          padding: '16px 20px',
          background: currentStep.status === 'needs_update' ? '#FFFBEB' : 'var(--gs-navy-50)',
          borderBottom: '1px solid var(--gs-border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1, minWidth: '240px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: currentStep.status === 'needs_update' ? '#FEF3C7' : 'var(--gs-orange-100)',
              color: currentStep.status === 'needs_update' ? '#B45309' : 'var(--gs-orange-dark)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '18px', flexShrink: 0,
            }}>
              {currentStep.status === 'needs_update' ? <AlertTriangle size={18} /> : (STEP_ICONS[currentStep.id] || '→')}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px',
                  color: currentStep.status === 'needs_update' ? '#B45309' : 'var(--gs-orange-dark)',
                }}>
                  {currentStep.status === 'needs_update' ? t('roadmap.action_required', 'Action Required') : t('roadmap.current_active_step', 'Current Active Step')}
                </span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gs-navy-900)' }}>
                  Step {currentStep.step_number}: {currentStep.title}
                </span>
              </div>
              <p style={{ fontSize: '12.5px', color: 'var(--gs-text-secondary)', marginTop: '3px', lineHeight: 1.4 }}>
                {currentStep.description}
              </p>

              {/* Missing Requirements Warnings */}
              {currentStep.missing_requirements && currentStep.missing_requirements.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--gs-text-muted)', fontWeight: 600 }}>{t('roadmap.missing', 'Missing')}:</span>
                  {currentStep.missing_requirements.map((req, rIdx) => (
                    <span key={rIdx} style={{
                      fontSize: '11px', fontWeight: 600, padding: '1px 8px', borderRadius: '10px',
                      background: '#FEE2E2', color: '#991B1B', border: '1px solid #FCA5A5',
                    }}>
                      • {req}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => navigate(currentStep.route)}
            className="gs-btn gs-btn-primary"
            style={{
              padding: '9px 18px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: currentStep.status === 'needs_update' ? '#D97706' : 'var(--gs-navy-900)',
              borderColor: currentStep.status === 'needs_update' ? '#B45309' : 'var(--gs-navy-900)',
              flexShrink: 0,
            }}
          >
            {currentStep.action_label} <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* Expanded 10-Step Interactive List */}
      {expanded && (
        <div style={{ padding: '16px 20px' }}>
          <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gs-text-muted)', textTransform: 'uppercase', marginBottom: '14px', letterSpacing: '0.4px' }}>
            {t('roadmap.step_progression', 'Complete 10-Step Progression')}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {steps.map((step) => {
              const isDone = step.status === 'completed';
              const isCurrent = step.status === 'current';
              const isStale = step.status === 'needs_update';
              const isPending = step.status === 'pending';

              return (
                <div
                  key={step.id}
                  onClick={() => !step.is_locked && navigate(step.route)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: 'var(--gs-radius-lg)',
                    background: isCurrent ? 'var(--gs-navy-50)' : isStale ? '#FEF3C7' : 'var(--gs-bg-card)',
                    border: isCurrent
                      ? '1.5px solid var(--gs-navy-200)'
                      : isStale
                        ? '1.5px solid #F59E0B'
                        : '1px solid var(--gs-border-subtle)',
                    cursor: step.is_locked ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    opacity: isPending ? 0.75 : 1,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                    {/* Status Badge Icon */}
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '50%',
                      background: isDone
                        ? 'var(--gs-green-500)'
                        : isCurrent
                          ? 'var(--gs-navy-800)'
                          : isStale
                            ? '#D97706'
                            : 'var(--gs-bg-muted)',
                      color: isPending ? 'var(--gs-text-muted)' : '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '13px', fontWeight: 700, flexShrink: 0,
                    }}>
                      {isDone ? <CheckCircle2 size={16} /> : isStale ? <AlertTriangle size={15} /> : step.step_number}
                    </div>

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <p style={{
                          fontSize: '13.5px',
                          fontWeight: isCurrent || isDone ? 700 : 500,
                          color: isCurrent ? 'var(--gs-navy-900)' : isDone ? 'var(--gs-text-primary)' : 'var(--gs-text-muted)',
                          margin: 0,
                        }}>
                          {step.step_number}. {step.title}
                        </p>

                        {/* Status Label Chip */}
                        {isDone && (
                          <span style={{ fontSize: '10.5px', fontWeight: 700, padding: '1px 7px', borderRadius: '8px', background: 'var(--gs-green-100)', color: 'var(--gs-green-700)' }}>
                            ✓ {t('roadmap.completed', 'Completed')}
                          </span>
                        )}
                        {isCurrent && (
                          <span style={{ fontSize: '10.5px', fontWeight: 700, padding: '1px 7px', borderRadius: '8px', background: 'var(--gs-navy-100)', color: 'var(--gs-navy-800)' }}>
                            → {t('roadmap.current', 'In Progress')}
                          </span>
                        )}
                        {isStale && (
                          <span style={{ fontSize: '10.5px', fontWeight: 700, padding: '1px 7px', borderRadius: '8px', background: '#FEF3C7', color: '#92400E' }}>
                            ⚠️ {t('roadmap.needs_update', 'Needs Update')}
                          </span>
                        )}
                      </div>

                      <p style={{
                        fontSize: '12px', color: 'var(--gs-text-muted)', marginTop: '2px',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {step.description}
                      </p>

                      {/* Missing requirements tag */}
                      {step.missing_requirements && step.missing_requirements.length > 0 && !isDone && (
                        <div style={{ marginTop: '4px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {step.missing_requirements.slice(0, 2).map((m, mIdx) => (
                            <span key={mIdx} style={{ fontSize: '10.5px', color: '#991B1B', background: '#FEE2E2', padding: '0 6px', borderRadius: '6px', fontWeight: 600 }}>
                              • {m}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Navigation Action */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '12px' }}>
                    <span style={{
                      fontSize: '12px', fontWeight: 600,
                      color: isCurrent ? 'var(--gs-navy-800)' : isDone ? 'var(--gs-green-600)' : 'var(--gs-text-light)',
                    }}>
                      {step.action_label}
                    </span>
                    <ArrowRight size={13} color={isCurrent ? 'var(--gs-navy-800)' : 'var(--gs-text-muted)'} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
