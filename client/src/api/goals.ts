import type { Goal, GoalInput } from '../types/goal';

const API = (import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL ?? 'http://localhost:4000'));
const BASE = `${API}/api/goals`;
const opts: RequestInit = { credentials: 'include' };

export async function getGoals(): Promise<Goal[]> {
  const res = await fetch(BASE, opts);
  if (!res.ok) throw new Error('Failed to fetch goals');
  return res.json();
}

export async function createGoal(data: GoalInput): Promise<Goal> {
  const res = await fetch(BASE, {
    ...opts,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create goal');
  return res.json();
}

export async function updateGoal(id: string, data: Partial<GoalInput>): Promise<Goal> {
  const res = await fetch(`${BASE}/${id}`, {
    ...opts,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update goal');
  return res.json();
}

export async function deleteGoal(id: string): Promise<void> {
  const res = await fetch(`${BASE}/${id}`, { ...opts, method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete goal');
}

export async function contributeToGoal(id: string, amount: number): Promise<Goal> {
  const res = await fetch(`${BASE}/${id}/contribute`, {
    ...opts,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount }),
  });
  if (!res.ok) throw new Error('Failed to contribute');
  return res.json();
}
