import { Injectable } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { InjectDrizzle } from '@platform';
import type { DrizzleDB } from '@platform';
import { workflowStatuses, workflowTransitions } from '../../../../../../db/schema/work';
import type {
  WorkflowStatus,
  WorkflowTransition,
  CreateWorkflowStatusInput,
  CreateWorkflowTransitionInput,
} from '../../domain/project.types';
import { IWorkflowStatusRepository } from '../../domain/ports/workflow-status.repository';

@Injectable()
export class WorkflowStatusDrizzleRepository implements IWorkflowStatusRepository {
  constructor(@InjectDrizzle() private readonly db: DrizzleDB) {}

  async findById(id: string): Promise<WorkflowStatus | null> {
    const rows = await this.db
      .select()
      .from(workflowStatuses)
      .where(eq(workflowStatuses.id, id))
      .limit(1);
    return (rows[0] as WorkflowStatus | undefined) ?? null;
  }

  async listByProject(projectId: string): Promise<WorkflowStatus[]> {
    const rows = await this.db
      .select()
      .from(workflowStatuses)
      .where(eq(workflowStatuses.projectId, projectId))
      .orderBy(asc(workflowStatuses.position));
    return rows as WorkflowStatus[];
  }

  async create(input: CreateWorkflowStatusInput): Promise<WorkflowStatus> {
    const rows = await this.db
      .insert(workflowStatuses)
      .values({
        id: input.id,
        tenantId: input.tenantId,
        projectId: input.projectId,
        name: input.name,
        category: input.category,
        color: input.color,
        position: input.position,
        isDefault: input.isDefault ?? false,
      })
      .returning();
    return rows[0] as WorkflowStatus;
  }

  async updatePositions(projectId: string, orderedIds: string[]): Promise<void> {
    await this.db.transaction(async (tx) => {
      for (let i = 0; i < orderedIds.length; i++) {
        await tx
          .update(workflowStatuses)
          .set({ position: i })
          .where(
            and(eq(workflowStatuses.id, orderedIds[i]!), eq(workflowStatuses.projectId, projectId)),
          );
      }
    });
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(workflowStatuses).where(eq(workflowStatuses.id, id));
  }

  async findDefault(projectId: string): Promise<WorkflowStatus | null> {
    const rows = await this.db
      .select()
      .from(workflowStatuses)
      .where(and(eq(workflowStatuses.projectId, projectId), eq(workflowStatuses.isDefault, true)))
      .limit(1);
    return (rows[0] as WorkflowStatus | undefined) ?? null;
  }

  async canTransition(
    projectId: string,
    fromStatusId: string,
    toStatusId: string,
  ): Promise<boolean> {
    // No transitions defined = all transitions allowed (open workflow)
    const allTransitions = await this.db
      .select()
      .from(workflowTransitions)
      .where(eq(workflowTransitions.projectId, projectId));

    if (allTransitions.length === 0) return true;

    const match = allTransitions.find(
      (t) =>
        t.toStatusId === toStatusId && (t.fromStatusId === null || t.fromStatusId === fromStatusId),
    );
    return match !== undefined;
  }

  async listTransitions(projectId: string): Promise<WorkflowTransition[]> {
    const rows = await this.db
      .select()
      .from(workflowTransitions)
      .where(eq(workflowTransitions.projectId, projectId));
    return rows as WorkflowTransition[];
  }

  async findTransitionById(id: string): Promise<WorkflowTransition | null> {
    const rows = await this.db
      .select()
      .from(workflowTransitions)
      .where(eq(workflowTransitions.id, id))
      .limit(1);
    return (rows[0] as WorkflowTransition | undefined) ?? null;
  }

  async createTransition(input: CreateWorkflowTransitionInput): Promise<WorkflowTransition> {
    const rows = await this.db
      .insert(workflowTransitions)
      .values({
        id: input.id,
        tenantId: input.tenantId,
        projectId: input.projectId,
        fromStatusId: input.fromStatusId ?? null,
        toStatusId: input.toStatusId,
        name: input.name ?? null,
      })
      .returning();
    return rows[0] as WorkflowTransition;
  }

  async deleteTransition(id: string): Promise<void> {
    await this.db.delete(workflowTransitions).where(eq(workflowTransitions.id, id));
  }
}
