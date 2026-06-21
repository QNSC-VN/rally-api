import { Inject, Injectable, Logger } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { uuidv7 } from 'uuidv7';
import {
  NotFoundException,
  ConflictException,
  UnauthorizedException,
  PreconditionFailedException,
} from '@platform';
import type { JwtPayload, CursorPayload, PagedResult } from '@platform';
import { ITenantRepository, TENANT_REPOSITORY } from '../domain/ports/tenant.repository';
import { IWorkspaceRepository, WORKSPACE_REPOSITORY } from '../domain/ports/workspace.repository';
import {
  IWorkspaceMemberRepository,
  WORKSPACE_MEMBER_REPOSITORY,
} from '../domain/ports/workspace-member.repository';
import {
  IWorkspaceInvitationRepository,
  WORKSPACE_INVITATION_REPOSITORY,
} from '../domain/ports/workspace-invitation.repository';
import {
  IWorkspaceSettingsRepository,
  WORKSPACE_SETTINGS_REPOSITORY,
} from '../domain/ports/workspace-settings.repository';
import type {
  Tenant,
  Workspace,
  WorkspaceMember,
  WorkspaceInvitation,
  WorkspaceSettings,
  UpdateWorkspaceInput,
  UpdateMemberInput,
  UpdateWorkspaceSettingsInput,
} from '../domain/tenancy.types';

@Injectable()
export class TenancyService {
  private readonly logger = new Logger(TenancyService.name);

