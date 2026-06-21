import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Auth, ApiCommonErrors, buildPageArgs, PageQueryDto } from '@platform';
import type { JwtPayload, PagedResult } from '@platform';
import { CurrentUser } from '@modules/identity';
import { TenancyService } from '../../application/tenancy.service';
import {
  CreateWorkspaceDto,
  UpdateWorkspaceDto,
  AddMemberDto,
  UpdateMemberDto,
  InviteMemberDto,
  AcceptInvitationDto,
  UpdateWorkspaceSettingsDto,
} from './dto/tenancy-request.dto';
import type {
  TenantResponseDto,
  WorkspaceResponseDto,
  MemberResponseDto,
  InvitationResponseDto,
  WorkspaceSettingsResponseDto,
} from './dto/tenancy-response.dto';
import type {
  Tenant,
  Workspace,
  WorkspaceMember,
  WorkspaceInvitation,
  WorkspaceSettings,
} from '../../domain/tenancy.types';

// ── Mappers ──────────────────────────────────────────────────────────────────

function toTenantDto(t: Tenant): TenantResponseDto {
  return {
    id: t.id,
    slug: t.slug,
    name: t.name,
    status: t.status,
    plan: t.plan,
    settings: t.settings,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

function toWorkspaceDto(w: Workspace): WorkspaceResponseDto {
  return {
    id: w.id,
    tenantId: w.tenantId,
    slug: w.slug,
    name: w.name,
    description: w.description,
    avatarUrl: w.avatarUrl,
    settings: w.settings,
    createdAt: w.createdAt.toISOString(),
    updatedAt: w.updatedAt.toISOString(),
  };
}

function toMemberDto(m: WorkspaceMember): MemberResponseDto {
  return {
    id: m.id,
    workspaceId: m.workspaceId,
    userId: m.userId,
    roleId: m.roleId,
    status: m.status,
    joinedAt: m.joinedAt?.toISOString() ?? new Date().toISOString(),
    createdAt: m.createdAt.toISOString(),
  };
}

function toInvitationDto(i: WorkspaceInvitation): InvitationResponseDto {
  return {
    id: i.id,
    workspaceId: i.workspaceId,
    email: i.email,
    roleId: i.roleId,
    status: i.status,
    invitedBy: i.invitedBy,
    expiresAt: i.expiresAt.toISOString(),
    acceptedBy: i.acceptedBy,
    acceptedAt: i.acceptedAt?.toISOString() ?? null,
    createdAt: i.createdAt.toISOString(),
  };
}

function toSettingsDto(s: WorkspaceSettings): WorkspaceSettingsResponseDto {
  return {
    workspaceId: s.workspaceId,
    timezone: s.timezone,
    defaultLocale: s.defaultLocale,
    dateFormat: s.dateFormat,
    updatedAt: s.updatedAt.toISOString(),
  };
}

// ── Controllers ──────────────────────────────────────────────────────────────

@ApiTags('tenants')
@Controller('tenants')
@Auth()
export class TenantController {
  constructor(private readonly tenancyService: TenancyService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get tenant details' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiCommonErrors(401, 403, 404)
  async getTenant(@Param('id', ParseUUIDPipe) id: string): Promise<TenantResponseDto> {
    const tenant = await this.tenancyService.getTenant(id);
    return toTenantDto(tenant);
  }
}

@ApiTags('workspaces')
@Controller('workspaces')
@Auth()
export class WorkspaceController {
  constructor(private readonly tenancyService: TenancyService) {}

  // ── List workspaces ────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'List workspaces for the authenticated tenant' })
  @ApiCommonErrors(401)
  async listWorkspaces(
    @CurrentUser() user: JwtPayload,
    @Query() query: PageQueryDto,
  ): Promise<PagedResult<WorkspaceResponseDto>> {
    const args = buildPageArgs(query);
    const page = await this.tenancyService.listWorkspaces(user.tenantId, args);
    return { data: page.data.map(toWorkspaceDto), pageInfo: page.pageInfo };
  }

  // ── Create workspace ───────────────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Create a new workspace' })
  @ApiCommonErrors(400, 401, 409, 422)
  async createWorkspace(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateWorkspaceDto,
  ): Promise<WorkspaceResponseDto> {
    const workspace = await this.tenancyService.createWorkspace(
      user,
      dto.slug,
      dto.name,
      dto.description,
      dto.avatarUrl,
    );
    return toWorkspaceDto(workspace);
  }

  // ── Get workspace ──────────────────────────────────────────────────────────

  @Get(':id')
  @ApiOperation({ summary: 'Get workspace details' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiCommonErrors(401, 404)
  async getWorkspace(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<WorkspaceResponseDto> {
    const workspace = await this.tenancyService.getWorkspace(user.tenantId, id);
    return toWorkspaceDto(workspace);
  }

  // ── Update workspace ───────────────────────────────────────────────────────

  @Patch(':id')
  @ApiOperation({ summary: 'Update workspace' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiCommonErrors(400, 401, 404, 422)
  async updateWorkspace(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkspaceDto,
  ): Promise<WorkspaceResponseDto> {
    const workspace = await this.tenancyService.updateWorkspace(user.tenantId, id, dto);
    return toWorkspaceDto(workspace);
  }

  // ── Delete workspace ───────────────────────────────────────────────────────

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete workspace (soft delete)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiCommonErrors(401, 404)
  async deleteWorkspace(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.tenancyService.deleteWorkspace(user.tenantId, id);
  }

  // ── List members ───────────────────────────────────────────────────────────

  @Get(':id/members')
  @ApiOperation({ summary: 'List workspace members' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiCommonErrors(401, 404)
  async listMembers(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: PageQueryDto,
  ): Promise<PagedResult<MemberResponseDto>> {
    const args = buildPageArgs(query);
    const page = await this.tenancyService.listMembers(user.tenantId, id, args);
    return { data: page.data.map(toMemberDto), pageInfo: page.pageInfo };
  }

  // ── Add member ─────────────────────────────────────────────────────────────

  @Post(':id/members')
  @ApiOperation({ summary: 'Add a user to the workspace' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiCommonErrors(400, 401, 404, 409, 422)
  async addMember(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddMemberDto,
  ): Promise<MemberResponseDto> {
    const member = await this.tenancyService.addMember(user.tenantId, id, dto.userId, user.sub);
    return toMemberDto(member);
  }

  // ── Update member ──────────────────────────────────────────────────────────

  @Patch(':id/members/:memberId')
  @ApiOperation({ summary: 'Update member role or status' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'memberId', type: 'string', format: 'uuid' })
  @ApiCommonErrors(400, 401, 404, 409, 422)
  async updateMember(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body() dto: UpdateMemberDto,
  ): Promise<MemberResponseDto> {
    const member = await this.tenancyService.updateMember(
      user.tenantId,
      id,
      memberId,
      dto,
      user.sub,
    );
    return toMemberDto(member);
  }

  // ── Remove member ──────────────────────────────────────────────────────────

  @Delete(':id/members/:userId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove a user from the workspace' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'userId', type: 'string', format: 'uuid' })
  @ApiCommonErrors(401, 404)
  async removeMember(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<void> {
    await this.tenancyService.removeMember(user.tenantId, id, userId, user.sub);
  }

  // ── Invite member ──────────────────────────────────────────────────────────

  @Post(':id/invitations')
  @ApiOperation({ summary: 'Invite a user to the workspace by email' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiCommonErrors(400, 401, 409, 422)
  async inviteMember(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: InviteMemberDto,
  ): Promise<InvitationResponseDto> {
    const invitation = await this.tenancyService.inviteMember(
      user.tenantId,
      id,
      dto.email,
      dto.roleId,
      user.sub,
    );
    return toInvitationDto(invitation);
  }

  // ── List invitations ───────────────────────────────────────────────────────

  @Get(':id/invitations')
  @ApiOperation({ summary: 'List invitations for a workspace' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiCommonErrors(401, 404)
  async listInvitations(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<InvitationResponseDto[]> {
    const invitations = await this.tenancyService.listInvitations(user.tenantId, id);
    return invitations.map(toInvitationDto);
  }

  // ── Cancel invitation ──────────────────────────────────────────────────────

  @Delete(':id/invitations/:invitationId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Cancel a pending workspace invitation' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'invitationId', type: 'string', format: 'uuid' })
  @ApiCommonErrors(401, 404)
  async cancelInvitation(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('invitationId', ParseUUIDPipe) invitationId: string,
  ): Promise<void> {
    await this.tenancyService.cancelInvitation(user.tenantId, id, invitationId, user.sub);
  }

  // ── Workspace settings ─────────────────────────────────────────────────────

  @Get(':id/settings')
  @ApiOperation({ summary: 'Get workspace settings' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiCommonErrors(401, 404)
  async getSettings(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<WorkspaceSettingsResponseDto> {
    const settings = await this.tenancyService.getSettings(user.tenantId, id);
    return toSettingsDto(settings);
  }

  @Patch(':id/settings')
  @ApiOperation({ summary: 'Update workspace settings' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiCommonErrors(400, 401, 404, 422)
  async updateSettings(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkspaceSettingsDto,
  ): Promise<WorkspaceSettingsResponseDto> {
    const settings = await this.tenancyService.updateSettings(user.tenantId, id, dto);
    return toSettingsDto(settings);
  }
}

// ── Authenticated invitation accept ──────────────────────────────────────────
// Accepting an invitation requires the recipient to be authenticated first.
// The frontend flow: receive email → log in / register → POST /invitations/accept.

@ApiTags('invitations')
@Controller('invitations')
export class InvitationController {
  constructor(private readonly tenancyService: TenancyService) {}

  @Post('accept')
  @HttpCode(204)
  @ApiOperation({ summary: 'Accept a workspace invitation (authenticated user only)' })
  @ApiBearerAuth('access-token')
  @ApiCommonErrors(400, 401, 404, 422)
  async acceptInvitation(
    @Body() dto: AcceptInvitationDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    await this.tenancyService.acceptInvitation(dto.token, user.sub);
  }
}
