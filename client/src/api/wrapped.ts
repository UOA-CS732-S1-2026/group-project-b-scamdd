import type { WrappedMonth } from '../types/wrapped';

export async function getWrapped(): Promise<WrappedMonth[]> {
  const res = await fetch('/api/wrapped', { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch wrapped data');
  return res.json();
}

export async function regenerateWrapped(): Promise<WrappedMonth[]> {
  const res = await fetch('/api/wrapped/regenerate', { method: 'POST', credentials: 'include' });
  if (!res.ok) throw new Error('Failed to regenerate wrapped data');
  // fetch fresh list after regeneration
  return getWrapped();
}
