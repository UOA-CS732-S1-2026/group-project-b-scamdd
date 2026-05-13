import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { Friendship } from '../models/Friendship.js';
import { checkAndAwardAchievements, listAchievements } from '../lib/achievements.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { HttpError } from '../lib/httpError.js';
import { logger } from '../lib/logger.js';

const router = Router();
router.use(requireAuth);

router.get(
  '/me',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!._id;
    // Pure read path. Writes (awards) happen synchronously after every
    // mutation that could trigger one — txn/budget/goal create + contribute.
    // Phase 5 also revokes badges on tx delete. This route used to re-run
    // checkAndAwardAchievements on every visit, which was an O(streak-scan)
    // cost on every page load (audit C5).
    const achievements = await listAchievements(userId);
    res.json(achievements);
    // Best-effort, async, after-response: pick up any badge that was missed
    // due to an earlier server error in the write path. Logged on failure.
    checkAndAwardAchievements(userId).catch((err) => {
      logger.error({ err, userId }, 'background achievement check failed');
    });
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
