import { Router, Request, Response } from 'express';
import { SharedBudget } from '../models/SharedBudget.js';
import type { BudgetPeriod } from '../models/Budget.js';
import { User } from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { HttpError } from '../lib/httpError.js';
import { aggregateSpendByUser } from '../lib/spend.js';
import { areAllFriends } from '../lib/friendship.js';
import { validate } from '../middleware/validate.js';
import {
  createSharedBudgetSchema,
  inviteSchema,
  updateSharedBudgetSchema,
} from '../schemas/sharedBudgets.js';
import { idParam } from '../schemas/common.js';

const router = Router();
router.use(requireAuth);

async function spentByMember(
  memberIds: string[],
  category: string,
  period: BudgetPeriod,
): Promise<Record<string, number>> {
  return aggregateSpendByUser({ userIds: memberIds, category, period });
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
  members: Array<{
    userId: string;
    status: 'pending' | 'accepted';
    invitedBy: string;
    joinedAt?: Date;
  }>;
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
  validate({ body: createSharedBudgetSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const meId = req.user!._id;
    const { name, category, monthlyLimit, period, inviteUserIds } = req.body as {
      name?: string;
      category: string;
      monthlyLimit: number;
      period?: BudgetPeriod;
      inviteUserIds: string[];
    };

    const invitees = Array.from(new Set(inviteUserIds.filter((id) => id !== meId)));
    if (invitees.length === 0) {
      throw HttpError.badRequest('Invite at least one friend');
    }
    if (!(await areAllFriends(meId, invitees))) {
      throw HttpError.badRequest('You can only invite accepted friends');
    }

    const now = new Date();
    const doc = await SharedBudget.create({
      ownerId: meId,
      name: name?.trim() ? name.trim().slice(0, 60) : undefined,
      category,
      monthlyLimit,
      period: period ?? 'monthly',
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
  validate({ params: idParam, body: updateSharedBudgetSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const meId = req.user!._id;
    const { name, monthlyLimit, period } = req.body as {
      name?: string;
      monthlyLimit?: number;
      period?: BudgetPeriod;
    };
    const set: Record<string, unknown> = {};
    if (monthlyLimit !== undefined) set.monthlyLimit = monthlyLimit;
    if (period !== undefined) set.period = period;
    if (name !== undefined) {
      set.name = name.trim() ? name.trim().slice(0, 60) : undefined;
    }

    const doc = await SharedBudget.findOneAndUpdate(
      {
        _id: req.params.id,
        members: { $elemMatch: { userId: meId, status: 'accepted' } },
      },
      { $set: set },
      { new: true },
    ).lean();
    if (!doc) {
      // Either not found, or the caller is not an accepted member.
      const exists = await SharedBudget.exists({ _id: req.params.id });
      throw exists
        ? HttpError.forbidden('Only members can edit this budget')
        : HttpError.notFound('Shared budget not found');
    }
    const out = await enrich(doc);
    res.json(out);
  }),
);

router.delete(
  '/:id',
  validate({ params: idParam }),
  asyncHandler(async (req: Request, res: Response) => {
    const meId = req.user!._id;
    const result = await SharedBudget.findOneAndDelete({
      _id: req.params.id,
      members: { $elemMatch: { userId: meId, status: 'accepted' } },
    }).lean();
    if (!result) {
      const exists = await SharedBudget.exists({ _id: req.params.id });
      throw exists
        ? HttpError.forbidden('Only members can delete this budget')
        : HttpError.notFound('Shared budget not found');
    }
    res.status(204).send();
  }),
);

router.post(
  '/:id/invite',
  validate({ params: idParam, body: inviteSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const meId = req.user!._id;
    const { userIds } = req.body as { userIds: string[] };

    // Authorization read: must be an accepted member.
    const callerOk = await SharedBudget.exists({
      _id: req.params.id,
      members: { $elemMatch: { userId: meId, status: 'accepted' } },
    });
    if (!callerOk) {
      const exists = await SharedBudget.exists({ _id: req.params.id });
      throw exists
        ? HttpError.forbidden('Only members can invite')
        : HttpError.notFound('Shared budget not found');
    }

    const targets = Array.from(new Set(userIds.filter((id) => id !== meId)));
    if (targets.length === 0) {
      throw HttpError.badRequest('No new users to invite');
    }
    if (!(await areAllFriends(meId, targets))) {
      throw HttpError.badRequest('You can only invite accepted friends');
    }

    // Atomic per-invitee push: precondition rejects already-present userIds,
    // so concurrent /invite calls can't create duplicate member entries.
    for (const id of targets) {
      await SharedBudget.updateOne(
        { _id: req.params.id, 'members.userId': { $ne: id } },
        { $push: { members: { userId: id, status: 'pending', invitedBy: meId } } },
      );
    }

    const doc = await SharedBudget.findById(req.params.id).lean();
    if (!doc) throw HttpError.notFound('Shared budget not found');
    const out = await enrich(doc);
    res.json(out);
  }),
);

router.post(
  '/:id/accept',
  validate({ params: idParam }),
  asyncHandler(async (req: Request, res: Response) => {
    const meId = req.user!._id;
    const result = await SharedBudget.findOneAndUpdate(
      {
        _id: req.params.id,
        members: { $elemMatch: { userId: meId, status: 'pending' } },
      },
      {
        $set: {
          'members.$.status': 'accepted',
          'members.$.joinedAt': new Date(),
        },
      },
      { new: true },
    ).lean();
    if (!result) throw HttpError.notFound('No pending invite for you');
    const out = await enrich(result);
    res.json(out);
  }),
);

router.post(
  '/:id/decline',
  validate({ params: idParam }),
  asyncHandler(async (req: Request, res: Response) => {
    const meId = req.user!._id;
    const result = await SharedBudget.updateOne(
      {
        _id: req.params.id,
        members: { $elemMatch: { userId: meId, status: 'pending' } },
      },
      { $pull: { members: { userId: meId, status: 'pending' } } },
    );
    if (result.matchedCount === 0) {
      throw HttpError.notFound('No pending invite for you');
    }
    res.status(204).send();
  }),
);

router.post(
  '/:id/leave',
  validate({ params: idParam }),
  asyncHandler(async (req: Request, res: Response) => {
    const meId = req.user!._id;
    const updated = await SharedBudget.findOneAndUpdate(
      {
        _id: req.params.id,
        members: { $elemMatch: { userId: meId, status: 'accepted' } },
      },
      { $pull: { members: { userId: meId, status: 'accepted' } } },
      { new: true },
    );
    if (!updated) throw HttpError.forbidden('You are not a member');
    const acceptedRemaining = updated.members.filter((m) => m.status === 'accepted').length;
    if (acceptedRemaining === 0) {
      await updated.deleteOne();
    }
    res.status(204).send();
  }),
);

export default router;
