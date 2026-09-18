import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  Search,
  Filter,
  RefreshCw,
  Clock,
  Shield,
  User,
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  UserX,
  UserCheck,
} from 'lucide-react';
import { useT } from '../locales/index.js';
import { useApp } from '../context/AppContext';
import { getAdminActivity } from '../services/adminService.js';

export default function AdminActivity() {
  const t = useT();
  const { addToast } = useApp();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [limit] = useState(100);

  const ACTIONS = [
    { value: 'ALL', label: t('admin.filter_all') || 'All Activities' },
    { value: 'DOCUMENT_VERIFIED', label: t('admin.action_doc_verified') || 'Verified Docs' },
    { value: 'DOCUMENT_REJECTED', label: t('admin.action_doc_rejected') || 'Rejected Docs' },
    { value: 'DOCUMENT_REUPLOAD_REQUESTED', label: t('admin.action_reupload') || 'Re-upload Requests' },
    { value: 'USER_SUSPENDED', label: t('admin.action_user_suspended') || 'Suspended Users' },
    { value: 'USER_BLACKLISTED', label: t('admin.action_user_blacklisted') || 'Blacklisted Users' },
    { value: 'USER_RESTORED', label: t('admin.action_user_restored') || 'Restored Users' },
  ];

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAdminActivity({
        action: actionFilter,
        search: searchQuery,
        limit,
      });
      setLogs(data || []);
    } catch (err) {
      console.error('[ADMIN_ACTIVITY] Failed to load activity logs:', err);
      addToast(err.message || 'Failed to load activity logs.', 'error');
    } finally {
      setLoading(false);
    }
  }, [actionFilter, searchQuery, limit, addToast]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const formatTime = (isoString) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const getActionBadge = (action) => {
    switch (action) {
      case 'DOCUMENT_VERIFIED':
        return { label: t('admin.action_doc_verified') || 'Document Verified', bg: 'rgba(22, 163, 74, 0.12)', color: '#16a34a', icon: CheckCircle2 };
      case 'DOCUMENT_REJECTED':
        return { label: t('admin.action_doc_rejected') || 'Document Rejected', bg: 'rgba(220, 38, 38, 0.12)', color: '#dc2626', icon: XCircle };
      case 'DOCUMENT_REUPLOAD_REQUESTED':
        return { label: t('admin.action_reupload') || 'Re-upload Requested', bg: 'rgba(217, 119, 6, 0.12)', color: '#d97706', icon: AlertTriangle };
      case 'USER_SUSPENDED':
        return { label: t('admin.action_user_suspended') || 'User Suspended', bg: 'rgba(217, 119, 6, 0.12)', color: '#d97706', icon: AlertTriangle };
      case 'USER_BLACKLISTED':
        return { label: t('admin.action_user_blacklisted') || 'User Blacklisted', bg: 'rgba(220, 38, 38, 0.12)', color: '#dc2626', icon: UserX };
      case 'USER_RESTORED':
        return { label: t('admin.action_user_restored') || 'User Restored', bg: 'rgba(37, 99, 235, 0.12)', color: '#2563eb', icon: UserCheck };
      default:
        return { label: action, bg: 'rgba(100, 116, 139, 0.12)', color: '#475569', icon: Activity };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* ── Top Bar ────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
        background: 'var(--gs-bg-card)',
        padding: '20px 24px',
        borderRadius: 'var(--gs-radius-xl)',
        border: '1px solid var(--gs-border)',
        boxShadow: 'var(--gs-shadow-sm)',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>🕵️</span>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--gs-text-primary)' }}>
              {t('admin.audit_title') || 'Admin Activity & Audit Log'}
            </h1>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--gs-text-muted)', marginTop: '4px' }}>
            {t('admin.audit_subtitle') || 'Chronological, immutable audit trail of all actions performed by GRAMSAARTHI administrators.'}
          </p>
        </div>

        <button
          onClick={fetchLogs}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '9px 16px', borderRadius: 'var(--gs-radius-md)',
            border: '1px solid var(--gs-border)', background: 'var(--gs-bg-card)',
            color: 'var(--gs-text-secondary)', fontSize: '13px', fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={15} className={loading ? 'gs-spin' : ''} />
          <span>{t('common.refresh') || 'Refresh'}</span>
        </button>
      </div>

      {/* ── Search & Filter ────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '12px',
        background: 'var(--gs-bg-card)',
        padding: '16px 20px',
        borderRadius: 'var(--gs-radius-lg)',
        border: '1px solid var(--gs-border)',
      }}>
        <div style={{ position: 'relative', flex: '1 1 280px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--gs-text-muted)' }} />
          <input
            type="text"
            placeholder={t('admin.search_audit_placeholder') || 'Search audit trail by Administrator, Target User, Document, or Reason...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%', padding: '9px 12px 9px 36px',
              borderRadius: 'var(--gs-radius-md)', border: '1px solid var(--gs-border)',
              background: 'var(--gs-bg)', fontSize: '13px', color: 'var(--gs-text-primary)',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gs-text-muted)', marginRight: '4px' }}>
            {t('admin.filter_label') || 'Action:'}
          </span>
          {ACTIONS.map((ac) => {
            const isSel = actionFilter === ac.value;
            return (
              <button
                key={ac.value}
                onClick={() => setActionFilter(ac.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--gs-radius-full)',
                  border: isSel ? '1px solid var(--gs-orange)' : '1px solid var(--gs-border-subtle)',
                  background: isSel ? 'var(--gs-orange-50, rgba(234, 88, 12, 0.1))' : 'transparent',
                  color: isSel ? 'var(--gs-orange, #ea580c)' : 'var(--gs-text-secondary)',
                  fontSize: '12px',
                  fontWeight: isSel ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 120ms ease',
                }}
              >
                {ac.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Audit Log Table ────────────────────────────────────────── */}
      <div style={{
        background: 'var(--gs-bg-card)',
        borderRadius: 'var(--gs-radius-xl)',
        border: '1px solid var(--gs-border)',
        boxShadow: 'var(--gs-shadow-sm)',
        overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gs-text-muted)' }}>
            <RefreshCw size={24} className="gs-spin" style={{ margin: '0 auto 10px' }} />
            <p>{t('common.loading') || 'Loading audit records...'}</p>
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding: '50px 20px', textAlign: 'center', color: 'var(--gs-text-muted)' }}>
            <Activity size={40} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
            <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--gs-text-primary)' }}>
              {t('admin.no_audit_found') || 'No audit records match the current filter.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{
                  background: 'var(--gs-bg-muted)',
                  borderBottom: '1px solid var(--gs-border)',
                  color: 'var(--gs-text-muted)',
                  fontSize: '12px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  <th style={{ padding: '12px 16px' }}>{t('admin.col_action') || 'Action'}</th>
                  <th style={{ padding: '12px 16px' }}>{t('admin.col_target_user') || 'Target User'}</th>
                  <th style={{ padding: '12px 16px' }}>{t('admin.col_target_doc') || 'Document'}</th>
                  <th style={{ padding: '12px 16px' }}>{t('admin.col_admin') || 'Administrator'}</th>
                  <th style={{ padding: '12px 16px' }}>{t('admin.col_reason') || 'Details / Reason'}</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>{t('admin.col_timestamp') || 'Timestamp'}</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const badge = getActionBadge(log.action);
                  const Icon = badge.icon;
                  return (
                    <tr
                      key={log.id}
                      style={{
                        borderBottom: '1px solid var(--gs-border-subtle)',
                        fontSize: '13px',
                      }}
                    >
                      {/* Action */}
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 10px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: badge.bg,
                          color: badge.color,
                        }}>
                          <Icon size={12} />
                          <span>{badge.label}</span>
                        </span>
                      </td>

                      {/* Target User */}
                      <td style={{ padding: '14px 16px' }}>
                        {log.target_user_name ? (
                          <div>
                            <p style={{ fontWeight: 700, color: 'var(--gs-text-primary)' }}>{log.target_user_name}</p>
                            {log.target_user_phone && (
                              <p style={{ fontSize: '11px', color: 'var(--gs-text-muted)' }}>+91 {log.target_user_phone}</p>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--gs-text-muted)' }}>—</span>
                        )}
                      </td>

                      {/* Target Document */}
                      <td style={{ padding: '14px 16px' }}>
                        {log.target_document_title ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <FileText size={13} color="var(--gs-text-muted)" />
                            <span style={{ fontWeight: 600, color: 'var(--gs-text-primary)' }}>{log.target_document_title}</span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--gs-text-muted)' }}>—</span>
                        )}
                      </td>

                      {/* Admin Identity */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Shield size={13} color="var(--gs-orange)" />
                          <span style={{ fontWeight: 600, color: 'var(--gs-text-secondary)' }}>{log.admin_name}</span>
                        </div>
                      </td>

                      {/* Details / Reason */}
                      <td style={{ padding: '14px 16px', color: 'var(--gs-text-muted)', maxWidth: '300px' }}>
                        {log.details || '—'}
                      </td>

                      {/* Timestamp */}
                      <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--gs-text-muted)', fontSize: '12px' }}>
                        {formatTime(log.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
