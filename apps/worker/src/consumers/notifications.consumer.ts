/**
 * NotificationsConsumer — SQS long-poll consumer that receives notification
 * request messages and persists them as in-app notifications.
 *
 * Services that want to dispatch notifications asynchronously publish a
 * notification-request message directly to SQS_NOTIFICATIONS_URL. The
 * consumer calls NotificationsService.send() which writes to in_app_notifications.
 *
 * Message format:
 * {
 *   "tenantId": "<uuid>",
 *   "recipientId": "<uuid>",
 *   "actorId": "<uuid>",        (optional)
 *   "type": "WORK_ITEM_ASSIGNED",
 *   "title": "You were assigned to US-42",
 *   "body": "...",              (optional)
 *   "resourceType": "WORK_ITEM", (optional)
 *   "resourceId": "<uuid>",    (optional)
 *   "metadata": {},             (optional)
 *   "deduplicationId": "<uuid>" (optional — set to outbox eventId for idempotency)
 * }
 *
 * The consumer is disabled (gracefully) when SQS_NOTIFICATIONS_URL is not set.
 */
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import { AppConfigService } from '@platform';
import { NotificationsService } from '@modules/notifications';

interface NotificationMessage {
  tenantId: string;
  recipientId: string;
  actorId?: string;
  type: string;
  title: string;
  body?: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  /** Optional deduplication key — callers should set this to the outbox eventId. */
  deduplicationId?: string;
}

@Injectable()
export class NotificationsConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationsConsumer.name);
  private sqs!: SQSClient;
  private queueUrl: string | undefined;
  private isShuttingDown = false;
  /** Cancels in-flight SQS long-poll and sleep on shutdown. */
  private readonly abortController = new AbortController();

  constructor(
    private readonly config: AppConfigService,
    private readonly notificationsService: NotificationsService,
  ) {}

  onModuleInit(): void {
    const endpoint = process.env['AWS_ENDPOINT_URL'];
    this.sqs = new SQSClient({
      region: this.config.get('AWS_REGION'),
      ...(endpoint ? { endpoint } : {}),
    });

    this.queueUrl = this.config.get('SQS_NOTIFICATIONS_URL') ?? undefined;

    if (!this.queueUrl) {
      this.logger.warn('SQS_NOTIFICATIONS_URL not set — notifications consumer disabled');
      return;
    }

    this.logger.log(`Notifications consumer polling ${this.queueUrl}`);
    this.startPolling().catch((err) =>
      this.logger.error({ err }, 'Notifications consumer polling loop crashed'),
    );
  }

  onModuleDestroy(): void {
    this.isShuttingDown = true;
    this.abortController.abort();
    this.sqs.destroy();
  }

  private async startPolling(): Promise<void> {
    while (!this.isShuttingDown) {
      await this.poll();
    }
    this.logger.log('Notifications consumer stopped');
  }

  private async poll(): Promise<void> {
    try {
      const response = await this.sqs.send(
        new ReceiveMessageCommand({
          QueueUrl: this.queueUrl!,
          MaxNumberOfMessages: 10,
          WaitTimeSeconds: 20,
          VisibilityTimeout: 30,
        }),
        { abortSignal: this.abortController.signal },
      );

      for (const msg of response.Messages ?? []) {
        await this.handleMessage(msg.Body ?? '', msg.ReceiptHandle ?? '');
      }
    } catch (err) {
      if (!this.isShuttingDown) {
        this.logger.error({ err }, 'SQS receive error — backing off 5s');
        await this.sleep(5_000);
      }
    }
  }

  private async handleMessage(body: string, receiptHandle: string): Promise<void> {
    let msg: NotificationMessage;

    try {
      msg = JSON.parse(body) as NotificationMessage;
    } catch {
      this.logger.warn({ body }, 'Unparseable notification message — discarding');
      await this.deleteMessage(receiptHandle);
      return;
    }

    try {
      await this.notificationsService.send({
        tenantId: msg.tenantId,
        recipientId: msg.recipientId,
        actorId: msg.actorId,
        type: msg.type,
        title: msg.title,
        body: msg.body,
        resourceType: msg.resourceType,
        resourceId: msg.resourceId,
        metadata: msg.metadata ?? {},
        // Deduplication: if the same notification is delivered twice,
        // the unique index on source_event_id silently skips the second insert.
        sourceEventId: msg.deduplicationId,
      });
      await this.deleteMessage(receiptHandle);
    } catch (err) {
      // Don't delete — SQS will redeliver after visibility timeout
      this.logger.error(
        { err, type: msg.type },
        'Failed to send notification — message will be retried',
      );
    }
  }

  private async deleteMessage(receiptHandle: string): Promise<void> {
    await this.sqs.send(
      new DeleteMessageCommand({
        QueueUrl: this.queueUrl!,
        ReceiptHandle: receiptHandle,
      }),
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      if (this.abortController.signal.aborted) return resolve();
      const timer = setTimeout(resolve, ms);
      this.abortController.signal.addEventListener(
        'abort',
        () => {
          clearTimeout(timer);
          resolve();
        },
        { once: true },
      );
    });
  }
}
