import { Injectable } from '@nestjs/common';
import { and, eq, isNull, lt } from 'drizzle-orm';
import { InjectDrizzle, buildPageResult } from '@platform';
import type { DrizzleDB, CursorPayload, PagedResult } from '@platform';
import { workItems, workItemLabels, labels } from '../../../../../../db/schema/work';
import type {
  WorkItem,
  CreateWorkItemInput,
  UpdateWorkItemInput,
  WorkItemFilters,
} from '../../domain/work-item.types';
import { IWorkItemRepository } from '../../domain/ports/work-item.repository';

@Injectable()
export class WorkItemDrizzleRepository implements IWorkItemRepository {
  constructor(@InjectDrizzle() private readonly db: DrizzleDB) {}

  async findById(id: string): Promise<WorkItem | null> {
    const rows = await this.db
      .select()
      .from(workItems)
      .where(and(eq(workItems.id, id), isNull(workItems.deletedAt)))
      .limit(1);
    return (rows[0] as WorkItem | undefined) ?? null;
  }

  async listByProject(
    projectId: string,
    tenantId: string,
    filters: WorkItemFilters,
    { limit, cursor }: { limit: number; cursor: CursorPayload | null },
  ): Promise<PagedResult<WorkItem>> {
    const conditions = [
      eq(workItems.projectId, projectId),
      eq(workItems.tenantId, tenantId),
      isNull(workItems.deletedAt),
    ];

    if (filters.type) conditions.push(eq(workItems.type, filters.type));
    if (filters.statusId) conditions.push(eq(workItems.statusId, filters.statusId));
    if (filters.assigneeId) conditions.push(eq(workItems.assigneeId, filters.assigneeId));
    if (filters.iterationId) conditions.push(eq(workItems.iterationId, filters.iterationId));
    if (filters.releaseId) conditions.push(eq(workItems.releaseId, filters.releaseId));

    if (cursor) {
      conditions.push(lt(workItems.createdAt, new Date(cursor.k[0] as string)));
    }

    const rows = await this.db
      .select()
      .from(workItems)
      .where(and(...conditions))
      .orderBy(workItems.createdAt)
      .limit(limit + 1);

    return buildPageResult(rows as WorkItem[], limit, (w) => [w.createdAt.toISOString()]);
  }

  async create(input: CreateWorkItemInput): Promise<WorkItem> {
    const rows = await this.db
      .insert(workItems)
      .values({
        id: input.id,
        tenantId: input.tenantId,
        projectId: input.projectId,
        itemKey: input.itemKey,
        type: input.type,
        title: input.title,
        description: input.description,
        statusId: input.statusId,
        priority: input.priority,
        assigneeId: input.assigneeId,
        reporterId: input.reporterId,
        parentId: input.parentId,
        storyPoints: input.storyPoints,
        acceptanceCriteria: input.acceptanceCriteria,
        rank: input.rank,
        createdBy: input.createdBy,
      })
      .returning();
    return rows[0] as WorkItem;
  }

  async update(id: string, input: UpdateWorkItemInput): Promise<WorkItem> {
    const rows = await this.db
      .update(workItems)
      .set({
        ...(input.title !== undefined && { title: input.title }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.statusId !== undefined && { statusId: input.statusId }),
        ...(input.priority !== undefined && { priority: input.priority }),
        ...(input.assigneeId !== undefined && { assigneeId: input.assigneeId }),
        ...(input.reporterId !== undefined && { reporterId: input.reporterId }),
        ...(input.parentId !== undefined && { parentId: input.parentId }),
        ...(input.iterationId !== undefined && { iterationId: input.iterationId }),
        ...(input.releaseId !== undefined && { releaseId: input.releaseId }),
        ...(input.storyPoints !== undefined && { storyPoints: input.storyPoints }),
        ...(input.acceptanceCriteria !== undefined && {
          acceptanceCriteria: input.acceptanceCriteria,
        }),
        ...(input.isBlocked !== undefined && { isBlocked: input.isBlocked }),
        ...(input.blockedReason !== undefined && { blockedReason: input.blockedReason }),
        ...(input.rank !== undefined && { rank: input.rank }),
        ...(input.customFields !== undefined && { customFields: input.customFields }),
        updatedAt: new Date(),
      })
      .where(eq(workItems.id, id))
      .returning();
    return rows[0] as WorkItem;
  }

  async softDelete(id: string): Promise<void> {
    await this.db
      .update(workItems)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(workItems.id, id));
  }

  async reorderItems(items: Array<{ id: string; rank: string }>): Promise<void> {
    if (items.length === 0) return;
    // Execute each rank update; SQLite-style batch not available; use Promise.all for PG
    await Promise.all(
      items.map(({ id, rank }) =>
        this.db.update(workItems).set({ rank, updatedAt: new Date() }).where(eq(workItems.id, id)),
      ),
    );
  }

  async addLabel(workItemId: string, labelId: string): Promise<void> {
    await this.db.insert(workItemLabels).values({ workItemId, labelId }).onConflictDoNothing();
  }

  async removeLabel(workItemId: string, labelId: string): Promise<void> {
    await this.db
      .delete(workItemLabels)
      .where(and(eq(workItemLabels.workItemId, workItemId), eq(workItemLabels.labelId, labelId)));
  }

  async listLabels(
    workItemId: string,
  ): Promise<Array<{ id: string; name: string; color: string }>> {
    const rows = await this.db
      .select({ id: labels.id, name: labels.name, color: labels.color })
      .from(workItemLabels)
      .innerJoin(labels, eq(workItemLabels.labelId, labels.id))
      .where(eq(workItemLabels.workItemId, workItemId))
      .orderBy(labels.name);
    return rows;
  }
}
