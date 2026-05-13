import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { Friendship } from '../models/Friendship.js';
import { checkAndAwardAchievements, listAchievements } from '../lib/achievements.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { HttpError } from '../lib/httpError.js';

const router = Router();
router.use(requireAuth);

router.get(
  '/me',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!._id;
    await checkAndAwardAchievements(userId);
    const achievements = await listAchievements(userId);
    res.json(achievements);
  }),
);

router.get(
  '/users/:id',
  asyncHandler(async (req: Request, res: Response) => {
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
        throw HttpError.forbidden('Not friends with that user');
      }
    }
    const achievements = await listAchievements(otherId);
    res.json(achievements);
  }),
);

export default router;
