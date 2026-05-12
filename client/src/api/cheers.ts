const API = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';
const BASE = `${API}/api/cheers`;
const opts: RequestInit = { credentials: 'include' };

export interface SentCheer {
  toUserId: string;
  achievementKey: string;
}

export interface ReceivedCheer {
  id: string;
  fromId: string;
  fromUsername: string | null;
  fromDisplayName: string | null;
  achievementKey: string;
  createdAt: string;
  seen: boolean;
}

export interface CheerUser {
  id: string;
  username: string | null;
  displayName: string | null;
}

export async function cheer(toUserId: string, achievementKey: string): Promise<void> {
  const res = await fetch(BASE, {
    ...opts,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ toUserId, achievementKey }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? 'Failed to cheer');
  }
}

export async function uncheer(toUserId: string, achievementKey: string): Promise<void> {
  const res = await fetch(BASE, {
    ...opts,
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ toUserId, achievementKey }),
  });
  if (!res.ok) throw new Error('Failed to uncheer');
}

export async function getSentCheers(): Promise<SentCheer[]> {
  const res = await fetch(`${BASE}/sent`, opts);
  if (!res.ok) throw new Error('Failed to load cheers');
  return res.json();
}

export async function getReceivedCheers(): Promise<ReceivedCheer[]> {
  const res = await fetch(`${BASE}/received`, opts);
  if (!res.ok) throw new Error('Failed to load cheers');
  return res.json();
}

export async function markCheersSeen(): Promise<void> {
  const res = await fetch(`${BASE}/mark-seen`, {
    ...opts,
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to mark cheers seen');
}

export async function getCheersFor(userId: string, achievementKey: string): Promise<CheerUser[]> {
  const res = await fetch(`${BASE}/for/${encodeURIComponent(userId)}/${encodeURIComponent(achievementKey)}`, opts);
  if (!res.ok) throw new Error('Failed to load cheer list');
  return res.json();
}
