import type { CursorPayload, PagedResult } from '@platform';
import type {
  WorkItem,
  CreateWorkItemInput,
  UpdateWorkItemInput,
  WorkItemFilters,
} from '../work-item.types';

export const WORK_ITEM_REPOSITORY = Symbol('WORK_ITEM_REPOSITORY');

export interface IWorkItemRepository {
  findById(id: string): Promise<WorkItem | null>;
  listByProject(
    projectId: string,
    tenantId: string,
    filters: WorkItemFilters,
    args: { limit: number; cursor: CursorPayload | null },
  ): Promise<PagedResult<WorkItem>>;
  create(input: CreateWorkItemInput): Promise<WorkItem>;
  update(id: string, input: UpdateWorkItemInput): Promise<WorkItem>;
  softDelete(id: string): Promise<void>;
}
