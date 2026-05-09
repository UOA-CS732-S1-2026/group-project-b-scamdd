import type { Transaction, TransactionInput } from '../types/transaction';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';
const BASE = `${API}/api/transactions`;
const opts: RequestInit = { credentials: 'include' };

export async function getTransactions(): Promise<Transaction[]> {
  const res = await fetch(BASE, opts);
  if (!res.ok) throw new Error('Failed to fetch transactions');
  return res.json();
}

export async function createTransaction(data: TransactionInput): Promise<Transaction> {
  const res = await fetch(BASE, {
    ...opts,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create transaction');
  return res.json();
}

export async function updateTransaction(
  id: string,
  data: Partial<TransactionInput>,
): Promise<Transaction> {
  const res = await fetch(`${BASE}/${id}`, {
    ...opts,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update transaction');
  return res.json();
}

export async function deleteTransaction(id: string): Promise<void> {
  const res = await fetch(`${BASE}/${id}`, { ...opts, method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete transaction');
}
