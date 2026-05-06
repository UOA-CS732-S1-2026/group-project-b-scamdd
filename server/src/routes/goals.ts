import { Router, Request, Response } from 'express';
import { Goal } from '../models/Goal';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/', async (req: Request, res: Response) => {
  try {
    const goals = await Goal.find({ userId: req.user!._id }).sort({ deadline: 1 });
    res.json(goals);
  } catch {
    res.status(500).json({ message: 'Failed to fetch goals' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, targetAmount, currentAmount, deadline, isPublic } = req.body ?? {};
    if (!name || !deadline) {
      res.status(400).json({ message: 'name and deadline are required' });
      return;
    }
    if (typeof targetAmount !== 'number' || targetAmount <= 0) {
      res.status(400).json({ message: 'targetAmount must be a positive number' });
      return;
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
  } catch {
    res.status(500).json({ message: 'Failed to create goal' });
  }
});

router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { name, targetAmount, currentAmount, deadline, isPublic } = req.body ?? {};
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (targetAmount !== undefined) {
      if (typeof targetAmount !== 'number' || targetAmount <= 0) {
        res.status(400).json({ message: 'targetAmount must be a positive number' });
        return;
      }
      updates.targetAmount = targetAmount;
    }
    if (currentAmount !== undefined) {
      if (typeof currentAmount !== 'number' || currentAmount < 0) {
        res.status(400).json({ message: 'currentAmount must be a non-negative number' });
        return;
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
      res.status(404).json({ message: 'Goal not found' });
      return;
    }
    res.json(goal);
  } catch {
    res.status(500).json({ message: 'Failed to update goal' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const goal = await Goal.findOneAndDelete({
      _id: req.params.id,
      userId: req.user!._id,
    });
    if (!goal) {
      res.status(404).json({ message: 'Goal not found' });
      return;
    }
    res.status(204).send();
  } catch {
    res.status(500).json({ message: 'Failed to delete goal' });
  }
});

router.post('/:id/contribute', async (req: Request, res: Response) => {
  try {
    const { amount } = req.body ?? {};
    if (typeof amount !== 'number' || amount <= 0) {
      res.status(400).json({ message: 'amount must be a positive number' });
      return;
    }
    const goal = await Goal.findOneAndUpdate(
      { _id: req.params.id, userId: req.user!._id },
      { $inc: { currentAmount: amount } },
      { new: true, runValidators: true },
    );
    if (!goal) {
      res.status(404).json({ message: 'Goal not found' });
      return;
    }
    res.json(goal);
  } catch {
    res.status(500).json({ message: 'Failed to record contribution' });
  }
});

export default router;
