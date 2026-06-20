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
  /** Idempotent — returns null when sourceEventId already exists (deduplicated). */
  create(input: CreateNotificationInput): Promise<Notification | null>;
  markRead(id: string): Promise<void>;
  markAllRead(tenantId: string, recipientId: string): Promise<void>;
}
