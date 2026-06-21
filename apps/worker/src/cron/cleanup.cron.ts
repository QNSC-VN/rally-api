/**
 * CleanupCronService — periodic housekeeping for stale / soft-deleted rows.
 *
 * Runs daily at 01:00 UTC (stagger from snapshot cron at 00:00).
 * Currently purges:
 *   1. identity.auth_sessions that are revoked and expired >N days ago
 *   2. identity.password_reset_tokens that expired >1 day ago
 *   3. tenancy.workspace_invitations that are still 'pending' but expired >N days ago
 *
 * N is configured via SESSION_CLEANUP_OLDER_THAN_DAYS (default 7).
 */
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { sql } from 'drizzle-orm';
import { InjectDrizzle, AppConfigService } from '@platform';
import type { DrizzleDB } from '@platform';

@Injectable()
export class CleanupCronService {
  private readonly logger = new Logger(CleanupCronService.name);
  private isRunning = false;

  constructor(
    @InjectDrizzle() private readonly db: DrizzleDB,
    private readonly config: AppConfigService,
  ) {}

  @Cron('0 1 * * *', { name: 'daily-cleanup', timeZone: 'UTC' })
  async runCleanup(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Cleanup cron still running from previous tick — skipping');
      return;
    }
    this.isRunning = true;
    try {
      await this.purgeStaleData();
    } finally {
      this.isRunning = false;
    }
  }

  private async purgeStaleData(): Promise<void> {
    const olderThanDays = this.config.get('SESSION_CLEANUP_OLDER_THAN_DAYS');
    this.logger.log(`Running daily cleanup (session retention=${olderThanDays}d)`);

    // 1. Revoked sessions past retention window
    const sessionResult = await this.db.execute(
      sql`
        DELETE FROM identity.auth_sessions
        WHERE is_revoked = true
          AND expires_at < NOW() - (${olderThanDays} || ' days')::interval
      `,
    );
    this.logger.log(
      { deleted: (sessionResult as { rowCount?: number }).rowCount },
      'Purged stale auth sessions',
    );

    // 2. Used / expired password reset tokens (>1 day past expiry)
    const prtResult = await this.db.execute(
      sql`
        DELETE FROM identity.password_reset_tokens
        WHERE expires_at < NOW() - INTERVAL '1 day'
      `,
    );
    this.logger.log(
      { deleted: (prtResult as { rowCount?: number }).rowCount },
      'Purged expired password reset tokens',
    );

    // 3. Expired pending invitations
    const invResult = await this.db.execute(
      sql`
        UPDATE tenancy.workspace_invitations
        SET status = 'expired', updated_at = NOW()
        WHERE status = 'pending'
          AND expires_at < NOW()
      `,
    );
    this.logger.log(
      { updated: (invResult as { rowCount?: number }).rowCount },
      'Expired stale workspace invitations',
    );
  }
}
