import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../lib/auth-client';
import {
  cancelRequest,
  getFriends,
  getRequests,
  searchUser,
  sendRequest,
  unfriend,
} from '../api/friends';
import { getMyProfile } from '../api/profile';
import { getTransactions } from '../api/transactions';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Highlight from '../components/Highlight';
import { useTheme } from '../hooks/useTheme';
import { useProfileAvatar } from '../context/ProfileContext';
import type { Friend, Requests, SearchResult } from '../types/friend';

const AVATAR_PALETTE = ['#FFBDC2', '#FDFBD4', '#C5FFD8', '#C68BE1', '#C5ECF9', '#CBCBCB'];

const SAMPLE_ACHIEVEMENTS = [
  'Stayed under budget for two months!',
  'Hit 100 logged transactions!',
  'No regret tags in 2 weeks!',
  'Stayed under budget for ten weeks!',
  'Income increased by 10%!',
  'Completed their budget this week!',
  'Completed their budget last month!',
  'Spent 47% less on entertainment last week!',
];

const initials = (name: string) =>
  name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?';

function IconHeart({ filled = false }: { filled?: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 15 15"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M7.5 13s-5-3.1-5-6.6A2.7 2.7 0 0 1 7.5 4.6a2.7 2.7 0 0 1 5 1.8C12.5 9.9 7.5 13 7.5 13z" />
    </svg>
  );
}

function IconFire() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 15 15"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M7.5 13.5c2.6 0 4.5-1.9 4.5-4.2 0-1.6-.9-2.7-2-3.6-.4 1.1-1.3 1.6-2 1.6 0-1.6-.6-3.7-2.8-6 0 4.2-2.7 5.3-2.7 8.4 0 2.3 1.9 3.8 5 3.8z" />
      <path d="M7.5 11c1 0 1.8-.7 1.8-1.7 0-1.1-1-1.5-1.5-3-.4 1-1.2 1.4-2 1.4 0 1.4.7 3.3 1.7 3.3z" />
    </svg>
  );
}

function computeStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const dayKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const set = new Set(dates.map((d) => dayKey(new Date(d))));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cur = new Date(today);
  if (!set.has(dayKey(cur))) cur.setDate(cur.getDate() - 1);
  let n = 0;
  while (set.has(dayKey(cur))) {
    n++;
    cur.setDate(cur.getDate() - 1);
    if (n > 3650) break;
  }
  return n;
}

