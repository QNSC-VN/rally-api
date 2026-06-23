/**
 * NotificationRelayService — polls notification_outbox and dispatches via
 * NotificationsService (writes to in_app_notifications).
 *
 * Extends AbstractOutboxRelay which owns the polling loop, concurrency guard,
 * transaction management, and retry/fail logic.  This class provides only the
 * notification-specific behaviour: what to SELECT, how to render + send, and
 * how to mark rows.
 *
 * Adaptive polling:
 *   NotificationSchedulerService.schedule() publishes a relay:wake signal to
 *   Valkey immediately after writing to notification_outbox.  onModuleInit()
 *   subscribes and calls super.relay() directly — delivery latency drops from
 *   ≤5s (cron) to ~ms (wake signal).  The 5s cron is the catch-all fallback.
 *
 * Post-commit SSE push (3rd layer of the real-time pipeline):
 *   processRow() returns a PostCommitTask that publishes to Valkey AFTER the
 *   transaction commits so the SSE controller never receives an event before
 *   in_app_notifications is durable.  Only non-null (new) notifications are
 *   published; deduplicated rows (null) produce no SSE event.
 *
 * End-to-end idempotency (3 layers):
 *   1. notification_outbox.idempotency_key UNIQUE — prevents duplicate outbox rows.
 *   2. row.idempotencyKey ?? row.id passed as sourceEventId.
 *   3. in_app_notifications.source_event_id UNIQUE — safe no-op on relay retry.
 */
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { and, asc, eq, lt, lte } from 'drizzle-orm';
import { InjectDrizzle, Span } from '@platform';
import type { DrizzleDB, DrizzleTx } from '@platform';
import { AbstractOutboxRelay } from '@platform/outbox';
import type { PostCommitTask } from '@platform/outbox';
import { NotificationsService, NotificationPreferencesService } from '@modules/notifications';
import { renderNotification, NotificationPubSubService } from '@platform/notifications';
import type { NotificationTemplateName, NotificationTemplateVars } from '@platform/notifications';
import { notificationOutbox } from '../../../../db/schema/messaging';

type NotificationOutboxRow = {
  id: string;
  tenantId: string;
  recipientId: string;
  actorId: string | null;
  type: string;
  vars: unknown;
  resourceId: string | null;
  attempts: number;
  idempotencyKey: string | null;
};

@Injectable()
export class NotificationRelayService
  extends AbstractOutboxRelay<NotificationOutboxRow>
  implements OnModuleInit, OnModuleDestroy
{
  private unsubscribeRelayWake?: () => Promise<void>;

  constructor(
    @InjectDrizzle() db: DrizzleDB,
    private readonly notificationsService: NotificationsService,
    private readonly pubSub: NotificationPubSubService,
    private readonly prefs: NotificationPreferencesService,
  ) {
    super(db);
  }

  async onModuleInit(): Promise<void> {
    this.logger.log('Notification relay started — polling notification_outbox every 5s');
    // Subscribe to relay:wake signals published by the API after schedule().
    // This gives near-zero delivery latency; the 5s cron is the catch-all fallback.
    this.unsubscribeRelayWake = await this.pubSub.subscribeRelayWake(() => {
      this.relay().catch((err) =>
        this.logger.error({ err }, 'Relay triggered by wake signal failed'),
      );
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.unsubscribeRelayWake?.();
  }

  /** Cron runs every 5 seconds as the catch-all fallback. */
  @Cron('*/5 * * * * *', { name: 'notification-relay' })
  @Span('notification.relay')
  override async relay(): Promise<void> {
    return super.relay();
  }

  // ── AbstractOutboxRelay implementation ────────────────────────────────────

  protected async fetchBatch(tx: DrizzleTx): Promise<NotificationOutboxRow[]> {
    return tx
      .select({
        id: notificationOutbox.id,
        tenantId: notificationOutbox.tenantId,
        recipientId: notificationOutbox.recipientId,
        actorId: notificationOutbox.actorId,
        type: notificationOutbox.type,
        vars: notificationOutbox.vars,
        resourceId: notificationOutbox.resourceId,
        attempts: notificationOutbox.attempts,
        idempotencyKey: notificationOutbox.idempotencyKey,
      })
      .from(notificationOutbox)
      .where(
        and(
          eq(notificationOutbox.status, 'pending'),
          lt(notificationOutbox.attempts, this.maxAttempts),
          lte(notificationOutbox.scheduledAt, new Date()),
        ),
      )
      .orderBy(asc(notificationOutbox.scheduledAt))
      .limit(this.batchSize)
      .for('update', { skipLocked: true });
  }

  /**
   * Render template, write to in_app_notifications, and return a PostCommitTask
   * that publishes the SSE push signal to Valkey AFTER the transaction commits.
   *
   * Returns void when the notification was deduplicated (already exists in
   * in_app_notifications via source_event_id) — no SSE push needed.
   */
  protected async processRow(row: NotificationOutboxRow): Promise<PostCommitTask | void> {
    // Skip in-app delivery if user has opted out (preference check uses pool connection,
    // outside the FOR UPDATE SKIP LOCKED transaction — eventual consistency is acceptable).
    const inAppEnabled = await this.prefs.isInAppEnabled(row.tenantId, row.recipientId, row.type);
    if (!inAppEnabled) {
      this.logger.debug(
        { recipientId: row.recipientId, type: row.type },
        'In-app notification suppressed by preference',
      );
      return; // AbstractOutboxRelay marks the row as sent
    }

    const rendered = renderNotification(
      row.type as NotificationTemplateName,
      row.vars as NotificationTemplateVars[NotificationTemplateName],
    );

    const notification = await this.notificationsService.send({
      tenantId: row.tenantId,
      recipientId: row.recipientId,
      actorId: row.actorId ?? undefined,
      type: row.type,
      title: rendered.title,
      body: rendered.body,
      resourceType: rendered.resourceType,
      resourceId: row.resourceId ?? undefined,
      // Stable deduplication key: same UUID on every retry for this outbox row.
      // ON CONFLICT DO NOTHING on source_event_id makes retries safe no-ops.
      sourceEventId: row.idempotencyKey ?? row.id,
    });

    if (!notification) return; // deduplicated — no SSE event needed

    // Return a PostCommitTask: runs after the transaction commits so the SSE
    // controller never receives an event before in_app_notifications is durable.
    return () =>
      this.pubSub.notifyUser({
        notificationId: notification.id,
        recipientId: row.recipientId,
        type: row.type,
        title: rendered.title,
        body: rendered.body,
        resourceType: rendered.resourceType,
        resourceId: row.resourceId ?? undefined,
      });
  }

  protected async markSent(tx: DrizzleTx, rowId: string): Promise<void> {
    await tx
      .update(notificationOutbox)
      .set({ status: 'sent', dispatchedAt: new Date() })
      .where(eq(notificationOutbox.id, rowId));
  }

  protected async markFailed(
    tx: DrizzleTx,
    rowId: string,
    newAttempts: number,
    newStatus: 'pending' | 'failed',
    lastError: string,
  ): Promise<void> {
    await tx
      .update(notificationOutbox)
      .set({ status: newStatus, attempts: newAttempts, lastError })
      .where(eq(notificationOutbox.id, rowId));
  }
}
