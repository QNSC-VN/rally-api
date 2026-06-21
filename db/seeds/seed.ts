// Load .env for local dev; in CI the env vars are injected directly.
try {
  process.loadEnvFile('.env');
} catch {
  /* no .env file — CI mode */
}

/**
 * Seed script — creates the first tenant, workspace, admin user,
 * system roles + permission catalogue, and default workflow for dev/test.
 *
 * Run: pnpm db:seed
 * Idempotent — safe to run multiple times.
 */
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as argon2 from 'argon2';
import * as schema from '../schema';

const url = process.env['DATABASE_URL'];
if (!url) {
  console.error('DATABASE_URL required');
  process.exit(1);
}

const pool = new Pool({ connectionString: url, max: 1 });
const db = drizzle(pool, { schema });

const SYSTEM_TENANT_ID = '00000000-0000-7000-8000-000000000001';
const ADMIN_USER_ID = '00000000-0000-7000-8000-000000000002';
const WORKSPACE_ID = '00000000-0000-7000-8000-000000000003';
// PROJECT_ID reserved for Phase 0 seeding

async function seed() {
  console.log('Seeding...');

  // ── Tenant ──────────────────────────────────────────────────────────────
  await db
    .insert(schema.tenants)
    .values({
      id: SYSTEM_TENANT_ID,
      slug: 'acme',
      name: 'Acme Corp (Dev Tenant)',
      status: 'active',
      plan: 'free',
    })
    .onConflictDoNothing();

  // ── Workspace ────────────────────────────────────────────────────────────
  await db
    .insert(schema.workspaces)
    .values({
      id: WORKSPACE_ID,
      tenantId: SYSTEM_TENANT_ID,
      slug: 'main',
      name: 'ACME Corp',
    })
    .onConflictDoNothing();

  // ── Admin user ───────────────────────────────────────────────────────────
  const passwordHash = await argon2.hash('Admin@Rally2026!', { type: argon2.argon2id });
  await db
    .insert(schema.users)
    .values({
      id: ADMIN_USER_ID,
      tenantId: SYSTEM_TENANT_ID,
      email: 'admin@acme.dev',
      displayName: 'Admin User',
      emailVerified: true,
      locale: 'en',
      timezone: 'Asia/Ho_Chi_Minh',
      passwordHash,
    })
    .onConflictDoNothing();

  // ── Workspace member ─────────────────────────────────────────────────────
  await db
    .insert(schema.workspaceMembers)
    .values({
      tenantId: SYSTEM_TENANT_ID,
      workspaceId: WORKSPACE_ID,
      userId: ADMIN_USER_ID,
    })
    .onConflictDoNothing();

  // ── System roles ─────────────────────────────────────────────────────────
  const ROLES = [
    { slug: 'workspace_admin', name: 'Workspace Admin', permissions: ['workspace:*'] },
    { slug: 'project_admin', name: 'Project Admin', permissions: ['project:*'] },
    {
      slug: 'project_member',
      name: 'Project Member',
      permissions: ['work_item:create', 'work_item:edit:own', 'work_item:view'],
    },
    { slug: 'project_viewer', name: 'Project Viewer', permissions: ['work_item:view'] },
    {
      slug: 'workspace_member',
      name: 'Workspace Member',
      permissions: ['workspace:view', 'project:view'],
    },
    { slug: 'guest', name: 'Guest', permissions: ['work_item:view:public'] },
  ];

  for (const role of ROLES) {
    await db
      .insert(schema.systemRoles)
      .values({
        name: role.name,
        slug: role.slug,
        isSystem: true,
        permissions: role.permissions,
      })
      .onConflictDoNothing();
  }

  // ── Subscription ─────────────────────────────────────────────────────────
  await db
    .insert(schema.subscriptions)
    .values({
      tenantId: SYSTEM_TENANT_ID,
      plan: 'free',
      status: 'active',
    })
    .onConflictDoNothing();

  console.log('✅  Seed complete');
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => pool.end());
