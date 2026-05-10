import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { signIn, signUp, requestPasswordReset, useSession } from '../lib/auth-client';
import { useTheme } from '../hooks/useTheme';

type Tab = 'signin' | 'signup';
type Mode = 'auth' | 'forgot' | 'forgot-sent';

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isDark, toggle } = useTheme();

  const { data: session, isPending: sessionPending } = useSession();

  // Navigate once the session is confirmed after sign-in / sign-up
  useEffect(() => {
    if (!sessionPending && session) navigate('/dashboard', { replace: true });
  }, [session, sessionPending, navigate]);

  const initialTab = searchParams.get('tab') === 'signup' ? 'signup' : 'signin';
  const [tab, setTab] = useState<Tab>(initialTab);
  const [mode, setMode] = useState<Mode>('auth');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const inputCls =
    'w-full px-4 py-2.5 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg)] text-[var(--c-text)] text-sm transition-colors focus:outline-none focus:border-[var(--c-accent)] placeholder:text-[var(--c-text-2)]';
  const labelCls = 'text-sm font-medium text-[var(--c-text)]';
  const primaryBtn =
    'w-full px-4 py-2.5 rounded-xl bg-[var(--c-accent)] text-white text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';
  const linkBtn =
    'bg-transparent border-0 text-[var(--c-text-2)] text-sm cursor-pointer hover:text-[var(--c-accent)] transition-colors p-0';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    if (tab === 'signup') {
      const { error: authError } = await signUp.email({ name, email, password });
      if (authError) { setLoading(false); setError(authError.message || 'Something went wrong'); return; }
    } else {
      const { error: authError } = await signIn.email({ email, password });
      if (authError) { setLoading(false); setError(authError.message || 'Invalid email or password'); return; }
    }
    // On success: keep loading=true; the session useEffect will navigate when ready
  }

  async function handleGoogle() {
    setError('');
    await signIn.social({ provider: 'google', callbackURL: '/dashboard' });
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: authError } = await requestPasswordReset({ email, redirectTo: '/auth/reset-password' });
    setLoading(false);
    if (authError) { setError(authError.message || 'Something went wrong'); return; }
    setMode('forgot-sent');
  }

  return (
    <div className="min-h-screen bg-[var(--c-bg)] flex flex-col">
      {/* Minimal header */}
      <header className="flex items-center justify-between px-8 py-5">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 font-bold text-lg text-[var(--c-text)] hover:opacity-75 transition-opacity"
        >
          <span className="w-4 h-4 rounded-full bg-[var(--c-accent)] flex-shrink-0" />
          felt
        </button>
        <button
          onClick={toggle}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--c-border)] text-[var(--c-text-2)] hover:opacity-70 transition-opacity"
          aria-label="Toggle theme"
        >
          {isDark ? (
            <svg width="14" height="14" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <circle cx="7.5" cy="7.5" r="2.5" />
              <path d="M7.5 1v1.5M7.5 12.5V14M1 7.5h1.5M12.5 7.5H14M2.93 2.93l1.06 1.06M11.01 11.01l1.06 1.06M2.93 12.07l1.06-1.06M11.01 3.99l1.06-1.06" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M12.5 10A6 6 0 0 1 5 2.5a6 6 0 1 0 7.5 7.5z" />
            </svg>
          )}
        </button>
      </header>

      {/* Card */}
      <div className="flex-1 flex items-center justify-center px-6 pb-12">
        <div className="w-full max-w-sm bg-[var(--c-card)] border border-[var(--c-border)] rounded-3xl p-8 shadow-sm">

          {/* Forgot password flow */}
          {(mode === 'forgot' || mode === 'forgot-sent') && (
            <>
              <h1 className="text-xl font-bold text-[var(--c-text)] mb-1">Reset password</h1>
              {mode === 'forgot-sent' ? (
                <div className="flex flex-col gap-4 mt-4">
                  <p className="text-sm text-[var(--c-text-2)]">
                    If an account exists for <span className="text-[var(--c-text)] font-medium">{email}</span>, a reset link has been sent.
                  </p>
                  <p className="text-xs text-[var(--c-text-2)]">Check your inbox (or server console in dev mode).</p>
                  <button className={primaryBtn} onClick={() => { setMode('auth'); setError(''); }}>
                    Back to sign in
                  </button>
                </div>
              ) : (
                <form className="flex flex-col gap-4 mt-4" onSubmit={handleForgot}>
                  <p className="text-sm text-[var(--c-text-2)]">Enter your email and we'll send you a reset link.</p>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="reset-email" className={labelCls}>Email</label>
                    <input id="reset-email" type="email" className={inputCls} value={email}
                      onChange={e => setEmail(e.target.value)} required autoComplete="email" />
                  </div>
                  {error && <p className="text-sm text-[var(--c-expense)]">{error}</p>}
                  <button type="submit" className={primaryBtn} disabled={loading}>
                    {loading ? 'Sending…' : 'Send reset link'}
                  </button>
                  <button type="button" className={linkBtn} onClick={() => { setMode('auth'); setError(''); }}>
                    ← Back to sign in
                  </button>
                </form>
              )}
            </>
          )}

          {/* Main auth flow */}
          {mode === 'auth' && (
            <>
              <h1 className="text-xl font-bold text-[var(--c-text)] mb-0.5">
                {tab === 'signin' ? 'Welcome back' : 'Create account'}
              </h1>
              <p className="text-sm text-[var(--c-text-2)] mb-6">
                {tab === 'signin' ? 'Sign in to your felt account.' : 'Start tracking your money with felt.'}
              </p>

              {/* Tab switcher */}
              <div className="flex gap-1 bg-[var(--c-surface)] p-1 rounded-xl mb-6">
                {(['signin', 'signup'] as Tab[]).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { setTab(t); setError(''); }}
                    className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                      tab === t
                        ? 'bg-[var(--c-card)] text-[var(--c-text)] border border-[var(--c-border)] shadow-sm'
                        : 'text-[var(--c-text-2)] hover:text-[var(--c-text)]'
                    }`}
                  >
                    {t === 'signin' ? 'Sign in' : 'Sign up'}
                  </button>
                ))}
              </div>

              <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                {tab === 'signup' && (
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="name" className={labelCls}>Name</label>
                    <input id="name" type="text" className={inputCls} value={name}
                      onChange={e => setName(e.target.value)} required autoComplete="name" placeholder="Your name" />
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="email" className={labelCls}>Email</label>
                  <input id="email" type="email" className={inputCls} value={email}
                    onChange={e => setEmail(e.target.value)} required autoComplete="email" placeholder="you@example.com" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-baseline">
                    <label htmlFor="password" className={labelCls}>Password</label>
                    {tab === 'signin' && (
                      <button type="button" className="text-xs text-[var(--c-accent)] hover:opacity-75 transition-opacity"
                        onClick={() => { setMode('forgot'); setError(''); }}>
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <input id="password" type="password" className={inputCls} value={password}
                    onChange={e => setPassword(e.target.value)} required minLength={8}
                    autoComplete={tab === 'signup' ? 'new-password' : 'current-password'}
                    placeholder="••••••••" />
                </div>

                {error && <p className="text-sm text-[var(--c-expense)]">{error}</p>}

                <button type="submit" className={primaryBtn} disabled={loading}>
                  {loading ? 'Please wait…' : tab === 'signin' ? 'Sign in' : 'Create account'}
                </button>
              </form>

              <div className="flex items-center gap-3 my-5 text-xs text-[var(--c-text-2)]">
                <span className="flex-1 h-px bg-[var(--c-border)]" />
                <span>or</span>
                <span className="flex-1 h-px bg-[var(--c-border)]" />
              </div>

              <button
                type="button"
                onClick={handleGoogle}
                className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg)] text-[var(--c-text)] text-sm font-medium hover:opacity-80 transition-opacity cursor-pointer"
              >
                <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
                  <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                  <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                  <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
                  <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
                </svg>
                Continue with Google
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}