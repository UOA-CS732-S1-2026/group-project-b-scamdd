import { Router, Request, Response } from 'express';
import { Goal } from '../models/Goal.js';
import { requireAuth } from '../middleware/auth.js';
import { checkAndAwardAchievements } from '../lib/achievements.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { HttpError } from '../lib/httpError.js';
import { logger } from '../lib/logger.js';
import { validate } from '../middleware/validate.js';
import {
  contributeGoalSchema,
  createGoalSchema,
  updateGoalSchema,
} from '../schemas/goals.js';
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
  asyncHandler(async (req: Request, res: Response) => {
    const goals = await Goal.find({ userId: req.user!._id }).sort({ deadline: 1 });
    res.json(goals);
  }),
);

router.post(
  '/',
  validate({ body: createGoalSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { name, targetAmount, currentAmount, deadline, isPublic } = req.body as {
      name: string;
      targetAmount: number;
      currentAmount?: number;
      deadline: string | Date;
      isPublic?: boolean;
    };
    const goal = await Goal.create({
      userId: req.user!._id,
      name,
      targetAmount,
      currentAmount: currentAmount ?? 0,
      deadline,
      isPublic: Boolean(isPublic),
    });
    res.status(201).json(goal);
    fireAchievements(req.user!._id);
  }),
);

router.patch(
  '/:id',
  validate({ params: idParam, body: updateGoalSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { name, targetAmount, currentAmount, deadline, isPublic } = req.body as {
      name?: string;
      targetAmount?: number;
      currentAmount?: number;
      deadline?: string | Date;
      isPublic?: boolean;
    };
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (targetAmount !== undefined) updates.targetAmount = targetAmount;
    if (currentAmount !== undefined) updates.currentAmount = currentAmount;
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
  validate({ params: idParam }),
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
  validate({ params: idParam, body: contributeGoalSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { amount } = req.body as { amount: number };
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
