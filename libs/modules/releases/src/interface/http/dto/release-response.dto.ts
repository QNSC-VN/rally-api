export interface ReleaseResponseDto {
  id: string;
  tenantId: string;
  projectId: string;
  name: string;
  description: string | null;
  status: string;
  targetDate: string | null;
  releasedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
