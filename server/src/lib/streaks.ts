import { Budget, type BudgetPeriod } from '../models/Budget';
import { Transaction } from '../models/Transaction';

function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

function endOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(23, 59, 59, 999);
  return out;
}

function periodStartFor(period: BudgetPeriod, day: Date): Date {
  const d = startOfDay(day);
  switch (period) {
    case 'daily':
      return d;
    case 'weekly': {
      const dow = d.getDay() === 0 ? 7 : d.getDay();
      const mon = new Date(d);
      mon.setDate(d.getDate() - (dow - 1));
      return mon;
    }
    case 'monthly':
      return new Date(d.getFullYear(), d.getMonth(), 1);
    case 'yearly':
      return new Date(d.getFullYear(), 0, 1);
  }
}

export async function computeBudgetStreak(userId: string): Promise<number> {
  const budgets = await Budget.find({ userId }).lean();
  if (budgets.length === 0) return 0;

  const earliestBudget = budgets.reduce<Date | null>((min, b) => {
    const c = b.createdAt ? new Date(b.createdAt) : null;
    if (!c) return min;
    return !min || c < min ? c : min;
  }, null);
  if (!earliestBudget) return 0;
  const startDate = startOfDay(earliestBudget);

  const txns = await Transaction.find({
    userId,
    type: 'expense',
    category: { $ne: 'emergency' },
  })
    .select({ category: 1, amount: 1, date: 1 })
    .lean();

  const cur = startOfDay(new Date());
  let streak = 0;

  while (cur >= startDate && streak <= 3650) {
    const dayEnd = endOfDay(cur);

    let allOk = true;
    for (const b of budgets) {
      const bCreated = b.createdAt ? new Date(b.createdAt) : null;
      if (bCreated && bCreated > dayEnd) continue;

      const periodStart = periodStartFor((b.period ?? 'monthly') as BudgetPeriod, cur);
      const isOverall = b.category === 'overall';

      let spent = 0;
      for (const t of txns) {
        if (!isOverall && t.category !== b.category) continue;
        const td = new Date(t.date);
        if (td >= periodStart && td <= dayEnd) {
          spent += Math.abs(t.amount);
        }
      }

      if (spent > b.monthlyLimit) {
        allOk = false;
        break;
      }
    }

    if (!allOk) break;
    streak++;
    cur.setDate(cur.getDate() - 1);
  }

  return streak;
}
