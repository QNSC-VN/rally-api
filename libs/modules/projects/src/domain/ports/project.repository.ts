import type {
  Project,
  CreateProjectInput,
  UpdateProjectInput,
  ProjectPage,
} from '../project.types';

export const PROJECT_REPOSITORY = Symbol('PROJECT_REPOSITORY');

export interface IProjectRepository {
  findById(id: string): Promise<Project | null>;
  findByKey(tenantId: string, key: string): Promise<Project | null>;
  listByWorkspace(
    workspaceId: string,
    tenantId: string,
    limit: number,
    cursor?: string,
  ): Promise<ProjectPage>;
  create(input: CreateProjectInput): Promise<Project>;
  update(id: string, input: UpdateProjectInput): Promise<Project>;
  softDelete(id: string): Promise<void>;
  initCounter(projectId: string, tenantId: string): Promise<void>;
  incrementCounter(projectId: string): Promise<number>;
}
