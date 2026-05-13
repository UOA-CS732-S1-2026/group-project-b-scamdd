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
const { Goal } = await import('../src/models/Goal.js');
const { User } = await import('../src/models/User.js');
const { GameScore } = await import('../src/models/GameScore.js');
const { Friendship } = await import('../src/models/Friendship.js');

describe('Goal contribute returns justCompleted', () => {
  beforeEach(() => setAuthUser('test-user-1'));

  it('flips false→true exactly once', async () => {
    const goal = await Goal.create({
      userId: 'test-user-1',
      name: 'savings',
      targetAmount: 100,
      currentAmount: 0,
      deadline: new Date('2027-01-01'),
    });

    const first = await request(app)
      .post(`/api/goals/${goal._id}/contribute`)
      .send({ amount: 50 });
    expect(first.status).toBe(200);
    expect(first.body.completed).toBe(false);
    expect(first.body.justCompleted).toBe(false);

    const second = await request(app)
      .post(`/api/goals/${goal._id}/contribute`)
      .send({ amount: 60 });
    expect(second.status).toBe(200);
    expect(second.body.completed).toBe(true);
    expect(second.body.justCompleted).toBe(true);

    const third = await request(app)
      .post(`/api/goals/${goal._id}/contribute`)
      .send({ amount: 10 });
    expect(third.body.completed).toBe(true);
    expect(third.body.justCompleted).toBe(false);
  });
});

describe('Leaderboard stable tiebreak', () => {
  let userA: string;
  let userB: string;
  beforeEach(async () => {
    userA = new mongoose.Types.ObjectId().toString();
    userB = new mongoose.Types.ObjectId().toString();
    await User.collection.insertMany([
      { _id: new mongoose.Types.ObjectId(userA) as unknown as string, name: 'A', displayName: 'A', username: 'aa', email: 'a@x', profileComplete: true, emailVerified: true, createdAt: new Date(), updatedAt: new Date() },
      { _id: new mongoose.Types.ObjectId(userB) as unknown as string, name: 'B', displayName: 'B', username: 'bb', email: 'b@x', profileComplete: true, emailVerified: true, createdAt: new Date(), updatedAt: new Date() },
    ]);
    await Friendship.create({ requesterId: userA, addresseeId: userB, status: 'accepted' });
    // A hits 100 first.
    await GameScore.create({ userId: userA, game: 'price', score: 100, createdAt: new Date('2026-01-01') });
    await GameScore.create({ userId: userB, game: 'price', score: 100, createdAt: new Date('2026-02-01') });
  });

  it('orders equal scores by earliest createdAt', async () => {
    setAuthUser(userA);
    const res = await request(app).get('/api/games/leaderboard/price');
    expect(res.status).toBe(200);
    const ranked = res.body.filter((e: { score: number | null }) => e.score === 100);
    expect(ranked.length).toBe(2);
    expect(ranked[0].userId).toBe(userA);
    expect(ranked[1].userId).toBe(userB);
  });
});
