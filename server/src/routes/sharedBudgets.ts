import { Router, Request, Response } from 'express';
import { SharedBudget } from '../models/SharedBudget.js';
import type { BudgetPeriod } from '../models/Budget.js';
import { Transaction } from '../models/Transaction.js';
import { Friendship } from '../models/Friendship.js';
import { User } from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { HttpError } from '../lib/httpError.js';
import { logger } from '../lib/logger.js';

const router = Router();
router.use(requireAuth);

const VALID_PERIODS: BudgetPeriod[] = ['daily', 'weekly', 'monthly', 'yearly'];
const FORBIDDEN_CATEGORIES = new Set(['emergency', 'overall']);
const ALLOWED_CATEGORIES = new Set([
  'food',
  'rent',
  'transport',
  'entertainment',
  'utilities',
  'shopping',
  'health',
  'other',
]);

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

async function spentByMember(
  memberIds: string[],
  category: string,
  period: BudgetPeriod,
): Promise<Record<string, number>> {
  if (memberIds.length === 0) return {};
  const { start, end } = periodRange(period);
  const rows = await Transaction.aggregate<{ _id: string; total: number }>([
    {
      $match: {
        userId: { $in: memberIds },
        type: 'expense',
        category,
        date: { $gte: start, $lt: end },
      },
    },
    { $group: { _id: '$userId', total: { $sum: '$amount' } } },
  ]);
  const map: Record<string, number> = {};
  for (const r of rows) map[r._id] = r.total;
  return map;
}

async function areAllFriends(meId: string, otherIds: string[]): Promise<boolean> {
  if (otherIds.length === 0) return true;
  const friendships = await Friendship.find({
    status: 'accepted',
    $or: otherIds.flatMap((id) => [
      { requesterId: meId, addresseeId: id },
      { requesterId: id, addresseeId: meId },
    ]),
  }).lean();
  const friendIds = new Set<string>();
  for (const f of friendships) {
    friendIds.add(f.requesterId === meId ? f.addresseeId : f.requesterId);
  }
  return otherIds.every((id) => friendIds.has(id));
}

type EnrichedMember = {
  userId: string;
  status: 'pending' | 'accepted';
  invitedBy: string;
  joinedAt?: Date;
  username: string | null;
  displayName: string | null;
  amount: number;
};

type SharedBudgetPlain = {
  _id: unknown;
  ownerId: string;
  name?: string;
  category: string;
  monthlyLimit: number;
  period: BudgetPeriod;
  members: Array<{ userId: string; status: 'pending' | 'accepted'; invitedBy: string; joinedAt?: Date }>;
  createdAt?: Date;
  updatedAt?: Date;
};

async function enrich(sb: SharedBudgetPlain) {
  const doc = sb;
  const acceptedIds = doc.members.filter((m) => m.status === 'accepted').map((m) => m.userId);
  const allIds = doc.members.map((m) => m.userId);
  const [users, byMember] = await Promise.all([
    User.find({ _id: { $in: allIds } }).lean(),
    spentByMember(acceptedIds, doc.category, doc.period),
  ]);
  const userById = new Map(users.map((u) => [String(u._id), u]));
  const enrichedMembers: EnrichedMember[] = doc.members.map((m) => {
    const u = userById.get(m.userId);
    return {
      userId: m.userId,
      status: m.status,
      invitedBy: m.invitedBy,
      joinedAt: m.joinedAt,
      username: u?.username ?? null,
      displayName: u?.displayName ?? null,
      amount: byMember[m.userId] ?? 0,
    };
  });
  const totalSpent = enrichedMembers
    .filter((m) => m.status === 'accepted')
    .reduce((s, m) => s + m.amount, 0);
  return {
    _id: String(doc._id),
    ownerId: doc.ownerId,
    name: doc.name ?? null,
    category: doc.category,
    monthlyLimit: doc.monthlyLimit,
    period: doc.period,
    members: enrichedMembers,
    spent: totalSpent,
    remaining: Math.max(0, doc.monthlyLimit - totalSpent),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const meId = req.user!._id;
    const docs = await SharedBudget.find({
      members: { $elemMatch: { userId: meId, status: 'accepted' } },
    })
      .sort({ updatedAt: -1 })
      .lean();
    const enriched = await Promise.all(docs.map((d) => enrich(d)));
    res.json(enriched);
  }),
);

router.get(
  '/invites',
  asyncHandler(async (req: Request, res: Response) => {
    const meId = req.user!._id;
    const docs = await SharedBudget.find({
      members: { $elemMatch: { userId: meId, status: 'pending' } },
    })
      .sort({ updatedAt: -1 })
      .lean();
    const enriched = await Promise.all(docs.map((d) => enrich(d)));
    res.json(enriched);
  }),
);

