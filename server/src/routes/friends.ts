import { Router, Request, Response } from 'express';
import { Friendship } from '../models/Friendship.js';
import { User } from '../models/User.js';
import { UserAvatar } from '../models/UserAvatar.js';
import { Goal } from '../models/Goal.js';
import { Budget } from '../models/Budget.js';
import { Transaction } from '../models/Transaction.js';
import { requireAuth } from '../middleware/auth.js';
import { computeBudgetStreak } from '../lib/streaks.js';
import { listAchievements } from '../lib/achievements.js';
import type { BudgetPeriod } from '../models/Budget.js';

const router = Router();

router.use(requireAuth);

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

function periodRange(period: BudgetPeriod): { start: Date; end: Date } {
  const now = new Date();
  switch (period) {
    case 'daily': {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      return { start, end };
    }
    case 'weekly': {
      const day = now.getDay() === 0 ? 7 : now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - (day - 1));
      monday.setHours(0, 0, 0, 0);
      const nextMonday = new Date(monday);
      nextMonday.setDate(monday.getDate() + 7);
      return { start: monday, end: nextMonday };
    }
    case 'monthly':
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: new Date(now.getFullYear(), now.getMonth() + 1, 1),
      };
    case 'yearly':
      return {
        start: new Date(now.getFullYear(), 0, 1),
        end: new Date(now.getFullYear() + 1, 0, 1),
      };
  }
}

