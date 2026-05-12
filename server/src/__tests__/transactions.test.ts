import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import supertest from 'supertest';
import { app } from '../app.js';
import { Transaction } from '../models/Transaction.js';

const BASE = '/api/transactions';

let seq = 0;
const nextEmail = (tag: string) => `tx-${tag}-${Date.now()}-${seq++}@example.com`;
const PASSWORD = 'Password123!';

/** Register + sign in, returning an agent that carries the session cookie. */
async function registerAndLogin(tag: string): Promise<supertest.Agent> {
  const agent = supertest.agent(app);
  const email = nextEmail(tag);
  await agent
    .post('/api/auth/sign-up/email')
    .send({ name: tag, email, password: PASSWORD });
  await agent
    .post('/api/auth/sign-in/email')
    .send({ email, password: PASSWORD });
  return agent;
}

/** A minimal valid expense transaction body. */
const validExpense = {
  title: 'Coffee',
  amount: 5.5,
  type: 'expense',
  category: 'Food',
  date: new Date().toISOString(),
};

/** A minimal valid income transaction body. */
const validIncome = {
  title: 'Salary',
  amount: 1000,
  type: 'income',
  date: new Date().toISOString(),
};

describe('Transaction routes', () => {
  let agentA: supertest.Agent;
  let agentB: supertest.Agent;

  beforeAll(async () => {
    agentA = await registerAndLogin('userA');
    agentB = await registerAndLogin('userB');
  });

  // Remove only transactions between tests so user sessions remain valid.
  afterEach(async () => {
    await Transaction.deleteMany({});
  });

  // -------------------------------------------------------------------------
  // GET /api/transactions
  // -------------------------------------------------------------------------
  describe('GET /api/transactions', () => {
    it('returns 401 without a valid token', async () => {
      const res = await supertest(app).get(BASE);
      expect(res.status).toBe(401);
    });

    it("returns only the signed-in user's own transactions", async () => {
      await agentA.post(BASE).send(validExpense);
      await agentB.post(BASE).send({ ...validExpense, title: 'User B coffee' });

      const res = await agentA.get(BASE);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe('Coffee');
    });

    it('returns an empty array when the user has no transactions', async () => {
      const res = await agentA.get(BASE);
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // POST /api/transactions
  // -------------------------------------------------------------------------
  describe('POST /api/transactions', () => {
    it('returns 401 without a valid token', async () => {
      const res = await supertest(app).post(BASE).send(validExpense);
      expect(res.status).toBe(401);
    });

    it('creates an expense transaction and returns it', async () => {
      const res = await agentA.post(BASE).send(validExpense);
      expect(res.status).toBe(201);
      expect(res.body.title).toBe('Coffee');
      expect(res.body.amount).toBe(5.5);
      expect(res.body.type).toBe('expense');
      expect(res.body.category).toBe('Food');
      expect(res.body._id).toBeDefined();
    });

    it('creates an income transaction (no category required)', async () => {
      const res = await agentA.post(BASE).send(validIncome);
      expect(res.status).toBe(201);
      expect(res.body.type).toBe('income');
    });

    it('rejects a transaction with missing title', async () => {
      const { title: _t, ...noTitle } = validExpense;
      const res = await agentA.post(BASE).send(noTitle);
      expect(res.status).toBe(400);
    });

    it('rejects a transaction with missing date', async () => {
      const { date: _d, ...noDate } = validExpense;
      const res = await agentA.post(BASE).send(noDate);
      expect(res.status).toBe(400);
    });

    it('rejects an invalid type value', async () => {
      const res = await agentA.post(BASE).send({ ...validExpense, type: 'transfer' });
      expect(res.status).toBe(400);
    });

    it('rejects a non-positive amount', async () => {
      const res = await agentA.post(BASE).send({ ...validExpense, amount: -10 });
      expect(res.status).toBe(400);
    });

    it('rejects an expense without a category', async () => {
      const { category: _c, ...noCategory } = validExpense;
      const res = await agentA.post(BASE).send(noCategory);
      expect(res.status).toBe(400);
    });
  });

  // -------------------------------------------------------------------------
  // DELETE /api/transactions/:id
  // -------------------------------------------------------------------------
  describe('DELETE /api/transactions/:id', () => {
    it('returns 401 without a valid token', async () => {
      const created = await agentA.post(BASE).send(validExpense);
      const res = await supertest(app).delete(`${BASE}/${created.body._id}`);
      expect(res.status).toBe(401);
    });

    it('deletes a transaction the user owns and returns 204', async () => {
      const created = await agentA.post(BASE).send(validExpense);
      const del = await agentA.delete(`${BASE}/${created.body._id}`);
      expect(del.status).toBe(204);

      const list = await agentA.get(BASE);
      expect(list.body).toHaveLength(0);
    });

    it('returns 404 when a different user tries to delete the transaction', async () => {
      const created = await agentA.post(BASE).send(validExpense);
      const res = await agentB.delete(`${BASE}/${created.body._id}`);
      expect(res.status).toBe(404);
    });

    it('returns 404 for a non-existent transaction id', async () => {
      const fakeId = '000000000000000000000001';
      const res = await agentA.delete(`${BASE}/${fakeId}`);
      expect(res.status).toBe(404);
    });
  });
});
