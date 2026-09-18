import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Navigation, ChevronRight, ChevronLeft, Check, ArrowRight, Sparkles, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { STATES, DISTRICTS, BLOCKS, VILLAGES, BUSINESS_CATEGORIES, DEMO_ASSESSMENT } from '../data/mockData';
import { saveAssessment, analyzeAssessment } from '../services/recommendationService.js';
import { isApiEnabled } from '../services/api.js';
import { useT, useBusinessLabel } from '../locales/index.js';

// ── Progress Stepper ──────────────────────────────────────────────────────────
function Stepper({ step, t }) {
  const keys = ['assessment.step.location', 'assessment.step.financial', 'assessment.step.skills', 'assessment.step.business'];
  return (
    <div className="p-6 pb-4 border-b border-[#DED8CA]/70 bg-[#FFF9F0]/40">
      <div className="flex items-center justify-between">
        {keys.map((key, i) => (
          <React.Fragment key={key}>
            <div className="flex flex-col items-center gap-1.5 flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition ${
                  i < step
                    ? 'bg-[#355E3B] text-white shadow-2xs'
                    : i === step
                    ? 'bg-[#C96B3B] text-white shadow-xs ring-4 ring-[#C96B3B]/20'
                    : 'bg-[#FFF9F0] border border-[#DED8CA] text-[#8C9B90]'
                }`}
              >
                {i < step ? <Check size={14} /> : i + 1}
              </div>
              <span
                className={`text-[11px] font-semibold whitespace-nowrap text-center ${
                  i === step ? 'text-[#C96B3B]' : i < step ? 'text-[#355E3B]' : 'text-[#8C9B90]'
                }`}
              >
                {t(key)}
              </span>
            </div>
            {i < keys.length - 1 && (
              <div
                className={`h-0.5 flex-1 -mt-4 transition-colors ${
                  i < step ? 'bg-[#355E3B]' : 'bg-[#DED8CA]'
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ── Step 1: Location ──────────────────────────────────────────────────────────
function StepLocation({ data, setData, onNext, t }) {
  const [gpsState, setGpsState] = useState('idle'); // idle | loading | success | error | denied
  const [gpsError, setGpsError] = useState('');
  const [manualDistrict, setManualDistrict] = useState(false);
  const [manualBlock, setManualBlock] = useState(false);
  const [manualVillage, setManualVillage] = useState(false);

  const handleGPS = () => {
    if (!navigator.geolocation) {
      setGpsError(t('assessment.location.gps_error'));
      setGpsState('error');
      return;
    }
    setGpsState('loading');
    setGpsError('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=en`;
          const resp = await fetch(url, { headers: { 'Accept-Language': 'en' } });
          if (!resp.ok) throw new Error('Geocode failed');
          const geo = await resp.json();
          const addr = geo.address || {};
          const detectedState = addr.state || '';
          let detectedDistrict = addr.state_district || addr.county || addr.district || addr.city || '';
          detectedDistrict = detectedDistrict.replace(/\s+district$/i, '').trim();

          const detectedBlock = addr.taluka || addr.tehsil || addr.subdistrict || addr.suburb || addr.city_block || addr.block || '';
          const detectedVillage = addr.village || addr.hamlet || addr.town || addr.suburb || addr.neighbourhood || addr.city || '';

          const finalState = STATES.find(s => s.toLowerCase() === detectedState.toLowerCase()) || detectedState;
          const distKey = Object.keys(DISTRICTS).find(k => k.toLowerCase() === finalState.toLowerCase());
          const distList = distKey ? DISTRICTS[distKey] : [];
          const finalDistrict = distList.find(d => d.toLowerCase() === detectedDistrict.toLowerCase()) || detectedDistrict;

          const blkKey = Object.keys(BLOCKS).find(k => k.toLowerCase() === finalDistrict.toLowerCase());
          const blkList = blkKey ? BLOCKS[blkKey] : [];
          const finalBlock = blkList.find(b => b.toLowerCase() === detectedBlock.toLowerCase()) || detectedBlock;

          setData(d => ({
            ...d,
            state: finalState || d.state,
            district: finalDistrict || d.district,
            block: finalBlock || d.block,
            village: detectedVillage || d.village,
          }));
          setGpsState('success');
        } catch {
          setGpsError(t('assessment.location.gps_error'));
          setGpsState('error');
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGpsError(t('assessment.location.gps_denied'));
          setGpsState('denied');
        } else {
          setGpsError(t('assessment.location.gps_error'));
          setGpsState('error');
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Case-insensitive lookup helpers for dictionary keys
  const findKeyInsensitive = (obj, target) => {
    if (!target) return null;
    const clean = String(target).trim().toLowerCase();
    return Object.keys(obj).find(k => k.toLowerCase() === clean) || null;
  };

  const matchedState = STATES.find(s => s.toLowerCase() === (data.state || '').trim().toLowerCase()) || data.state;
  const stateOptions = Array.from(new Set([...STATES, ...(data.state ? [data.state, matchedState].filter(Boolean) : [])]));

  const districtKey = findKeyInsensitive(DISTRICTS, matchedState || data.state);
  const districtList = districtKey ? DISTRICTS[districtKey] : [];
  const matchedDistrict = districtList.find(d => d.toLowerCase() === (data.district || '').trim().toLowerCase()) || data.district;
  const districtOptions = Array.from(new Set([...districtList, ...(data.district ? [data.district, matchedDistrict].filter(Boolean) : [])]));

  const blockKey = findKeyInsensitive(BLOCKS, matchedDistrict || data.district);
  const blockList = blockKey ? BLOCKS[blockKey] : [];
  const matchedBlock = blockList.find(b => b.toLowerCase() === (data.block || '').trim().toLowerCase()) || data.block;
  const blockOptions = Array.from(new Set([...blockList, ...(data.block ? [data.block, matchedBlock].filter(Boolean) : [])]));

  const villageKey = findKeyInsensitive(VILLAGES, matchedBlock || data.block);
  const villageList = villageKey ? VILLAGES[villageKey] : [];
  const matchedVillage = villageList.find(v => v.toLowerCase() === (data.village || '').trim().toLowerCase()) || data.village;
  const villageOptions = Array.from(new Set([...villageList, ...(data.village ? [data.village, matchedVillage].filter(Boolean) : [])]));

  // State & District are the required geographic boundaries for ML & scheme evaluation; Block & Village are local refinements
  const canContinue = Boolean(data.state && data.district);
  const isLoading = gpsState === 'loading';

  return (
    <div className="gs-animate-fade-up">
      <div style={{ padding: '24px 20px 12px' }}>
        <p className="gs-page-title">{t('assessment.location.title')}</p>
        <p className="gs-page-subtitle">{t('assessment.location.subtitle')}</p>
      </div>

      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* GPS button */}
        <button onClick={handleGPS} disabled={isLoading} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: gpsState === 'success' ? 'var(--gs-green-50)' : 'var(--gs-bg-card)', border: '2px solid', borderColor: gpsState === 'success' ? 'var(--gs-green-400)' : gpsState === 'error' || gpsState === 'denied' ? 'var(--gs-amber-300)' : 'var(--gs-border)', borderRadius: 'var(--gs-radius-xl)', cursor: isLoading ? 'not-allowed' : 'pointer', transition: 'all 0.2s ease', width: '100%', textAlign: 'left' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: 'var(--gs-radius-lg)', background: gpsState === 'success' ? 'var(--gs-green-500)' : isLoading ? 'var(--gs-green-500)' : 'var(--gs-blue-50)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isLoading
              ? <div className="gs-spinner" style={{ width: '20px', height: '20px', borderWidth: '2px', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
              : gpsState === 'success'
                ? <Check size={20} color="#fff" />
                : <Navigation size={20} color="var(--gs-blue-600)" />
            }
          </div>
          <div>
            <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--gs-text-primary)' }}>
              {isLoading ? t('assessment.location.gps_detecting') : t('assessment.location.gps_button')}
            </p>
            <p style={{ fontSize: '12px', color: 'var(--gs-text-muted)', marginTop: '2px' }}>
              {t('assessment.location.gps_subtitle')}
            </p>
          </div>
          {gpsState === 'success' && !isLoading && <Check size={18} color="var(--gs-green-500)" style={{ marginLeft: 'auto' }} />}
        </button>

        {(gpsState === 'error' || gpsState === 'denied') && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'var(--gs-amber-50)', border: '1px solid var(--gs-amber-200)', borderRadius: 'var(--gs-radius-md)' }}>
            <AlertCircle size={16} color="var(--gs-amber-500)" />
            <p style={{ fontSize: '12px', color: 'var(--gs-amber-700)', fontWeight: 600 }}>{gpsError}</p>
          </div>
        )}

        {/* Or divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--gs-border)' }} />
          <span style={{ fontSize: '12px', color: 'var(--gs-text-muted)', fontWeight: 600 }}>{t('assessment.location.or_manual')}</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--gs-border)' }} />
        </div>

        {/* State */}
        <div>
          <label className="gs-label">{t('assessment.location.state')}</label>
          <select className="gs-select" value={matchedState || data.state} onChange={e => setData(d => ({ ...d, state: e.target.value, district: '', block: '', village: '' }))}>
            <option value="">{t('assessment.location.select_state')}</option>
            {stateOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* District */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="gs-label">{t('assessment.location.district')}</label>
            {districtList.length > 0 && (
              <button
                type="button"
                onClick={() => setManualDistrict(m => !m)}
                style={{ fontSize: '11px', color: 'var(--gs-orange-dark)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 4px' }}
              >
                {manualDistrict ? t('assessment.location.pick_from_list') : t('assessment.location.edit_type')}
              </button>
            )}
          </div>
          {manualDistrict || districtList.length === 0 ? (
            <input
              className="gs-input"
              value={data.district}
              onChange={e => setData(d => ({ ...d, district: e.target.value, block: '', village: '' }))}
              placeholder={t('assessment.location.district')}
            />
          ) : (
            <select className="gs-select" value={matchedDistrict || data.district} onChange={e => setData(d => ({ ...d, district: e.target.value, block: '', village: '' }))} disabled={!data.state}>
              <option value="">{t('assessment.location.select_district')}</option>
              {districtOptions.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          )}
        </div>

        {/* Block */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="gs-label">{t('assessment.location.block')}</label>
            {blockList.length > 0 && (
              <button
                type="button"
                onClick={() => setManualBlock(m => !m)}
                style={{ fontSize: '11px', color: 'var(--gs-orange-dark)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 4px' }}
              >
                {manualBlock ? t('assessment.location.pick_from_list') : t('assessment.location.edit_type')}
              </button>
            )}
          </div>
          {manualBlock || blockList.length === 0 ? (
            <input
              className="gs-input"
              value={data.block}
              onChange={e => setData(d => ({ ...d, block: e.target.value }))}
              placeholder={t('assessment.location.block')}
            />
          ) : (
            <select className="gs-select" value={matchedBlock || data.block} onChange={e => setData(d => ({ ...d, block: e.target.value }))} disabled={!data.district}>
              <option value="">{t('assessment.location.select_block')}</option>
              {blockOptions.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          )}
        </div>

        {/* Village */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="gs-label">{t('assessment.location.village')}</label>
            {villageList.length > 0 && (
              <button
                type="button"
                onClick={() => setManualVillage(m => !m)}
                style={{ fontSize: '11px', color: 'var(--gs-orange-dark)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 4px' }}
              >
                {manualVillage ? t('assessment.location.pick_from_list') : t('assessment.location.edit_type')}
              </button>
            )}
          </div>
          {manualVillage || villageList.length === 0 ? (
            <input
              className="gs-input"
              value={data.village}
              onChange={e => setData(d => ({ ...d, village: e.target.value }))}
              placeholder={t('assessment.location.village')}
            />
          ) : (
            <select className="gs-select" value={matchedVillage || data.village} onChange={e => setData(d => ({ ...d, village: e.target.value }))} disabled={!data.block && blockList.length > 0}>
              <option value="">{t('assessment.location.select_village')}</option>
              {villageOptions.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          )}
        </div>

        {/* Location preview */}
        {canContinue && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', background: 'var(--gs-green-50)', border: '1.5px solid var(--gs-green-200)', borderRadius: 'var(--gs-radius-lg)', animation: 'gs-fade-in 0.3s ease' }}>
            <MapPin size={18} color="var(--gs-green-500)" />
            <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--gs-green-700)' }}>
              {[data.village, data.block, matchedDistrict || data.district, matchedState || data.state].filter(Boolean).join(', ')}
            </p>
          </div>
        )}

        <button className="gs-btn gs-btn-primary gs-btn-full gs-btn-lg" onClick={onNext} disabled={!canContinue} style={{ marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          {t('common.continue')} <ArrowRight size={18} />
        </button>
        <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--gs-text-muted)', paddingBottom: '24px' }}>{t('common.step_of', { current: 1, total: 4 })} · {t('common.private_note')}</p>
      </div>
    </div>
  );
}

// ── Step 2: Financial Profile ─────────────────────────────────────────────────
function StepFinancial({ data, setData, onNext, onBack, t }) {
  const presets = [50000, 100000, 200000, 500000];
  const fmt = (v) => {
    if (v >= 100000) return `₹${(v / 100000).toFixed(v % 100000 === 0 ? 0 : 1)}L`;
    if (v >= 1000)   return `₹${(v / 1000).toFixed(0)}K`;
    return `₹${v}`;
  };
  const loanEst = data.capital ? data.capital * 9 : 0;
  const projectEst = data.capital ? data.capital * 10 : 0;

  const loanOptions = [
    { key: 'Yes',      label: t('assessment.financial.loan_yes') },
    { key: 'No',       label: t('assessment.financial.loan_no') },
    { key: 'Not sure', label: t('assessment.financial.loan_not_sure') },
  ];

  return (
    <div className="gs-animate-fade-up">
      <div style={{ padding: '24px 20px 12px' }}>
        <p className="gs-page-title">{t('assessment.financial.title')}</p>
        <p className="gs-page-subtitle">{t('assessment.financial.subtitle')}</p>
      </div>

      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Amount input */}
        <div>
          <label className="gs-label">{t('assessment.financial.capital_label')}</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '18px', fontWeight: 700, color: 'var(--gs-text-secondary)', zIndex: 1 }}>₹</span>
            <input
              type="number"
              className="gs-input"
              style={{ paddingLeft: '36px', fontSize: '22px', fontWeight: 800, height: '60px' }}
              value={data.capital || ''}
              onChange={e => setData(d => ({ ...d, capital: parseInt(e.target.value) || 0 }))}
              placeholder="1,00,000"
              min={10000}
            />
          </div>
          {data.capital > 0 && (
            <p style={{ fontSize: '13px', color: 'var(--gs-green-600)', fontWeight: 600, marginTop: '6px' }}>
              ✓ {fmt(data.capital)} {t('assessment.financial.selected')}
            </p>
          )}
        </div>

        {/* Preset amounts */}
        <div>
          <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gs-text-muted)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t('assessment.financial.quick_select')}</p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {presets.map(p => (
              <button key={p} className={`gs-chip ${data.capital === p ? 'selected' : ''}`} onClick={() => setData(d => ({ ...d, capital: p }))}>{fmt(p)}</button>
            ))}
          </div>
        </div>

        {/* Funding preview */}
        {data.capital > 0 && (
          <div style={{ background: 'var(--gs-bg-muted)', borderRadius: 'var(--gs-radius-xl)', padding: '20px', animation: 'gs-fade-in 0.3s ease' }}>
            <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gs-text-secondary)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('assessment.financial.funding_title')}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, textAlign: 'center', padding: '12px', background: 'var(--gs-bg-card)', borderRadius: 'var(--gs-radius-lg)', border: '1px solid var(--gs-border)' }}>
                <p style={{ fontSize: '11px', color: 'var(--gs-text-muted)', fontWeight: 600, marginBottom: '4px' }}>{t('assessment.financial.your_contribution')}</p>
                <p style={{ fontSize: '18px', fontWeight: 800, color: 'var(--gs-green-600)' }}>{fmt(data.capital)}</p>
              </div>
              <span style={{ fontSize: '20px', color: 'var(--gs-text-muted)' }}>+</span>
              <div style={{ flex: 1, textAlign: 'center', padding: '12px', background: 'var(--gs-bg-card)', borderRadius: 'var(--gs-radius-lg)', border: '1px solid var(--gs-border)' }}>
                <p style={{ fontSize: '11px', color: 'var(--gs-text-muted)', fontWeight: 600, marginBottom: '4px' }}>{t('assessment.financial.potential_loan')}</p>
                <p style={{ fontSize: '18px', fontWeight: 800, color: 'var(--gs-blue-600)' }}>{fmt(loanEst)}</p>
              </div>
              <span style={{ fontSize: '20px', color: 'var(--gs-text-muted)' }}>=</span>
              <div style={{ flex: 1, textAlign: 'center', padding: '12px', background: 'linear-gradient(135deg, var(--gs-green-50) 0%, var(--gs-blue-50) 100%)', borderRadius: 'var(--gs-radius-lg)', border: '1.5px solid var(--gs-green-200)' }}>
                <p style={{ fontSize: '11px', color: 'var(--gs-text-muted)', fontWeight: 600, marginBottom: '4px' }}>{t('assessment.financial.project_size')}</p>
                <p style={{ fontSize: '18px', fontWeight: 800, color: 'var(--gs-navy-600)' }}>{fmt(projectEst)}</p>
              </div>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--gs-text-muted)', marginTop: '12px', textAlign: 'center', lineHeight: 1.5 }}>{t('assessment.financial.funding_note')}</p>
          </div>
        )}

        {/* Loan question */}
        <div>
          <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--gs-text-primary)', marginBottom: '12px' }}>{t('assessment.financial.loan_question')}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {loanOptions.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setData(d => ({ ...d, loanNeeded: key }))}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', background: data.loanNeeded === key ? 'var(--gs-orange-50)' : 'var(--gs-bg-card)', border: '2px solid', borderColor: data.loanNeeded === key ? 'var(--gs-orange)' : 'var(--gs-border)', borderRadius: 'var(--gs-radius-lg)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s ease' }}
              >
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid', borderColor: data.loanNeeded === key ? 'var(--gs-orange)' : 'var(--gs-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {data.loanNeeded === key && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--gs-orange)' }} />}
                </div>
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--gs-text-primary)' }}>{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="gs-btn gs-btn-secondary gs-btn-lg" onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ChevronLeft size={16} /> {t('common.back')}
          </button>
          <button className="gs-btn gs-btn-primary gs-btn-lg" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} onClick={onNext} disabled={!data.capital || data.capital < 10000}>
            {t('common.continue')} <ArrowRight size={18} />
          </button>
        </div>
        <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--gs-text-muted)', paddingBottom: '24px' }}>{t('common.step_of', { current: 2, total: 4 })}</p>
      </div>
    </div>
  );
}

