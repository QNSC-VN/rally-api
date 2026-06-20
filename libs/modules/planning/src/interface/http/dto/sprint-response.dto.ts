export interface SprintResponseDto {
  id: string;
  tenantId: string;
  projectId: string;
  name: string;
  goal: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
