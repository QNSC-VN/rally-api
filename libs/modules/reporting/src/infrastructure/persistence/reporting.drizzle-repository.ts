import { Injectable } from '@nestjs/common';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { InjectDrizzle } from '@platform';
import type { DrizzleDB } from '@platform';
import { sprintDailySnapshots, sprints } from '../../../../../../db/schema/work';
import type { SprintSnapshot, VelocityPoint } from '../../domain/reporting.types';
import { IReportingRepository } from '../../domain/ports/reporting.repository';
import { uuidv7 } from 'uuidv7';

@Injectable()
export class ReportingDrizzleRepository implements IReportingRepository {
  constructor(@InjectDrizzle() private readonly db: DrizzleDB) {}

  async getSprintSnapshots(tenantId: string, sprintId: string): Promise<SprintSnapshot[]> {
    const rows = await this.db
      .select()
      .from(sprintDailySnapshots)
      .where(
        and(
          eq(sprintDailySnapshots.tenantId, tenantId),
          eq(sprintDailySnapshots.sprintId, sprintId),
        ),
      )
      .orderBy(asc(sprintDailySnapshots.snapshotDate));
    return rows as SprintSnapshot[];
  }

  async getVelocity(
    tenantId: string,
    projectId: string,
    lastNSprints: number,
  ): Promise<VelocityPoint[]> {
    // Get last N completed sprints for the project
    const completedSprints = await this.db
      .select()
      .from(sprints)
      .where(
        and(
          eq(sprints.tenantId, tenantId),
          eq(sprints.projectId, projectId),
          eq(sprints.status, 'completed'),
        ),
      )
      .orderBy(desc(sprints.completedAt))
      .limit(lastNSprints);

    if (!completedSprints.length) return [];

    // Get the last snapshot per sprint (represents final state at completion)
    const result: VelocityPoint[] = [];
    for (const sprint of completedSprints) {
      const snapshots = await this.db
        .select()
        .from(sprintDailySnapshots)
        .where(
          and(
            eq(sprintDailySnapshots.tenantId, tenantId),
            eq(sprintDailySnapshots.sprintId, sprint.id),
          ),
        )
        .orderBy(desc(sprintDailySnapshots.snapshotDate))
        .limit(1);

      const last = snapshots[0];
      result.push({
        sprintId: sprint.id,
        sprintName: sprint.name,
        completedPoints: last?.completedPoints ?? 0,
        completedItems: last?.completedItems ?? 0,
      });
    }

    // Return in chronological order
    return result.reverse();
  }

  async upsertSnapshot(snapshot: Omit<SprintSnapshot, 'id' | 'createdAt'>): Promise<void> {
    await this.db
      .insert(sprintDailySnapshots)
      .values({
        id: uuidv7(),
        tenantId: snapshot.tenantId,
        sprintId: snapshot.sprintId,
        snapshotDate: snapshot.snapshotDate,
        totalPoints: snapshot.totalPoints,
        completedPoints: snapshot.completedPoints,
        remainingPoints: snapshot.remainingPoints,
        totalItems: snapshot.totalItems,
        completedItems: snapshot.completedItems,
      })
      .onConflictDoUpdate({
        target: [sprintDailySnapshots.sprintId, sprintDailySnapshots.snapshotDate],
        set: {
          totalPoints: sql`excluded.total_points`,
          completedPoints: sql`excluded.completed_points`,
          remainingPoints: sql`excluded.remaining_points`,
          totalItems: sql`excluded.total_items`,
          completedItems: sql`excluded.completed_items`,
        },
      });
  }
}