  constructor(
    @Inject(TENANT_REPOSITORY) private readonly tenantRepo: ITenantRepository,
    @Inject(WORKSPACE_REPOSITORY) private readonly workspaceRepo: IWorkspaceRepository,
    @Inject(WORKSPACE_MEMBER_REPOSITORY) private readonly memberRepo: IWorkspaceMemberRepository,
    @Inject(WORKSPACE_INVITATION_REPOSITORY)
    private readonly invitationRepo: IWorkspaceInvitationRepository,
    @Inject(WORKSPACE_SETTINGS_REPOSITORY)
    private readonly settingsRepo: IWorkspaceSettingsRepository,
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
    args: { limit: number; cursor: CursorPayload | null },
  ): Promise<PagedResult<Workspace>> {
    return this.workspaceRepo.listByTenant(tenantId, args);
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
      roleId: 'admin',
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
    args: { limit: number; cursor: CursorPayload | null },
  ): Promise<PagedResult<WorkspaceMember>> {
    await this.getWorkspace(tenantId, workspaceId);
    return this.memberRepo.listMembers(workspaceId, args);
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
      roleId: undefined,
    });

    this.logger.log({ workspaceId, userId, actorId }, 'Member added to workspace');
    return member;
  }

  async updateMember(
    tenantId: string,
    workspaceId: string,
    memberId: string,
    input: UpdateMemberInput,
    actorId: string,
  ): Promise<WorkspaceMember> {
    await this.getWorkspace(tenantId, workspaceId);

    const member = await this.memberRepo.findMemberById(memberId);
    if (!member || member.workspaceId !== workspaceId) {
      throw new NotFoundException(
        'WORKSPACE_MEMBER_NOT_FOUND',
        'Member not found in this workspace',
      );
    }

    // Sole-admin invariant: cannot suspend/remove/demote the last active admin
    if ((input.status === 'suspended' || input.status === 'removed') && member.roleId === 'admin') {
      const adminCount = await this.memberRepo.countActiveAdmins(workspaceId);
      if (adminCount <= 1) {
        throw new PreconditionFailedException(
          'SOLE_ADMIN_VIOLATION',
          'Cannot suspend or remove the last workspace admin',
        );
      }
    }

    const updated = await this.memberRepo.updateMember(memberId, input);
    this.logger.log({ workspaceId, memberId, actorId }, 'Member updated');
    return updated;
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

  // ── Invitations ─────────────────────────────────────────────────────────────

  async inviteMember(
    tenantId: string,
    workspaceId: string,
    email: string,
    roleId: string | undefined,
    actorId: string,
  ): Promise<WorkspaceInvitation> {
    await this.getWorkspace(tenantId, workspaceId);

    // Rotate on resend (COMPANY-FR-005): cancel any existing pending invite
    await this.invitationRepo.cancelExistingForEmail(workspaceId, email.toLowerCase().trim());

    const rawToken = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = await this.invitationRepo.create({
      id: uuidv7(),
      tenantId,
      workspaceId,
      email: email.toLowerCase().trim(),
      roleId,
      tokenHash,
      invitedBy: actorId,
      expiresAt,
    });

    // TODO: send invitation email with rawToken
    this.logger.warn(
      { invitationId: invitation.id, token: rawToken },
      'Invitation created (dev-mode token log)',
    );
    return invitation;
  }

  async listInvitations(tenantId: string, workspaceId: string): Promise<WorkspaceInvitation[]> {
    await this.getWorkspace(tenantId, workspaceId);
    return this.invitationRepo.listByWorkspace(workspaceId);
  }

  async cancelInvitation(
    tenantId: string,
    workspaceId: string,
    invitationId: string,
    actorId: string,
  ): Promise<void> {
    await this.getWorkspace(tenantId, workspaceId);

    const invitation = await this.invitationRepo.findById(invitationId);
    if (!invitation || invitation.workspaceId !== workspaceId) {
      throw new NotFoundException('INVITATION_NOT_FOUND', 'Invitation not found');
    }

    if (invitation.status !== 'pending') {
      throw new PreconditionFailedException(
        'INVITATION_NOT_PENDING',
        'Invitation is no longer pending',
      );
    }

    await this.invitationRepo.updateStatus(invitationId, 'cancelled');
    this.logger.log({ invitationId, actorId }, 'Invitation cancelled');
  }

  async acceptInvitation(rawToken: string, acceptingUserId: string): Promise<void> {
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const invitation = await this.invitationRepo.findByTokenHash(tokenHash);

    if (!invitation) {
      throw new NotFoundException('INVITATION_NOT_FOUND', 'Invalid or unknown invitation token');
    }

    if (invitation.status !== 'pending') {
      throw new PreconditionFailedException(
        'INVITATION_ALREADY_USED',
        'Invitation has already been used or cancelled',
      );
    }

    if (invitation.expiresAt < new Date()) {
      throw new PreconditionFailedException('INVITATION_EXPIRED', 'Invitation has expired');
    }

    const existing = await this.memberRepo.findMember(invitation.workspaceId, acceptingUserId);
    if (!existing) {
      await this.memberRepo.addMember({
        id: uuidv7(),
        tenantId: invitation.tenantId,
        workspaceId: invitation.workspaceId,
        userId: acceptingUserId,
        roleId: invitation.roleId ?? undefined,
      });
    }

    await this.invitationRepo.updateStatus(invitation.id, 'accepted', acceptingUserId);
    this.logger.log({ invitationId: invitation.id, acceptingUserId }, 'Invitation accepted');
  }

  // ── Settings ─────────────────────────────────────────────────────────────────

  async getSettings(tenantId: string, workspaceId: string): Promise<WorkspaceSettings> {
    await this.getWorkspace(tenantId, workspaceId);
    const settings = await this.settingsRepo.findByWorkspace(workspaceId);
    if (!settings) {
      // Return defaults if not configured
      return {
        id: '',
        workspaceId,
        tenantId,
        timezone: null,
        defaultLocale: null,
        dateFormat: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
    return settings;
  }

  async updateSettings(
    tenantId: string,
    workspaceId: string,
    input: UpdateWorkspaceSettingsInput,
  ): Promise<WorkspaceSettings> {
    await this.getWorkspace(tenantId, workspaceId);
    return this.settingsRepo.upsert(workspaceId, tenantId, input);
  }
}
