import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../lib/auth-client';
import { getMyProfile } from '../api/profile';
import Navbar from '../components/Navbar';
import { useTheme } from '../hooks/useTheme';

interface ProfileData {
  email: string;
  name?: string | null;
  bio?: string | null;
  profileComplete: boolean;
}

export default function Profile() {
  const { data: session, isPending } = useSession();
  const navigate = useNavigate();
  const { isDark, toggle } = useTheme();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ name: '', bio: '' });

  useEffect(() => {
    if (!isPending && !session) navigate('/auth');
  }, [session, isPending, navigate]);

  useEffect(() => {
    if (session) {
      getMyProfile()
        .then((prof) => {
          setProfile(prof);
          setFormData({ name: prof.name || '', bio: prof.bio || '' });
        })
        .finally(() => setLoading(false));
    }
  }, [session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement profile update API call
    setIsEditing(false);
  };

  if (isPending || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--c-bg)] text-[var(--c-text)]">
        Loading…
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--c-bg)] text-[var(--c-text)]">
        Unable to load profile
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--c-bg)] text-[var(--c-text)]">
      <Navbar isDark={isDark} onThemeToggle={toggle} userName={profile.name ?? undefined} />

      <main className="max-w-2xl mx-auto px-6 py-8">
        <h1 className="text-4xl font-bold text-[var(--c-text)]" style={{ margin: '0 0 2rem' }}>Profile</h1>

        <div className="border border-[var(--c-border)] rounded-2xl p-8 bg-[var(--c-card)]">
          {!isEditing ? (
            <>
              <div className="mb-8">
                <div className="w-20 h-20 rounded-full flex items-center justify-center font-bold text-2xl mb-6 bg-[var(--c-avatar)] text-[var(--c-text)]">
                  {(profile.name || profile.email)[0].toUpperCase()}
                </div>

                <div className="mb-6">
                  <h2 className="text-2xl font-bold mb-2">{profile.name || 'User'}</h2>
                  <p className="text-[var(--c-text-2)]">{profile.email}</p>
                </div>

                {profile.bio && (
                  <div className="mb-6">
                    <p className="text-sm text-[var(--c-text-2)]">{profile.bio}</p>
                  </div>
                )}

                <button
                  onClick={() => setIsEditing(true)}
                  className="px-6 py-2 rounded-lg font-medium hover:opacity-80 transition-opacity bg-[var(--c-accent)] text-white"
                >
                  Edit Profile
                </button>
              </div>
            </>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2 text-[var(--c-text)]">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-[var(--c-border)] rounded-lg text-sm focus:outline-none bg-[var(--c-bg)] text-[var(--c-text)]"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium mb-2 text-[var(--c-text)]">
                  Bio
                </label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  className="w-full px-4 py-2 border border-[var(--c-border)] rounded-lg text-sm focus:outline-none bg-[var(--c-bg)] text-[var(--c-text)]"
                  rows={4}
                />
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  className="px-6 py-2 rounded-lg font-medium hover:opacity-80 transition-opacity bg-[var(--c-accent)] text-white"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-6 py-2 rounded-lg border border-[var(--c-border)] font-medium hover:opacity-80 transition-opacity text-[var(--c-text)]"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
