import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession, signOut } from '../lib/auth-client';
import { getMyProfile, updateMyProfile } from '../api/profile';
import type { Profile as ProfileType } from '../types/profile';

const CURRENCIES = ['NZD', 'USD', 'AUD', 'EUR', 'GBP'];

const inputCls =
  'px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg)] text-[var(--text-h)] text-sm transition-colors focus:outline-none focus:border-[var(--accent-border)] focus:ring-2 focus:ring-[var(--accent-bg)]';
const labelCls = 'text-sm font-medium text-[var(--text-h)]';
const fieldCls = 'flex flex-col gap-1.5';

export default function Profile() {
  const navigate = useNavigate();
  const { data: session, isPending } = useSession();

  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [currency, setCurrency] = useState('NZD');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isPending && !session) navigate('/auth');
  }, [session, isPending, navigate]);

  useEffect(() => {
    if (!session) return;
    (async () => {
      try {
        const me = await getMyProfile();
        setProfile(me);
        setDisplayName(me.displayName ?? '');
        setBio(me.bio ?? '');
        setCurrency(me.currency);
      } catch {
        setError('Failed to load profile.');
      }
    })();
  }, [session]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!displayName.trim()) {
      setError('Display name is required.');
      return;
    }
    setSaving(true);
    try {
      const updated = await updateMyProfile({
        displayName: displayName.trim(),
        bio: bio.trim(),
        currency,
      });
      setProfile(updated);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen text-[var(--text)]">
        Loading…
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-h)]">Profile</h1>
        <button
          onClick={() => signOut().then(() => navigate('/'))}
          className="px-3 py-1.5 border border-[var(--border)] rounded-lg text-sm text-[var(--text-h)] hover:bg-[var(--code-bg)] cursor-pointer"
        >
          Sign out
        </button>
      </div>

      <div className="border border-[var(--border)] rounded-xl p-6 bg-[var(--bg)]">
        {!editing ? (
          <div className="flex flex-col gap-4">
            <Row label="Username" value={profile.username ? `@${profile.username}` : '-'} />
            <Row label="Display name" value={profile.displayName ?? '-'} />
            <Row label="Email" value={profile.email} />
            <Row label="Bio" value={profile.bio || '-'} />
            <Row label="Currency" value={profile.currency} />
            <button
              onClick={() => setEditing(true)}
              className="self-start mt-2 px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm font-semibold hover:opacity-90 cursor-pointer"
            >
              Edit profile
            </button>
          </div>
        ) : (
          <form className="flex flex-col gap-4" onSubmit={handleSave}>
            <div className={fieldCls}>
              <label className={labelCls}>Username</label>
              <p className="text-sm text-[var(--text)]">
                {profile.username ? `@${profile.username}` : '-'} (cannot be changed)
              </p>
            </div>

            <div className={fieldCls}>
              <label htmlFor="displayName" className={labelCls}>
                Display name
              </label>
              <input
                id="displayName"
                className={inputCls}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={50}
                required
              />
            </div>

            <div className={fieldCls}>
              <label htmlFor="bio" className={labelCls}>
                Bio
              </label>
              <textarea
                id="bio"
                className={`${inputCls} resize-none`}
                rows={2}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={200}
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

            {error && <p className="text-sm text-red-500 m-0">{error}</p>}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-60 cursor-pointer"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setDisplayName(profile.displayName ?? '');
                  setBio(profile.bio ?? '');
                  setCurrency(profile.currency);
                  setError('');
                }}
                className="px-4 py-2 border border-[var(--border)] text-[var(--text-h)] rounded-lg text-sm hover:bg-[var(--code-bg)] cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs uppercase tracking-wider text-[var(--text)]">{label}</span>
      <span className="text-sm text-[var(--text-h)]">{value}</span>
    </div>
  );
}
