import type {
  WorkflowStatus,
  WorkflowTransition,
  CreateWorkflowStatusInput,
} from '../project.types';

export const WORKFLOW_STATUS_REPOSITORY = Symbol('WORKFLOW_STATUS_REPOSITORY');

export interface IWorkflowStatusRepository {
  findById(id: string): Promise<WorkflowStatus | null>;
  listByProject(projectId: string): Promise<WorkflowStatus[]>;
  create(input: CreateWorkflowStatusInput): Promise<WorkflowStatus>;
  updatePositions(projectId: string, orderedIds: string[]): Promise<void>;
  delete(id: string): Promise<void>;
  findDefault(projectId: string): Promise<WorkflowStatus | null>;
  canTransition(projectId: string, fromStatusId: string, toStatusId: string): Promise<boolean>;
  listTransitions(projectId: string): Promise<WorkflowTransition[]>;
}
