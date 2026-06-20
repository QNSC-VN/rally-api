/**
 * work schema — projects, work_items, workflow_statuses, workflow_transitions,
 *               sprints, releases, project_counters, sprint_daily_snapshots,
 *               comments, attachments, custom_field_defs
 * Canonical DDL: 05_Architecture/DATABASE_SCHEMA.md §9
 */
import {
  pgSchema,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  decimal,
  timestamp,
  date,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const workSchema = pgSchema('work');

// ── projects ──────────────────────────────────────────────────────────────

export const projects = workSchema.table(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    workspaceId: uuid('workspace_id').notNull(),
    key: varchar('key', { length: 10 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    leadId: uuid('lead_id'),
    status: varchar('status', { length: 20 }).notNull().default('active'),
    settings: jsonb('settings').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => ({
    tenantIdx: index('ix_projects_tenant').on(t.tenantId),
    workspaceIdx: index('ix_projects_workspace').on(t.workspaceId),
    keyIdx: uniqueIndex('uq_projects_key').on(t.tenantId, t.key).where(sql`deleted_at IS NULL`),
  }),
);

// ── project_counters (item_key seq) ───────────────────────────────────────

export const projectCounters = workSchema.table('project_counters', {
  projectId: uuid('project_id').primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  lastItemNumber: integer('last_item_number').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── work_items ────────────────────────────────────────────────────────────

export const workItems = workSchema.table(
  'work_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    projectId: uuid('project_id').notNull(),
    itemKey: varchar('item_key', { length: 30 }).notNull(),
    type: varchar('type', { length: 20 }).notNull(),  // CHECK: initiative|feature|story|task|defect
    title: varchar('title', { length: 500 }).notNull(),
    description: text('description'),
    statusId: uuid('status_id').notNull(),
    priority: varchar('priority', { length: 20 }).notNull().default('medium'),
    assigneeId: uuid('assignee_id'),
    reporterId: uuid('reporter_id'),
    parentId: uuid('parent_id'),
    iterationId: uuid('iteration_id'),
    releaseId: uuid('release_id'),
    storyPoints: integer('story_points'),
    acceptanceCriteria: text('acceptance_criteria'),
    isBlocked: boolean('is_blocked').notNull().default(false),
    blockedReason: text('blocked_reason'),
    rank: varchar('rank', { length: 255 }).notNull().default(''),
    customFields: jsonb('custom_fields').notNull().default({}),
    createdBy: uuid('created_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => ({
    tenantIdx: index('ix_wi_tenant').on(t.tenantId),
    projectIdx: index('ix_wi_project').on(t.projectId),
    itemKeyIdx: uniqueIndex('uq_wi_item_key').on(t.projectId, t.itemKey),
    boardIdx: index('ix_wi_board').on(t.tenantId, t.projectId, t.statusId, t.rank),
    backlogIdx: index('ix_wi_backlog').on(t.tenantId, t.projectId, t.rank),
    assigneeIdx: index('ix_wi_assignee').on(t.tenantId, t.assigneeId),
    parentIdx: index('ix_wi_parent').on(t.parentId),
    iterationIdx: index('ix_wi_iteration').on(t.iterationId),
    releaseIdx: index('ix_wi_release').on(t.releaseId),
    blockedIdx: index('ix_wi_blocked').on(t.tenantId, t.isBlocked).where(sql`is_blocked = true`),
  }),
);

// ── workflow_statuses ─────────────────────────────────────────────────────

export const workflowStatuses = workSchema.table(
  'workflow_statuses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    projectId: uuid('project_id').notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    category: varchar('category', { length: 20 }).notNull(),  // to_do | in_progress | done
    color: varchar('color', { length: 20 }),
    position: integer('position').notNull().default(0),
    isDefault: boolean('is_default').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index('ix_ws_tenant').on(t.tenantId),
    projectIdx: index('ix_ws_project').on(t.projectId),
  }),
);

// ── workflow_transitions ──────────────────────────────────────────────────

export const workflowTransitions = workSchema.table(
  'workflow_transitions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    projectId: uuid('project_id').notNull(),
    fromStatusId: uuid('from_status_id'),   // NULL = any status
    toStatusId: uuid('to_status_id').notNull(),
    name: varchar('name', { length: 100 }),
    requiredRole: varchar('required_role', { length: 100 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index('ix_wt_tenant').on(t.tenantId),
    projectIdx: index('ix_wt_project').on(t.projectId),
  }),
);

// ── sprints (iterations) ──────────────────────────────────────────────────

export const sprints = workSchema.table(
  'sprints',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    projectId: uuid('project_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    goal: text('goal'),
    status: varchar('status', { length: 20 }).notNull().default('planned'),  // planned|active|completed
    startDate: date('start_date'),
    endDate: date('end_date'),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index('ix_sprints_tenant').on(t.tenantId),
    projectIdx: index('ix_sprints_project').on(t.projectId),
    activeIdx: index('ix_sprints_active').on(t.projectId, t.status).where(sql`status = 'active'`),
  }),
);

// ── sprint_daily_snapshots (burndown / velocity read model) ───────────────

export const sprintDailySnapshots = workSchema.table(
  'sprint_daily_snapshots',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    sprintId: uuid('sprint_id').notNull(),
    snapshotDate: date('snapshot_date').notNull(),
    totalPoints: integer('total_points').notNull().default(0),
    completedPoints: integer('completed_points').notNull().default(0),
    remainingPoints: integer('remaining_points').notNull().default(0),
    totalItems: integer('total_items').notNull().default(0),
    completedItems: integer('completed_items').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index('ix_sds_tenant').on(t.tenantId),
    sprintIdx: index('ix_sds_sprint').on(t.sprintId),
    uniqueDay: uniqueIndex('uq_sds_sprint_date').on(t.sprintId, t.snapshotDate),
  }),
);

// ── releases ──────────────────────────────────────────────────────────────

export const releases = workSchema.table(
  'releases',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    projectId: uuid('project_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    status: varchar('status', { length: 20 }).notNull().default('planned'),
    targetDate: date('target_date'),
    releasedAt: timestamp('released_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index('ix_releases_tenant').on(t.tenantId),
    projectIdx: index('ix_releases_project').on(t.projectId),
  }),
);
