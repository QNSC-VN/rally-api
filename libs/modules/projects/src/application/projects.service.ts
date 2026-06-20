import { Inject, Injectable, Logger } from '@nestjs/common';
import { uuidv7 } from 'uuidv7';
import { NotFoundException, ConflictException, PreconditionFailedException } from '@platform';
import type { JwtPayload, CursorPayload, PagedResult } from '@platform';
import { IProjectRepository, PROJECT_REPOSITORY } from '../domain/ports/project.repository';
import {
  IWorkflowStatusRepository,
  WORKFLOW_STATUS_REPOSITORY,
} from '../domain/ports/workflow-status.repository';
import type {
  Project,
  WorkflowStatus,
  WorkflowTransition,
  UpdateProjectInput,
} from '../domain/project.types';

/** Default workflow statuses seeded for every new project (mirrors Rally defaults). */
const DEFAULT_STATUSES: Array<{
  name: string;
  category: 'to_do' | 'in_progress' | 'done';
  color: string;
  position: number;
  isDefault: boolean;
}> = [
  { name: 'Defined', category: 'to_do', color: '#6B7280', position: 0, isDefault: true },
  { name: 'In Progress', category: 'in_progress', color: '#3B82F6', position: 1, isDefault: false },
  { name: 'Completed', category: 'done', color: '#10B981', position: 2, isDefault: false },
  { name: 'Accepted', category: 'done', color: '#059669', position: 3, isDefault: false },
];

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    @Inject(PROJECT_REPOSITORY) private readonly projectRepo: IProjectRepository,
    @Inject(WORKFLOW_STATUS_REPOSITORY) private readonly statusRepo: IWorkflowStatusRepository,
  ) {}

  // ── Projects ──────────────────────────────────────────────────────────────

  async listProjects(
    actor: JwtPayload,
    workspaceId: string,
    args: { limit: number; cursor: CursorPayload | null },
  ): Promise<PagedResult<Project>> {
    return this.projectRepo.listByWorkspace(workspaceId, actor.tenantId, args);
  }

  async createProject(
    actor: JwtPayload,
    workspaceId: string,
    key: string,
    name: string,
    description?: string,
    leadId?: string,
  ): Promise<Project> {
    const normalizedKey = key.toUpperCase().trim();

    const existing = await this.projectRepo.findByKey(actor.tenantId, normalizedKey);
    if (existing) {
      throw new ConflictException(
        'PROJECT_KEY_TAKEN',
        `Project key "${normalizedKey}" is already taken`,
      );
    }

    const projectId = uuidv7();
    const project = await this.projectRepo.create({
      id: projectId,
      tenantId: actor.tenantId,
      workspaceId,
      key: normalizedKey,
      name,
      description,
      leadId,
    });

    // Seed default workflow statuses + counter in parallel
    await Promise.all([
      this.projectRepo.initCounter(projectId, actor.tenantId),
      ...DEFAULT_STATUSES.map((s) =>
        this.statusRepo.create({
          id: uuidv7(),
          tenantId: actor.tenantId,
          projectId,
          name: s.name,
          category: s.category,
          color: s.color,
          position: s.position,
          isDefault: s.isDefault,
        }),
      ),
    ]);

    this.logger.log({ projectId, key: normalizedKey, userId: actor.sub }, 'Project created');
    return project;
  }

  async getProject(tenantId: string, projectId: string): Promise<Project> {
    const project = await this.projectRepo.findById(projectId);
    if (!project || project.deletedAt || project.tenantId !== tenantId) {
      throw new NotFoundException('PROJECT_NOT_FOUND', 'Project not found');
    }
    return project;
  }

  async updateProject(
    tenantId: string,
    projectId: string,
    input: UpdateProjectInput,
  ): Promise<Project> {
    await this.getProject(tenantId, projectId);
    return this.projectRepo.update(projectId, input);
  }

  async deleteProject(tenantId: string, projectId: string): Promise<void> {
    await this.getProject(tenantId, projectId);
    await this.projectRepo.softDelete(projectId);
    this.logger.log({ projectId }, 'Project soft-deleted');
  }

  // ── Workflow statuses ─────────────────────────────────────────────────────

  async listStatuses(tenantId: string, projectId: string): Promise<WorkflowStatus[]> {
    await this.getProject(tenantId, projectId);
    return this.statusRepo.listByProject(projectId);
  }

  async listTransitions(tenantId: string, projectId: string): Promise<WorkflowTransition[]> {
    await this.getProject(tenantId, projectId);
    return this.statusRepo.listTransitions(projectId);
  }

  /** Used by work-items to validate a status transition is permitted. */
  async assertTransitionAllowed(
    projectId: string,
    fromStatusId: string,
    toStatusId: string,
  ): Promise<void> {
    const allowed = await this.statusRepo.canTransition(projectId, fromStatusId, toStatusId);
    if (!allowed) {
      throw new PreconditionFailedException(
        'WORKFLOW_TRANSITION_NOT_ALLOWED',
        'This status transition is not permitted',
      );
    }
  }
}
