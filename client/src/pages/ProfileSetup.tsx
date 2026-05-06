import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../lib/auth-client';
import { checkUsername, getMyProfile, updateMyProfile } from '../api/profile';

const CURRENCIES = ['NZD', 'USD', 'AUD', 'EUR', 'GBP'];
const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

const inputCls =
  'px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg)] text-[var(--text-h)] text-sm transition-colors focus:outline-none focus:border-[var(--accent-border)] focus:ring-2 focus:ring-[var(--accent-bg)]';
const labelCls = 'text-sm font-medium text-[var(--text-h)]';
const fieldCls = 'flex flex-col gap-1.5';

type Availability = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

export default function ProfileSetup() {
  const navigate = useNavigate();
  const { data: session, isPending } = useSession();

  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [currency, setCurrency] = useState('NZD');
  const [availability, setAvailability] = useState<Availability>('idle');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const debounceRef = useRef<number | null>(null);

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

  useEffect(() => {
    if (!username) {
      setAvailability('idle');
      return;
    }
    if (!USERNAME_RE.test(username)) {
      setAvailability('invalid');
      return;
    }
    setAvailability('checking');
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      try {
        const { available } = await checkUsername(username);
        setAvailability(available ? 'available' : 'taken');
      } catch {
        setAvailability('idle');
      }
    }, 350);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [username]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!USERNAME_RE.test(username)) {
      setError('Username must be 3–20 chars: lowercase letters, numbers, or underscore.');
      return;
    }
    if (availability === 'taken') {
      setError('That username is taken.');
      return;
    }
    if (!displayName.trim()) {
      setError('Display name is required.');
      return;
    }
    setSubmitting(true);
    try {
      await updateMyProfile({
        username,
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
      <div className="flex items-center justify-center min-h-screen text-[var(--text)]">
        Loading…
      </div>
    );
  }

  const availabilityNote = (() => {
    switch (availability) {
      case 'checking':
        return <span className="text-xs text-[var(--text)]">Checking…</span>;
      case 'available':
        return <span className="text-xs text-green-600">Available</span>;
      case 'taken':
        return <span className="text-xs text-red-500">Taken</span>;
      case 'invalid':
        return (
          <span className="text-xs text-[var(--text)]">
            3–20 chars: lowercase, numbers, or underscore
          </span>
        );
      default:
        return null;
    }
  })();

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-[var(--bg)] border border-[var(--border)] rounded-xl p-8 shadow-[var(--shadow)]">
        <h1 className="text-2xl font-bold text-[var(--text-h)] text-center mb-1">
          Finish setting up your profile
        </h1>
        <p className="text-sm text-[var(--text)] text-center mb-6">
          Pick a username and a few basics so friends can find you.
        </p>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className={fieldCls}>
            <div className="flex justify-between items-baseline">
              <label htmlFor="username" className={labelCls}>
                Username
              </label>
              {availabilityNote}
            </div>
            <input
              id="username"
              type="text"
              className={inputCls}
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="atulbox"
              autoComplete="username"
              required
              minLength={3}
              maxLength={20}
            />
          </div>

          <div className={fieldCls}>
            <label htmlFor="display-name" className={labelCls}>
              Display name
            </label>
            <input
              id="display-name"
              type="text"
              className={inputCls}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Atul Kodla"
              required
              maxLength={50}
            />
          </div>

          <div className={fieldCls}>
            <label htmlFor="bio" className={labelCls}>
              Bio <span className="text-[var(--text)] font-normal">(optional)</span>
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

          {error && <p className="text-sm text-red-500 m-0">{error}</p>}

          <button
            type="submit"
            className="px-4 py-2.5 bg-[var(--accent)] text-white rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            disabled={submitting || availability === 'checking' || availability === 'taken'}
          >
            {submitting ? 'Saving…' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
