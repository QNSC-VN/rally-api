/**
 * Work Items E2E tests — CRUD operations on work items.
 */
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import supertest from 'supertest';
import { createTestApp } from './helpers/app-factory';
import {
  TEST_ADMIN_EMAIL,
  TEST_ADMIN_PASSWORD,
  TEST_PROJECT_ID,
  TEST_WORKFLOW_STATUS_ID,
  TEST_VIEWER_EMAIL,
  TEST_VIEWER_PASSWORD,
} from './e2e-global-setup';

describe('Work Items (e2e)', () => {
  let app: NestFastifyApplication;
  let http: ReturnType<typeof supertest>;
  let accessToken: string;
  let viewerToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    http = supertest(app.getHttpServer());

    const [adminLogin, viewerLogin] = await Promise.all([
      http.post('/v1/auth/login').send({ email: TEST_ADMIN_EMAIL, password: TEST_ADMIN_PASSWORD }),
      http.post('/v1/auth/login').send({ email: TEST_VIEWER_EMAIL, password: TEST_VIEWER_PASSWORD }),
    ]);
    accessToken = adminLogin.body.accessToken as string;
    viewerToken = viewerLogin.body.accessToken as string;
  });

  afterAll(async () => {
    await app.close();
  });

  // ── POST /v1/work-items ──────────────────────────────────────────────────

  describe('POST /v1/work-items', () => {
    it('creates a work item and returns 201', async () => {
      const res = await http
        .post('/v1/work-items')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          projectId: TEST_PROJECT_ID,
          type: 'story',
          title: 'E2E Test Story',
          priority: 'normal',
          statusId: TEST_WORKFLOW_STATUS_ID,
        });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        title: 'E2E Test Story',
        type: 'story',
        priority: 'normal',
      });
    });

    it('returns 403 when viewer tries to create a work item', async () => {
      const res = await http
        .post('/v1/work-items')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          projectId: TEST_PROJECT_ID,
          type: 'story',
          title: 'Viewer Should Not Create',
        });

      expect(res.status).toBe(403);
    });

    it('returns 422 when required fields are missing', async () => {
      const res = await http
        .post('/v1/work-items')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'No Project' });

      expect(res.status).toBe(422);
    });

    it('returns 401 without auth token', async () => {
      const res = await http
        .post('/v1/work-items')
        .send({ projectId: TEST_PROJECT_ID, type: 'story', title: 'Unauth' });

      expect(res.status).toBe(401);
    });
  });

  // ── GET /v1/work-items ───────────────────────────────────────────────────

  describe('GET /v1/work-items', () => {
    it('returns paginated list of work items for admin', async () => {
      const res = await http
        .get('/v1/work-items')
        .query({ projectId: TEST_PROJECT_ID })
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.pageInfo).toBeDefined();
    });

    it('returns paginated list for viewer (read is permitted)', async () => {
      const res = await http
        .get('/v1/work-items')
        .query({ projectId: TEST_PROJECT_ID })
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
    });
  });

  // ── Full CRUD flow ───────────────────────────────────────────────────────

  describe('full CRUD lifecycle', () => {
    let workItemId: string;

    it('creates a work item', async () => {
      const res = await http
        .post('/v1/work-items')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          projectId: TEST_PROJECT_ID,
          type: 'task',
          title: 'Lifecycle Task',
          priority: 'high',
        });

      expect(res.status).toBe(201);
      workItemId = res.body.id as string;
      expect(workItemId).toBeDefined();
    });

    it('retrieves the created work item', async () => {
      const res = await http
        .get(`/v1/work-items/${workItemId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(workItemId);
      expect(res.body.title).toBe('Lifecycle Task');
    });

    it('updates the work item', async () => {
      const res = await http
        .patch(`/v1/work-items/${workItemId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'Updated Lifecycle Task', priority: 'low' });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Updated Lifecycle Task');
      expect(res.body.priority).toBe('low');
    });

    it('returns 403 when viewer tries to update', async () => {
      const res = await http
        .patch(`/v1/work-items/${workItemId}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ title: 'Viewer Update Attempt' });

      expect(res.status).toBe(403);
    });

    it('returns 403 when viewer tries to delete', async () => {
      const res = await http
        .delete(`/v1/work-items/${workItemId}`)
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(403);
    });

    it('soft-deletes the work item (admin)', async () => {
      const res = await http
        .delete(`/v1/work-items/${workItemId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(204);
    });

    it('returns 404 after deletion', async () => {
      const res = await http
        .get(`/v1/work-items/${workItemId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(404);
    });
  });
});
