import { Body, Controller, Get, HttpCode, Patch, Post, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { FastifyReply, FastifyRequest } from 'fastify';
import '@fastify/cookie';
import { Auth, ApiCommonErrors, Public, UnauthorizedException, RateLimit } from '@platform';
import type { JwtPayload } from '@platform';
import { AuthService } from '../../application/auth.service';
import {
  LoginDto,
  ChangePasswordDto,
  UpdateProfileDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/login.dto';
import { AuthTokenResponseDto, UserProfileResponseDto } from './dto/auth-response.dto';
import { CurrentUser } from './decorators/current-user.decorator';

const REFRESH_COOKIE = 'refresh_token';

const COOKIE_BASE = {
  httpOnly: true,
  sameSite: 'strict',
  path: '/v1/auth/refresh',
} as const;

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ── POST /auth/login ───────────────────────────────────────────────────────

  @Post('login')
  @Public()
  @RateLimit('AUTH_LOGIN')
  @HttpCode(200)
  @ApiOperation({ summary: 'Authenticate with email + password' })
  @ApiResponse({ status: 200, type: AuthTokenResponseDto })
  @ApiCommonErrors(400, 401, 422)
  async login(
    @Body() dto: LoginDto,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<AuthTokenResponseDto> {
    const result = await this.authService.login(dto.email, dto.password, req.ip, dto.rememberMe);

    // Cookie TTL mirrors the session TTL: 30d if remembered, 24h otherwise
    const cookieMaxAge = dto.rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60;
    reply.setCookie(REFRESH_COOKIE, result.refreshToken, {
      ...COOKIE_BASE,
      secure: process.env['NODE_ENV'] === 'production',
      maxAge: cookieMaxAge,
    });

    return {
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
      user: result.user,
    };
  }

  // ── POST /auth/refresh ─────────────────────────────────────────────────────

  @Post('refresh')
  @Public()
  @RateLimit('AUTH_REFRESH')
  @HttpCode(200)
  @ApiOperation({ summary: 'Rotate refresh token and issue new access token' })
  @ApiResponse({
    status: 200,
    schema: { properties: { accessToken: { type: 'string' }, expiresIn: { type: 'number' } } },
  })
  @ApiCommonErrors(401)
  async refresh(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<Omit<AuthTokenResponseDto, 'user'>> {
    const token = (req.cookies as Record<string, string>)[REFRESH_COOKIE];
    if (!token) {
      throw new UnauthorizedException('AUTH_TOKEN_INVALID', 'Refresh token missing');
    }

    const result = await this.authService.refresh(token, req.ip);

    reply.setCookie(REFRESH_COOKIE, result.refreshToken, {
      ...COOKIE_BASE,
      secure: process.env['NODE_ENV'] === 'production',
      maxAge: 30 * 24 * 60 * 60,
    });

    return { accessToken: result.accessToken, expiresIn: result.expiresIn };
  }

  // ── POST /auth/logout ──────────────────────────────────────────────────────

  @Post('logout')
  @Auth()
  @HttpCode(204)
  @ApiOperation({ summary: 'Revoke current session and access token' })
  @ApiResponse({ status: 204, description: 'Session revoked' })
  @ApiCommonErrors(401)
  async logout(
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<void> {
    await this.authService.logout(user);
    reply.clearCookie(REFRESH_COOKIE, { path: COOKIE_BASE.path });
  }

  // ── GET /auth/me ───────────────────────────────────────────────────────────

  @Get('me')
  @Auth()
  @ApiOperation({ summary: 'Get authenticated user profile' })
  @ApiResponse({ status: 200, type: UserProfileResponseDto })
  @ApiCommonErrors(401)
  async getMe(@CurrentUser() user: JwtPayload): Promise<UserProfileResponseDto> {
    const profile = await this.authService.getMe(user.sub);
    return {
      id: profile.id,
      email: profile.email,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      locale: profile.locale,
      timezone: profile.timezone,
      emailVerified: profile.emailVerified,
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
    };
  }

  // ── PATCH /auth/me ─────────────────────────────────────────────────────────

  @Patch('me')
  @Auth()
  @ApiOperation({ summary: 'Update authenticated user profile' })
  @ApiResponse({ status: 200, type: UserProfileResponseDto })
  @ApiCommonErrors(400, 401, 422)
  async updateProfile(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserProfileResponseDto> {
    const profile = await this.authService.updateProfile(user.sub, dto);
    return {
      id: profile.id,
      email: profile.email,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      locale: profile.locale,
      timezone: profile.timezone,
      emailVerified: profile.emailVerified,
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
    };
  }

  // ── PATCH /auth/password ───────────────────────────────────────────────────

  @Patch('password')
  @Auth()
  @HttpCode(204)
  @ApiOperation({ summary: 'Change authenticated user password' })
  @ApiResponse({ status: 204, description: 'Password changed' })
  @ApiCommonErrors(400, 401, 422)
  async changePassword(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    await this.authService.changePassword(user.sub, dto.currentPassword, dto.newPassword);
  }

  // ── POST /auth/logout-all ──────────────────────────────────────────────────

  @Post('logout-all')
  @Auth()
  @HttpCode(204)
  @ApiOperation({ summary: 'Revoke all sessions for the authenticated user' })
  @ApiResponse({ status: 204, description: 'All sessions revoked' })
  @ApiCommonErrors(401)
  async logoutAll(
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<void> {
    await this.authService.logoutAll(user);
    reply.clearCookie(REFRESH_COOKIE, { path: COOKIE_BASE.path });
  }

  // ── POST /auth/forgot-password ─────────────────────────────────────────────

  @Post('forgot-password')
  @Public()
  @RateLimit('AUTH_FORGOT')
  @HttpCode(200)
  @ApiOperation({ summary: 'Request a password reset link (always returns 200)' })
  @ApiResponse({ status: 200, schema: { properties: { message: { type: 'string' } } } })
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<{ message: string }> {
    await this.authService.forgotPassword(dto.email);
    return { message: 'If that email exists, a password reset link has been sent.' };
  }

  // ── POST /auth/reset-password ──────────────────────────────────────────────

  @Post('reset-password')
  @Public()
  @RateLimit('AUTH_FORGOT')
  @HttpCode(204)
  @ApiOperation({ summary: 'Reset password using a token from forgot-password email' })
  @ApiResponse({ status: 204, description: 'Password reset successful' })
  @ApiCommonErrors(400, 401, 422)
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<void> {
    await this.authService.resetPassword(dto.token, dto.newPassword);
  }
}
