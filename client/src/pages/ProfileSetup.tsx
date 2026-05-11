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
      setError('Username must be 3-20 chars: lowercase letters, numbers, or underscore.');
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
      <div className="flex items-center justify-center min-h-screen bg-[var(--c-bg)] text-[var(--c-text-2)] text-sm">
        Loading…
      </div>
    );
  }

  const availabilityNote = (() => {
    switch (availability) {
      case 'checking':
        return <span className="text-xs text-[var(--c-text-2)]">Checking…</span>;
      case 'available':
        return <span className="text-xs text-[var(--c-income)]">Available</span>;
      case 'taken':
        return <span className="text-xs text-[var(--c-expense)]">Taken</span>;
      case 'invalid':
        return (
          <span className="text-xs text-[var(--c-text-2)]">
            3-20 chars: lowercase, numbers, or underscore
          </span>
        );
      default:
        return null;
    }
  })();

  return (
    <div className="h-screen overflow-hidden bg-[var(--c-bg)] flex flex-col">
      <header className="z-40 backdrop-blur bg-[color-mix(in_srgb,var(--c-bg)_85%,transparent)] border-b border-[var(--c-border)]">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between min-h-[32px]">
          <Link to="/" className="flex items-center cursor-pointer hover:opacity-75 transition-opacity">
            <FeltWordmark size="md" />
          </Link>
        </div>
      </header>
      <div className="flex-1 min-h-0 flex items-start justify-center px-6 pt-6 pb-4">
        <div className="w-full max-w-md max-h-full overflow-y-auto bg-[var(--c-card)] border border-[var(--c-border)] rounded-3xl pt-4 px-7 pb-6 shadow-sm">
        <h1 className="text-2xl font-bold text-[var(--c-text)] text-center mb-1">
          Finish setting up your profile
        </h1>
        <p className="text-sm text-[var(--c-text-2)] text-center mb-6">
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
            disabled={submitting || availability === 'checking' || availability === 'taken'}
          >
            {submitting ? 'Saving…' : 'Continue'}
          </button>
        </form>
        </div>
      </div>
    </div>
  );
}