// ── Step 3: Skills & Resources ────────────────────────────────────────────────
function StepSkills({ data, setData, onNext, onBack, t }) {
  const experienceOptions = [
    { key: 'Beginner',    titleKey: 'assessment.skills.beginner',        subKey: 'assessment.skills.beginner_sub',        emoji: '🌱' },
    { key: 'Intermediate',titleKey: 'assessment.skills.some_experience',  subKey: 'assessment.skills.some_experience_sub', emoji: '📈' },
    { key: 'Expert',      titleKey: 'assessment.skills.experienced',      subKey: 'assessment.skills.experienced_sub',     emoji: '🏆' },
  ];

  const resourceOptions = [
    { key: 'land',       labelKey: 'assessment.skills.land',         emoji: '🌾' },
    { key: 'livestock',  labelKey: 'assessment.skills.livestock',    emoji: '🐄' },
    { key: 'shop',       labelKey: 'assessment.skills.existing_shop',emoji: '🏪' },
    { key: 'electricity',labelKey: 'assessment.skills.electricity',  emoji: '⚡' },
    { key: 'smartphone', labelKey: 'assessment.skills.smartphone',   emoji: '📱' },
  ];

  const toggleResource = (key) => {
    setData(d => {
      const current = d.resources || [];
      return { ...d, resources: current.includes(key) ? current.filter(r => r !== key) : [...current, key] };
    });
  };

  return (
    <div className="gs-animate-fade-up">
      <div style={{ padding: '24px 20px 12px' }}>
        <p className="gs-page-title">{t('assessment.skills.title')}</p>
        <p className="gs-page-subtitle">{t('assessment.skills.subtitle')}</p>
      </div>

      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Experience */}
        <div>
          <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--gs-text-primary)', marginBottom: '12px' }}>{t('assessment.skills.experience_label')}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {experienceOptions.map(({ key, titleKey, subKey, emoji }) => (
              <button
                key={key}
                onClick={() => setData(d => ({ ...d, experience: key }))}
                style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', background: data.experience === key ? 'var(--gs-orange-50)' : 'var(--gs-bg-card)', border: '2px solid', borderColor: data.experience === key ? 'var(--gs-orange)' : 'var(--gs-border)', borderRadius: 'var(--gs-radius-lg)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s ease' }}
              >
                <span style={{ fontSize: '24px' }}>{emoji}</span>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--gs-text-primary)' }}>{t(titleKey)}</p>
                  <p style={{ fontSize: '12px', color: 'var(--gs-text-muted)', marginTop: '2px' }}>{t(subKey)}</p>
                </div>
                {data.experience === key && <Check size={18} color="var(--gs-orange)" style={{ marginLeft: 'auto', flexShrink: 0 }} />}
              </button>
            ))}
          </div>
        </div>

        {/* Resources */}
        <div>
          <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--gs-text-primary)', marginBottom: '12px' }}>{t('assessment.skills.resources_label')}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {resourceOptions.map(({ key, labelKey, emoji }) => {
              const selected = (data.resources || []).includes(key);
              return (
                <button
                  key={key}
                  onClick={() => toggleResource(key)}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: selected ? 'var(--gs-green-50)' : 'var(--gs-bg-card)', border: '1.5px solid', borderColor: selected ? 'var(--gs-green-400)' : 'var(--gs-border)', borderRadius: 'var(--gs-radius-lg)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s ease' }}
                >
                  <span style={{ fontSize: '20px' }}>{emoji}</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--gs-text-primary)', flex: 1 }}>{t(labelKey)}</span>
                  <div style={{ width: '20px', height: '20px', borderRadius: '4px', border: '2px solid', borderColor: selected ? 'var(--gs-green-500)' : 'var(--gs-border)', background: selected ? 'var(--gs-green-500)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {selected && <Check size={12} color="#fff" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="gs-btn gs-btn-secondary gs-btn-lg" onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ChevronLeft size={16} /> {t('common.back')}
          </button>
          <button className="gs-btn gs-btn-primary gs-btn-lg" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} onClick={onNext} disabled={!data.experience}>
            {t('common.continue')} <ArrowRight size={18} />
          </button>
        </div>
        <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--gs-text-muted)', paddingBottom: '24px' }}>{t('common.step_of', { current: 3, total: 4 })}</p>
      </div>
    </div>
  );
}

