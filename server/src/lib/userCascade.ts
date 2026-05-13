import mongoose from 'mongoose';
import { Achievement } from '../models/Achievement.js';
import { Budget } from '../models/Budget.js';
import { Cheer } from '../models/Cheer.js';
import { Friendship } from '../models/Friendship.js';
import { GameScore } from '../models/GameScore.js';
import { Goal } from '../models/Goal.js';
import { MonthlyWrapped } from '../models/MonthlyWrapped.js';
import { SharedBudget } from '../models/SharedBudget.js';
import { Transaction } from '../models/Transaction.js';
import { User } from '../models/User.js';
import { UserAvatar } from '../models/UserAvatar.js';
import { UserCategory } from '../models/UserCategory.js';
import { logger } from './logger.js';

export interface CascadeReport {
  transactions: number;
  budgets: number;
  goals: number;
  achievements: number;
  gameScores: number;
  userCategories: number;
  userAvatars: number;
  monthlyWrapped: number;
  cheers: number;
  friendships: number;
  sharedBudgetsLeft: number;
  sharedBudgetsDeleted: number;
  sessionDocs: number;
  accountDocs: number;
  user: boolean;
}

/**
 * Best-effort cascade delete of every user-owned row.
 *
 * Note: we don't wrap this in a Mongoose transaction because the test
 * harness (mongodb-memory-server, single-node) can't run transactions, and
 * production runs against a single-region cluster where the failure mode
 * we'd guard against (partial cascade) is already mitigated by idempotency
 * (re-running the route picks up where it left off).
 */
export async function cascadeDeleteUser(userId: string): Promise<CascadeReport> {
  const report: CascadeReport = {
    transactions: 0,
    budgets: 0,
    goals: 0,
    achievements: 0,
    gameScores: 0,
    userCategories: 0,
    userAvatars: 0,
    monthlyWrapped: 0,
    cheers: 0,
    friendships: 0,
    sharedBudgetsLeft: 0,
    sharedBudgetsDeleted: 0,
    sessionDocs: 0,
    accountDocs: 0,
    user: false,
  };

  const [
    transactions,
    budgets,
    goals,
    achievements,
    gameScores,
    userCategories,
    userAvatars,
    monthlyWrapped,
    cheers,
    friendships,
  ] = await Promise.all([
    Transaction.deleteMany({ userId }),
    Budget.deleteMany({ userId }),
    Goal.deleteMany({ userId }),
    Achievement.deleteMany({ userId }),
    GameScore.deleteMany({ userId }),
    UserCategory.deleteMany({ userId }),
    UserAvatar.deleteMany({ userId }),
    MonthlyWrapped.deleteMany({ userId }),
    Cheer.deleteMany({ $or: [{ fromUserId: userId }, { toUserId: userId }] }),
    Friendship.deleteMany({ $or: [{ requesterId: userId }, { addresseeId: userId }] }),
  ]);

  report.transactions = transactions.deletedCount ?? 0;
  report.budgets = budgets.deletedCount ?? 0;
  report.goals = goals.deletedCount ?? 0;
  report.achievements = achievements.deletedCount ?? 0;
  report.gameScores = gameScores.deletedCount ?? 0;
  report.userCategories = userCategories.deletedCount ?? 0;
  report.userAvatars = userAvatars.deletedCount ?? 0;
  report.monthlyWrapped = monthlyWrapped.deletedCount ?? 0;
  report.cheers = cheers.deletedCount ?? 0;
  report.friendships = friendships.deletedCount ?? 0;

  // Pull from any shared budget I'm a member of, then drop any that no
  // longer have an accepted member (orphaned budgets serve no one).
  const left = await SharedBudget.updateMany(
    { 'members.userId': userId },
    { $pull: { members: { userId } } },
  );
  report.sharedBudgetsLeft = left.modifiedCount ?? 0;

  const dropped = await SharedBudget.deleteMany({
    members: { $not: { $elemMatch: { status: 'accepted' } } },
  });
  report.sharedBudgetsDeleted = dropped.deletedCount ?? 0;

  // Better Auth manages its own session/account collections. Drop them via
  // the same Mongoose connection so the user can't authenticate post-delete.
  const db = mongoose.connection.db;
  if (db) {
    try {
      const session = await db.collection('session').deleteMany({ userId });
      report.sessionDocs = session.deletedCount ?? 0;
    } catch (err) {
      logger.warn({ err, userId }, 'failed to delete session docs');
    }
    try {
      const account = await db.collection('account').deleteMany({ userId });
      report.accountDocs = account.deletedCount ?? 0;
    } catch (err) {
      logger.warn({ err, userId }, 'failed to delete account docs');
    }
  }

  const userResult = await User.findByIdAndDelete(userId);
  report.user = Boolean(userResult);

  return report;
}

/** Cleanup steps to run when two users unfriend each other. */
export async function cascadeUnfriend(meId: string, friendId: string): Promise<void> {
  // Drop pending invites in either direction between these two users.
  await SharedBudget.updateMany(
    { 'members.userId': friendId, ownerId: meId },
    { $pull: { members: { userId: friendId, status: 'pending' } } },
  );
  await SharedBudget.updateMany(
    { 'members.userId': meId, ownerId: friendId },
    { $pull: { members: { userId: meId, status: 'pending' } } },
  );
  // Drop cheers between the pair (any direction).
  await Cheer.deleteMany({
    $or: [
      { fromUserId: meId, toUserId: friendId },
      { fromUserId: friendId, toUserId: meId },
    ],
  });
}
