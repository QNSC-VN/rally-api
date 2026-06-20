/**
 * tenancy schema — tenants, workspaces, workspace_members, subscriptions, project_counters
 * Canonical DDL: 05_Architecture/DATABASE_SCHEMA.md §9
 */
import {
  pgSchema,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const tenancySchema = pgSchema('tenancy');

// ── tenants ───────────────────────────────────────────────────────────────

export const tenants = tenancySchema.table(
  'tenants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: varchar('slug', { length: 63 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('active'),
    plan: varchar('plan', { length: 50 }).notNull().default('free'),
    settings: jsonb('settings').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => ({
    slugIdx: uniqueIndex('uq_tenants_slug').on(t.slug).where(sql`deleted_at IS NULL`),
    statusIdx: index('ix_tenants_status').on(t.status),
  }),
);

// ── workspaces ────────────────────────────────────────────────────────────

export const workspaces = tenancySchema.table(
  'workspaces',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    slug: varchar('slug', { length: 63 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    avatarUrl: varchar('avatar_url', { length: 2048 }),
    settings: jsonb('settings').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => ({
    tenantIdx: index('ix_workspaces_tenant').on(t.tenantId),
    slugIdx: uniqueIndex('uq_workspaces_tenant_slug')
      .on(t.tenantId, t.slug)
      .where(sql`deleted_at IS NULL`),
  }),
);

// ── workspace_members ────────────────────────────────────────────────────

export const workspaceMembers = tenancySchema.table(
  'workspace_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    workspaceId: uuid('workspace_id').notNull(),
    userId: uuid('user_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index('ix_wm_tenant').on(t.tenantId),
    uniqueMember: uniqueIndex('uq_workspace_member').on(t.workspaceId, t.userId),
    userIdx: index('ix_wm_user').on(t.userId),
  }),
);

// ── subscriptions ─────────────────────────────────────────────────────────

export const subscriptions = tenancySchema.table(
  'subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    plan: varchar('plan', { length: 50 }).notNull().default('free'),
    status: varchar('status', { length: 20 }).notNull().default('active'),
    seatLimit: integer('seat_limit'),
    currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
    externalSubscriptionId: varchar('external_subscription_id', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: uniqueIndex('uq_subscriptions_tenant').on(t.tenantId),
  }),
);

// sql tag — required for partial index WHERE clauses in Drizzle
import { sql } from 'drizzle-orm';
