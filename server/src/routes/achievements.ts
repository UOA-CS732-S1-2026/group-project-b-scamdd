import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { Friendship } from '../models/Friendship';
import { checkAndAwardAchievements, listAchievements } from '../lib/achievements';

const router = Router();
router.use(requireAuth);

router.get('/me', async (req: Request, res: Response) => {
  try {
    const userId = req.user!._id;
    await checkAndAwardAchievements(userId);
    const achievements = await listAchievements(userId);
    res.json(achievements);
  } catch {
    res.status(500).json({ message: 'Failed to load achievements' });
  }
});

router.get('/users/:id', async (req: Request, res: Response) => {
  try {
    const meId = req.user!._id;
    const otherId = String(req.params.id);
    if (otherId !== meId) {
      const friendship = await Friendship.findOne({
        status: 'accepted',
        $or: [
          { requesterId: meId, addresseeId: otherId },
          { requesterId: otherId, addresseeId: meId },
        ],
      }).lean();
      if (!friendship) {
        res.status(403).json({ message: 'Not friends with that user' });
        return;
      }
    }
    const achievements = await listAchievements(otherId);
    res.json(achievements);
  } catch {
    res.status(500).json({ message: 'Failed to load achievements' });
  }
});

export default router;
