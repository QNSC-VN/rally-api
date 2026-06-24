/* eslint-disable no-console */
/**
 * E2E Global Setup — runs once in the main process before any test workers.
 * Starts PostgreSQL and Redis containers, runs migrations, seeds test data.
 */
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import * as argon2 from 'argon2';
import path from 'path';
import * as schema from '../db/schema';

let pgContainer: StartedTestContainer;
let redisContainer: StartedTestContainer;

export async function setup(): Promise<void> {
  console.log('[E2E] Starting containers...');

  [pgContainer, redisContainer] = await Promise.all([
    new GenericContainer('postgres:17-alpine')
      .withEnvironment({
        POSTGRES_DB: 'rally_test',
        POSTGRES_USER: 'rally_app',
        POSTGRES_PASSWORD: 'rally_test_pw',
      })
      .withExposedPorts(5432)
      .withWaitStrategy(Wait.forLogMessage('database system is ready to accept connections'))
      .start(),
    new GenericContainer('redis:7-alpine')
      .withExposedPorts(6379)
      .withWaitStrategy(Wait.forLogMessage('Ready to accept connections'))
      .start(),
  ]);

  const pgHost = pgContainer.getHost();
  const pgPort = pgContainer.getMappedPort(5432);
  const dbUrl = `postgresql://rally_app:rally_test_pw@${pgHost}:${pgPort}/rally_test`;

  const redisHost = redisContainer.getHost();
  const redisPort = redisContainer.getMappedPort(6379);
  const redisUrl = `redis://${redisHost}:${redisPort}`;

  // Run migrations
  const pool = new Pool({ connectionString: dbUrl, max: 1 });
  const db = drizzle(pool, { schema });
  await migrate(db, {
    migrationsFolder: path.join(__dirname, '..', 'db', 'migrations'),
  });

  // Seed test data
  await seedTestData(db);

  await pool.end();

  // Expose connection strings to worker processes
  process.env['E2E_DATABASE_URL'] = dbUrl;
  process.env['E2E_REDIS_URL'] = redisUrl;
  process.env['DATABASE_URL'] = dbUrl;
  process.env['REDIS_URL'] = redisUrl;

  console.log('[E2E] Containers ready.');
}

export async function teardown(): Promise<void> {
  await Promise.all([
    pgContainer?.stop({ timeout: 10_000 }),
    redisContainer?.stop({ timeout: 10_000 }),
  ]);
  console.log('[E2E] Containers stopped.');
}

// ── Seed data constants (exported so specs can reference them) ────────────────

export const TEST_TENANT_ID = '00000000-0000-7000-8000-000000000001';
export const TEST_ADMIN_ID = '00000000-0000-7000-8000-000000000002';
export const TEST_WORKSPACE_ID = '00000000-0000-7000-8000-000000000003';
export const TEST_PROJECT_ID = '00000000-0000-7000-8000-000000000004';
export const TEST_WORKFLOW_STATUS_ID = '00000000-0000-7000-8000-000000000005';
export const TEST_ADMIN_EMAIL = 'admin@e2e.test';
export const TEST_ADMIN_PASSWORD = 'Admin@Test2026!';

async function seedTestData(db: ReturnType<typeof drizzle>): Promise<void> {
  const passwordHash = await argon2.hash(TEST_ADMIN_PASSWORD, {
    type: argon2.argon2id,
  });

  await db
    .insert(schema.tenants)
    .values({
      id: TEST_TENANT_ID,
      slug: 'e2e',
      name: 'E2E Test Corp',
      status: 'active',
      plan: 'free',
    })
    .onConflictDoNothing();

  await db
    .insert(schema.workspaces)
    .values({
      id: TEST_WORKSPACE_ID,
      tenantId: TEST_TENANT_ID,
      slug: 'main',
      name: 'E2E Workspace',
    })
    .onConflictDoNothing();

  await db
    .insert(schema.users)
    .values({
      id: TEST_ADMIN_ID,
      tenantId: TEST_TENANT_ID,
      email: TEST_ADMIN_EMAIL,
      displayName: 'E2E Admin',
      emailVerified: true,
      locale: 'en',
      timezone: 'UTC',
      passwordHash,
    })
    .onConflictDoNothing();

  await db
    .insert(schema.workspaceMembers)
    .values({
      tenantId: TEST_TENANT_ID,
      workspaceId: TEST_WORKSPACE_ID,
      userId: TEST_ADMIN_ID,
    })
    .onConflictDoNothing();

  // Seed project for work-item E2E tests
  await db
    .insert(schema.projects)
    .values({
      id: TEST_PROJECT_ID,
      tenantId: TEST_TENANT_ID,
      workspaceId: TEST_WORKSPACE_ID,
      key: 'E2E',
      name: 'E2E Project',
      status: 'active',
    })
    .onConflictDoNothing();

  // Seed a workflow status so work items can be created
  await db
    .insert(schema.workflowStatuses)
    .values({
      id: TEST_WORKFLOW_STATUS_ID,
      tenantId: TEST_TENANT_ID,
      projectId: TEST_PROJECT_ID,
      name: 'To Do',
      category: 'todo',
      position: 0,
    })
    .onConflictDoNothing();
}
