import { apiFetch, ApiError } from './_fetch';

export interface LeaderboardEntry {
  userId: string;
  name: string;
  username: string;
  score: number | null;
  isMe: boolean;
  avatarColor: string | null;
  avatarImage: string | null;
}

export async function submitScore(game: 'price' | 'budget', score: number): Promise<void> {
  try {
    await apiFetch<void>('/games/score', {
      method: 'POST',
      body: { game, score },
    });
  } catch (err) {
    // Original implementation swallowed errors silently.
    if (!(err instanceof ApiError)) throw err;
  }
}

export function getLeaderboard(game: 'price' | 'budget'): Promise<LeaderboardEntry[]> {
  return apiFetch<LeaderboardEntry[]>(`/games/leaderboard/${game}`);
}
