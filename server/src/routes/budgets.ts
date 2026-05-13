import { Router, Request, Response } from 'express';
import { Budget, type BudgetPeriod } from '../models/Budget.js';
import { Transaction } from '../models/Transaction.js';
import { requireAuth } from '../middleware/auth.js';
import { checkAndAwardAchievements } from '../lib/achievements.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { HttpError } from '../lib/httpError.js';
import { logger } from '../lib/logger.js';

const router = Router();
router.use(requireAuth);

function fireAchievements(userId: string) {
  checkAndAwardAchievements(userId).catch((err) => {
    logger.error({ err, userId }, 'checkAndAwardAchievements failed');
  });
}

function periodRange(period: BudgetPeriod): { start: Date; end: Date } {
  const now = new Date();
  switch (period) {
    case 'daily': {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      return { start, end };
    }
    case 'weekly': {
      const day = now.getDay() === 0 ? 7 : now.getDay(); // Mon=1 … Sun=7
      const monday = new Date(now);
      monday.setDate(now.getDate() - (day - 1));
      monday.setHours(0, 0, 0, 0);
      const nextMonday = new Date(monday);
      nextMonday.setDate(monday.getDate() + 7);
      return { start: monday, end: nextMonday };
    }
    case 'monthly':
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: new Date(now.getFullYear(), now.getMonth() + 1, 1),
      };
    case 'yearly':
      return {
        start: new Date(now.getFullYear(), 0, 1),
        end: new Date(now.getFullYear() + 1, 0, 1),
      };
  }
}

async function spentForPeriod(userId: string, period: BudgetPeriod): Promise<Record<string, number>> {
  const { start, end } = periodRange(period);
  const rows = await Transaction.aggregate<{ _id: string; total: number }>([
    {
      $match: {
        userId,
        type: 'expense',
        category: { $ne: 'emergency' },
        date: { $gte: start, $lt: end },
      },
    },
    { $group: { _id: '$category', total: { $sum: '$amount' } } },
  ]);
  const map: Record<string, number> = {};
  let overall = 0;
  for (const r of rows) {
    map[r._id] = r.total;
    overall += r.total;
  }
  map['overall'] = overall;
  return map;
}

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!._id;
    const budgets = await Budget.find({ userId }).sort({ category: 1 }).lean();

    // Compute spending once per unique period type present in user's budgets
    const uniquePeriods = [...new Set(budgets.map((b) => (b.period ?? 'monthly') as BudgetPeriod))];
    const spendingMaps = await Promise.all(
      uniquePeriods.map((p) => spentForPeriod(userId, p).then((m) => ({ period: p, map: m }))),
    );
    const spendingByPeriod: Record<string, Record<string, number>> = {};
    for (const { period, map } of spendingMaps) spendingByPeriod[period] = map;

    const enriched = budgets.map((b) => {
      const period = (b.period ?? 'monthly') as BudgetPeriod;
      const spent = spendingByPeriod[period]?.[b.category] ?? 0;
      return { ...b, spent, remaining: Math.max(0, b.monthlyLimit - spent) };
    });

    res.json(enriched);
  }),
);

router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { category, monthlyLimit, period, isPublic } = req.body ?? {};
    if (!category) {
      throw HttpError.badRequest('category is required');
    }
    if (category === 'emergency') {
      throw HttpError.badRequest('Emergency cannot have a budget');
    }
    if (typeof monthlyLimit !== 'number' || monthlyLimit <= 0) {
      throw HttpError.badRequest('limit must be a positive number');
    }
    const validPeriods = ['daily', 'weekly', 'monthly', 'yearly'];
    const resolvedPeriod = validPeriods.includes(period) ? period : 'monthly';

    try {
      const budget = await Budget.create({
        userId: req.user!._id,
        category,
        monthlyLimit,
        period: resolvedPeriod,
        isPublic: Boolean(isPublic),
      });
      res.status(201).json(budget);
      fireAchievements(req.user!._id);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err && (err as { code: number }).code === 11000) {
        throw HttpError.conflict('A budget for that category and period already exists');
      }
      throw err;
    }
  }),
);

router.patch(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { category, monthlyLimit, period, isPublic } = req.body ?? {};
    const updates: Record<string, unknown> = {};

    if (category !== undefined) updates.category = category;
    if (monthlyLimit !== undefined) {
      if (typeof monthlyLimit !== 'number' || monthlyLimit <= 0) {
        throw HttpError.badRequest('limit must be a positive number');
      }
      updates.monthlyLimit = monthlyLimit;
    }
    const validPeriods = ['daily', 'weekly', 'monthly', 'yearly'];
    if (period !== undefined && validPeriods.includes(period)) updates.period = period;
    if (isPublic !== undefined) updates.isPublic = Boolean(isPublic);

    try {
      const budget = await Budget.findOneAndUpdate(
        { _id: req.params.id, userId: req.user!._id },
        updates,
        { new: true, runValidators: true },
      );
      if (!budget) {
        throw HttpError.notFound('Budget not found');
      }
      res.json(budget);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err && (err as { code: number }).code === 11000) {
        throw HttpError.conflict('A budget for that category and period already exists');
      }
      throw err;
    }
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const budget = await Budget.findOneAndDelete({ _id: req.params.id, userId: req.user!._id });
    if (!budget) {
      throw HttpError.notFound('Budget not found');
    }
    res.status(204).send();
  }),
);

export default router;
