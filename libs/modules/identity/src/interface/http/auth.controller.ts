import { Body, Controller, Get, HttpCode, Patch, Post, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyReply, FastifyRequest } from 'fastify';
import '@fastify/cookie';
import { Auth, ApiCommonErrors, Public, UnauthorizedException } from '@platform';
import type { JwtPayload } from '@platform';
import { AuthService } from '../../application/auth.service';
import { LoginDto, ChangePasswordDto, UpdateProfileDto } from './dto/login.dto';
import { AuthTokenResponseDto, UserProfileResponseDto } from './dto/auth-response.dto';
import { CurrentUser } from './decorators/current-user.decorator';

const REFRESH_COOKIE = 'refresh_token';

const COOKIE_BASE = {
  httpOnly: true,
  sameSite: 'strict',
  path: '/auth/refresh',
} as const;

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ── POST /auth/login ───────────────────────────────────────────────────────

  @Post('login')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Authenticate with email + password' })
  @ApiCommonErrors(400, 401, 422)
  async login(
    @Body() dto: LoginDto,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<AuthTokenResponseDto> {
    const result = await this.authService.login(dto.email, dto.password, req.ip);

    reply.setCookie(REFRESH_COOKIE, result.refreshToken, {
      ...COOKIE_BASE,
      secure: process.env['NODE_ENV'] === 'production',
      maxAge: 30 * 24 * 60 * 60,
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
  @HttpCode(200)
  @ApiOperation({ summary: 'Rotate refresh token and issue new access token' })
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
  @ApiCommonErrors(400, 401, 422)
  async changePassword(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    await this.authService.changePassword(user.sub, dto.currentPassword, dto.newPassword);
  }
}
