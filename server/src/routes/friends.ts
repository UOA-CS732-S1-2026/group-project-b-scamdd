import { Router, Request, Response } from 'express';
import { Friendship } from '../models/Friendship.js';
import { User } from '../models/User.js';
import { UserAvatar } from '../models/UserAvatar.js';
import { Goal } from '../models/Goal.js';
import { Budget } from '../models/Budget.js';
import { requireAuth } from '../middleware/auth.js';
import { computeBudgetStreak } from '../lib/streaks.js';
import { listAchievements } from '../lib/achievements.js';
import type { BudgetPeriod } from '../models/Budget.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { HttpError } from '../lib/httpError.js';
import { logger } from '../lib/logger.js';
import { spendByCategoryForUser } from '../lib/spend.js';
import { cascadeUnfriend } from '../lib/userCascade.js';
import { validate } from '../middleware/validate.js';
import { idParam } from '../schemas/common.js';
import {
  createFriendRequestSchema,
  friendIdParam,
  respondFriendRequestSchema,
  searchFriendsQuery,
} from '../schemas/friends.js';

const router = Router();

router.use(requireAuth);

async function spentByCategoryFor(
  userId: string,
  period: BudgetPeriod,
): Promise<Record<string, number>> {
  return spendByCategoryForUser(userId, period);
}

type Status = 'none' | 'pending-out' | 'pending-in' | 'accepted';

async function statusBetween(meId: string, otherId: string): Promise<Status> {
  const f = await Friendship.findOne({
    $or: [
      { requesterId: meId, addresseeId: otherId },
      { requesterId: otherId, addresseeId: meId },
    ],
  }).lean();
  if (!f) return 'none';
  if (f.status === 'accepted') return 'accepted';
  if (f.status === 'pending') {
    return f.requesterId === meId ? 'pending-out' : 'pending-in';
  }
  return 'none';
}

router.get(
  '/search',
  validate({ query: searchFriendsQuery }),
  asyncHandler(async (req: Request, res: Response) => {
    const { q } = req.query as { q: string };
    const meId = req.user!._id;
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');
    const users = await User.find({
      _id: { $ne: meId },
      profileComplete: true,
      $or: [{ displayName: regex }, { username: regex }],
    })
      .limit(8)
      .lean();

    const results = await Promise.all(
      users.map(async (user) => {
        const otherId = String(user._id);
        const status = await statusBetween(meId, otherId);
        return {
          id: otherId,
          username: user.username ?? null,
          displayName: user.displayName ?? null,
          status,
        };
      }),
    );
    res.json(results);
  }),
);

router.post(
  '/requests',
  validate({ body: createFriendRequestSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const meId = req.user!._id;
    const { addresseeId } = req.body as { addresseeId: string };
    if (addresseeId === meId) {
      throw HttpError.badRequest('You cannot friend yourself');
    }
    const target = await User.findById(addresseeId).lean();
    if (!target) {
      throw HttpError.notFound('User not found');
    }
    const existing = await Friendship.findOne({
      $or: [
        { requesterId: meId, addresseeId },
        { requesterId: addresseeId, addresseeId: meId },
      ],
    });
    if (existing) {
      if (existing.status === 'accepted') {
        throw HttpError.conflict('Already friends');
      }
      if (existing.status === 'pending') {
        throw HttpError.conflict('A request already exists between you');
      }
      // rejected → allow re-request by overwriting
      existing.requesterId = meId;
      existing.addresseeId = addresseeId;
      existing.status = 'pending';
      await existing.save();
      res.status(201).json(existing);
      return;
    }
    const created = await Friendship.create({
      requesterId: meId,
      addresseeId,
      status: 'pending',
    });
    res.status(201).json(created);
  }),
);

