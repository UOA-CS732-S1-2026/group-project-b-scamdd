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

vi.mock('../src/lib/achievements.js', () => ({
  checkAndAwardAchievements: vi.fn(async () => undefined),
}));

const { app } = await import('../src/app.js');

describe('transactions CRUD', () => {
  beforeEach(() => setAuthUser('test-user-1'));

  it('GET /api/transactions returns empty array initially', async () => {
    const res = await request(app).get('/api/transactions');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(0);
  });

  it('POST /api/transactions creates a transaction', async () => {
    const res = await request(app)
      .post('/api/transactions')
      .send({
        title: 'Coffee',
        amount: 5.5,
        type: 'expense',
        category: 'food',
        date: '2026-05-01T00:00:00.000Z',
      });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      title: 'Coffee',
      amount: 5.5,
      type: 'expense',
      category: 'food',
      userId: 'test-user-1',
    });
  });

  it('POST /api/transactions rejects missing fields', async () => {
    const res = await request(app)
      .post('/api/transactions')
      .send({ amount: 5, type: 'expense' });
    expect(res.status).toBe(400);
  });

  it('POST /api/transactions rejects non-positive amount', async () => {
    const res = await request(app).post('/api/transactions').send({
      title: 'x',
      amount: 0,
      type: 'income',
      date: '2026-05-01',
    });
    expect(res.status).toBe(400);
  });

  it('POST /api/transactions rejects invalid type', async () => {
    const res = await request(app).post('/api/transactions').send({
      title: 'x',
      amount: 5,
      type: 'transfer',
      date: '2026-05-01',
    });
    expect(res.status).toBe(400);
  });

  it('PATCH updates, DELETE removes, 404 thereafter', async () => {
    const created = await request(app)
      .post('/api/transactions')
      .send({
        title: 'Lunch',
        amount: 12,
        type: 'expense',
        category: 'food',
        date: '2026-05-02',
      });
    const id = created.body._id as string;

    const patched = await request(app)
      .patch(`/api/transactions/${id}`)
      .send({ amount: 15 });
    expect(patched.status).toBe(200);
    expect(patched.body.amount).toBe(15);

    const del = await request(app).delete(`/api/transactions/${id}`);
    expect(del.status).toBe(204);

    const after = await request(app).delete(`/api/transactions/${id}`);
    expect(after.status).toBe(404);
  });

  it('one user cannot see another user transactions', async () => {
    await request(app)
      .post('/api/transactions')
      .send({
        title: 'private',
        amount: 1,
        type: 'expense',
        category: 'food',
        date: '2026-05-01',
      });
    setAuthUser('other-user');
    const res = await request(app).get('/api/transactions');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });
});
