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

describe('shared budgets create + invite + accept + leave', () => {
  let userA: string;
  let userB: string;

  beforeEach(async () => {
    userA = new mongoose.Types.ObjectId().toString();
    userB = new mongoose.Types.ObjectId().toString();
    await User.collection.insertMany([
      {
        _id: new mongoose.Types.ObjectId(userA) as unknown as string,
        name: 'A',
        displayName: 'Alice',
        username: 'alice',
        email: 'alice@test.local',
        emailVerified: true,
        profileComplete: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new mongoose.Types.ObjectId(userB) as unknown as string,
        name: 'B',
        displayName: 'Bob',
        username: 'bob',
        email: 'bob@test.local',
        emailVerified: true,
        profileComplete: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    await Friendship.create({
      requesterId: userA,
      addresseeId: userB,
      status: 'accepted',
    });
  });

  it('A creates a shared budget inviting B, B accepts, both see it', async () => {
    setAuthUser(userA);
    const created = await request(app)
      .post('/api/shared-budgets')
      .send({
        name: 'Groceries',
        category: 'food',
        monthlyLimit: 200,
        period: 'monthly',
        inviteUserIds: [userB],
      });
    expect(created.status).toBe(201);
    const id = created.body._id as string;
    expect(id).toBeTruthy();
    expect(created.body.members).toHaveLength(2);

    // B sees an invite
    setAuthUser(userB);
    const invites = await request(app).get('/api/shared-budgets/invites');
    expect(invites.status).toBe(200);
    expect(invites.body).toHaveLength(1);

    // B accepts
    const accept = await request(app).post(`/api/shared-budgets/${id}/accept`);
    expect([200, 204]).toContain(accept.status);

    // Both now see it under /
    const aList = await request(app).get('/api/shared-budgets');
    expect(aList.body).toHaveLength(1);

    setAuthUser(userA);
    const bList = await request(app).get('/api/shared-budgets');
    expect(bList.body).toHaveLength(1);
  });

  it('rejects sharing the forbidden "emergency" category', async () => {
    setAuthUser(userA);
    const res = await request(app)
      .post('/api/shared-budgets')
      .send({
        category: 'emergency',
        monthlyLimit: 100,
        period: 'monthly',
        inviteUserIds: [userB],
      });
    expect(res.status).toBe(400);
  });

  it('rejects inviting a non-friend', async () => {
    setAuthUser(userA);
    const stranger = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .post('/api/shared-budgets')
      .send({
        category: 'food',
        monthlyLimit: 100,
        period: 'monthly',
        inviteUserIds: [stranger],
      });
    expect(res.status).toBe(400);
  });
});
