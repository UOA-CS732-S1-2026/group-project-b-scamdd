import { Transaction } from '../models/Transaction.js';
import type { BudgetPeriod } from '../models/Budget.js';
import { periodRange } from './dateRange.js';

export interface AggregateSpendOptions {
  /** One or more user IDs to include. */
  userIds: string[];
  /** Restrict to a single category, or omit to group by category. */
  category?: string;
  /** Period to compute boundaries for. */
  period: BudgetPeriod;
  /** Pin the period boundaries to a specific moment (defaults to now). */
  now?: Date;
  /** $match exclude — defaults to excluding the "emergency" category. */
  excludeCategories?: string[];
}

/**
 * Aggregate transaction spend across users.
 *
 * - If `category` is set, returns `{ [userId]: totalForThatCategory }`.
 * - If `category` is not set, returns `{ [userId]: { [category]: total, overall: number } }`.
 *
 * Single canonical implementation — replaces the three duplicates that used
 * to live in budgets.ts, friends.ts, and sharedBudgets.ts (audit H2).
 */
export async function aggregateSpendByUser(
  options: AggregateSpendOptions & { category: string },
): Promise<Record<string, number>>;
export async function aggregateSpendByUser(
  options: AggregateSpendOptions & { category?: undefined },
): Promise<Record<string, Record<string, number>>>;
export async function aggregateSpendByUser(
  options: AggregateSpendOptions,
): Promise<Record<string, number> | Record<string, Record<string, number>>> {
  const { userIds, category, period, now, excludeCategories } = options;
  if (userIds.length === 0) return {};
  const { start, end } = periodRange(period, { now });

  const match: Record<string, unknown> = {
    userId: userIds.length === 1 ? userIds[0] : { $in: userIds },
    type: 'expense',
    date: { $gte: start, $lt: end },
  };
  if (category !== undefined) {
    match.category = category;
  } else if (excludeCategories?.length) {
    match.category = { $nin: excludeCategories };
  }

  if (category !== undefined) {
    const rows = await Transaction.aggregate<{ _id: string; total: number }>([
      { $match: match },
      { $group: { _id: '$userId', total: { $sum: '$amount' } } },
    ]);
    const out: Record<string, number> = {};
    for (const r of rows) out[r._id] = r.total;
    return out;
  }

  const rows = await Transaction.aggregate<{
    _id: { userId: string; category: string };
    total: number;
  }>([
    { $match: match },
    {
      $group: {
        _id: { userId: '$userId', category: '$category' },
        total: { $sum: '$amount' },
      },
    },
  ]);
  const out: Record<string, Record<string, number>> = {};
  for (const r of rows) {
    const u = (out[r._id.userId] ??= {});
    u[r._id.category] = r.total;
    u.overall = (u.overall ?? 0) + r.total;
  }
  return out;
}

/**
 * Convenience for a single user: spend by category for one period.
 */
export async function spendByCategoryForUser(
  userId: string,
  period: BudgetPeriod,
  options: { now?: Date; excludeCategories?: string[] } = {},
): Promise<Record<string, number>> {
  const grouped = await aggregateSpendByUser({
    userIds: [userId],
    period,
    now: options.now,
    excludeCategories: options.excludeCategories,
  });
  return grouped[userId] ?? {};
}
