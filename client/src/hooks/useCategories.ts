import { useCallback, useEffect, useState } from 'react';
import { CATEGORIES } from '../types/transaction';
import type { UserCategory } from '../types/category';
import { getCategories } from '../api/categories';

const BUILTIN_COLORS: Record<string, string> = {
  food:          '#FFBDC2',
  rent:          '#C5FFD8',
  transport:     '#FDFBD4',
  entertainment: '#C68BE1',
  utilities:     '#B5C9E8',
  shopping:      '#FFD4A8',
  health:        '#D4F8E0',
  other:         '#CBCBCB',
};

const FALLBACK_COLOR = '#CBCBCB';

export function useCategories() {
  const [userCategories, setUserCategories] = useState<UserCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const cats = await getCategories();
      setUserCategories(cats);
    } catch {
      // silently keep previous state
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const allCategories: string[] = [
    ...(CATEGORIES as readonly string[]),
    ...userCategories.map((c) => c.name),
  ];

  function getCategoryColor(name: string): string {
    if (BUILTIN_COLORS[name]) return BUILTIN_COLORS[name];
    return userCategories.find((c) => c.name === name)?.color ?? FALLBACK_COLOR;
  }

  return { allCategories, getCategoryColor, userCategories, isLoading, refresh };
}
