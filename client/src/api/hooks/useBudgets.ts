import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../_fetch';

export interface BudgetRow {
  _id: string;
  userId: string;
  category: string;
  monthlyLimit: number;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  isPublic: boolean;
  spent: number;
  remaining: number;
}

export interface CreateBudgetInput {
  category: string;
  monthlyLimit: number;
  period?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  isPublic?: boolean;
}

const KEYS = {
  all: ['budgets'] as const,
  list: () => ['budgets', 'list'] as const,
};

export function useBudgets() {
  return useQuery({
    queryKey: KEYS.list(),
    queryFn: () => apiFetch<BudgetRow[]>('/budgets'),
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: KEYS.all });
}

export function useCreateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBudgetInput) =>
      apiFetch<BudgetRow>('/budgets', { method: 'POST', body: data }),
    onSuccess: () => invalidate(qc),
  });
}

export function useUpdateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateBudgetInput> }) =>
      apiFetch<BudgetRow>(`/budgets/${id}`, { method: 'PATCH', body: data }),
    onSuccess: () => invalidate(qc),
  });
}

export function useDeleteBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/budgets/${id}`, { method: 'DELETE' }),
    onSuccess: () => invalidate(qc),
  });
}
