import { Router, Request, Response } from 'express';
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

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
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
  }),
);

router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { title, amount, type, category, date, note, mood, essential, paymentMethod } = req.body;
    if (!title || !type || !date) {
      throw HttpError.badRequest('title, type, and date are required');
    }
    if (type === 'expense' && !category) {
      throw HttpError.badRequest('category is required for expenses');
    }
    if (!['income', 'expense'].includes(type)) {
      throw HttpError.badRequest('type must be income or expense');
    }
    if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
      throw HttpError.badRequest('amount must be a positive number');
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
    fireAchievements(req.user!._id);
  }),
);

router.patch(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { title, amount, type, category, date, note, mood, essential, paymentMethod } = req.body;
    const updates: Record<string, unknown> = {};
    if (title !== undefined) updates.title = title;
    if (amount !== undefined) {
      if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
        throw HttpError.badRequest('amount must be a positive number');
      }
      updates.amount = amount;
    }
    if (type !== undefined) {
      if (!['income', 'expense'].includes(type)) {
        throw HttpError.badRequest('type must be income or expense');
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
    if (!transaction) throw HttpError.notFound('Transaction not found');
    res.json(transaction);
    fireAchievements(req.user!._id);
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const transaction = await Transaction.findOneAndDelete({
      _id: req.params.id,
      userId: req.user!._id,
    });
    if (!transaction) throw HttpError.notFound('Transaction not found');
    res.status(204).send();
  }),
);

export default router;
