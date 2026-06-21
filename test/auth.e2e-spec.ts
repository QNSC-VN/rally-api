/**
 * Auth E2E tests — tests the full HTTP stack using a real NestJS app,
 * real PostgreSQL (testcontainer), real Redis, and real JWT signing.
 */
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import supertest from 'supertest';
import { createTestApp } from './helpers/app-factory';
import { TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD } from './e2e-global-setup';

describe('Auth (e2e)', () => {
  let app: NestFastifyApplication;
  let http: ReturnType<typeof supertest>;

  beforeAll(async () => {
    app = await createTestApp();
    http = supertest(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
  });

  // ── POST /v1/auth/login ──────────────────────────────────────────────────

  describe('POST /v1/auth/login', () => {
    it('returns 200 + accessToken on valid credentials', async () => {
      const res = await http
        .post('/v1/auth/login')
        .send({ email: TEST_ADMIN_EMAIL, password: TEST_ADMIN_PASSWORD });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        accessToken: expect.any(String),
        expiresIn: expect.any(Number),
        user: {
          email: TEST_ADMIN_EMAIL,
          displayName: 'E2E Admin',
        },
      });
      // Refresh token should be in Set-Cookie
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('returns 401 on wrong password', async () => {
      const res = await http
        .post('/v1/auth/login')
        .send({ email: TEST_ADMIN_EMAIL, password: 'WrongPass123!' });

      expect(res.status).toBe(401);
    });

    it('returns 401 on non-existent email', async () => {
      const res = await http
        .post('/v1/auth/login')
        .send({ email: 'nobody@nowhere.test', password: 'Whatever123!' });

      expect(res.status).toBe(401);
    });

    it('returns 422 on missing fields', async () => {
      const res = await http.post('/v1/auth/login').send({});
      expect(res.status).toBe(422);
    });
  });

  // ── GET /v1/auth/me ──────────────────────────────────────────────────────

  describe('GET /v1/auth/me', () => {
    let accessToken: string;

    beforeEach(async () => {
      const loginRes = await http
        .post('/v1/auth/login')
        .send({ email: TEST_ADMIN_EMAIL, password: TEST_ADMIN_PASSWORD });
      accessToken = loginRes.body.accessToken as string;
    });

    it('returns 200 + user profile with valid token', async () => {
      const res = await http.get('/v1/auth/me').set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        email: TEST_ADMIN_EMAIL,
        displayName: 'E2E Admin',
      });
    });

    it('returns 401 without token', async () => {
      const res = await http.get('/v1/auth/me');
      expect(res.status).toBe(401);
    });

    it('returns 401 with invalid token', async () => {
      const res = await http.get('/v1/auth/me').set('Authorization', 'Bearer not.a.valid.token');
      expect(res.status).toBe(401);
    });
  });

  // ── POST /v1/auth/refresh ────────────────────────────────────────────────

  describe('POST /v1/auth/refresh', () => {
    it('issues a new access token using refresh cookie', async () => {
      const loginRes = await http
        .post('/v1/auth/login')
        .send({ email: TEST_ADMIN_EMAIL, password: TEST_ADMIN_PASSWORD });
      const cookies = loginRes.headers['set-cookie'] as string[];

      const res = await http.post('/v1/auth/refresh').set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
    });

    it('returns 401 when no refresh cookie', async () => {
      const res = await http.post('/v1/auth/refresh');
      expect(res.status).toBe(401);
    });
  });

  // ── POST /v1/auth/logout ─────────────────────────────────────────────────

  describe('POST /v1/auth/logout', () => {
    it('returns 204 and clears cookie', async () => {
      const loginRes = await http
        .post('/v1/auth/login')
        .send({ email: TEST_ADMIN_EMAIL, password: TEST_ADMIN_PASSWORD });
      const { accessToken } = loginRes.body as { accessToken: string };

      const res = await http.post('/v1/auth/logout').set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(204);
    });

    it('returns 401 when not logged in', async () => {
      const res = await http.post('/v1/auth/logout');
      expect(res.status).toBe(401);
    });
  });

  // ── PATCH /v1/auth/me ────────────────────────────────────────────────────

  describe('PATCH /v1/auth/me', () => {
    let accessToken: string;

    beforeEach(async () => {
      const loginRes = await http
        .post('/v1/auth/login')
        .send({ email: TEST_ADMIN_EMAIL, password: TEST_ADMIN_PASSWORD });
      accessToken = loginRes.body.accessToken as string;
    });

    it('updates display name', async () => {
      const res = await http
        .patch('/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ displayName: 'Updated E2E Admin' });

      expect(res.status).toBe(200);
      expect(res.body.displayName).toBe('Updated E2E Admin');

      // Restore
      await http
        .patch('/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ displayName: 'E2E Admin' });
    });
  });

  // ── POST /v1/auth/forgot-password ────────────────────────────────────────

  describe('POST /v1/auth/forgot-password', () => {
    it('returns 204 for known email (does not leak user existence)', async () => {
      const res = await http.post('/v1/auth/forgot-password').send({ email: TEST_ADMIN_EMAIL });

      // Service always returns 204 to prevent email enumeration
      expect(res.status).toBe(204);
    });

    it('returns 204 for unknown email', async () => {
      const res = await http
        .post('/v1/auth/forgot-password')
        .send({ email: 'nonexistent@nowhere.test' });

      expect(res.status).toBe(204);
    });
  });
});
