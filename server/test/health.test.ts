import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { authMocks } from './helpers.js';
import { vi } from 'vitest';

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

describe('GET /api/health', () => {
  it('responds 200 ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});

describe('error middleware', () => {
  it('returns 404 for unknown /api routes', async () => {
    const res = await request(app).get('/api/this-route-does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/not found/i);
  });
});
