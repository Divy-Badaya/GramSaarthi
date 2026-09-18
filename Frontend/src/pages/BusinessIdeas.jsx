import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BUSINESS_IDEAS } from '../data/mockData';
import { filterBusinessIdeas, getRecommendations } from '../services/recommendationService.js';
import { isApiEnabled } from '../services/api.js';
import BusinessCard from '../components/business/BusinessCard.jsx';
import { useT } from '../locales/index.js';
import { useApp } from '../context/AppContext';
import { Search, Filter, Sparkles } from 'lucide-react';

export default function BusinessIdeas() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialCategory = searchParams.get('category') || 'All';

  const t = useT();
  const { assessment, user } = useApp();
  const [filter, setFilter] = useState(initialCategory !== 'All' ? 'All' : 'All');
  const [searchQuery, setSearchQuery] = useState('');
  const [ideas, setIdeas] = useState(BUSINESS_IDEAS);

  const locStr = [assessment?.location?.village || user?.village, assessment?.location?.district || user?.district].filter(Boolean).join(', ') || t('ideas.your_area');

  const FILTERS = [
    { key: 'All', label: t('ideas.filter.all') || 'All Ideas' },
    { key: 'Low Investment', label: t('ideas.filter.low_inv') || 'Low Investment' },
    { key: 'High Demand', label: t('ideas.filter.high_demand') || 'High Demand' },
    { key: 'Low Risk', label: t('ideas.filter.low_risk') || 'Low Risk' },
    { key: 'High Profit', label: t('ideas.filter.high_profit') || 'High Profit' },
  ];

  useEffect(() => {
    if (isApiEnabled) {
      getRecommendations()
        .then(data => {
          if (data && Array.isArray(data) && data.length > 0) {
            setIdeas(data);
          }
        })
        .catch(err => {
          console.warn('[GRAMSAARTHI] Failed to load business ideas from backend:', err);
        });
    }
  }, []);

  const filteredByTag = filterBusinessIdeas(ideas, filter);
  const displayed = filteredByTag.filter(biz => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (biz.title || biz.name || '').toLowerCase().includes(q) ||
      (biz.category || '').toLowerCase().includes(q) ||
      (biz.description || '').toLowerCase().includes(q)
    );
  });

  const topId = [...ideas].sort((a, b) => b.score - a.score)[0]?.id;

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-10 lg:py-14">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs font-medium text-[#8C9B90] mb-6">
        <button onClick={() => navigate('/')} className="hover:text-[#355E3B] transition cursor-pointer">
          {t('nav.home') || 'Home'}
        </button>
        <span>/</span>
        <button onClick={() => navigate('/business')} className="hover:text-[#355E3B] transition cursor-pointer">
          {t('nav.discover') || 'Discover'}
        </button>
        <span>/</span>
        <span className="text-[#24302A] font-semibold">{t('ideas.title') || 'Business Ideas'}</span>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <span className="inline-block text-xs font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full bg-[#E7F0DE] text-[#355E3B] mb-3">
          450+ Business Ideas
        </span>
        <h1 className="text-3xl lg:text-4xl font-bold text-[#24302A] tracking-tight">
          {t('ideas.title') || 'Explore Small Business Opportunities'}
        </h1>
        <p className="text-base text-[#5F665F] mt-2 max-w-2xl leading-relaxed">
          {t('ideas.subtitle', { location: locStr }) || `Curated opportunities tailored for ${locStr}.`}
        </p>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-8 bg-white p-4 rounded-2xl border border-[#DED8CA] shadow-xs">
        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {FILTERS.map(f => (
            <button
              key={f.key}
              id={`ideas-filter-${f.key.toLowerCase().replace(/\s+/g, '-')}`}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                filter === f.key
                  ? 'bg-[#355E3B] text-white shadow-xs'
                  : 'bg-[#F4EBDD] text-[#5F665F] hover:bg-[#EAE4D6]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search businesses..."
            className="w-full bg-[#FFF9F0] border border-[#DED8CA] rounded-xl px-3.5 py-2 pl-9 text-xs text-[#24302A] placeholder-[#8C9B90] focus:outline-none focus:border-[#355E3B]"
          />
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8C9B90]" />
        </div>
      </div>

      {/* Results summary */}
      <div className="flex justify-between items-center mb-6">
        <p className="text-xs font-bold text-[#5F665F]">
          Showing {displayed.length} businesses
        </p>
      </div>

      {/* Ideas Grid */}
      {displayed.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-[#DED8CA] bg-white">
          <div className="text-4xl mb-3">🔍</div>
          <h3 className="text-lg font-bold text-[#24302A] mb-1">{t('ideas.no_matches') || 'No businesses found'}</h3>
          <p className="text-xs text-[#5F665F]">{t('ideas.no_matches_sub') || 'Try adjusting your search query or filter tags.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayed.map(biz => (
            <BusinessCard
              key={biz.id}
              business={biz}
              highlighted={biz.id === topId && filter === 'All' && !searchQuery}
              onAnalyze={() => navigate('/business/analysis')}
              onCompare={() => navigate('/business/compare', { state: { business: biz.id } })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
