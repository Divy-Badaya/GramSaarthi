import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import AppShell from './components/layout/AppShell';
import { useT } from './locales/index.js';
import { useApp } from './context/AppContext';

// Pages
import Home              from './pages/Home';
import Business          from './pages/Business';
import BusinessAssessment from './pages/BusinessAssessment';
import BusinessAnalysis  from './pages/BusinessAnalysis';
import BusinessIdeas     from './pages/BusinessIdeas';
import BusinessCompare   from './pages/BusinessCompare';
import AIAdvisor         from './pages/AIAdvisor';
import Finance           from './pages/Finance';
import LoanEligibility   from './pages/LoanEligibility';
import FinanceCalculator from './pages/FinanceCalculator';
import WhatIfSimulation  from './pages/WhatIfSimulation';
import Schemes           from './pages/Schemes';
import DPR               from './pages/DPR';
import Applications      from './pages/Applications';
import Documents         from './pages/Documents';
import AdminDocuments    from './pages/AdminDocuments';
import AdminDashboard    from './pages/AdminDashboard';
import AdminUsers        from './pages/AdminUsers';
import AdminActivity     from './pages/AdminActivity';
import Profile           from './pages/Profile';
import Help              from './pages/Help';
import Login             from './pages/Login';
import Signup            from './pages/Signup';
import ProtectedRoute    from './components/auth/ProtectedRoute';

function NotFound() {
  const t = useT();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: '40px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: '64px', marginBottom: '16px' }}>🌾</div>
      <p style={{ fontSize: '24px', fontWeight: 800, color: 'var(--gs-text-primary)', marginBottom: '8px' }}>{t('not_found.title')}</p>
      <p style={{ fontSize: '15px', color: 'var(--gs-text-muted)', marginBottom: '24px' }}>{t('not_found.desc')}</p>
      <a href="/" style={{ background: 'var(--gs-green-500)', color: '#fff', padding: '12px 24px', borderRadius: 'var(--gs-radius-md)', fontWeight: 700, fontSize: '15px', display: 'inline-block' }}>
        {t('not_found.go_home')}
      </a>
    </div>
  );
}

// New Application stub
function NewApplication() {
  const t = useT();
  const { assessment, finance } = useApp();
  return (
    <div style={{ maxWidth: '560px', margin: '0 auto', padding: '40px 20px', textAlign: 'center' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏦</div>
      <p style={{ fontSize: '22px', fontWeight: 800, color: 'var(--gs-text-primary)', marginBottom: '8px' }}>{t('new_app.title')}</p>
      <p style={{ fontSize: '14px', color: 'var(--gs-text-muted)', marginBottom: '24px' }}>{t('new_app.desc')}</p>
      <div className="gs-card" style={{ padding: '20px', textAlign: 'left', marginBottom: '20px' }}>
        {[
          { label: t('new_app.label_business'), value: assessment?.business || 'Dairy Farm – Khajuri Kalan' },
          { label: t('new_app.label_scheme'), value: finance?.scheme || 'PM Mudra Yojana – Tarun' },
          { label: t('new_app.label_loan'), value: '₹9,00,000' },
          { label: t('new_app.label_dpr'), value: '72% Complete' },
          { label: t('new_app.label_docs'), value: '4/6 Verified' },
        ].map(({ label, value }) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--gs-border-subtle)' }}>
            <span style={{ fontSize: '13px', color: 'var(--gs-text-muted)' }}>{label}</span>
            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--gs-text-primary)' }}>{value}</span>
          </div>
        ))}
      </div>
      <button style={{ width: '100%', background: 'var(--gs-green-500)', color: '#fff', padding: '14px', borderRadius: 'var(--gs-radius-lg)', fontWeight: 700, fontSize: '16px', border: 'none', cursor: 'pointer', marginBottom: '10px' }}>
        {t('new_app.submit_btn')}
      </button>
      <button style={{ width: '100%', background: 'var(--gs-bg-muted)', color: 'var(--gs-text-secondary)', padding: '12px', borderRadius: 'var(--gs-radius-lg)', fontWeight: 600, fontSize: '14px', border: '1px solid var(--gs-border)', cursor: 'pointer' }}>
        {t('new_app.complete_dpr')}
      </button>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppShell>
          <Routes>
            {/* Public Authentication Routes */}
            <Route path="/login"               element={<Login />} />
            <Route path="/signup"              element={<Signup />} />

            {/* Home: dual-mode landing for visitors, personalized dashboard for logged in users */}
            <Route path="/"                    element={<Home />} />
            <Route path="/home"                element={<Home />} />

            {/* Business */}
            <Route path="/business"            element={<ProtectedRoute><Business /></ProtectedRoute>} />
            <Route path="/business/assessment" element={<ProtectedRoute><BusinessAssessment /></ProtectedRoute>} />
            <Route path="/assessment"          element={<ProtectedRoute><BusinessAssessment /></ProtectedRoute>} />
            <Route path="/business/analysis"   element={<ProtectedRoute><BusinessAnalysis /></ProtectedRoute>} />
            <Route path="/assessment/analysis" element={<ProtectedRoute><BusinessAnalysis /></ProtectedRoute>} />
            <Route path="/business/ideas"      element={<ProtectedRoute><BusinessIdeas /></ProtectedRoute>} />
            <Route path="/business/compare"    element={<ProtectedRoute><BusinessCompare /></ProtectedRoute>} />

            {/* AI Advisor */}
            <Route path="/ai-advisor"          element={<ProtectedRoute><AIAdvisor /></ProtectedRoute>} />

            {/* Finance */}
            <Route path="/finance"             element={<ProtectedRoute><Finance /></ProtectedRoute>} />
            <Route path="/finance/loan"        element={<ProtectedRoute><LoanEligibility /></ProtectedRoute>} />
            <Route path="/finance/calculator"  element={<ProtectedRoute><FinanceCalculator /></ProtectedRoute>} />
            <Route path="/finance/simulation"  element={<ProtectedRoute><WhatIfSimulation /></ProtectedRoute>} />

            {/* Schemes & DPR */}
            <Route path="/schemes"             element={<ProtectedRoute><Schemes /></ProtectedRoute>} />
            <Route path="/dpr"                 element={<ProtectedRoute><DPR /></ProtectedRoute>} />

            {/* Applications */}
            <Route path="/applications"        element={<ProtectedRoute><Applications /></ProtectedRoute>} />
            <Route path="/applications/new"    element={<ProtectedRoute><NewApplication /></ProtectedRoute>} />

            {/* Profile & docs */}
            <Route path="/documents"           element={<ProtectedRoute><Documents /></ProtectedRoute>} />
            <Route path="/profile"             element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/help"                element={<Help />} />

            {/* Admin Control Panel Routes */}
            <Route path="/admin"               element={<ProtectedRoute requireAdmin={true}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/dashboard"     element={<ProtectedRoute requireAdmin={true}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/users"         element={<ProtectedRoute requireAdmin={true}><AdminUsers /></ProtectedRoute>} />
            <Route path="/admin/documents"     element={<ProtectedRoute requireAdmin={true}><AdminDocuments /></ProtectedRoute>} />
            <Route path="/admin/activity"      element={<ProtectedRoute requireAdmin={true}><AdminActivity /></ProtectedRoute>} />

            {/* Fallback */}
            <Route path="*"                    element={<NotFound />} />
          </Routes>
        </AppShell>
      </AppProvider>
    </BrowserRouter>
  );
}
