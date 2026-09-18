import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Phone, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { loginUser } from '../services/authService';
import { useT, getLangCode } from '../locales/index.js';
import { LANGUAGES } from '../data/mockData';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const t = useT();
  const { login, lang, setLang, isAuthenticated, user } = useApp();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [langOpen, setLangOpen] = useState(false);

  // If already logged in, redirect to appropriate portal
  const from = location.state?.from?.pathname || '/';
  React.useEffect(() => {
    if (isAuthenticated) {
      const isAdmin = Boolean(user?.is_admin || user?.role === 'admin');
      const target = isAdmin ? '/admin' : (from.startsWith('/admin') ? '/' : from);
      navigate(target, { replace: true });
    }
  }, [isAuthenticated, user, navigate, from]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError(t('auth.err_fill_all') || 'Please enter your mobile number/email and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await loginUser(identifier.trim(), password);
      login(res.access_token, res.user);
      const isAdmin = Boolean(res.user?.is_admin || res.user?.role === 'admin');
      const target = isAdmin ? '/admin' : (from.startsWith('/admin') ? '/' : from);
      navigate(target, { replace: true });
    } catch (err) {
      setError(err.message || t('auth.err_login_failed') || 'Invalid mobile number or password.');
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
        padding: '32px 16px',
        background: '#FFF9F0',
        position: 'relative',
      }}
    >
      <div style={{ width: '100%', maxWidth: '440px' }} className="gs-animate-fade-up">
        {/* Brand Header with 'ग' Earth Green badge */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <img
            src="/logo.png"
            alt="GramSaarthi Logo"
            style={{
              width: '68px', height: '68px', borderRadius: '16px',
              objectFit: 'contain',
              boxShadow: '0 4px 14px rgba(53,94,59,0.2)', marginBottom: '14px',
              display: 'inline-block',
            }}
          />
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#24302A', letterSpacing: '-0.01em' }}>
            {t('auth.login_title') || 'Welcome to GramSaarthi'}
          </h1>
          <p style={{ fontSize: '14px', color: '#5F665F', marginTop: '4px' }}>
            {t('auth.login_subtitle') || 'Login to manage your business, funding, and schemes'}
          </p>
        </div>

        {/* Form Card */}
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
            {/* Mobile / Email */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#24302A', marginBottom: '6px' }}>
                {t('auth.label_mobile_or_email') || 'Mobile Number or Email'}
              </label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#5F665F' }}>
                  <Phone size={17} />
                </div>
                <input
                  type="text"
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  placeholder={t('auth.placeholder_mobile_email') || "9876543210 or email@example.com"}
                  style={{
                    width: '100%', padding: '12px 14px 12px 42px',
                    borderRadius: '12px',
                    border: '1.5px solid #DED8CA',
                    fontSize: '15px', color: '#24302A',
                    background: '#FFF9F0', outline: 'none',
                  }}
                  autoFocus
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: '#24302A' }}>
                  {t('auth.label_password') || 'Password / PIN'}
                </label>
              </div>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#5F665F' }}>
                  <Lock size={17} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={t('auth.placeholder_password') || "Enter your password/PIN"}
                  style={{
                    width: '100%', padding: '12px 42px 12px 42px',
                    borderRadius: '12px',
                    border: '1.5px solid #DED8CA',
                    fontSize: '15px', color: '#24302A',
                    background: '#FFF9F0', outline: 'none',
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

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="gs-btn gs-btn-primary"
              style={{
                width: '100%', padding: '14px', marginTop: '8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                fontWeight: 700, fontSize: '15.5px', borderRadius: '12px',
                background: '#355E3B', color: '#FFFFFF',
              }}
            >
              {loading ? (
                <span>{t('auth.logging_in') || 'Logging in...'}</span>
              ) : (
                <>
                  <span>{t('auth.btn_login') || 'Log In'}</span>
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>

        </div>

        {/* Footer Link to Signup */}
        <p style={{ textAlign: 'center', fontSize: '14px', color: '#5F665F', marginTop: '22px' }}>
          {t('auth.no_account') || "Don't have an account?"}{' '}
          <Link to="/signup" style={{ color: '#C96B3B', fontWeight: 700, textDecoration: 'none' }}>
            {t('auth.link_signup') || 'Sign Up (Quick 1-min)'}
          </Link>
        </p>
      </div>
    </div>
  );
}
