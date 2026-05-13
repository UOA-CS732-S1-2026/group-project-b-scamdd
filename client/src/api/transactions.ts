import type { Transaction, TransactionInput } from '../types/transaction';
import { apiFetch } from './_fetch';

export function getTransactions(): Promise<Transaction[]> {
  return apiFetch<Transaction[]>('/transactions');
}

export function createTransaction(data: TransactionInput): Promise<Transaction> {
  return apiFetch<Transaction>('/transactions', { method: 'POST', body: data });
}

export function updateTransaction(
  id: string,
  data: Partial<TransactionInput>,
): Promise<Transaction> {
  return apiFetch<Transaction>(`/transactions/${id}`, { method: 'PATCH', body: data });
}

export function deleteTransaction(id: string): Promise<void> {
  return apiFetch<void>(`/transactions/${id}`, { method: 'DELETE' });
}
