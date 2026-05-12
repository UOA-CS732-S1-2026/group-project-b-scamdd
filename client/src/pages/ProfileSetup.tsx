import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSession } from '../lib/auth-client';
import { checkUsername, getMyProfile, updateMyProfile } from '../api/profile';
import FeltWordmark from '../components/FeltWordmark';

const CURRENCIES = ['NZD', 'USD', 'AUD', 'EUR', 'GBP'];
const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

const inputCls =
  'px-4 py-2.5 border border-[var(--c-border)] rounded-xl bg-[var(--c-card)] text-[var(--c-text)] text-sm transition-colors focus:outline-none focus:border-[var(--c-text)] placeholder:text-[var(--c-text-2)]';
const labelCls = 'text-sm font-medium text-[var(--c-text)]';
const fieldCls = 'flex flex-col gap-1.5';

export default function ProfileSetup() {
  const navigate = useNavigate();
  const { data: session, isPending } = useSession();

  const [username, setUsername] = useState('');
  const [usernameNote, setUsernameNote] = useState<{ ok: boolean; msg: string } | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const usernameDebounceRef = useRef<number | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [currency, setCurrency] = useState('NZD');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isPending && !session) navigate('/auth');
  }, [session, isPending, navigate]);

  useEffect(() => {
    if (!session) return;
    (async () => {
      try {
        const me = await getMyProfile();
        if (me.profileComplete) {
          navigate('/transactions');
          return;
        }
        if (me.displayName) setDisplayName(me.displayName);
        else if (me.name) setDisplayName(me.name);
        if (me.username) setUsername(me.username);
        if (me.bio) setBio(me.bio);
        if (me.currency) setCurrency(me.currency);
      } catch {
        setError('Could not load your profile.');
      } finally {
        setLoading(false);
      }
    })();
  }, [session, navigate]);

  // Debounced username availability check
  useEffect(() => {
    if (usernameDebounceRef.current) window.clearTimeout(usernameDebounceRef.current);
    const u = username.trim().toLowerCase();
    if (!u) { setUsernameNote(null); return; }
    if (!USERNAME_RE.test(u)) {
      setUsernameNote({ ok: false, msg: 'Use 3–20 lowercase letters, numbers, or _' });
      return;
    }
    setCheckingUsername(true);
    usernameDebounceRef.current = window.setTimeout(async () => {
      try {
        const { available, reason } = await checkUsername(u);
        setUsernameNote(available ? { ok: true, msg: '@' + u + ' is available' } : { ok: false, msg: reason ?? 'Username is taken' });
      } catch { setUsernameNote(null); }
      finally { setCheckingUsername(false); }
    }, 400);
    return () => { if (usernameDebounceRef.current) window.clearTimeout(usernameDebounceRef.current); };
  }, [username]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!displayName.trim()) {
      setError('Display name is required.');
      return;
    }
    const u = username.trim().toLowerCase();
    if (!u) {
      setError('Username is required.');
      return;
    }
    if (!USERNAME_RE.test(u)) {
      setError('Username must be 3–20 lowercase letters, numbers, or _');
      return;
    }
    if (usernameNote && !usernameNote.ok) {
      setError(usernameNote.msg);
      return;
    }
    setSubmitting(true);
    try {
      await updateMyProfile({
        username: u,
        displayName: displayName.trim(),
        bio: bio.trim(),
        currency,
        profileComplete: true,
      });
      navigate('/transactions');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setSubmitting(false);
    }
  }

  if (isPending || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--c-bg)] text-[var(--c-text-2)] text-sm">
        Loading…
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-[var(--c-bg)] flex flex-col">
      <header className="z-40 backdrop-blur bg-[color-mix(in_srgb,var(--c-bg)_85%,transparent)] border-b border-[var(--c-border)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between min-h-[32px]">
          <Link to="/" className="flex items-center cursor-pointer hover:opacity-75 transition-opacity">
            <FeltWordmark size="md" />
          </Link>
        </div>
      </header>
      <div className="flex-1 min-h-0 flex items-start justify-center px-3 sm:px-6 pt-4 sm:pt-6 pb-4">
        <div className="w-full max-w-md max-h-full overflow-y-auto bg-[var(--c-card)] border border-[var(--c-border)] rounded-3xl pt-4 px-5 sm:px-7 pb-6 shadow-sm">
        <h1 className="text-2xl font-bold text-[var(--c-text)] text-center mb-1">
          Finish setting up your profile
        </h1>
        <p className="text-sm text-[var(--c-text-2)] text-center mb-6">
          Add a few basics so friends can find you.
        </p>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className={fieldCls}>
            <label htmlFor="username" className={labelCls}>
              Username <span className="text-[var(--c-text-2)] font-normal">(permanent, starts with @)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--c-text-2)] text-sm select-none">@</span>
              <input
                id="username"
                type="text"
                className={`${inputCls} pl-7 ${usernameNote && !usernameNote.ok ? 'border-red-400' : usernameNote?.ok ? 'border-green-500' : ''}`}
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/^@/, '').replace(/\s/g, '').toLowerCase())}
                placeholder="yourname"
                maxLength={20}
                autoComplete="off"
              />
            </div>
            {checkingUsername && <p className="text-xs text-[var(--c-text-2)]">Checking…</p>}
            {usernameNote && !checkingUsername && (
              <p className={`text-xs ${usernameNote.ok ? 'text-green-600' : 'text-red-500'}`}>{usernameNote.msg}</p>
            )}
          </div>

          <div className={fieldCls}>
            <label htmlFor="display-name" className={labelCls}>
              Display name <span className="text-[var(--c-text-2)] font-normal">(changeable later)</span>
            </label>
            <input
              id="display-name"
              type="text"
              className={inputCls}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              required
              maxLength={50}
            />
          </div>

          <div className={fieldCls}>
            <label htmlFor="bio" className={labelCls}>
              Bio <span className="text-[var(--c-text-2)] font-normal">(optional)</span>
            </label>
            <textarea
              id="bio"
              className={`${inputCls} resize-none`}
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={200}
              placeholder="Saving for a holiday in 2026"
            />
          </div>

          <div className={fieldCls}>
            <label htmlFor="currency" className={labelCls}>
              Currency
            </label>
            <select
              id="currency"
              className={inputCls}
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* TODO: avatar upload */}

          {error && <p className="text-sm text-[var(--c-expense)] m-0">{error}</p>}

          <button
            type="submit"
            className="px-5 py-2.5 rounded-[20px] bg-[var(--c-text)] text-[var(--c-bg)] border border-[var(--c-text)] text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            disabled={submitting}
          >
            {submitting ? 'Saving…' : 'Continue'}
          </button>
        </form>
        </div>
      </div>
    </div>
  );
}
