import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  cancelRequest,
  getFriends,
  getRequests,
  respondToRequest,
  searchUser,
  sendRequest,
  unfriend,
} from '../api/friends';
import type { Friend, Requests, SearchResult } from '../types/friend';

export default function Friends() {
  const navigate = useNavigate();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<Requests>({ incoming: [], outgoing: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [query, setQuery] = useState('');
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [searchError, setSearchError] = useState('');
  const [searching, setSearching] = useState(false);

  const load = useCallback(async () => {
    try {
      const [f, r] = await Promise.all([getFriends(), getRequests()]);
      setFriends(f);
      setRequests(r);
    } catch {
      setError('Failed to load friends.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearchResult(null);
    setSearchError('');
    if (!query.trim()) return;
    setSearching(true);
    try {
      const result = await searchUser(query.trim().toLowerCase());
      setSearchResult(result);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setSearching(false);
    }
  }

  async function handleAdd(addresseeId: string) {
    try {
      await sendRequest(addresseeId);
      setSearchResult((r) => (r ? { ...r, status: 'pending-out' } : r));
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to send request');
    }
  }

  async function handleRespond(id: string, action: 'accept' | 'reject') {
    try {
      await respondToRequest(id, action);
      load();
    } catch {
      alert('Failed to respond.');
    }
  }

  async function handleCancel(id: string) {
    try {
      await cancelRequest(id);
      load();
    } catch {
      alert('Failed to cancel.');
    }
  }

  async function handleUnfriend(friendId: string, displayName: string) {
    if (!confirm(`Unfriend ${displayName}?`)) return;
    try {
      await unfriend(friendId);
      setFriends((fs) => fs.filter((f) => f.id !== friendId));
    } catch {
      alert('Failed to unfriend.');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-[var(--text)]">
        Loading…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen text-red-500">{error}</div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/')}
          className="text-sm text-[var(--text)] hover:text-[var(--accent)]"
        >
          ← Home
        </button>
        <h1 className="text-2xl font-bold text-[var(--text-h)]">Friends</h1>
      </div>

      <section className="mb-8 border border-[var(--border)] rounded-xl p-5 bg-[var(--bg)]">
        <h2 className="text-lg font-semibold text-[var(--text-h)] mb-3">Find a friend</h2>
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="enter exact username"
            className="flex-1 px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg)] text-[var(--text-h)] text-sm focus:outline-none focus:border-[var(--accent-border)] focus:ring-2 focus:ring-[var(--accent-bg)]"
          />
          <button
            type="submit"
            disabled={searching}
            className="px-4 py-2.5 bg-[var(--accent)] text-white rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-60 cursor-pointer"
          >
            {searching ? 'Searching…' : 'Search'}
          </button>
        </form>

        {searchError && <p className="mt-3 text-sm text-red-500">{searchError}</p>}

        {searchResult && (
          <div className="mt-4 flex items-center justify-between gap-3 p-3 border border-[var(--border)] rounded-lg">
            <div>
              <p className="text-sm font-medium text-[var(--text-h)]">
                {searchResult.displayName ?? searchResult.username}
              </p>
              <p className="text-xs text-[var(--text)]">@{searchResult.username}</p>
            </div>
            <SearchAction result={searchResult} onAdd={handleAdd} />
          </div>
        )}
      </section>

      {(requests.incoming.length > 0 || requests.outgoing.length > 0) && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-[var(--text-h)] mb-3">Requests</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {requests.incoming.length > 0 && (
              <div className="border border-[var(--border)] rounded-xl p-4 bg-[var(--bg)]">
                <h3 className="text-sm font-semibold text-[var(--text-h)] mb-3">Incoming</h3>
                <ul className="flex flex-col gap-2">
                  {requests.incoming.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-2">
                      <span className="text-sm text-[var(--text-h)]">
                        {r.displayName ?? r.username}{' '}
                        <span className="text-[var(--text)]">@{r.username}</span>
                      </span>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleRespond(r.id, 'accept')}
                          className="px-2.5 py-1 bg-[var(--accent)] text-white rounded-md text-xs font-semibold hover:opacity-90 cursor-pointer"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleRespond(r.id, 'reject')}
                          className="px-2.5 py-1 border border-[var(--border)] text-[var(--text)] rounded-md text-xs hover:text-red-500 cursor-pointer"
                        >
                          Reject
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {requests.outgoing.length > 0 && (
              <div className="border border-[var(--border)] rounded-xl p-4 bg-[var(--bg)]">
                <h3 className="text-sm font-semibold text-[var(--text-h)] mb-3">Sent</h3>
                <ul className="flex flex-col gap-2">
                  {requests.outgoing.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-2">
                      <span className="text-sm text-[var(--text-h)]">
                        {r.displayName ?? r.username}{' '}
                        <span className="text-[var(--text)]">@{r.username}</span>
                      </span>
                      <button
                        onClick={() => handleCancel(r.id)}
                        className="px-2.5 py-1 border border-[var(--border)] text-[var(--text)] rounded-md text-xs hover:text-red-500 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold text-[var(--text-h)] mb-3">Your friends</h2>
        {friends.length === 0 ? (
          <div className="border border-[var(--border)] rounded-xl p-12 text-center text-[var(--text)]">
            No friends yet. Search for someone above to send a request.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {friends.map((f) => (
              <FriendCard
                key={f.id}
                friend={f}
                onUnfriend={() => handleUnfriend(f.id, f.displayName ?? f.username ?? 'this friend')}
              />
            ))}
          </div>
        )}
      </section>
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
  const baseCls = 'px-3 py-1.5 rounded-lg text-xs font-semibold';
  switch (result.status) {
    case 'self':
      return <span className={`${baseCls} bg-[var(--code-bg)] text-[var(--text)]`}>That's you</span>;
    case 'accepted':
      return (
        <span className={`${baseCls} bg-[var(--accent-bg)] text-[var(--accent)]`}>Friends</span>
      );
    case 'pending-out':
      return (
        <span className={`${baseCls} bg-[var(--code-bg)] text-[var(--text)]`}>Pending</span>
      );
    case 'pending-in':
      return (
        <span className={`${baseCls} bg-[var(--code-bg)] text-[var(--text)]`}>
          Awaiting your response
        </span>
      );
    default:
      return (
        <button
          onClick={() => onAdd(result.id)}
          className={`${baseCls} bg-[var(--accent)] text-white hover:opacity-90 cursor-pointer`}
        >
          Add friend
        </button>
      );
  }
}

function FriendCard({ friend, onUnfriend }: { friend: Friend; onUnfriend: () => void }) {
  const name = friend.displayName ?? friend.username ?? 'Unknown';
  return (
    <div className="border border-[var(--border)] rounded-xl p-5 bg-[var(--bg)]">
      <div className="flex justify-between items-start gap-3 mb-3">
        <div>
          <h3 className="text-lg font-semibold text-[var(--text-h)]">{name}</h3>
          <p className="text-xs text-[var(--text)]">@{friend.username}</p>
          {friend.bio && <p className="mt-1 text-sm text-[var(--text)]">{friend.bio}</p>}
        </div>
        <button
          onClick={onUnfriend}
          className="px-2.5 py-1 border border-[var(--border)] text-[var(--text)] rounded-md text-xs hover:text-red-500 cursor-pointer"
        >
          Unfriend
        </button>
      </div>

      {friend.goals.length === 0 && friend.budgets.length === 0 ? (
        <p className="text-sm text-[var(--text)] italic">
          No public goals or budgets to show.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {friend.goals.length > 0 && (
            <div>
              <h4 className="text-xs uppercase tracking-wider text-[var(--text)] mb-2">Goals</h4>
              <div className="flex flex-col gap-3">
                {friend.goals.map((g) => {
                  const pct = Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100));
                  return (
                    <div key={g.id}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-[var(--text-h)] font-medium">{g.name}</span>
                        <span className="text-[var(--text)]">
                          ${g.currentAmount.toFixed(2)} / ${g.targetAmount.toFixed(2)} · {pct}%
                        </span>
                      </div>
                      <div className="h-2 bg-[var(--code-bg)] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[var(--accent)] transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {friend.budgets.length > 0 && (
            <div>
              <h4 className="text-xs uppercase tracking-wider text-[var(--text)] mb-2">
                Budgets (this month)
              </h4>
              <div className="flex flex-col gap-3">
                {friend.budgets.map((b) => {
                  const pct = Math.min(100, Math.round((b.spent / b.monthlyLimit) * 100));
                  const over = b.spent > b.monthlyLimit;
                  return (
                    <div key={b.id}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-[var(--text-h)] font-medium capitalize">
                          {b.category}
                        </span>
                        <span className={over ? 'text-red-500' : 'text-[var(--text)]'}>
                          ${b.spent.toFixed(2)} / ${b.monthlyLimit.toFixed(2)}
                        </span>
                      </div>
                      <div className="h-2 bg-[var(--code-bg)] rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${over ? 'bg-red-500' : 'bg-[var(--accent)]'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
