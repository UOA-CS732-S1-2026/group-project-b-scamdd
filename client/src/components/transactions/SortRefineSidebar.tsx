import {
  MOOD_KEYS,
  MOOD_LABELS,
  MOOD_EMOJIS,
  SORT_OPTIONS,
  TIME_OPTIONS,
} from '../../lib/transactions';
import type { SortBy, TimeRange, TypeFilter } from '../../lib/transactions';
import FilterSection from '../ui/FilterSection';
import Pill from '../ui/Pill';
import RangeSlider from '../ui/RangeSlider';
import { CATEGORIES } from '../../types/transaction';

interface SortRefineSidebarProps {
  sortBy: SortBy;
  onSortBy: (v: SortBy) => void;
  typeFilter: TypeFilter;
  onTypeFilter: (v: TypeFilter) => void;
  timeRange: TimeRange;
  onTimeRange: (v: TimeRange) => void;
  moodFilter: 'all' | (typeof MOOD_KEYS)[number];
  onMoodFilter: (v: 'all' | (typeof MOOD_KEYS)[number]) => void;
  categoryFilters: Set<string>;
  onToggleCategory: (cat: string) => void;
  amountRange: [number, number];
  onAmountRange: (v: [number, number]) => void;
  dataMaxAmount: number;
}

export default function SortRefineSidebar({
  sortBy,
  onSortBy,
  typeFilter,
  onTypeFilter,
  timeRange,
  onTimeRange,
  moodFilter,
  onMoodFilter,
  categoryFilters,
  onToggleCategory,
  amountRange,
  onAmountRange,
  dataMaxAmount,
}: SortRefineSidebarProps) {
  const panelClass = 'p-6 rounded-3xl border border-[var(--c-border)] bg-[var(--c-card)]';

  return (
    <aside className={`${panelClass} self-start`}>
      <h3 className="font-semibold text-base text-[var(--c-text)] mb-5">Sort &amp; Refine</h3>

      <FilterSection title="Type">
        <div className="flex gap-2">
          {(['all', 'income', 'expense'] as const).map((t) => (
            <Pill key={t} active={typeFilter === t} onClick={() => onTypeFilter(t)}>
              {t === 'all' ? 'All' : t === 'income' ? '↑ Income' : '↓ Expense'}
            </Pill>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Sort by">
        <div className="flex flex-col gap-2">
          {SORT_OPTIONS.map(({ key, label }) => (
            <label
              key={key}
              className="flex items-center gap-2.5 cursor-pointer text-sm text-[var(--c-text)] hover:opacity-80 transition-opacity"
            >
              <input
                type="radio"
                name="sortby"
                checked={sortBy === key}
                onChange={() => onSortBy(key)}
                className="accent-[var(--c-accent)]"
              />
              {label}
            </label>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Time range">
        <div className="flex flex-wrap gap-2">
          {TIME_OPTIONS.map(({ key, label }) => (
            <Pill key={key} active={timeRange === key} onClick={() => onTimeRange(key)}>
              {label}
            </Pill>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Mood">
        <div className="flex flex-wrap gap-2">
          <Pill active={moodFilter === 'all'} onClick={() => onMoodFilter('all')}>
            All
          </Pill>
          {MOOD_KEYS.map((m, i) => (
            <Pill
              key={m}
              active={moodFilter === m}
              onClick={() => onMoodFilter(m)}
              aria-label={MOOD_LABELS[i]}
              title={MOOD_LABELS[i]}
            >
              <span className="text-base leading-none">{MOOD_EMOJIS[i]}</span>
            </Pill>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Category">
        <div className="flex flex-col gap-2">
          {CATEGORIES.map((c) => (
            <label
              key={c}
              className="flex items-center gap-2.5 cursor-pointer text-sm text-[var(--c-text)] capitalize hover:opacity-80 transition-opacity"
            >
              <input
                type="checkbox"
                checked={categoryFilters.has(c)}
                onChange={() => onToggleCategory(c)}
                className="accent-[var(--c-accent)]"
              />
              {c}
            </label>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Amount" last>
        <RangeSlider min={0} max={dataMaxAmount} value={amountRange} onChange={onAmountRange} />
      </FilterSection>
    </aside>
  );
}
