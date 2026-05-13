import { Router, Request, Response } from 'express';
import { Transaction } from '../models/Transaction.js';
import { requireAuth } from '../middleware/auth.js';
import { checkAndAwardAchievements } from '../lib/achievements.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { HttpError } from '../lib/httpError.js';
import { logger } from '../lib/logger.js';
import { getValidated, validate } from '../middleware/validate.js';
import {
  createTransactionSchema,
  listTransactionsQuery,
  updateTransactionSchema,
} from '../schemas/transactions.js';
import { idParam } from '../schemas/common.js';

const router = Router();

router.use(requireAuth);

function fireAchievements(userId: string) {
  checkAndAwardAchievements(userId).catch((err) => {
    logger.error({ err, userId }, 'checkAndAwardAchievements failed');
  });
}

router.get(
  '/',
  validate({ query: listTransactionsQuery }),
  asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = getValidated<{ page?: number; limit?: number }>(req, 'query') ?? {};
    const query = Transaction.find({ userId: req.user!._id }).sort({ date: -1 });

    if (page && limit) {
      const total = await Transaction.countDocuments({ userId: req.user!._id });
      const transactions = await query.skip((page - 1) * limit).limit(limit);
      res.json({ transactions, total, page, limit, pages: Math.ceil(total / limit) });
    } else {
      const transactions = await query;
      res.json(transactions);
    }
  }),
);

router.post(
  '/',
  validate({ body: createTransactionSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const transaction = await Transaction.create({
      userId: req.user!._id,
      ...req.body,
    });
    res.status(201).json(transaction);
    fireAchievements(req.user!._id);
  }),
);

router.patch(
  '/:id',
  validate({ params: idParam, body: updateTransactionSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const transaction = await Transaction.findOneAndUpdate(
      { _id: req.params.id, userId: req.user!._id },
      req.body,
      { new: true, runValidators: true },
    );
    if (!transaction) throw HttpError.notFound('Transaction not found');
    res.json(transaction);
    fireAchievements(req.user!._id);
  }),
);

router.delete(
  '/:id',
  validate({ params: idParam }),
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
