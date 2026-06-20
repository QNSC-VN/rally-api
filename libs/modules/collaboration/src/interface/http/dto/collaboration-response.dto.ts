export interface CommentResponseDto {
  id: string;
  workItemId: string;
  authorId: string;
  body: string;
  parentId: string | null;
  isEdited: boolean;
  editedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AttachmentResponseDto {
  id: string;
  workItemId: string;
  uploadedBy: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}
