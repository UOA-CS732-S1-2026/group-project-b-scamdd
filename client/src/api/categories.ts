import type { UserCategory } from '../types/category';

const API = (import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL ?? 'http://localhost:4000'));
const BASE = `${API}/api/categories`;
const opts: RequestInit = { credentials: 'include' };

export async function getCategories(): Promise<UserCategory[]> {
  const res = await fetch(BASE, opts);
  if (!res.ok) throw new Error('Failed to fetch categories');
  return res.json();
}

export async function createCategory(name: string, color: string): Promise<UserCategory> {
  const res = await fetch(BASE, {
    ...opts,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, color }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? 'Failed to create category');
  }
  return res.json();
}

export async function updateCategory(id: string, name: string, color: string): Promise<UserCategory> {
  const res = await fetch(`${BASE}/${id}`, {
    ...opts,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, color }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? 'Failed to update category');
  }
  return res.json();
}

export async function deleteCategory(id: string): Promise<void> {
  const res = await fetch(`${BASE}/${id}`, { ...opts, method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete category');
}
