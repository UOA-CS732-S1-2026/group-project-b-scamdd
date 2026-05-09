import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { signIn, signUp, requestPasswordReset } from '../lib/auth-client';

type Tab = 'signin' | 'signup';
type Mode = 'auth' | 'forgot' | 'forgot-sent';

const cardCls =
  'w-full max-w-md bg-[var(--bg)] border border-[var(--border)] rounded-xl p-8 shadow-[var(--shadow)]';
const wrapperCls = 'min-h-screen flex items-center justify-center p-6';
const titleCls = 'text-2xl font-bold text-[var(--text-h)] text-center mb-6';
const fieldWrapCls = 'flex flex-col gap-1.5';
const labelCls = 'text-sm font-medium text-[var(--text-h)]';
const inputCls =
  'px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg)] text-[var(--text-h)] text-sm transition-colors focus:outline-none focus:border-[var(--accent-border)] focus:ring-2 focus:ring-[var(--accent-bg)]';
const primaryBtn =
  'px-4 py-2.5 bg-[var(--accent)] text-white rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer';
const linkBtn =
  'bg-transparent border-0 text-[var(--text)] text-sm cursor-pointer underline underline-offset-2 py-1 hover:text-[var(--accent)]';
const errorCls = 'text-sm text-red-500 m-0';

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
    navigate('/dashboard');
  }

  async function handleGoogle() {
    setError('');
    await signIn.social({ provider: 'google', callbackURL: '/dashboard' });
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: authError } = await requestPasswordReset({
      email,
      redirectTo: '/auth/reset-password',
    });
    setLoading(false);
    if (authError) {
      setError(authError.message || 'Something went wrong');
      return;
    }
    setMode('forgot-sent');
  }

  if (mode === 'forgot' || mode === 'forgot-sent') {
    return (
      <div className={wrapperCls}>
        <div className={cardCls}>
          <h1 className={titleCls}>Reset password</h1>
          {mode === 'forgot-sent' ? (
            <div className="flex flex-col gap-3 text-center">
              <p className="text-sm text-[var(--text-h)]">
                If an account exists for <strong>{email}</strong>, a reset link has been sent.
              </p>
              <p className="text-xs text-[var(--text)]">
                Check your inbox (or server console in dev mode).
              </p>
              <button
                className={primaryBtn}
                onClick={() => {
                  setMode('auth');
                  setError('');
                }}
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <form className="flex flex-col gap-4" onSubmit={handleForgot}>
              <p className="text-sm text-[var(--text)] m-0">
                Enter your email and we'll send you a reset link.
              </p>
              <div className={fieldWrapCls}>
                <label htmlFor="reset-email" className={labelCls}>
                  Email
                </label>
                <input
                  id="reset-email"
                  type="email"
                  className={inputCls}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              {error && <p className={errorCls}>{error}</p>}
              <button type="submit" className={primaryBtn} disabled={loading}>
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
              <button
                type="button"
                className={linkBtn}
                onClick={() => {
                  setMode('auth');
                  setError('');
                }}
              >
                Back to sign in
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  const tabBase =
    'flex-1 px-4 py-2 bg-transparent border-0 cursor-pointer text-sm transition-colors';
  const tabActive = `${tabBase} bg-[var(--accent-bg)] text-[var(--accent)] font-semibold`;
  const tabInactive = `${tabBase} text-[var(--text)]`;

  return (
    <div className={wrapperCls}>
      <div className={cardCls}>
        <h1 className={titleCls}>Welcome</h1>

        <div className="flex border border-[var(--border)] rounded-lg overflow-hidden mb-6">
          <button
            type="button"
            className={tab === 'signin' ? tabActive : tabInactive}
            onClick={() => {
              setTab('signin');
              setError('');
            }}
          >
            Sign in
          </button>
          <button
            type="button"
            className={tab === 'signup' ? tabActive : tabInactive}
            onClick={() => {
              setTab('signup');
              setError('');
            }}
          >
            Sign up
          </button>
        </div>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          {tab === 'signup' && (
            <div className={fieldWrapCls}>
              <label htmlFor="name" className={labelCls}>
                Name
              </label>
              <input
                id="name"
                type="text"
                className={inputCls}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>
          )}

          <div className={fieldWrapCls}>
            <label htmlFor="email" className={labelCls}>
              Email
            </label>
            <input
              id="email"
              type="email"
              className={inputCls}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className={fieldWrapCls}>
            <div className="flex justify-between items-baseline">
              <label htmlFor="password" className={labelCls}>
                Password
              </label>
              {tab === 'signin' && (
                <button
                  type="button"
                  className="bg-transparent border-0 text-xs text-[var(--accent)] cursor-pointer p-0 underline underline-offset-2 hover:opacity-75"
                  onClick={() => {
                    setMode('forgot');
                    setError('');
                  }}
                >
                  Forgot password?
                </button>
              )}
            </div>
            <input
              id="password"
              type="password"
              className={inputCls}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete={tab === 'signup' ? 'new-password' : 'current-password'}
            />
          </div>

          {error && <p className={errorCls}>{error}</p>}

          <button type="submit" className={primaryBtn} disabled={loading}>
            {loading ? 'Please wait…' : tab === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <div className="flex items-center gap-3 my-5 text-xs text-[var(--text)]">
          <span className="flex-1 h-px bg-[var(--border)]" />
          <span>or</span>
          <span className="flex-1 h-px bg-[var(--border)]" />
        </div>

        <button
          type="button"
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-sm font-medium text-[var(--text-h)] cursor-pointer transition-colors hover:bg-[var(--code-bg)]"
          onClick={handleGoogle}
        >
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
