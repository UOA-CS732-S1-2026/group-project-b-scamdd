import type { Profile, ProfileUpdate, PublicProfile } from '../types/profile';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';
const BASE = `${API}/api/profile`;
const opts: RequestInit = { credentials: 'include' };

export async function getMyProfile(): Promise<Profile> {
  const res = await fetch(`${BASE}/me`, opts);
  if (!res.ok) throw new Error('Failed to load profile');
  return res.json();
}

export async function updateMyProfile(data: ProfileUpdate): Promise<Profile> {
  const res = await fetch(`${BASE}/me`, {
    ...opts,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? 'Failed to update profile');
  }
  return res.json();
}

export async function checkUsername(username: string): Promise<{ available: boolean; reason?: string }> {
  const res = await fetch(`${BASE}/check-username?u=${encodeURIComponent(username)}`, opts);
  if (!res.ok) throw new Error('Failed to check username');
  return res.json();
}

export async function getProfileByUsername(username: string): Promise<PublicProfile> {
  const res = await fetch(`${BASE}/by-username/${encodeURIComponent(username)}`, opts);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? 'User not found');
  }
  return res.json();
}
