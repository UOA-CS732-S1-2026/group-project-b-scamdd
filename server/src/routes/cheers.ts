import { Router, Request, Response } from 'express';
import { Cheer } from '../models/Cheer';
import { Achievement } from '../models/Achievement';
import { Friendship } from '../models/Friendship';
import { User } from '../models/User';
import { requireAuth } from '../middleware/auth';
import { notify } from '../lib/notificationBus';

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

router.post('/', async (req: Request, res: Response) => {
  try {
    const meId = req.user!._id;
    const { toUserId, achievementKey } = req.body ?? {};
    if (!toUserId || !achievementKey || typeof toUserId !== 'string' || typeof achievementKey !== 'string') {
      res.status(400).json({ message: 'toUserId and achievementKey are required' });
      return;
    }
    if (toUserId === meId) {
      res.status(400).json({ message: 'Cannot cheer yourself' });
      return;
    }
    if (!(await areFriends(meId, toUserId))) {
      res.status(403).json({ message: 'You are not friends with that user' });
      return;
    }
    const owns = await Achievement.exists({ userId: toUserId, key: achievementKey });
    if (!owns) {
      res.status(404).json({ message: 'Achievement not found' });
      return;
    }
    const result = await Cheer.updateOne(
      { toUserId, fromUserId: meId, achievementKey },
      { $setOnInsert: { toUserId, fromUserId: meId, achievementKey, seenByRecipient: false } },
      { upsert: true },
    );
    res.status(201).json({ ok: true });
    if (result.upsertedCount > 0) notify(toUserId, { type: 'cheer' });
  } catch {
    res.status(500).json({ message: 'Failed to cheer' });
  }
});

router.delete('/', async (req: Request, res: Response) => {
  try {
    const meId = req.user!._id;
    const { toUserId, achievementKey } = req.body ?? {};
    if (!toUserId || !achievementKey) {
      res.status(400).json({ message: 'toUserId and achievementKey are required' });
      return;
    }
    await Cheer.deleteOne({ toUserId, fromUserId: meId, achievementKey });
    res.status(204).send();
  } catch {
    res.status(500).json({ message: 'Failed to uncheer' });
  }
});

router.get('/sent', async (req: Request, res: Response) => {
  try {
    const meId = req.user!._id;
    const sent = await Cheer.find({ fromUserId: meId })
      .select({ toUserId: 1, achievementKey: 1 })
      .lean();
    res.json(sent.map(c => ({ toUserId: c.toUserId, achievementKey: c.achievementKey })));
  } catch {
    res.status(500).json({ message: 'Failed to fetch sent cheers' });
  }
});

router.get('/received', async (req: Request, res: Response) => {
  try {
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
  } catch {
    res.status(500).json({ message: 'Failed to fetch received cheers' });
  }
});

router.post('/mark-seen', async (req: Request, res: Response) => {
  try {
    const meId = req.user!._id;
    await Cheer.updateMany({ toUserId: meId, seenByRecipient: false }, { $set: { seenByRecipient: true } });
    res.status(204).send();
  } catch {
    res.status(500).json({ message: 'Failed to mark cheers as seen' });
  }
});

router.get('/for/:userId/:key', async (req: Request, res: Response) => {
  try {
    const meId = req.user!._id;
    const userId = String(req.params.userId);
    const key = String(req.params.key);
    if (userId !== meId && !(await areFriends(meId, userId))) {
      res.status(403).json({ message: 'Not friends with that user' });
      return;
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
  } catch {
    res.status(500).json({ message: 'Failed to list cheers' });
  }
});

export default router;
