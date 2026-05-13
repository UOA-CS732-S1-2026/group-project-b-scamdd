import type { WrappedMonth } from '../types/wrapped';

export async function getWrapped(): Promise<WrappedMonth[]> {
  const res = await fetch('/api/wrapped', { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch wrapped data');
  return res.json();
}
