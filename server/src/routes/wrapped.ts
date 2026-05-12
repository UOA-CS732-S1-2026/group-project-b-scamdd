import { Router, Request, Response } from 'express';
import { MonthlyWrapped } from '../models/MonthlyWrapped';
import { Transaction } from '../models/Transaction';
import { requireAuth } from '../middleware/auth';
import { computeWrappedStats, completedMonths } from '../lib/computeWrapped';

const router = Router();

router.use(requireAuth);

router.get('/', async (req: Request, res: Response) => {
  try {
    const wrapped = await MonthlyWrapped.find({ userId: req.user!._id })
      .sort({ year: -1, month: -1 });
    res.json(wrapped);
  } catch {
    res.status(500).json({ message: 'Failed to fetch wrapped data' });
  }
});

router.post('/regenerate', async (req: Request, res: Response) => {
  try {
    const userId = req.user!._id;
    const allTxns = await Transaction.find({ userId });

    await MonthlyWrapped.deleteMany({ userId });

    const months = completedMonths(allTxns);
    const docs = months.map(({ year, month }) => {
      const monthTxns = allTxns.filter((t) => {
        const d = new Date(t.date);
        return d.getFullYear() === year && d.getMonth() + 1 === month;
      });
      return { userId, year, month, stats: computeWrappedStats(monthTxns), generatedAt: new Date() };
    });

    const inserted = await MonthlyWrapped.insertMany(docs);
    res.json({ generated: inserted.length, months: months });
  } catch (err) {
    res.status(500).json({ message: 'Failed to regenerate wrapped data' });
  }
});

export default router;
