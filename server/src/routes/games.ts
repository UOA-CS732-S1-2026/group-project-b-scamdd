import { Router, Request, Response } from 'express';
import { GameScore } from '../models/GameScore.js';
import { Friendship } from '../models/Friendship.js';
import { User } from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.post('/score', async (req: Request, res: Response) => {
  const meId = req.user!._id;
  const { game, score } = req.body;
  if (!['price', 'budget'].includes(game) || typeof score !== 'number' || score < 0) {
    return res.status(400).json({ error: 'Invalid payload' });
  }
  await GameScore.create({ userId: meId, game, score });
  res.json({ ok: true });
});

router.get('/leaderboard/:game', async (req: Request, res: Response) => {
  const meId = req.user!._id;
  const game = String(req.params.game);
  if (!['price', 'budget'].includes(game)) {
    return res.status(400).json({ error: 'Unknown game' });
  }

  const friendships = await Friendship.find({
    status: 'accepted',
    $or: [{ requesterId: meId }, { addresseeId: meId }],
  }).lean();

  const friendIds = friendships.map((f) =>
    f.requesterId === meId ? f.addresseeId : f.requesterId,
  );
  const allIds = [meId, ...friendIds];

  const bestScores = await GameScore.aggregate([
    { $match: { game, userId: { $in: allIds } } },
    { $group: { _id: '$userId', score: { $max: '$score' } } },
  ]);
  const scoreMap: Record<string, number> = Object.fromEntries(
    bestScores.map((s) => [s._id, s.score]),
  );

  const users = await User.find({ _id: { $in: allIds } }).lean();

  const entries = users.map((u) => ({
    userId: String(u._id),
    name: u.displayName || u.name || u.username || 'Unknown',
    username: u.username ?? '',
    score: scoreMap[String(u._id)] ?? null,
    isMe: String(u._id) === meId,
  }));

  entries.sort((a, b) => {
    if (a.score !== null && b.score !== null) return b.score - a.score;
    if (a.score !== null) return -1;
    if (b.score !== null) return 1;
    return a.name.localeCompare(b.name);
  });

  res.json(entries);
});

export default router;
