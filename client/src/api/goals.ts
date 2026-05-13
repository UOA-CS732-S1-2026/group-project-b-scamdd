import type { Goal, GoalInput } from '../types/goal';
import { apiFetch } from './_fetch';

export function getGoals(): Promise<Goal[]> {
  return apiFetch<Goal[]>('/goals');
}

export function createGoal(data: GoalInput): Promise<Goal> {
  return apiFetch<Goal>('/goals', { method: 'POST', body: data });
}

export function updateGoal(id: string, data: Partial<GoalInput>): Promise<Goal> {
  return apiFetch<Goal>(`/goals/${id}`, { method: 'PATCH', body: data });
}

export function deleteGoal(id: string): Promise<void> {
  return apiFetch<void>(`/goals/${id}`, { method: 'DELETE' });
}

export function contributeToGoal(id: string, amount: number): Promise<Goal> {
  return apiFetch<Goal>(`/goals/${id}/contribute`, {
    method: 'POST',
    body: { amount },
  });
}
