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

describe('C1: game score ceiling', () => {
  beforeEach(() => setAuthUser('test-user-1'));

  it('rejects price-game score > 500', async () => {
    const res = await request(app).post('/api/games/score').send({ game: 'price', score: 999_999 });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/<= 500/);
  });

  it('rejects budget-game score > 100', async () => {
    const res = await request(app).post('/api/games/score').send({ game: 'budget', score: 101 });
    expect(res.status).toBe(400);
  });

  it('rejects non-integer score', async () => {
    const res = await request(app).post('/api/games/score').send({ game: 'price', score: 3.5 });
    expect(res.status).toBe(400);
  });

  it('accepts a legitimate score at the ceiling', async () => {
    const res = await request(app).post('/api/games/score').send({ game: 'price', score: 500 });
    expect(res.status).toBe(200);
  });
});

describe('C2: shared-budget invite concurrency', () => {
  let userA: string;
  let userB: string;
  let userC: string;

  beforeEach(async () => {
    userA = new mongoose.Types.ObjectId().toString();
    userB = new mongoose.Types.ObjectId().toString();
    userC = new mongoose.Types.ObjectId().toString();
    await User.collection.insertMany([
      { _id: new mongoose.Types.ObjectId(userA) as unknown as string, name: 'A', displayName: 'A', username: 'aaa', email: 'a@x', profileComplete: true, emailVerified: true, createdAt: new Date(), updatedAt: new Date() },
      { _id: new mongoose.Types.ObjectId(userB) as unknown as string, name: 'B', displayName: 'B', username: 'bbb', email: 'b@x', profileComplete: true, emailVerified: true, createdAt: new Date(), updatedAt: new Date() },
      { _id: new mongoose.Types.ObjectId(userC) as unknown as string, name: 'C', displayName: 'C', username: 'ccc', email: 'c@x', profileComplete: true, emailVerified: true, createdAt: new Date(), updatedAt: new Date() },
    ]);
    await Friendship.create({ requesterId: userA, addresseeId: userB, status: 'accepted' });
    await Friendship.create({ requesterId: userA, addresseeId: userC, status: 'accepted' });
  });

  it('concurrent /invite calls for the same user do not duplicate members', async () => {
    setAuthUser(userA);
    const created = await request(app).post('/api/shared-budgets').send({
      category: 'food',
      monthlyLimit: 200,
      period: 'monthly',
      inviteUserIds: [userB],
    });
    const id = created.body._id as string;

    // Fire 10 concurrent invites for userC against the same shared budget.
    await Promise.all(
      Array.from({ length: 10 }, () =>
        request(app).post(`/api/shared-budgets/${id}/invite`).send({ userIds: [userC] }),
      ),
    );

    const doc = await SharedBudget.findById(id).lean();
    expect(doc).toBeTruthy();
    const cMembers = doc!.members.filter((m) => m.userId === userC);
    expect(cMembers).toHaveLength(1);
  });
});

describe('Validation', () => {
  beforeEach(() => setAuthUser('test-user-1'));

  it('rejects amount above MAX_AMOUNT', async () => {
    const res = await request(app).post('/api/transactions').send({
      title: 'huge',
      amount: 1e18,
      type: 'expense',
      category: 'food',
      date: '2026-05-01',
    });
    expect(res.status).toBe(400);
    expect(res.body.details).toBeDefined();
  });

  it('rejects unknown fields are allowed (zod default strips)', async () => {
    const res = await request(app).post('/api/transactions').send({
      title: 'ok',
      amount: 5,
      type: 'expense',
      category: 'food',
      date: '2026-05-01',
      foobar: 'should be stripped',
    });
    expect(res.status).toBe(201);
    expect(res.body.foobar).toBeUndefined();
  });
});
