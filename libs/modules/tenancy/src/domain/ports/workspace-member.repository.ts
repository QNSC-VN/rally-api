import type { WorkspaceMember, AddMemberInput, MemberPage } from '../tenancy.types';

export const WORKSPACE_MEMBER_REPOSITORY = Symbol('WORKSPACE_MEMBER_REPOSITORY');

export interface IWorkspaceMemberRepository {
  findMember(workspaceId: string, userId: string): Promise<WorkspaceMember | null>;
  listMembers(workspaceId: string, limit: number, cursor?: string): Promise<MemberPage>;
  addMember(input: AddMemberInput): Promise<WorkspaceMember>;
  removeMember(workspaceId: string, userId: string): Promise<void>;
  isMember(workspaceId: string, userId: string): Promise<boolean>;
}
