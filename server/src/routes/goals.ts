import { Router, Request, Response } from 'express';
import { Goal } from '../models/Goal.js';
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
    const goals = await Goal.find({ userId: req.user!._id }).sort({ deadline: 1 });
    res.json(goals);
  }),
);

router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { name, targetAmount, currentAmount, deadline, isPublic } = req.body ?? {};
    if (!name || !deadline) {
      throw HttpError.badRequest('name and deadline are required');
    }
    if (typeof targetAmount !== 'number' || targetAmount <= 0) {
      throw HttpError.badRequest('targetAmount must be a positive number');
    }
    const goal = await Goal.create({
      userId: req.user!._id,
      name,
      targetAmount,
      currentAmount: typeof currentAmount === 'number' && currentAmount >= 0 ? currentAmount : 0,
      deadline,
      isPublic: Boolean(isPublic),
    });
    res.status(201).json(goal);
    fireAchievements(req.user!._id);
  }),
);

router.patch(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { name, targetAmount, currentAmount, deadline, isPublic } = req.body ?? {};
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (targetAmount !== undefined) {
      if (typeof targetAmount !== 'number' || targetAmount <= 0) {
        throw HttpError.badRequest('targetAmount must be a positive number');
      }
      updates.targetAmount = targetAmount;
    }
    if (currentAmount !== undefined) {
      if (typeof currentAmount !== 'number' || currentAmount < 0) {
        throw HttpError.badRequest('currentAmount must be a non-negative number');
      }
      updates.currentAmount = currentAmount;
    }
    if (deadline !== undefined) updates.deadline = deadline;
    if (isPublic !== undefined) updates.isPublic = Boolean(isPublic);

    const goal = await Goal.findOneAndUpdate(
      { _id: req.params.id, userId: req.user!._id },
      updates,
      { new: true, runValidators: true },
    );
    if (!goal) {
      throw HttpError.notFound('Goal not found');
    }
    res.json(goal);
    fireAchievements(req.user!._id);
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const goal = await Goal.findOneAndDelete({
      _id: req.params.id,
      userId: req.user!._id,
    });
    if (!goal) {
      throw HttpError.notFound('Goal not found');
    }
    res.status(204).send();
  }),
);

router.post(
  '/:id/contribute',
  asyncHandler(async (req: Request, res: Response) => {
    const { amount } = req.body ?? {};
    if (typeof amount !== 'number' || amount <= 0) {
      throw HttpError.badRequest('amount must be a positive number');
    }
    const goal = await Goal.findOneAndUpdate(
      { _id: req.params.id, userId: req.user!._id },
      { $inc: { currentAmount: amount } },
      { new: true, runValidators: true },
    );
    if (!goal) {
      throw HttpError.notFound('Goal not found');
    }
    res.json(goal);
    fireAchievements(req.user!._id);
  }),
);

export default router;
