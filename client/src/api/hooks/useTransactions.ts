import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { apiFetch } from '../_fetch';
import type { Transaction, TransactionInput } from '../../types/transaction';

const KEYS = {
  all: ['transactions'] as const,
  list: (params: ListParams) => ['transactions', 'list', params] as const,
};

interface ListParams {
  page?: number;
  limit?: number;
}

export interface PaginatedTransactions {
  transactions: Transaction[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export function useTransactions() {
  return useQuery({
    queryKey: KEYS.list({}),
    queryFn: () => apiFetch<Transaction[]>('/transactions'),
  });
}

export function useTransactionsPaginated(page: number, limit: number) {
  return useQuery({
    queryKey: KEYS.list({ page, limit }),
    queryFn: () =>
      apiFetch<PaginatedTransactions>('/transactions', { query: { page, limit } }),
    placeholderData: keepPreviousData,
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: KEYS.all });
}

export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: TransactionInput) =>
      apiFetch<Transaction>('/transactions', { method: 'POST', body: data }),
    onSuccess: () => invalidate(qc),
  });
}

export function useUpdateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TransactionInput> }) =>
      apiFetch<Transaction>(`/transactions/${id}`, { method: 'PATCH', body: data }),
    onSuccess: () => invalidate(qc),
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/transactions/${id}`, { method: 'DELETE' }),
    onSuccess: () => invalidate(qc),
  });
}
