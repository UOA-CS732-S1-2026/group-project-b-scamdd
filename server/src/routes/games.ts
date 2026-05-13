import { Router, Request, Response } from 'express';
import { GameScore } from '../models/GameScore.js';
import { Friendship } from '../models/Friendship.js';
import { User } from '../models/User.js';
import { UserAvatar } from '../models/UserAvatar.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { HttpError } from '../lib/httpError.js';
import { logger } from '../lib/logger.js';
import { validate } from '../middleware/validate.js';
import {
  MAX_SCORE_BY_GAME,
  gameParam,
  submitScoreSchema,
  type GameName,
} from '../schemas/games.js';

const router = Router();
router.use(requireAuth);

router.post(
  '/score',
  validate({ body: submitScoreSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const meId = req.user!._id;
    const { game, score } = req.body as { game: GameName; score: number };
    if (score > MAX_SCORE_BY_GAME[game]) {
      logger.warn({ userId: meId, game, score }, 'rejected impossible game score');
      throw HttpError.badRequest(`score must be <= ${MAX_SCORE_BY_GAME[game]} for game "${game}"`);
    }
    await GameScore.create({ userId: meId, game, score });
    res.json({ ok: true });
  }),
);

router.get(
  '/leaderboard/:game',
  validate({ params: gameParam }),
  asyncHandler(async (req: Request, res: Response) => {
    const meId = req.user!._id;
    const game = req.params.game as GameName;

    const friendships = await Friendship.find({
      status: 'accepted',
      $or: [{ requesterId: meId }, { addresseeId: meId }],
    }).lean();

    const friendIds = friendships.map((f) =>
      f.requesterId === meId ? f.addresseeId : f.requesterId,
    );
    const allIds = [meId, ...friendIds];

    const bestScores = await GameScore.aggregate<{
      _id: string;
      score: number;
      earliest: Date;
    }>([
      { $match: { game, userId: { $in: allIds } } },
      { $sort: { score: -1, createdAt: 1 } },
      {
        $group: {
          _id: '$userId',
          score: { $first: '$score' },
          earliest: { $first: '$createdAt' },
        },
      },
    ]);
    const scoreMap: Record<string, number> = Object.fromEntries(
      bestScores.map((s) => [s._id, s.score]),
    );
    const earliestMap: Record<string, Date> = Object.fromEntries(
      bestScores.map((s) => [s._id, s.earliest]),
    );

    const users = await User.find({ _id: { $in: allIds } }).lean();
    const avatarDocs = await UserAvatar.find({ userId: { $in: allIds } }).lean();
    const avatarByUserId = new Map(avatarDocs.map((a) => [a.userId, a]));

    const entries = users.map((u) => {
      const uid = String(u._id);
      const av = avatarByUserId.get(uid);
      return {
        userId: uid,
        name: u.displayName || u.name || u.username || 'Unknown',
        username: u.username ?? '',
        score: scoreMap[uid] ?? null,
        earliest: earliestMap[uid] ?? null,
        isMe: uid === meId,
        avatarColor: av?.avatarColor ?? null,
        avatarImage: av?.avatarImage ?? null,
      };
    });

    entries.sort((a, b) => {
      if (a.score !== null && b.score !== null) {
        if (b.score !== a.score) return b.score - a.score;
        // Stable tiebreak: whoever hit the score first wins.
        const ad = a.earliest ? new Date(a.earliest).getTime() : Infinity;
        const bd = b.earliest ? new Date(b.earliest).getTime() : Infinity;
        if (ad !== bd) return ad - bd;
        return a.userId.localeCompare(b.userId);
      }
      if (a.score !== null) return -1;
      if (b.score !== null) return 1;
      return a.name.localeCompare(b.name);
    });

    res.json(entries);
  }),
);

export default router;
