import { Inject, Injectable, Logger } from '@nestjs/common';
import { uuidv7 } from 'uuidv7';
import { NotFoundException, PreconditionFailedException, Span } from '@platform';
import type { JwtPayload, CursorPayload, PagedResult } from '@platform';
import { ProjectsService } from '@modules/projects';
import { IWorkItemRepository, WORK_ITEM_REPOSITORY } from '../domain/ports/work-item.repository';
import type {
  WorkItem,
  WorkItemType,
  WorkItemPriority,
  WorkItemFilters,
  UpdateWorkItemInput,
} from '../domain/work-item.types';

@Injectable()
export class WorkItemsService {
  private readonly logger = new Logger(WorkItemsService.name);

  constructor(
    @Inject(WORK_ITEM_REPOSITORY) private readonly workItemRepo: IWorkItemRepository,
    private readonly projectsService: ProjectsService,
  ) {}

  // ── List ──────────────────────────────────────────────────────────────────

  async listWorkItems(
    actor: JwtPayload,
    projectId: string,
    filters: WorkItemFilters,
    args: { limit: number; cursor: CursorPayload | null },
  ): Promise<PagedResult<WorkItem>> {
    await this.projectsService.getProject(actor.tenantId, projectId);
    return this.workItemRepo.listByProject(projectId, actor.tenantId, filters, args);
  }

  // ── Create ────────────────────────────────────────────────────────────────

  @Span('work-items.create')
  async createWorkItem(
    actor: JwtPayload,
    projectId: string,
    type: WorkItemType,
    title: string,
    opts: {
      description?: string;
      statusId?: string;
      priority?: WorkItemPriority;
      assigneeId?: string;
      reporterId?: string;
      parentId?: string;
      storyPoints?: number;
      acceptanceCriteria?: string;
    } = {},
  ): Promise<WorkItem> {
    await this.projectsService.getProject(actor.tenantId, projectId);

    // Resolve status — validate provided statusId or fall back to project default
    const statuses = await this.projectsService.listStatuses(actor.tenantId, projectId);
    let statusId: string;
    if (opts.statusId) {
      const found = statuses.find((s) => s.id === opts.statusId);
      if (!found) {
        throw new NotFoundException(
          'WORKFLOW_STATUS_NOT_FOUND',
          'Status not found for this project',
        );
      }
      statusId = opts.statusId;
    } else {
      const defaultStatus = statuses.find((s) => s.isDefault) ?? statuses[0];
      if (!defaultStatus) {
        throw new PreconditionFailedException(
          'WORKFLOW_STATUS_NOT_FOUND',
          'No workflow status configured for this project',
        );
      }
      statusId = defaultStatus.id;
    }

    const itemKey = await this.projectsService.generateItemKey(actor.tenantId, projectId);

    const workItem = await this.workItemRepo.create({
      id: uuidv7(),
      tenantId: actor.tenantId,
      projectId,
      itemKey,
      type,
      title,
      description: opts.description,
      statusId,
      priority: opts.priority ?? 'medium',
      assigneeId: opts.assigneeId,
      reporterId: opts.reporterId,
      parentId: opts.parentId,
      storyPoints: opts.storyPoints,
      acceptanceCriteria: opts.acceptanceCriteria,
      rank: '',
      createdBy: actor.sub,
    });

    this.logger.log(
      { workItemId: workItem.id, itemKey, projectId, type, userId: actor.sub },
      'Work item created',
    );
    return workItem;
  }

  // ── Get ───────────────────────────────────────────────────────────────────

  async getWorkItem(tenantId: string, id: string): Promise<WorkItem> {
    const item = await this.workItemRepo.findById(id);
    if (!item || item.deletedAt || item.tenantId !== tenantId) {
      throw new NotFoundException('WORK_ITEM_NOT_FOUND', 'Work item not found');
    }
    return item;
  }

  // ── Update ────────────────────────────────────────────────────────────────

  @Span('work-items.update')
  async updateWorkItem(
    tenantId: string,
    id: string,
    input: UpdateWorkItemInput,
  ): Promise<WorkItem> {
    const item = await this.getWorkItem(tenantId, id);

    // Validate status transition if statusId is changing
    if (input.statusId && input.statusId !== item.statusId) {
      await this.projectsService.assertTransitionAllowed(
        item.projectId,
        item.statusId,
        input.statusId,
      );
    }

    return this.workItemRepo.update(item.id, input);
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  @Span('work-items.delete')
  async deleteWorkItem(tenantId: string, id: string): Promise<void> {
    await this.getWorkItem(tenantId, id);
    await this.workItemRepo.softDelete(id);
    this.logger.log({ workItemId: id }, 'Work item soft-deleted');
  }

  // ── Move (board transition) ───────────────────────────────────────────────

  @Span('work-items.move')
  async moveWorkItem(tenantId: string, id: string, toStatusId: string): Promise<WorkItem> {
    const item = await this.getWorkItem(tenantId, id);
    await this.projectsService.assertTransitionAllowed(item.projectId, item.statusId, toStatusId);
    return this.workItemRepo.update(item.id, { statusId: toStatusId });
  }

  // ── Reorder (backlog drag-and-drop) ───────────────────────────────────────

  async reorderWorkItems(
    tenantId: string,
    items: Array<{ id: string; rank: string }>,
  ): Promise<void> {
    if (items.length === 0) return;
    // Validate all items belong to this tenant before updating
    const existing = await Promise.all(items.map(({ id }) => this.getWorkItem(tenantId, id)));
    if (existing.some((w) => w.tenantId !== tenantId)) {
      throw new Error('Tenant mismatch');
    }
    await this.workItemRepo.reorderItems(items);
  }

  // ── Labels ────────────────────────────────────────────────────────────────

  async getWorkItemLabels(
    tenantId: string,
    id: string,
  ): Promise<Array<{ id: string; name: string; color: string }>> {
    await this.getWorkItem(tenantId, id);
    return this.workItemRepo.listLabels(id);
  }

  async addLabelToWorkItem(tenantId: string, id: string, labelId: string): Promise<void> {
    await this.getWorkItem(tenantId, id);
    await this.workItemRepo.addLabel(id, labelId);
  }

  async removeLabelFromWorkItem(tenantId: string, id: string, labelId: string): Promise<void> {
    await this.getWorkItem(tenantId, id);
    await this.workItemRepo.removeLabel(id, labelId);
  }
}
