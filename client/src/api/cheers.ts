import { apiFetch } from './_fetch';

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

export function cheer(toUserId: string, achievementKey: string): Promise<void> {
  return apiFetch<void>('/cheers', {
    method: 'POST',
    body: { toUserId, achievementKey },
  });
}

export function uncheer(toUserId: string, achievementKey: string): Promise<void> {
  return apiFetch<void>('/cheers', {
    method: 'DELETE',
    body: { toUserId, achievementKey },
  });
}

export function getSentCheers(): Promise<SentCheer[]> {
  return apiFetch<SentCheer[]>('/cheers/sent');
}

export function getReceivedCheers(): Promise<ReceivedCheer[]> {
  return apiFetch<ReceivedCheer[]>('/cheers/received');
}

export function markCheersSeen(): Promise<void> {
  return apiFetch<void>('/cheers/mark-seen', { method: 'POST' });
}

export function getCheersFor(userId: string, achievementKey: string): Promise<CheerUser[]> {
  return apiFetch<CheerUser[]>(
    `/cheers/for/${encodeURIComponent(userId)}/${encodeURIComponent(achievementKey)}`,
  );
}
