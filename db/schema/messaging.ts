/**
 * messaging schema — outbox_events
 * Canonical DDL: 05_Architecture/DATABASE_SCHEMA.md §9
 */
import {
  pgSchema,
  uuid,
  varchar,
  integer,
  timestamp,
  jsonb,
  text,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const messagingSchema = pgSchema('messaging');

export const outboxEvents = messagingSchema.table(
  'outbox_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id').notNull(),
    eventType: varchar('event_type', { length: 255 }).notNull(),
    version: integer('version').notNull().default(1),
    aggregateType: varchar('aggregate_type', { length: 100 }).notNull(),
    aggregateId: uuid('aggregate_id').notNull(),
    tenantId: uuid('tenant_id').notNull(),
    payload: jsonb('payload').notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('pending'),  // pending|published|failed
    attempts: integer('attempts').notNull().default(0),
    lastError: text('last_error'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    // Partition column — see DATABASE_SCHEMA.md §8 for monthly range partitioning
    partitionKey: timestamp('partition_key', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    statusIdx: index('ix_outbox_status').on(t.status, t.createdAt).where(sql`status = 'pending'`),
    tenantIdx: index('ix_outbox_tenant').on(t.tenantId),
    eventIdIdx: index('ix_outbox_event_id').on(t.eventId),
  }),
);
