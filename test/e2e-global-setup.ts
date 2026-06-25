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
import { uuidv7 } from 'uuidv7';
import { eq } from 'drizzle-orm';
import path from 'path';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as schema from '../db/schema';

export const E2E_CONFIG_FILE = path.join(tmpdir(), 'rally-e2e-config.json');

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
      // Wait for the SECOND occurrence: first fires during single-user recovery,
      // second fires when PG is truly accepting client connections.
      .withWaitStrategy(Wait.forLogMessage('database system is ready to accept connections', 2))
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

  // Run migrations with retry — gives PG a moment to fully stabilise
  const pool = new Pool({ connectionString: dbUrl, max: 2, connectionTimeoutMillis: 10_000 });
  const db = drizzle(pool, { schema });

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await migrate(db, {
        migrationsFolder: path.join(__dirname, '..', 'db', 'migrations'),
      });
      break;
    } catch (err) {
      if (attempt === 3) throw err;
      console.log(`[E2E] Migration attempt ${attempt} failed, retrying in 2s…`);
      await new Promise((r) => setTimeout(r, 2_000));
    }
  }

  // Seed test data
  await seedTestData(db);

  await pool.end();

  // Write connection strings to a temp file so worker processes can read them
  // (env var changes in globalSetup may not reliably propagate to forked workers
  // after setupFiles overwrite them)
  writeFileSync(E2E_CONFIG_FILE, JSON.stringify({ dbUrl, redisUrl }), 'utf8');

  // Also set in main process env as a best-effort fallback
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
export const TEST_VIEWER_ID = '00000000-0000-7000-8000-000000000006';
export const TEST_ADMIN_EMAIL = 'admin@e2e.test';
export const TEST_ADMIN_PASSWORD = 'Admin@Test2026!';
export const TEST_VIEWER_EMAIL = 'viewer@e2e.test';
export const TEST_VIEWER_PASSWORD = 'Viewer@Test2026!';

async function seedTestData(db: ReturnType<typeof drizzle>): Promise<void> {
  const [adminHash, viewerHash] = await Promise.all([
    argon2.hash(TEST_ADMIN_PASSWORD, { type: argon2.argon2id }),
    argon2.hash(TEST_VIEWER_PASSWORD, { type: argon2.argon2id }),
  ]);

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
    .values([
      {
        id: TEST_ADMIN_ID,
        tenantId: TEST_TENANT_ID,
        email: TEST_ADMIN_EMAIL,
        displayName: 'E2E Admin',
        emailVerified: true,
        locale: 'en',
        timezone: 'UTC',
        passwordHash: adminHash,
      },
      {
        id: TEST_VIEWER_ID,
        tenantId: TEST_TENANT_ID,
        email: TEST_VIEWER_EMAIL,
        displayName: 'E2E Viewer',
        emailVerified: true,
        locale: 'en',
        timezone: 'UTC',
        passwordHash: viewerHash,
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(schema.workspaceMembers)
    .values([
      { tenantId: TEST_TENANT_ID, workspaceId: TEST_WORKSPACE_ID, userId: TEST_ADMIN_ID },
      { tenantId: TEST_TENANT_ID, workspaceId: TEST_WORKSPACE_ID, userId: TEST_VIEWER_ID },
    ])
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

  // Seed project_counter so work-item key generation works (generateItemKey calls incrementCounter)
  await db
    .insert(schema.projectCounters)
    .values({ projectId: TEST_PROJECT_ID, tenantId: TEST_TENANT_ID, lastItemNumber: 0 })
    .onConflictDoNothing();

  // Seed a workflow status so work items can be created
  await db
    .insert(schema.workflowStatuses)
    .values({
      id: TEST_WORKFLOW_STATUS_ID,
      tenantId: TEST_TENANT_ID,
      projectId: TEST_PROJECT_ID,
      name: 'To Do',
      category: 'to_do',
      position: 0,
    })
    .onConflictDoNothing();

  // ── Seed system roles and assign to test users ────────────────────────────
  const adminRoleId = uuidv7();
  const viewerRoleId = uuidv7();

  await db
    .insert(schema.systemRoles)
    .values([
      {
        id: adminRoleId,
        tenantId: TEST_TENANT_ID,
        name: 'Workspace Admin',
        slug: 'workspace_admin_e2e',
        isSystem: true,
        permissions: [
          'workspace:*',
          'project:view',
          'project:create',
          'project:edit',
          'project:archive',
          'project:restore',
          'project:delete',
          'work_item:create',
          'work_item:edit',
          'work_item:delete',
          'work_item:view',
        ],
      },
      {
        id: viewerRoleId,
        tenantId: TEST_TENANT_ID,
        name: 'Project Viewer',
        slug: 'project_viewer_e2e',
        isSystem: true,
        permissions: ['work_item:view'],
      },
    ])
    .onConflictDoNothing();

  // Verify roles were inserted (handle conflict-do-nothing edge case)
  const [adminRole] = await db
    .select({ id: schema.systemRoles.id })
    .from(schema.systemRoles)
    .where(eq(schema.systemRoles.slug, 'workspace_admin_e2e'))
    .limit(1);
  const [viewerRole] = await db
    .select({ id: schema.systemRoles.id })
    .from(schema.systemRoles)
    .where(eq(schema.systemRoles.slug, 'project_viewer_e2e'))
    .limit(1);

  if (adminRole && viewerRole) {
    await db
      .insert(schema.userRoleAssignments)
      .values([
        {
          id: uuidv7(),
          tenantId: TEST_TENANT_ID,
          userId: TEST_ADMIN_ID,
          roleId: adminRole.id,
          scopeType: 'workspace' as const,
          scopeId: TEST_WORKSPACE_ID,
          grantedBy: TEST_ADMIN_ID,
        },
        {
          id: uuidv7(),
          tenantId: TEST_TENANT_ID,
          userId: TEST_VIEWER_ID,
          roleId: viewerRole.id,
          scopeType: 'workspace' as const,
          scopeId: TEST_WORKSPACE_ID,
          grantedBy: TEST_ADMIN_ID,
        },
      ])
      .onConflictDoNothing();
  }
}
