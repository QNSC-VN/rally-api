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
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Auth, ApiCommonErrors, buildPageArgs, PageQueryDto } from '@platform';
import type { JwtPayload, PagedResult } from '@platform';
import { CurrentUser } from '@modules/identity';
import { TenancyService } from '../../application/tenancy.service';
import { CreateWorkspaceDto, UpdateWorkspaceDto, AddMemberDto } from './dto/tenancy-request.dto';
import type {
  TenantResponseDto,
  WorkspaceResponseDto,
  MemberResponseDto,
} from './dto/tenancy-response.dto';
import type { Tenant, Workspace, WorkspaceMember } from '../../domain/tenancy.types';

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
    createdAt: m.createdAt.toISOString(),
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
}
