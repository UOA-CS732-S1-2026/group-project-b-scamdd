import { Router, Request, Response } from 'express';
import { Cheer } from '../models/Cheer.js';
import { Achievement } from '../models/Achievement.js';
import { Friendship } from '../models/Friendship.js';
import { User } from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { HttpError } from '../lib/httpError.js';
import { validate } from '../middleware/validate.js';
import {
  cheersForParams,
  createCheerSchema,
  deleteCheerSchema,
} from '../schemas/cheers.js';

const router = Router();
router.use(requireAuth);

async function areFriends(meId: string, otherId: string): Promise<boolean> {
  if (meId === otherId) return false;
  const f = await Friendship.findOne({
    status: 'accepted',
    $or: [
      { requesterId: meId, addresseeId: otherId },
      { requesterId: otherId, addresseeId: meId },
    ],
  }).lean();
  return Boolean(f);
}

router.post(
  '/',
  validate({ body: createCheerSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const meId = req.user!._id;
    const { toUserId, achievementKey } = req.body as { toUserId: string; achievementKey: string };
    if (toUserId === meId) {
      throw HttpError.badRequest('Cannot cheer yourself');
    }
    if (!(await areFriends(meId, toUserId))) {
      throw HttpError.forbidden('You are not friends with that user');
    }
    const owns = await Achievement.exists({ userId: toUserId, key: achievementKey });
    if (!owns) {
      throw HttpError.notFound('Achievement not found');
    }
    await Cheer.updateOne(
      { toUserId, fromUserId: meId, achievementKey },
      { $setOnInsert: { toUserId, fromUserId: meId, achievementKey, seenByRecipient: false } },
      { upsert: true },
    );
    res.status(201).json({ ok: true });
  }),
);

router.delete(
  '/',
  validate({ body: deleteCheerSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const meId = req.user!._id;
    const { toUserId, achievementKey } = req.body as { toUserId: string; achievementKey: string };
    await Cheer.deleteOne({ toUserId, fromUserId: meId, achievementKey });
    res.status(204).send();
  }),
);

router.get(
  '/sent',
  asyncHandler(async (req: Request, res: Response) => {
    const meId = req.user!._id;
    const sent = await Cheer.find({ fromUserId: meId })
      .select({ toUserId: 1, achievementKey: 1 })
      .lean();
    res.json(sent.map(c => ({ toUserId: c.toUserId, achievementKey: c.achievementKey })));
  }),
);

router.get(
  '/received',
  asyncHandler(async (req: Request, res: Response) => {
    const meId = req.user!._id;
    const cheers = await Cheer.find({ toUserId: meId })
      .sort({ createdAt: -1 })
      .lean();
    const fromIds = [...new Set(cheers.map(c => c.fromUserId))];
    const users = await User.find({ _id: { $in: fromIds } }).lean();
    const userById = new Map(users.map(u => [String(u._id), u]));
    res.json(
      cheers.map(c => {
        const u = userById.get(c.fromUserId);
        return {
          id: String(c._id),
          fromId: c.fromUserId,
          fromUsername: u?.username ?? null,
          fromDisplayName: u?.displayName ?? null,
          achievementKey: c.achievementKey,
          createdAt: c.createdAt,
          seen: c.seenByRecipient,
        };
      }),
    );
  }),
);

router.post(
  '/mark-seen',
  asyncHandler(async (req: Request, res: Response) => {
    const meId = req.user!._id;
    await Cheer.updateMany({ toUserId: meId, seenByRecipient: false }, { $set: { seenByRecipient: true } });
    res.status(204).send();
  }),
);

router.get(
  '/for/:userId/:key',
  validate({ params: cheersForParams }),
  asyncHandler(async (req: Request, res: Response) => {
    const meId = req.user!._id;
    const userId = String(req.params.userId);
    const key = String(req.params.key);
    if (userId !== meId && !(await areFriends(meId, userId))) {
      throw HttpError.forbidden('Not friends with that user');
    }
    const cheers = await Cheer.find({ toUserId: userId, achievementKey: key }).lean();
    const fromIds = cheers.map(c => c.fromUserId);
    const users = await User.find({ _id: { $in: fromIds } }).lean();
    const userById = new Map(users.map(u => [String(u._id), u]));
    res.json(
      cheers.map(c => {
        const u = userById.get(c.fromUserId);
        return {
          id: c.fromUserId,
          username: u?.username ?? null,
          displayName: u?.displayName ?? null,
        };
      }),
    );
  }),
);

export default router;
