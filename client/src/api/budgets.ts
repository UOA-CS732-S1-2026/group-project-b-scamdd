import type { Budget, BudgetInput, BudgetUpdate } from '../types/budget';
import { apiFetch } from './_fetch';

export function getBudgets(): Promise<Budget[]> {
  return apiFetch<Budget[]>('/budgets');
}

export function createBudget(data: BudgetInput): Promise<Budget> {
  return apiFetch<Budget>('/budgets', { method: 'POST', body: data });
}

export function updateBudget(id: string, data: BudgetUpdate): Promise<Budget> {
  return apiFetch<Budget>(`/budgets/${id}`, { method: 'PATCH', body: data });
}

export function deleteBudget(id: string): Promise<void> {
  return apiFetch<void>(`/budgets/${id}`, { method: 'DELETE' });
}
