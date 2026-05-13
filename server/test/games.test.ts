import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
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

describe('game scores', () => {
  beforeEach(() => setAuthUser('test-user-1'));

  it('POST /api/games/score accepts valid score', async () => {
    const res = await request(app).post('/api/games/score').send({ game: 'price', score: 42 });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('POST /api/games/score rejects unknown game', async () => {
    const res = await request(app).post('/api/games/score').send({ game: 'snake', score: 1 });
    expect(res.status).toBe(400);
  });

  it('POST /api/games/score rejects negative score', async () => {
    const res = await request(app).post('/api/games/score').send({ game: 'price', score: -1 });
    expect(res.status).toBe(400);
  });
});
