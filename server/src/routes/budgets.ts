import { Router, Request, Response } from 'express';
import { Budget, type BudgetPeriod } from '../models/Budget';
import { Transaction } from '../models/Transaction';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

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

router.get('/', async (req: Request, res: Response) => {
  try {
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
  } catch {
    res.status(500).json({ message: 'Failed to fetch budgets' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { category, monthlyLimit, period, isPublic } = req.body ?? {};
    if (!category) {
      res.status(400).json({ message: 'category is required' });
      return;
    }
    if (category === 'emergency') {
      res.status(400).json({ message: 'Emergency cannot have a budget' });
      return;
    }
    if (typeof monthlyLimit !== 'number' || monthlyLimit <= 0) {
      res.status(400).json({ message: 'limit must be a positive number' });
      return;
    }
    const validPeriods = ['daily', 'weekly', 'monthly', 'yearly'];
    const resolvedPeriod = validPeriods.includes(period) ? period : 'monthly';

    const budget = await Budget.create({
      userId: req.user!._id,
      category,
      monthlyLimit,
      period: resolvedPeriod,
      isPublic: Boolean(isPublic),
    });
    res.status(201).json(budget);
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: number }).code === 11000) {
      res.status(409).json({ message: 'A budget for that category already exists' });
      return;
    }
    res.status(500).json({ message: 'Failed to create budget' });
  }
});

router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { monthlyLimit, period, isPublic } = req.body ?? {};
    const updates: Record<string, unknown> = {};

    if (monthlyLimit !== undefined) {
      if (typeof monthlyLimit !== 'number' || monthlyLimit <= 0) {
        res.status(400).json({ message: 'limit must be a positive number' });
        return;
      }
      updates.monthlyLimit = monthlyLimit;
    }
    const validPeriods = ['daily', 'weekly', 'monthly', 'yearly'];
    if (period !== undefined && validPeriods.includes(period)) updates.period = period;
    if (isPublic !== undefined) updates.isPublic = Boolean(isPublic);

    const budget = await Budget.findOneAndUpdate(
      { _id: req.params.id, userId: req.user!._id },
      updates,
      { new: true, runValidators: true },
    );
    if (!budget) {
      res.status(404).json({ message: 'Budget not found' });
      return;
    }
    res.json(budget);
  } catch {
    res.status(500).json({ message: 'Failed to update budget' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const budget = await Budget.findOneAndDelete({ _id: req.params.id, userId: req.user!._id });
    if (!budget) {
      res.status(404).json({ message: 'Budget not found' });
      return;
    }
    res.status(204).send();
  } catch {
    res.status(500).json({ message: 'Failed to delete budget' });
  }
});

export default router;
