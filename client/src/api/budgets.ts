import type { Budget, BudgetInput, BudgetUpdate } from '../types/budget';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';
const BASE = `${API}/api/budgets`;
const opts: RequestInit = { credentials: 'include' };

export async function getBudgets(): Promise<Budget[]> {
  const res = await fetch(BASE, opts);
  if (!res.ok) throw new Error('Failed to fetch budgets');
  return res.json();
}

export async function createBudget(data: BudgetInput): Promise<Budget> {
  const res = await fetch(BASE, {
    ...opts,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? 'Failed to create budget');
  }
  return res.json();
}

export async function updateBudget(id: string, data: BudgetUpdate): Promise<Budget> {
  const res = await fetch(`${BASE}/${id}`, {
    ...opts,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update budget');
  return res.json();
}

export async function deleteBudget(id: string): Promise<void> {
  const res = await fetch(`${BASE}/${id}`, { ...opts, method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete budget');
}
