import type {
  SharedBudget,
  SharedBudgetInput,
  SharedBudgetUpdate,
} from '../types/sharedBudget';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';
const BASE = `${API}/api/shared-budgets`;
const opts: RequestInit = { credentials: 'include' };

async function parseError(res: Response, fallback: string): Promise<never> {
  const body = await res.json().catch(() => ({}));
  throw new Error(body.message ?? fallback);
}

export async function getSharedBudgets(): Promise<SharedBudget[]> {
  const res = await fetch(BASE, opts);
  if (!res.ok) throw new Error('Failed to fetch shared budgets');
  return res.json();
}

export async function getSharedBudgetInvites(): Promise<SharedBudget[]> {
  const res = await fetch(`${BASE}/invites`, opts);
  if (!res.ok) throw new Error('Failed to fetch invites');
  return res.json();
}

export async function createSharedBudget(data: SharedBudgetInput): Promise<SharedBudget> {
  const res = await fetch(BASE, {
    ...opts,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) await parseError(res, 'Failed to create shared budget');
  return res.json();
}

export async function updateSharedBudget(
  id: string,
  data: SharedBudgetUpdate,
): Promise<SharedBudget> {
  const res = await fetch(`${BASE}/${id}`, {
    ...opts,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) await parseError(res, 'Failed to update shared budget');
  return res.json();
}

export async function deleteSharedBudget(id: string): Promise<void> {
  const res = await fetch(`${BASE}/${id}`, { ...opts, method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete shared budget');
}

export async function inviteToSharedBudget(
  id: string,
  userIds: string[],
): Promise<SharedBudget> {
  const res = await fetch(`${BASE}/${id}/invite`, {
    ...opts,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userIds }),
  });
  if (!res.ok) await parseError(res, 'Failed to invite');
  return res.json();
}

export async function acceptSharedBudgetInvite(id: string): Promise<SharedBudget> {
  const res = await fetch(`${BASE}/${id}/accept`, { ...opts, method: 'POST' });
  if (!res.ok) await parseError(res, 'Failed to accept invite');
  return res.json();
}

export async function declineSharedBudgetInvite(id: string): Promise<void> {
  const res = await fetch(`${BASE}/${id}/decline`, { ...opts, method: 'POST' });
  if (!res.ok) await parseError(res, 'Failed to decline invite');
}

export async function leaveSharedBudget(id: string): Promise<void> {
  const res = await fetch(`${BASE}/${id}/leave`, { ...opts, method: 'POST' });
  if (!res.ok) await parseError(res, 'Failed to leave shared budget');
}
