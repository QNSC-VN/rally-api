import { Injectable } from '@nestjs/common';
import { and, eq, lt } from 'drizzle-orm';
import { InjectDrizzle } from '@platform';
import type { DrizzleDB } from '@platform';
import { workspaceMembers } from '../../../../../../db/schema/tenancy';
import type { WorkspaceMember, AddMemberInput, MemberPage } from '../../domain/tenancy.types';
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

  async listMembers(workspaceId: string, limit: number, cursor?: string): Promise<MemberPage> {
    const conditions = [eq(workspaceMembers.workspaceId, workspaceId)];

    if (cursor) {
      const cursorDate = new Date(Buffer.from(cursor, 'base64url').toString());
      conditions.push(lt(workspaceMembers.createdAt, cursorDate));
    }

    const rows = await this.db
      .select()
      .from(workspaceMembers)
      .where(and(...conditions))
      .orderBy(workspaceMembers.createdAt)
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    const nextCursor = hasMore
      ? Buffer.from(items[items.length - 1]!.createdAt.toISOString()).toString('base64url')
      : null;

    return { items: items as WorkspaceMember[], nextCursor };
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
