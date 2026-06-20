import { Injectable } from '@nestjs/common';
import { and, eq, lt } from 'drizzle-orm';
import { InjectDrizzle, buildPageResult } from '@platform';
import type { DrizzleDB, CursorPayload, PagedResult } from '@platform';
import { workspaceMembers } from '../../../../../../db/schema/tenancy';
import type { WorkspaceMember, AddMemberInput } from '../../domain/tenancy.types';
import { IWorkspaceMemberRepository } from '../../domain/ports/workspace-member.repository';

@Injectable()
export class WorkspaceMemberDrizzleRepository implements IWorkspaceMemberRepository {
  constructor(@InjectDrizzle() private readonly db: DrizzleDB) {}

  async findMember(workspaceId: string, userId: string): Promise<WorkspaceMember | null> {
    const rows = await this.db
      .select()
      .from(workspaceMembers)
      .where(
        and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)),
      )
      .limit(1);
    return (rows[0] as WorkspaceMember | undefined) ?? null;
  }

  async listMembers(
    workspaceId: string,
    { limit, cursor }: { limit: number; cursor: CursorPayload | null },
  ): Promise<PagedResult<WorkspaceMember>> {
    const conditions = [eq(workspaceMembers.workspaceId, workspaceId)];

    if (cursor) {
      conditions.push(lt(workspaceMembers.createdAt, new Date(cursor.k[0] as string)));
    }

    const rows = await this.db
      .select()
      .from(workspaceMembers)
      .where(and(...conditions))
      .orderBy(workspaceMembers.createdAt)
      .limit(limit + 1);

    return buildPageResult(rows as WorkspaceMember[], limit, (m) => [m.createdAt.toISOString()]);
  }

  async addMember(input: AddMemberInput): Promise<WorkspaceMember> {
    const rows = await this.db
      .insert(workspaceMembers)
      .values({
        id: input.id,
        tenantId: input.tenantId,
        workspaceId: input.workspaceId,
        userId: input.userId,
      })
      .returning();
    return rows[0] as WorkspaceMember;
  }

  async removeMember(workspaceId: string, userId: string): Promise<void> {
    await this.db
      .delete(workspaceMembers)
      .where(
        and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)),
      );
  }

  async isMember(workspaceId: string, userId: string): Promise<boolean> {
    const result = await this.findMember(workspaceId, userId);
    return result !== null;
  }
}