router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const meId = req.user!._id;
    const { name, category, monthlyLimit, period, inviteUserIds } = req.body ?? {};

    if (!category || typeof category !== 'string') {
      throw HttpError.badRequest('category is required');
    }
    if (FORBIDDEN_CATEGORIES.has(category) || !ALLOWED_CATEGORIES.has(category)) {
      throw HttpError.badRequest('That category cannot be shared');
    }
    if (typeof monthlyLimit !== 'number' || monthlyLimit <= 0) {
      throw HttpError.badRequest('limit must be a positive number');
    }
    const resolvedPeriod: BudgetPeriod = VALID_PERIODS.includes(period) ? period : 'monthly';

    const invitees: string[] = Array.isArray(inviteUserIds)
      ? Array.from(new Set(inviteUserIds.filter((x) => typeof x === 'string' && x && x !== meId)))
      : [];
    if (invitees.length === 0) {
      throw HttpError.badRequest('Invite at least one friend');
    }
    const allFriends = await areAllFriends(meId, invitees);
    if (!allFriends) {
      throw HttpError.badRequest('You can only invite accepted friends');
    }

    const now = new Date();
    const doc = await SharedBudget.create({
      ownerId: meId,
      name: typeof name === 'string' && name.trim() ? name.trim().slice(0, 60) : undefined,
      category,
      monthlyLimit,
      period: resolvedPeriod,
      members: [
        { userId: meId, status: 'accepted', invitedBy: meId, joinedAt: now },
        ...invitees.map((id) => ({ userId: id, status: 'pending' as const, invitedBy: meId })),
      ],
    });
    const out = await enrich(doc.toObject());
    res.status(201).json(out);
  }),
);

router.patch(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const meId = req.user!._id;
    const doc = await SharedBudget.findById(req.params.id);
    if (!doc) {
      throw HttpError.notFound('Shared budget not found');
    }
    const me = doc.members.find((m) => m.userId === meId && m.status === 'accepted');
    if (!me) {
      throw HttpError.forbidden('Only members can edit this budget');
    }
    const { name, monthlyLimit, period } = req.body ?? {};
    if (monthlyLimit !== undefined) {
      if (typeof monthlyLimit !== 'number' || monthlyLimit <= 0) {
        throw HttpError.badRequest('limit must be a positive number');
      }
      doc.monthlyLimit = monthlyLimit;
    }
    if (period !== undefined && VALID_PERIODS.includes(period)) {
      doc.period = period;
    }
    if (name !== undefined) {
      doc.name = typeof name === 'string' && name.trim() ? name.trim().slice(0, 60) : undefined;
    }
    await doc.save();
    const out = await enrich(doc.toObject());
    res.json(out);
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const meId = req.user!._id;
    const doc = await SharedBudget.findById(req.params.id);
    if (!doc) {
      throw HttpError.notFound('Shared budget not found');
    }
    const me = doc.members.find((m) => m.userId === meId && m.status === 'accepted');
    if (!me) {
      throw HttpError.forbidden('Only members can delete this budget');
    }
    await doc.deleteOne();
    res.status(204).send();
  }),
);

router.post(
  '/:id/invite',
  asyncHandler(async (req: Request, res: Response) => {
    const meId = req.user!._id;
    const { userIds } = req.body ?? {};
    if (!Array.isArray(userIds) || userIds.length === 0) {
      throw HttpError.badRequest('userIds is required');
    }
    const doc = await SharedBudget.findById(req.params.id);
    if (!doc) {
      throw HttpError.notFound('Shared budget not found');
    }
    const me = doc.members.find((m) => m.userId === meId && m.status === 'accepted');
    if (!me) {
      throw HttpError.forbidden('Only members can invite');
    }
    const existingIds = new Set(doc.members.map((m) => m.userId));
    const newInvites: string[] = Array.from(
      new Set(
        userIds.filter(
          (x: unknown) => typeof x === 'string' && x && x !== meId && !existingIds.has(x as string),
        ),
      ),
    ) as string[];
    if (newInvites.length === 0) {
      throw HttpError.badRequest('No new users to invite');
    }
    const allFriends = await areAllFriends(meId, newInvites);
    if (!allFriends) {
      throw HttpError.badRequest('You can only invite accepted friends');
    }
    for (const id of newInvites) {
      doc.members.push({ userId: id, status: 'pending', invitedBy: meId });
    }
    await doc.save();
    const out = await enrich(doc.toObject());
    res.json(out);
  }),
);

router.post(
  '/:id/accept',
  asyncHandler(async (req: Request, res: Response) => {
    const meId = req.user!._id;
    const doc = await SharedBudget.findById(req.params.id);
    if (!doc) {
      throw HttpError.notFound('Shared budget not found');
    }
    const me = doc.members.find((m) => m.userId === meId);
    if (!me || me.status !== 'pending') {
      throw HttpError.notFound('No pending invite for you');
    }
    me.status = 'accepted';
    me.joinedAt = new Date();
    await doc.save();
    const out = await enrich(doc.toObject());
    res.json(out);
  }),
);

router.post(
  '/:id/decline',
  asyncHandler(async (req: Request, res: Response) => {
    const meId = req.user!._id;
    const doc = await SharedBudget.findById(req.params.id);
    if (!doc) {
      throw HttpError.notFound('Shared budget not found');
    }
    const idx = doc.members.findIndex((m) => m.userId === meId && m.status === 'pending');
    if (idx < 0) {
      throw HttpError.notFound('No pending invite for you');
    }
    doc.members.splice(idx, 1);
    await doc.save();
    res.status(204).send();
  }),
);

router.post(
  '/:id/leave',
  asyncHandler(async (req: Request, res: Response) => {
    const meId = req.user!._id;
    const doc = await SharedBudget.findById(req.params.id);
    if (!doc) {
      throw HttpError.notFound('Shared budget not found');
    }
    const idx = doc.members.findIndex((m) => m.userId === meId && m.status === 'accepted');
    if (idx < 0) {
      throw HttpError.forbidden('You are not a member');
    }
    doc.members.splice(idx, 1);
    const acceptedRemaining = doc.members.filter((m) => m.status === 'accepted').length;
    if (acceptedRemaining === 0) {
      await doc.deleteOne();
      res.status(204).send();
      return;
    }
    await doc.save();
    res.status(204).send();
  }),
);

export default router;
