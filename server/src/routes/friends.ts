import { Router, Request, Response } from 'express';
import { Friendship } from '../models/Friendship';
import { User } from '../models/User';
import { Goal } from '../models/Goal';
import { Budget } from '../models/Budget';
import { Transaction } from '../models/Transaction';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function streakFromDates(dateSet: Set<string>): number {
  if (dateSet.size === 0) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cur = new Date(today);
  if (!dateSet.has(dayKey(cur))) cur.setDate(cur.getDate() - 1);
  let n = 0;
  while (dateSet.has(dayKey(cur))) {
    n++;
    cur.setDate(cur.getDate() - 1);
    if (n > 3650) break;
  }
  return n;
}

function currentMonthRange() {
  const now = new Date();
  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1),
    end: new Date(now.getFullYear(), now.getMonth() + 1, 1),
  };
}

async function spentByCategoryFor(userId: string): Promise<Record<string, number>> {
  const { start, end } = currentMonthRange();
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
    const u = String(req.query.username ?? '').toLowerCase().trim();
    if (!USERNAME_RE.test(u)) {
      res.status(400).json({ message: 'Invalid username' });
      return;
    }
    const user = await User.findOne({ username: u }).lean();
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    const meId = req.user!._id;
    const otherId = String(user._id);
    if (otherId === meId) {
      res.json({
        id: otherId,
        username: user.username,
        displayName: user.displayName ?? null,
        status: 'self',
      });
      return;
    }
    const status = await statusBetween(meId, otherId);
    res.json({
      id: otherId,
      username: user.username,
      displayName: user.displayName ?? null,
      status,
    });
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

    const [friends, goals, budgets, friendTxnDates] = await Promise.all([
      User.find({ _id: { $in: friendIds } }).lean(),
      Goal.find({ userId: { $in: friendIds }, isPublic: true }).lean(),
      Budget.find({ userId: { $in: friendIds }, isPublic: true }).lean(),
      Transaction.aggregate([
        { $match: { userId: { $in: friendIds } } },
        { $group: { _id: { userId: '$userId', date: { $dateToString: { format: '%Y-%m-%d', date: '$date' } } } } },
      ]),
    ]);

    const friendDateSets = new Map<string, Set<string>>();
    for (const row of friendTxnDates) {
      const uid = row._id.userId;
      if (!friendDateSets.has(uid)) friendDateSets.set(uid, new Set());
      friendDateSets.get(uid)!.add(row._id.date);
    }

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

    const spentMaps = await Promise.all(
      friendIds.map(async (id) => [id, await spentByCategoryFor(id)] as const),
    );
    const spentByUser = new Map(spentMaps);

    const result = friends.map((u) => {
      const id = String(u._id);
      const friendshipRow = accepted.find(
        (f) => f.requesterId === id || f.addresseeId === id,
      );
      const userBudgets = budgetsByUser.get(id) ?? [];
      const spentMap = spentByUser.get(id) ?? {};
      return {
        id,
        friendshipId: friendshipRow ? String(friendshipRow._id) : null,
        username: u.username ?? null,
        displayName: u.displayName ?? null,
        bio: u.bio ?? null,
        avatarColor: u.avatarColor ?? null,
        streak: streakFromDates(friendDateSets.get(id) ?? new Set()),
        goals: (goalsByUser.get(id) ?? []).map((g) => ({
          id: String(g._id),
          name: g.name,
          targetAmount: g.targetAmount,
          currentAmount: g.currentAmount,
          deadline: g.deadline,
        })),
        budgets: userBudgets.map((b) => {
          const used = spentMap[b.category] ?? 0;
          return {
            id: String(b._id),
            category: b.category,
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
