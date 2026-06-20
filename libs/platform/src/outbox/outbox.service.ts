import { Injectable, Logger } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { generateId } from '@shared-kernel/ids/uuid';
import type { DomainEvent } from '@shared-kernel/domain/domain-event';
import { InjectDrizzle } from '../database/drizzle.provider';
import type { DrizzleTx } from '../database/drizzle.provider';

/**
 * Outbox writer — inserts domain events into outbox_events in the SAME transaction
 * as the aggregate state change. The outbox relay (worker) polls and publishes to SNS.
 *
 * This is the transactional outbox pattern: no dual-write, no lost events.
 */
@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);

  // Inject DB for type reference — actual writes always use the tx passed from UoW
  constructor(@InjectDrizzle() private readonly _db: unknown) {}

  /**
   * Write events to outbox_events within the provided transaction.
   * Called by application layer after aggregate.pullEvents().
   */
  async writeEvents(events: DomainEvent[], tx: DrizzleTx): Promise<void> {
    if (events.length === 0) return;

    const rows = events.map((e) => ({
      id: generateId(),
      eventId: e.eventId,
      eventType: e.eventType,
      version: e.version,
      aggregateType: e.aggregateType,
      aggregateId: e.aggregateId,
      tenantId: e.tenantId,
      payload: e.payload,
      occurredAt: e.occurredAt,
      status: 'pending' as const,
      attempts: 0,
      createdAt: new Date(),
    }));

    // Raw insert — schema reference deferred until db/schema is generated
    await tx.execute(
      sql`
        INSERT INTO messaging.outbox_events
          (id, event_id, event_type, version, aggregate_type, aggregate_id, tenant_id,
           payload, occurred_at, status, attempts, created_at)
        VALUES
          ${sql.join(
            rows.map(
              (r) =>
                sql`(${r.id}, ${r.eventId}, ${r.eventType}, ${r.version},
                    ${r.aggregateType}, ${r.aggregateId}, ${r.tenantId},
                    ${JSON.stringify(r.payload)}::jsonb, ${r.occurredAt},
                    ${r.status}, ${r.attempts}, ${r.createdAt})`,
            ),
            sql`, `,
          )}
      `,
    );

    this.logger.debug(`Wrote ${rows.length} outbox event(s): ${events.map((e) => e.eventType).join(', ')}`);
  }
}
