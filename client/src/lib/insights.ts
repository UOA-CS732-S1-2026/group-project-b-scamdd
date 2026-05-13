import type { WrappedStats } from '../types/wrapped';

export interface InsightCard {
  id: string;
  tint: string;
  label: string;
  value: string;
  sub: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  food: 'Food & Drink',
  rent: 'Rent',
  transport: 'Transport',
  entertainment: 'Entertainment',
  utilities: 'Utilities',
  shopping: 'Shopping',
  health: 'Health',
  other: 'Other',
};

function pct(n: number) {
  return `${Math.round(Math.abs(n) * 100)}%`;
}

function ord(n: number) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

export function statsToInsights(stats: WrappedStats): InsightCard[] {
  const cards: InsightCard[] = [];
  const saved = stats.totalIncome - stats.totalSpent;
  const catLabel = CATEGORY_LABELS[stats.topCategory] ?? stats.topCategory;

  cards.push({
    id: 'total-spent',
    tint: 'var(--c-tint-pink)',
    label: 'Total spent',
    value: `$${stats.totalSpent.toFixed(2)}`,
    sub: `across ${stats.transactionCount} transactions`,
  });

  if (stats.totalIncome > 0) {
    const kept = stats.savingsRate >= 0;
    cards.push({
      id: 'savings',
      tint: kept ? 'var(--c-tint-green)' : 'var(--c-tint-pink)',
      label: kept ? 'You saved' : 'You overspent by',
      value: `$${Math.abs(saved).toFixed(2)}`,
      sub: kept
        ? `${pct(stats.savingsRate)} of your income — nice work`
        : `spent ${pct(Math.abs(stats.savingsRate))} more than you earned`,
    });
  }

  cards.push({
    id: 'top-category',
    tint: 'var(--c-tint-yellow)',
    label: 'Biggest category',
    value: catLabel,
    sub: `$${stats.topCategoryAmount.toFixed(2)} this month`,
  });

  cards.push({
    id: 'biggest-hit',
    tint: 'var(--c-tint-pink)',
    label: 'Biggest hit',
    value: `$${stats.biggestExpenseAmount.toFixed(2)}`,
    sub: stats.biggestExpenseTitle,
  });

  cards.push({
    id: 'busiest-day',
    tint: 'var(--c-tint-yellow)',
    label: 'Busiest day',
    value: `${ord(stats.busiestDayOfMonth)}`,
    sub: `$${stats.busiestDayAmount.toFixed(2)} in a single day`,
  });

  cards.push({
    id: 'daily-avg',
    tint: 'var(--c-tint-green)',
    label: 'Daily average',
    value: `$${stats.avgDailySpend.toFixed(2)}`,
    sub: 'spent per day this month',
  });

  if (stats.mostRegrettedTitle) {
    cards.push({
      id: 'most-regretted',
      tint: 'var(--c-tint-pink)',
      label: 'Most regretted',
      value: `$${stats.mostRegrettedAmount.toFixed(2)}`,
      sub: `${stats.mostRegrettedTitle} 😬`,
    });
  }

  if (stats.happiestTitle) {
    cards.push({
      id: 'happiest',
      tint: 'var(--c-tint-green)',
      label: 'Best money spent',
      value: `$${stats.happiestAmount.toFixed(2)}`,
      sub: `${stats.happiestTitle} 😊`,
    });
  }

  const moodLabel =
    stats.moodAvg >= 4.5
      ? 'You were on cloud nine 😊'
      : stats.moodAvg >= 3.5
        ? 'Overall pretty good vibes 🙂'
        : stats.moodAvg >= 2.5
          ? 'Mixed feelings this month 😐'
          : 'Rough month spending-wise 😕';

  cards.push({
    id: 'mood',
    tint: 'var(--c-tint-mood)',
    label: 'Mood score',
    value: `${stats.moodAvg.toFixed(1)} / 5`,
    sub: moodLabel,
  });

  return cards;
}
