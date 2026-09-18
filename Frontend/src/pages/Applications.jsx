import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronRight, Clock, Check, FileText, Eye, Plus, Landmark } from 'lucide-react';
import { useT } from '../locales/index.js';
import { APPLICATIONS } from '../data/mockData';

const STATUS_CONFIG = {
  'Draft':        { bg: '#F4EBDD', text: '#5F665F', dot: '#8C9B90' },
  'Submitted':    { bg: '#EBF3FE', text: '#1D4ED8', dot: '#3B82F6' },
  'Under Review': { bg: '#FEF3C7', text: '#B45309', dot: '#F59E0B' },
  'Approved':     { bg: '#E7F0DE', text: '#214A32', dot: '#355E3B' },
  'Disbursed':    { bg: '#E7F0DE', text: '#214A32', dot: '#355E3B' },
  'Rejected':     { bg: '#FEE2E2', text: '#991B1B', dot: '#EF4444' },
};

function ApplicationCard({ app }) {
  const navigate = useNavigate();
  const t = useT();
  const sc = STATUS_CONFIG[app.status] || STATUS_CONFIG['Draft'];

  const getStatusLabel = status => {
    const key = status.toLowerCase().replace(/\s+/g, '_');
    return t(`app.status_${key}`) || status;
  };

  const getStepLabel = step => {
    const map = {
      'Draft': t('app.step_draft') || 'Draft',
      'Submitted': t('app.step_submitted') || 'Submitted',
      'Under Review': t('app.step_review') || 'Under Review',
      'Approved': t('app.step_approved') || 'Approved',
      'Disbursed': t('app.step_disbursed') || 'Disbursed',
    };
    return map[step] || step;
  };

  return (
    <div className="bg-white border border-[#DED8CA] rounded-2xl p-6 shadow-xs hover:border-[#355E3B] transition mb-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h3 className="text-lg font-bold text-[#24302A] tracking-tight mb-0.5">
            {app.business}
          </h3>
          <p className="text-xs sm:text-sm font-medium text-[#5F665F]">
            {app.scheme} · <span className="font-bold text-[#24302A]">{app.amount}</span>
          </p>
        </div>
        <span
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold shrink-0 self-start sm:self-center"
          style={{ background: sc.bg, color: sc.text }}
        >
          <span className="w-2 h-2 rounded-full" style={{ background: sc.dot }} />
          {getStatusLabel(app.status)}
        </span>
      </div>

      {/* Progress Timeline */}
      <div className="relative mb-6 overflow-x-auto pb-2 scrollbar-none">
        <div className="flex items-start justify-between relative min-w-[320px]">
          {/* Connector Track behind step circles, centered at top-[14px] */}
          <div className="absolute top-[14px] left-[18px] right-[18px] h-0.5 -translate-y-1/2 bg-[#DED8CA] z-0">
            <div
              className="h-full bg-[#355E3B] transition-all duration-300"
              style={{
                width: `${(Math.min(app.currentStep, app.steps.length - 1) / Math.max(1, app.steps.length - 1)) * 100}%`
              }}
            />
          </div>

          {app.steps.map((s, i) => {
            const isDone = i < app.currentStep;
            const isCurrent = i === app.currentStep;
            return (
              <div key={s} className="flex flex-col items-center gap-1.5 z-10 shrink-0 px-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all border-2 ${
                    isDone
                      ? 'bg-[#355E3B] border-[#355E3B] text-white'
                      : isCurrent
                      ? 'bg-[#C96B3B] border-[#C96B3B] text-white ring-4 ring-[#C96B3B]/20'
                      : 'bg-white border-[#DED8CA] text-[#8C9B90]'
                  }`}
                >
                  {isDone ? <Check size={13} strokeWidth={2.5} /> : i + 1}
                </div>
                <span
                  className={`text-[10px] font-semibold whitespace-nowrap text-center ${
                    isCurrent
                      ? 'text-[#C96B3B]'
                      : isDone
                      ? 'text-[#24302A]'
                      : 'text-[#8C9B90]'
                  }`}
                >
                  {getStepLabel(s)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-[#DED8CA]/60">
        <div className="flex items-center gap-2 text-xs text-[#5F665F]">
          <span className="flex items-center gap-1.5">
            <Clock size={13} className="text-[#8C9B90]" />
            {t('app.submitted_on') || 'Submitted'}: {app.date}
          </span>
          <span className="opacity-40">·</span>
          <span className="font-mono text-[11px] font-semibold text-[#8C9B90]">{app.id}</span>
        </div>
        <button
          className="flex items-center gap-1.5 text-xs font-bold text-[#355E3B] hover:text-[#214A32] bg-[#E7F0DE] hover:bg-[#D9E9CB] px-3.5 py-1.5 rounded-xl transition cursor-pointer border-0"
          onClick={() => navigate('/applications/detail')}
        >
          <Eye size={14} />
          <span>{t('app.view') || 'View Details'}</span>
        </button>
      </div>
    </div>
  );
}

export default function Applications() {
  const navigate = useNavigate();
  const t = useT();
  const [tab, setTab] = useState('all');

  const tabs = [
    { id: 'all', label: t('app.tab_all') || 'All Applications' },
    { id: 'active', label: t('app.tab_active') || 'Active' },
    { id: 'approved', label: t('app.tab_approved') || 'Approved' },
    { id: 'draft', label: t('app.tab_draft') || 'Drafts' },
  ];

  const filteredApps = APPLICATIONS.filter(a => {
    if (tab === 'all') return true;
    if (tab === 'active') return a.status === 'Submitted' || a.status === 'Under Review';
    if (tab === 'approved') return a.status === 'Approved' || a.status === 'Disbursed';
    if (tab === 'draft') return a.status === 'Draft';
    return true;
  });

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-8 lg:py-12">
      {/* Breadcrumb */}
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
        <span className="text-[#355E3B] font-semibold">{t('app.title') || 'Applications'}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <span className="inline-block text-xs font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full bg-[#E7F0DE] text-[#355E3B] mb-2.5">
            {t('app.badge') || 'Tracking & Status'}
          </span>
          <h1 className="text-3xl lg:text-4xl font-bold text-[#24302A] tracking-tight">
            {t('app.title') || 'My Applications'}
          </h1>
          <p className="text-sm sm:text-base text-[#5F665F] mt-1.5 max-w-2xl">
            {t('app.subtitle') || 'Track loan, grant, and scheme application progress across banking partners.'}
          </p>
        </div>
        <button
          onClick={() => navigate('/applications/new')}
          className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white bg-[#355E3B] hover:bg-[#214A32] shadow-xs hover:shadow-md transition cursor-pointer border-0 shrink-0 self-start sm:self-center"
        >
          <Plus size={16} />
          <span>{t('app.new_btn') || 'New Application'}</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 mb-6 scrollbar-none">
        {tabs.map(tTab => (
          <button
            key={tTab.id}
            onClick={() => setTab(tTab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer border-0 ${
              tab === tTab.id
                ? 'bg-[#355E3B] text-white shadow-xs'
                : 'bg-white text-[#5F665F] border border-[#DED8CA] hover:bg-[#F4EBDD]'
            }`}
          >
            {tTab.label}
          </button>
        ))}
      </div>

      {/* Applications List */}
      <div>
        {filteredApps.length > 0 ? (
          filteredApps.map(a => <ApplicationCard key={a.id} app={a} />)
        ) : (
          /* Empty state */
          <div className="bg-white border border-[#DED8CA] rounded-2xl p-12 text-center shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-[#F4EBDD] flex items-center justify-center text-[#355E3B] mx-auto mb-4">
              <FileText size={28} />
            </div>
            <h3 className="text-lg font-bold text-[#24302A] mb-1">
              {t('app.empty_title', { tab }) || `No ${tab} applications found`}
            </h3>
            <p className="text-xs sm:text-sm text-[#5F665F] max-w-md mx-auto mb-6 leading-relaxed">
              {t('app.empty_desc') || 'You do not have any applications matching this filter. Start a new assessment or apply for a scheme to begin.'}
            </p>
            <button
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-[#355E3B] hover:bg-[#214A32] transition cursor-pointer border-0"
              onClick={() => navigate('/business/assessment')}
            >
              <span>{t('app.start_assessment') || 'Start Business Assessment'}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Apply Banner Callout */}
      <div className="mt-8">
        <div
          onClick={() => navigate('/applications/new')}
          className="p-6 rounded-2xl border border-[#DED8CA] bg-white hover:border-[#355E3B] hover:shadow-xs transition cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#E7F0DE] flex items-center justify-center text-2xl shrink-0 group-hover:scale-105 transition-transform">
              🏛️
            </div>
            <div>
              <h3 className="text-base font-bold text-[#24302A] group-hover:text-[#355E3B] transition">
                {t('app.apply_mudra_title') || 'Ready to apply for Pradhan Mantri Mudra Yojana?'}
              </h3>
              <p className="text-xs text-[#5F665F] mt-0.5">
                {t('app.apply_mudra_sub') || 'Submit your verified credentials and bank-ready DPR directly to participating banks.'}
              </p>
            </div>
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-[#C96B3B] hover:opacity-90 transition cursor-pointer border-0 shrink-0 self-end sm:self-center">
            <span>Apply Now</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
