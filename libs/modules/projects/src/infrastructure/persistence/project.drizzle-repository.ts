import { Injectable } from '@nestjs/common';
import { and, eq, isNull, lt, sql } from 'drizzle-orm';
import { InjectDrizzle } from '@platform';
import type { DrizzleDB } from '@platform';
import { projects, projectCounters } from '../../../../../../db/schema/work';
import type {
  Project,
  CreateProjectInput,
  UpdateProjectInput,
  ProjectPage,
} from '../../domain/project.types';
import { IProjectRepository } from '../../domain/ports/project.repository';

@Injectable()
export class ProjectDrizzleRepository implements IProjectRepository {
  constructor(@InjectDrizzle() private readonly db: DrizzleDB) {}

  async findById(id: string): Promise<Project | null> {
    const rows = await this.db.select().from(projects).where(eq(projects.id, id)).limit(1);
    return (rows[0] as Project | undefined) ?? null;
  }

  async findByKey(tenantId: string, key: string): Promise<Project | null> {
    const rows = await this.db
      .select()
      .from(projects)
      .where(
        and(eq(projects.tenantId, tenantId), eq(projects.key, key), isNull(projects.deletedAt)),
      )
      .limit(1);
    return (rows[0] as Project | undefined) ?? null;
  }

  async listByWorkspace(
    workspaceId: string,
    tenantId: string,
    limit: number,
    cursor?: string,
  ): Promise<ProjectPage> {
    const conditions = [
      eq(projects.workspaceId, workspaceId),
      eq(projects.tenantId, tenantId),
      isNull(projects.deletedAt),
    ];

    if (cursor) {
      const cursorDate = new Date(Buffer.from(cursor, 'base64url').toString());
      conditions.push(lt(projects.createdAt, cursorDate));
    }

    const rows = await this.db
      .select()
      .from(projects)
      .where(and(...conditions))
      .orderBy(projects.createdAt)
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore
      ? Buffer.from(items[items.length - 1]!.createdAt.toISOString()).toString('base64url')
      : null;

    return { items: items as Project[], nextCursor };
  }

  async create(input: CreateProjectInput): Promise<Project> {
    const rows = await this.db
      .insert(projects)
      .values({
        id: input.id,
        tenantId: input.tenantId,
        workspaceId: input.workspaceId,
        key: input.key,
        name: input.name,
        description: input.description,
        leadId: input.leadId,
      })
      .returning();
    return rows[0] as Project;
  }

  async update(id: string, input: UpdateProjectInput): Promise<Project> {
    const rows = await this.db
      .update(projects)
      .set({
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.leadId !== undefined && { leadId: input.leadId }),
        ...(input.status !== undefined && { status: input.status }),
        ...(input.settings !== undefined && { settings: input.settings }),
        updatedAt: new Date(),
      })
      .where(eq(projects.id, id))
      .returning();
    return rows[0] as Project;
  }

  async softDelete(id: string): Promise<void> {
    await this.db
      .update(projects)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(projects.id, id));
  }

  async initCounter(projectId: string, tenantId: string): Promise<void> {
    await this.db
      .insert(projectCounters)
      .values({ projectId, tenantId, lastItemNumber: 0 })
      .onConflictDoNothing();
  }

  async incrementCounter(projectId: string): Promise<number> {
    const rows = await this.db
      .update(projectCounters)
      .set({
        lastItemNumber: sql`${projectCounters.lastItemNumber} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(projectCounters.projectId, projectId))
      .returning({ lastItemNumber: projectCounters.lastItemNumber });
    return rows[0]!.lastItemNumber;
  }
}
