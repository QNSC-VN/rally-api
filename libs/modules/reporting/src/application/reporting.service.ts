import { Inject, Injectable } from '@nestjs/common';
import type { JwtPayload } from '@platform';
import { IReportingRepository, REPORTING_REPOSITORY } from '../domain/ports/reporting.repository';
import type {
  SprintBurndownReport,
  SprintSnapshot,
  VelocityReport,
} from '../domain/reporting.types';

@Injectable()
export class ReportingService {
  constructor(@Inject(REPORTING_REPOSITORY) private readonly reportingRepo: IReportingRepository) {}

  async getSprintBurndown(actor: JwtPayload, sprintId: string): Promise<SprintBurndownReport> {
    const snapshots = await this.reportingRepo.getSprintSnapshots(actor.tenantId, sprintId);

    return {
      sprintId,
      points: snapshots.map((s) => ({
        date: s.snapshotDate,
        remainingPoints: s.remainingPoints,
        completedPoints: s.completedPoints,
        remainingItems: s.totalItems - s.completedItems,
        completedItems: s.completedItems,
      })),
    };
  }

  async getVelocity(
    actor: JwtPayload,
    projectId: string,
    lastNSprints = 6,
  ): Promise<VelocityReport> {
    const sprints = await this.reportingRepo.getVelocity(actor.tenantId, projectId, lastNSprints);
    return { projectId, sprints };
  }

  /** Internal use — called by SnapshotCronService to materialise daily burndown data. */
  async upsertSnapshot(snapshot: Omit<SprintSnapshot, 'id' | 'createdAt'>): Promise<void> {
    return this.reportingRepo.upsertSnapshot(snapshot);
  }
}
