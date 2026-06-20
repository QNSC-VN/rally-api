import { Inject, Injectable, Logger } from '@nestjs/common';
import { uuidv7 } from 'uuidv7';
import { NotFoundException, ConflictException, PreconditionFailedException } from '@platform';
import type { JwtPayload, CursorPayload, PagedResult } from '@platform';
import { ProjectsService } from '@modules/projects';
import { ISprintRepository, SPRINT_REPOSITORY } from '../domain/ports/sprint.repository';
import type { Sprint, UpdateSprintInput } from '../domain/sprint.types';

@Injectable()
export class PlanningService {
  private readonly logger = new Logger(PlanningService.name);

  constructor(
    @Inject(SPRINT_REPOSITORY) private readonly sprintRepo: ISprintRepository,
    private readonly projectsService: ProjectsService,
  ) {}

  // ── List ──────────────────────────────────────────────────────────────────

  async listSprints(
    actor: JwtPayload,
    projectId: string,
    args: { limit: number; cursor: CursorPayload | null },
  ): Promise<PagedResult<Sprint>> {
    await this.projectsService.getProject(actor.tenantId, projectId);
    return this.sprintRepo.listByProject(projectId, actor.tenantId, args);
  }

  // ── Create ────────────────────────────────────────────────────────────────

  async createSprint(
    actor: JwtPayload,
    projectId: string,
    name: string,
    opts: { goal?: string; startDate?: string; endDate?: string } = {},
  ): Promise<Sprint> {
    await this.projectsService.getProject(actor.tenantId, projectId);

    const sprint = await this.sprintRepo.create({
      id: uuidv7(),
      tenantId: actor.tenantId,
      projectId,
      name,
      goal: opts.goal,
      startDate: opts.startDate,
      endDate: opts.endDate,
    });

    this.logger.log({ sprintId: sprint.id, projectId, userId: actor.sub }, 'Sprint created');
    return sprint;
  }

  // ── Get ───────────────────────────────────────────────────────────────────

  async getSprint(tenantId: string, id: string): Promise<Sprint> {
    const sprint = await this.sprintRepo.findById(id);
    if (!sprint || sprint.tenantId !== tenantId) {
      throw new NotFoundException('SPRINT_NOT_FOUND', 'Sprint not found');
    }
    return sprint;
  }

  // ── Update ────────────────────────────────────────────────────────────────

  async updateSprint(tenantId: string, id: string, input: UpdateSprintInput): Promise<Sprint> {
    await this.getSprint(tenantId, id);
    return this.sprintRepo.update(id, input);
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async deleteSprint(tenantId: string, id: string): Promise<void> {
    const sprint = await this.getSprint(tenantId, id);
    if (sprint.status !== 'planned') {
      throw new PreconditionFailedException(
        'SPRINT_ALREADY_ACTIVE',
        'Only planned sprints can be deleted',
      );
    }
    await this.sprintRepo.delete(id);
    this.logger.log({ sprintId: id }, 'Sprint deleted');
  }

  // ── Start ─────────────────────────────────────────────────────────────────

  async startSprint(tenantId: string, id: string): Promise<Sprint> {
    const sprint = await this.getSprint(tenantId, id);

    if (sprint.status !== 'planned') {
      throw new PreconditionFailedException(
        'SPRINT_ALREADY_ACTIVE',
        'Sprint is not in planned state',
      );
    }

    const active = await this.sprintRepo.findActive(sprint.projectId);
    if (active) {
      throw new ConflictException(
        'SPRINT_ALREADY_ACTIVE',
        'Another sprint is already active for this project',
      );
    }

    const updated = await this.sprintRepo.update(id, { status: 'active' });
    this.logger.log({ sprintId: id }, 'Sprint started');
    return updated;
  }

  // ── Complete ──────────────────────────────────────────────────────────────

  async completeSprint(tenantId: string, id: string): Promise<Sprint> {
    const sprint = await this.getSprint(tenantId, id);

    if (sprint.status !== 'active') {
      throw new PreconditionFailedException(
        'SPRINT_ALREADY_ACTIVE',
        'Only active sprints can be completed',
      );
    }

    const updated = await this.sprintRepo.update(id, {
      status: 'completed',
      completedAt: new Date(),
    });
    this.logger.log({ sprintId: id }, 'Sprint completed');
    return updated;
  }
}
