import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { authMocks, setAuthUser } from './helpers.js';

vi.mock('../src/auth.js', () => ({
  auth: {
    api: {
      getSession: vi.fn(async () => {
        if (authMocks.getSessionShouldThrow) throw new Error('auth boom');
        return authMocks.currentUserId ? { user: { id: authMocks.currentUserId } } : null;
      }),
    },
  },
}));

const { app } = await import('../src/app.js');
const { User } = await import('../src/models/User.js');
const { Friendship } = await import('../src/models/Friendship.js');
const { SharedBudget } = await import('../src/models/SharedBudget.js');
const { Transaction } = await import('../src/models/Transaction.js');
const { Budget } = await import('../src/models/Budget.js');
const { Cheer } = await import('../src/models/Cheer.js');
const { UserCategory } = await import('../src/models/UserCategory.js');

async function makeUser(id: string, username: string) {
  await User.collection.insertOne({
    _id: new mongoose.Types.ObjectId(id) as unknown as string,
    name: username,
    displayName: username,
    username,
    email: `${username}@test.local`,
    emailVerified: true,
    profileComplete: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

describe('DELETE /api/profile/me cascade', () => {
  let userA: string;
  let userB: string;

  beforeEach(async () => {
    userA = new mongoose.Types.ObjectId().toString();
    userB = new mongoose.Types.ObjectId().toString();
    await makeUser(userA, 'alicex');
    await makeUser(userB, 'bobx');
    await Friendship.create({ requesterId: userA, addresseeId: userB, status: 'accepted' });
    await Transaction.create({
      userId: userA,
      title: 'tx',
      amount: 5,
      type: 'expense',
      category: 'food',
      date: new Date(),
    });
    await Cheer.create({
      fromUserId: userB,
      toUserId: userA,
      achievementKey: 'first_transaction',
    });
    setAuthUser(userA);
  });

  it('removes every row owned by or referencing the user', async () => {
    const sb = await request(app).post('/api/shared-budgets').send({
      category: 'food',
      monthlyLimit: 100,
      period: 'monthly',
      inviteUserIds: [userB],
    });
    expect(sb.status).toBe(201);

    const res = await request(app).delete('/api/profile/me');
    expect(res.status).toBe(200);

    expect(await Transaction.countDocuments({ userId: userA })).toBe(0);
    expect(await Budget.countDocuments({ userId: userA })).toBe(0);
    expect(await Cheer.countDocuments({ $or: [{ fromUserId: userA }, { toUserId: userA }] })).toBe(0);
    expect(await Friendship.countDocuments({ $or: [{ requesterId: userA }, { addresseeId: userA }] })).toBe(0);
    expect(await User.findById(userA)).toBeNull();
    // Shared budget userA created should be gone (zero accepted left after pull).
    const sbAfter = await SharedBudget.findById(sb.body._id);
    expect(sbAfter).toBeNull();
  });
});

describe('Category delete cascade', () => {
  beforeEach(() => setAuthUser('test-user-1'));

  it('refuses to delete a category that is in use', async () => {
    const created = await request(app)
      .post('/api/categories')
      .send({ name: 'snacks', color: '#fff' });
    expect(created.status).toBe(201);
    const id = created.body._id as string;

    await Transaction.create({
      userId: 'test-user-1',
      title: 'snickers',
      amount: 3,
      type: 'expense',
      category: 'snacks',
      date: new Date(),
    });

    const del = await request(app).delete(`/api/categories/${id}`);
    expect(del.status).toBe(409);
  });

  it('reassigns transactions when ?reassignTo is provided', async () => {
    const created = await request(app)
      .post('/api/categories')
      .send({ name: 'oldcat', color: '#fff' });
    const id = created.body._id as string;

    await Transaction.create({
      userId: 'test-user-1',
      title: 'x',
      amount: 1,
      type: 'expense',
      category: 'oldcat',
      date: new Date(),
    });

    const del = await request(app).delete(`/api/categories/${id}?reassignTo=newcat`);
    expect(del.status).toBe(204);

    const remaining = await Transaction.findOne({ userId: 'test-user-1' }).lean();
    expect(remaining?.category).toBe('newcat');
    const cat = await UserCategory.findById(id);
    expect(cat).toBeNull();
  });

  it('deletes when force=true even if in use (transactions retain category string)', async () => {
    const created = await request(app)
      .post('/api/categories')
      .send({ name: 'forcecat', color: '#fff' });
    const id = created.body._id as string;
    await Transaction.create({
      userId: 'test-user-1',
      title: 'x',
      amount: 1,
      type: 'expense',
      category: 'forcecat',
      date: new Date(),
    });

    const del = await request(app).delete(`/api/categories/${id}?force=true`);
    expect(del.status).toBe(204);
    const remaining = await Transaction.findOne({ userId: 'test-user-1' }).lean();
    expect(remaining?.category).toBe('forcecat');
  });
});

describe('Unfriend cascade', () => {
  let userA: string;
  let userB: string;

  beforeEach(async () => {
    userA = new mongoose.Types.ObjectId().toString();
    userB = new mongoose.Types.ObjectId().toString();
    await makeUser(userA, 'unfa');
    await makeUser(userB, 'unfb');
    await Friendship.create({ requesterId: userA, addresseeId: userB, status: 'accepted' });
  });

  it('removes cheers between users on unfriend', async () => {
    await Cheer.create({ fromUserId: userA, toUserId: userB, achievementKey: 'first_transaction' });
    await Cheer.create({ fromUserId: userB, toUserId: userA, achievementKey: 'first_budget' });

    setAuthUser(userA);
    const res = await request(app).delete(`/api/friends/${userB}`);
    expect(res.status).toBe(204);

    const remaining = await Cheer.countDocuments({
      $or: [
        { fromUserId: userA, toUserId: userB },
        { fromUserId: userB, toUserId: userA },
      ],
    });
    expect(remaining).toBe(0);
  });
});

describe('Achievement reversal on transaction delete', () => {
  beforeEach(() => setAuthUser('test-user-1'));

  it('revokes first_transaction when the only transaction is deleted', async () => {
    const Achievement = (await import('../src/models/Achievement.js')).Achievement;
    const created = await request(app).post('/api/transactions').send({
      title: 'one',
      amount: 1,
      type: 'expense',
      category: 'food',
      date: new Date(),
    });
    const id = created.body._id as string;
    // Wait for the fire-and-forget achievement award.
    await new Promise((r) => setTimeout(r, 100));
    expect(await Achievement.findOne({ userId: 'test-user-1', key: 'first_transaction' })).toBeTruthy();

    await request(app).delete(`/api/transactions/${id}`);
    await new Promise((r) => setTimeout(r, 100));
    expect(await Achievement.findOne({ userId: 'test-user-1', key: 'first_transaction' })).toBeNull();
  });
});
