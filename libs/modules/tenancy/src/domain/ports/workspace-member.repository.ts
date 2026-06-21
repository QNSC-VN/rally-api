import type { CursorPayload, PagedResult } from '@platform';
import type { WorkspaceMember, AddMemberInput, UpdateMemberInput } from '../tenancy.types';

export const WORKSPACE_MEMBER_REPOSITORY = Symbol('WORKSPACE_MEMBER_REPOSITORY');

export interface IWorkspaceMemberRepository {
  findMember(workspaceId: string, userId: string): Promise<WorkspaceMember | null>;
  findMemberById(id: string): Promise<WorkspaceMember | null>;
  listMembers(
    workspaceId: string,
    args: { limit: number; cursor: CursorPayload | null },
  ): Promise<PagedResult<WorkspaceMember>>;
  addMember(input: AddMemberInput): Promise<WorkspaceMember>;
  updateMember(id: string, input: UpdateMemberInput): Promise<WorkspaceMember>;
  removeMember(workspaceId: string, userId: string): Promise<void>;
  isMember(workspaceId: string, userId: string): Promise<boolean>;
  countActiveAdmins(workspaceId: string): Promise<number>;
}