router.get(
  '/requests',
  asyncHandler(async (req: Request, res: Response) => {
    const meId = req.user!._id;
    const all = await Friendship.find({
      status: 'pending',
      $or: [{ requesterId: meId }, { addresseeId: meId }],
    }).lean();

    const otherIds = all.map((f) => (f.requesterId === meId ? f.addresseeId : f.requesterId));
    const [users, avatarDocs] = await Promise.all([
      User.find({ _id: { $in: otherIds } }).lean(),
      UserAvatar.find({ userId: { $in: otherIds } }).lean(),
    ]);
    const userById = new Map(users.map((u) => [String(u._id), u]));
    const avatarByUserId = new Map(avatarDocs.map((a) => [a.userId, a]));

    const incoming = all
      .filter((f) => f.addresseeId === meId)
      .map((f) => {
        const u = userById.get(f.requesterId);
        const av = avatarByUserId.get(f.requesterId);
        return {
          id: String(f._id),
          fromId: f.requesterId,
          username: u?.username ?? null,
          displayName: u?.displayName ?? null,
          avatarColor: av?.avatarColor ?? null,
          avatarImage: av?.avatarImage ?? null,
          createdAt: f.createdAt,
        };
      });
    const outgoing = all
      .filter((f) => f.requesterId === meId)
      .map((f) => {
        const u = userById.get(f.addresseeId);
        const av = avatarByUserId.get(f.addresseeId);
        return {
          id: String(f._id),
          toId: f.addresseeId,
          username: u?.username ?? null,
          displayName: u?.displayName ?? null,
          avatarColor: av?.avatarColor ?? null,
          avatarImage: av?.avatarImage ?? null,
          createdAt: f.createdAt,
        };
      });

    res.json({ incoming, outgoing });
  }),
);

router.patch(
  '/requests/:id',
  validate({ params: idParam, body: respondFriendRequestSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const meId = req.user!._id;
    const { action } = req.body as { action: 'accept' | 'reject' };
    const f = await Friendship.findById(req.params.id);
    if (!f || f.status !== 'pending') {
      throw HttpError.notFound('Pending request not found');
    }
    if (f.addresseeId !== meId) {
      throw HttpError.forbidden('Only the addressee can act on this request');
    }
    f.status = action === 'accept' ? 'accepted' : 'rejected';
    // Mark unseen for the requester only on accept; reject quietly removes.
    f.seenByRequester = action === 'accept' ? false : true;
    await f.save();
    res.json(f);
  }),
);

router.delete(
  '/requests/:id',
  validate({ params: idParam }),
  asyncHandler(async (req: Request, res: Response) => {
    const meId = req.user!._id;
    const f = await Friendship.findById(req.params.id);
    if (!f || f.status !== 'pending') {
      throw HttpError.notFound('Pending request not found');
    }
    if (f.requesterId !== meId) {
      throw HttpError.forbidden('Only the requester can cancel');
    }
    await f.deleteOne();
    res.status(204).send();
  }),
);

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const meId = req.user!._id;
    const accepted = await Friendship.find({
      status: 'accepted',
      $or: [{ requesterId: meId }, { addresseeId: meId }],
    }).lean();

    const friendIds = accepted.map((f) => (f.requesterId === meId ? f.addresseeId : f.requesterId));
    if (friendIds.length === 0) {
      res.json([]);
      return;
    }

    const [friends, goals, budgets, avatarDocs] = await Promise.all([
      User.find({ _id: { $in: friendIds } }).lean(),
      Goal.find({ userId: { $in: friendIds }, isPublic: true }).lean(),
      Budget.find({ userId: { $in: friendIds }, isPublic: true }).lean(),
      UserAvatar.find({ userId: { $in: friendIds } }).lean(),
    ]);

    const avatarByUserId = new Map(avatarDocs.map((a) => [a.userId, a]));

    const goalsByUser = new Map<string, typeof goals>();
    for (const g of goals) {
      const arr = goalsByUser.get(g.userId) ?? [];
      arr.push(g);
      goalsByUser.set(g.userId, arr);
    }
    const budgetsByUser = new Map<string, typeof budgets>();
    for (const b of budgets) {
      const arr = budgetsByUser.get(b.userId) ?? [];
      arr.push(b);
      budgetsByUser.set(b.userId, arr);
    }

    // Compute spent per (friendId, period) so weekly/yearly budgets get the
    // correct denominator. Build the unique set from the public budgets we'll
    // actually render.
    const spentByUserPeriod = new Map<string, Record<string, number>>();
    const needed = new Set<string>();
    for (const b of budgets) {
      const p = (b.period ?? 'monthly') as BudgetPeriod;
      needed.add(`${b.userId}|${p}`);
    }
    await Promise.all(
      Array.from(needed).map(async (key) => {
        const [uid, p] = key.split('|') as [string, BudgetPeriod];
        spentByUserPeriod.set(key, await spentByCategoryFor(uid, p));
      }),
    );

    const streakEntries = await Promise.all(
      friendIds.map(async (id) => [id, await computeBudgetStreak(id)] as const),
    );
    const streakByUser = new Map(streakEntries);

    const achievementEntries = await Promise.all(
      friendIds.map(async (id) => [id, await listAchievements(id)] as const),
    );
    const achievementsByUser = new Map(achievementEntries);

    const result = friends.map((u) => {
      const id = String(u._id);
      const friendshipRow = accepted.find((f) => f.requesterId === id || f.addresseeId === id);
      const userBudgets = budgetsByUser.get(id) ?? [];
      const avatar = avatarByUserId.get(id);
      return {
        id,
        friendshipId: friendshipRow ? String(friendshipRow._id) : null,
        username: u.username ?? null,
        displayName: u.displayName ?? null,
        bio: u.bio ?? null,
        avatarColor: avatar?.avatarColor ?? null,
        avatarImage: avatar?.avatarImage ?? null,
        streak: streakByUser.get(id) ?? 0,
        achievements: achievementsByUser.get(id) ?? [],
        goals: (goalsByUser.get(id) ?? []).map((g) => ({
          id: String(g._id),
          name: g.name,
          targetAmount: g.targetAmount,
          currentAmount: g.currentAmount,
          deadline: g.deadline,
        })),
        budgets: userBudgets.map((b) => {
          const p = (b.period ?? 'monthly') as BudgetPeriod;
          const spentMap = spentByUserPeriod.get(`${id}|${p}`) ?? {};
          const used = spentMap[b.category] ?? 0;
          return {
            id: String(b._id),
            category: b.category,
            period: p,
            monthlyLimit: b.monthlyLimit,
            spent: used,
          };
        }),
      };
    });

    res.json(result);
  }),
);

