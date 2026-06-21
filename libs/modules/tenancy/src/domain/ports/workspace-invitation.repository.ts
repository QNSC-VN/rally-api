import type { WorkspaceInvitation, CreateInvitationInput } from '../tenancy.types';

export const WORKSPACE_INVITATION_REPOSITORY = Symbol('WORKSPACE_INVITATION_REPOSITORY');

export interface IWorkspaceInvitationRepository {
  findByTokenHash(tokenHash: string): Promise<WorkspaceInvitation | null>;
  findById(id: string): Promise<WorkspaceInvitation | null>;
  findPendingByEmail(workspaceId: string, email: string): Promise<WorkspaceInvitation | null>;
  listByWorkspace(workspaceId: string): Promise<WorkspaceInvitation[]>;
  create(input: CreateInvitationInput): Promise<WorkspaceInvitation>;
  updateStatus(id: string, status: string, acceptedBy?: string): Promise<void>;
  cancelExistingForEmail(workspaceId: string, email: string): Promise<void>;
}
