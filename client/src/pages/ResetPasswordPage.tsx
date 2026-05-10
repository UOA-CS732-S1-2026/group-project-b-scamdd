import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../lib/auth-client';
import { useTheme } from '../hooks/useTheme';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isDark, toggle } = useTheme();

  const token = searchParams.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const inputCls =
    'w-full px-4 py-2.5 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg)] text-[var(--c-text)] text-sm transition-colors focus:outline-none focus:border-[var(--c-accent)] placeholder:text-[var(--c-text-2)]';
  const labelCls = 'text-sm font-medium text-[var(--c-text)]';
  const primaryBtn =
    'w-full px-4 py-2.5 rounded-xl bg-[var(--c-accent)] text-white text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setError('');
    setLoading(true);
    const { error: authError } = await resetPassword({ newPassword: password, token });
    setLoading(false);
    if (authError) { setError(authError.message || 'Reset failed. The link may have expired.'); return; }
    setDone(true);
  }

  return (
    <div className="min-h-screen bg-[var(--c-bg)] flex flex-col">
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

      <div className="flex-1 flex items-center justify-center px-6 pb-12">
        <div className="w-full max-w-sm bg-[var(--c-card)] border border-[var(--c-border)] rounded-3xl p-8 shadow-sm">

          {!token ? (
            <>
              <h1 className="text-xl font-bold text-[var(--c-text)] mb-2">Invalid link</h1>
              <p className="text-sm text-[var(--c-text-2)] mb-6">This reset link is missing or invalid.</p>
              <button className={primaryBtn} onClick={() => navigate('/auth?tab=signin')}>
                Back to sign in
              </button>
            </>
          ) : done ? (
            <>
              <h1 className="text-xl font-bold text-[var(--c-text)] mb-2">Password updated</h1>
              <p className="text-sm text-[var(--c-text-2)] mb-6">Your password has been reset successfully.</p>
              <button className={primaryBtn} onClick={() => navigate('/auth?tab=signin')}>
                Sign in
              </button>
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold text-[var(--c-text)] mb-0.5">Set new password</h1>
              <p className="text-sm text-[var(--c-text-2)] mb-6">Choose a strong password for your account.</p>
              <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="new-password" className={labelCls}>New password</label>
                  <input id="new-password" type="password" className={inputCls} value={password}
                    onChange={e => setPassword(e.target.value)} required minLength={8}
                    autoComplete="new-password" placeholder="••••••••" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="confirm-password" className={labelCls}>Confirm password</label>
                  <input id="confirm-password" type="password" className={inputCls} value={confirm}
                    onChange={e => setConfirm(e.target.value)} required minLength={8}
                    autoComplete="new-password" placeholder="••••••••" />
                </div>
                {error && <p className="text-sm text-[var(--c-expense)]">{error}</p>}
                <button type="submit" className={primaryBtn} disabled={loading}>
                  {loading ? 'Saving…' : 'Reset password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}