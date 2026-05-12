import type { ITransaction } from '../models/Transaction.js';
import type { IWrappedStats } from '../models/MonthlyWrapped.js';

const MOOD_VALUES: Record<string, number> = { regret: 1, meh: 2, okay: 3, glad: 4, 'worth-it': 5 };

export function computeWrappedStats(txns: ITransaction[]): IWrappedStats {
  const expenses = txns.filter((t) => t.type === 'expense');
  const income   = txns.filter((t) => t.type === 'income');

  const totalSpent  = expenses.reduce((s, t) => s + t.amount, 0);
  const totalIncome = income.reduce((s, t) => s + t.amount, 0);
  const savingsRate = totalIncome > 0 ? (totalIncome - totalSpent) / totalIncome : -1;

  const catTotals: Record<string, number> = {};
  for (const t of expenses) {
    const c = t.category ?? 'other';
    catTotals[c] = (catTotals[c] ?? 0) + t.amount;
  }
  const topCategory = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0] ?? ['other', 0];

  const biggest = expenses.reduce<ITransaction | null>(
    (b, t) => (!b || t.amount > b.amount ? t : b), null,
  );

  const moodedExpenses = expenses.filter((t) => t.mood && MOOD_VALUES[t.mood] !== undefined);
  const mostRegretted = moodedExpenses.reduce<ITransaction | null>((b, t) => {
    if (!b) return t;
    const bv = MOOD_VALUES[b.mood!], tv = MOOD_VALUES[t.mood!];
    if (tv < bv) return t;
    if (tv === bv && t.amount > b.amount) return t;
    return b;
  }, null);

  const happiest = expenses
    .filter((t) => t.mood === 'worth-it')
    .reduce<ITransaction | null>((b, t) => (!b || t.amount > b.amount ? t : b), null);

  const dayTotals: Record<number, number> = {};
  for (const t of expenses) {
    const day = new Date(t.date).getDate();
    dayTotals[day] = (dayTotals[day] ?? 0) + t.amount;
  }
  const busiestEntry = Object.entries(dayTotals).sort((a, b) => b[1] - a[1])[0] ?? ['1', 0];
  const activeDays = Object.keys(dayTotals).length || 1;

  const moodTotal = moodedExpenses.reduce((s, t) => s + t.amount, 0);
  const moodAvg = moodTotal > 0
    ? moodedExpenses.reduce((s, t) => s + MOOD_VALUES[t.mood!] * t.amount, 0) / moodTotal
    : 3;

  return {
    totalSpent,
    totalIncome,
    savingsRate,
    transactionCount: txns.length,
    topCategory: topCategory[0],
    topCategoryAmount: topCategory[1],
    biggestExpenseTitle:  biggest?.title ?? '',
    biggestExpenseAmount: biggest?.amount ?? 0,
    mostRegrettedTitle:   mostRegretted?.title ?? '',
    mostRegrettedAmount:  mostRegretted?.amount ?? 0,
    happiestTitle:        happiest?.title ?? '',
    happiestAmount:       happiest?.amount ?? 0,
    busiestDayOfMonth:    Number(busiestEntry[0]),
    busiestDayAmount:     busiestEntry[1],
    avgDailySpend:        totalSpent / activeDays,
    moodAvg,
  };
}

export function completedMonths(txns: ITransaction[]): { year: number; month: number }[] {
  const now = new Date();
  const currentYear  = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const seen = new Set<string>();
  for (const t of txns) {
    const d = new Date(t.date);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    if (y < currentYear || (y === currentYear && m < currentMonth)) {
      seen.add(`${y}-${m}`);
    }
  }

  return [...seen]
    .map((k) => { const [y, m] = k.split('-').map(Number); return { year: y, month: m }; })
    .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);
}
