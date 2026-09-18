import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload, FileText, AlertTriangle, X, Eye, Download,
  RefreshCw, Trash2, Search, Filter, Plus, Clock, FileCheck,
  Shield, CheckCircle2, AlertCircle, Sparkles, Image as ImageIcon,
  Briefcase, Landmark, IndianRupee, Layers, ExternalLink
} from 'lucide-react';
import { useT } from '../locales/index.js';
import * as docService from '../services/documentService.js';
import { downloadDprPdf } from '../services/dprService.js';

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

const STATUS_FILTERS = [
  'All',
  'Uploaded',
  'Missing',
  'Pending Review',
  'Needs Attention',
];

const QUICK_TITLES = {
  'Identity': ['Aadhaar Card', 'PAN Card', 'Voter ID Card', 'Driving License'],
  'Business': ['Business Premises / Land Records', 'Rent / Lease Agreement', 'Trade License / Udyam', 'Partnership Deed'],
  'Financial': ['Bank Statement (Last 6 Months)', 'ITR / Income Proof', 'Cancelled Cheque', 'Balance Sheet'],
  'Loan': ['Machinery / Equipment Quotation', 'Civil Construction Estimate', 'Collateral / Property Papers'],
  'Government Scheme': ['Scheme Application Form', 'Caste / Category Certificate', 'Rural Resident Certificate'],
  'DPR': ['Detailed Project Report (DPR)', 'Techno-Economic Viability Report'],
  'Other': ['Electricity Bill', 'NOC from Gram Panchayat', 'Passport Size Photo'],
};

