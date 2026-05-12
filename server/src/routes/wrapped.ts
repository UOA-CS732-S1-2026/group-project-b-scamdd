import { Router, Request, Response } from 'express';
import { MonthlyWrapped } from '../models/MonthlyWrapped.js';
import { requireAuth } from '../middleware/auth.js';

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

export default router;
