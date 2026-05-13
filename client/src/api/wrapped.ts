import type { WrappedMonth } from '../types/wrapped';
import { apiFetch } from './_fetch';

export function getWrapped(): Promise<WrappedMonth[]> {
  return apiFetch<WrappedMonth[]>('/wrapped');
}