// ── Step 4: Business Category ─────────────────────────────────────────────────
function StepBusiness({ data, setData, onSubmit, onBack, loading, t }) {
  const getBusinessLabel = useBusinessLabel();

  const isBizSelected = (bizId) => {
    if (!data.business) return false;
    const cur = String(data.business).toLowerCase().trim();
    const target = String(bizId).toLowerCase().trim();
    return cur === target || cur.startsWith(target) || target.startsWith(cur);
  };

  return (
    <div className="gs-animate-fade-up">
      <div className="p-6 pb-2">
        <h2 className="text-xl font-bold text-[#24302A] tracking-tight">{t('assessment.business.title')}</h2>
        <p className="text-xs sm:text-sm text-[#5F665F] mt-1">{t('assessment.business.subtitle')}</p>
        <div className="flex items-center gap-2 mt-3 p-3 bg-[#FEF3C7] border border-[#F59E0B]/40 rounded-xl text-xs font-medium text-[#92400E]">
          <span className="text-sm">💡</span>
          <p>{t('assessment.business.tip')}</p>
        </div>
      </div>

      <div className="p-6 pt-3">
        {/* AI Suggest Card */}
        <button
          type="button"
          onClick={() => setData(d => ({ ...d, business: 'suggest' }))}
          className={`w-full p-4 rounded-2xl border transition-all duration-150 text-left flex items-center gap-4 mb-4 cursor-pointer ${
            isBizSelected('suggest')
              ? 'bg-gradient-to-br from-[#E7F0DE] via-white to-white border-2 border-[#355E3B] shadow-sm ring-1 ring-[#355E3B]/20'
              : 'bg-[#FFF9F0]/60 border border-[#DED8CA] hover:border-[#355E3B] hover:bg-white'
          }`}
        >
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border transition ${
            isBizSelected('suggest') ? 'bg-[#355E3B] text-white border-[#355E3B]' : 'bg-white border-[#DED8CA] text-[#355E3B]'
          }`}>
            <Sparkles size={22} className={isBizSelected('suggest') ? 'text-white' : 'text-[#355E3B]'} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-[#24302A]">{t('assessment.business.suggest_title')}</p>
            <p className="text-xs text-[#5F665F] mt-0.5">{t('assessment.business.suggest_sub')}</p>
          </div>
          {isBizSelected('suggest') && (
            <div className="w-6 h-6 rounded-full bg-[#355E3B] text-white flex items-center justify-center shrink-0">
              <Check size={14} />
            </div>
          )}
        </button>

        {/* Business Grid - 10 categories in clean 5x2 (or 2x5 on mobile) */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mb-6">
          {BUSINESS_CATEGORIES.filter(b => b.id !== 'suggest').map(b => {
            const selected = isBizSelected(b.id);
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => setData(d => ({ ...d, business: b.id }))}
                className={`p-3.5 rounded-xl border transition-all duration-150 cursor-pointer flex flex-col items-center justify-center text-center gap-1.5 min-h-[92px] ${
                  selected
                    ? 'bg-[#E7F0DE] border-2 border-[#355E3B] text-[#214A32] font-bold shadow-xs ring-1 ring-[#355E3B]/20'
                    : 'bg-[#FFF9F0]/60 border border-[#DED8CA] text-[#24302A] hover:border-[#355E3B] hover:bg-white'
                }`}
              >
                <span className="text-2xl">{b.emoji}</span>
                <span className="text-xs font-semibold leading-tight line-clamp-2">{getBusinessLabel(b.id)}</span>
              </button>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="bg-[#F4EBDD] hover:bg-[#EAE4D6] text-[#24302A] px-5 py-3 rounded-xl text-xs font-bold border border-[#DED8CA] transition flex items-center gap-1.5 cursor-pointer"
            onClick={onBack}
          >
            <ChevronLeft size={16} />
            <span>{t('common.back')}</span>
          </button>
          <button
            type="button"
            className="flex-1 bg-[#355E3B] hover:bg-[#214A32] text-white py-3 px-5 rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            id="assessment-analyze-btn"
            onClick={onSubmit}
            disabled={!data.business || loading}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{t('assessment.business.analyzing_btn')}</span>
              </>
            ) : (
              <>
                <span>{t('assessment.business.analyze_btn')}</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
        <p className="text-center text-xs text-[#8C9B90] mt-3">{t('common.step_of', { current: 4, total: 4 })}</p>
      </div>
    </div>
  );
}

// ── Main Assessment Page ──────────────────────────────────────────────────────
export default function BusinessAssessment() {
  const navigate = useNavigate();
  const { user, assessment, setAssessment, refreshFinance } = useApp();
  const t = useT();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    state: '', district: '', block: '', village: '',
    capital: 0,
    loanNeeded: '',
    experience: 'Beginner',
    resources: [],
    business: '',
  });

  // Pre-fill assessment fields from authenticated user profile and existing assessment context
  useEffect(() => {
    const loc = assessment?.location || {};
    const inputs = assessment?._userInputs || {};
    const norm = (str) => {
      if (!str) return '';
      const s = String(str).trim();
      if (s === s.toUpperCase() && s.length > 3) {
        return s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      }
      return s;
    };

    const initialCap = assessment?.capital || inputs.capital || user?.capital || user?.investment_capacity || 0;
    const initialBiz = assessment?.business || inputs.businessInterest || user?.business_interest || user?.business_type || '';

    setData(prev => ({
      ...prev,
      state: prev.state || norm(loc.state || user?.state || ''),
      district: prev.district || norm(loc.district || user?.district || ''),
      block: prev.block || norm(loc.block || user?.block || ''),
      village: prev.village || norm(loc.village || user?.village || ''),
      capital: prev.capital || initialCap,
      loanNeeded: prev.loanNeeded || inputs.loanNeeded || '',
      experience: (prev.experience && prev.experience !== 'Beginner') ? prev.experience : (inputs.experience || user?.experience || 'Beginner'),
      business: prev.business || initialBiz,
      resources: (prev.resources && prev.resources.length > 0) ? prev.resources : (inputs.resources || [
        user?.has_land && 'land',
        user?.has_livestock && 'livestock',
        user?.has_commercial_space && 'shop',
        user?.has_electricity && 'electricity',
        user?.has_smartphone && 'smartphone',
      ].filter(Boolean)),
    }));
  }, [user, assessment]);

  // ML label for the selected business category (English canonical)
  const ML_BUSINESS_LABEL = {
    dairy: 'Dairy', agriculture: 'Agriculture', poultry: 'Poultry',
    retail: 'Retail Shop', food: 'Food Business', textile: 'Textile',
    fisheries: 'Fisheries', manufacturing: 'Manufacturing',
    digital: 'Digital Services', transport: 'Transport',
  };

  const handleSubmit = async () => {
    setLoading(true);

    const isSuggest = data.business === 'suggest' || !data.business;
    const businessLabel = isSuggest ? null : (ML_BUSINESS_LABEL[data.business] || data.business);
    const locationStr = [data.village, data.block, data.district, data.state].filter(Boolean).join(', ');

    if (isApiEnabled) {
      try {
        // 1. Save assessment record to DB
        await saveAssessment({
          location: locationStr,
          village: data.village || null,
          block: data.block || null,
          district: data.district || null,
          state: data.state || null,
          capital: data.capital,
          business_interest: businessLabel || 'AI Suggest',
          experience: data.experience,
        });

        // 2. Fetch recommendation from ML model / backend
        const result = await analyzeAssessment({
          location: locationStr,
          village: data.village || null,
          block: data.block || null,
          district: data.district || null,
          state: data.state || null,
          capital: data.capital,
          business: businessLabel,
          experience: data.experience,
        });

        // 3. Store enriched result in context
        if (result && result.score) {
          setAssessment(prev => ({
            ...prev,
            ...result,
            location: result.location || { village: data.village, block: data.block, district: data.district, state: data.state },
            // Store user assessment inputs for AI Advisor context
            _userInputs: {
              village: data.village,
              block: data.block,
              district: data.district,
              state: data.state,
              capital: data.capital,
              loanNeeded: data.loanNeeded,
              experience: data.experience,
              resources: data.resources,
              businessInterest: businessLabel || 'AI Suggest',
            },
          }));
        } else {
          throw new Error('Incomplete assessment result');
        }
      } catch (err) {
        console.error('[GRAMSAARTHI] Assessment API error — using context fallback:', err);
        setAssessment(prev => ({
          ...(prev || {}),
          ...DEMO_ASSESSMENT,
          location: {
            village: data.village || 'Khajuri Kalan',
            block: data.block || 'Ichhawar',
            district: data.district || 'Sehore',
            state: data.state || 'Madhya Pradesh',
          },
          capital: data.capital || 100000,
          business: businessLabel || 'Dairy',
          score: DEMO_ASSESSMENT.score || 84,
          recommendation: 'Recommended',
          _userInputs: {
            village: data.village,
            block: data.block,
            district: data.district,
            state: data.state,
            capital: data.capital || 100000,
            loanNeeded: data.loanNeeded,
            experience: data.experience,
            resources: data.resources,
            businessInterest: businessLabel || 'AI Suggest',
          },
        }));
      }
      // Refresh finance plan now that assessment is saved — Finance page will show real data
      try { await refreshFinance(); } catch { /* non-blocking */ }
      setLoading(false);
      navigate('/business/analysis');
    } else {
      // Mock path
      setTimeout(() => {
        setAssessment(prev => ({
          ...(prev || {}),
          ...DEMO_ASSESSMENT,
          location: { village: data.village, block: data.block, district: data.district, state: data.state },
          capital: data.capital || 100000,
          business: businessLabel || 'Dairy',
          score: DEMO_ASSESSMENT.score || 84,
          recommendation: 'Recommended',
          _userInputs: {
            village: data.village, block: data.block, district: data.district, state: data.state,
            capital: data.capital || 100000, loanNeeded: data.loanNeeded, experience: data.experience,
            resources: data.resources, businessInterest: businessLabel || 'AI Suggest',
          },
        }));
        setLoading(false);
        navigate('/business/analysis');
      }, 2200);
    }
  };

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-8 lg:py-12">
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
        <span className="text-[#24302A] font-semibold">{t('biz.start_assessment') || 'Start Assessment'}</span>
      </nav>

      <div className="max-w-2xl mx-auto bg-white border border-[#DED8CA] rounded-2xl shadow-xs overflow-hidden">
        <Stepper step={step} t={t} />
        {step === 0 && <StepLocation data={data} setData={setData} onNext={() => setStep(1)} t={t} />}
        {step === 1 && <StepFinancial data={data} setData={setData} onNext={() => setStep(2)} onBack={() => setStep(0)} t={t} />}
        {step === 2 && <StepSkills data={data} setData={setData} onNext={() => setStep(3)} onBack={() => setStep(1)} t={t} />}
        {step === 3 && <StepBusiness data={data} setData={setData} onSubmit={handleSubmit} onBack={() => setStep(2)} loading={loading} t={t} />}
      </div>
    </div>
  );
}
