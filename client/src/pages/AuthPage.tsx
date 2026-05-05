import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { signIn, signUp, requestPasswordReset } from '../lib/auth-client';
import './AuthPage.css';

type Tab = 'signin' | 'signup';
type Mode = 'auth' | 'forgot' | 'forgot-sent';

export default function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'signup' ? 'signup' : 'signin';
  const [tab, setTab] = useState<Tab>(initialTab);
  const [mode, setMode] = useState<Mode>('auth');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (tab === 'signup') {
      const { error: authError } = await signUp.email({ name, email, password });
      setLoading(false);
      if (authError) {
        setError(authError.message || 'Something went wrong');
        return;
      }
    } else {
      const { error: authError } = await signIn.email({ email, password });
      setLoading(false);
      if (authError) {
        setError(authError.message || 'Invalid email or password');
        return;
      }
    }
    navigate('/');
  }

  async function handleGoogle() {
    setError('');
    await signIn.social({ provider: 'google', callbackURL: '/' });
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: authError } = await requestPasswordReset({ email, redirectTo: '/auth/reset-password' });
    setLoading(false);
    if (authError) {
      setError(authError.message || 'Something went wrong');
      return;
    }
    setMode('forgot-sent');
  }

  if (mode === 'forgot' || mode === 'forgot-sent') {
    return (
      <div className="auth-wrapper">
        <div className="auth-card">
          <h1 className="auth-title">Reset password</h1>
          {mode === 'forgot-sent' ? (
            <div className="auth-sent">
              <p>If an account exists for <strong>{email}</strong>, a reset link has been sent.</p>
              <p className="auth-sent-note">Check your inbox (or server console in dev mode).</p>
              <button className="auth-btn-primary" onClick={() => { setMode('auth'); setError(''); }}>
                Back to sign in
              </button>
            </div>
          ) : (
            <form className="auth-form" onSubmit={handleForgot}>
              <p className="auth-hint">Enter your email and we'll send you a reset link.</p>
              <div className="auth-field">
                <label htmlFor="reset-email">Email</label>
                <input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              {error && <p className="auth-error">{error}</p>}
              <button type="submit" className="auth-btn-primary" disabled={loading}>
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
              <button type="button" className="auth-link-btn" onClick={() => { setMode('auth'); setError(''); }}>
                Back to sign in
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h1 className="auth-title">Welcome</h1>

        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${tab === 'signin' ? 'active' : ''}`}
            onClick={() => { setTab('signin'); setError(''); }}
          >
            Sign in
          </button>
          <button
            type="button"
            className={`auth-tab ${tab === 'signup' ? 'active' : ''}`}
            onClick={() => { setTab('signup'); setError(''); }}
          >
            Sign up
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {tab === 'signup' && (
            <div className="auth-field">
              <label htmlFor="name">Name</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>
          )}

          <div className="auth-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="auth-field">
            <div className="auth-field-header">
              <label htmlFor="password">Password</label>
              {tab === 'signin' && (
                <button
                  type="button"
                  className="auth-forgot-link"
                  onClick={() => { setMode('forgot'); setError(''); }}
                >
                  Forgot password?
                </button>
              )}
            </div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete={tab === 'signup' ? 'new-password' : 'current-password'}
            />
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="auth-btn-primary" disabled={loading}>
            {loading ? 'Please wait…' : tab === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <div className="auth-divider"><span>or</span></div>

        <button type="button" className="auth-btn-google" onClick={handleGoogle}>
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
            <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
          </svg>
          Continue with Google
        </button>
      </div>
    </div>
  );
}
