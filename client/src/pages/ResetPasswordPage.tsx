import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../lib/auth-client';

const wrapperCls = 'min-h-screen flex items-center justify-center p-6';
const cardCls =
  'w-full max-w-md bg-[var(--bg)] border border-[var(--border)] rounded-xl p-8 shadow-[var(--shadow)]';
const titleCls = 'text-2xl font-bold text-[var(--text-h)] text-center mb-6';
const fieldWrapCls = 'flex flex-col gap-1.5';
const labelCls = 'text-sm font-medium text-[var(--text-h)]';
const inputCls =
  'px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg)] text-[var(--text-h)] text-sm transition-colors focus:outline-none focus:border-[var(--accent-border)] focus:ring-2 focus:ring-[var(--accent-bg)]';
const primaryBtn =
  'px-4 py-2.5 bg-[var(--accent)] text-white rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setError('');
    setLoading(true);
    const { error: authError } = await resetPassword({ newPassword: password, token });
    setLoading(false);
    if (authError) {
      setError(authError.message || 'Reset failed. The link may have expired.');
      return;
    }
    setDone(true);
  }

  if (!token) {
    return (
      <div className={wrapperCls}>
        <div className={cardCls}>
          <h1 className={titleCls}>Invalid link</h1>
          <p className="text-sm text-[var(--text)] mb-4">This reset link is missing or invalid.</p>
          <button className={primaryBtn} onClick={() => navigate('/auth?tab=signin')}>
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={wrapperCls}>
      <div className={cardCls}>
        <h1 className={titleCls}>Set new password</h1>
        {done ? (
          <div className="flex flex-col gap-3 text-center">
            <p className="text-sm text-[var(--text-h)]">
              Your password has been reset successfully.
            </p>
            <button className={primaryBtn} onClick={() => navigate('/auth?tab=signin')}>
              Sign in
            </button>
          </div>
        ) : (
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className={fieldWrapCls}>
              <label htmlFor="new-password" className={labelCls}>
                New password
              </label>
              <input
                id="new-password"
                type="password"
                className={inputCls}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <div className={fieldWrapCls}>
              <label htmlFor="confirm-password" className={labelCls}>
                Confirm password
              </label>
              <input
                id="confirm-password"
                type="password"
                className={inputCls}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            {error && <p className="text-sm text-red-500 m-0">{error}</p>}
            <button type="submit" className={primaryBtn} disabled={loading}>
              {loading ? 'Saving…' : 'Reset password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
