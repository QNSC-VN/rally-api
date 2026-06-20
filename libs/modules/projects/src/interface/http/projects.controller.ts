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
import { Auth, ApiCommonErrors, buildPageArgs } from '@platform';
import type { JwtPayload, PagedResult } from '@platform';
import { CurrentUser } from '@modules/identity';
import { ProjectsService } from '../../application/projects.service';
import { CreateProjectDto, UpdateProjectDto, ProjectQueryDto } from './dto/project-request.dto';
import type {
  ProjectResponseDto,
  WorkflowStatusResponseDto,
  WorkflowTransitionResponseDto,
} from './dto/project-response.dto';
import type { Project, WorkflowStatus, WorkflowTransition } from '../../domain/project.types';

// ── Mappers ──────────────────────────────────────────────────────────────────

function toProjectDto(p: Project): ProjectResponseDto {
  return {
    id: p.id,
    tenantId: p.tenantId,
    workspaceId: p.workspaceId,
    key: p.key,
    name: p.name,
    description: p.description,
    leadId: p.leadId,
    status: p.status,
    settings: p.settings,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

function toStatusDto(s: WorkflowStatus): WorkflowStatusResponseDto {
  return {
    id: s.id,
    projectId: s.projectId,
    name: s.name,
    category: s.category,
    color: s.color,
    position: s.position,
    isDefault: s.isDefault,
  };
}

function toTransitionDto(t: WorkflowTransition): WorkflowTransitionResponseDto {
  return {
    id: t.id,
    projectId: t.projectId,
    fromStatusId: t.fromStatusId,
    toStatusId: t.toStatusId,
    name: t.name,
    requiredRole: t.requiredRole,
  };
}

// ── Controller ───────────────────────────────────────────────────────────────

@ApiTags('projects')
@Controller('projects')
@Auth()
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  // ── List projects ──────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'List projects in a workspace' })
  @ApiCommonErrors(400, 401)
  async listProjects(
    @CurrentUser() user: JwtPayload,
    @Query() query: ProjectQueryDto,
  ): Promise<PagedResult<ProjectResponseDto>> {
    const args = buildPageArgs(query);
    const page = await this.projectsService.listProjects(user, query.workspaceId, args);
    return { data: page.data.map(toProjectDto), pageInfo: page.pageInfo };
  }

  // ── Create project ─────────────────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Create a new project' })
  @ApiCommonErrors(400, 401, 409, 422)
  async createProject(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateProjectDto,
  ): Promise<ProjectResponseDto> {
    const project = await this.projectsService.createProject(
      user,
      dto.workspaceId,
      dto.key,
      dto.name,
      dto.description,
      dto.leadId,
    );
    return toProjectDto(project);
  }

  // ── Get project ────────────────────────────────────────────────────────────

  @Get(':id')
  @ApiOperation({ summary: 'Get project details' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiCommonErrors(401, 404)
  async getProject(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ProjectResponseDto> {
    const project = await this.projectsService.getProject(user.tenantId, id);
    return toProjectDto(project);
  }

  // ── Update project ─────────────────────────────────────────────────────────

  @Patch(':id')
  @ApiOperation({ summary: 'Update project' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiCommonErrors(400, 401, 404, 422)
  async updateProject(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectDto,
  ): Promise<ProjectResponseDto> {
    const project = await this.projectsService.updateProject(user.tenantId, id, dto);
    return toProjectDto(project);
  }

  // ── Delete project ─────────────────────────────────────────────────────────

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete project (soft delete)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiCommonErrors(401, 404)
  async deleteProject(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.projectsService.deleteProject(user.tenantId, id);
  }

  // ── Workflow statuses ──────────────────────────────────────────────────────

  @Get(':id/statuses')
  @ApiOperation({ summary: 'List workflow statuses for a project' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiCommonErrors(401, 404)
  async listStatuses(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<WorkflowStatusResponseDto[]> {
    const statuses = await this.projectsService.listStatuses(user.tenantId, id);
    return statuses.map(toStatusDto);
  }

  // ── Workflow transitions ───────────────────────────────────────────────────

  @Get(':id/transitions')
  @ApiOperation({ summary: 'List workflow transitions for a project' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiCommonErrors(401, 404)
  async listTransitions(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<WorkflowTransitionResponseDto[]> {
    const transitions = await this.projectsService.listTransitions(user.tenantId, id);
    return transitions.map(toTransitionDto);
  }
}
