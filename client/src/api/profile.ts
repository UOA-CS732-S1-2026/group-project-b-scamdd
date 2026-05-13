import type { Profile, ProfileUpdate, PublicProfile } from '../types/profile';
import { apiFetch } from './_fetch';

export function getMyProfile(): Promise<Profile> {
  return apiFetch<Profile>('/profile/me');
}

export function updateMyProfile(data: ProfileUpdate): Promise<Profile> {
  return apiFetch<Profile>('/profile/me', { method: 'PATCH', body: data });
}

export function checkUsername(username: string): Promise<{ available: boolean; reason?: string }> {
  return apiFetch<{ available: boolean; reason?: string }>('/profile/check-username', {
    query: { u: username },
  });
}

export function getProfileByUsername(username: string): Promise<PublicProfile> {
  return apiFetch<PublicProfile>(`/profile/by-username/${encodeURIComponent(username)}`);
}
