import type { Friend, Requests, SearchResult } from '../types/friend';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';
const BASE = `${API}/api/friends`;
const opts: RequestInit = { credentials: 'include' };

export async function searchUser(query: string): Promise<SearchResult[]> {
  const res = await fetch(`${BASE}/search?q=${encodeURIComponent(query)}`, opts);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? 'Search failed');
  }
  return res.json();
}

export async function sendRequest(addresseeId: string): Promise<void> {
  const res = await fetch(`${BASE}/requests`, {
    ...opts,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ addresseeId }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? 'Failed to send request');
  }
}

export async function getRequests(): Promise<Requests> {
  const res = await fetch(`${BASE}/requests`, opts);
  if (!res.ok) throw new Error('Failed to load requests');
  return res.json();
}

export async function respondToRequest(id: string, action: 'accept' | 'reject'): Promise<void> {
  const res = await fetch(`${BASE}/requests/${id}`, {
    ...opts,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  });
  if (!res.ok) throw new Error('Failed to respond');
}

export async function cancelRequest(id: string): Promise<void> {
  const res = await fetch(`${BASE}/requests/${id}`, { ...opts, method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to cancel');
}

export async function getFriends(): Promise<Friend[]> {
  const res = await fetch(BASE, opts);
  if (!res.ok) throw new Error('Failed to load friends');
  return res.json();
}

export async function unfriend(friendId: string): Promise<void> {
  const res = await fetch(`${BASE}/${friendId}`, { ...opts, method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to unfriend');
}
