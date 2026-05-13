import { Achievement } from '../models/Achievement.js';
import { Transaction } from '../models/Transaction.js';
import { Budget } from '../models/Budget.js';
import { Goal } from '../models/Goal.js';
import { computeBudgetStreak } from './streaks.js';

export const ACHIEVEMENT_KEYS = [
  'first_transaction',
  'txn_100',
  'txn_500',
  'streak_7',
  'streak_30',
  'streak_100',
  'first_budget',
  'under_budget_month',
  'first_goal',
  'goal_completed',
  'no_regret_14',
  'safety_net',
] as const;

export type AchievementKey = (typeof ACHIEVEMENT_KEYS)[number];

async function listEarnedKeys(userId: string): Promise<Set<string>> {
  const rows = await Achievement.find({ userId }).select({ key: 1 }).lean();
  return new Set(rows.map((r) => r.key));
}

async function award(userId: string, key: AchievementKey): Promise<boolean> {
  try {
    await Achievement.create({ userId, key, earnedAt: new Date() });
    return true;
  } catch {
    return false;
  }
}

export async function checkAndAwardAchievements(userId: string): Promise<AchievementKey[]> {
  const earned = await listEarnedKeys(userId);
  const newlyEarned: AchievementKey[] = [];

  const toCheck = ACHIEVEMENT_KEYS.filter((k) => !earned.has(k));
  if (toCheck.length === 0) return newlyEarned;

  const [txnCount, budgetCount, goalCount] = await Promise.all([
    Transaction.countDocuments({ userId }),
    Budget.countDocuments({ userId }),
    Goal.countDocuments({ userId }),
  ]);

  if (toCheck.includes('first_transaction') && txnCount >= 1) {
    if (await award(userId, 'first_transaction')) newlyEarned.push('first_transaction');
  }
  if (toCheck.includes('txn_100') && txnCount >= 100) {
    if (await award(userId, 'txn_100')) newlyEarned.push('txn_100');
  }
  if (toCheck.includes('txn_500') && txnCount >= 500) {
    if (await award(userId, 'txn_500')) newlyEarned.push('txn_500');
  }

  if (toCheck.includes('first_budget') && budgetCount >= 1) {
    if (await award(userId, 'first_budget')) newlyEarned.push('first_budget');
  }

  if (toCheck.includes('first_goal') && goalCount >= 1) {
    if (await award(userId, 'first_goal')) newlyEarned.push('first_goal');
  }

  if (toCheck.includes('goal_completed')) {
    const completed = await Goal.exists({
      userId,
      $expr: { $gte: ['$currentAmount', '$targetAmount'] },
    });
    if (completed) {
      if (await award(userId, 'goal_completed')) newlyEarned.push('goal_completed');
    }
  }

  if (toCheck.includes('safety_net')) {
    const hasEmergency = await Transaction.exists({ userId, category: 'emergency' });
    if (hasEmergency) {
      if (await award(userId, 'safety_net')) newlyEarned.push('safety_net');
    }
  }

  const needsStreak =
    toCheck.includes('streak_7') || toCheck.includes('streak_30') || toCheck.includes('streak_100');
  if (needsStreak) {
    const streak = await computeBudgetStreak(userId);
    if (toCheck.includes('streak_7') && streak >= 7) {
      if (await award(userId, 'streak_7')) newlyEarned.push('streak_7');
    }
    if (toCheck.includes('streak_30') && streak >= 30) {
      if (await award(userId, 'streak_30')) newlyEarned.push('streak_30');
    }
    if (toCheck.includes('streak_100') && streak >= 100) {
      if (await award(userId, 'streak_100')) newlyEarned.push('streak_100');
    }
  }

  if (toCheck.includes('no_regret_14')) {
    const since = new Date();
    since.setDate(since.getDate() - 14);
    const regret = await Transaction.exists({ userId, mood: 'regret', date: { $gte: since } });
    if (!regret && txnCount > 0) {
      if (await award(userId, 'no_regret_14')) newlyEarned.push('no_regret_14');
    }
  }

  if (toCheck.includes('under_budget_month')) {
    const budgets = await Budget.find({ userId }).lean();
    if (budgets.length > 0) {
      const now = new Date();
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const txns = await Transaction.find({
        userId,
        type: 'expense',
        category: { $ne: 'emergency' },
        date: { $gte: lastMonthStart, $lt: thisMonthStart },
      }).lean();
      const monthlyBudgets = budgets.filter((b) => (b.period ?? 'monthly') === 'monthly');
      const spentByCat: Record<string, number> = {};
      let overall = 0;
      for (const t of txns) {
        spentByCat[t.category ?? 'other'] =
          (spentByCat[t.category ?? 'other'] || 0) + Math.abs(t.amount);
        overall += Math.abs(t.amount);
      }
      let allOk = true;
      for (const b of monthlyBudgets) {
        const spent = b.category === 'overall' ? overall : (spentByCat[b.category] ?? 0);
        if (spent > b.monthlyLimit) {
          allOk = false;
          break;
        }
      }
      if (allOk && monthlyBudgets.length > 0) {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        const oldestBudget = monthlyBudgets.reduce<Date | null>((min, b) => {
          const c = b.createdAt ? new Date(b.createdAt) : null;
          if (!c) return min;
          return !min || c < min ? c : min;
        }, null);
        if (oldestBudget && oldestBudget <= lastMonthStart) {
          if (await award(userId, 'under_budget_month')) newlyEarned.push('under_budget_month');
        }
      }
    }
  }

  return newlyEarned;
}

export async function listAchievements(
  userId: string,
): Promise<Array<{ key: string; earnedAt: string }>> {
  const rows = await Achievement.find({ userId }).select({ key: 1, earnedAt: 1 }).lean();
  return rows.map((r) => ({ key: r.key, earnedAt: new Date(r.earnedAt).toISOString() }));
}

/**
 * Revoke any earned achievement that is no longer truthful after a data
 * mutation (typically a transaction delete). Counts the underlying metric
 * and unsets the badge if the threshold is no longer met. Idempotent.
 *
 * Currently covers the achievement keys that depend on transaction counts
 * or transaction content — the streak-based and budget-based badges are
 * left alone for the simpler "Phase 7" rewrite, which will fold this into
 * a single denormalised UserStats refresh.
 */
export async function revokeAchievementsIfUnearned(userId: string): Promise<AchievementKey[]> {
  const revoked: AchievementKey[] = [];

  const [txnCount, hasEmergency] = await Promise.all([
    Transaction.countDocuments({ userId }),
    Transaction.exists({ userId, category: 'emergency' }).then(Boolean),
  ]);

  const removeIf = async (key: AchievementKey, isStillEarned: boolean) => {
    if (isStillEarned) return;
    const result = await Achievement.deleteOne({ userId, key });
    if (result.deletedCount) revoked.push(key);
  };

  await removeIf('first_transaction', txnCount >= 1);
  await removeIf('txn_100', txnCount >= 100);
  await removeIf('txn_500', txnCount >= 500);
  await removeIf('safety_net', hasEmergency);

  // no_regret_14 was earned if no regret-mood txn existed in the prior 14
  // days; if a regret-mood txn now exists in that window, revoke.
  const since = new Date();
  since.setDate(since.getDate() - 14);
  const hasRegret = await Transaction.exists({
    userId,
    mood: 'regret',
    date: { $gte: since },
  });
  await removeIf('no_regret_14', !hasRegret && txnCount > 0);

  return revoked;
}
