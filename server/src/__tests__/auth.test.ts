import { describe, it, expect } from 'vitest';
import supertest from 'supertest';
import { app } from '../app';

const request = supertest(app);

// Generate unique emails so parallel/repeated runs don't collide.
let seq = 0;
const nextEmail = () => `auth-test-${Date.now()}-${seq++}@example.com`;
const PASSWORD = 'Password123!';

// ---------------------------------------------------------------------------
// POST /api/auth/sign-up/email
// ---------------------------------------------------------------------------
describe('POST /api/auth/sign-up/email', () => {
  it('registers a new user and returns user data', async () => {
    const res = await request
      .post('/api/auth/sign-up/email')
      .send({ name: 'Test User', email: nextEmail(), password: PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('user');
    expect(res.body.user).toHaveProperty('email');
  });

  it('rejects registration with a duplicate email', async () => {
    const email = nextEmail();
    await request
      .post('/api/auth/sign-up/email')
      .send({ name: 'First', email, password: PASSWORD });

    const res = await request
      .post('/api/auth/sign-up/email')
      .send({ name: 'Second', email, password: PASSWORD });

    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('rejects registration with missing email', async () => {
    const res = await request
      .post('/api/auth/sign-up/email')
      .send({ name: 'Test User', password: PASSWORD });

    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('rejects registration with missing password', async () => {
    const res = await request
      .post('/api/auth/sign-up/email')
      .send({ name: 'Test User', email: nextEmail() });

    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/sign-in/email
// ---------------------------------------------------------------------------
describe('POST /api/auth/sign-in/email', () => {
  it('signs in with correct credentials and sets a session cookie', async () => {
    const email = nextEmail();
    await request
      .post('/api/auth/sign-up/email')
      .send({ name: 'Login User', email, password: PASSWORD });

    const res = await request
      .post('/api/auth/sign-in/email')
      .send({ email, password: PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('user');
    // better-auth sets a session cookie on successful sign-in
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('rejects sign-in with wrong password', async () => {
    const email = nextEmail();
    await request
      .post('/api/auth/sign-up/email')
      .send({ name: 'Login User', email, password: PASSWORD });

    const res = await request
      .post('/api/auth/sign-in/email')
      .send({ email, password: 'WrongPassword!' });

    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('rejects sign-in for an unknown email', async () => {
    const res = await request
      .post('/api/auth/sign-in/email')
      .send({ email: 'nobody-exists@example.com', password: PASSWORD });

    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
