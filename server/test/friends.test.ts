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

describe('friend request lifecycle', () => {
  let userA: string;
  let userB: string;

  beforeEach(async () => {
    userA = new mongoose.Types.ObjectId().toString();
    userB = new mongoose.Types.ObjectId().toString();
    await User.collection.insertOne({
      _id: new mongoose.Types.ObjectId(userA) as unknown as string,
      name: 'A',
      displayName: 'Alice',
      username: 'alice',
      email: 'alice@test.local',
      emailVerified: true,
      profileComplete: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await User.collection.insertOne({
      _id: new mongoose.Types.ObjectId(userB) as unknown as string,
      name: 'B',
      displayName: 'Bob',
      username: 'bob',
      email: 'bob@test.local',
      emailVerified: true,
      profileComplete: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  it('A requests B, B accepts, both see each other as friends', async () => {
    setAuthUser(userA);
    const req1 = await request(app).post('/api/friends/requests').send({ addresseeId: userB });
    expect(req1.status).toBe(201);

    setAuthUser(userB);
    const list = await request(app).get('/api/friends/requests');
    expect(list.status).toBe(200);
    expect(list.body.incoming).toHaveLength(1);
    const requestId = list.body.incoming[0].id as string;

    const accept = await request(app)
      .patch(`/api/friends/requests/${requestId}`)
      .send({ action: 'accept' });
    expect(accept.status).toBe(200);
    expect(accept.body.status).toBe('accepted');

    const myFriends = await request(app).get('/api/friends');
    expect(myFriends.status).toBe(200);
    expect(myFriends.body).toHaveLength(1);
    expect(myFriends.body[0].displayName).toBe('Alice');
  });

  it('cannot send friend request to yourself', async () => {
    setAuthUser(userA);
    const res = await request(app).post('/api/friends/requests').send({ addresseeId: userA });
    expect(res.status).toBe(400);
  });

  it('duplicate request is rejected as 409', async () => {
    setAuthUser(userA);
    await request(app).post('/api/friends/requests').send({ addresseeId: userB });
    const dup = await request(app).post('/api/friends/requests').send({ addresseeId: userB });
    expect(dup.status).toBe(409);
  });
});
