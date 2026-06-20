import { Inject, Injectable, Logger } from '@nestjs/common';
import { uuidv7 } from 'uuidv7';
import {
  NotFoundException,
  ConflictException,
  UnauthorizedException,
  PreconditionFailedException,
} from '@platform';
import type { JwtPayload } from '@platform';
import { ITenantRepository, TENANT_REPOSITORY } from '../domain/ports/tenant.repository';
import { IWorkspaceRepository, WORKSPACE_REPOSITORY } from '../domain/ports/workspace.repository';
import {
  IWorkspaceMemberRepository,
  WORKSPACE_MEMBER_REPOSITORY,
} from '../domain/ports/workspace-member.repository';
import type {
  Tenant,
  Workspace,
  WorkspaceMember,
  WorkspacePage,
  MemberPage,
  UpdateWorkspaceInput,
} from '../domain/tenancy.types';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

@Injectable()
export class TenancyService {
  private readonly logger = new Logger(TenancyService.name);

  constructor(
    @Inject(TENANT_REPOSITORY) private readonly tenantRepo: ITenantRepository,
    @Inject(WORKSPACE_REPOSITORY) private readonly workspaceRepo: IWorkspaceRepository,
    @Inject(WORKSPACE_MEMBER_REPOSITORY) private readonly memberRepo: IWorkspaceMemberRepository,
  ) {}

  // ── Tenant ──────────────────────────────────────────────────────────────────

  async getTenant(tenantId: string): Promise<Tenant> {
    const tenant = await this.tenantRepo.findById(tenantId);
    if (!tenant || tenant.deletedAt) {
      throw new NotFoundException('TENANT_NOT_FOUND', 'Tenant not found');
    }
    if (tenant.status === 'suspended') {
      throw new UnauthorizedException('TENANT_SUSPENDED', 'Tenant is suspended');
    }
    return tenant;
  }

  // ── Workspaces ──────────────────────────────────────────────────────────────

  async listWorkspaces(
    tenantId: string,
    limit = DEFAULT_PAGE_SIZE,
    cursor?: string,
  ): Promise<WorkspacePage> {
    const safeLimit = Math.min(limit, MAX_PAGE_SIZE);
    return this.workspaceRepo.listByTenant(tenantId, safeLimit, cursor);
  }

  async createWorkspace(
    actor: JwtPayload,
    slug: string,
    name: string,
    description?: string,
    avatarUrl?: string,
  ): Promise<Workspace> {
    const existing = await this.workspaceRepo.findBySlug(actor.tenantId, slug);
    if (existing) {
      throw new ConflictException('WORKSPACE_SLUG_TAKEN', `Slug "${slug}" is already taken`);
    }

    const workspace = await this.workspaceRepo.create({
      id: uuidv7(),
      tenantId: actor.tenantId,
      slug,
      name,
      description,
      avatarUrl,
    });

    // Add creator as member automatically
    await this.memberRepo.addMember({
      id: uuidv7(),
      tenantId: actor.tenantId,
      workspaceId: workspace.id,
      userId: actor.sub,
    });

    this.logger.log({ workspaceId: workspace.id, userId: actor.sub }, 'Workspace created');
    return workspace;
  }

  async getWorkspace(tenantId: string, workspaceId: string): Promise<Workspace> {
    const workspace = await this.workspaceRepo.findById(workspaceId);
    if (!workspace || workspace.deletedAt || workspace.tenantId !== tenantId) {
      throw new NotFoundException('WORKSPACE_NOT_FOUND', 'Workspace not found');
    }
    return workspace;
  }

  async updateWorkspace(
    tenantId: string,
    workspaceId: string,
    input: UpdateWorkspaceInput,
  ): Promise<Workspace> {
    const workspace = await this.getWorkspace(tenantId, workspaceId);

    if (input.name !== undefined && input.name.trim().length === 0) {
      throw new PreconditionFailedException('VALIDATION_FAILED', 'Workspace name cannot be empty');
    }

    return this.workspaceRepo.update(workspace.id, input);
  }

  async deleteWorkspace(tenantId: string, workspaceId: string): Promise<void> {
    await this.getWorkspace(tenantId, workspaceId);
    await this.workspaceRepo.softDelete(workspaceId);
    this.logger.log({ workspaceId }, 'Workspace soft-deleted');
  }

  // ── Members ──────────────────────────────────────────────────────────────────

  async listMembers(
    tenantId: string,
    workspaceId: string,
    limit = DEFAULT_PAGE_SIZE,
    cursor?: string,
  ): Promise<MemberPage> {
    await this.getWorkspace(tenantId, workspaceId);
    const safeLimit = Math.min(limit, MAX_PAGE_SIZE);
    return this.memberRepo.listMembers(workspaceId, safeLimit, cursor);
  }

  async addMember(
    tenantId: string,
    workspaceId: string,
    userId: string,
    actorId: string,
  ): Promise<WorkspaceMember> {
    await this.getWorkspace(tenantId, workspaceId);

    const existing = await this.memberRepo.findMember(workspaceId, userId);
    if (existing) {
      throw new ConflictException(
        'WORKSPACE_MEMBER_ALREADY_EXISTS',
        'User is already a member of this workspace',
      );
    }

    const member = await this.memberRepo.addMember({
      id: uuidv7(),
      tenantId,
      workspaceId,
      userId,
    });

    this.logger.log({ workspaceId, userId, actorId }, 'Member added to workspace');
    return member;
  }

  async removeMember(
    tenantId: string,
    workspaceId: string,
    userId: string,
    actorId: string,
  ): Promise<void> {
    await this.getWorkspace(tenantId, workspaceId);

    const existing = await this.memberRepo.findMember(workspaceId, userId);
    if (!existing) {
      throw new NotFoundException(
        'WORKSPACE_MEMBER_NOT_FOUND',
        'Member not found in this workspace',
      );
    }

    await this.memberRepo.removeMember(workspaceId, userId);
    this.logger.log({ workspaceId, userId, actorId }, 'Member removed from workspace');
  }
}
