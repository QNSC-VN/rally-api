/**
 * OutboxRelayService — polls outbox_events for pending domain events and
 * publishes them to SNS.
 *
 * Uses SELECT ... FOR UPDATE SKIP LOCKED inside a transaction so multiple
 * worker instances never process the same batch concurrently (safe horizontal
 * scaling). If SNS_TOPIC_ARN is not configured the event is acked without
 * publishing — useful in local dev without LocalStack.
 *
 * Delivery guarantee: at-least-once. Consumers must be idempotent on eventId.
 */
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { and, asc, lt, eq } from 'drizzle-orm';
import { InjectDrizzle, AppConfigService, Span } from '@platform';
import type { DrizzleDB } from '@platform';
import { outboxEvents } from '../../../../db/schema/messaging';

const MAX_ATTEMPTS = 5;
const BATCH_SIZE = 50;

@Injectable()
export class OutboxRelayService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxRelayService.name);
  private sns!: SNSClient;
  private topicArn: string | undefined;
  /** Prevents concurrent relay runs if a batch takes longer than the 5s cron interval. */
  private isRelaying = false;

  constructor(
    @InjectDrizzle() private readonly db: DrizzleDB,
    private readonly config: AppConfigService,
  ) {}

  onModuleInit(): void {
    const endpoint = process.env['AWS_ENDPOINT_URL'];
    this.sns = new SNSClient({
      region: this.config.get('AWS_REGION'),
      ...(endpoint ? { endpoint } : {}),
    });

    this.topicArn = this.config.get('SNS_TOPIC_ARN') ?? undefined;

    if (!this.topicArn) {
      this.logger.warn(
        'SNS_TOPIC_ARN not set — outbox events will be acked without publishing (dev mode)',
      );
    } else {
      this.logger.log(`Outbox relay → SNS topic ${this.topicArn}`);
    }
  }

  onModuleDestroy(): void {
    this.sns.destroy();
  }

  /** Runs every 5 seconds. */
  @Cron('*/5 * * * * *', { name: 'outbox-relay' })
  @Span('outbox.relay')
  async relay(): Promise<void> {
    if (this.isRelaying) {
      this.logger.warn('Previous relay run still in progress — skipping tick');
      return;
    }
    this.isRelaying = true;
    try {
      await this.db.transaction(async (tx) => {
        const batch = await tx
          .select({
            id: outboxEvents.id,
            eventType: outboxEvents.eventType,
            aggregateType: outboxEvents.aggregateType,
            aggregateId: outboxEvents.aggregateId,
            tenantId: outboxEvents.tenantId,
            payload: outboxEvents.payload,
            occurredAt: outboxEvents.occurredAt,
            attempts: outboxEvents.attempts,
          })
          .from(outboxEvents)
          .where(and(eq(outboxEvents.status, 'pending'), lt(outboxEvents.attempts, MAX_ATTEMPTS)))
          .orderBy(asc(outboxEvents.createdAt))
          .limit(BATCH_SIZE)
          .for('update', { skipLocked: true });

        if (!batch.length) return;

        this.logger.debug(`Relaying ${batch.length} outbox event(s)`);

        for (const row of batch) {
          try {
            if (this.topicArn) {
              await this.sns.send(
                new PublishCommand({
                  TopicArn: this.topicArn,
                  Message: JSON.stringify({
                    // eventId is the deduplication key for downstream consumers.
                    // Including it allows idempotent processing via ON CONFLICT DO NOTHING.
                    eventId: row.id,
                    eventType: row.eventType,
                    aggregateType: row.aggregateType,
                    aggregateId: row.aggregateId,
                    tenantId: row.tenantId,
                    payload: row.payload,
                    occurredAt: row.occurredAt,
                  }),
                  MessageAttributes: {
                    eventType: {
                      DataType: 'String',
                      StringValue: row.eventType,
                    },
                    aggregateType: {
                      DataType: 'String',
                      StringValue: row.aggregateType,
                    },
                    tenantId: {
                      DataType: 'String',
                      StringValue: row.tenantId,
                    },
                  },
                }),
              );
            }

            await tx
              .update(outboxEvents)
              .set({ status: 'published', publishedAt: new Date() })
              .where(eq(outboxEvents.id, row.id));
          } catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            const newAttempts = row.attempts + 1;
            const newStatus = newAttempts >= MAX_ATTEMPTS ? 'failed' : 'pending';

            await tx
              .update(outboxEvents)
              .set({
                status: newStatus,
                attempts: newAttempts,
                lastError: errMsg,
              })
              .where(eq(outboxEvents.id, row.id));

            this.logger.error(
              { eventId: row.id, err },
              `Relay failed for ${row.eventType} (attempt ${newAttempts}/${MAX_ATTEMPTS})`,
            );
          }
        }
      });
    } finally {
      this.isRelaying = false;
    }
  }
}
