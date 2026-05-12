import { Router, Request, Response } from 'express';
import { Transaction } from '../models/Transaction.js';
import { requireAuth } from '../middleware/auth.js';
import { checkAndAwardAchievements } from '../lib/achievements.js';

const router = Router();

router.use(requireAuth);

router.get('/', async (req: Request, res: Response) => {
  try {
    const { page, limit } = req.query;

    const query = Transaction.find({ userId: req.user!._id }).sort({ date: -1 });

    if (page && limit) {
      const p = Math.max(1, parseInt(page as string, 10));
      const l = Math.max(1, parseInt(limit as string, 10));
      const total = await Transaction.countDocuments({ userId: req.user!._id });
      const transactions = await query.skip((p - 1) * l).limit(l);
      res.json({ transactions, total, page: p, limit: l, pages: Math.ceil(total / l) });
    } else {
      const transactions = await query;
      res.json(transactions);
    }
  } catch {
    res.status(500).json({ message: 'Failed to fetch transactions' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, amount, type, category, date, note, mood, essential, paymentMethod } = req.body;
    if (!title || !type || !date) {
      res.status(400).json({ message: 'title, type, and date are required' });
      return;
    }
    if (type === 'expense' && !category) {
      res.status(400).json({ message: 'category is required for expenses' });
      return;
    }
    if (!['income', 'expense'].includes(type)) {
      res.status(400).json({ message: 'type must be income or expense' });
      return;
    }
    if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
      res.status(400).json({ message: 'amount must be a positive number' });
      return;
    }
    const transaction = await Transaction.create({
      userId: req.user!._id,
      title,
      amount,
      type,
      category,
      date,
      note,
      mood,
      essential,
      paymentMethod,
    });
    res.status(201).json(transaction);
    checkAndAwardAchievements(req.user!._id).catch(() => { /* ignore */ });
  } catch {
    res.status(500).json({ message: 'Failed to create transaction' });
  }
});

router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { title, amount, type, category, date, note, mood, essential, paymentMethod } = req.body;
    const updates: Record<string, unknown> = {};
    if (title !== undefined) updates.title = title;
    if (amount !== undefined) {
      if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
        res.status(400).json({ message: 'amount must be a positive number' });
        return;
      }
      updates.amount = amount;
    }
    if (type !== undefined) {
      if (!['income', 'expense'].includes(type)) {
        res.status(400).json({ message: 'type must be income or expense' });
        return;
      }
      updates.type = type;
    }
    if (category !== undefined) updates.category = category;
    if (date !== undefined) updates.date = date;
    if (note !== undefined) updates.note = note;
    if (mood !== undefined) updates.mood = mood;
    if (essential !== undefined) updates.essential = essential;
    if (paymentMethod !== undefined) updates.paymentMethod = paymentMethod;

    const transaction = await Transaction.findOneAndUpdate(
      { _id: req.params.id, userId: req.user!._id },
      updates,
      { new: true, runValidators: true },
    );
    if (!transaction) {
      res.status(404).json({ message: 'Transaction not found' });
      return;
    }
    res.json(transaction);
    checkAndAwardAchievements(req.user!._id).catch(() => { /* ignore */ });
  } catch {
    res.status(500).json({ message: 'Failed to update transaction' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const transaction = await Transaction.findOneAndDelete({
      _id: req.params.id,
      userId: req.user!._id,
    });
    if (!transaction) {
      res.status(404).json({ message: 'Transaction not found' });
      return;
    }
    res.status(204).send();
  } catch {
    res.status(500).json({ message: 'Failed to delete transaction' });
  }
});

export default router;
