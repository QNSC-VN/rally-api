import { Injectable, Logger } from '@nestjs/common';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { AppConfigService } from '../config/app-config.service';

/**
 * EmailService — thin wrapper around AWS SES for transactional emails.
 *
 * Dev mode (SES_FROM_EMAIL not set or NODE_ENV !== 'production'):
 *   Logs the email payload to stdout instead of calling SES.
 *   The raw token is already logged by callers (auth.service / tenancy.service)
 *   so the flow is fully testable without an email provider.
 *
 * Production:
 *   Sends via SES. Requires:
 *   - SES_FROM_EMAIL env var (verified sender address)
 *   - APP_BASE_URL env var (used to build reset / invite URLs)
 *   - IAM role or env creds with ses:SendEmail permission
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly ses: SESClient;
  private readonly fromEmail: string | undefined;
  private readonly isProd: boolean;

  constructor(private readonly config: AppConfigService) {
    this.fromEmail = config.get('SES_FROM_EMAIL') as string | undefined;
    this.isProd = config.get('NODE_ENV') === 'production';

    const endpoint = process.env['AWS_ENDPOINT_URL'];
    this.ses = new SESClient({
      region: config.get('AWS_REGION'),
      ...(endpoint ? { endpoint } : {}),
    });
  }

  /** Send a password-reset email containing a one-time link. */
  async sendPasswordReset(to: string, resetUrl: string): Promise<void> {
    const subject = 'Reset your Rally password';
    const body = [
      'You requested a password reset for your Rally account.',
      '',
      `Click the link below to reset your password (valid for 1 hour):`,
      resetUrl,
      '',
      'If you did not request this, you can safely ignore this email.',
    ].join('\n');

    await this.send(to, subject, body);
  }

  /** Send a workspace invitation email containing a one-time accept link. */
  async sendWorkspaceInvitation(
    to: string,
    workspaceName: string,
    inviteUrl: string,
    expiresInDays: number,
  ): Promise<void> {
    const subject = `You've been invited to join ${workspaceName} on Rally`;
    const body = [
      `You've been invited to join the workspace "${workspaceName}" on Rally.`,
      '',
      `Click the link below to accept your invitation (valid for ${expiresInDays} days):`,
      inviteUrl,
      '',
      'If you were not expecting this invitation, you can safely ignore this email.',
    ].join('\n');

    await this.send(to, subject, body);
  }

  // ── Internal ────────────────────────────────────────────────────────────────

  private async send(to: string, subject: string, body: string): Promise<void> {
    if (!this.fromEmail || !this.isProd) {
      // Dev / no-SES mode — log so the flow is testable without an email provider
      this.logger.warn(
        { to, subject, body },
        'EmailService dev-mode: would send email (set SES_FROM_EMAIL + NODE_ENV=production to enable SES)',
      );
      return;
    }

    try {
      await this.ses.send(
        new SendEmailCommand({
          Source: this.fromEmail,
          Destination: { ToAddresses: [to] },
          Message: {
            Subject: { Data: subject, Charset: 'UTF-8' },
            Body: { Text: { Data: body, Charset: 'UTF-8' } },
          },
        }),
      );
      this.logger.log({ to, subject }, 'Email sent via SES');
    } catch (err) {
      // Log and rethrow — caller decides whether to surface to user
      this.logger.error({ err, to, subject }, 'SES send failed');
      throw err;
    }
  }
}
