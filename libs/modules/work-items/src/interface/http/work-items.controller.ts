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
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Auth, ApiCommonErrors, ApiPagedResponse, buildPageArgs } from '@platform';
import type { JwtPayload, PagedResult } from '@platform';
import { CurrentUser } from '@modules/identity';
import { WorkItemsService } from '../../application/work-items.service';
import {
  WorkItemQueryDto,
  CreateWorkItemDto,
  UpdateWorkItemDto,
  MoveWorkItemDto,
  ReorderWorkItemsDto,
  AddLabelDto,
} from './dto/work-item-request.dto';
import { WorkItemResponseDto } from './dto/work-item-response.dto';
import type { WorkItem } from '../../domain/work-item.types';

// ── Mapper ────────────────────────────────────────────────────────────────────

function toWorkItemDto(w: WorkItem): WorkItemResponseDto {
  return {
    id: w.id,
    tenantId: w.tenantId,
    projectId: w.projectId,
    itemKey: w.itemKey,
    type: w.type,
    title: w.title,
    description: w.description,
    statusId: w.statusId,
    priority: w.priority,
    assigneeId: w.assigneeId,
    reporterId: w.reporterId,
    parentId: w.parentId,
    iterationId: w.iterationId,
    releaseId: w.releaseId,
    storyPoints: w.storyPoints,
    acceptanceCriteria: w.acceptanceCriteria,
    isBlocked: w.isBlocked,
    blockedReason: w.blockedReason,
    rank: w.rank,
    customFields: w.customFields,
    createdBy: w.createdBy,
    createdAt: w.createdAt.toISOString(),
    updatedAt: w.updatedAt.toISOString(),
  };
}

// ── Controller ────────────────────────────────────────────────────────────────

@ApiTags('work-items')
@Controller('work-items')
@Auth()
export class WorkItemsController {
  constructor(private readonly workItemsService: WorkItemsService) {}

  // ── List ───────────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'List work items in a project' })
  @ApiPagedResponse(WorkItemResponseDto)
  @ApiCommonErrors(400, 401, 404)
  async listWorkItems(
    @CurrentUser() user: JwtPayload,
    @Query() query: WorkItemQueryDto,
  ): Promise<PagedResult<WorkItemResponseDto>> {
    const args = buildPageArgs(query);
    const page = await this.workItemsService.listWorkItems(
      user,
      query.projectId,
      {
        type: query.type,
        statusId: query.statusId,
        assigneeId: query.assigneeId,
        iterationId: query.iterationId,
        releaseId: query.releaseId,
      },
      args,
    );
    return { data: page.data.map(toWorkItemDto), pageInfo: page.pageInfo };
  }

  // ── Create ─────────────────────────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Create a work item' })
  @ApiResponse({ status: 201, type: WorkItemResponseDto })
  @ApiCommonErrors(400, 401, 404, 409, 422)
  async createWorkItem(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateWorkItemDto,
  ): Promise<WorkItemResponseDto> {
    const item = await this.workItemsService.createWorkItem(
      user,
      dto.projectId,
      dto.type,
      dto.title,
      {
        description: dto.description,
        statusId: dto.statusId,
        priority: dto.priority,
        assigneeId: dto.assigneeId,
        reporterId: dto.reporterId,
        parentId: dto.parentId,
        storyPoints: dto.storyPoints,
        acceptanceCriteria: dto.acceptanceCriteria,
      },
    );
    return toWorkItemDto(item);
  }

  // ── Get ────────────────────────────────────────────────────────────────────

  @Get(':id')
  @ApiOperation({ summary: 'Get a work item by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: WorkItemResponseDto })
  @ApiCommonErrors(401, 404)
  async getWorkItem(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<WorkItemResponseDto> {
    const item = await this.workItemsService.getWorkItem(user.tenantId, id);
    return toWorkItemDto(item);
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  @Patch(':id')
  @ApiOperation({ summary: 'Update a work item' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: WorkItemResponseDto })
  @ApiCommonErrors(400, 401, 404, 422)
  async updateWorkItem(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkItemDto,
  ): Promise<WorkItemResponseDto> {
    const item = await this.workItemsService.updateWorkItem(user.tenantId, id, dto);
    return toWorkItemDto(item);
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a work item (soft delete)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Work item deleted' })
  @ApiCommonErrors(401, 404)
  async deleteWorkItem(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.workItemsService.deleteWorkItem(user.tenantId, id);
  }

  // ── Move (board transition) ────────────────────────────────────────────────

  @Patch(':id/move')
  @ApiOperation({ summary: 'Transition a work item to a new workflow status' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: WorkItemResponseDto })
  @ApiCommonErrors(400, 401, 404)
  async moveWorkItem(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MoveWorkItemDto,
  ): Promise<WorkItemResponseDto> {
    const item = await this.workItemsService.moveWorkItem(user.tenantId, id, dto.toStatusId);
    return toWorkItemDto(item);
  }

  // ── Reorder (backlog drag-and-drop) ───────────────────────────────────────

  @Patch('reorder')
  @HttpCode(204)
  @ApiOperation({ summary: 'Bulk update work item ranks for backlog reordering' })
  @ApiResponse({ status: 204, description: 'Work items reordered' })
  @ApiCommonErrors(400, 401, 404, 422)
  async reorderWorkItems(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ReorderWorkItemsDto,
  ): Promise<void> {
    await this.workItemsService.reorderWorkItems(user.tenantId, dto.items);
  }

  // ── Labels ────────────────────────────────────────────────────────────────

  @Get(':id/labels')
  @ApiOperation({ summary: 'List labels on a work item' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: { id: { type: 'string' }, name: { type: 'string' }, color: { type: 'string' } },
      },
    },
  })
  @ApiCommonErrors(401, 404)
  async listWorkItemLabels(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Array<{ id: string; name: string; color: string }>> {
    return this.workItemsService.getWorkItemLabels(user.tenantId, id);
  }

  @Post(':id/labels')
  @HttpCode(204)
  @ApiOperation({ summary: 'Add a label to a work item' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Label added' })
  @ApiCommonErrors(400, 401, 404, 422)
  async addLabel(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddLabelDto,
  ): Promise<void> {
    await this.workItemsService.addLabelToWorkItem(user.tenantId, id, dto.labelId);
  }

  @Delete(':id/labels/:labelId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove a label from a work item' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'labelId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Label removed' })
  @ApiCommonErrors(401, 404)
  async removeLabel(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('labelId', ParseUUIDPipe) labelId: string,
  ): Promise<void> {
    await this.workItemsService.removeLabelFromWorkItem(user.tenantId, id, labelId);
  }
}
