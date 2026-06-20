export interface NotificationResponseDto {
  id: string;
  type: string;
  title: string;
  body: string | null;
  resourceType: string | null;
  resourceId: string | null;
  isRead: boolean;
  readAt: string | null;
  actorId: string | null;
  createdAt: string;
}
