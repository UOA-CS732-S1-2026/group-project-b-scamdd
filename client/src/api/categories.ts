import type { UserCategory } from '../types/category';
import { apiFetch } from './_fetch';

export function getCategories(): Promise<UserCategory[]> {
  return apiFetch<UserCategory[]>('/categories');
}

export function createCategory(name: string, color: string): Promise<UserCategory> {
  return apiFetch<UserCategory>('/categories', {
    method: 'POST',
    body: { name, color },
  });
}

export function updateCategory(id: string, name: string, color: string): Promise<UserCategory> {
  return apiFetch<UserCategory>(`/categories/${id}`, {
    method: 'PATCH',
    body: { name, color },
  });
}

export function deleteCategory(id: string): Promise<void> {
  return apiFetch<void>(`/categories/${id}`, { method: 'DELETE' });
}