async function spentByCategoryFor(
  userId: string,
  period: BudgetPeriod,
): Promise<Record<string, number>> {
  const { start, end } = periodRange(period);
  const rows = await Transaction.aggregate<{ _id: string; total: number }>([
    {
      $match: {
        userId,
        type: 'expense',
        date: { $gte: start, $lt: end },
      },
    },
    { $group: { _id: '$category', total: { $sum: '$amount' } } },
  ]);
  const map: Record<string, number> = {};
  for (const r of rows) map[r._id] = r.total;
  return map;
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

router.get('/search', async (req: Request, res: Response) => {
  try {
    const q = String(req.query.q ?? '').trim();
    if (!q || q.length < 2) {
      res.status(400).json({ message: 'Query must be at least 2 characters' });
      return;
    }
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
  } catch {
    res.status(500).json({ message: 'Search failed' });
  }
});

router.post('/requests', async (req: Request, res: Response) => {
  try {
    const meId = req.user!._id;
    const { addresseeId } = req.body ?? {};
    if (!addresseeId || typeof addresseeId !== 'string') {
      res.status(400).json({ message: 'addresseeId is required' });
      return;
    }
    if (addresseeId === meId) {
      res.status(400).json({ message: 'You cannot friend yourself' });
      return;
    }
    const target = await User.findById(addresseeId).lean();
    if (!target) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    const existing = await Friendship.findOne({
      $or: [
        { requesterId: meId, addresseeId },
        { requesterId: addresseeId, addresseeId: meId },
      ],
    });
    if (existing) {
      if (existing.status === 'accepted') {
        res.status(409).json({ message: 'Already friends' });
        return;
      }
      if (existing.status === 'pending') {
        res.status(409).json({ message: 'A request already exists between you' });
        return;
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
  } catch {
    res.status(500).json({ message: 'Failed to create friend request' });
  }
});

router.get('/requests', async (req: Request, res: Response) => {
  try {
    const meId = req.user!._id;
    const all = await Friendship.find({
      status: 'pending',
      $or: [{ requesterId: meId }, { addresseeId: meId }],
    }).lean();

    const otherIds = all.map((f) => (f.requesterId === meId ? f.addresseeId : f.requesterId));
    const users = await User.find({ _id: { $in: otherIds } }).lean();
    const userById = new Map(users.map((u) => [String(u._id), u]));

    const incoming = all
      .filter((f) => f.addresseeId === meId)
      .map((f) => {
        const u = userById.get(f.requesterId);
        return {
          id: String(f._id),
          fromId: f.requesterId,
          username: u?.username ?? null,
          displayName: u?.displayName ?? null,
          createdAt: f.createdAt,
        };
      });
    const outgoing = all
      .filter((f) => f.requesterId === meId)
      .map((f) => {
        const u = userById.get(f.addresseeId);
        return {
          id: String(f._id),
          toId: f.addresseeId,
          username: u?.username ?? null,
          displayName: u?.displayName ?? null,
          createdAt: f.createdAt,
        };
      });

    res.json({ incoming, outgoing });
  } catch {
    res.status(500).json({ message: 'Failed to load requests' });
  }
});

router.patch('/requests/:id', async (req: Request, res: Response) => {
  try {
    const meId = req.user!._id;
    const { action } = req.body ?? {};
    if (action !== 'accept' && action !== 'reject') {
      res.status(400).json({ message: "action must be 'accept' or 'reject'" });
      return;
    }
    const f = await Friendship.findById(req.params.id);
    if (!f || f.status !== 'pending') {
      res.status(404).json({ message: 'Pending request not found' });
      return;
    }
    if (f.addresseeId !== meId) {
      res.status(403).json({ message: 'Only the addressee can act on this request' });
      return;
    }
    f.status = action === 'accept' ? 'accepted' : 'rejected';
    // Mark unseen for the requester only on accept; reject quietly removes.
    f.seenByRequester = action === 'accept' ? false : true;
    await f.save();
    res.json(f);
  } catch {
    res.status(500).json({ message: 'Failed to update request' });
  }
});

router.delete('/requests/:id', async (req: Request, res: Response) => {
  try {
    const meId = req.user!._id;
    const f = await Friendship.findById(req.params.id);
    if (!f || f.status !== 'pending') {
      res.status(404).json({ message: 'Pending request not found' });
      return;
    }
    if (f.requesterId !== meId) {
      res.status(403).json({ message: 'Only the requester can cancel' });
      return;
    }
    await f.deleteOne();
    res.status(204).send();
  } catch {
    res.status(500).json({ message: 'Failed to cancel request' });
  }
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const meId = req.user!._id;
    const accepted = await Friendship.find({
      status: 'accepted',
      $or: [{ requesterId: meId }, { addresseeId: meId }],
    }).lean();

    const friendIds = accepted.map((f) =>
      f.requesterId === meId ? f.addresseeId : f.requesterId,
    );
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
      const friendshipRow = accepted.find(
        (f) => f.requesterId === id || f.addresseeId === id,
      );
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
  } catch {
    res.status(500).json({ message: 'Failed to load friends' });
  }
});

router.get('/acceptances', async (req: Request, res: Response) => {
  try {
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
    const users = await User.find({ _id: { $in: rows.map((r) => r.addresseeId) } }).lean();
    const userById = new Map(users.map((u) => [String(u._id), u]));
    res.json(
      rows.map((r) => {
        const u = userById.get(r.addresseeId);
        return {
          id: String(r._id),
          userId: r.addresseeId,
          username: u?.username ?? null,
          displayName: u?.displayName ?? null,
          acceptedAt: r.updatedAt,
        };
      }),
    );
  } catch {
    res.status(500).json({ message: 'Failed to load acceptances' });
  }
});

router.post('/acceptances/seen', async (req: Request, res: Response) => {
  try {
    const meId = req.user!._id;
    await Friendship.updateMany(
      { requesterId: meId, status: 'accepted', seenByRequester: false },
      { $set: { seenByRequester: true } },
    );
    res.status(204).send();
  } catch {
    res.status(500).json({ message: 'Failed to mark acceptances seen' });
  }
});

router.delete('/:friendId', async (req: Request, res: Response) => {
  try {
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
      res.status(404).json({ message: 'Friendship not found' });
      return;
    }
    res.status(204).send();
  } catch {
    res.status(500).json({ message: 'Failed to unfriend' });
  }
});

export default router;
