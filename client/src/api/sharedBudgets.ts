import type { SharedBudget, SharedBudgetInput, SharedBudgetUpdate } from '../types/sharedBudget';
import { apiFetch } from './_fetch';

export function getSharedBudgets(): Promise<SharedBudget[]> {
  return apiFetch<SharedBudget[]>('/shared-budgets');
}

export function getSharedBudgetInvites(): Promise<SharedBudget[]> {
  return apiFetch<SharedBudget[]>('/shared-budgets/invites');
}

export function createSharedBudget(data: SharedBudgetInput): Promise<SharedBudget> {
  return apiFetch<SharedBudget>('/shared-budgets', { method: 'POST', body: data });
}

export function updateSharedBudget(id: string, data: SharedBudgetUpdate): Promise<SharedBudget> {
  return apiFetch<SharedBudget>(`/shared-budgets/${id}`, { method: 'PATCH', body: data });
}

export function deleteSharedBudget(id: string): Promise<void> {
  return apiFetch<void>(`/shared-budgets/${id}`, { method: 'DELETE' });
}

export function inviteToSharedBudget(id: string, userIds: string[]): Promise<SharedBudget> {
  return apiFetch<SharedBudget>(`/shared-budgets/${id}/invite`, {
    method: 'POST',
    body: { userIds },
  });
}

export function acceptSharedBudgetInvite(id: string): Promise<SharedBudget> {
  return apiFetch<SharedBudget>(`/shared-budgets/${id}/accept`, { method: 'POST' });
}

export function declineSharedBudgetInvite(id: string): Promise<void> {
  return apiFetch<void>(`/shared-budgets/${id}/decline`, { method: 'POST' });
}

export function leaveSharedBudget(id: string): Promise<void> {
  return apiFetch<void>(`/shared-budgets/${id}/leave`, { method: 'POST' });
}
