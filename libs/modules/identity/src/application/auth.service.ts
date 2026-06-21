import { Inject, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'node:crypto';
import * as argon2 from 'argon2';
import { uuidv7 } from 'uuidv7';
import {
  AppConfigService,
  ValkeyService,
  UnauthorizedException,
  NotFoundException,
} from '@platform';
import type { JwtPayload } from '@platform';
import { IUserRepository, USER_REPOSITORY } from '../domain/ports/user.repository';
import {
  IAuthSessionRepository,
  AUTH_SESSION_REPOSITORY,
} from '../domain/ports/auth-session.repository';
import type { User } from '../domain/user.types';

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: Pick<User, 'id' | 'email' | 'displayName' | 'avatarUrl' | 'locale' | 'timezone'>;
}

export interface RefreshResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(AUTH_SESSION_REPOSITORY) private readonly sessionRepo: IAuthSessionRepository,
    private readonly jwt: JwtService,
    private readonly valkey: ValkeyService,
    private readonly config: AppConfigService,
  ) {}

  // ---------------------------------------------------------------------------
  // Login
  // ---------------------------------------------------------------------------

  async login(email: string, password: string, ipAddress?: string): Promise<LoginResult> {
    const user = await this.userRepo.findByEmail(email.toLowerCase().trim());

    // Use constant-time comparison to prevent user enumeration
    if (!user || !user.passwordHash) {
      await argon2
        .verify('$argon2id$v=19$m=65536,t=3,p=4$placeholder$placeholder', password)
        .catch(() => null);
      throw new UnauthorizedException('AUTH_INVALID_CREDENTIALS', 'Invalid email or password');
    }

    if (user.deletedAt || user.status === 'suspended' || user.status === 'inactive') {
      throw new UnauthorizedException('USER_DEACTIVATED', 'Account is not active');
    }

    if (user.status === 'invited') {
      throw new UnauthorizedException('USER_DEACTIVATED', 'Account has not been activated yet');
    }

    const valid = await argon2.verify(user.passwordHash, password);
    if (!valid) {
      throw new UnauthorizedException('AUTH_INVALID_CREDENTIALS', 'Invalid email or password');
    }

    const sessionId = uuidv7();
    const { accessToken, jti, expiresIn } = this.signAccessToken(user, sessionId);
    const { refreshToken, tokenHash, familyId } = this.generateRefreshToken();

    const refreshExpiry = new Date();
    refreshExpiry.setSeconds(refreshExpiry.getSeconds() + this.refreshTtlSeconds());

    await Promise.all([
      this.sessionRepo.create({
        id: sessionId,
        tenantId: user.tenantId,
        userId: user.id,
        tokenHash,
        familyId,
        ipAddress,
        expiresAt: refreshExpiry,
      }),
      this.userRepo.updateLastLogin(user.id),
    ]);

    this.logger.log({ userId: user.id, jti, sessionId }, 'User logged in');

    return {
      accessToken,
      refreshToken,
      expiresIn,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        locale: user.locale,
        timezone: user.timezone,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Refresh
  // ---------------------------------------------------------------------------

  async refresh(rawRefreshToken: string, ipAddress?: string): Promise<RefreshResult> {
    const tokenHash = this.hashToken(rawRefreshToken);
    const session = await this.sessionRepo.findByTokenHash(tokenHash);

    if (!session) {
      throw new UnauthorizedException('AUTH_TOKEN_INVALID', 'Refresh token not found');
    }

    // Token reuse detected — revoke entire family (session hijacking prevention)
    if (session.isRevoked) {
      await this.sessionRepo.revokeFamily(session.familyId);
      this.logger.warn(
        { sessionId: session.id, familyId: session.familyId },
        'Refresh token reuse detected — revoking entire family',
      );
      throw new UnauthorizedException('AUTH_REFRESH_TOKEN_REUSE', 'Refresh token has been revoked');
    }

    if (session.expiresAt < new Date()) {
      throw new UnauthorizedException('AUTH_TOKEN_EXPIRED', 'Refresh token has expired');
    }

    const user = await this.userRepo.findById(session.userId);
    if (!user || user.deletedAt) {
      throw new UnauthorizedException('USER_DEACTIVATED', 'User not found or deactivated');
    }

    // Revoke old session and issue new tokens (rotation)
    const newSessionId = uuidv7();
    const { accessToken, expiresIn } = this.signAccessToken(user, newSessionId);
    const { refreshToken: newRefreshToken, tokenHash: newHash } = this.generateRefreshToken();

    const refreshExpiry = new Date();
    refreshExpiry.setSeconds(refreshExpiry.getSeconds() + this.refreshTtlSeconds());

    await Promise.all([
      this.sessionRepo.revokeById(session.id),
      this.sessionRepo.create({
        id: newSessionId,
        tenantId: user.tenantId,
        userId: user.id,
        tokenHash: newHash,
        familyId: session.familyId, // preserve family for revocation chain
        ipAddress,
        expiresAt: refreshExpiry,
      }),
    ]);

    return { accessToken, refreshToken: newRefreshToken, expiresIn };
  }

  // ---------------------------------------------------------------------------
  // Logout
  // ---------------------------------------------------------------------------

  async logout(payload: JwtPayload): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const ttl = Math.max(payload.exp - now, 0);

    await Promise.all([
      // Denylist access token until its natural expiry
      ttl > 0 ? this.valkey.denylistToken(payload.jti, ttl) : Promise.resolve(),
      // Revoke refresh session in DB
      this.sessionRepo.revokeById(payload.sessionId),
    ]);

    this.logger.log({ userId: payload.sub, jti: payload.jti }, 'User logged out');
  }

  // ---------------------------------------------------------------------------
  // Get current user
  // ---------------------------------------------------------------------------

  async getMe(userId: string): Promise<User> {
    const user = await this.userRepo.findById(userId);
    if (!user || user.deletedAt) {
      throw new NotFoundException('USER_NOT_FOUND', 'User not found');
    }
    return user;
  }

  // ---------------------------------------------------------------------------
  // Change password
  // ---------------------------------------------------------------------------

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.userRepo.findById(userId);
    if (!user || user.deletedAt) {
      throw new NotFoundException('USER_NOT_FOUND', 'User not found');
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException(
        'AUTH_INVALID_CREDENTIALS',
        'No password set for this account',
      );
    }

    const valid = await argon2.verify(user.passwordHash, currentPassword);
    if (!valid) {
      throw new UnauthorizedException('AUTH_INVALID_CREDENTIALS', 'Current password is incorrect');
    }

    const newHash = await AuthService.hashPassword(newPassword);
    await this.userRepo.updatePasswordHash(userId, newHash);
    this.logger.log({ userId }, 'Password changed');
  }

  // ---------------------------------------------------------------------------
  // Update profile
  // ---------------------------------------------------------------------------

  async updateProfile(
    userId: string,
    input: { displayName?: string; avatarUrl?: string | null; locale?: string; timezone?: string },
  ): Promise<User> {
    const user = await this.userRepo.findById(userId);
    if (!user || user.deletedAt) {
      throw new NotFoundException('USER_NOT_FOUND', 'User not found');
    }
    return this.userRepo.updateProfile(userId, input);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private signAccessToken(
    user: User,
    sessionId: string,
  ): { accessToken: string; jti: string; expiresIn: number } {
    const jti = uuidv7();
    const expiresIn = 15 * 60; // 15 minutes in seconds

    const payload: Omit<JwtPayload, 'iat' | 'exp' | 'iss' | 'aud'> = {
      sub: user.id,
      tenantId: user.tenantId,
      sessionId,
      jti,
    };

    const accessToken = this.jwt.sign(payload);
    return { accessToken, jti, expiresIn };
  }

  private generateRefreshToken(): {
    refreshToken: string;
    tokenHash: string;
    familyId: string;
  } {
    const refreshToken = randomBytes(32).toString('base64url');
    const tokenHash = this.hashToken(refreshToken);
    const familyId = uuidv7();
    return { refreshToken, tokenHash, familyId };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private refreshTtlSeconds(): number {
    const expiry = this.config.get('JWT_REFRESH_EXPIRY'); // e.g. '30d'
    const match = /^(\d+)([smhd])$/.exec(expiry);
    if (!match) return 30 * 24 * 3600;
    const [, n, unit] = match;
    const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
    return parseInt(n!, 10) * (multipliers[unit!] ?? 86400);
  }

  /** Hash a password with argon2id (use once, at user creation / password reset). */
  static async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, { type: argon2.argon2id });
  }

  // ---------------------------------------------------------------------------
  // Logout all devices
  // ---------------------------------------------------------------------------

  async logoutAll(payload: JwtPayload): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const ttl = Math.max(payload.exp - now, 0);

    await Promise.all([
      ttl > 0 ? this.valkey.denylistToken(payload.jti, ttl) : Promise.resolve(),
      this.sessionRepo.revokeAllForUser(payload.sub),
    ]);

    this.logger.log({ userId: payload.sub }, 'User logged out from all devices');
  }

  // ---------------------------------------------------------------------------
  // Forgot password
  // ---------------------------------------------------------------------------

  async forgotPassword(email: string): Promise<void> {
    // Always return success to prevent user enumeration (AUTH-FR-007)
    const user = await this.userRepo.findByEmail(email.toLowerCase().trim());
    if (!user || user.deletedAt || user.status !== 'active') {
      return; // silent no-op
    }

    const rawToken = randomBytes(32).toString('base64url');
    const tokenHash = this.hashToken(rawToken);
    const ttlHours = this.config.get('PASSWORD_RESET_TOKEN_TTL_HOURS');
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

    await this.userRepo.createPasswordResetToken(user.id, tokenHash, expiresAt);

    // TODO: send email with reset link containing rawToken
    // In dev we log the token so the flow can be tested without an email service
    this.logger.warn(
      { userId: user.id, token: rawToken },
      'Password reset token issued (dev-mode log)',
    );
  }

  // ---------------------------------------------------------------------------
  // Reset password
  // ---------------------------------------------------------------------------

  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const tokenHash = this.hashToken(rawToken);
    const record = await this.userRepo.findPasswordResetToken(tokenHash);

    if (!record) {
      throw new UnauthorizedException(
        'PASSWORD_RESET_TOKEN_INVALID',
        'Invalid or unknown reset token',
      );
    }

    if (record.usedAt !== null) {
      throw new UnauthorizedException(
        'PASSWORD_RESET_TOKEN_INVALID',
        'Reset token has already been used',
      );
    }

    if (record.expiresAt < new Date()) {
      throw new UnauthorizedException('PASSWORD_RESET_TOKEN_EXPIRED', 'Reset token has expired');
    }

    const newHash = await AuthService.hashPassword(newPassword);

    await Promise.all([
      this.userRepo.updatePasswordHash(record.userId, newHash),
      this.userRepo.markPasswordResetTokenUsed(record.id),
      this.sessionRepo.revokeAllForUser(record.userId), // AUTH-FR-009
    ]);

    this.logger.log({ userId: record.userId }, 'Password reset successfully');
  }
}
