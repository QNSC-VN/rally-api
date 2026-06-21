/**
 * Workspace E2E tests — workspace CRUD and member management.
 */
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import supertest from 'supertest';
import { createTestApp } from './helpers/app-factory';
import { TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD, TEST_WORKSPACE_ID } from './e2e-global-setup';

describe('Workspace (e2e)', () => {
  let app: NestFastifyApplication;
  let http: ReturnType<typeof supertest>;
  let accessToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    http = supertest(app.getHttpServer());

    const loginRes = await http
      .post('/v1/auth/login')
      .send({ email: TEST_ADMIN_EMAIL, password: TEST_ADMIN_PASSWORD });
    accessToken = loginRes.body.accessToken as string;
  });

  afterAll(async () => {
    await app.close();
  });

  // ── GET /v1/workspaces ───────────────────────────────────────────────────

  describe('GET /v1/workspaces', () => {
    it('returns 200 + list of workspaces for the tenant', async () => {
      const res = await http.get('/v1/workspaces').set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.items).toBeInstanceOf(Array);
      expect(res.body.items.length).toBeGreaterThan(0);
    });

    it('returns 401 without auth token', async () => {
      const res = await http.get('/v1/workspaces');
      expect(res.status).toBe(401);
    });
  });

  // ── GET /v1/workspaces/:id ───────────────────────────────────────────────

  describe('GET /v1/workspaces/:id', () => {
    it('returns 200 + workspace details', async () => {
      const res = await http
        .get(`/v1/workspaces/${TEST_WORKSPACE_ID}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: TEST_WORKSPACE_ID,
        name: 'E2E Workspace',
      });
    });

    it('returns 404 for non-existent workspace', async () => {
      const res = await http
        .get('/v1/workspaces/00000000-0000-0000-0000-000000000999')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(404);
    });
  });

  // ── POST /v1/workspaces ──────────────────────────────────────────────────

  describe('POST /v1/workspaces', () => {
    it('creates a new workspace', async () => {
      const res = await http
        .post('/v1/workspaces')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'New E2E Workspace', slug: 'new-e2e' });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        name: 'New E2E Workspace',
        slug: 'new-e2e',
      });
    });

    it('returns 422 on missing name', async () => {
      const res = await http
        .post('/v1/workspaces')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});

      expect(res.status).toBe(422);
    });
  });

  // ── PATCH /v1/workspaces/:id ─────────────────────────────────────────────

  describe('PATCH /v1/workspaces/:id', () => {
    it('updates workspace name', async () => {
      const res = await http
        .patch(`/v1/workspaces/${TEST_WORKSPACE_ID}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Renamed E2E Workspace' });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Renamed E2E Workspace');

      // Restore original name
      await http
        .patch(`/v1/workspaces/${TEST_WORKSPACE_ID}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'E2E Workspace' });
    });
  });

  // ── GET /v1/workspaces/:id/members ───────────────────────────────────────

  describe('GET /v1/workspaces/:id/members', () => {
    it('returns list of members', async () => {
      const res = await http
        .get(`/v1/workspaces/${TEST_WORKSPACE_ID}/members`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.items).toBeInstanceOf(Array);
      expect(res.body.items.length).toBeGreaterThan(0);
    });
  });
});
