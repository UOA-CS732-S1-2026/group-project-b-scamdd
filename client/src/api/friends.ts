import type { Friend, FriendAcceptance, Requests, SearchResult } from '../types/friend';
import { apiFetch } from './_fetch';

export function searchUser(query: string): Promise<SearchResult[]> {
  return apiFetch<SearchResult[]>('/friends/search', { query: { q: query } });
}

export function sendRequest(addresseeId: string): Promise<void> {
  return apiFetch<void>('/friends/requests', {
    method: 'POST',
    body: { addresseeId },
  });
}

export function getRequests(): Promise<Requests> {
  return apiFetch<Requests>('/friends/requests');
}

export function respondToRequest(id: string, action: 'accept' | 'reject'): Promise<void> {
  return apiFetch<void>(`/friends/requests/${id}`, {
    method: 'PATCH',
    body: { action },
  });
}

export function cancelRequest(id: string): Promise<void> {
  return apiFetch<void>(`/friends/requests/${id}`, { method: 'DELETE' });
}

export function getFriends(): Promise<Friend[]> {
  return apiFetch<Friend[]>('/friends');
}

export function unfriend(friendId: string): Promise<void> {
  return apiFetch<void>(`/friends/${friendId}`, { method: 'DELETE' });
}

export function getAcceptances(): Promise<FriendAcceptance[]> {
  return apiFetch<FriendAcceptance[]>('/friends/acceptances');
}

export function markAcceptancesSeen(): Promise<void> {
  return apiFetch<void>('/friends/acceptances/seen', { method: 'POST' });
}
