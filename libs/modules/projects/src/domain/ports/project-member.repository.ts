import type {
  ProjectMember,
  AddProjectMemberInput,
  UpdateProjectMemberInput,
} from '../project.types';

export const PROJECT_MEMBER_REPOSITORY = Symbol('PROJECT_MEMBER_REPOSITORY');

export interface IProjectMemberRepository {
  findMember(projectId: string, userId: string): Promise<ProjectMember | null>;
  findMemberById(id: string): Promise<ProjectMember | null>;
  listByProject(projectId: string): Promise<ProjectMember[]>;
  addMember(input: AddProjectMemberInput): Promise<ProjectMember>;
  updateMember(id: string, input: UpdateProjectMemberInput): Promise<ProjectMember>;
  removeMember(projectId: string, userId: string): Promise<void>;
}