export default function Friends() {
  const { data: session, isPending } = useSession();
  const navigate = useNavigate();
  const { isDark, toggle } = useTheme();
  const { avatarColor: myAvatarColor, avatarImage: myAvatarImage } = useProfileAvatar();

  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<Requests>({ incoming: [], outgoing: [] });
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [myStreak, setMyStreak] = useState(0);

  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchError, setSearchError] = useState('');
  const [searching, setSearching] = useState(false);
  const searchDebounceRef = useRef<number | null>(null);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [likedAchievements, setLikedAchievements] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem('liked-achievements-v1');
      return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
    } catch { return new Set(); }
  });
  const [showMyLikes, setShowMyLikes] = useState(false);

  useEffect(() => {
    try { localStorage.setItem('liked-achievements-v1', JSON.stringify([...likedAchievements])); } catch { /* ignore */ }
  }, [likedAchievements]);

  useEffect(() => {
    if (!isPending && !session) navigate('/auth');
  }, [session, isPending, navigate]);

  const load = useCallback(async () => {
    try {
      const [f, r] = await Promise.all([getFriends(), getRequests()]);
      setFriends(f);
      setRequests(r);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) {
      load();
      getMyProfile().then(setProfile).catch(console.error);
      getTransactions()
        .then((txns) => setMyStreak(computeStreak(txns.map((t) => t.date))))
        .catch(console.error);
    }
  }, [session, load]);

  // Live debounced search as user types
  useEffect(() => {
    if (searchDebounceRef.current) window.clearTimeout(searchDebounceRef.current);
    const q = query.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setSearchError('');
      setSearching(false);
      return;
    }
    setSearching(true);
    // strip leading @ so users can type @username and it still works
    const bare = q.startsWith('@') ? q.slice(1) : q;
    searchDebounceRef.current = window.setTimeout(async () => {
      try {
        const results = await searchUser(bare);
        setSearchResults(results);
        setSearchError(results.length === 0 ? 'No users found' : '');
      } catch (err) {
        setSearchError(err instanceof Error ? err.message : 'Search failed');
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      if (searchDebounceRef.current) window.clearTimeout(searchDebounceRef.current);
    };
  }, [query]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
  };

  const handleAdd = async (addresseeId: string) => {
    try {
      await sendRequest(addresseeId);
      setSearchResults((prev) => prev.map((r) => r.id === addresseeId ? { ...r, status: 'pending-out' } : r));
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to send request');
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await cancelRequest(id);
      load();
    } catch {
      alert('Failed to cancel.');
    }
  };

  const handleUnfriend = async (friendId: string, displayName: string) => {
    if (!confirm(`Unfriend ${displayName}?`)) return;
    try {
      await unfriend(friendId);
      setFriends((fs) => fs.filter((f) => f.id !== friendId));
    } catch {
      alert('Failed to unfriend.');
    }
  };

  if (isPending || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--c-bg)] text-[var(--c-text)]">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--c-bg)] text-[var(--c-text)]">
      <Navbar isDark={isDark} onThemeToggle={toggle} userName={profile?.name} />

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-8">
        <div className="flex justify-between items-start gap-4 mb-2">
          <h1 className="text-4xl font-bold" style={{ margin: 0 }}>
            <Highlight className="px-3 py-1">Friends</Highlight>
          </h1>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setShowSearchModal(true)}
              className="px-5 py-2 rounded-[20px] text-sm font-semibold border border-[var(--c-text)] bg-[var(--c-text)] text-[var(--c-bg)] hover:opacity-90 transition-opacity cursor-pointer"
            >
              + Add a friend
            </button>
            <button
              type="button"
              onClick={() => setShowFriendsModal(true)}
              className="px-5 py-2 rounded-[20px] text-sm font-semibold border border-[var(--c-text)] bg-[var(--c-card)] text-[var(--c-text)] hover:bg-[var(--c-nav-active)] transition-colors cursor-pointer"
            >
              Your friends
            </button>
          </div>
        </div>
        <p className="text-sm text-[var(--c-text-2)] mt-2 mb-8">
          {friends.length} friend{friends.length === 1 ? '' : 's'} · cheering each other on without showing the dollar amounts.
        </p>

        {/* Achievements + Streak board */}
        {(() => {
          const myName = profile?.displayName || profile?.name || 'You';
          const myEntry = { id: 'me', name: myName, streak: myStreak, isMe: true, color: myAvatarColor, image: myAvatarImage };
          const friendEntries = friends.map((f) => ({
            id: f.id,
            name: f.displayName ?? 'Friend',
            streak: f.streak,
            isMe: false,
            color: f.avatarColor ?? '#C68BE1',
            image: f.avatarImage ?? null,
          }));
          const everyone = [myEntry, ...friendEntries];
          const achievementsFeed = everyone.slice(0, 8);
          const streakBoard = [...everyone].sort((a, b) => b.streak - a.streak).slice(0, 5);
          return (
            <div className="grid md:grid-cols-[2fr_1fr] gap-6 mb-8">
              <div className="border border-[rgba(109,109,109,0.8)] rounded-3xl p-6 bg-[var(--c-card)]">
                <h2 className="font-semibold text-[var(--c-text)] mb-1">Recent achievements</h2>
                <p className="text-xs text-[var(--c-text-2)] mb-4">Cheer a friend on!</p>
                <div className="flex flex-col gap-3">
                  {achievementsFeed.map((e, i) => {
                    const message = e.isMe
                      ? 'You just hit a new streak high!'
                      : SAMPLE_ACHIEVEMENTS[i % SAMPLE_ACHIEVEMENTS.length];
                    const liked = likedAchievements.has(e.id);
                    return (
                      <div key={e.id} className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border-[3px] border-white text-[var(--c-text)] flex-shrink-0 overflow-hidden"
                          style={{ backgroundColor: e.image ? 'transparent' : e.color }}
                        >
                          {e.image
                            ? <img src={e.image} alt={e.name} className="w-full h-full object-cover" />
                            : initials(e.name)}
                        </div>
                        <p className="text-sm text-[var(--c-text)] truncate flex-1 min-w-0">
                          <span className="font-semibold">{e.isMe ? 'You' : e.name}</span>{' '}
                          <span className="text-[var(--c-text-2)]">{message}</span>
                        </p>
                        {e.isMe ? (
                          <button
                            type="button"
                            onClick={() => setShowMyLikes(true)}
                            className="flex-shrink-0 cursor-pointer hover:scale-110 transition-transform text-[#E11D48]"
                            aria-label="See who liked this"
                          >
                            <IconHeart filled />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setLikedAchievements(s => {
                              const next = new Set(s);
                              if (next.has(e.id)) next.delete(e.id); else next.add(e.id);
                              return next;
                            })}
                            aria-label={liked ? 'Unlike' : 'Like'}
                            aria-pressed={liked}
                            className={`flex-shrink-0 cursor-pointer hover:scale-110 transition-transform ${liked ? 'text-[#E11D48]' : 'text-[var(--c-text-2)]'}`}
                          >
                            <IconHeart filled={liked} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="border border-[rgba(109,109,109,0.8)] rounded-3xl p-6 bg-[#C5FFD8]">
                <h2 className="font-semibold text-[var(--c-tint-text)] mb-4">Streak board</h2>
                <div className="flex flex-col gap-4">
                  {streakBoard.map((e, i) => (
                    <div key={e.id} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-[var(--c-tint-text-2)] w-6">#{i + 1}</span>
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-[3px] border-white text-[var(--c-tint-text)] flex-shrink-0 overflow-hidden"
                        style={{ backgroundColor: e.image ? 'transparent' : e.color }}
                      >
                        {e.image
                          ? <img src={e.image} alt={e.name} className="w-full h-full object-cover" />
                          : initials(e.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--c-tint-text)] truncate">
                          {e.isMe ? 'You' : e.name}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-[var(--c-tint-text)] flex-shrink-0 inline-flex items-center gap-1">
                        <span className="text-[#F97316]"><IconFire /></span>
                        {e.streak}d
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}



      </main>

      {/* Add a friend modal */}
      {showSearchModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) { setShowSearchModal(false); setSearchResults([]); setSearchError(''); } }}
        >
          <div className="w-full max-w-lg bg-[var(--c-card)] border border-[rgba(109,109,109,0.8)] rounded-3xl flex flex-col max-h-[90vh]">
            <div className="px-7 pt-6 pb-3 flex justify-between items-start flex-shrink-0">
              <div>
                <h2 className="text-2xl font-bold text-[var(--c-text)]">Add a friend</h2>
                <p className="text-sm text-[var(--c-text-2)] mt-1">Search by display name or @username.</p>
              </div>
              <button
                type="button"
                onClick={() => { setShowSearchModal(false); setSearchResults([]); setSearchError(''); }}
                aria-label="Close"
                className="text-2xl leading-none text-[var(--c-text-2)] hover:text-[var(--c-text)] cursor-pointer px-2"
              >
                ×
              </button>
            </div>
            <div className="overflow-y-auto px-7 pb-7">
              <form onSubmit={handleSearch} autoComplete="off" className="relative">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name or @username"
                  autoComplete="new-password"
                  name="friend-search"
                  className="w-full px-4 py-2 pr-10 border border-[rgba(109,109,109,0.5)] rounded-2xl text-sm focus:outline-none focus:border-[var(--c-text)] bg-[var(--c-card)] text-[var(--c-text)] placeholder:text-[var(--c-text-2)] transition-colors"
                />
                {searching && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--c-text-2)] text-xs animate-pulse">…</span>
                )}
              </form>
              {searchError && <p className="mt-3 text-sm text-[var(--c-expense)]">{searchError}</p>}
              {searchResults.length > 0 && (
                <div className="mt-4 flex flex-col gap-2">
                  {searchResults.map((r) => (
                    <div key={r.id} className="flex items-center justify-between gap-3 p-4 border border-[rgba(109,109,109,0.5)] rounded-2xl bg-[var(--c-card)]">
                      <div>
                        <p className="font-medium text-[var(--c-text)]">{r.displayName ?? r.username ?? 'Unknown'}</p>
                        {r.username && <p className="text-xs text-[var(--c-text-2)] mt-0.5">@{r.username}</p>}
                      </div>
                      <SearchAction result={r} onAdd={handleAdd} />
                    </div>
                  ))}
                </div>
              )}

              {requests.outgoing.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-xs font-semibold mb-3 text-[var(--c-text-2)] uppercase tracking-wide">Sent</h3>
                  <div className="flex flex-col gap-2">
                    {requests.outgoing.map((r) => (
                      <div key={r.id} className="flex items-center justify-between gap-2 p-3 rounded-2xl border border-[rgba(109,109,109,0.5)] bg-[var(--c-card)]">
                        <span className="text-sm text-[var(--c-text)] truncate">
                          {r.displayName ?? 'Unknown'}
                        </span>
                        <button
                          onClick={() => handleCancel(r.id)}
                          className="px-3 py-1 rounded-full border border-[rgba(109,109,109,0.5)] bg-[var(--c-card)] text-xs text-[var(--c-text-2)] hover:text-[var(--c-expense)] hover:border-[var(--c-expense)] transition-colors flex-shrink-0"
                        >
                          Cancel
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Your friends modal */}
      {showFriendsModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowFriendsModal(false); }}
        >
          <div className="w-full max-w-lg bg-[var(--c-card)] border border-[rgba(109,109,109,0.8)] rounded-3xl flex flex-col max-h-[90vh]">
            <div className="px-7 pt-6 pb-3 flex justify-between items-start flex-shrink-0">
              <div>
                <h2 className="text-2xl font-bold text-[var(--c-text)]">Your friends</h2>
                <p className="text-sm text-[var(--c-text-2)] mt-1">{friends.length} friend{friends.length === 1 ? '' : 's'}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowFriendsModal(false)}
                aria-label="Close"
                className="text-2xl leading-none text-[var(--c-text-2)] hover:text-[var(--c-text)] cursor-pointer px-2"
              >
                ×
              </button>
            </div>
            <div className="overflow-y-auto px-7 pb-7">
              {friends.length === 0 ? (
                <p className="text-sm text-[var(--c-text-2)] text-center py-8">
                  No friends yet. Use “Add a friend” to send a request.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {friends.map((friend) => {
                    const name = friend.displayName ?? 'Unknown';
                    const color = friend.avatarColor ?? '#C68BE1';
                    return (
                      <div
                        key={friend.id}
                        className="flex items-center gap-3 p-3 rounded-2xl border border-[rgba(109,109,109,0.5)] bg-[var(--c-card)]"
                      >
                        <div
                          className="w-11 h-11 rounded-full flex items-center justify-center font-bold border-[3px] border-white text-[var(--c-text)] flex-shrink-0 overflow-hidden"
                          style={{ backgroundColor: friend.avatarImage ? 'transparent' : color }}
                        >
                          {friend.avatarImage
                            ? <img src={friend.avatarImage} alt={name} className="w-full h-full object-cover" />
                            : initials(name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[var(--c-text)] truncate">{name}</p>
                        </div>
                        <button
                          onClick={() => handleUnfriend(friend.id, name)}
                          className="px-3 py-1.5 rounded-full text-xs font-medium border border-[rgba(109,109,109,0.5)] bg-[var(--c-card)] text-[var(--c-text-2)] hover:text-[var(--c-expense)] hover:border-[var(--c-expense)] transition-colors cursor-pointer flex-shrink-0"
                        >
                          Unfriend
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Who liked your achievement modal */}
      {showMyLikes && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowMyLikes(false); }}
        >
          <div className="w-full max-w-sm bg-[var(--c-card)] border border-[rgba(109,109,109,0.8)] rounded-3xl">
            <div className="px-7 pt-6 pb-3 flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-[var(--c-text)]">Liked by</h2>
                <p className="text-xs text-[var(--c-text-2)] mt-1">Friends who cheered your achievement.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowMyLikes(false)}
                aria-label="Close"
                className="text-2xl leading-none text-[var(--c-text-2)] hover:text-[var(--c-text)] cursor-pointer px-2"
              >
                ×
              </button>
            </div>
            <div className="px-7 pb-7">
              {friends.length === 0 ? (
                <p className="text-sm text-[var(--c-text-2)] text-center py-6">No likes yet.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {friends.slice(0, 3).map((f, i) => {
                    const name = f.displayName ?? f.username ?? 'Friend';
                    const color = AVATAR_PALETTE[i % AVATAR_PALETTE.length];
                    return (
                      <div key={f.id} className="flex items-center gap-3 p-2 rounded-2xl">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border-[3px] border-white text-[var(--c-text)] flex-shrink-0"
                          style={{ backgroundColor: color }}
                        >
                          {initials(name)}
                        </div>
                        <p className="text-sm font-medium text-[var(--c-text)] flex-1 truncate">{name}</p>
                        <span className="flex-shrink-0 text-[#E11D48]"><IconHeart filled /></span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

function SearchAction({
  result,
  onAdd,
}: {
  result: SearchResult;
  onAdd: (id: string) => void;
}) {
  switch (result.status) {
    case 'self':
      return <span className="text-sm text-[var(--c-text-2)]">That's you</span>;
    case 'accepted':
      return <span className="text-sm font-medium text-[var(--c-accent)]">Already friends</span>;
    case 'pending-out':
      return <span className="text-sm text-[var(--c-text-2)]">Request sent</span>;
    case 'pending-in':
      return <span className="text-sm text-[var(--c-text-2)]">Awaiting your response</span>;
    default:
      return (
        <button
          onClick={() => onAdd(result.id)}
          className="px-4 py-2 rounded-[20px] text-sm font-semibold border border-[var(--c-text)] bg-[var(--c-text)] text-[var(--c-bg)] hover:opacity-90 transition-opacity cursor-pointer"
        >
          Add friend
        </button>
      );
  }
}
