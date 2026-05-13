import { Friendship } from '../models/Friendship.js';

/** True iff `a` and `b` have an accepted friendship in either direction. */
export async function areFriends(a: string, b: string): Promise<boolean> {
  if (a === b) return false;
  const f = await Friendship.findOne({
    status: 'accepted',
    $or: [
      { requesterId: a, addresseeId: b },
      { requesterId: b, addresseeId: a },
    ],
  }).lean();
  return Boolean(f);
}

/** All accepted-friend userIds for a given user. */
export async function friendsOf(userId: string): Promise<string[]> {
  const rows = await Friendship.find({
    status: 'accepted',
    $or: [{ requesterId: userId }, { addresseeId: userId }],
  }).lean();
  return rows.map((f) => (f.requesterId === userId ? f.addresseeId : f.requesterId));
}

/** Returns the subset of `candidateIds` that are accepted friends of `userId`. */
export async function friendsAmong(userId: string, candidateIds: string[]): Promise<Set<string>> {
  if (candidateIds.length === 0) return new Set();
  const rows = await Friendship.find({
    status: 'accepted',
    $or: candidateIds.flatMap((id) => [
      { requesterId: userId, addresseeId: id },
      { requesterId: id, addresseeId: userId },
    ]),
  }).lean();
  const set = new Set<string>();
  for (const f of rows) set.add(f.requesterId === userId ? f.addresseeId : f.requesterId);
  return set;
}

/** True iff every `otherId` is an accepted friend of `userId`. */
export async function areAllFriends(userId: string, otherIds: string[]): Promise<boolean> {
  if (otherIds.length === 0) return true;
  const friends = await friendsAmong(userId, otherIds);
  return otherIds.every((id) => friends.has(id));
}
