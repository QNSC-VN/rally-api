import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from './email.service';
import { AppConfigService } from '../config/app-config.service';

// ── SES mock ──────────────────────────────────────────────────────────────────
// Defined BEFORE vi.mock so the factory closure captures the reference.
const sesSendMock = vi.fn().mockResolvedValue({});

vi.mock('@aws-sdk/client-ses', () => {
  class MockSESClient {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    send = sesSendMock as any;
  }
  class MockSendEmailCommand {
    constructor(public readonly input: unknown) {}
  }
  return {
    SESClient: MockSESClient,
    SendEmailCommand: MockSendEmailCommand,
  };
});

// ── Config factory ────────────────────────────────────────────────────────────

const makeConfig = (overrides: Record<string, unknown> = {}) => ({
  get: vi.fn((key: string) => {
    const vals: Record<string, unknown> = {
      SES_FROM_EMAIL: undefined,
      NODE_ENV: 'test',
      AWS_REGION: 'us-east-1',
      ...overrides,
    };
    return vals[key];
  }),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function buildService(configOverrides: Record<string, unknown> = {}): Promise<EmailService> {
  const module: TestingModule = await Test.createTestingModule({
    providers: [EmailService, { provide: AppConfigService, useValue: makeConfig(configOverrides) }],
  }).compile();
  return module.get(EmailService);
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('EmailService', () => {
  beforeEach(() => {
    sesSendMock.mockClear();
  });

  // ── dev mode ────────────────────────────────────────────────────────────────

  describe('dev mode (SES_FROM_EMAIL not set)', () => {
    let service: EmailService;
    beforeEach(async () => {
      service = await buildService();
    });

    it('logs instead of calling SES on sendPasswordReset', async () => {
      const logSpy = vi.spyOn(service['logger'], 'warn');
      await service.sendPasswordReset('alice@example.com', 'http://localhost/reset?token=abc');

      expect(logSpy).toHaveBeenCalledOnce();
      expect(sesSendMock).not.toHaveBeenCalled();
    });

    it('logs instead of calling SES on sendWorkspaceInvitation', async () => {
      const logSpy = vi.spyOn(service['logger'], 'warn');
      await service.sendWorkspaceInvitation(
        'bob@example.com',
        'Acme',
        'http://localhost/invite?token=xyz',
        7,
      );

      expect(logSpy).toHaveBeenCalledOnce();
      expect(sesSendMock).not.toHaveBeenCalled();
    });
  });

  // ── production mode ─────────────────────────────────────────────────────────

  describe('production mode (SES_FROM_EMAIL set)', () => {
    let service: EmailService;
    beforeEach(async () => {
      service = await buildService({ SES_FROM_EMAIL: 'noreply@rally.io', NODE_ENV: 'production' });
    });

    it('calls SES send on sendPasswordReset', async () => {
      await service.sendPasswordReset('alice@example.com', 'http://app/reset?token=x');
      expect(sesSendMock).toHaveBeenCalledOnce();
    });

    it('calls SES send on sendWorkspaceInvitation', async () => {
      await service.sendWorkspaceInvitation(
        'bob@example.com',
        'Acme',
        'http://app/invite?token=y',
        7,
      );
      expect(sesSendMock).toHaveBeenCalledOnce();
    });

    it('rethrows SES errors', async () => {
      sesSendMock.mockRejectedValueOnce(new Error('SES throttled'));
      await expect(
        service.sendPasswordReset('alice@example.com', 'http://app/reset'),
      ).rejects.toThrow('SES throttled');
    });
  });

  // ── email content ───────────────────────────────────────────────────────────

  describe('password reset email content (dev mode)', () => {
    it('includes reset URL in log body', async () => {
      const service = await buildService();
      const logSpy = vi.spyOn(service['logger'], 'warn');
      const resetUrl = 'http://localhost:5173/reset-password?token=abc123';

      await service.sendPasswordReset('alice@example.com', resetUrl);

      const callArg = logSpy.mock.calls[0]?.[0] as { body: string };
      expect(callArg.body).toContain(resetUrl);
    });
  });

  describe('workspace invitation email content (dev mode)', () => {
    it('includes workspace name and expiry days in log body', async () => {
      const service = await buildService();
      const logSpy = vi.spyOn(service['logger'], 'warn');

      await service.sendWorkspaceInvitation(
        'bob@example.com',
        'Acme Corp',
        'http://localhost:5173/accept-invitation?token=xyz',
        14,
      );

      const callArg = logSpy.mock.calls[0]?.[0] as { body: string; subject: string };
      expect(callArg.body).toContain('Acme Corp');
      expect(callArg.body).toContain('14 days');
      expect(callArg.subject).toContain('Acme Corp');
    });
  });
});
