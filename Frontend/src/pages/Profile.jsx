import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User as UserIcon, MapPin, Briefcase, Award, Wrench, Sliders,
  CheckCircle2, AlertCircle, Edit3, Save, X, LogOut, ChevronRight,
  TrendingUp, Sparkles, Shield, DollarSign
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useT, useMLLabel } from '../locales/index.js';
import { getUserInitials } from '../services/userService.js';

export default function Profile() {
  const navigate = useNavigate();
  const t = useT();
  const tML = useMLLabel();
  const { user, profileCompletion, updateProfile, logout, isAuthenticated } = useApp();

  // Active editing section: null | 'personal' | 'location' | 'eligibility' | 'business' | 'skills' | 'preferences'
  const [editingSection, setEditingSection] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form states initialized with user data
  const [formData, setFormData] = useState({ ...user });

  useEffect(() => {
    setFormData({ ...user });
  }, [user]);

  // Section refs for auto-scrolling when clicking a missing field tag
  const sectionRefs = {
    personal: useRef(null),
    location: useRef(null),
    eligibility: useRef(null),
    business: useRef(null),
    skills: useRef(null),
    preferences: useRef(null),
  };

  const handleFieldChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveSection = async (sectionKey) => {
    setSaving(true);
    try {
      await updateProfile(formData);
      setEditingSection(null);
    } catch (err) {
      // toast shown in AppContext
    } finally {
      setSaving(false);
    }
  };

  const handleMissingFieldClick = (fieldKey) => {
    // Map field key to section
    const keyToSection = {
      age: 'personal', gender: 'personal', education: 'personal', occupation: 'personal',
      state: 'location', district: 'location', block: 'location', village: 'location', rural_or_urban: 'location',
      social_category: 'eligibility', annual_family_income: 'eligibility', special_categories: 'eligibility',
      business_status: 'business', business_type: 'business', business_interests: 'business', investment_capacity: 'business',
      skills: 'skills', resources: 'skills', work_experience: 'skills',
      desired_opportunities: 'preferences', preferred_business_location: 'preferences',
    };
    const targetSection = keyToSection[fieldKey] || 'personal';
    setEditingSection(targetSection);
    sectionRefs[targetSection]?.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const initials = getUserInitials(user?.name || user?.full_name || 'User');
  const pct = profileCompletion?.percentage ?? 0;

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-8 lg:py-12 gs-animate-fade-up">

      {/* ── User Profile Header Card ───────────────────────────── */}
      <div className="gs-card" style={{ padding: '24px', marginBottom: '20px', background: 'linear-gradient(135deg, var(--gs-bg-card) 0%, var(--gs-bg) 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap' }}>
          <div style={{
            width: '68px', height: '68px', borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--gs-navy-900) 0%, var(--gs-green-600) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '24px', fontWeight: 800, color: '#fff',
            boxShadow: '0 4px 16px rgba(11,19,43,0.25)', flexShrink: 0,
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--gs-text-primary)', margin: 0 }}>
              {user?.name || user?.full_name || 'Rural Entrepreneur'}
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--gs-text-muted)', marginTop: '3px' }}>
              📱 {user?.phone || user?.mobile_number || 'Mobile not set'} {user?.email ? `· ✉️ ${user.email}` : ''}
            </p>
            <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
              <span className="gs-badge gs-badge-green">
                <CheckCircle2 size={11} style={{ marginRight: '4px' }} />
                {t('profile.verified') || 'Verified User'}
              </span>
              <span className="gs-badge gs-badge-blue">
                📍 {user?.district || 'Sehore'}, {user?.state || 'Madhya Pradesh'}
              </span>
              <span className="gs-badge gs-badge-orange">
                🌐 {user?.language || 'Hindi'}
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="gs-btn gs-btn-sm"
            style={{
              background: '#fef2f2', border: '1.5px solid #fecaca',
              color: 'var(--gs-danger)', display: 'flex', alignItems: 'center', gap: '6px',
              fontWeight: 700, marginLeft: 'auto',
            }}
          >
            <LogOut size={14} />
            <span>{t('profile.sign_out') || 'Sign Out'}</span>
          </button>
        </div>
      </div>

      {/* ── Progressive Profile Completion Banner ──────────────── */}
      <div className="gs-card" style={{
        padding: '22px', marginBottom: '24px',
        border: '1.5px solid var(--gs-orange-200)',
        background: 'linear-gradient(135deg, #fffaf5 0%, #ffffff 100%)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div>
            <p style={{ fontSize: '16px', fontWeight: 800, color: 'var(--gs-text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={18} color="var(--gs-orange)" />
              {t('profile.completion_title') || 'Your Profile is'} <span style={{ color: 'var(--gs-orange-dark)' }}>{pct}% Complete</span>
            </p>
            <p style={{ fontSize: '12px', color: 'var(--gs-text-muted)', marginTop: '2px' }}>
              {t('profile.completion_msg') || 'Complete your profile to receive more personalized government schemes and business recommendations.'}
            </p>
          </div>
          <span style={{
            fontSize: '18px', fontWeight: 800,
            padding: '6px 14px', borderRadius: 'var(--gs-radius-full)',
            background: pct >= 80 ? 'var(--gs-green-100)' : 'var(--gs-orange-100)',
            color: pct >= 80 ? 'var(--gs-green-700)' : 'var(--gs-orange-dark)',
          }}>
            {pct}%
          </span>
        </div>

        {/* Progress Bar */}
        <div style={{ width: '100%', height: '10px', borderRadius: '5px', background: 'var(--gs-border-subtle)', overflow: 'hidden', marginBottom: '16px' }}>
          <div style={{
            width: `${pct}%`, height: '100%',
            background: pct >= 80
              ? 'linear-gradient(90deg, var(--gs-green-500), var(--gs-green-600))'
              : 'linear-gradient(90deg, var(--gs-orange), var(--gs-orange-600))',
            borderRadius: '5px', transition: 'width 0.4s ease',
          }} />
        </div>

        {/* Missing Fields Interactive Badges */}
        {profileCompletion?.missing_fields?.length > 0 && (
          <div>
            <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gs-text-secondary)', marginBottom: '8px' }}>
              {t('profile.missing_fields_prompt') || 'Quick complete missing items:'}
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {profileCompletion.missing_fields.map(mf => (
                <button
                  key={mf.key}
                  onClick={() => handleMissingFieldClick(mf.key)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '6px 12px', borderRadius: 'var(--gs-radius-full)',
                    background: '#fff', border: '1px solid var(--gs-orange)',
                    color: 'var(--gs-orange-dark)', fontSize: '12px', fontWeight: 700,
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--gs-orange-50)'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                >
                  <span>{mf.icon || '⚠'}</span>
                  <span>+ {mf.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── 6 ORGANIZED EDITABLE PROFILE SECTIONS ────────────────── */}

      {/* Section 1: Personal Information */}
      <div ref={sectionRefs.personal} className="gs-card" style={{ padding: '22px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--gs-blue-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gs-blue-600)' }}>
              <UserIcon size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--gs-text-primary)', margin: 0 }}>
                {t('profile.sec_personal') || 'Personal Information'}
              </h2>
              <p style={{ fontSize: '11px', color: 'var(--gs-text-muted)', margin: 0 }}>
                {t('profile.sec_personal_sub') || 'Name, Age, Gender, Education, Occupation'}
              </p>
            </div>
          </div>
          {editingSection === 'personal' ? (
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={() => setEditingSection(null)} className="gs-btn gs-btn-sm gs-btn-secondary">
                <X size={13} />
              </button>
              <button onClick={() => handleSaveSection('personal')} disabled={saving} className="gs-btn gs-btn-sm gs-btn-primary">
                <Save size={13} style={{ marginRight: '4px' }} />
                {saving ? (t('profile.saving') || 'Saving...') : (t('common.save') || 'Save')}
              </button>
            </div>
          ) : (
            <button onClick={() => setEditingSection('personal')} className="gs-btn gs-btn-sm gs-btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Edit3 size={13} />
              <span>{t('common.edit') || 'Edit'}</span>
            </button>
          )}
        </div>

        {editingSection === 'personal' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gs-text-secondary)', display: 'block', marginBottom: '4px' }}>{t('profile.label_full_name')}</label>
              <input type="text" value={formData.name || ''} onChange={e => handleFieldChange('name', e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid var(--gs-border)' }} />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gs-text-secondary)', display: 'block', marginBottom: '4px' }}>{t('profile.label_age')}</label>
              <input type="number" min={18} max={90} value={formData.age || ''} onChange={e => handleFieldChange('age', parseInt(e.target.value) || null)} placeholder={t('profile.placeholder_age')} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid var(--gs-border)' }} />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gs-text-secondary)', display: 'block', marginBottom: '4px' }}>{t('profile.label_gender')}</label>
              <select value={formData.gender || ''} onChange={e => handleFieldChange('gender', e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid var(--gs-border)', background: 'var(--gs-bg)' }}>
                <option value="">{t('profile.select_gender')}</option>
                <option value="Male">{t('profile.gender_male')}</option>
                <option value="Female">{t('profile.gender_female')}</option>
                <option value="Other">{t('profile.gender_other')}</option>
                <option value="Prefer not to say">{t('profile.gender_prefer_not')}</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gs-text-secondary)', display: 'block', marginBottom: '4px' }}>{t('profile.label_education')}</label>
              <select value={formData.education || ''} onChange={e => handleFieldChange('education', e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid var(--gs-border)', background: 'var(--gs-bg)' }}>
                <option value="">{t('profile.select_education')}</option>
                <option value="Below 10th">{t('profile.edu_below_10')}</option>
                <option value="10th Pass">{t('profile.edu_10th')}</option>
                <option value="12th Pass">{t('profile.edu_12th')}</option>
                <option value="Graduate">{t('profile.edu_graduate')}</option>
                <option value="Post Graduate">{t('profile.edu_post_graduate')}</option>
                <option value="Other">{t('profile.edu_other')}</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gs-text-secondary)', display: 'block', marginBottom: '4px' }}>{t('profile.label_occupation')}</label>
              <select value={formData.occupation || ''} onChange={e => handleFieldChange('occupation', e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid var(--gs-border)', background: 'var(--gs-bg)' }}>
                <option value="">{t('profile.select_occupation')}</option>
                <option value="Farmer">{t('profile.occ_farmer')}</option>
                <option value="Daily Wage Worker">{t('profile.occ_worker')}</option>
                <option value="Artisan / Tailor">{t('profile.occ_artisan')}</option>
                <option value="Shopkeeper / Retailer">{t('profile.occ_retailer')}</option>
                <option value="Self Employed">{t('profile.occ_self_employed')}</option>
                <option value="Homemaker">{t('profile.occ_homemaker')}</option>
                <option value="Student">{t('profile.occ_student')}</option>
                <option value="Other">{t('profile.occ_other')}</option>
              </select>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '14px' }}>
            {[
              { label: t('profile.label_full_name'), val: user?.name || user?.full_name },
              { label: t('profile.label_age'), val: user?.age ? `${user.age} ${t('profile.yrs')}` : t('profile.not_added') },
              { label: t('profile.label_gender'), val: user?.gender || t('profile.not_added') },
              { label: t('profile.label_education'), val: user?.education || t('profile.not_added') },
              { label: t('profile.label_occupation'), val: user?.occupation || t('profile.not_added') },
            ].map(({ label, val }) => (
              <div key={label} style={{ background: 'var(--gs-bg-muted)', padding: '10px 14px', borderRadius: '8px' }}>
                <span style={{ fontSize: '11px', color: 'var(--gs-text-muted)', display: 'block' }}>{label}</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gs-text-primary)' }}>{val}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 2: Location */}
      <div ref={sectionRefs.location} className="gs-card" style={{ padding: '22px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--gs-green-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gs-green-600)' }}>
              <MapPin size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--gs-text-primary)', margin: 0 }}>
                {t('profile.sec_location') || 'Location'}
              </h2>
              <p style={{ fontSize: '11px', color: 'var(--gs-text-muted)', margin: 0 }}>
                {t('profile.sub_location') || 'State, District, Block/Tehsil, Village/Town, Rural/Urban'}
              </p>
            </div>
          </div>
          {editingSection === 'location' ? (
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={() => setEditingSection(null)} className="gs-btn gs-btn-sm gs-btn-secondary">
                <X size={13} />
              </button>
              <button onClick={() => handleSaveSection('location')} disabled={saving} className="gs-btn gs-btn-sm gs-btn-primary">
                <Save size={13} style={{ marginRight: '4px' }} />
                {saving ? (t('profile.saving') || 'Saving...') : (t('common.save') || 'Save')}
              </button>
            </div>
          ) : (
            <button onClick={() => setEditingSection('location')} className="gs-btn gs-btn-sm gs-btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Edit3 size={13} />
              <span>{t('common.edit') || 'Edit'}</span>
            </button>
          )}
        </div>

        {editingSection === 'location' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gs-text-secondary)', display: 'block', marginBottom: '4px' }}>{t('profile.label_state')}</label>
              <input type="text" value={formData.state || ''} onChange={e => handleFieldChange('state', e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid var(--gs-border)' }} />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gs-text-secondary)', display: 'block', marginBottom: '4px' }}>{t('profile.label_district')}</label>
              <input type="text" value={formData.district || ''} onChange={e => handleFieldChange('district', e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid var(--gs-border)' }} />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gs-text-secondary)', display: 'block', marginBottom: '4px' }}>{t('profile.label_block')}</label>
              <input type="text" value={formData.block || ''} onChange={e => handleFieldChange('block', e.target.value)} placeholder={t('profile.placeholder_block')} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid var(--gs-border)' }} />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gs-text-secondary)', display: 'block', marginBottom: '4px' }}>{t('profile.label_village')}</label>
              <input type="text" value={formData.village || ''} onChange={e => handleFieldChange('village', e.target.value)} placeholder={t('profile.placeholder_village')} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid var(--gs-border)' }} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gs-text-secondary)', display: 'block', marginBottom: '4px' }}>{t('profile.label_area_type')}</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                {[
                  { key: 'Rural', label: t('profile.area_rural') },
                  { key: 'Semi-Urban', label: t('profile.area_semi_urban') },
                  { key: 'Urban', label: t('profile.area_urban') },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleFieldChange('rural_or_urban', key)}
                    style={{
                      flex: 1, padding: '9px', borderRadius: '8px',
                      border: formData.rural_or_urban === key ? '2px solid var(--gs-green-600)' : '1px solid var(--gs-border)',
                      background: formData.rural_or_urban === key ? 'var(--gs-green-50)' : 'var(--gs-bg)',
                      fontWeight: formData.rural_or_urban === key ? 700 : 500,
                      color: formData.rural_or_urban === key ? 'var(--gs-green-700)' : 'var(--gs-text-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '14px' }}>
            {[
              { label: t('profile.label_state'), val: user?.state || t('profile.not_added') },
              { label: t('profile.label_district'), val: user?.district || t('profile.not_added') },
              { label: t('profile.label_block'), val: user?.block || t('profile.not_added') },
              { label: t('profile.label_village'), val: user?.village || t('profile.not_added') },
              { label: t('profile.label_area_type'), val: user?.rural_or_urban || t('profile.area_rural') },
            ].map(({ label, val }) => (
              <div key={label} style={{ background: 'var(--gs-bg-muted)', padding: '10px 14px', borderRadius: '8px' }}>
                <span style={{ fontSize: '11px', color: 'var(--gs-text-muted)', display: 'block' }}>{label}</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gs-text-primary)' }}>{val}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 3: Scheme Eligibility */}
      <div ref={sectionRefs.eligibility} className="gs-card" style={{ padding: '22px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--gs-orange-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gs-orange-dark)' }}>
              <Shield size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--gs-text-primary)', margin: 0 }}>
                {t('profile.sec_eligibility') || 'Scheme Eligibility'}
              </h2>
              <p style={{ fontSize: '11px', color: 'var(--gs-text-muted)', margin: 0 }}>
                {t('profile.sub_eligibility') || 'Social Category, Family Income, Special Categories'}
              </p>
            </div>
          </div>
          {editingSection === 'eligibility' ? (
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={() => setEditingSection(null)} className="gs-btn gs-btn-sm gs-btn-secondary">
                <X size={13} />
              </button>
              <button onClick={() => handleSaveSection('eligibility')} disabled={saving} className="gs-btn gs-btn-sm gs-btn-primary">
                <Save size={13} style={{ marginRight: '4px' }} />
                {saving ? (t('profile.saving') || 'Saving...') : (t('common.save') || 'Save')}
              </button>
            </div>
          ) : (
            <button onClick={() => setEditingSection('eligibility')} className="gs-btn gs-btn-sm gs-btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Edit3 size={13} />
              <span>{t('common.edit') || 'Edit'}</span>
            </button>
          )}
        </div>

        {editingSection === 'eligibility' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gs-text-secondary)', display: 'block', marginBottom: '4px' }}>{t('profile.label_social_category')}</label>
              <select value={formData.social_category || ''} onChange={e => handleFieldChange('social_category', e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid var(--gs-border)', background: 'var(--gs-bg)' }}>
                <option value="">{t('profile.select_category')}</option>
                <option value="General">{t('profile.cat_general')}</option>
                <option value="OBC">{t('profile.cat_obc')}</option>
                <option value="SC">{t('profile.cat_sc')}</option>
                <option value="ST">{t('profile.cat_st')}</option>
                <option value="EWS">{t('profile.cat_ews')}</option>
                <option value="Other">{t('profile.cat_other')}</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gs-text-secondary)', display: 'block', marginBottom: '4px' }}>{t('profile.label_annual_income')}</label>
              <select
                value={formData.annual_income_range || ''}
                onChange={e => {
                  handleFieldChange('annual_income_range', e.target.value);
                  const rangeMap = {
                    'Below ₹1 Lakh': 80000,
                    '₹1–2.5 Lakh': 180000,
                    '₹2.5–5 Lakh': 350000,
                    '₹5–8 Lakh': 650000,
                    'Above ₹8 Lakh': 900000,
                  };
                  if (rangeMap[e.target.value]) {
                    handleFieldChange('annual_family_income', rangeMap[e.target.value]);
                  }
                }}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid var(--gs-border)', background: 'var(--gs-bg)' }}
              >
                <option value="">{t('profile.select_income')}</option>
                <option value="Below ₹1 Lakh">Below ₹1 Lakh</option>
                <option value="₹1–2.5 Lakh">₹1–2.5 Lakh</option>
                <option value="₹2.5–5 Lakh">₹2.5–5 Lakh</option>
                <option value="₹5–8 Lakh">₹5–8 Lakh</option>
                <option value="Above ₹8 Lakh">Above ₹8 Lakh</option>
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gs-text-secondary)', display: 'block', marginBottom: '4px' }}>{t('profile.sec_eligibility_sub')}</label>
              <select value={formData.special_categories || 'None'} onChange={e => handleFieldChange('special_categories', e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid var(--gs-border)', background: 'var(--gs-bg)' }}>
                <option value="None">{t('profile.special_none') || 'None'}</option>
                <option value="Person with disability">{t('profile.special_pwd') || 'Person with disability (दिव्यांग)'}</option>
                <option value="Widow/single woman">{t('profile.special_widow') || 'Widow / Single Woman'}</option>
                <option value="Ex-serviceman/armed forces family">{t('profile.special_ex_service') || 'Ex-Serviceman / Armed Forces Family'}</option>
                <option value="Prefer not to say">{t('profile.special_prefer_not') || 'Prefer not to say'}</option>
              </select>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px' }}>
            {[
              { label: t('profile.label_social_category'), val: user?.social_category || t('profile.not_added') },
              { label: t('profile.label_annual_income'), val: user?.annual_income_range || (user?.annual_family_income ? `₹${Number(user.annual_family_income).toLocaleString('en-IN')}` : t('profile.not_added')) },
              { label: t('profile.sec_eligibility'), val: user?.special_categories || 'None' },
            ].map(({ label, val }) => (
              <div key={label} style={{ background: 'var(--gs-bg-muted)', padding: '10px 14px', borderRadius: '8px' }}>
                <span style={{ fontSize: '11px', color: 'var(--gs-text-muted)', display: 'block' }}>{label}</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gs-text-primary)' }}>{val}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 4: Business Profile */}
      <div ref={sectionRefs.business} className="gs-card" style={{ padding: '22px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--gs-navy-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gs-navy-900)' }}>
              <Briefcase size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--gs-text-primary)', margin: 0 }}>
                {t('profile.sec_business') || 'Business Profile'}
              </h2>
              <p style={{ fontSize: '11px', color: 'var(--gs-text-muted)', margin: 0 }}>
                {t('profile.sub_business') || 'Status, Type, Investment, Revenue, Employees, Interests'}
              </p>
            </div>
          </div>
          {editingSection === 'business' ? (
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={() => setEditingSection(null)} className="gs-btn gs-btn-sm gs-btn-secondary">
                <X size={13} />
              </button>
              <button onClick={() => handleSaveSection('business')} disabled={saving} className="gs-btn gs-btn-sm gs-btn-primary">
                <Save size={13} style={{ marginRight: '4px' }} />
                {saving ? (t('profile.saving') || 'Saving...') : (t('common.save') || 'Save')}
              </button>
            </div>
          ) : (
            <button onClick={() => setEditingSection('business')} className="gs-btn gs-btn-sm gs-btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Edit3 size={13} />
              <span>{t('common.edit') || 'Edit'}</span>
            </button>
          )}
        </div>

        {editingSection === 'business' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gs-text-secondary)', display: 'block', marginBottom: '4px' }}>{t('profile.label_business_status') || 'Business Status'}</label>
              <select value={formData.business_status || ''} onChange={e => handleFieldChange('business_status', e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid var(--gs-border)', background: 'var(--gs-bg)' }}>
                <option value="Planning to start">{t('profile.status_planning') || 'Planning to start (नया शुरू करना है)'}</option>
                <option value="Existing business">{t('profile.status_existing') || 'Existing business (मौजूदा व्यवसाय)'}</option>
                <option value="No business">{t('profile.status_none') || 'No business'}</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gs-text-secondary)', display: 'block', marginBottom: '4px' }}>{t('profile.label_business_type') || 'Business Type / Sector'}</label>
              <select value={formData.business_type || formData.business_interest || ''} onChange={e => { handleFieldChange('business_type', e.target.value); handleFieldChange('business_interest', e.target.value); }} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid var(--gs-border)', background: 'var(--gs-bg)' }}>
                <option value="">{t('profile.select_sector') || 'Select Sector'}</option>
                <option value="Dairy">{t('profile.sector_dairy') || 'Dairy Farming (डेयरी)'}</option>
                <option value="Poultry">{t('profile.sector_poultry') || 'Poultry Farming (पोल्ट्री)'}</option>
                <option value="Agriculture">{t('profile.sector_agri') || 'Agriculture & Allied (कृषि)'}</option>
                <option value="Food Processing">{t('profile.sector_food') || 'Food & Processing (खाद्य प्रसंस्करण)'}</option>
                <option value="Retail Shop">{t('profile.sector_retail') || 'Retail Shop (किराना/दुकान)'}</option>
                <option value="Textile">{t('profile.sector_textile') || 'Textile & Tailoring (कपड़ा/सिलाई)'}</option>
                <option value="Fisheries">{t('profile.sector_fisheries') || 'Fisheries (मत्स्य पालन)'}</option>
                <option value="Digital Services">{t('profile.sector_digital') || 'Digital / CSC Center'}</option>
                <option value="Transport">{t('profile.sector_transport') || 'Transport / Rural Loader'}</option>
                <option value="Manufacturing">{t('profile.sector_mfg') || 'Small Manufacturing'}</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gs-text-secondary)', display: 'block', marginBottom: '4px' }}>{t('profile.label_investment') || 'Investment Budget / Capital (₹)'}</label>
              <input type="number" step={10000} value={formData.capital || formData.investment_capacity || ''} onChange={e => { const val = parseInt(e.target.value) || null; handleFieldChange('capital', val); handleFieldChange('investment_capacity', val); }} placeholder={t('profile.placeholder_investment') || "e.g. 100000"} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid var(--gs-border)' }} />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gs-text-secondary)', display: 'block', marginBottom: '4px' }}>{t('profile.label_monthly_rev') || 'Monthly Revenue (if existing)'}</label>
              <input type="number" step={5000} value={formData.monthly_revenue || ''} onChange={e => handleFieldChange('monthly_revenue', parseInt(e.target.value) || null)} placeholder={t('profile.placeholder_monthly_rev') || "e.g. 35000"} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid var(--gs-border)' }} />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gs-text-secondary)', display: 'block', marginBottom: '4px' }}>{t('profile.label_employees') || 'Employees Count'}</label>
              <input type="number" min={0} value={formData.number_of_employees ?? ''} onChange={e => handleFieldChange('number_of_employees', parseInt(e.target.value) || 0)} placeholder={t('profile.placeholder_employees') || "e.g. 2"} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid var(--gs-border)' }} />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gs-text-secondary)', display: 'block', marginBottom: '4px' }}>{t('profile.label_experience') || 'Experience Level'}</label>
              <select value={formData.experience || 'Beginner'} onChange={e => handleFieldChange('experience', e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid var(--gs-border)', background: 'var(--gs-bg)' }}>
                <option value="Beginner">{t('profile.exp_beginner') || 'Beginner (नया/शुरुआती)'}</option>
                <option value="Intermediate">{t('profile.exp_intermediate') || 'Intermediate (1-3 साल)'}</option>
                <option value="Expert">{t('profile.exp_expert') || 'Expert (3+ साल)'}</option>
              </select>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '14px' }}>
            {[
              { label: t('profile.status_lbl') || 'Status', val: user?.business_status || 'Planning to start' },
              { label: t('profile.interest_lbl') || 'Interest / Type', val: tML(user?.business_type || user?.business_interest) || t('profile.not_added') },
              { label: t('profile.capital_lbl') || 'Available Capital', val: (user?.capital || user?.investment_capacity) ? `₹${(user.capital || user.investment_capacity).toLocaleString()}` : t('profile.not_added') },
              { label: t('profile.exp_lbl') || 'Experience', val: user?.experience || 'Beginner' },
              { label: t('profile.rev_lbl') || 'Monthly Revenue', val: user?.monthly_revenue ? `₹${user.monthly_revenue.toLocaleString()}/mo` : 'N/A' },
            ].map(({ label, val }) => (
              <div key={label} style={{ background: 'var(--gs-bg-muted)', padding: '10px 14px', borderRadius: '8px' }}>
                <span style={{ fontSize: '11px', color: 'var(--gs-text-muted)', display: 'block' }}>{label}</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gs-text-primary)' }}>{val}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 5: Skills & Resources */}
      <div ref={sectionRefs.skills} className="gs-card" style={{ padding: '22px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--gs-purple-50, #f3e8ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gs-purple-700, #7e22ce)' }}>
              <Wrench size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--gs-text-primary)', margin: 0 }}>
                {t('profile.sec_skills_resources') || 'Skills & Resources'}
              </h2>
              <p style={{ fontSize: '11px', color: 'var(--gs-text-muted)', margin: 0 }}>
                {t('profile.sub_skills') || 'Skills, Experience, Land, Shop, Equipment, Bank Account'}
              </p>
            </div>
          </div>
          {editingSection === 'skills' ? (
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={() => setEditingSection(null)} className="gs-btn gs-btn-sm gs-btn-secondary">
                <X size={13} />
              </button>
              <button onClick={() => handleSaveSection('skills')} disabled={saving} className="gs-btn gs-btn-sm gs-btn-primary">
                <Save size={13} style={{ marginRight: '4px' }} />
                {saving ? (t('profile.saving') || 'Saving...') : (t('common.save') || 'Save')}
              </button>
            </div>
          ) : (
            <button onClick={() => setEditingSection('skills')} className="gs-btn gs-btn-sm gs-btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Edit3 size={13} />
              <span>{t('common.edit') || 'Edit'}</span>
            </button>
          )}
        </div>

        {editingSection === 'skills' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gs-text-secondary)', display: 'block', marginBottom: '4px' }}>{t('profile.label_key_skills') || 'Key Skills'}</label>
              <input type="text" value={formData.skills || ''} onChange={e => handleFieldChange('skills', e.target.value)} placeholder={t('profile.skills_placeholder') || "e.g. Dairy farming, Cattle care, Accounting"} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid var(--gs-border)' }} />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gs-text-secondary)', display: 'block', marginBottom: '8px' }}>{t('profile.label_resources') || 'Available Physical & Financial Resources'}</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {[
                  { key: 'has_bank_account', label: t('profile.res_bank_account') || 'Active Bank Account' },
                  { key: 'has_land', label: t('profile.res_land') || 'Agricultural / Open Land' },
                  { key: 'has_commercial_space', label: t('profile.res_commercial_space') || 'Shop / Commercial Space' },
                  { key: 'has_equipment', label: t('profile.res_equipment') || 'Tools / Farm Equipment' },
                ].map(({ key, label }) => (
                  <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--gs-border)', background: 'var(--gs-bg)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={Boolean(formData[key])}
                      onChange={e => handleFieldChange(key, e.target.checked)}
                      style={{ width: '16px', height: '16px', accentColor: 'var(--gs-green-600)' }}
                    />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--gs-text-primary)' }}>{label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ background: 'var(--gs-bg-muted)', padding: '10px 14px', borderRadius: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--gs-text-muted)', display: 'block' }}>{t('profile.skills_knowledge_lbl') || 'Key Skills & Knowledge'}</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gs-text-primary)' }}>{user?.skills || t('profile.not_specified') || 'Not specified'}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
              {[
                { label: t('profile.res_bank_account_short') || 'Bank Account', ok: user?.has_bank_account },
                { label: t('profile.res_land_short') || 'Own Land', ok: user?.has_land },
                { label: t('profile.res_commercial_space_short') || 'Commercial Space', ok: user?.has_commercial_space },
                { label: t('profile.res_equipment_short') || 'Equipment', ok: user?.has_equipment },
              ].map(({ label, ok }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '8px', background: 'var(--gs-bg-muted)' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: ok ? 'var(--gs-green-500)' : 'var(--gs-text-muted)' }} />
                  <span style={{ fontSize: '12px', fontWeight: 600, color: ok ? 'var(--gs-text-primary)' : 'var(--gs-text-muted)' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Section 6: Preferences */}
      <div ref={sectionRefs.preferences} className="gs-card" style={{ padding: '22px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--gs-blue-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gs-blue-600)' }}>
              <Sliders size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--gs-text-primary)', margin: 0 }}>
                {t('profile.sec_preferences') || 'Preferences'}
              </h2>
              <p style={{ fontSize: '11px', color: 'var(--gs-text-muted)', margin: 0 }}>
                {t('profile.sub_preferences') || 'Desired opportunities, Preferred location, Language'}
              </p>
            </div>
          </div>
          {editingSection === 'preferences' ? (
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={() => setEditingSection(null)} className="gs-btn gs-btn-sm gs-btn-secondary">
                <X size={13} />
              </button>
              <button onClick={() => handleSaveSection('preferences')} disabled={saving} className="gs-btn gs-btn-sm gs-btn-primary">
                <Save size={13} style={{ marginRight: '4px' }} />
                {saving ? (t('profile.saving') || 'Saving...') : (t('common.save') || 'Save')}
              </button>
            </div>
          ) : (
            <button onClick={() => setEditingSection('preferences')} className="gs-btn gs-btn-sm gs-btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Edit3 size={13} />
              <span>{t('common.edit') || 'Edit'}</span>
            </button>
          )}
        </div>

        {editingSection === 'preferences' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gs-text-secondary)', display: 'block', marginBottom: '4px' }}>{t('profile.label_pref_location') || 'Preferred Business Location'}</label>
              <input type="text" value={formData.preferred_business_location || ''} onChange={e => handleFieldChange('preferred_business_location', e.target.value)} placeholder={t('profile.placeholder_pref_location') || "e.g. Village marketplace / Highway"} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid var(--gs-border)' }} />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gs-text-secondary)', display: 'block', marginBottom: '4px' }}>{t('profile.label_desired_opp') || 'Desired Opportunities'}</label>
              <input type="text" value={formData.desired_opportunities || ''} onChange={e => handleFieldChange('desired_opportunities', e.target.value)} placeholder={t('profile.placeholder_desired_opp') || "e.g. Subsidy schemes, Low-risk farming"} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid var(--gs-border)' }} />
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
            <div style={{ background: 'var(--gs-bg-muted)', padding: '10px 14px', borderRadius: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--gs-text-muted)', display: 'block' }}>{t('profile.card_pref_location') || 'Preferred Location'}</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gs-text-primary)' }}>{user?.preferred_business_location || t('profile.default_pref_location') || 'Local village & block'}</span>
            </div>
            <div style={{ background: 'var(--gs-bg-muted)', padding: '10px 14px', borderRadius: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--gs-text-muted)', display: 'block' }}>{t('profile.card_desired_opp') || 'Goals & Desired Opportunities'}</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gs-text-primary)' }}>{user?.desired_opportunities || t('profile.default_desired_opp') || 'Government subsidies & bank credit'}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Quick Action to AI Advisor ──────────────────────────── */}
      <div style={{ textAlign: 'center', marginTop: '16px' }}>
        <button
          onClick={() => navigate('/ai-advisor')}
          className="gs-btn gs-btn-primary"
          style={{ padding: '14px 28px', fontSize: '15px', fontWeight: 700, borderRadius: 'var(--gs-radius-xl)', boxShadow: '0 4px 16px rgba(45,156,45,0.25)' }}
        >
          <Sparkles size={17} style={{ marginRight: '8px' }} />
          {t('profile.btn_ask_ai') || 'Ask AI Advisor with Updated Profile'}
        </button>
      </div>

    </div>
  );
}
