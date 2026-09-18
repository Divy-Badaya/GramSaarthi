import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  UserCheck,
  UserX,
  ShieldAlert,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ArrowRight,
  FileCheck,
  Shield,
  Activity as ActivityIcon,
  AlertTriangle,
} from 'lucide-react';
import { useT } from '../locales/index.js';
import { useApp } from '../context/AppContext';
import { getAdminDashboardStats } from '../services/adminService.js';

export default function AdminDashboard() {
  const t = useT();
  const navigate = useNavigate();
  const { addToast } = useApp();

  const [stats, setStats] = useState({
    total_users: 0,
    active_users: 0,
    suspended_users: 0,
    blacklisted_users: 0,
    pending_documents: 0,
    verified_documents: 0,
    rejected_documents: 0,
    reupload_documents: 0,
    recent_activity: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const data = await getAdminDashboardStats();
      if (data) {
        setStats(data);
      }
    } catch (err) {
      console.error('[ADMIN_DASHBOARD] Failed to fetch stats:', err);
      addToast(err.message || 'Failed to load dashboard data.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const formatTime = (isoString) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
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
        return { label: t('admin.action_doc_verified') || 'Doc Verified', bg: 'rgba(22, 163, 74, 0.12)', color: '#16a34a' };
      case 'DOCUMENT_REJECTED':
        return { label: t('admin.action_doc_rejected') || 'Doc Rejected', bg: 'rgba(220, 38, 38, 0.12)', color: '#dc2626' };
      case 'DOCUMENT_REUPLOAD_REQUESTED':
        return { label: t('admin.action_reupload') || 'Re-upload Req', bg: 'rgba(217, 119, 6, 0.12)', color: '#d97706' };
      case 'USER_SUSPENDED':
        return { label: t('admin.action_user_suspended') || 'User Suspended', bg: 'rgba(217, 119, 6, 0.12)', color: '#d97706' };
      case 'USER_BLACKLISTED':
        return { label: t('admin.action_user_blacklisted') || 'User Blacklisted', bg: 'rgba(220, 38, 38, 0.12)', color: '#dc2626' };
      case 'USER_RESTORED':
        return { label: t('admin.action_user_restored') || 'User Restored', bg: 'rgba(37, 99, 235, 0.12)', color: '#2563eb' };
      default:
        return { label: action, bg: 'rgba(100, 116, 139, 0.12)', color: '#475569' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* ── Top Header & Actions ───────────────────────────────────── */}
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
            <span style={{ fontSize: '20px' }}>📊</span>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--gs-text-primary)' }}>
              {t('admin.dashboard_title') || 'Admin Dashboard'}
            </h1>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--gs-text-muted)', marginTop: '4px' }}>
            {t('admin.dashboard_subtitle') || 'Live administrative overview of entrepreneur registrations and document verification queues.'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => fetchStats(true)}
            disabled={refreshing || loading}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '9px 16px', borderRadius: 'var(--gs-radius-md)',
              border: '1px solid var(--gs-border)', background: 'var(--gs-bg-card)',
              color: 'var(--gs-text-secondary)', fontSize: '13px', fontWeight: 600,
              cursor: 'pointer', transition: 'all 150ms ease',
            }}
          >
            <RefreshCw size={15} className={refreshing ? 'gs-spin' : ''} />
            <span>{t('common.refresh') || 'Refresh'}</span>
          </button>

          <button
            onClick={() => navigate('/admin/documents')}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '9px 16px', borderRadius: 'var(--gs-radius-md)',
              background: 'var(--gs-orange, #ea580c)', border: 'none',
              color: '#fff', fontSize: '13px', fontWeight: 700,
              cursor: 'pointer', boxShadow: '0 2px 8px rgba(234, 88, 12, 0.3)',
            }}
          >
            <FileCheck size={16} />
            <span>{t('admin.review_pending') || 'Review Documents'}</span>
          </button>
        </div>
      </div>

      {/* ── User Overview Stats (4 Cards) ─────────────────────────── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Users size={18} color="var(--gs-orange)" />
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--gs-text-primary)' }}>
            {t('admin.sec_users_overview') || 'Entrepreneurs & Accounts'}
          </h2>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
        }}>
          {/* Total Users */}
          <div
            onClick={() => navigate('/admin/users')}
            style={{
              background: 'var(--gs-bg-card)', padding: '20px',
              borderRadius: 'var(--gs-radius-lg)', border: '1px solid var(--gs-border)',
              boxShadow: 'var(--gs-shadow-sm)', cursor: 'pointer',
              transition: 'transform 150ms ease, box-shadow 150ms ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--gs-shadow-md)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--gs-shadow-sm)'; }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gs-text-muted)', textTransform: 'uppercase' }}>
                  {t('admin.stat_total_users') || 'Total Users'}
                </p>
                <p style={{ fontSize: '32px', fontWeight: 900, color: 'var(--gs-text-primary)', marginTop: '8px' }}>
                  {loading ? '—' : stats.total_users}
                </p>
              </div>
              <div style={{
                width: '42px', height: '42px', borderRadius: 'var(--gs-radius-md)',
                background: 'rgba(15, 23, 42, 0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Users size={20} color="var(--gs-navy-900)" />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '12px', fontSize: '12px', color: 'var(--gs-orange)', fontWeight: 600 }}>
              <span>{t('admin.view_all_users') || 'View user list'}</span>
              <ArrowRight size={13} />
            </div>
          </div>

          {/* Active Users */}
          <div style={{
            background: 'var(--gs-bg-card)', padding: '20px',
            borderRadius: 'var(--gs-radius-lg)', border: '1px solid var(--gs-border)',
            boxShadow: 'var(--gs-shadow-sm)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: '12px', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' }}>
                  {t('admin.stat_active_users') || 'Active Users'}
                </p>
                <p style={{ fontSize: '32px', fontWeight: 900, color: '#16a34a', marginTop: '8px' }}>
                  {loading ? '—' : stats.active_users}
                </p>
              </div>
              <div style={{
                width: '42px', height: '42px', borderRadius: 'var(--gs-radius-md)',
                background: 'rgba(22, 163, 74, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <UserCheck size={20} color="#16a34a" />
              </div>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--gs-text-muted)', marginTop: '12px' }}>
              {t('admin.active_desc') || 'Operating normally'}
            </p>
          </div>

          {/* Suspended Users */}
          <div style={{
            background: 'var(--gs-bg-card)', padding: '20px',
            borderRadius: 'var(--gs-radius-lg)', border: '1px solid var(--gs-border)',
            boxShadow: 'var(--gs-shadow-sm)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: '12px', fontWeight: 700, color: '#d97706', textTransform: 'uppercase' }}>
                  {t('admin.stat_suspended_users') || 'Suspended'}
                </p>
                <p style={{ fontSize: '32px', fontWeight: 900, color: '#d97706', marginTop: '8px' }}>
                  {loading ? '—' : stats.suspended_users}
                </p>
              </div>
              <div style={{
                width: '42px', height: '42px', borderRadius: 'var(--gs-radius-md)',
                background: 'rgba(217, 119, 6, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <AlertTriangle size={20} color="#d97706" />
              </div>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--gs-text-muted)', marginTop: '12px' }}>
              {t('admin.suspended_desc') || 'Temporarily restricted'}
            </p>
          </div>

          {/* Blacklisted Users */}
          <div style={{
            background: 'var(--gs-bg-card)', padding: '20px',
            borderRadius: 'var(--gs-radius-lg)', border: '1px solid var(--gs-border)',
            boxShadow: 'var(--gs-shadow-sm)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: '12px', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase' }}>
                  {t('admin.stat_blacklisted_users') || 'Blacklisted'}
                </p>
                <p style={{ fontSize: '32px', fontWeight: 900, color: '#dc2626', marginTop: '8px' }}>
                  {loading ? '—' : stats.blacklisted_users}
                </p>
              </div>
              <div style={{
                width: '42px', height: '42px', borderRadius: 'var(--gs-radius-md)',
                background: 'rgba(220, 38, 38, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <UserX size={20} color="#dc2626" />
              </div>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--gs-text-muted)', marginTop: '12px' }}>
              {t('admin.blacklisted_desc') || 'Login completely blocked'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Document Verification Stats (4 Cards) ─────────────────── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <FileCheck size={18} color="var(--gs-orange)" />
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--gs-text-primary)' }}>
            {t('admin.sec_documents_overview') || 'Document Verification Queues'}
          </h2>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
        }}>
          {/* Pending Verification */}
          <div
            onClick={() => navigate('/admin/documents')}
            style={{
              background: 'var(--gs-bg-card)', padding: '20px',
              borderRadius: 'var(--gs-radius-lg)',
              border: stats.pending_documents > 0 ? '1.5px solid var(--gs-orange)' : '1px solid var(--gs-border)',
              boxShadow: 'var(--gs-shadow-sm)', cursor: 'pointer',
              transition: 'transform 150ms ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gs-orange)', textTransform: 'uppercase' }}>
                  {t('admin.stat_pending_docs') || 'Pending Review'}
                </p>
                <p style={{ fontSize: '32px', fontWeight: 900, color: 'var(--gs-orange)', marginTop: '8px' }}>
                  {loading ? '—' : stats.pending_documents}
                </p>
              </div>
              <div style={{
                width: '42px', height: '42px', borderRadius: 'var(--gs-radius-md)',
                background: 'rgba(234, 88, 12, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Clock size={20} color="var(--gs-orange)" />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '12px', fontSize: '12px', color: 'var(--gs-orange)', fontWeight: 600 }}>
              <span>{t('admin.action_verify_now') || 'Start review'}</span>
              <ArrowRight size={13} />
            </div>
          </div>

          {/* Verified Documents */}
          <div style={{
            background: 'var(--gs-bg-card)', padding: '20px',
            borderRadius: 'var(--gs-radius-lg)', border: '1px solid var(--gs-border)',
            boxShadow: 'var(--gs-shadow-sm)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: '12px', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' }}>
                  {t('admin.stat_verified_docs') || 'Verified Documents'}
                </p>
                <p style={{ fontSize: '32px', fontWeight: 900, color: '#16a34a', marginTop: '8px' }}>
                  {loading ? '—' : stats.verified_documents}
                </p>
              </div>
              <div style={{
                width: '42px', height: '42px', borderRadius: 'var(--gs-radius-md)',
                background: 'rgba(22, 163, 74, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <CheckCircle2 size={20} color="#16a34a" />
              </div>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--gs-text-muted)', marginTop: '12px' }}>
              {t('admin.verified_badge_note') || 'Verified by GRAMSAARTHI Administrator'}
            </p>
          </div>

          {/* Rejected Documents */}
          <div style={{
            background: 'var(--gs-bg-card)', padding: '20px',
            borderRadius: 'var(--gs-radius-lg)', border: '1px solid var(--gs-border)',
            boxShadow: 'var(--gs-shadow-sm)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: '12px', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase' }}>
                  {t('admin.stat_rejected_docs') || 'Rejected Documents'}
                </p>
                <p style={{ fontSize: '32px', fontWeight: 900, color: '#dc2626', marginTop: '8px' }}>
                  {loading ? '—' : stats.rejected_documents}
                </p>
              </div>
              <div style={{
                width: '42px', height: '42px', borderRadius: 'var(--gs-radius-md)',
                background: 'rgba(220, 38, 38, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <XCircle size={20} color="#dc2626" />
              </div>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--gs-text-muted)', marginTop: '12px' }}>
              {t('admin.rejected_desc') || 'Rejected with feedback'}
            </p>
          </div>

          {/* Re-upload Required */}
          <div style={{
            background: 'var(--gs-bg-card)', padding: '20px',
            borderRadius: 'var(--gs-radius-lg)', border: '1px solid var(--gs-border)',
            boxShadow: 'var(--gs-shadow-sm)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: '12px', fontWeight: 700, color: '#d97706', textTransform: 'uppercase' }}>
                  {t('admin.stat_reupload_docs') || 'Re-upload Required'}
                </p>
                <p style={{ fontSize: '32px', fontWeight: 900, color: '#d97706', marginTop: '8px' }}>
                  {loading ? '—' : stats.reupload_documents}
                </p>
              </div>
              <div style={{
                width: '42px', height: '42px', borderRadius: 'var(--gs-radius-md)',
                background: 'rgba(217, 119, 6, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <RefreshCw size={20} color="#d97706" />
              </div>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--gs-text-muted)', marginTop: '12px' }}>
              {t('admin.reupload_desc') || 'Entrepreneur upload pending'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Recent Admin Activity Feed ─────────────────────────────── */}
      <div style={{
        background: 'var(--gs-bg-card)',
        padding: '24px',
        borderRadius: 'var(--gs-radius-xl)',
        border: '1px solid var(--gs-border)',
        boxShadow: 'var(--gs-shadow-sm)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ActivityIcon size={18} color="var(--gs-orange)" />
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--gs-text-primary)' }}>
              {t('admin.recent_activity_title') || 'Recent Administrator Activity'}
            </h2>
          </div>
          <button
            onClick={() => navigate('/admin/activity')}
            style={{
              background: 'none', border: 'none', color: 'var(--gs-orange)',
              fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
            }}
          >
            <span>{t('admin.view_all_activity') || 'View Full Audit Trail'}</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--gs-text-muted)' }}>
            <RefreshCw size={20} className="gs-spin" style={{ margin: '0 auto 8px' }} />
            <p style={{ fontSize: '13px' }}>{t('common.loading') || 'Loading activity...'}</p>
          </div>
        ) : stats.recent_activity.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--gs-text-muted)' }}>
            <p style={{ fontSize: '14px', fontWeight: 600 }}>{t('admin.no_activity_yet') || 'No administrative actions recorded yet.'}</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--gs-border)', color: 'var(--gs-text-muted)', fontSize: '12px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '10px 12px' }}>{t('admin.col_action') || 'Action'}</th>
                  <th style={{ padding: '10px 12px' }}>{t('admin.col_target') || 'Target'}</th>
                  <th style={{ padding: '10px 12px' }}>{t('admin.col_admin') || 'Administrator'}</th>
                  <th style={{ padding: '10px 12px' }}>{t('admin.col_reason') || 'Details / Reason'}</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>{t('admin.col_time') || 'Time'}</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent_activity.map((item) => {
                  const badge = getActionBadge(item.action);
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--gs-border-subtle)', fontSize: '13px' }}>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 8px', borderRadius: '4px',
                          fontSize: '11px', fontWeight: 700,
                          background: badge.bg, color: badge.color,
                        }}>
                          {badge.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        {item.target_user_name ? (
                          <div>
                            <p style={{ fontWeight: 700, color: 'var(--gs-text-primary)' }}>{item.target_user_name}</p>
                            {item.target_user_phone && (
                              <p style={{ fontSize: '11px', color: 'var(--gs-text-muted)' }}>+91 {item.target_user_phone}</p>
                            )}
                          </div>
                        ) : item.target_document_title ? (
                          <span style={{ fontWeight: 600, color: 'var(--gs-text-primary)' }}>{item.target_document_title}</span>
                        ) : (
                          <span style={{ color: 'var(--gs-text-muted)' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '12px', color: 'var(--gs-text-secondary)', fontWeight: 500 }}>
                        {item.admin_name}
                      </td>
                      <td style={{ padding: '12px', color: 'var(--gs-text-muted)', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.details || '—'}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', color: 'var(--gs-text-muted)', fontSize: '12px' }}>
                        {formatTime(item.created_at)}
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
