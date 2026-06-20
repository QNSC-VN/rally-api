import type {
  Workspace,
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  WorkspacePage,
} from '../tenancy.types';

export const WORKSPACE_REPOSITORY = Symbol('WORKSPACE_REPOSITORY');

export interface IWorkspaceRepository {
  findById(id: string): Promise<Workspace | null>;
  findBySlug(tenantId: string, slug: string): Promise<Workspace | null>;
  listByTenant(tenantId: string, limit: number, cursor?: string): Promise<WorkspacePage>;
  create(input: CreateWorkspaceInput): Promise<Workspace>;
  update(id: string, input: UpdateWorkspaceInput): Promise<Workspace>;
  softDelete(id: string): Promise<void>;
}
