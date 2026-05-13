import { Router, Request, Response } from 'express';
import { MonthlyWrapped } from '../models/MonthlyWrapped.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';

const router = Router();

router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const wrapped = await MonthlyWrapped.find({ userId: req.user!._id })
      .sort({ year: -1, month: -1 });
    res.json(wrapped);
  }),
);

export default router;
