import type { Notification, CreateNotificationInput } from '../notification.types';

export const NOTIFICATION_REPOSITORY = Symbol('NOTIFICATION_REPOSITORY');

export interface INotificationRepository {
  findById(id: string): Promise<Notification | null>;
  listForRecipient(
    tenantId: string,
    recipientId: string,
    unreadOnly: boolean,
    limit: number,
  ): Promise<Notification[]>;
  create(input: CreateNotificationInput): Promise<Notification>;
  markRead(id: string): Promise<void>;
  markAllRead(tenantId: string, recipientId: string): Promise<void>;
}
