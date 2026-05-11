import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../lib/auth-client';
import {
  cancelRequest,
  getFriends,
  getRequests,
  respondToRequest,
  searchUser,
  sendRequest,
  unfriend,
} from '../api/friends';
import { getMyProfile } from '../api/profile';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useTheme } from '../hooks/useTheme';
import type { Friend, Requests, SearchResult } from '../types/friend';

export default function Friends() {
  const { data: session, isPending } = useSession();
  const navigate = useNavigate();
  const { isDark, toggle } = useTheme();

  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<Requests>({ incoming: [], outgoing: [] });
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  const [query, setQuery] = useState('');
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [searchError, setSearchError] = useState('');
  const [searching, setSearching] = useState(false);

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
    }
  }, [session, load]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchResult(null);
    setSearchError('');
    if (!query.trim()) return;
    setSearching(true);
    try {
      const result = await searchUser(query.trim().toLowerCase());
      setSearchResult(result);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'User not found');
    } finally {
      setSearching(false);
    }
  };

  const handleAdd = async (addresseeId: string) => {
    try {
      await sendRequest(addresseeId);
      setSearchResult((r) => (r ? { ...r, status: 'pending-out' } : r));
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to send request');
    }
  };

  const handleRespond = async (id: string, action: 'accept' | 'reject') => {
    try {
      await respondToRequest(id, action);
      load();
    } catch {
      alert('Failed to respond.');
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

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        <h1 className="text-4xl font-bold text-[var(--c-text)] mb-8" style={{ margin: '0 0 2rem' }}>Friends</h1>

        {/* Search */}
        <div className="border border-[var(--c-border)] rounded-2xl p-6 mb-8 bg-[var(--c-card)]">
          <h2 className="font-semibold mb-4">Find a friend</h2>
          <form onSubmit={handleSearch} autoComplete="off" className="flex gap-4">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter exact username"
              autoComplete="new-password"
              name="friend-search"
              className="flex-1 px-4 py-2 border border-[var(--c-border)] rounded-lg text-sm focus:outline-none bg-[var(--c-bg)] text-[var(--c-text)]"
            />
            <button
              type="submit"
              disabled={searching}
              className="px-6 py-2 rounded-lg font-medium hover:opacity-80 transition-opacity disabled:opacity-50 bg-[var(--c-accent)] text-white"
            >
              {searching ? 'Searching…' : 'Search'}
            </button>
          </form>

          {searchError && <p className="mt-3 text-sm text-red-500">{searchError}</p>}

          {searchResult && (
            <div className="mt-4 flex items-center justify-between gap-3 p-4 border border-[var(--c-border)] rounded-xl">
              <div>
                <p className="font-medium">{searchResult.displayName ?? searchResult.username}</p>
                <p className="text-sm text-[var(--c-text-2)]">@{searchResult.username}</p>
              </div>
              <SearchAction result={searchResult} onAdd={handleAdd} />
            </div>
          )}
        </div>

        {/* Pending Requests */}
        {(requests.incoming.length > 0 || requests.outgoing.length > 0) && (
          <div className="mb-8">
            <h2 className="font-semibold mb-4">Friend requests</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {requests.incoming.length > 0 && (
                <div className="border border-[var(--c-border)] rounded-2xl p-6 bg-[var(--c-card)]">
                  <h3 className="text-sm font-semibold mb-3 text-[var(--c-text-2)]">Incoming</h3>
                  <div className="flex flex-col gap-3">
                    {requests.incoming.map((r) => (
                      <div key={r.id} className="flex items-center justify-between gap-2">
                        <span className="text-sm">
                          {r.displayName ?? r.username}
                          <span className="text-[var(--c-text-2)]"> @{r.username}</span>
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleRespond(r.id, 'accept')}
                            className="px-3 py-1 rounded-lg text-xs font-medium hover:opacity-80 bg-[var(--c-accent)] text-white"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleRespond(r.id, 'reject')}
                            className="px-3 py-1 rounded-lg border border-[var(--c-border)] text-xs text-[var(--c-text-2)] hover:text-red-500 transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {requests.outgoing.length > 0 && (
                <div className="border border-[var(--c-border)] rounded-2xl p-6 bg-[var(--c-card)]">
                  <h3 className="text-sm font-semibold mb-3 text-[var(--c-text-2)]">Sent</h3>
                  <div className="flex flex-col gap-3">
                    {requests.outgoing.map((r) => (
                      <div key={r.id} className="flex items-center justify-between gap-2">
                        <span className="text-sm">
                          {r.displayName ?? r.username}
                          <span className="text-[var(--c-text-2)]"> @{r.username}</span>
                        </span>
                        <button
                          onClick={() => handleCancel(r.id)}
                          className="px-3 py-1 rounded-lg border border-[var(--c-border)] text-xs text-[var(--c-text-2)] hover:text-red-500 transition-colors"
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
        )}

        {/* Friends List */}
        <div>
          <h2 className="font-semibold mb-4">Your friends</h2>
          {friends.length === 0 ? (
            <div className="border border-[var(--c-border)] rounded-2xl p-12 text-center bg-[var(--c-card)]">
              <p className="text-[var(--c-text-2)]">
                No friends yet. Search for someone above to send a request.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {friends.map((friend) => {
                const name = friend.displayName ?? friend.username ?? 'Unknown';
                return (
                  <div
                    key={friend.id}
                    className="border border-[var(--c-border)] rounded-2xl p-6 bg-[var(--c-card)]"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">{name}</h3>
                        <p className="text-sm text-[var(--c-text-2)]">@{friend.username}</p>
                        {friend.bio && (
                          <p className="text-xs mt-1 text-[var(--c-text-2)]">{friend.bio}</p>
                        )}
                      </div>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center font-semibold flex-shrink-0 bg-[var(--c-avatar)] text-[var(--c-text)]">
                        {name[0].toUpperCase()}
                      </div>
                    </div>

                    {friend.goals.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs uppercase tracking-wider mb-2 text-[var(--c-text-2)]">
                          Goals
                        </p>
                        {friend.goals.map((g) => {
                          const pct = Math.min(
                            100,
                            Math.round((g.currentAmount / g.targetAmount) * 100),
                          );
                          return (
                            <div key={g.id} className="mb-2">
                              <div className="flex justify-between text-xs mb-1">
                                <span>{g.name}</span>
                                <span className="text-[var(--c-text-2)]">{pct}%</span>
                              </div>
                              <div className="w-full h-1.5 rounded-full overflow-hidden bg-[var(--c-border)]">
                                <div
                                  style={{ width: `${pct}%` }}
                                  className="h-full bg-[var(--c-accent)]"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <button
                      onClick={() => handleUnfriend(friend.id, name)}
                      className="w-full text-sm font-medium text-red-500 hover:opacity-60 transition-opacity"
                    >
                      Unfriend
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

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
          className="px-4 py-2 rounded-lg text-sm font-medium hover:opacity-80 transition-opacity bg-[var(--c-accent)] text-white"
        >
          Add friend
        </button>
      );
  }
}
