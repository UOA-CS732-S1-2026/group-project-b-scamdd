import { Router, Request, Response } from 'express';
import { Transaction } from '../models/Transaction';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/', async (req: Request, res: Response) => {
  try {
    const transactions = await Transaction.find({ userId: req.user!._id }).sort({ date: -1 });
    res.json(transactions);
  } catch {
    res.status(500).json({ message: 'Failed to fetch transactions' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, amount, type, category, date, note, mood } = req.body;
    if (!title || !type || !category || !date) {
      res.status(400).json({ message: 'title, type, category, and date are required' });
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
    });
    res.status(201).json(transaction);
  } catch {
    res.status(500).json({ message: 'Failed to create transaction' });
  }
});

router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { title, amount, type, category, date, note, mood } = req.body;
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
