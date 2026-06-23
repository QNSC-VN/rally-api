import { Inject, Injectable } from '@nestjs/common';
import {
  NOTIFICATION_PREFERENCE_REPOSITORY,
  type INotificationPreferenceRepository,
} from '../domain/ports/notification-preference.repository';
import type {
  NotificationPreference,
  UpsertPreferenceInput,
  NotificationChannel,
} from '../domain/notification-preference.types';

/**
 * NotificationPreferencesService — resolves whether a user wants to receive
 * a specific notification type on a specific channel.
 *
 * Resolution order:
 *   1. Explicit row for the exact type    (most specific)
 *   2. Wildcard row (type = '*')           (master switch)
 *   3. Default                             → enabled (true)
 *
 * This means:
 *   - Opting out of '*' disables everything unless overridden by a specific type
 *   - A specific type row beats the wildcard
 */
@Injectable()
export class NotificationPreferencesService {
  constructor(
    @Inject(NOTIFICATION_PREFERENCE_REPOSITORY)
    private readonly repo: INotificationPreferenceRepository,
  ) {}

  listPreferences(tenantId: string, userId: string): Promise<NotificationPreference[]> {
    return this.repo.listForUser(tenantId, userId);
  }

  upsert(input: UpsertPreferenceInput): Promise<NotificationPreference> {
    return this.repo.upsert(input);
  }

  async reset(tenantId: string, userId: string, type: string): Promise<void> {
    await this.repo.delete(tenantId, userId, type);
  }

  /**
   * Resolve whether a channel is enabled for the given (tenantId, userId, type).
   *
   * Used by relay services to decide whether to deliver a notification/email.
   * Reads from the DB directly (not cached) so preference changes take effect
   * on the next relay tick without requiring a service restart.
   */
  async isEnabled(
    tenantId: string,
    userId: string,
    type: string,
    channel: NotificationChannel,
  ): Promise<boolean> {
    const field: keyof Pick<NotificationPreference, 'inApp' | 'email'> =
      channel === 'in_app' ? 'inApp' : 'email';

    // 1. Check exact type preference
    const specific = await this.repo.findOne(tenantId, userId, type);
    if (specific) return specific[field];

    // 2. Check wildcard ('*') preference
    const wildcard = await this.repo.findOne(tenantId, userId, '*');
    if (wildcard) return wildcard[field];

    // 3. Default: enabled
    return true;
  }

  /** Convenience: is in-app delivery enabled? */
  isInAppEnabled(tenantId: string, userId: string, type: string): Promise<boolean> {
    return this.isEnabled(tenantId, userId, type, 'in_app');
  }

  /** Convenience: is email delivery enabled? */
  isEmailEnabled(tenantId: string, userId: string, type: string): Promise<boolean> {
    return this.isEnabled(tenantId, userId, type, 'email');
  }
}
