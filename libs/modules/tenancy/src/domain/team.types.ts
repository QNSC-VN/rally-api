export interface Team {
  id: string;
  tenantId: string;
  workspaceId: string;
  name: string;
  key: string;
  description: string | null;
  leadId: string | null;
  status: string; // active | archived
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamMember {
  id: string;
  tenantId: string;
  teamId: string;
  userId: string;
  status: string; // active | removed
  joinedAt: Date;
}

export interface CreateTeamInput {
  id: string;
  tenantId: string;
  workspaceId: string;
  name: string;
  key: string;
  description?: string;
  leadId?: string;
}

export interface UpdateTeamInput {
  name?: string;
  description?: string | null;
  leadId?: string | null;
  status?: string;
}