router.get(
  '/acceptances',
  asyncHandler(async (req: Request, res: Response) => {
    const meId = req.user!._id;
    const rows = await Friendship.find({
      requesterId: meId,
      status: 'accepted',
      seenByRequester: false,
    })
      .sort({ updatedAt: -1 })
      .lean();
    if (rows.length === 0) {
      res.json([]);
      return;
    }
    const userIds = rows.map((r) => r.addresseeId);
    const [users, avatarDocs] = await Promise.all([
      User.find({ _id: { $in: userIds } }).lean(),
      UserAvatar.find({ userId: { $in: userIds } }).lean(),
    ]);
    const userById = new Map(users.map((u) => [String(u._id), u]));
    const avatarByUserId = new Map(avatarDocs.map((a) => [a.userId, a]));
    res.json(
      rows.map((r) => {
        const u = userById.get(r.addresseeId);
        const av = avatarByUserId.get(r.addresseeId);
        return {
          id: String(r._id),
          userId: r.addresseeId,
          username: u?.username ?? null,
          displayName: u?.displayName ?? null,
          avatarColor: av?.avatarColor ?? null,
          avatarImage: av?.avatarImage ?? null,
          acceptedAt: r.updatedAt,
        };
      }),
    );
  }),
);

router.post(
  '/acceptances/seen',
  asyncHandler(async (req: Request, res: Response) => {
    const meId = req.user!._id;
    await Friendship.updateMany(
      { requesterId: meId, status: 'accepted', seenByRequester: false },
      { $set: { seenByRequester: true } },
    );
    res.status(204).send();
  }),
);

router.delete(
  '/:friendId',
  validate({ params: friendIdParam }),
  asyncHandler(async (req: Request, res: Response) => {
    const meId = req.user!._id;
    const friendId = req.params.friendId;
    const removed = await Friendship.findOneAndDelete({
      status: 'accepted',
      $or: [
        { requesterId: meId, addresseeId: friendId },
        { requesterId: friendId, addresseeId: meId },
      ],
    });
    if (!removed) {
      throw HttpError.notFound('Friendship not found');
    }
    try {
      await cascadeUnfriend(meId, String(friendId));
    } catch (err) {
      logger.warn({ err, meId, friendId }, 'cascadeUnfriend partial failure');
    }
    res.status(204).send();
  }),
);

export default router;
