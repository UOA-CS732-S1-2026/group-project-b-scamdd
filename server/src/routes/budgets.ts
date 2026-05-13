import { Router, Request, Response } from 'express';
import { Budget, type BudgetPeriod } from '../models/Budget.js';
import { requireAuth } from '../middleware/auth.js';
import { checkAndAwardAchievements } from '../lib/achievements.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { HttpError } from '../lib/httpError.js';
import { logger } from '../lib/logger.js';
import { spendByCategoryForUser } from '../lib/spend.js';
import { validate } from '../middleware/validate.js';
import { createBudgetSchema, updateBudgetSchema } from '../schemas/budgets.js';
import { idParam } from '../schemas/common.js';

const router = Router();
router.use(requireAuth);

function fireAchievements(userId: string) {
  checkAndAwardAchievements(userId).catch((err) => {
    logger.error({ err, userId }, 'checkAndAwardAchievements failed');
  });
}

async function spentForPeriod(userId: string, period: BudgetPeriod): Promise<Record<string, number>> {
  const map = await spendByCategoryForUser(userId, period, {
    excludeCategories: ['emergency'],
  });
  // Existing API exposes an "overall" pseudo-category — preserve it.
  let overall = 0;
  for (const [k, v] of Object.entries(map)) {
    if (k === 'overall') continue;
    overall += v;
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
  validate({ body: createBudgetSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { category, monthlyLimit, period, isPublic } = req.body as {
      category: string;
      monthlyLimit: number;
      period?: BudgetPeriod;
      isPublic?: boolean;
    };

    try {
      const budget = await Budget.create({
        userId: req.user!._id,
        category,
        monthlyLimit,
        period: period ?? 'monthly',
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
  validate({ params: idParam, body: updateBudgetSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { category, monthlyLimit, period, isPublic } = req.body as {
      category?: string;
      monthlyLimit?: number;
      period?: BudgetPeriod;
      isPublic?: boolean;
    };
    const updates: Record<string, unknown> = {};

    if (category !== undefined) updates.category = category;
    if (monthlyLimit !== undefined) updates.monthlyLimit = monthlyLimit;
    if (period !== undefined) updates.period = period;
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
  validate({ params: idParam }),
  asyncHandler(async (req: Request, res: Response) => {
    const budget = await Budget.findOneAndDelete({ _id: req.params.id, userId: req.user!._id });
    if (!budget) {
      throw HttpError.notFound('Budget not found');
    }
    res.status(204).send();
  }),
);

export default router;
