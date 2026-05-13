export const MOOD_KEYS = ['regret', 'meh', 'okay', 'glad', 'worth-it'] as const;
export const MOOD_LABELS = ['Regret', 'Meh', 'Okay', 'Glad', 'Worth It'] as const;
export const MOOD_EMOJIS = ['😢', '😕', '😐', '🙂', '😊'] as const;
export const MOOD_VALUES: Record<string, number> = {
  regret: 1,
  meh: 2,
  okay: 3,
  glad: 4,
  'worth-it': 5,
};

export const CAT_AVATAR_COLORS: Record<string, string> = {
  food: '#FFBDC2',
  rent: '#C5FFD8',
  transport: '#FDFBD4',
  entertainment: '#C68BE1',
  utilities: '#B5C9E8',
  shopping: '#FFD4A8',
  health: '#D4F8E0',
  other: '#E0E0E0',
};

export type SortBy = 'most-recent' | 'largest' | 'smallest' | 'happiest' | 'most-regretful';
export type TimeRange = 'all' | 'today' | 'this-week' | 'this-month' | 'last-month';
export type TypeFilter = 'all' | 'income' | 'expense';

export const SORT_OPTIONS: { key: SortBy; label: string }[] = [
  { key: 'most-recent', label: 'Most recent' },
  { key: 'largest', label: 'Largest amount' },
  { key: 'smallest', label: 'Smallest amount' },
  { key: 'happiest', label: 'Happiest first' },
  { key: 'most-regretful', label: 'Most regretful' },
];

export const TIME_OPTIONS: { key: TimeRange; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'today', label: 'Today' },
  { key: 'this-week', label: 'This week' },
  { key: 'this-month', label: 'This month' },
  { key: 'last-month', label: 'Last month' },
];

export const PAGE_SIZE = 20;
