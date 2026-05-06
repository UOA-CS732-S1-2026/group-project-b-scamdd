import { Router, Request, Response } from 'express';
import { Budget } from '../models/Budget';
import { Transaction } from '../models/Transaction';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

function currentMonthRange(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start, end };
}

async function spentByCategory(userId: string): Promise<Record<string, number>> {
  const { start, end } = currentMonthRange();
  const rows = await Transaction.aggregate<{ _id: string; total: number }>([
    {
      $match: {
        userId,
        type: 'expense',
        date: { $gte: start, $lt: end },
      },
    },
    { $group: { _id: '$category', total: { $sum: '$amount' } } },
  ]);
  const map: Record<string, number> = {};
  for (const r of rows) map[r._id] = r.total;
  return map;
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!._id;
    const [budgets, spent] = await Promise.all([
      Budget.find({ userId }).sort({ category: 1 }).lean(),
      spentByCategory(userId),
    ]);
    const enriched = budgets.map((b) => {
      const used = spent[b.category] ?? 0;
      return {
        ...b,
        spent: used,
        remaining: Math.max(0, b.monthlyLimit - used),
      };
    });
    res.json(enriched);
  } catch {
    res.status(500).json({ message: 'Failed to fetch budgets' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { category, monthlyLimit, isPublic } = req.body ?? {};
    if (!category) {
      res.status(400).json({ message: 'category is required' });
      return;
    }
    if (typeof monthlyLimit !== 'number' || monthlyLimit <= 0) {
      res.status(400).json({ message: 'monthlyLimit must be a positive number' });
      return;
    }
    const budget = await Budget.create({
      userId: req.user!._id,
      category,
      monthlyLimit,
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
    const { monthlyLimit, isPublic } = req.body ?? {};
    const updates: Record<string, unknown> = {};
    if (monthlyLimit !== undefined) {
      if (typeof monthlyLimit !== 'number' || monthlyLimit <= 0) {
        res.status(400).json({ message: 'monthlyLimit must be a positive number' });
        return;
      }
      updates.monthlyLimit = monthlyLimit;
    }
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
    const budget = await Budget.findOneAndDelete({
      _id: req.params.id,
      userId: req.user!._id,
    });
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
