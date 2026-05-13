import { useCallback } from 'react';
import { toast } from 'sonner';
import { ApiError } from '../api/_fetch';

export function useApiError() {
  return useCallback((err: unknown, fallback = 'Something went wrong') => {
    if (err instanceof ApiError) {
      if (err.status === 401) {
        toast.error('Your session has expired. Please sign in again.');
        return;
      }
      toast.error(err.message || fallback);
      return;
    }
    if (err instanceof Error) {
      toast.error(err.message || fallback);
      return;
    }
    toast.error(fallback);
  }, []);
}
