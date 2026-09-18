import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield, CheckCircle2, AlertTriangle, AlertCircle, Clock, Search,
  Filter, Eye, Download, RefreshCw, X, ArrowLeft, Check, FileText,
  User, Phone, Mail, MapPin, Calendar, HardDrive, ShieldAlert,
  ChevronRight, Sparkles, ExternalLink, ShieldCheck
} from 'lucide-react';
import { useT } from '../locales/index.js';
import { useApp } from '../context/AppContext.jsx';
import * as docService from '../services/documentService.js';

const STATUS_OPTIONS = [
  { value: 'All', label: 'admin.filter_all' },
  { value: 'PENDING', label: 'doc.verif_pending' },
  { value: 'VERIFIED', label: 'doc.verif_verified' },
  { value: 'REJECTED', label: 'doc.verif_rejected' },
  { value: 'REUPLOAD_REQUIRED', label: 'doc.verif_reupload' },
];

const CATEGORIES = [
  'All',
  'Identity',
  'Business',
  'Financial',
  'Loan',
  'Government Scheme',
  'DPR',
  'Other',
];

export default function AdminDocuments() {
  const t = useT();
  const navigate = useNavigate();
  const { user, profileLoading, addToast } = useApp();

  // Access Control verification
  const isAdmin = Boolean(user?.is_admin || user?.role === 'admin');

  // Stats and list state
  const [stats, setStats] = useState({
    total_submitted: 0,
    pending_review: 0,
    verified: 0,
    rejected: 0,
    reupload_required: 0,
  });
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Review Modal State
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [docDetails, setDocDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Preview State
  const [previewBlob, setPreviewBlob] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const previewRevokeRef = useRef(null);

  // Verification Decision Form
  const [decision, setDecision] = useState('VERIFIED');
  const [remark, setRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Audit History
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Fetch stats and documents list
  const fetchData = useCallback(async () => {
    if (!isAdmin) return;
    try {
      setLoading(true);
      const [statsData, docsData] = await Promise.all([
        docService.adminGetDocumentStats(),
        docService.adminGetDocuments({
          status: statusFilter,
          category: categoryFilter,
          search: searchQuery,
        }),
      ]);
      if (statsData) setStats(statsData);
      if (docsData) setDocuments(docsData);
    } catch (err) {
      console.error('[ADMIN_DOCS] Failed to fetch documents:', err);
      addToast(err.message || t('common.error'), 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAdmin, statusFilter, categoryFilter, searchQuery, addToast, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Clean up blob URL on unmount or preview close
  const cleanupPreview = useCallback(() => {
    if (previewRevokeRef.current) {
      previewRevokeRef.current();
      previewRevokeRef.current = null;
    }
    setPreviewBlob(null);
    setPreviewError('');
  }, []);

  useEffect(() => {
    return () => cleanupPreview();
  }, [cleanupPreview]);

  // Open Document Review Modal
  const handleOpenReview = async (doc) => {
    setSelectedDoc(doc);
    setDocDetails(null);
    setRemark('');
    setFormError('');
    setDecision(doc.verification_status === 'REJECTED' || doc.verification_status === 'REUPLOAD_REQUIRED' ? doc.verification_status : 'VERIFIED');
    setReviewModalOpen(true);
    cleanupPreview();

    // Fetch details & system checks
    setDetailsLoading(true);
    setHistoryLoading(true);
    try {
      const [details, hist] = await Promise.all([
        docService.adminGetDocumentDetails(doc.id),
        docService.adminGetVerificationHistory(doc.id),
      ]);
      setDocDetails(details);
      setHistory(hist || []);
    } catch (err) {
      console.warn('[ADMIN_DOCS] Could not load details:', err);
    } finally {
      setDetailsLoading(false);
      setHistoryLoading(false);
    }

    // Load Preview
    setPreviewLoading(true);
    try {
      const res = await docService.adminGetDocumentPreview(doc.id);
      setPreviewBlob(res);
      previewRevokeRef.current = res.revoke;
    } catch (err) {
      console.warn('[ADMIN_DOCS] Could not load preview:', err);
      setPreviewError(err.message || t('doc.err_preview_load'));
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleCloseReview = () => {
    setReviewModalOpen(false);
    setSelectedDoc(null);
    setDocDetails(null);
    cleanupPreview();
  };

  // Submit Manual Verification Decision
  const handleSubmitDecision = async (chosenDecision) => {
    const targetDecision = chosenDecision || decision;
    if ((targetDecision === 'REJECTED' || targetDecision === 'REUPLOAD_REQUIRED') && !remark.trim()) {
      setFormError(t('admin.remark_placeholder'));
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      await docService.adminVerifyDocument(selectedDoc.id, {
        decision: targetDecision,
        remark: remark.trim(),
      });
      addToast(
        targetDecision === 'VERIFIED'
          ? `Document "${selectedDoc.title}" marked as Verified.`
          : `Document updated with status: ${targetDecision}.`,
        'success'
      );
      handleCloseReview();
      await fetchData();
    } catch (err) {
      console.error('[ADMIN_DOCS] Verification submit failed:', err);
      setFormError(err.message || t('common.error'));
    } finally {
      setSubmitting(false);
    }
  };

  // Download document
  const handleDownload = async (doc) => {
    try {
      await docService.adminDownloadDocument(doc.id, doc.file_name || `${doc.title}.pdf`);
    } catch (err) {
      addToast(err.message || t('doc.err_download_fail'), 'error');
    }
  };

  // Badge helpers
  const getStatusBadge = (verifStatus) => {
    switch (verifStatus) {
      case 'VERIFIED':
        return {
          bg: '#ecfdf5',
          color: '#065f46',
          border: '#a7f3d0',
          icon: <CheckCircle2 size={13} />,
          label: t('doc.verif_verified') || 'Verified by Admin',
        };
      case 'REJECTED':
        return {
          bg: '#fef2f2',
          color: '#991b1b',
          border: '#fecaca',
          icon: <AlertCircle size={13} />,
          label: t('doc.verif_rejected') || 'Rejected',
        };
      case 'REUPLOAD_REQUIRED':
        return {
          bg: '#fff7ed',
          color: '#c2410c',
          border: '#fed7aa',
          icon: <AlertTriangle size={13} />,
          label: t('doc.verif_reupload') || 'Re-upload Required',
        };
      case 'PENDING':
      default:
        return {
          bg: '#fefce8',
          color: '#854d0e',
          border: '#fef08a',
          icon: <Clock size={13} />,
          label: t('doc.verif_pending') || 'Pending Review',
        };
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // If user is not admin, show access denied
  if (!profileLoading && !isAdmin) {
    return (
      <div className="gs-container" style={{ padding: '60px 16px', textAlign: 'center' }}>
        <div
          className="gs-card"
          style={{
            maxWidth: '520px',
            margin: '0 auto',
            padding: '40px 24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#fef2f2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShieldAlert size={32} />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: 'var(--gs-text-primary)' }}>
            {t('admin.unauthorized')}
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--gs-text-secondary)', margin: 0, lineHeight: 1.5 }}>
            {t('admin.unauthorized_desc')}
          </p>
          <button
            onClick={() => navigate('/')}
            className="gs-btn gs-btn-primary"
            style={{ marginTop: '8px' }}
          >
            {t('admin.back_to_dashboard')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          background: 'var(--gs-bg-card)',
          padding: '20px 24px',
          borderRadius: 'var(--gs-radius-xl)',
          border: '1px solid var(--gs-border)',
          boxShadow: 'var(--gs-shadow-sm)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 9px',
                borderRadius: 'var(--gs-radius-full)',
                background: 'rgba(53,94,59,0.1)',
                color: 'var(--gs-green-primary)',
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              <ShieldCheck size={13} /> {t('admin.badge') || 'ADMIN'}
            </span>
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--gs-text-primary)', margin: 0 }}>
            {t('admin.title') || 'Document Verification Portal'}
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--gs-text-muted)', margin: '4px 0 0' }}>
            {t('admin.subtitle') || 'Review, authenticate, and manage applicant document submissions across schemes.'}
          </p>
        </div>

        <button
          onClick={() => { setRefreshing(true); fetchData(); }}
          className="gs-btn gs-btn-outline gs-btn-sm"
          disabled={loading || refreshing}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <RefreshCw size={14} className={refreshing ? 'gs-spin' : ''} />
          {refreshing ? t('common.loading') : 'Refresh Data'}
        </button>
      </div>

      {/* ── 5 Stat KPI Cards ─────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: '12px',
        }}
      >
        <div
          className="gs-card"
          style={{
            padding: '16px 18px',
            borderLeft: '4px solid var(--gs-navy-800)',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gs-text-muted)' }}>
            {t('admin.stat_total')}
          </span>
          <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--gs-text-primary)' }}>
            {stats.total_submitted}
          </span>
        </div>

        <div
          className="gs-card"
          style={{
            padding: '16px 18px',
            borderLeft: '4px solid #ca8a04',
            background: '#fffdf5',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#854d0e' }}>
            {t('admin.stat_pending')}
          </span>
          <span style={{ fontSize: '24px', fontWeight: 800, color: '#a16207' }}>
            {stats.pending_review}
          </span>
        </div>

        <div
          className="gs-card"
          style={{
            padding: '16px 18px',
            borderLeft: '4px solid #16a34a',
            background: '#f6fbf7',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#065f46' }}>
            {t('admin.stat_verified')}
          </span>
          <span style={{ fontSize: '24px', fontWeight: 800, color: '#15803d' }}>
            {stats.verified}
          </span>
        </div>

        <div
          className="gs-card"
          style={{
            padding: '16px 18px',
            borderLeft: '4px solid #ea580c',
            background: '#fff9f5',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#9a3412' }}>
            {t('admin.stat_reupload')}
          </span>
          <span style={{ fontSize: '24px', fontWeight: 800, color: '#c2410c' }}>
            {stats.reupload_required}
          </span>
        </div>

        <div
          className="gs-card"
          style={{
            padding: '16px 18px',
            borderLeft: '4px solid #dc2626',
            background: '#fef7f7',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#991b1b' }}>
            {t('admin.stat_rejected')}
          </span>
          <span style={{ fontSize: '24px', fontWeight: 800, color: '#b91c1c' }}>
            {stats.rejected}
          </span>
        </div>
      </div>

      {/* ── Filter & Search Toolbar ──────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          background: 'var(--gs-bg-card)',
          padding: '16px 20px',
          borderRadius: 'var(--gs-radius-lg)',
          border: '1px solid var(--gs-border)',
          boxShadow: 'var(--gs-shadow-sm)',
        }}
      >
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 280px', minWidth: '220px' }}>
          <Search size={16} color="var(--gs-text-muted)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('admin.search_placeholder') || 'Search documents, entrepreneur names, phones...'}
            style={{
              width: '100%',
              height: '40px',
              padding: '0 12px 0 38px',
              borderRadius: 'var(--gs-radius-md)',
              border: '1px solid var(--gs-border)',
              background: 'var(--gs-bg)',
              color: 'var(--gs-text-primary)',
              fontSize: '13px',
              outline: 'none',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gs-text-muted)' }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={15} color="var(--gs-text-muted)" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                height: '40px',
                padding: '0 12px',
                borderRadius: 'var(--gs-radius-md)',
                border: '1px solid var(--gs-border)',
                background: 'var(--gs-bg)',
                color: 'var(--gs-text-primary)',
                fontSize: '13px',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {t(opt.label) || opt.value}
                </option>
              ))}
            </select>
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{
              height: '40px',
              padding: '0 12px',
              borderRadius: 'var(--gs-radius-md)',
              border: '1px solid var(--gs-border)',
              background: 'var(--gs-bg)',
              color: 'var(--gs-text-primary)',
              fontSize: '13px',
              fontWeight: 600,
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'All' ? t('doc.filter_all') : (t(`doc.cat_${cat.toLowerCase().replace(/\s+/g, '_')}`) || cat)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Documents Review Table ───────────────────────────────────────────── */}
      {loading ? (
        <div style={{ padding: '64px 0', textAlign: 'center', color: 'var(--gs-text-muted)' }}>
          <div className="gs-spinner" style={{ margin: '0 auto 12px', width: '32px', height: '32px' }} />
          <p style={{ fontSize: '14px' }}>{t('common.loading')}</p>
        </div>
      ) : documents.length === 0 ? (
        <div
          className="gs-card"
          style={{
            padding: '56px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--gs-bg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
            📂
          </div>
          <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--gs-text-primary)', margin: 0 }}>
            {t('doc.empty_title') || 'No documents found'}
          </p>
          <p style={{ fontSize: '13px', color: 'var(--gs-text-muted)', maxWidth: '420px', margin: 0 }}>
            {t('doc.empty_desc') || 'No documents matched the selected status or category filters.'}
          </p>
          {(statusFilter !== 'All' || categoryFilter !== 'All' || searchQuery) && (
            <button
              onClick={() => { setStatusFilter('All'); setCategoryFilter('All'); setSearchQuery(''); }}
              className="gs-btn gs-btn-outline gs-btn-sm"
              style={{ marginTop: '8px' }}
            >
              {t('doc.empty_action') || 'Clear Filters'}
            </button>
          )}
        </div>
      ) : (
        <div
          style={{
            background: 'var(--gs-bg-card)',
            borderRadius: 'var(--gs-radius-xl)',
            border: '1px solid var(--gs-border)',
            boxShadow: 'var(--gs-shadow-sm)',
            overflow: 'hidden',
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr
                  style={{
                    background: 'var(--gs-bg-muted)',
                    borderBottom: '1px solid var(--gs-border)',
                    color: 'var(--gs-text-muted)',
                    fontSize: '12px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  <th style={{ padding: '14px 20px', width: '220px' }}>{t('admin.col_user') || 'Entrepreneur'}</th>
                  <th style={{ padding: '14px 20px' }}>{t('admin.col_document') || 'Document Details'}</th>
                  <th style={{ padding: '14px 20px', width: '140px' }}>{t('admin.col_uploaded') || 'Uploaded'}</th>
                  <th style={{ padding: '14px 20px', width: '170px' }}>{t('admin.col_status') || 'Status'}</th>
                  <th style={{ padding: '14px 20px', width: '190px', textAlign: 'right' }}>{t('admin.col_actions') || 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => {
                  const badge = getStatusBadge(doc.verification_status);
                  return (
                    <tr
                      key={doc.id}
                      style={{
                        borderBottom: '1px solid var(--gs-border-subtle)',
                        transition: 'background 120ms ease',
                      }}
                      className="hover:bg-[#F9F5EE]/70"
                    >
                      {/* Entrepreneur Info */}
                      <td style={{ padding: '14px 20px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '50%',
                              background: 'rgba(53,94,59,0.12)',
                              color: 'var(--gs-green-primary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '13px',
                              flexShrink: 0,
                            }}
                          >
                            {doc.user_name ? doc.user_name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <strong style={{ fontSize: '13px', color: 'var(--gs-text-primary)', display: 'block' }}>
                              {doc.user_name || 'Entrepreneur'}
                            </strong>
                            <span style={{ fontSize: '11px', color: 'var(--gs-text-muted)' }}>
                              📞 {doc.user_phone || '—'} {doc.user_state ? `• ${doc.user_state}` : ''}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Document Details */}
                      <td style={{ padding: '14px 20px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--gs-text-primary)' }}>
                            {doc.title}
                          </span>
                          <span
                            style={{
                              fontSize: '10px',
                              padding: '1px 8px',
                              borderRadius: 'var(--gs-radius-full)',
                              background: 'var(--gs-bg-muted)',
                              color: 'var(--gs-text-secondary)',
                              fontWeight: 600,
                            }}
                          >
                            {doc.category}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px', fontSize: '11px', color: 'var(--gs-text-muted)' }}>
                          <span>📄 {doc.file_name || 'File'} ({formatFileSize(doc.file_size)})</span>
                          {doc.verification_remark && (
                            <span style={{ fontStyle: 'italic', color: 'var(--gs-text-secondary)' }}>
                              • "{doc.verification_remark}"
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Upload Date */}
                      <td style={{ padding: '14px 20px', verticalAlign: 'middle', fontSize: '12px', color: 'var(--gs-text-secondary)', whiteSpace: 'nowrap' }}>
                        {formatDate(doc.created_at)}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 20px', verticalAlign: 'middle' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '4px 10px',
                            borderRadius: 'var(--gs-radius-full)',
                            fontSize: '12px',
                            fontWeight: 700,
                            background: badge.bg,
                            color: badge.color,
                            border: `1px solid ${badge.border}`,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {badge.icon}
                          {badge.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 20px', verticalAlign: 'middle', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => handleDownload(doc)}
                            title={t('doc.action_download')}
                            className="gs-btn gs-btn-outline gs-btn-sm"
                            style={{ padding: '6px 10px', height: '34px' }}
                          >
                            <Download size={14} />
                          </button>

                          <button
                            onClick={() => handleOpenReview(doc)}
                            className="gs-btn gs-btn-primary gs-btn-sm"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700, height: '34px', whiteSpace: 'nowrap' }}
                          >
                            <Eye size={14} /> {t('admin.btn_review') || 'Review'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Verification Review Modal ────────────────────────────────────────── */}
      {reviewModalOpen && selectedDoc && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9990,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            animation: 'gsFadeIn 0.15s ease',
          }}
          onClick={handleCloseReview}
        >
          <div
            className="gs-card"
            style={{
              width: '100%',
              maxWidth: '920px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '24px',
              borderRadius: 'var(--gs-radius-xl)',
              background: 'var(--gs-bg-card)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--gs-border)', paddingBottom: '14px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gs-blue-700)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {t('admin.badge')}
                </span>
                <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '2px 0 0', color: 'var(--gs-text-primary)' }}>
                  {t('admin.modal_title', { title: selectedDoc.title })}
                </h2>
              </div>
              <button
                onClick={handleCloseReview}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gs-text-muted)', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Entrepreneur & Document Information Banner */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '12px',
                padding: '14px',
                borderRadius: 'var(--gs-radius-lg)',
                background: 'var(--gs-bg-muted)',
              }}
            >
              <div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gs-text-muted)', display: 'block' }}>
                  {t('admin.modal_user_info')}
                </span>
                <strong style={{ fontSize: '13px', color: 'var(--gs-text-primary)' }}>
                  {selectedDoc.user_name || '—'}
                </strong>
                <div style={{ fontSize: '11px', color: 'var(--gs-text-secondary)', marginTop: '2px' }}>
                  📞 {selectedDoc.user_phone || '—'}
                  {selectedDoc.user_email ? ` • ✉️ ${selectedDoc.user_email}` : ''}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--gs-text-muted)', marginTop: '2px' }}>
                  📍 {selectedDoc.user_state || ''} {selectedDoc.user_district ? `(${selectedDoc.user_district})` : ''}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gs-text-muted)', display: 'block' }}>
                  {t('admin.modal_doc_info')}
                </span>
                <div style={{ fontSize: '12px', color: 'var(--gs-text-primary)', marginTop: '2px' }}>
                  <strong>{t('admin.category_label') || 'Category:'}</strong> {selectedDoc.category}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--gs-text-muted)', marginTop: '2px' }}>
                  <strong>{t('admin.file_label') || 'File:'}</strong> {selectedDoc.file_name} ({formatFileSize(selectedDoc.file_size)})
                </div>
                <div style={{ fontSize: '11px', color: 'var(--gs-text-muted)', marginTop: '2px' }}>
                  <strong>{t('admin.uploaded_label') || 'Uploaded:'}</strong> {formatDate(selectedDoc.created_at)}
                </div>
              </div>
            </div>

            {/* System Automated Integrity Checks */}
            {docDetails?.system_checks && (
              <div
                style={{
                  padding: '14px',
                  borderRadius: 'var(--gs-radius-lg)',
                  background: 'rgba(59,130,246,0.04)',
                  border: '1px solid rgba(59,130,246,0.15)',
                }}
              >
                <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--gs-blue-800)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <HardDrive size={15} /> {t('admin.system_validation')}
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                    {docDetails.system_checks.magic_bytes_check?.pass ? (
                      <CheckCircle2 size={16} color="#16a34a" />
                    ) : (
                      <AlertCircle size={16} color="#dc2626" />
                    )}
                    <div>
                      <strong style={{ display: 'block', fontSize: '11px', color: 'var(--gs-text-primary)' }}>
                        {t('admin.check_magic_bytes')}
                      </strong>
                      <span style={{ fontSize: '10px', color: 'var(--gs-text-muted)' }}>
                        {docDetails.system_checks.magic_bytes_check?.mime || 'Verified'}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                    {docDetails.system_checks.size_check?.pass ? (
                      <CheckCircle2 size={16} color="#16a34a" />
                    ) : (
                      <AlertCircle size={16} color="#dc2626" />
                    )}
                    <div>
                      <strong style={{ display: 'block', fontSize: '11px', color: 'var(--gs-text-primary)' }}>
                        {t('admin.check_size')}
                      </strong>
                      <span style={{ fontSize: '10px', color: 'var(--gs-text-muted)' }}>
                        {docDetails.system_checks.size_check?.formatted || 'Under 10MB limit'}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                    {docDetails.system_checks.storage_path_check?.pass ? (
                      <CheckCircle2 size={16} color="#16a34a" />
                    ) : (
                      <AlertCircle size={16} color="#dc2626" />
                    )}
                    <div>
                      <strong style={{ display: 'block', fontSize: '11px', color: 'var(--gs-text-primary)' }}>
                        {t('admin.check_storage')}
                      </strong>
                      <span style={{ fontSize: '10px', color: 'var(--gs-text-muted)' }}>
                        {t('admin.sandboxed_storage') || 'Sandboxed Safe Storage'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Document Preview Pane */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gs-text-primary)' }}>
                  {t('admin.preview_doc')}
                </span>
                <button
                  onClick={() => handleDownload(selectedDoc)}
                  className="gs-btn gs-btn-outline gs-btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 10px', fontSize: '11px' }}
                >
                  <Download size={13} /> {t('doc.action_download')}
                </button>
              </div>

              <div
                style={{
                  width: '100%',
                  height: '340px',
                  borderRadius: 'var(--gs-radius-lg)',
                  border: '1.5px solid var(--gs-border)',
                  background: 'var(--gs-bg-muted)',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {previewLoading ? (
                  <div style={{ textAlign: 'center', color: 'var(--gs-text-muted)' }}>
                    <div className="gs-spinner" style={{ margin: '0 auto 8px', width: '24px', height: '24px' }} />
                    <span style={{ fontSize: '12px' }}>{t('doc.preview_loading')}</span>
                  </div>
                ) : previewError ? (
                  <div style={{ textAlign: 'center', padding: '16px', color: 'var(--gs-text-muted)' }}>
                    <AlertCircle size={24} color="#dc2626" style={{ margin: '0 auto 6px' }} />
                    <p style={{ fontSize: '12px', margin: '0 0 8px' }}>{previewError}</p>
                    <button
                      onClick={() => handleDownload(selectedDoc)}
                      className="gs-btn gs-btn-primary gs-btn-sm"
                    >
                      <Download size={13} /> {t('doc.action_download')}
                    </button>
                  </div>
                ) : previewBlob ? (
                  previewBlob.contentType.includes('pdf') ? (
                    <iframe
                      src={previewBlob.url}
                      title={selectedDoc.title}
                      style={{ width: '100%', height: '100%', border: 'none' }}
                    />
                  ) : previewBlob.contentType.startsWith('image/') ? (
                    <img
                      src={previewBlob.url}
                      alt={selectedDoc.title}
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                    />
                  ) : (
                    <div style={{ textAlign: 'center', padding: '16px', color: 'var(--gs-text-muted)' }}>
                      <FileText size={32} style={{ margin: '0 auto 8px' }} />
                      <p style={{ fontSize: '12px', margin: '0 0 8px' }}>{t('doc.preview_unsupported')}</p>
                      <button
                        onClick={() => handleDownload(selectedDoc)}
                        className="gs-btn gs-btn-primary gs-btn-sm"
                      >
                        <Download size={13} /> {t('doc.action_download')}
                      </button>
                    </div>
                  )
                ) : null}
              </div>
            </div>

            {/* Verification Decision Form */}
            <div
              style={{
                padding: '16px',
                borderRadius: 'var(--gs-radius-lg)',
                border: '1.5px solid var(--gs-border)',
                background: 'var(--gs-bg-card)',
              }}
            >
              <h3 style={{ fontSize: '14px', fontWeight: 800, margin: '0 0 12px', color: 'var(--gs-text-primary)' }}>
                {t('admin.decision_title')}
              </h3>

              {formError && (
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--gs-radius-md)',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#991b1b',
                    fontSize: '12px',
                    marginBottom: '10px',
                  }}
                >
                  {formError}
                </div>
              )}

              {/* Remark Input */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--gs-text-secondary)', marginBottom: '6px' }}>
                  {t('doc.field_remarks')}
                </label>
                <textarea
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  placeholder={t('admin.remark_placeholder')}
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 'var(--gs-radius-md)',
                    border: '1px solid var(--gs-border)',
                    background: 'var(--gs-bg-card)',
                    color: 'var(--gs-text-primary)',
                    fontSize: '13px',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleSubmitDecision('REJECTED')}
                  className="gs-btn gs-btn-sm"
                  style={{
                    background: '#dc2626',
                    color: '#fff',
                    border: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: 700,
                  }}
                >
                  <AlertCircle size={14} /> {t('admin.action_reject')}
                </button>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleSubmitDecision('REUPLOAD_REQUIRED')}
                  className="gs-btn gs-btn-sm"
                  style={{
                    background: '#ea580c',
                    color: '#fff',
                    border: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: 700,
                  }}
                >
                  <AlertTriangle size={14} /> {t('admin.action_reupload')}
                </button>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleSubmitDecision('VERIFIED')}
                  className="gs-btn gs-btn-primary gs-btn-sm"
                  style={{
                    background: '#16a34a',
                    color: '#fff',
                    border: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: 700,
                  }}
                >
                  <Check size={14} /> {t('admin.action_verify')}
                </button>
              </div>
            </div>

            {/* Verification History & Audit Trail */}
            <div>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gs-text-primary)', display: 'block', marginBottom: '8px' }}>
                {t('admin.history_title')}
              </span>
              {historyLoading ? (
                <div style={{ padding: '12px 0', textAlign: 'center', fontSize: '12px', color: 'var(--gs-text-muted)' }}>
                  {t('common.loading')}
                </div>
              ) : history.length === 0 ? (
                <div style={{ padding: '12px 14px', borderRadius: 'var(--gs-radius-md)', background: 'var(--gs-bg-muted)', fontSize: '12px', color: 'var(--gs-text-muted)' }}>
                  {t('admin.history_empty')}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {history.map((log) => {
                    const b = getStatusBadge(log.decision);
                    return (
                      <div
                        key={log.id}
                        style={{
                          padding: '10px 14px',
                          borderRadius: 'var(--gs-radius-md)',
                          background: 'var(--gs-bg-muted)',
                          borderLeft: `3px solid ${b.color}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                          flexWrap: 'wrap',
                          fontSize: '12px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: 'var(--gs-radius-full)',
                              fontSize: '10px',
                              fontWeight: 700,
                              background: b.bg,
                              color: b.color,
                              border: `1px solid ${b.border}`,
                            }}
                          >
                            {log.decision}
                          </span>
                          <span style={{ color: 'var(--gs-text-primary)', fontWeight: 600 }}>
                            {log.admin_name || 'Admin'}
                          </span>
                          {log.remark && (
                            <span style={{ color: 'var(--gs-text-secondary)', fontStyle: 'italic' }}>
                              — "{log.remark}"
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--gs-text-muted)' }}>
                          {formatDate(log.created_at)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
