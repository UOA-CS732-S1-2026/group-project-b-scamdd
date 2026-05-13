const API = (import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL ?? 'http://localhost:4000'));
const BASE = `${API}/api/achievements`;
const opts: RequestInit = { credentials: 'include' };

export interface Achievement {
  key: string;
  earnedAt: string;
}

export async function getMyAchievements(): Promise<Achievement[]> {
  const res = await fetch(`${BASE}/me`, opts);
  if (!res.ok) throw new Error('Failed to load achievements');
  return res.json();
}
