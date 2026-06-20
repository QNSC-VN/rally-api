import { Injectable } from '@nestjs/common';
import { and, eq, isNull, lt } from 'drizzle-orm';
import { InjectDrizzle } from '@platform';
import type { DrizzleDB } from '@platform';
import { workspaces } from '../../../../../../db/schema/tenancy';
import type {
  Workspace,
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  WorkspacePage,
} from '../../domain/tenancy.types';
import { IWorkspaceRepository } from '../../domain/ports/workspace.repository';

@Injectable()
export class WorkspaceDrizzleRepository implements IWorkspaceRepository {
  constructor(@InjectDrizzle() private readonly db: DrizzleDB) {}

  async findById(id: string): Promise<Workspace | null> {
    const rows = await this.db.select().from(workspaces).where(eq(workspaces.id, id)).limit(1);
    return (rows[0] as Workspace | undefined) ?? null;
  }

  async findBySlug(tenantId: string, slug: string): Promise<Workspace | null> {
    const rows = await this.db
      .select()
      .from(workspaces)
      .where(
        and(
          eq(workspaces.tenantId, tenantId),
          eq(workspaces.slug, slug),
          isNull(workspaces.deletedAt),
        ),
      )
      .limit(1);
    return (rows[0] as Workspace | undefined) ?? null;
  }

  async listByTenant(tenantId: string, limit: number, cursor?: string): Promise<WorkspacePage> {
    const conditions = [eq(workspaces.tenantId, tenantId), isNull(workspaces.deletedAt)];

    if (cursor) {
      const cursorDate = new Date(Buffer.from(cursor, 'base64url').toString());
      conditions.push(lt(workspaces.createdAt, cursorDate));
    }

    const rows = await this.db
      .select()
      .from(workspaces)
      .where(and(...conditions))
      .orderBy(workspaces.createdAt)
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    const nextCursor = hasMore
      ? Buffer.from(items[items.length - 1]!.createdAt.toISOString()).toString('base64url')
      : null;

    return { items: items as Workspace[], nextCursor };
  }

  async create(input: CreateWorkspaceInput): Promise<Workspace> {
    const rows = await this.db
      .insert(workspaces)
      .values({
        id: input.id,
        tenantId: input.tenantId,
        slug: input.slug,
        name: input.name,
        description: input.description,
        avatarUrl: input.avatarUrl,
      })
      .returning();
    return rows[0] as Workspace;
  }

  async update(id: string, input: UpdateWorkspaceInput): Promise<Workspace> {
    const rows = await this.db
      .update(workspaces)
      .set({
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.avatarUrl !== undefined && { avatarUrl: input.avatarUrl }),
        ...(input.settings !== undefined && { settings: input.settings }),
        updatedAt: new Date(),
      })
      .where(eq(workspaces.id, id))
      .returning();
    return rows[0] as Workspace;
  }

  async softDelete(id: string): Promise<void> {
    await this.db
      .update(workspaces)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(workspaces.id, id));
  }
}
