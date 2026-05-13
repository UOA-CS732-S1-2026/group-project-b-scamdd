import { describe, it, expect, beforeEach } from 'vitest';
import { vi } from 'vitest';
import request from 'supertest';
import { authMocks, setAuthUser, makeAuthThrow } from './helpers.js';

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

describe('requireAuth middleware', () => {
  beforeEach(() => setAuthUser('test-user-1'));

  it('returns 401 when no session', async () => {
    setAuthUser(null);
    const res = await request(app).get('/api/transactions');
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/unauthorized/i);
  });

  it('returns 502 when auth service throws', async () => {
    makeAuthThrow();
    const res = await request(app).get('/api/transactions');
    expect(res.status).toBe(502);
  });

  it('passes through when session is present', async () => {
    setAuthUser('test-user-1');
    const res = await request(app).get('/api/transactions');
    expect(res.status).toBe(200);
  });
});
