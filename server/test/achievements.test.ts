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

describe('GET /api/achievements/me', () => {
  beforeEach(() => {
    setAuthUser('test-user-1');
  });

  it('returns an array of achievements', async () => {
    const res = await request(app).get('/api/achievements/me');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('blocks non-friend achievement views with 403', async () => {
    const res = await request(app).get('/api/achievements/users/other-user-id');
    expect(res.status).toBe(403);
  });
});