export default function Documents() {
  const t = useT();
  const navigate = useNavigate();

  // Primary view tabs: 'smart_checklist' vs 'all_files'
  const [activeTab, setActiveTab] = useState('smart_checklist');

  // Documents and Smart Checklist state
  const [documents, setDocuments] = useState([]);
  const [summary, setSummary] = useState({ total: 0, uploaded: 0, pending_review: 0, needs_attention: 0, missing: 0 });
  const [smartChecklist, setSmartChecklist] = useState(null);
  const [selectedSchemeId, setSelectedSchemeId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message: string }

  // Filters (for all_files tab)
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Quick filter for smart checklist ('all' | 'missing' | 'uploaded')
  const [checklistFilter, setChecklistFilter] = useState('all');

  // Modals
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [replaceModalDoc, setReplaceModalDoc] = useState(null);
  const [deleteModalDoc, setDeleteModalDoc] = useState(null);
  const [previewModalDoc, setPreviewModalDoc] = useState(null);

  // Keyboard Accessibility: Escape key closes any active modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (uploadModalOpen) setUploadModalOpen(false);
        if (replaceModalDoc) setReplaceModalDoc(null);
        if (deleteModalDoc) setDeleteModalDoc(null);
        if (previewModalDoc) closePreviewModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [uploadModalOpen, replaceModalDoc, deleteModalDoc, previewModalDoc]);

  // Upload Form State
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState('Identity');
  const [formRemarks, setFormRemarks] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [formError, setFormError] = useState('');
  const fileInputRef = useRef(null);
  const replaceFileInputRef = useRef(null);

  // Preview state
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewContentType, setPreviewContentType] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const previewRevokeRef = useRef(null);

  // Load documents, summary, and smart checklist
  const loadData = async () => {
    try {
      setLoading(true);
      const [docsData, summaryData, checklistData] = await Promise.all([
        docService.getDocuments({
          category: selectedCategory,
          status: selectedStatus,
          search: searchQuery,
        }),
        docService.getDocumentSummary(),
        docService.getSmartChecklist(selectedSchemeId).catch(err => {
          console.warn('[DOCUMENTS] Could not fetch smart checklist:', err);
          return null;
        }),
      ]);
      setDocuments(docsData || []);
      if (summaryData) setSummary(summaryData);
      if (checklistData) setSmartChecklist(checklistData);
    } catch (err) {
      console.error('[DOCUMENTS] Load error:', err);
      setFeedback({ type: 'error', message: err.message || t('common.error') });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedCategory, selectedStatus, searchQuery, selectedSchemeId]);

  // Toast feedback auto-dismiss
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  // Clean up preview blob URL on unmount or close
  const closePreviewModal = () => {
    if (previewRevokeRef.current) {
      previewRevokeRef.current();
      previewRevokeRef.current = null;
    }
    setPreviewUrl(null);
    setPreviewContentType(null);
    setPreviewModalDoc(null);
  };

  // Open preview modal and fetch blob
  const handleOpenPreview = async (doc) => {
    setPreviewModalDoc(doc);
    setPreviewLoading(true);
    try {
      const { url, contentType, revoke } = await docService.getDocumentPreview(doc.id);
      setPreviewUrl(url);
      setPreviewContentType(contentType);
      previewRevokeRef.current = revoke;
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || t('doc.err_preview_load') });
      closePreviewModal();
    } finally {
      setPreviewLoading(false);
    }
  };

  // Handle file drop or selection
  const handleFileChange = (file) => {
    if (!file) return;
    setFormError('');

    const ext = file.name.split('.').pop().toLowerCase();
    const allowed = ['pdf', 'jpg', 'jpeg', 'png'];
    if (!allowed.includes(ext)) {
      setFormError(t('doc.err_invalid_type'));
      return;
    }

    // 10MB limit
    if (file.size > 10 * 1024 * 1024) {
      setFormError(t('doc.err_oversized'));
      return;
    }

    setSelectedFile(file);
    if (!formTitle.trim()) {
      // Pre-fill title from filename without extension
      const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      setFormTitle(baseName.charAt(0).toUpperCase() + baseName.slice(1));
    }
  };

  // Submit New Document Upload
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setFormError(t('doc.err_select_file'));
      return;
    }
    if (!formTitle.trim()) {
      setFormError(t('doc.err_provide_title'));
      return;
    }

    setUploading(true);
    setUploadProgress(20);

    try {
      const interval = setInterval(() => {
        setUploadProgress(p => (p < 85 ? p + 15 : p));
      }, 150);

      await docService.uploadDocument({
        file: selectedFile,
        title: formTitle.trim(),
        category: formCategory,
        remarks: formRemarks.trim(),
      });

      clearInterval(interval);
      setUploadProgress(100);

      setFeedback({ type: 'success', message: t('doc.success_uploaded', { title: formTitle.trim() }) });
      setUploadModalOpen(false);
      resetForm();
      await loadData();
    } catch (err) {
      setFormError(err.message || t('doc.err_upload_fail'));
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Submit File Replacement
  const handleReplaceSubmit = async (file) => {
    if (!file || !replaceModalDoc) return;
    setUploading(true);
    try {
      await docService.replaceDocument(replaceModalDoc.id, file);
      setFeedback({ type: 'success', message: t('doc.success_replaced', { title: replaceModalDoc.title }) });
      setReplaceModalDoc(null);
      await loadData();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || t('doc.err_replace_fail') });
    } finally {
      setUploading(false);
    }
  };

  // Submit Document Deletion
  const handleDeleteConfirm = async () => {
    if (!deleteModalDoc) return;
    try {
      await docService.deleteDocument(deleteModalDoc.id);
      setFeedback({ type: 'success', message: t('doc.success_deleted', { title: deleteModalDoc.title }) });
      setDeleteModalDoc(null);
      await loadData();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || t('doc.err_delete_fail') });
    }
  };

  // Secure Download
  const handleDownload = async (doc) => {
    try {
      await docService.downloadDocument(doc.id, doc.file_name || `${doc.title}.pdf`);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || t('doc.err_download_fail') });
    }
  };

  // Download DPR PDF directly via ReportLab
  const handleDownloadDpr = async () => {
    try {
      await downloadDprPdf(smartChecklist?.business_type || 'Project');
      setFeedback({ type: 'success', message: t('doc.success_dpr_downloaded') });
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || t('doc.err_download_fail') });
    }
  };

  const handleInitChecklist = async () => {
    try {
      setLoading(true);
      await docService.initializeChecklist();
      setFeedback({ type: 'success', message: t('doc.success_checklist_init') });
      await loadData();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || t('common.error') });
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormTitle('');
    setFormCategory('Identity');
    setFormRemarks('');
    setSelectedFile(null);
    setFormError('');
  };

  const openUploadForMissing = (doc) => {
    setFormTitle(doc.title);
    setFormCategory(doc.category || 'Other');
    setFormRemarks('');
    setSelectedFile(null);
    setFormError('');
    setUploadModalOpen(true);
  };

  const openUploadForRequirement = (item) => {
    resetForm();
    setFormTitle(item.title);
    setFormCategory(CATEGORIES.includes(item.category) ? item.category : 'Other');
    setFormRemarks(item.reason ? `Requirement: ${item.reason}` : '');
    setUploadModalOpen(true);
  };

  // Status configuration badge helpers
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Uploaded':
        return {
          bg: '#ecfdf5',
          color: '#065f46',
          border: '#a7f3d0',
          icon: <CheckCircle2 size={13} />,
          label: t('doc.status_uploaded') || 'Uploaded',
        };
      case 'Pending Review':
        return {
          bg: '#eff6ff',
          color: '#1e40af',
          border: '#bfdbfe',
          icon: <Clock size={13} />,
          label: t('doc.status_pending_review') || 'Pending Review',
        };
      case 'Needs Attention':
        return {
          bg: '#fffbeb',
          color: '#92400e',
          border: '#fde68a',
          icon: <AlertTriangle size={13} />,
          label: t('doc.status_needs_attention') || 'Needs Attention',
        };
      case 'Missing':
      default:
        return {
          bg: '#fef2f2',
          color: '#991b1b',
          border: '#fecaca',
          icon: <AlertCircle size={13} />,
          label: t('doc.status_missing') || 'Missing',
        };
    }
  };

  // Manual Owner/Admin Verification status badge helper
  const getVerificationBadge = (verifStatus) => {
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

  // Category Icon helper
  const getCategoryIcon = (category, fileType) => {
    if (fileType && fileType.startsWith('image/')) {
      return <ImageIcon size={20} color="var(--gs-blue-600)" />;
    }
    switch (category) {
      case 'Identity':
        return <Shield size={20} color="var(--gs-green-600)" />;
      case 'Business':
        return <FileCheck size={20} color="var(--gs-earth-600)" />;
      case 'Financial':
        return <FileText size={20} color="var(--gs-blue-600)" />;
      case 'Loan':
        return <Sparkles size={20} color="var(--gs-amber-600)" />;
      case 'Government Scheme':
        return <Landmark size={20} color="var(--gs-blue-600)" />;
      case 'DPR':
        return <FileText size={20} color="var(--gs-green-600)" />;
      default:
        return <FileText size={20} color="var(--gs-text-muted)" />;
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return null;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (isoString) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return '—';
    }
  };

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-8 lg:py-12">
      {/* Toast Feedback */}
      {feedback && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 18px',
            borderRadius: 'var(--gs-radius-lg)',
            background: feedback.type === 'error' ? '#fef2f2' : '#ecfdf5',
            color: feedback.type === 'error' ? '#991b1b' : '#065f46',
            border: `1px solid ${feedback.type === 'error' ? '#fecaca' : '#a7f3d0'}`,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            animation: 'fadeInUp 0.25s ease-out',
          }}
        >
          {feedback.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span style={{ fontSize: '13px', fontWeight: 600 }}>{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: '2px' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs font-medium text-[#5F665F] mb-6">
        <button
          onClick={() => navigate('/')}
          className="hover:text-[#355E3B] transition bg-transparent border-0 cursor-pointer p-0 text-[#5F665F]"
        >
          {t('landing.nav_home', 'Home')}
        </button>
        <span className="opacity-40">/</span>
        <span>{t('nav.myspace', 'My space')}</span>
        <span className="opacity-40">/</span>
        <span className="text-[#355E3B] font-semibold">{t('doc.title') || 'Documents'}</span>
      </div>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 gs-animate-fade-up">
        <div>
          <span className="inline-block text-xs font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full bg-[#E7F0DE] text-[#355E3B] mb-2.5">
            {t('doc.badge') || 'Vault & Verification'}
          </span>
          <h1 className="text-3xl lg:text-4xl font-bold text-[#24302A] tracking-tight">
            {t('doc.title') || 'Documents Portfolio'}
          </h1>
          <p className="text-sm sm:text-base text-[#5F665F] mt-1.5 max-w-2xl">
            {t('doc.subtitle') || 'Securely manage, preview, and verify identity, business, financial, and DPR records.'}
          </p>
        </div>

        <button
          onClick={() => { resetForm(); setUploadModalOpen(true); }}
          className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white bg-[#355E3B] hover:bg-[#214A32] shadow-xs hover:shadow-md transition cursor-pointer border-0 shrink-0 self-start sm:self-center"
        >
          <Plus size={16} />
          <span>{t('doc.upload_new') || 'Upload Document'}</span>
        </button>
      </div>

      {/* Primary View Switcher Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '22px',
          borderBottom: '1.5px solid var(--gs-border)',
          paddingBottom: '2px',
        }}
      >
        <button
          onClick={() => setActiveTab('smart_checklist')}
          style={{
            padding: '10px 18px',
            borderRadius: 'var(--gs-radius-lg) var(--gs-radius-lg) 0 0',
            border: 'none',
            borderBottom: activeTab === 'smart_checklist' ? '3px solid var(--gs-green-600)' : '3px solid transparent',
            background: activeTab === 'smart_checklist' ? 'var(--gs-bg-card)' : 'transparent',
            color: activeTab === 'smart_checklist' ? 'var(--gs-green-700)' : 'var(--gs-text-muted)',
            fontWeight: 700,
            fontSize: '14px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease',
          }}
        >
          <Sparkles size={16} />
          {t('doc.tab_smart_checklist')}
          {smartChecklist && (
            <span
              style={{
                background: smartChecklist.completion_percentage === 100 ? '#ecfdf5' : '#eff6ff',
                color: smartChecklist.completion_percentage === 100 ? '#065f46' : '#1e40af',
                border: `1px solid ${smartChecklist.completion_percentage === 100 ? '#a7f3d0' : '#bfdbfe'}`,
                padding: '2px 8px',
                borderRadius: 'var(--gs-radius-full)',
                fontSize: '11px',
                fontWeight: 700,
              }}
            >
              {smartChecklist.uploaded_count}/{smartChecklist.total_required} Ready
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('all_files')}
          style={{
            padding: '10px 18px',
            borderRadius: 'var(--gs-radius-lg) var(--gs-radius-lg) 0 0',
            border: 'none',
            borderBottom: activeTab === 'all_files' ? '3px solid var(--gs-green-600)' : '3px solid transparent',
            background: activeTab === 'all_files' ? 'var(--gs-bg-card)' : 'transparent',
            color: activeTab === 'all_files' ? 'var(--gs-green-700)' : 'var(--gs-text-muted)',
            fontWeight: 700,
            fontSize: '14px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease',
          }}
        >
          <FileText size={16} />
          {t('doc.tab_all_files')}
          <span
            style={{
              background: 'var(--gs-bg-muted)',
              color: 'var(--gs-text-muted)',
              padding: '2px 8px',
              borderRadius: 'var(--gs-radius-full)',
              fontSize: '11px',
              fontWeight: 700,
            }}
          >
            {documents.length}
          </span>
        </button>
      </div>

      {/* ── TAB 1: SMART PROJECT CHECKLIST VIEW ──────────────────────────────── */}
      {activeTab === 'smart_checklist' && (
        <div className="gs-animate-fade-up">
          {/* Project Context & Documentation Readiness */}
          <div
            className="gs-card"
            style={{
              padding: '20px 24px',
              marginBottom: '24px',
              background: 'linear-gradient(135deg, rgba(34,197,94,0.06) 0%, rgba(59,130,246,0.06) 100%)',
              border: '1.5px solid var(--gs-green-200)',
              borderRadius: 'var(--gs-radius-xl)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: 'var(--gs-radius-md)', background: 'var(--gs-green-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                  <Layers size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: 'var(--gs-text-primary)' }}>
                    {t('doc.project_context')}
                  </h2>
                  <p style={{ fontSize: '12px', color: 'var(--gs-text-muted)', margin: '2px 0 0' }}>
                    {t('doc.personalized_subtitle')}
                  </p>
                </div>
              </div>

              {smartChecklist?.completion_percentage === 100 ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', padding: '5px 12px', borderRadius: 'var(--gs-radius-full)', fontSize: '12px', fontWeight: 700 }}>
                  <CheckCircle2 size={14} /> {t('doc.bankable_ready')}
                </span>
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a', padding: '5px 12px', borderRadius: 'var(--gs-radius-full)', fontSize: '12px', fontWeight: 700 }}>
                  <AlertTriangle size={14} /> {t('doc.action_items_required', { count: smartChecklist?.missing_count || 0 })}
                </span>
              )}
            </div>

            {/* 3 Active Journey Context Badges */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px',
                marginBottom: '18px',
              }}
            >
              <div style={{ padding: '12px 14px', background: 'var(--gs-bg-card)', borderRadius: 'var(--gs-radius-lg)', border: '1px solid var(--gs-border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Briefcase size={18} color="var(--gs-green-600)" />
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--gs-text-muted)', display: 'block', fontWeight: 600 }}>{t('doc.active_business')}</span>
                  <strong style={{ fontSize: '13px', color: 'var(--gs-text-primary)' }}>{smartChecklist?.business_type || 'Rural Enterprise'}</strong>
                </div>
              </div>

              <div style={{ padding: '12px 14px', background: 'var(--gs-bg-card)', borderRadius: 'var(--gs-radius-lg)', border: '1px solid var(--gs-border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Landmark size={18} color="var(--gs-blue-600)" />
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--gs-text-muted)', display: 'block', fontWeight: 600 }}>{t('doc.matched_scheme')}</span>
                  <strong style={{ fontSize: '13px', color: 'var(--gs-text-primary)' }}>{smartChecklist?.matched_scheme_name || smartChecklist?.matched_scheme_id || 'PMMY'}</strong>
                </div>
              </div>

              <div style={{ padding: '12px 14px', background: 'var(--gs-bg-card)', borderRadius: 'var(--gs-radius-lg)', border: '1px solid var(--gs-border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <IndianRupee size={18} color="var(--gs-amber-600)" />
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--gs-text-muted)', display: 'block', fontWeight: 600 }}>{t('doc.loan_target')}</span>
                  <strong style={{ fontSize: '13px', color: 'var(--gs-text-primary)' }}>
                    {smartChecklist?.loan_amount ? `₹${smartChecklist.loan_amount.toLocaleString('en-IN')}` : `₹5,00,000 (${t('doc.target_label')})`}
                  </strong>
                  {smartChecklist?.loan_eligibility_score ? (
                    <span style={{ display: 'block', fontSize: '10px', color: 'var(--gs-green-700)', fontWeight: 700, marginTop: '2px' }}>
                      {t('doc.score_label')}: {smartChecklist.loan_eligibility_score}/100 ({smartChecklist.loan_eligibility_status || t('doc.verified_label')})
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Scheme Selector Pills if multiple schemes available */}
            {smartChecklist?.available_schemes && smartChecklist.available_schemes.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gs-text-muted)' }}>
                  {t('doc.switch_scheme')}
                </span>
                {smartChecklist.available_schemes.map(sch => {
                  const isActive = (selectedSchemeId || smartChecklist.matched_scheme_id) === sch.id;
                  return (
                    <button
                      key={sch.id}
                      onClick={() => setSelectedSchemeId(sch.id)}
                      style={{
                        padding: '3px 10px',
                        borderRadius: 'var(--gs-radius-full)',
                        border: isActive ? '1.5px solid var(--gs-blue-600)' : '1px solid var(--gs-border)',
                        background: isActive ? 'var(--gs-blue-50)' : 'var(--gs-bg-card)',
                        color: isActive ? 'var(--gs-blue-700)' : 'var(--gs-text-secondary)',
                        fontSize: '11px',
                        fontWeight: isActive ? 700 : 500,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span>{sch.id}</span>
                      {sch.match_score ? <span style={{ opacity: 0.7 }}>({sch.match_score}%)</span> : null}
                    </button>
                  );
                })}
                {selectedSchemeId && (
                  <button
                    onClick={() => setSelectedSchemeId(null)}
                    style={{
                      padding: '2px 8px',
                      borderRadius: 'var(--gs-radius-full)',
                      border: 'none',
                      background: 'none',
                      color: 'var(--gs-text-muted)',
                      fontSize: '11px',
                      textDecoration: 'underline',
                      cursor: 'pointer',
                    }}
                  >
                    {t('doc.reset')}
                  </button>
                )}
              </div>
            )}

            {/* Documentation Readiness Progress Bar */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gs-text-primary)' }}>
                  {t('doc.readiness_score')}
                </span>
                <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--gs-green-700)' }}>
                  {smartChecklist ? t('doc.checklist_progress', { ready: smartChecklist.uploaded_count, total: smartChecklist.total_required, pct: smartChecklist.completion_percentage }) : '—'}
                </span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'var(--gs-border-subtle)', borderRadius: 'var(--gs-radius-full)', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${smartChecklist?.completion_percentage || 0}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, var(--gs-green-500) 0%, var(--gs-green-600) 100%)',
                    borderRadius: 'var(--gs-radius-full)',
                    transition: 'width 0.4s ease-in-out',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Smart Checklist Quick Filter Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[
                { id: 'all', label: t('doc.filter_all_items'), count: smartChecklist?.total_required || 0 },
                { id: 'missing', label: t('doc.filter_missing_only'), count: smartChecklist?.missing_count || 0, badgeColor: '#991b1b', badgeBg: '#fef2f2' },
                { id: 'uploaded', label: t('doc.filter_uploaded_only'), count: smartChecklist?.uploaded_count || 0, badgeColor: '#065f46', badgeBg: '#ecfdf5' },
              ].map(f => {
                const isSelected = checklistFilter === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => setChecklistFilter(f.id)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 'var(--gs-radius-full)',
                      border: isSelected ? '1.5px solid var(--gs-green-600)' : '1px solid var(--gs-border)',
                      background: isSelected ? 'var(--gs-green-50)' : 'var(--gs-bg-card)',
                      color: isSelected ? 'var(--gs-green-800)' : 'var(--gs-text-secondary)',
                      fontSize: '12px',
                      fontWeight: isSelected ? 700 : 500,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>{f.label}</span>
                    <span
                      style={{
                        padding: '1px 6px',
                        borderRadius: 'var(--gs-radius-full)',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: f.badgeBg || 'var(--gs-bg-muted)',
                        color: f.badgeColor || 'var(--gs-text-muted)',
                      }}
                    >
                      {f.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {checklistFilter !== 'all' && (
              <button
                onClick={() => setChecklistFilter('all')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--gs-text-muted)',
                  fontSize: '11px',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: '4px 6px',
                }}
              >
                {t('doc.reset')}
              </button>
            )}
          </div>

          {/* Smart Checklist Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {loading ? (
              <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--gs-text-muted)' }}>
                <div className="gs-spinner" style={{ margin: '0 auto 12px', width: '28px', height: '28px' }} />
                <p style={{ fontSize: '14px' }}>{t('common.loading')}</p>
              </div>
            ) : (!smartChecklist || !smartChecklist.items || smartChecklist.items.length === 0) ? (
              <div
                className="gs-card"
                style={{
                  padding: '48px 24px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--gs-bg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                  📋
                </div>
                <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--gs-text-primary)', margin: 0 }}>
                  {t('doc.no_checklist_items')}
                </p>
                <button
                  onClick={loadData}
                  className="gs-btn gs-btn-primary gs-btn-sm"
                  style={{ marginTop: '8px' }}
                >
                  <RefreshCw size={14} /> {t('doc.refresh_checklist')}
                </button>
              </div>
            ) : (() => {
              const displayedItems = (smartChecklist?.items || []).filter((item) => {
                if (checklistFilter === 'missing') return item.status === 'Missing';
                if (checklistFilter === 'uploaded') return item.status !== 'Missing';
                return true;
              });

              if (displayedItems.length === 0) {
                return (
                  <div
                    className="gs-card"
                    style={{
                      padding: '36px 24px',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--gs-text-secondary)', margin: 0 }}>
                      {t('doc.empty_desc')}
                    </p>
                    <button
                      onClick={() => setChecklistFilter('all')}
                      className="gs-btn gs-btn-outline gs-btn-sm"
                      style={{ marginTop: '4px' }}
                    >
                      {t('doc.reset')}
                    </button>
                  </div>
                );
              }

              return displayedItems.map((item) => {
                const badge = getStatusBadge(item.status);
                const verifBadge = (item.status === 'Uploaded' && item.verification_status) ? getVerificationBadge(item.verification_status) : null;
                const isMissing = item.status === 'Missing';
                const isDpr = item.is_dpr;

                return (
                  <div
                    key={item.id}
                    className="gs-card"
                    style={{
                      padding: '18px 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      borderLeft: `4px solid ${badge.color}`,
                      transition: 'box-shadow 0.2s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                      {/* Left: Icon and Details */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', flex: '1 1 260px', minWidth: '240px' }}>
                        <div
                          style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: 'var(--gs-radius-lg)',
                            background: 'var(--gs-bg-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {getCategoryIcon(item.category, item.file_type)}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--gs-text-primary)', margin: 0, wordBreak: 'break-word' }}>
                              {item.title}
                            </h3>
                            <span
                              style={{
                                fontSize: '11px',
                                padding: '2px 8px',
                                borderRadius: 'var(--gs-radius-full)',
                                background: 'var(--gs-bg-muted)',
                                color: 'var(--gs-text-secondary)',
                                fontWeight: 600,
                              }}
                            >
                              {t(`doc.cat_${item.category.toLowerCase().replace(/\s+/g, '_')}`) || item.category}
                            </span>
                            <span
                              style={{
                                fontSize: '10px',
                                padding: '2px 7px',
                                borderRadius: 'var(--gs-radius-sm)',
                                background: 'rgba(59,130,246,0.08)',
                                color: 'var(--gs-blue-700)',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                              }}
                            >
                              {t(`doc.source_${item.source}`) || item.source}
                            </span>
                          </div>

                          {/* Required For Pills */}
                          {item.required_for && item.required_for.length > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--gs-text-muted)' }}>
                                {t('doc.required_for')}:
                              </span>
                              {item.required_for.map((rf, idx) => (
                                <span
                                  key={idx}
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    padding: '1px 7px',
                                    borderRadius: 'var(--gs-radius-sm)',
                                    background: 'var(--gs-bg-muted)',
                                    color: 'var(--gs-text-primary)',
                                    border: '1px solid var(--gs-border)',
                                  }}
                                >
                                  {rf}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Reason / Policy Guidance */}
                          {item.reason && (
                            <p style={{ fontSize: '12px', color: 'var(--gs-text-muted)', margin: '6px 0 0', lineHeight: 1.4 }}>
                              {item.reason}
                            </p>
                          )}

                          {/* Associated File Meta or DPR Remarks */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px', flexWrap: 'wrap' }}>
                            {item.file_name && (
                              <span
                                style={{
                                  fontSize: '11px',
                                  color: 'var(--gs-text-secondary)',
                                  fontWeight: 600,
                                  maxWidth: '240px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  display: 'inline-block',
                                  verticalAlign: 'bottom',
                                }}
                                title={item.file_name}
                              >
                                📄 {item.file_name} {item.file_size ? `(${formatFileSize(item.file_size)})` : ''}
                              </span>
                            )}
                            {item.updated_at && (
                              <span style={{ fontSize: '11px', color: 'var(--gs-text-muted)' }}>
                                • {formatDate(item.updated_at)}
                              </span>
                            )}
                            {item.remarks && (
                              <span style={{ fontSize: '11px', color: 'var(--gs-text-muted)', fontStyle: 'italic' }}>
                                • {item.remarks}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Status Badge & Dynamic Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', flexShrink: 0 }}>
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
                          }}
                        >
                          {badge.icon}
                          {badge.label}
                        </span>

                        {verifBadge && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '4px 10px',
                              borderRadius: 'var(--gs-radius-full)',
                              fontSize: '12px',
                              fontWeight: 700,
                              background: verifBadge.bg,
                              color: verifBadge.color,
                              border: `1px solid ${verifBadge.border}`,
                            }}
                          >
                            {verifBadge.icon}
                            {verifBadge.label}
                          </span>
                        )}

                        {/* Actions for DPR */}
                        {isDpr ? (
                          item.status === 'Uploaded' ? (
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              {item.document_id && (
                                <button
                                  onClick={() => handleOpenPreview({ id: item.document_id, title: item.title, file_name: item.file_name })}
                                  title={t('doc.action_preview')}
                                  aria-label={t('doc.action_preview')}
                                  style={{
                                    padding: '7px 10px',
                                    minHeight: '36px',
                                    minWidth: '36px',
                                    borderRadius: 'var(--gs-radius-md)',
                                    border: '1px solid var(--gs-border)',
                                    background: 'var(--gs-bg-card)',
                                    color: 'var(--gs-text-secondary)',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  <Eye size={15} />
                                </button>
                              )}
                              <button
                                onClick={item.document_id ? () => docService.downloadDocument(item.document_id, item.file_name || `${item.title}.pdf`) : handleDownloadDpr}
                                className="gs-btn gs-btn-primary gs-btn-sm"
                                aria-label={t('doc.action_download')}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700, minHeight: '36px' }}
                              >
                                <Download size={14} /> {t('doc.action_download')}
                              </button>
                              <button
                                onClick={() => navigate('/dpr')}
                                className="gs-btn gs-btn-outline gs-btn-sm"
                                aria-label={t('doc.btn_generate_dpr')}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', minHeight: '36px' }}
                              >
                                <ExternalLink size={14} /> {t('doc.btn_generate_dpr')}
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => navigate('/dpr')}
                              className="gs-btn gs-btn-primary gs-btn-sm"
                              aria-label={item.status === 'Needs Attention' ? (t('doc.dpr_needs_sync') || 'Re-sync Financials') : t('doc.btn_generate_dpr')}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700, minHeight: '36px' }}
                            >
                              <Sparkles size={14} /> {item.status === 'Needs Attention' ? (t('doc.dpr_needs_sync') || 'Re-sync Financials') : t('doc.btn_generate_dpr')}
                            </button>
                          )
                        ) : (
                          /* Actions for Regular Document */
                          isMissing ? (
                            <button
                              onClick={() => openUploadForRequirement(item)}
                              className="gs-btn gs-btn-primary gs-btn-sm"
                              aria-label={t('doc.action_upload')}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700, minHeight: '36px' }}
                            >
                              <Upload size={14} /> {t('doc.action_upload')}
                            </button>
                          ) : (
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              {item.document_id && (
                                <>
                                  <button
                                    onClick={() => handleOpenPreview({ id: item.document_id, title: item.title, file_name: item.file_name })}
                                    title={t('doc.action_preview')}
                                    aria-label={t('doc.action_preview')}
                                    style={{
                                      padding: '7px 10px',
                                      minHeight: '36px',
                                      minWidth: '36px',
                                      borderRadius: 'var(--gs-radius-md)',
                                      border: '1px solid var(--gs-border)',
                                      background: 'var(--gs-bg-card)',
                                      color: 'var(--gs-text-secondary)',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                  >
                                    <Eye size={15} />
                                  </button>
                                  <button
                                    onClick={() => docService.downloadDocument(item.document_id, item.file_name || `${item.title}.pdf`)}
                                    title={t('doc.action_download')}
                                    aria-label={t('doc.action_download')}
                                    style={{
                                      padding: '7px 10px',
                                      minHeight: '36px',
                                      minWidth: '36px',
                                      borderRadius: 'var(--gs-radius-md)',
                                      border: '1px solid var(--gs-border)',
                                      background: 'var(--gs-bg-card)',
                                      color: 'var(--gs-text-secondary)',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                  >
                                    <Download size={15} />
                                  </button>
                                  <button
                                    onClick={() => setReplaceModalDoc({ id: item.document_id, title: item.title, category: item.category, file_name: item.file_name })}
                                    title={t('doc.action_replace')}
                                    aria-label={t('doc.action_replace')}
                                    style={{
                                      padding: '7px 10px',
                                      minHeight: '36px',
                                      minWidth: '36px',
                                      borderRadius: 'var(--gs-radius-md)',
                                      border: '1px solid var(--gs-border)',
                                      background: 'var(--gs-bg-card)',
                                      color: 'var(--gs-text-secondary)',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                  >
                                    <RefreshCw size={14} />
                                  </button>
                                  <button
                                    onClick={() => setDeleteModalDoc({ id: item.document_id, title: item.title })}
                                    title={t('doc.action_delete')}
                                    aria-label={t('doc.action_delete')}
                                    style={{
                                      padding: '7px 10px',
                                      minHeight: '36px',
                                      minWidth: '36px',
                                      borderRadius: 'var(--gs-radius-md)',
                                      border: '1px solid var(--gs-border)',
                                      background: 'var(--gs-bg-card)',
                                      color: '#dc2626',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    </div>

                    {/* Manual Verification Status Feedback Banner */}
                    {item.status === 'Uploaded' && (
                      <div style={{ marginTop: '2px' }}>
                        {item.verification_status === 'REJECTED' && (
                          <div style={{
                            padding: '12px 14px',
                            borderRadius: 'var(--gs-radius-md)',
                            background: '#fef2f2',
                            border: '1px solid #fecaca',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '12px',
                            flexWrap: 'wrap'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <AlertCircle size={16} color="#991b1b" style={{ flexShrink: 0 }} />
                              <div>
                                <strong style={{ fontSize: '12px', color: '#991b1b' }}>{t('doc.verif_rejected')}</strong>
                                {item.verification_remark && (
                                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#7f1d1d' }}>
                                    {t('doc.verification_remark')} {item.verification_remark}
                                  </p>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => setReplaceModalDoc({ id: item.document_id, title: item.title })}
                              className="gs-btn gs-btn-sm"
                              style={{ background: '#dc2626', color: '#fff', border: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
                            >
                              <Upload size={13} /> {t('doc.reupload_now')}
                            </button>
                          </div>
                        )}

                        {item.verification_status === 'REUPLOAD_REQUIRED' && (
                          <div style={{
                            padding: '12px 14px',
                            borderRadius: 'var(--gs-radius-md)',
                            background: '#fff7ed',
                            border: '1px solid #fed7aa',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '12px',
                            flexWrap: 'wrap'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <AlertTriangle size={16} color="#c2410c" style={{ flexShrink: 0 }} />
                              <div>
                                <strong style={{ fontSize: '12px', color: '#c2410c' }}>{t('doc.verif_reupload')}</strong>
                                {item.verification_remark && (
                                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#9a3412' }}>
                                    {t('doc.verification_remark')} {item.verification_remark}
                                  </p>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => setReplaceModalDoc({ id: item.document_id, title: item.title })}
                              className="gs-btn gs-btn-sm"
                              style={{ background: '#ea580c', color: '#fff', border: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
                            >
                              <Upload size={13} /> {t('doc.reupload_now')}
                            </button>
                          </div>
                        )}

                        {item.verification_status === 'VERIFIED' && (
                          <div style={{
                            padding: '8px 12px',
                            borderRadius: 'var(--gs-radius-md)',
                            background: '#ecfdf5',
                            border: '1px solid #a7f3d0',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '12px',
                            color: '#065f46'
                          }}>
                            <CheckCircle2 size={15} color="#059669" style={{ flexShrink: 0 }} />
                            <span>
                              <strong>{t('doc.verif_verified')}</strong>
                              {item.verified_at ? ` • ${t('doc.verified_on', { date: formatDate(item.verified_at) })}` : ''}
                              {item.verification_remark ? ` — "${item.verification_remark}"` : ''}
                            </span>
                          </div>
                        )}

                        {(!item.verification_status || item.verification_status === 'PENDING') && (
                          <div style={{
                            padding: '6px 12px',
                            borderRadius: 'var(--gs-radius-md)',
                            background: '#fefce8',
                            border: '1px solid #fef08a',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '11px',
                            color: '#854d0e'
                          }}>
                            <Clock size={13} color="#a16207" style={{ flexShrink: 0 }} />
                            <span>{t('doc.verif_pending_desc')}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>

          {/* Regulatory & Institutional Banking Disclaimer */}
          <div
            style={{
              marginTop: '28px',
              padding: '16px 20px',
              borderRadius: 'var(--gs-radius-lg)',
              background: 'var(--gs-bg-muted)',
              border: '1px solid var(--gs-border)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
            }}
          >
            <Shield size={20} color="var(--gs-text-muted)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--gs-text-muted)', display: 'block', marginBottom: '2px' }}>
                {t('doc.regulatory_notice_title')}
              </span>
              <p style={{ fontSize: '12px', color: 'var(--gs-text-secondary)', margin: 0, lineHeight: 1.5 }}>
                {t('doc.loan_disclaimer')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: ALL UPLOADED DOCUMENTS VIEW ───────────────────────────────── */}
      {activeTab === 'all_files' && (
        <div className="gs-animate-fade-up">
          {/* Overview Stats Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '12px',
              marginBottom: '24px',
            }}
          >
            {[
              { label: t('doc.stat_total'), count: summary.total, color: 'var(--gs-text-primary)', bg: 'var(--gs-bg-card)', border: 'var(--gs-border)' },
              { label: t('doc.stat_uploaded'), count: summary.uploaded, color: '#065f46', bg: '#ecfdf5', border: '#a7f3d0' },
              { label: t('doc.stat_pending'), count: summary.pending_review, color: '#1e40af', bg: '#eff6ff', border: '#bfdbfe' },
              { label: t('doc.stat_attention'), count: summary.needs_attention, color: '#92400e', bg: '#fffbeb', border: '#fde68a' },
              { label: t('doc.stat_missing'), count: summary.missing, color: '#991b1b', bg: '#fef2f2', border: '#fecaca' },
            ].map(stat => (
              <div
                key={stat.label}
                style={{
                  padding: '14px 16px',
                  borderRadius: 'var(--gs-radius-lg)',
                  background: stat.bg,
                  border: `1.5px solid ${stat.border}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gs-text-muted)' }}>{stat.label}</span>
                <span style={{ fontSize: '22px', fontWeight: 800, color: stat.color }}>{stat.count}</span>
              </div>
            ))}
          </div>

          {/* AI Assistant Banner */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center', padding: '16px 20px', background: 'linear-gradient(135deg, rgba(34,197,94,0.08) 0%, rgba(59,130,246,0.08) 100%)', border: '1.5px solid var(--gs-green-200)', borderRadius: 'var(--gs-radius-xl)' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: 'var(--gs-radius-lg)', background: 'var(--gs-green-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#fff' }}>
                <Sparkles size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--gs-text-primary)', margin: 0 }}>{t('doc.ai_check')}</p>
                <p style={{ fontSize: '12px', color: 'var(--gs-text-muted)', marginTop: '2px', margin: 0 }}>{t('doc.ai_check_sub')}</p>
              </div>
              {documents.length === 0 ? (
                <button
                  onClick={handleInitChecklist}
                  className="gs-btn gs-btn-primary gs-btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, fontWeight: 700 }}
                >
                  <FileCheck size={14} /> {t('doc.check_all')}
                </button>
              ) : (
                <button
                  onClick={() => { resetForm(); setUploadModalOpen(true); }}
                  className="gs-btn gs-btn-primary gs-btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, fontWeight: 700 }}
                >
                  <Plus size={14} /> {t('doc.upload_new')}
                </button>
              )}
            </div>
          </div>

          {/* Search & Category Filter Section */}
          <div style={{ marginBottom: '20px' }}>
            {/* Category Pills */}
            <div
              style={{
                display: 'flex',
                gap: '8px',
                overflowX: 'auto',
                paddingBottom: '8px',
                marginBottom: '16px',
                scrollbarWidth: 'none',
              }}
            >
              {CATEGORIES.map(cat => {
                const isSelected = selectedCategory === cat;
                const count = cat === 'All' ? summary.total : (summary.categories_count?.[cat] || 0);
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 'var(--gs-radius-full)',
                      border: isSelected ? '1.5px solid var(--gs-green-500)' : '1px solid var(--gs-border)',
                      background: isSelected ? 'var(--gs-green-500)' : 'var(--gs-bg-card)',
                      color: isSelected ? '#fff' : 'var(--gs-text-secondary)',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>{cat === 'All' ? t('doc.filter_all') : t(`doc.cat_${cat.toLowerCase().replace(/\s+/g, '_')}`) || cat}</span>
                    {count > 0 && (
                      <span
                        style={{
                          background: isSelected ? 'rgba(255,255,255,0.25)' : 'var(--gs-bg-muted)',
                          color: isSelected ? '#fff' : 'var(--gs-text-muted)',
                          padding: '2px 7px',
                          borderRadius: 'var(--gs-radius-full)',
                          fontSize: '11px',
                        }}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Search Bar & Status Dropdown */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: '1 1 240px' }}>
                <Search size={16} color="var(--gs-text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={t('doc.search_placeholder')}
                  style={{
                    width: '100%',
                    padding: '9px 12px 9px 36px',
                    borderRadius: 'var(--gs-radius-md)',
                    border: '1px solid var(--gs-border)',
                    background: 'var(--gs-bg-card)',
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

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Filter size={15} color="var(--gs-text-muted)" />
                <select
                  value={selectedStatus}
                  onChange={e => setSelectedStatus(e.target.value)}
                  style={{
                    padding: '9px 12px',
                    borderRadius: 'var(--gs-radius-md)',
                    border: '1px solid var(--gs-border)',
                    background: 'var(--gs-bg-card)',
                    color: 'var(--gs-text-primary)',
                    fontSize: '13px',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {STATUS_FILTERS.map(st => (
                    <option key={st} value={st}>
                      {st === 'All' ? t('doc.all_statuses') : t(`doc.status_${st.toLowerCase().replace(/\s+/g, '_')}`) || st}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Documents List */}
          <div>
            {loading ? (
              <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--gs-text-muted)' }}>
                <div className="gs-spinner" style={{ margin: '0 auto 12px', width: '28px', height: '28px' }} />
                <p style={{ fontSize: '14px' }}>{t('common.loading')}</p>
              </div>
            ) : documents.length === 0 ? (
              /* Empty State */
              <div
                className="gs-card"
                style={{
                  padding: '48px 24px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--gs-bg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                  📁
                </div>
                <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--gs-text-primary)', margin: 0 }}>
                  {t('doc.empty_title')}
                </p>
                <p style={{ fontSize: '13px', color: 'var(--gs-text-muted)', maxWidth: '420px', margin: 0 }}>
                  {t('doc.empty_desc')}
                </p>
                {(selectedCategory !== 'All' || selectedStatus !== 'All' || searchQuery) ? (
                  <button
                    onClick={() => { setSelectedCategory('All'); setSelectedStatus('All'); setSearchQuery(''); }}
                    className="gs-btn gs-btn-outline gs-btn-sm"
                    style={{ marginTop: '8px' }}
                  >
                    {t('doc.empty_action')}
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '8px' }}>
                    <button
                      onClick={handleInitChecklist}
                      className="gs-btn gs-btn-primary gs-btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <FileCheck size={14} /> {t('doc.check_all')}
                    </button>
                    <button
                      onClick={() => { resetForm(); setUploadModalOpen(true); }}
                      className="gs-btn gs-btn-outline gs-btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Plus size={14} /> {t('doc.upload_new')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Cards Grid / List */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {documents.map(doc => {
                  const badge = getStatusBadge(doc.status);
                  const verifBadge = (doc.status === 'Uploaded' && doc.verification_status) ? getVerificationBadge(doc.verification_status) : null;
                  const isMissing = doc.status === 'Missing';
                  const sizeStr = formatFileSize(doc.file_size);

                  return (
                    <div
                      key={doc.id}
                      className="gs-card"
                      style={{
                        padding: '16px 20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        borderLeft: `4px solid ${badge.color}`,
                        transition: 'box-shadow 0.2s ease',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '16px',
                          flexWrap: 'wrap',
                        }}
                      >
                        {/* Category / File icon */}
                        <div
                          style={{
                            width: '46px',
                            height: '46px',
                            borderRadius: 'var(--gs-radius-lg)',
                            background: 'var(--gs-bg-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {getCategoryIcon(doc.category, doc.file_type)}
                        </div>

                        {/* Document Info */}
                        <div style={{ flex: '1 1 200px', minWidth: '180px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--gs-text-primary)', margin: 0 }}>
                              {doc.title}
                            </h3>
                            <span
                              style={{
                                fontSize: '11px',
                                padding: '2px 8px',
                                borderRadius: 'var(--gs-radius-full)',
                                background: 'var(--gs-bg-muted)',
                                color: 'var(--gs-text-secondary)',
                                fontWeight: 600,
                              }}
                            >
                              {t(`doc.cat_${doc.category.toLowerCase().replace(/\s+/g, '_')}`) || doc.category}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px', flexWrap: 'wrap' }}>
                            <span
                              style={{
                                fontSize: '12px',
                                color: 'var(--gs-text-muted)',
                                maxWidth: '240px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                display: 'inline-block',
                              }}
                              title={doc.file_name || ''}
                            >
                              {doc.file_name ? doc.file_name : t('doc.not_uploaded')}
                            </span>
                            {sizeStr && (
                              <span style={{ fontSize: '11px', color: 'var(--gs-text-muted)' }}>
                                • {sizeStr}
                              </span>
                            )}
                            <span style={{ fontSize: '11px', color: 'var(--gs-text-muted)' }}>
                              • {formatDate(doc.updated_at || doc.created_at)}
                            </span>
                          </div>

                          {doc.remarks && (
                            <p style={{ fontSize: '12px', color: 'var(--gs-text-muted)', margin: '4px 0 0', fontStyle: 'italic' }}>
                              {doc.remarks}
                            </p>
                          )}
                        </div>

                        {/* Status Badges */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
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
                            }}
                          >
                            {badge.icon}
                            {badge.label}
                          </span>

                          {verifBadge && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '4px 10px',
                                borderRadius: 'var(--gs-radius-full)',
                                fontSize: '12px',
                                fontWeight: 700,
                                background: verifBadge.bg,
                                color: verifBadge.color,
                                border: `1px solid ${verifBadge.border}`,
                              }}
                            >
                              {verifBadge.icon}
                              {verifBadge.label}
                            </span>
                          )}
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {isMissing ? (
                            <button
                              onClick={() => openUploadForMissing(doc)}
                              className="gs-btn gs-btn-primary gs-btn-sm"
                              aria-label={t('doc.action_upload')}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', minHeight: '36px' }}
                            >
                              <Upload size={14} /> {t('doc.action_upload')}
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => handleOpenPreview(doc)}
                                title={t('doc.action_preview')}
                                aria-label={t('doc.action_preview')}
                                style={{
                                  padding: '7px 10px',
                                  minHeight: '36px',
                                  minWidth: '36px',
                                  borderRadius: 'var(--gs-radius-md)',
                                  border: '1px solid var(--gs-border)',
                                  background: 'var(--gs-bg-card)',
                                  color: 'var(--gs-text-secondary)',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <Eye size={15} />
                              </button>

                              <button
                                onClick={() => handleDownload(doc)}
                                title={t('doc.action_download')}
                                aria-label={t('doc.action_download')}
                                style={{
                                  padding: '7px 10px',
                                  minHeight: '36px',
                                  minWidth: '36px',
                                  borderRadius: 'var(--gs-radius-md)',
                                  border: '1px solid var(--gs-border)',
                                  background: 'var(--gs-bg-card)',
                                  color: 'var(--gs-text-secondary)',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <Download size={15} />
                              </button>

                              <button
                                onClick={() => setReplaceModalDoc(doc)}
                                title={t('doc.action_replace')}
                                aria-label={t('doc.action_replace')}
                                style={{
                                  padding: '7px 10px',
                                  minHeight: '36px',
                                  minWidth: '36px',
                                  borderRadius: 'var(--gs-radius-md)',
                                  border: '1px solid var(--gs-border)',
                                  background: 'var(--gs-bg-card)',
                                  color: 'var(--gs-text-secondary)',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <RefreshCw size={14} />
                              </button>

                              <button
                                onClick={() => setDeleteModalDoc(doc)}
                                title={t('doc.action_delete')}
                                aria-label={t('doc.action_delete')}
                                style={{
                                  padding: '7px 10px',
                                  minHeight: '36px',
                                  minWidth: '36px',
                                  borderRadius: 'var(--gs-radius-md)',
                                  border: '1px solid var(--gs-border)',
                                  background: 'var(--gs-bg-card)',
                                  color: '#dc2626',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Manual Verification Status Feedback Banner */}
                      {doc.status === 'Uploaded' && (
                        <div style={{ marginTop: '2px' }}>
                          {doc.verification_status === 'REJECTED' && (
                            <div style={{
                              padding: '12px 14px',
                              borderRadius: 'var(--gs-radius-md)',
                              background: '#fef2f2',
                              border: '1px solid #fecaca',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '12px',
                              flexWrap: 'wrap'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <AlertCircle size={16} color="#991b1b" style={{ flexShrink: 0 }} />
                                <div>
                                  <strong style={{ fontSize: '12px', color: '#991b1b' }}>{t('doc.verif_rejected')}</strong>
                                  {doc.verification_remark && (
                                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#7f1d1d' }}>
                                      {t('doc.verification_remark')} {doc.verification_remark}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <button
                                onClick={() => setReplaceModalDoc(doc)}
                                className="gs-btn gs-btn-sm"
                                style={{ background: '#dc2626', color: '#fff', border: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
                              >
                                <Upload size={13} /> {t('doc.reupload_now')}
                              </button>
                            </div>
                          )}

                          {doc.verification_status === 'REUPLOAD_REQUIRED' && (
                            <div style={{
                              padding: '12px 14px',
                              borderRadius: 'var(--gs-radius-md)',
                              background: '#fff7ed',
                              border: '1px solid #fed7aa',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '12px',
                              flexWrap: 'wrap'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <AlertTriangle size={16} color="#c2410c" style={{ flexShrink: 0 }} />
                                <div>
                                  <strong style={{ fontSize: '12px', color: '#c2410c' }}>{t('doc.verif_reupload')}</strong>
                                  {doc.verification_remark && (
                                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#9a3412' }}>
                                      {t('doc.verification_remark')} {doc.verification_remark}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <button
                                onClick={() => setReplaceModalDoc(doc)}
                                className="gs-btn gs-btn-sm"
                                style={{ background: '#ea580c', color: '#fff', border: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
                              >
                                <Upload size={13} /> {t('doc.reupload_now')}
                              </button>
                            </div>
                          )}

                          {doc.verification_status === 'VERIFIED' && (
                            <div style={{
                              padding: '8px 12px',
                              borderRadius: 'var(--gs-radius-md)',
                              background: '#ecfdf5',
                              border: '1px solid #a7f3d0',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              fontSize: '12px',
                              color: '#065f46'
                            }}>
                              <CheckCircle2 size={15} color="#059669" style={{ flexShrink: 0 }} />
                              <span>
                                <strong>{t('doc.verif_verified')}</strong>
                                {doc.verified_at ? ` • ${t('doc.verified_on', { date: formatDate(doc.verified_at) })}` : ''}
                                {doc.verification_remark ? ` — "${doc.verification_remark}"` : ''}
                              </span>
                            </div>
                          )}

                          {(!doc.verification_status || doc.verification_status === 'PENDING') && (
                            <div style={{
                              padding: '6px 12px',
                              borderRadius: 'var(--gs-radius-md)',
                              background: '#fefce8',
                              border: '1px solid #fef08a',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              fontSize: '11px',
                              color: '#854d0e'
                            }}>
                              <Clock size={13} color="#a16207" style={{ flexShrink: 0 }} />
                              <span>{t('doc.verif_pending_desc')}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Regulatory & Manual Verification Notice */}
          <div
            style={{
              marginTop: '28px',
              padding: '16px 20px',
              borderRadius: 'var(--gs-radius-lg)',
              background: 'var(--gs-bg-muted)',
              border: '1px solid var(--gs-border)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
            }}
          >
            <Shield size={20} color="var(--gs-text-muted)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--gs-text-muted)', display: 'block', marginBottom: '2px' }}>
                {t('doc.regulatory_notice_title')}
              </span>
              <p style={{ fontSize: '12px', color: 'var(--gs-text-secondary)', margin: 0, lineHeight: 1.5 }}>
                {t('doc.verif_disclaimer')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── UPLOAD MODAL ────────────────────────────────────────────────────────── */}
      {uploadModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9990,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            backdropFilter: 'blur(3px)',
          }}
        >
          <div
            className="gs-card"
            style={{
              width: '100%',
              maxWidth: '520px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '24px',
              borderRadius: 'var(--gs-radius-xl)',
              boxShadow: 'var(--gs-shadow-lg)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--gs-text-primary)' }}>
                {t('doc.upload_modal_title')}
              </h2>
              <button
                onClick={() => setUploadModalOpen(false)}
                aria-label={t('doc.close_modal')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gs-text-muted)', minHeight: '36px', minWidth: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Category */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px', color: 'var(--gs-text-primary)' }}>
                  {t('doc.field_category')}
                </label>
                <select
                  value={formCategory}
                  onChange={e => setFormCategory(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 'var(--gs-radius-md)',
                    border: '1px solid var(--gs-border)',
                    background: 'var(--gs-bg-card)',
                    color: 'var(--gs-text-primary)',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                >
                  {CATEGORIES.filter(c => c !== 'All').map(cat => (
                    <option key={cat} value={cat}>
                      {t(`doc.cat_${cat.toLowerCase().replace(/\s+/g, '_')}`) || cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title & Quick suggestions */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px', color: 'var(--gs-text-primary)' }}>
                  {t('doc.field_title')}
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder={t('doc.field_title_placeholder')}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 'var(--gs-radius-md)',
                    border: '1px solid var(--gs-border)',
                    background: 'var(--gs-bg-card)',
                    color: 'var(--gs-text-primary)',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />

                {/* Quick suggestions pills */}
                {QUICK_TITLES[formCategory] && (
                  <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--gs-text-muted)', display: 'block', width: '100%' }}>
                      {t('doc.quick_select')}
                    </span>
                    {QUICK_TITLES[formCategory].map(item => (
                      <button
                        type="button"
                        key={item}
                        onClick={() => setFormTitle(item)}
                        style={{
                          background: 'var(--gs-bg-muted)',
                          border: '1px solid var(--gs-border-subtle)',
                          borderRadius: 'var(--gs-radius-sm)',
                          padding: '3px 8px',
                          fontSize: '11px',
                          color: 'var(--gs-text-secondary)',
                          cursor: 'pointer',
                        }}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* File Dropzone */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px', color: 'var(--gs-text-primary)' }}>
                  {t('doc.upload_new')}
                </label>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.dataTransfer.files?.[0]) handleFileChange(e.dataTransfer.files[0]);
                  }}
                  style={{
                    border: '2px dashed var(--gs-green-300)',
                    borderRadius: 'var(--gs-radius-lg)',
                    padding: '24px 16px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: selectedFile ? 'var(--gs-green-50)' : 'var(--gs-bg-muted)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                    onChange={e => e.target.files?.[0] && handleFileChange(e.target.files[0])}
                    style={{ display: 'none' }}
                  />

                  {selectedFile ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                      <CheckCircle2 size={24} color="var(--gs-green-600)" />
                      <div style={{ textAlign: 'left' }}>
                        <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--gs-text-primary)', margin: 0 }}>
                          {selectedFile.name}
                        </p>
                        <p style={{ fontSize: '12px', color: 'var(--gs-text-muted)', margin: '2px 0 0' }}>
                          {formatFileSize(selectedFile.size)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); setSelectedFile(null); }}
                        style={{ marginLeft: '12px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gs-text-muted)' }}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <Upload size={28} color="var(--gs-green-600)" style={{ margin: '0 auto 8px' }} />
                      <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gs-text-primary)', margin: 0 }}>
                        {t('doc.drag_drop_hint')}
                      </p>
                      <p style={{ fontSize: '11px', color: 'var(--gs-text-muted)', marginTop: '4px', margin: '4px 0 0' }}>
                        {t('doc.supported_formats')}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Remarks / Notes */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px', color: 'var(--gs-text-primary)' }}>
                  {t('doc.field_remarks')}
                </label>
                <input
                  type="text"
                  value={formRemarks}
                  onChange={e => setFormRemarks(e.target.value)}
                  placeholder={t('doc.field_remarks_placeholder')}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 'var(--gs-radius-md)',
                    border: '1px solid var(--gs-border)',
                    background: 'var(--gs-bg-card)',
                    color: 'var(--gs-text-primary)',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Form Error */}
              {formError && (
                <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--gs-radius-md)', color: '#991b1b', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={16} />
                  <span>{formError}</span>
                </div>
              )}

              {/* Progress bar */}
              {uploading && (
                <div style={{ width: '100%', height: '6px', background: 'var(--gs-border-subtle)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${uploadProgress}%`, height: '100%', background: 'var(--gs-green-500)', transition: 'width 0.2s ease' }} />
                </div>
              )}

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="gs-btn gs-btn-outline"
                  disabled={uploading}
                >
                  {t('doc.btn_cancel')}
                </button>

                <button
                  type="submit"
                  className="gs-btn gs-btn-primary"
                  disabled={uploading}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                  {uploading ? (
                    <>
                      <div className="gs-spinner gs-spinner-sm" />
                      <span>{t('doc.uploading')}</span>
                    </>
                  ) : (
                    <>
                      <Upload size={16} />
                      <span>{t('doc.btn_upload')}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── REPLACE MODAL ───────────────────────────────────────────────────────── */}
      {replaceModalDoc && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9990,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            backdropFilter: 'blur(3px)',
          }}
        >
          <div
            className="gs-card"
            style={{
              width: '100%',
              maxWidth: '460px',
              padding: '24px',
              borderRadius: 'var(--gs-radius-xl)',
              boxShadow: 'var(--gs-shadow-lg)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--gs-text-primary)' }}>
                {t('doc.replace_modal_title')}
              </h2>
              <button
                onClick={() => setReplaceModalDoc(null)}
                aria-label={t('doc.close_modal')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gs-text-muted)', minHeight: '36px', minWidth: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--gs-text-muted)', marginBottom: '16px' }}>
              {t('doc.replace_file_hint', { title: replaceModalDoc.title })}
            </p>

            <input
              ref={replaceFileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              onChange={e => {
                if (e.target.files?.[0]) handleReplaceSubmit(e.target.files[0]);
              }}
              style={{ display: 'none' }}
            />

            <div
              onClick={() => replaceFileInputRef.current?.click()}
              style={{
                border: '2px dashed var(--gs-green-300)',
                borderRadius: 'var(--gs-radius-lg)',
                padding: '32px 16px',
                textAlign: 'center',
                cursor: 'pointer',
                background: 'var(--gs-bg-muted)',
                marginBottom: '16px',
              }}
            >
              {uploading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <div className="gs-spinner" />
                  <span style={{ fontSize: '13px', color: 'var(--gs-text-muted)' }}>{t('doc.replacing')}</span>
                </div>
              ) : (
                <div>
                  <RefreshCw size={28} color="var(--gs-green-600)" style={{ margin: '0 auto 8px' }} />
                  <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gs-text-primary)', margin: 0 }}>
                    {t('doc.click_replace_file')}
                  </p>
                  <p style={{ fontSize: '11px', color: 'var(--gs-text-muted)', marginTop: '4px', margin: '4px 0 0' }}>
                    {t('doc.supported_formats')}
                  </p>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setReplaceModalDoc(null)}
                className="gs-btn gs-btn-outline"
                disabled={uploading}
              >
                {t('doc.btn_cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE MODAL ───────────────────────────────────────────────────────── */}
      {deleteModalDoc && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9990,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            backdropFilter: 'blur(3px)',
          }}
        >
          <div
            className="gs-card"
            style={{
              width: '100%',
              maxWidth: '440px',
              padding: '24px',
              borderRadius: 'var(--gs-radius-xl)',
              boxShadow: 'var(--gs-shadow-lg)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
                <Trash2 size={20} />
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--gs-text-primary)' }}>
                {t('doc.delete_modal_title')}
              </h2>
            </div>

            <p style={{ fontSize: '14px', color: 'var(--gs-text-secondary)', lineHeight: 1.5, marginBottom: '20px' }}>
              {t('doc.delete_confirm_text', { title: deleteModalDoc.title })}
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setDeleteModalDoc(null)}
                className="gs-btn gs-btn-outline"
              >
                {t('doc.btn_cancel')}
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="gs-btn"
                style={{ background: '#dc2626', color: '#fff', fontWeight: 700 }}
              >
                {t('doc.btn_delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PREVIEW MODAL ──────────────────────────────────────────────────────── */}
      {previewModalDoc && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9995,
            background: 'rgba(0,0,0,0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            className="gs-card"
            style={{
              width: '100%',
              maxWidth: '820px',
              height: '85vh',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 'var(--gs-radius-xl)',
              boxShadow: 'var(--gs-shadow-lg)',
              overflow: 'hidden',
              background: 'var(--gs-bg-card)',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '14px 20px',
                borderBottom: '1px solid var(--gs-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexShrink: 0,
              }}
            >
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: 'var(--gs-text-primary)' }}>
                  {previewModalDoc.title}
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--gs-text-muted)' }}>
                  {previewModalDoc.file_name}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  onClick={() => handleDownload(previewModalDoc)}
                  className="gs-btn gs-btn-primary gs-btn-sm"
                  aria-label={t('doc.action_download')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '12px', minHeight: '36px' }}
                >
                  <Download size={14} /> {t('doc.action_download')}
                </button>
                <button
                  onClick={closePreviewModal}
                  aria-label={t('doc.close_modal')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gs-text-muted)', minHeight: '36px', minWidth: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body / Viewer */}
            <div style={{ flex: 1, background: '#f8fafc', overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              {previewLoading ? (
                <div style={{ textAlign: 'center', color: 'var(--gs-text-muted)' }}>
                  <div className="gs-spinner" style={{ margin: '0 auto 12px', width: '32px', height: '32px' }} />
                  <p style={{ fontSize: '13px' }}>{t('doc.preview_loading')}</p>
                </div>
              ) : previewUrl ? (
                previewContentType && previewContentType.startsWith('image/') ? (
                  <img
                    src={previewUrl}
                    alt={previewModalDoc.title}
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', padding: '16px' }}
                  />
                ) : (
                  <object
                    data={previewUrl}
                    type="application/pdf"
                    style={{ width: '100%', height: '100%', border: 'none' }}
                  >
                    <iframe
                      src={previewUrl}
                      title={previewModalDoc.title}
                      style={{ width: '100%', height: '100%', border: 'none' }}
                    />
                  </object>
                )
              ) : (
                <div style={{ textAlign: 'center', padding: '24px' }}>
                  <p style={{ fontSize: '14px', color: 'var(--gs-text-muted)' }}>
                    {t('doc.preview_unsupported')}
                  </p>
                  <button
                    onClick={() => handleDownload(previewModalDoc)}
                    className="gs-btn gs-btn-primary gs-btn-sm"
                    style={{ marginTop: '12px' }}
                  >
                    <Download size={14} /> {t('doc.action_download')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
