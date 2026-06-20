/**
 * notifications schema — in_app_notifications
 * Canonical DDL: 05_Architecture/DATABASE_SCHEMA.md §9
 */
import {
  pgSchema,
  uuid,
  varchar,
  text,
  boolean,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const notificationsSchema = pgSchema('notifications');

export const inAppNotifications = notificationsSchema.table(
  'in_app_notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    recipientId: uuid('recipient_id').notNull(),
    actorId: uuid('actor_id'), // who triggered the notification
    type: varchar('type', { length: 100 }).notNull(), // e.g. 'work_item.assigned'
    title: varchar('title', { length: 500 }).notNull(),
    body: text('body'),
    resourceType: varchar('resource_type', { length: 50 }), // 'work_item' | 'sprint' | etc.
    resourceId: uuid('resource_id'),
    metadata: jsonb('metadata').notNull().default({}),
    isRead: boolean('is_read').notNull().default(false),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    // Populated by SQS consumer with the outbox eventId for deduplication.
    sourceEventId: uuid('source_event_id'),
  },
  (t) => ({
    recipientIdx: index('ix_ian_recipient').on(t.tenantId, t.recipientId, t.isRead),
    createdIdx: index('ix_ian_created').on(t.recipientId, t.createdAt),
    resourceIdx: index('ix_ian_resource').on(t.resourceType, t.resourceId),
    sourceEventIdx: uniqueIndex('uq_ian_source_event_id').on(t.sourceEventId),
  }),
);
