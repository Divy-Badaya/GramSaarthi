import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User as UserIcon, Phone, Lock, Eye, EyeOff, MapPin, Globe, Mail, ArrowRight, ShieldCheck, CheckCircle2, Sparkles, ChevronDown } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { sendOtp, signupUser } from '../services/authService';
import { useT, getLangCode } from '../locales/index.js';
import { LANGUAGES } from '../data/mockData';

const COMMON_STATES = [
  'Madhya Pradesh',
  'Uttar Pradesh',
  'Gujarat',
  'Maharashtra',
  'Rajasthan',
  'Bihar',
  'Punjab',
  'Haryana',
  'Other',
];

export default function Signup() {
  const navigate = useNavigate();
  const t = useT();
  const { login, lang, setLang, isAuthenticated } = useApp();

  // Form fields
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState(lang || 'Hindi');
  const [state, setState] = useState('Madhya Pradesh');
  const [district, setDistrict] = useState('Sehore');
  const [email, setEmail] = useState('');

  // UI helpers
  const [showPassword, setShowPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [receivedOtp, setReceivedOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [error, setError] = useState('');
  const [langOpen, setLangOpen] = useState(false);

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSendOtp = async () => {
    const cleaned = mobileNumber.trim().replace(/\D/g, '');
    if (cleaned.length !== 10) {
      setError(t('auth.err_phone_length') || 'Please enter a valid 10-digit mobile number first.');
      return;
    }
    setError('');
    setOtpLoading(true);
    try {
      const res = await sendOtp(cleaned);
      setOtpSent(true);
      if (res?.otp) {
        setReceivedOtp(res.otp);
      }
    } catch (err) {
      setError(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleAutoFillOtp = () => {
    if (receivedOtp) {
      setOtp(receivedOtp);
    } else {
      setOtp('123456');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName.trim() || !mobileNumber.trim() || !otp.trim() || !password.trim() || !state.trim() || !district.trim()) {
      setError(t('auth.err_fill_mandatory') || 'Please fill in all mandatory fields.');
      return;
    }

    if (password.length < 4) {
      setError(t('auth.err_pwd_short') || 'Password / PIN must be at least 4 characters.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        full_name: fullName.trim(),
        mobile_number: mobileNumber.trim(),
        otp: otp.trim(),
        password: password.trim(),
        preferred_language: preferredLanguage,
        state: state.trim(),
        district: district.trim(),
        email: email.trim() || null,
      };

      const res = await signupUser(payload);
      login(res.access_token, res.user);
      setLang(preferredLanguage);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || t('auth.err_signup_failed') || 'Sign up failed. Please check your information.');
    } finally {
      setLoading(false);
    }
  };

  const currentCode = getLangCode(lang);
  const displayLabel = currentCode === 'hi' ? 'हिन्दी' : currentCode === 'gu' ? 'ગુજરાતી' : 'English';

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '36px 16px',
        background: '#FFF9F0',
        position: 'relative',
      }}
    >


      <div style={{ width: '100%', maxWidth: '520px' }} className="gs-animate-fade-up">
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <img
            src="/logo.png"
            alt="GramSaarthi Logo"
            style={{
              width: '68px', height: '68px', borderRadius: '16px',
              objectFit: 'contain',
              boxShadow: '0 4px 14px rgba(53,94,59,0.2)', marginBottom: '12px',
              display: 'inline-block',
            }}
          />
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#24302A' }}>
            {t('auth.signup_title') || 'Join GramSaarthi'}
          </h1>
          <p style={{ fontSize: '14px', color: '#5F665F', marginTop: '4px' }}>
            {t('auth.signup_subtitle') || 'Quick 1-minute registration to start your business journey'}
          </p>
        </div>

        {/* Card */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #DED8CA',
            borderRadius: '20px',
            padding: '30px 24px',
            boxShadow: 'var(--gs-shadow-sm)',
          }}
        >
          {error && (
            <div
              style={{
                background: '#FEE8E8', border: '1px solid #F3C7C7',
                color: '#C94A3B', padding: '12px 14px', borderRadius: '10px',
                fontSize: '13px', marginBottom: '18px', fontWeight: 500,
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* 1. Full Name */}
            <div>
              <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 700, color: '#24302A', marginBottom: '6px' }}>
                1. {t('auth.label_fullname') || 'Full Name'} <span style={{ color: '#C94A3B' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#5F665F' }}>
                  <UserIcon size={17} />
                </div>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder={t('auth.placeholder_name') || "e.g. Ramesh Kumar"}
                  required
                  style={{
                    width: '100%', padding: '12px 14px 12px 42px',
                    borderRadius: '12px', border: '1.5px solid #DED8CA',
                    fontSize: '14.5px', background: '#FFF9F0', outline: 'none', color: '#24302A',
                  }}
                />
              </div>
            </div>

            {/* 2. Mobile Number & Send OTP Button */}
            <div>
              <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 700, color: '#24302A', marginBottom: '6px' }}>
                2. {t('auth.label_mobile') || 'Mobile Number'} <span style={{ color: '#C94A3B' }}>*</span>
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#5F665F' }}>
                    <Phone size={17} />
                  </div>
                  <input
                    type="tel"
                    maxLength={10}
                    value={mobileNumber}
                    onChange={e => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                    placeholder={t('auth.placeholder_mobile') || "10-digit mobile number"}
                    required
                    style={{
                      width: '100%', padding: '12px 14px 12px 42px',
                      borderRadius: '12px', border: '1.5px solid #DED8CA',
                      fontSize: '14.5px', background: '#FFF9F0', outline: 'none', color: '#24302A',
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={otpLoading || mobileNumber.length < 10}
                  className="gs-btn gs-btn-secondary"
                  style={{ flexShrink: 0, padding: '10px 16px', fontSize: '13.5px', fontWeight: 700 }}
                >
                  {otpLoading ? (t('auth.sending') || 'Sending...') : otpSent ? (t('auth.resend_otp') || 'Resend') : (t('auth.send_otp') || 'Send OTP')}
                </button>
              </div>
            </div>

            {/* OTP Alert / Banner */}
            {otpSent && (
              <div
                style={{
                  background: '#E7F0DE', border: '1px solid #BEDCA7',
                  padding: '10px 14px', borderRadius: '12px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={18} color="#355E3B" />
                  <span style={{ fontSize: '13px', color: '#214A32', fontWeight: 600 }}>
                    {t('signup.otp_sent') || 'OTP code:'} <strong>{receivedOtp || '123456'}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAutoFillOtp}
                  style={{
                    background: '#FFFFFF', border: '1px solid #355E3B',
                    color: '#355E3B', borderRadius: '8px',
                    padding: '4px 10px', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  {t('signup.autofill') || 'Auto-fill'}
                </button>
              </div>
            )}

            {/* 3. OTP Verification */}
            <div>
              <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 700, color: '#24302A', marginBottom: '6px' }}>
                3. {t('auth.label_otp') || 'OTP Verification'} <span style={{ color: '#C94A3B' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#5F665F' }}>
                  <ShieldCheck size={17} />
                </div>
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder={t('auth.placeholder_otp') || "Enter 6-digit OTP"}
                  required
                  style={{
                    width: '100%', padding: '12px 14px 12px 42px',
                    borderRadius: '12px', border: '1.5px solid #DED8CA',
                    fontSize: '14.5px', background: '#FFF9F0', outline: 'none', letterSpacing: '0.1em', color: '#24302A',
                  }}
                />
              </div>
            </div>

            {/* 4. Password / PIN */}
            <div>
              <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 700, color: '#24302A', marginBottom: '6px' }}>
                4. {t('auth.label_password') || 'Set Password / PIN'} <span style={{ color: '#C94A3B' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#5F665F' }}>
                  <Lock size={17} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={t('auth.placeholder_min_password') || "Min. 4 characters"}
                  required
                  style={{
                    width: '100%', padding: '12px 42px 12px 42px',
                    borderRadius: '12px', border: '1.5px solid #DED8CA',
                    fontSize: '14.5px', background: '#FFF9F0', outline: 'none', color: '#24302A',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  style={{
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: '#5F665F', cursor: 'pointer',
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* 5. Preferred Language */}
            <div>
              <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 700, color: '#24302A', marginBottom: '6px' }}>
                5. {t('auth.label_language') || 'Preferred Language'} <span style={{ color: '#C94A3B' }}>*</span>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {['Hindi', 'English', 'Gujarati'].map(lName => (
                  <button
                    key={lName}
                    type="button"
                    onClick={() => setPreferredLanguage(lName)}
                    style={{
                      padding: '10px', borderRadius: '12px',
                      fontSize: '13.5px', fontWeight: preferredLanguage === lName ? 700 : 500,
                      border: preferredLanguage === lName ? '2px solid #355E3B' : '1.5px solid #DED8CA',
                      background: preferredLanguage === lName ? '#E7F0DE' : '#FFF9F0',
                      color: preferredLanguage === lName ? '#214A32' : '#5F665F',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    {lName === 'Hindi' ? 'हिन्दी' : lName === 'Gujarati' ? 'ગુજરાતી' : 'English'}
                  </button>
                ))}
              </div>
            </div>

            {/* 6 & 7: State & District */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 700, color: '#24302A', marginBottom: '6px' }}>
                  6. {t('auth.label_state') || 'State'} <span style={{ color: '#C94A3B' }}>*</span>
                </label>
                <select
                  value={state}
                  onChange={e => setState(e.target.value)}
                  className="gs-select"
                  style={{
                    width: '100%', padding: '12px 36px 12px 12px',
                    borderRadius: '12px', border: '1.5px solid #DED8CA',
                    fontSize: '13.5px', background: '#FFF9F0', color: '#24302A',
                    outline: 'none',
                  }}
                >
                  {COMMON_STATES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 700, color: '#24302A', marginBottom: '6px' }}>
                  7. {t('auth.label_district') || 'District'} <span style={{ color: '#C94A3B' }}>*</span>
                </label>
                <input
                  type="text"
                  value={district}
                  onChange={e => setDistrict(e.target.value)}
                  placeholder={t('auth.placeholder_district') || "e.g. Sehore"}
                  required
                  style={{
                    width: '100%', padding: '12px 14px',
                    borderRadius: '12px', border: '1.5px solid #DED8CA',
                    fontSize: '13.5px', background: '#FFF9F0', outline: 'none', color: '#24302A',
                  }}
                />
              </div>
            </div>

            {/* Optional Email */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#5F665F', marginBottom: '6px' }}>
                {t('auth.label_email_optional') || 'Email Address (Optional)'}
              </label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#5F665F' }}>
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={t('auth.placeholder_email_optional') || "name@example.com (optional)"}
                  style={{
                    width: '100%', padding: '12px 14px 12px 42px',
                    borderRadius: '12px', border: '1.5px solid #DED8CA',
                    fontSize: '13.5px', background: '#FFF9F0', outline: 'none', color: '#24302A',
                  }}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="gs-btn gs-btn-primary"
              style={{
                width: '100%', padding: '14px', marginTop: '10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                fontWeight: 700, fontSize: '15.5px', borderRadius: '12px',
                background: '#355E3B', color: '#FFFFFF',
              }}
            >
              {loading ? (
                <span>{t('auth.creating_account') || "Creating Account..."}</span>
              ) : (
                <>
                  <span>{t('auth.btn_create_account') || 'Create Account & Get Started'}</span>
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer Link to Login */}
        <p style={{ textAlign: 'center', fontSize: '14px', color: '#5F665F', marginTop: '22px' }}>
          {t('auth.have_account') || 'Already have an account?'}{' '}
          <Link to="/login" style={{ color: '#C96B3B', fontWeight: 700, textDecoration: 'none' }}>
            {t('auth.link_login') || 'Log In'}
          </Link>
        </p>
      </div>
    </div>
  );
}
