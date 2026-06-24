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
  Req,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags, ApiConsumes } from '@nestjs/swagger';
import { Auth, ApiCommonErrors } from '@platform';
import type { JwtPayload } from '@platform';
import { CurrentUser } from '@modules/identity';
import { CollaborationService } from '../../application/collaboration.service';
import {
  CreateCommentDto,
  UpdateCommentDto,
  CreateAttachmentDto,
} from './dto/collaboration-request.dto';
import { CommentResponseDto, AttachmentResponseDto } from './dto/collaboration-response.dto';
import type { Comment, Attachment } from '../../domain/collaboration.types';
import { createWriteStream, createReadStream, existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { uuidv7 } from 'uuidv7';
import type { FastifyRequest, FastifyReply } from 'fastify';

function toCommentDto(c: Comment): CommentResponseDto {
  return {
    id: c.id,
    workItemId: c.workItemId,
    authorId: c.authorId,
    body: c.body,
    parentId: c.parentId,
    isEdited: c.isEdited,
    editedAt: c.editedAt?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

function toAttachmentDto(a: Attachment): AttachmentResponseDto {
  return {
    id: a.id,
    workItemId: a.workItemId,
    uploadedBy: a.uploadedBy,
    filename: a.filename,
    mimeType: a.mimeType,
    sizeBytes: a.sizeBytes,
    createdAt: a.createdAt.toISOString(),
  };
}

@ApiTags('collaboration')
@Controller('work-items/:workItemId')
@Auth()
export class CollaborationController {
  constructor(private readonly collaborationService: CollaborationService) {}

  // ── Comments ───────────────────────────────────────────────────────────────

  @Get('comments')
  @ApiOperation({ summary: 'List comments for a work item' })
  @ApiParam({ name: 'workItemId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: [CommentResponseDto] })
  @ApiCommonErrors(401, 404)
  async listComments(
    @CurrentUser() user: JwtPayload,
    @Param('workItemId', ParseUUIDPipe) workItemId: string,
  ): Promise<CommentResponseDto[]> {
    const comments = await this.collaborationService.listComments(user, workItemId);
    return comments.map(toCommentDto);
  }

  @Post('comments')
  @ApiOperation({ summary: 'Add a comment to a work item' })
  @ApiParam({ name: 'workItemId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 201, type: CommentResponseDto })
  @ApiCommonErrors(400, 401, 422)
  async createComment(
    @CurrentUser() user: JwtPayload,
    @Param('workItemId', ParseUUIDPipe) workItemId: string,
    @Body() dto: CreateCommentDto,
  ): Promise<CommentResponseDto> {
    const comment = await this.collaborationService.createComment(
      user,
      workItemId,
      dto.body,
      dto.parentId,
    );
    return toCommentDto(comment);
  }

  @Patch('comments/:commentId')
  @ApiOperation({ summary: 'Update a comment' })
  @ApiParam({ name: 'workItemId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'commentId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: CommentResponseDto })
  @ApiCommonErrors(400, 401, 404, 422)
  async updateComment(
    @CurrentUser() user: JwtPayload,
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @Body() dto: UpdateCommentDto,
  ): Promise<CommentResponseDto> {
    const comment = await this.collaborationService.updateComment(user, commentId, dto.body);
    return toCommentDto(comment);
  }

  @Delete('comments/:commentId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a comment (soft delete)' })
  @ApiParam({ name: 'workItemId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'commentId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Comment deleted' })
  @ApiCommonErrors(401, 404)
  async deleteComment(
    @CurrentUser() user: JwtPayload,
    @Param('commentId', ParseUUIDPipe) commentId: string,
  ): Promise<void> {
    await this.collaborationService.deleteComment(user, commentId);
  }

  // ── Attachments ────────────────────────────────────────────────────────────

  @Get('attachments')
  @ApiOperation({ summary: 'List attachments for a work item' })
  @ApiParam({ name: 'workItemId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: [AttachmentResponseDto] })
  @ApiCommonErrors(401, 404)
  async listAttachments(
    @CurrentUser() user: JwtPayload,
    @Param('workItemId', ParseUUIDPipe) workItemId: string,
  ): Promise<AttachmentResponseDto[]> {
    const attachments = await this.collaborationService.listAttachments(user, workItemId);
    return attachments.map(toAttachmentDto);
  }

  @Post('attachments')
  @ApiOperation({ summary: 'Register an attachment (after S3 upload)' })
  @ApiParam({ name: 'workItemId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 201, type: AttachmentResponseDto })
  @ApiCommonErrors(400, 401, 422)
  async createAttachment(
    @CurrentUser() user: JwtPayload,
    @Param('workItemId', ParseUUIDPipe) workItemId: string,
    @Body() dto: CreateAttachmentDto,
  ): Promise<AttachmentResponseDto> {
    const attachment = await this.collaborationService.createAttachment(user, workItemId, dto);
    return toAttachmentDto(attachment);
  }

  @Delete('attachments/:attachmentId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete an attachment (soft delete)' })
  @ApiParam({ name: 'workItemId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'attachmentId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Attachment deleted' })
  @ApiCommonErrors(401, 404)
  async deleteAttachment(
    @CurrentUser() user: JwtPayload,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
  ): Promise<void> {
    await this.collaborationService.deleteAttachment(user, attachmentId);
  }

  // ── File upload (Phase 1: disk storage) ───────────────────────────────────
  // Accepts multipart/form-data with a single `file` field.
  // Files are stored at: <cwd>/uploads/<workItemId>/<uuid><ext>
  // Use GET /v1/work-items/:workItemId/attachments/:attachmentId/download to retrieve.

  @Post('attachments/upload')
  @ApiOperation({ summary: 'Upload a file and register as attachment' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'workItemId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 201, type: AttachmentResponseDto })
  @ApiCommonErrors(400, 401)
  async uploadAttachment(
    @CurrentUser() user: JwtPayload,
    @Param('workItemId', ParseUUIDPipe) workItemId: string,
    @Req() req: FastifyRequest,
  ): Promise<AttachmentResponseDto & { downloadPath: string }> {
    // @fastify/multipart adds req.file()
    const data = await (
      req as FastifyRequest & {
        file: () => Promise<{
          filename?: string;
          mimetype?: string;
          file: NodeJS.ReadableStream & { bytesRead?: number };
        }>;
      }
    ).file();
    if (!data) {
      throw new Error('No file in request');
    }

    const ext = extname(data.filename ?? '').toLowerCase() || '';
    const fileId = uuidv7();
    const storageName = `${fileId}${ext}`;
    const dir = join(process.cwd(), 'uploads', workItemId);
    await mkdir(dir, { recursive: true });
    const filePath = join(dir, storageName);

    await pipeline(data.file, createWriteStream(filePath));

    const sizeBytes: number =
      (data.file as NodeJS.ReadableStream & { bytesRead?: number }).bytesRead ?? 0;
    const storageKey = `${workItemId}/${storageName}`;

    const attachment = await this.collaborationService.createAttachment(user, workItemId, {
      filename: data.filename ?? storageName,
      mimeType: data.mimetype ?? 'application/octet-stream',
      sizeBytes: sizeBytes || 1,
      storageKey,
    });

    const downloadPath = `/v1/work-items/${workItemId}/attachments/${attachment.id}/download`;
    return { ...toAttachmentDto(attachment), downloadPath };
  }

  @Get('attachments/:attachmentId/download')
  @ApiOperation({ summary: 'Download an attachment file' })
  @ApiParam({ name: 'workItemId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'attachmentId', type: 'string', format: 'uuid' })
  @ApiCommonErrors(401, 404)
  async downloadAttachment(
    @CurrentUser() user: JwtPayload,
    @Param('workItemId', ParseUUIDPipe) workItemId: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
    @Res() res: FastifyReply,
  ): Promise<void> {
    const attachments = await this.collaborationService.listAttachments(user, workItemId);
    const attachment = attachments.find((a) => a.id === attachmentId);
    if (!attachment) {
      res.code(404).send({ message: 'Attachment not found' });
      return;
    }
    const filePath = join(process.cwd(), 'uploads', attachment.storageKey);
    if (!existsSync(filePath)) {
      res.code(404).send({ message: 'File not found on disk' });
      return;
    }
    res
      .header('Content-Disposition', `attachment; filename="${attachment.filename}"`)
      .header('Content-Type', attachment.mimeType)
      .send(createReadStream(filePath));
  }
}
