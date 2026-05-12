const API = (import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL ?? 'http://localhost:4000'));
const BASE = `${API}/api/games`;
const opts: RequestInit = { credentials: 'include' };

export interface LeaderboardEntry {
  userId: string;
  name: string;
  username: string;
  score: number | null;
  isMe: boolean;
}

export async function submitScore(game: 'price' | 'budget', score: number): Promise<void> {
  await fetch(`${BASE}/score`, {
    ...opts,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ game, score }),
  });
}

export async function getLeaderboard(game: 'price' | 'budget'): Promise<LeaderboardEntry[]> {
  const res = await fetch(`${BASE}/leaderboard/${game}`, opts);
  if (!res.ok) throw new Error('Failed to fetch leaderboard');
  return res.json();
}
