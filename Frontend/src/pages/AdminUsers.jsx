import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Filter,
  UserCheck,
  UserX,
  AlertTriangle,
  RefreshCw,
  Eye,
  Shield,
  Phone,
  Mail,
  MapPin,
  Calendar,
  FileText,
  FileCheck,
  RotateCcw,
  X,
  AlertCircle,
  Clock,
  Briefcase,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { useT } from '../locales/index.js';
import { useApp } from '../context/AppContext';
import {
  getAdminUsers,
  getAdminUserDetails,
  suspendUser,
  blacklistUser,
  restoreUser,
} from '../services/adminService.js';

export default function AdminUsers() {
  const t = useT();
  const { addToast } = useApp();

  // List state
  const [users, setUsers] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);

  // User Details Modal state
  const [selectedUser, setSelectedUser] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [userDetails, setUserDetails] = useState(null);

  // Action Modals (Suspend, Blacklist, Restore)
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [actionSubmitting, setActionSubmitting] = useState(false);

  const [blacklistModalOpen, setBlacklistModalOpen] = useState(false);
  const [blacklistReason, setBlacklistReason] = useState('');
  const [confirmPhone, setConfirmPhone] = useState('');

  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [restoreReason, setRestoreReason] = useState('');

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminUsers({
        search: searchQuery,
        status: statusFilter,
        limit,
        offset,
      });
      if (res) {
        setUsers(res.items || []);
        setTotalUsers(res.total || 0);
      }
    } catch (err) {
      console.error('[ADMIN_USERS] Failed to load users:', err);
      addToast(err.message || 'Failed to load users list.', 'error');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, limit, offset, addToast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Open User Details
  const handleOpenDetails = async (u) => {
    setSelectedUser(u);
    setUserDetails(null);
    setDetailsLoading(true);
    try {
      const data = await getAdminUserDetails(u.id);
      setUserDetails(data);
    } catch (err) {
      console.error('[ADMIN_USERS] Failed to load user details:', err);
      addToast(err.message || 'Failed to load user details.', 'error');
    } finally {
      setDetailsLoading(false);
    }
  };

  // Close Modals
  const closeModals = () => {
    setSuspendModalOpen(false);
    setSuspendReason('');
    setBlacklistModalOpen(false);
    setBlacklistReason('');
    setConfirmPhone('');
    setRestoreModalOpen(false);
    setRestoreReason('');
  };

  // Execute Suspend
  const handleConfirmSuspend = async () => {
    if (!suspendReason.trim()) {
      addToast('Please provide a reason for suspension.', 'warning');
      return;
    }
    setActionSubmitting(true);
    try {
      await suspendUser(selectedUser.id, suspendReason.trim());
      addToast(`User account suspended successfully.`, 'success');
      closeModals();
      // Refresh current user and list
      const updated = await getAdminUserDetails(selectedUser.id);
      setUserDetails(updated);
      fetchUsers();
    } catch (err) {
      addToast(err.message || 'Failed to suspend user.', 'error');
    } finally {
      setActionSubmitting(false);
    }
  };

  // Execute Blacklist
  const handleConfirmBlacklist = async () => {
    if (!confirmPhone.trim()) {
      addToast('Please enter the confirmation mobile number.', 'warning');
      return;
    }
    if (!blacklistReason.trim()) {
      addToast('A reason is mandatory to blacklist an account.', 'warning');
      return;
    }
    setActionSubmitting(true);
    try {
      await blacklistUser(selectedUser.id, blacklistReason.trim(), confirmPhone.trim());
      addToast(`Account for ${selectedUser.name} blacklisted. Future logins blocked.`, 'danger');
      closeModals();
      const updated = await getAdminUserDetails(selectedUser.id);
      setUserDetails(updated);
      fetchUsers();
    } catch (err) {
      addToast(err.message || 'Blacklist failed.', 'error');
    } finally {
      setActionSubmitting(false);
    }
  };

  // Execute Restore
  const handleConfirmRestore = async () => {
    setActionSubmitting(true);
    try {
      await restoreUser(selectedUser.id, restoreReason.trim());
      addToast(`Account for ${selectedUser.name} restored to ACTIVE.`, 'success');
      closeModals();
      const updated = await getAdminUserDetails(selectedUser.id);
      setUserDetails(updated);
      fetchUsers();
    } catch (err) {
      addToast(err.message || 'Failed to restore user.', 'error');
    } finally {
      setActionSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ACTIVE':
        return { label: t('admin.status_active') || 'Active', bg: 'rgba(22, 163, 74, 0.12)', color: '#16a34a', border: '1px solid rgba(22, 163, 74, 0.3)' };
      case 'SUSPENDED':
        return { label: t('admin.status_suspended') || 'Suspended', bg: 'rgba(217, 119, 6, 0.12)', color: '#d97706', border: '1px solid rgba(217, 119, 6, 0.3)' };
      case 'BLACKLISTED':
        return { label: t('admin.status_blacklisted') || 'Blacklisted', bg: 'rgba(220, 38, 38, 0.12)', color: '#dc2626', border: '1px solid rgba(220, 38, 38, 0.3)' };
      default:
        return { label: status || 'Active', bg: 'rgba(100, 116, 139, 0.12)', color: '#475569', border: '1px solid rgba(100, 116, 139, 0.3)' };
    }
  };

  const formatLocation = (u) => {
    const parts = [u.village, u.block, u.district, u.state].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : '—';
  };

  const formatDate = (isoString) => {
    if (!isoString) return '—';
    try {
      return new Date(isoString).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* ── Top Bar & Controls ─────────────────────────────────────── */}
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
            <span style={{ fontSize: '20px' }}>👥</span>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--gs-text-primary)' }}>
              {t('admin.users_title') || 'User Management'}
            </h1>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--gs-text-muted)', marginTop: '4px' }}>
            {t('admin.users_subtitle') || 'Search, review entrepreneur profiles, verify account statuses, and manage suspensions or blacklists.'}
          </p>
        </div>

        <button
          onClick={fetchUsers}
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

      {/* ── Search & Filter Controls ───────────────────────────────── */}
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
        {/* Search */}
        <div style={{
          position: 'relative',
          flex: '1 1 280px',
        }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--gs-text-muted)' }} />
          <input
            type="text"
            placeholder={t('admin.search_placeholder') || 'Search by Name, Phone Number, Email, Place, District, State...'}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setOffset(0);
            }}
            style={{
              width: '100%', padding: '9px 12px 9px 36px',
              borderRadius: 'var(--gs-radius-md)',
              border: '1px solid var(--gs-border)',
              background: 'var(--gs-bg)',
              fontSize: '13px',
              color: 'var(--gs-text-primary)',
            }}
          />
        </div>

        {/* Status Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gs-text-muted)', marginRight: '4px' }}>
            {t('admin.filter_label') || 'Status:'}
          </span>
          {['ALL', 'ACTIVE', 'SUSPENDED', 'BLACKLISTED'].map((st) => {
            const isSel = statusFilter === st;
            return (
              <button
                key={st}
                onClick={() => {
                  setStatusFilter(st);
                  setOffset(0);
                }}
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
                {st === 'ALL' ? t('admin.filter_all') || 'All Users' :
                 st === 'ACTIVE' ? t('admin.status_active') || 'Active' :
                 st === 'SUSPENDED' ? t('admin.status_suspended') || 'Suspended' :
                 t('admin.status_blacklisted') || 'Blacklisted'}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Users Table ────────────────────────────────────────────── */}
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
            <p style={{ fontSize: '14px' }}>{t('common.loading') || 'Loading users from database...'}</p>
          </div>
        ) : users.length === 0 ? (
          <div style={{ padding: '50px 20px', textAlign: 'center', color: 'var(--gs-text-muted)' }}>
            <Users size={40} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
            <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--gs-text-primary)' }}>
              {t('admin.no_users_found') || 'No users found'}
            </p>
            <p style={{ fontSize: '13px', marginTop: '4px' }}>
              {t('admin.no_users_desc') || 'Try adjusting your search terms or filter selection.'}
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
                  <th style={{ padding: '12px 16px' }}>{t('admin.col_user') || 'Entrepreneur / Name'}</th>
                  <th style={{ padding: '12px 16px' }}>{t('admin.col_phone') || 'Phone Number'}</th>
                  <th style={{ padding: '12px 16px' }}>{t('admin.col_email') || 'Email'}</th>
                  <th style={{ padding: '12px 16px' }}>{t('admin.col_place') || 'Place / District'}</th>
                  <th style={{ padding: '12px 16px' }}>{t('admin.col_status') || 'Account Status'}</th>
                  <th style={{ padding: '12px 16px' }}>{t('admin.col_registered') || 'Registered'}</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>{t('admin.col_actions') || 'Action'}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const badge = getStatusBadge(u.status);
                  return (
                    <tr
                      key={u.id}
                      style={{
                        borderBottom: '1px solid var(--gs-border-subtle)',
                        fontSize: '13px',
                        transition: 'background 120ms ease',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--gs-bg-muted)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      {/* Name + ID Badge */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                        <div>
                          <p style={{ fontWeight: 700, color: 'var(--gs-text-primary)', margin: 0 }}>{u.name}</p>
                          <span style={{ fontSize: '11px', color: 'var(--gs-text-muted)' }}>
                            ID #{u.id}
                          </span>
                        </div>
                      </td>

                      {/* Phone Number (Primary human identifier) */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Phone size={13} color="var(--gs-orange)" />
                          <span style={{ fontWeight: 700, color: 'var(--gs-navy-900, #0f172a)' }}>
                            {u.phone ? `+91 ${u.phone}` : '—'}
                          </span>
                        </div>
                      </td>

                      {/* Email */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle', color: 'var(--gs-text-secondary)' }}>
                        {u.email ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Mail size={13} color="var(--gs-text-muted)" />
                            <span>{u.email}</span>
                          </div>
                        ) : '—'}
                      </td>

                      {/* Place */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle', color: 'var(--gs-text-secondary)', maxWidth: '200px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={13} color="var(--gs-text-muted)" style={{ flexShrink: 0 }} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {formatLocation(u)}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          borderRadius: 'var(--gs-radius-full)',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: badge.bg,
                          color: badge.color,
                          border: badge.border,
                        }}>
                          {badge.label}
                        </span>
                      </td>

                      {/* Registration Date */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle', color: 'var(--gs-text-muted)', fontSize: '12px', whiteSpace: 'nowrap' }}>
                        {formatDate(u.created_at)}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          onClick={() => handleOpenDetails(u)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 14px',
                            borderRadius: 'var(--gs-radius-md)',
                            background: 'var(--gs-bg-card)',
                            border: '1px solid var(--gs-border)',
                            color: 'var(--gs-orange, #ea580c)',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <Eye size={13} />
                          <span>{t('admin.btn_view_details') || 'View Details'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── User Details Modal / Drawer ────────────────────────────── */}
      {selectedUser && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 300,
          background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(3px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          padding: '16px',
        }}>
          <div style={{
            background: 'var(--gs-bg-card)',
            borderRadius: 'var(--gs-radius-xl)',
            width: '100%', maxWidth: '820px', maxHeight: '90vh',
            display: 'flex', flexDirection: 'column',
            boxShadow: 'var(--gs-shadow-2xl, 0 25px 50px -12px rgba(0,0,0,0.25))',
            overflow: 'hidden', animation: 'gs-fade-in 0.2s ease',
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '18px 24px', borderBottom: '1px solid var(--gs-border)',
              background: 'linear-gradient(135deg, var(--gs-navy-900, #0f172a) 0%, var(--gs-navy-800, #1e293b) 100%)',
              color: '#fff',
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#fff' }}>
                    {selectedUser.name}
                  </h2>
                  <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.15)', padding: '2px 8px', borderRadius: '4px' }}>
                    ID #{selectedUser.id}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px', fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>
                  <span style={{ fontWeight: 700, color: 'var(--gs-orange, #ea580c)' }}>
                    📱 +91 {selectedUser.phone || 'No phone'}
                  </span>
                  <span>•</span>
                  <span>{selectedUser.email || 'No email provided'}</span>
                </div>
              </div>

              <button
                onClick={() => setSelectedUser(null)}
                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '6px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {detailsLoading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gs-text-muted)' }}>
                  <RefreshCw size={24} className="gs-spin" style={{ margin: '0 auto 10px' }} />
                  <p>{t('common.loading') || 'Loading user dossier...'}</p>
                </div>
              ) : userDetails ? (
                <>
                  {/* Account Status Card with Action Buttons */}
                  <div style={{
                    display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center',
                    padding: '16px 20px', borderRadius: 'var(--gs-radius-lg)',
                    background: userDetails.status === 'ACTIVE' ? 'rgba(22, 163, 74, 0.08)' :
                               userDetails.status === 'SUSPENDED' ? 'rgba(217, 119, 6, 0.08)' : 'rgba(220, 38, 38, 0.08)',
                    border: userDetails.status === 'ACTIVE' ? '1px solid rgba(22, 163, 74, 0.2)' :
                            userDetails.status === 'SUSPENDED' ? '1px solid rgba(217, 119, 6, 0.2)' : '1px solid rgba(220, 38, 38, 0.2)',
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gs-text-muted)' }}>
                          {t('admin.label_account_status') || 'Account Status:'}
                        </span>
                        <span style={{
                          padding: '3px 10px', borderRadius: 'var(--gs-radius-full)',
                          fontSize: '12px', fontWeight: 800,
                          background: getStatusBadge(userDetails.status).bg,
                          color: getStatusBadge(userDetails.status).color,
                        }}>
                          {getStatusBadge(userDetails.status).label}
                        </span>
                      </div>
                      {userDetails.blacklist_reason && (
                        <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '6px', fontWeight: 600 }}>
                          ⚠️ Blacklist Reason: {userDetails.blacklist_reason}
                        </p>
                      )}
                      {userDetails.status_reason && !userDetails.blacklist_reason && (
                        <p style={{ fontSize: '12px', color: 'var(--gs-text-muted)', marginTop: '6px' }}>
                          Reason: {userDetails.status_reason}
                        </p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      {userDetails.status === 'ACTIVE' && (
                        <>
                          <button
                            onClick={() => setSuspendModalOpen(true)}
                            style={{
                              padding: '8px 14px', borderRadius: 'var(--gs-radius-md)',
                              background: '#fff', border: '1px solid #d97706',
                              color: '#d97706', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                            }}
                          >
                            {t('admin.btn_suspend') || 'Suspend User'}
                          </button>
                          <button
                            onClick={() => setBlacklistModalOpen(true)}
                            style={{
                              padding: '8px 14px', borderRadius: 'var(--gs-radius-md)',
                              background: '#dc2626', border: 'none',
                              color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                            }}
                          >
                            {t('admin.btn_blacklist') || 'Blacklist User'}
                          </button>
                        </>
                      )}

                      {userDetails.status === 'SUSPENDED' && (
                        <>
                          <button
                            onClick={() => setRestoreModalOpen(true)}
                            style={{
                              padding: '8px 14px', borderRadius: 'var(--gs-radius-md)',
                              background: '#16a34a', border: 'none',
                              color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                            }}
                          >
                            {t('admin.btn_restore') || 'Restore User'}
                          </button>
                          <button
                            onClick={() => setBlacklistModalOpen(true)}
                            style={{
                              padding: '8px 14px', borderRadius: 'var(--gs-radius-md)',
                              background: '#dc2626', border: 'none',
                              color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                            }}
                          >
                            {t('admin.btn_blacklist') || 'Blacklist User'}
                          </button>
                        </>
                      )}

                      {userDetails.status === 'BLACKLISTED' && (
                        <button
                          onClick={() => setRestoreModalOpen(true)}
                          style={{
                            padding: '8px 14px', borderRadius: 'var(--gs-radius-md)',
                            background: '#16a34a', border: 'none',
                            color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                          }}
                        >
                          {t('admin.btn_restore') || 'Restore User'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Profile Summary Grid */}
                  <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px',
                    background: 'var(--gs-bg-muted)', padding: '16px', borderRadius: 'var(--gs-radius-lg)',
                  }}>
                    <div>
                      <p style={{ fontSize: '11px', color: 'var(--gs-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>{t('admin.location') || 'Location'}</p>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--gs-text-primary)', marginTop: '2px' }}>
                        {formatLocation(userDetails)}
                      </p>
                    </div>

                    <div>
                      <p style={{ fontSize: '11px', color: 'var(--gs-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>{t('admin.demographics') || 'Demographics'}</p>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--gs-text-primary)', marginTop: '2px' }}>
                        {userDetails.gender || '—'}, {userDetails.age ? `${userDetails.age} yrs` : '—'} • {userDetails.social_category || 'General'}
                      </p>
                    </div>

                    <div>
                      <p style={{ fontSize: '11px', color: 'var(--gs-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>{t('admin.biz_profile') || 'Business Profile'}</p>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--gs-text-primary)', marginTop: '2px' }}>
                        {userDetails.business_type || userDetails.business_interest || 'Rural Enterprise'} ({userDetails.business_status || 'Exploring'})
                      </p>
                    </div>

                    <div>
                      <p style={{ fontSize: '11px', color: 'var(--gs-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>{t('admin.app_readiness') || 'Application Readiness'}</p>
                      <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gs-orange)', marginTop: '2px' }}>
                        {userDetails.application_readiness} ({userDetails.readiness_percentage}%)
                      </p>
                    </div>
                  </div>

                  {/* Document Verification Breakdown */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FileText size={16} color="var(--gs-orange)" />
                        <h3 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--gs-text-primary)' }}>
                          Documents ({userDetails.total_documents})
                        </h3>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', fontSize: '11px', fontWeight: 700 }}>
                        <span style={{ color: '#16a34a' }}>{userDetails.verified_documents} Verified</span>
                        <span>•</span>
                        <span style={{ color: 'var(--gs-orange)' }}>{userDetails.pending_documents} Pending</span>
                        <span>•</span>
                        <span style={{ color: '#dc2626' }}>{userDetails.rejected_documents} Rejected</span>
                      </div>
                    </div>

                    {userDetails.documents.length === 0 ? (
                      <p style={{ fontSize: '12px', color: 'var(--gs-text-muted)', padding: '12px', background: 'var(--gs-bg-muted)', borderRadius: 'var(--gs-radius-md)' }}>
                        {t('admin.no_user_documents') || 'No documents submitted by this user yet.'}
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {userDetails.documents.map((d) => (
                          <div
                            key={d.id}
                            style={{
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              padding: '10px 14px', borderRadius: 'var(--gs-radius-md)',
                              background: 'var(--gs-bg-card)', border: '1px solid var(--gs-border-subtle)',
                            }}
                          >
                            <div>
                              <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gs-text-primary)' }}>{d.title}</p>
                              <p style={{ fontSize: '11px', color: 'var(--gs-text-muted)' }}>
                                {d.category} • {d.file_name || 'No file uploaded'}
                              </p>
                            </div>
                            <span style={{
                              padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700,
                              background: d.verification_status === 'VERIFIED' ? 'rgba(22, 163, 74, 0.12)' :
                                          d.verification_status === 'REJECTED' ? 'rgba(220, 38, 38, 0.12)' :
                                          d.verification_status === 'REUPLOAD_REQUIRED' ? 'rgba(217, 119, 6, 0.12)' : 'rgba(234, 88, 12, 0.12)',
                              color: d.verification_status === 'VERIFIED' ? '#16a34a' :
                                     d.verification_status === 'REJECTED' ? '#dc2626' :
                                     d.verification_status === 'REUPLOAD_REQUIRED' ? '#d97706' : 'var(--gs-orange)',
                            }}>
                              {d.verification_status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Audit Trail for this User */}
                  {userDetails.audit_trail.length > 0 && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                        <Clock size={16} color="var(--gs-text-muted)" />
                        <h3 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--gs-text-primary)' }}>
                          {t('admin.user_audit_trail') || 'Audit Trail for this User'}
                        </h3>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {userDetails.audit_trail.map((log) => (
                          <div
                            key={log.id}
                            style={{
                              padding: '8px 12px', borderRadius: 'var(--gs-radius-sm)',
                              background: 'var(--gs-bg-muted)', fontSize: '12px',
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            }}
                          >
                            <div>
                              <span style={{ fontWeight: 700, color: 'var(--gs-text-primary)' }}>{log.action}</span>
                              <span style={{ color: 'var(--gs-text-muted)', marginLeft: '8px' }}>{log.details || ''}</span>
                            </div>
                            <span style={{ fontSize: '11px', color: 'var(--gs-text-muted)' }}>
                              {formatDate(log.created_at)} by {log.admin_name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* ── Suspend User Confirmation Modal ────────────────────────── */}
      {suspendModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 400,
          background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(3px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px',
        }}>
          <div style={{
            background: 'var(--gs-bg-card)', borderRadius: 'var(--gs-radius-xl)',
            maxWidth: '460px', width: '100%', padding: '24px',
            border: '1px solid var(--gs-border)', boxShadow: 'var(--gs-shadow-xl)',
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#d97706', marginBottom: '8px' }}>
              {t('admin.suspend_modal_title') || 'Suspend User Account?'}
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--gs-text-muted)', marginBottom: '16px' }}>
              {t('admin.suspend_modal_desc') || 'The user will be temporarily blocked from logging in and accessing authenticated services until restored.'}
            </p>

            <div style={{ marginBottom: '16px', padding: '12px', background: 'var(--gs-bg-muted)', borderRadius: 'var(--gs-radius-md)' }}>
              <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gs-text-primary)' }}>{selectedUser?.name}</p>
              <p style={{ fontSize: '12px', color: 'var(--gs-text-muted)' }}>Phone: +91 {selectedUser?.phone}</p>
            </div>

            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--gs-text-secondary)', marginBottom: '6px' }}>
              {t('admin.reason_required') || 'Suspension Reason (Required)'}:
            </label>
            <textarea
              rows={3}
              placeholder={t('admin.suspend_placeholder') || "Provide clear reason for suspension..."}
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              style={{
                width: '100%', padding: '10px', borderRadius: 'var(--gs-radius-md)',
                border: '1px solid var(--gs-border)', fontSize: '13px',
                marginBottom: '18px',
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={closeModals}
                disabled={actionSubmitting}
                style={{
                  padding: '9px 16px', borderRadius: 'var(--gs-radius-md)',
                  background: 'none', border: '1px solid var(--gs-border)',
                  color: 'var(--gs-text-secondary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                }}
              >
                {t('common.cancel') || 'Cancel'}
              </button>
              <button
                onClick={handleConfirmSuspend}
                disabled={actionSubmitting}
                style={{
                  padding: '9px 16px', borderRadius: 'var(--gs-radius-md)',
                  background: '#d97706', border: 'none',
                  color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                }}
              >
                {actionSubmitting ? 'Suspending...' : (t('admin.btn_confirm_suspend') || 'Suspend Account')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Blacklist User Confirmation Modal (MANDATORY PHONE CHECK) ── */}
      {blacklistModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 400,
          background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px',
        }}>
          <div style={{
            background: 'var(--gs-bg-card)', borderRadius: 'var(--gs-radius-xl)',
            maxWidth: '500px', width: '100%', padding: '24px',
            border: '1px solid rgba(220, 38, 38, 0.4)', boxShadow: 'var(--gs-shadow-2xl)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <ShieldAlert size={22} color="#dc2626" />
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#dc2626' }}>
                {t('admin.blacklist_modal_title') || 'Blacklist User Account?'}
              </h3>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--gs-text-muted)', marginBottom: '16px' }}>
              {t('admin.blacklist_modal_desc') || 'Blacklisting strictly terminates access and prevents all subsequent logins. Documents and data records will be preserved.'}
            </p>

            {/* Confirmation Box with Phone */}
            <div style={{
              padding: '14px', background: 'rgba(220, 38, 38, 0.06)',
              borderRadius: 'var(--gs-radius-lg)', border: '1px solid rgba(220, 38, 38, 0.2)',
              marginBottom: '16px',
            }}>
              <p style={{ fontSize: '12px', color: 'var(--gs-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>{t('admin.target_user') || 'Target User'}</p>
              <p style={{ fontSize: '15px', fontWeight: 800, color: 'var(--gs-text-primary)', marginTop: '2px' }}>
                {selectedUser?.name}
              </p>
              <p style={{ fontSize: '13px', fontWeight: 700, color: '#dc2626', marginTop: '4px' }}>
                Target Mobile: +91 {selectedUser?.phone}
              </p>
            </div>

            {/* Mobile Confirmation Input */}
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--gs-text-secondary)', marginBottom: '6px' }}>
              {t('admin.confirm_phone_label') || 'Confirm Mobile Number to proceed'}:
            </label>
            <input
              type="text"
              placeholder={`Enter ${selectedUser?.phone || '10-digit mobile number'}`}
              value={confirmPhone}
              onChange={(e) => setConfirmPhone(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 'var(--gs-radius-md)',
                border: '1px solid var(--gs-border)', fontSize: '13px',
                marginBottom: '14px',
              }}
            />

            {/* Reason */}
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--gs-text-secondary)', marginBottom: '6px' }}>
              {t('admin.blacklist_reason_label') || 'Blacklist Reason (Required)'}:
            </label>
            <textarea
              rows={3}
              placeholder={t('admin.blacklist_placeholder') || "State precise reason for blacklisting..."}
              value={blacklistReason}
              onChange={(e) => setBlacklistReason(e.target.value)}
              style={{
                width: '100%', padding: '10px', borderRadius: 'var(--gs-radius-md)',
                border: '1px solid var(--gs-border)', fontSize: '13px',
                marginBottom: '20px',
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={closeModals}
                disabled={actionSubmitting}
                style={{
                  padding: '9px 16px', borderRadius: 'var(--gs-radius-md)',
                  background: 'none', border: '1px solid var(--gs-border)',
                  color: 'var(--gs-text-secondary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                }}
              >
                {t('common.cancel') || 'Cancel'}
              </button>
              <button
                onClick={handleConfirmBlacklist}
                disabled={actionSubmitting}
                style={{
                  padding: '9px 18px', borderRadius: 'var(--gs-radius-md)',
                  background: '#dc2626', border: 'none',
                  color: '#fff', fontSize: '13px', fontWeight: 800, cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(220, 38, 38, 0.4)',
                }}
              >
                {actionSubmitting ? 'Blacklisting...' : (t('admin.btn_confirm_blacklist') || 'Blacklist User')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Restore User Confirmation Modal ────────────────────────── */}
      {restoreModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 400,
          background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(3px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px',
        }}>
          <div style={{
            background: 'var(--gs-bg-card)', borderRadius: 'var(--gs-radius-xl)',
            maxWidth: '460px', width: '100%', padding: '24px',
            border: '1px solid var(--gs-border)', boxShadow: 'var(--gs-shadow-xl)',
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#16a34a', marginBottom: '8px' }}>
              {t('admin.restore_modal_title') || 'Restore User Account?'}
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--gs-text-muted)', marginBottom: '16px' }}>
              {t('admin.restore_modal_desc') || 'The account will become ACTIVE again, allowing login and full access to their saved documents and applications.'}
            </p>

            <div style={{ marginBottom: '16px', padding: '12px', background: 'var(--gs-bg-muted)', borderRadius: 'var(--gs-radius-md)' }}>
              <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gs-text-primary)' }}>{selectedUser?.name}</p>
              <p style={{ fontSize: '12px', color: 'var(--gs-text-muted)' }}>Phone: +91 {selectedUser?.phone}</p>
            </div>

            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--gs-text-secondary)', marginBottom: '6px' }}>
              {t('admin.restore_remark_label') || 'Administrative Remark (Optional)'}:
            </label>
            <input
              type="text"
              placeholder={t('admin.reactivate_placeholder') || "e.g. Identity clarified, re-verified..."}
              value={restoreReason}
              onChange={(e) => setRestoreReason(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 'var(--gs-radius-md)',
                border: '1px solid var(--gs-border)', fontSize: '13px',
                marginBottom: '18px',
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={closeModals}
                disabled={actionSubmitting}
                style={{
                  padding: '9px 16px', borderRadius: 'var(--gs-radius-md)',
                  background: 'none', border: '1px solid var(--gs-border)',
                  color: 'var(--gs-text-secondary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                }}
              >
                {t('common.cancel') || 'Cancel'}
              </button>
              <button
                onClick={handleConfirmRestore}
                disabled={actionSubmitting}
                style={{
                  padding: '9px 18px', borderRadius: 'var(--gs-radius-md)',
                  background: '#16a34a', border: 'none',
                  color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                }}
              >
                {actionSubmitting ? 'Restoring...' : (t('admin.btn_confirm_restore') || 'Restore Account')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
