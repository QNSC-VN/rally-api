import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { ValkeyService } from '../cache/valkey.service';
import { RateLimitedException } from '../errors/exceptions';
import {
  RATE_LIMIT_METADATA_KEY,
  RATE_LIMIT_TIERS,
  SKIP_RATE_LIMIT_KEY,
  type RateLimitTier,
} from './rate-limit.constants';

/**
 * Global rate-limit guard backed by Valkey (Redis-compatible) sliding window.
 *
 * Registered as APP_GUARD in PlatformModule so it applies to every route.
 * Behaviour can be overridden per-route:
 *   @RateLimit('AUTH_LOGIN')  — tighter tier
 *   @SkipRateLimit()          — bypass entirely (health probes, etc.)
 *
 * Key strategy
 * ────────────
 * Pre-auth (login, refresh, public routes): keyed by client IP.
 *   key = "{tier}:ip:{req.ip}"
 *
 * Post-auth (protected routes where Passport has populated req.user):
 * keyed by authenticated user ID — fairer for enterprise users behind NAT
 * or shared corporate egress IPs.
 *   key = "{tier}:uid:{userId}"
 *
 * Response headers (RFC 6585 / IETF draft-ietf-httpapi-ratelimit-headers)
 * ────────────────────────────────────────────────────────────────────────
 *   RateLimit-Limit     — the window ceiling
 *   RateLimit-Remaining — requests left in the current window
 *   RateLimit-Reset     — Unix timestamp when the window resets
 *   Retry-After         — seconds to wait (only on 429)
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly valkey: ValkeyService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // ── @SkipRateLimit() check ───────────────────────────────────────────────
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) return true;

    // ── Resolve tier (decorator > default) ──────────────────────────────────
    const tier =
      this.reflector.getAllAndOverride<RateLimitTier>(RATE_LIMIT_METADATA_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? 'DEFAULT';

    const { limit, windowSeconds } = RATE_LIMIT_TIERS[tier];

    const req = context.switchToHttp().getRequest<FastifyRequest & { user?: { sub?: string } }>();
    const reply = context.switchToHttp().getResponse<FastifyReply>();

    // ── Build tracking key ───────────────────────────────────────────────────
    // Prefer authenticated user ID so corporate NAT users aren't penalised for
    // each other. Fall back to IP for unauthenticated endpoints.
    const identifier = req.user?.sub ? `uid:${req.user.sub}` : `ip:${req.ip}`;
    const key = `${tier}:${identifier}`;

    // ── Consume one token from the bucket ────────────────────────────────────
    const { allowed, remaining, resetAt } = await this.valkey.consumeRateLimit(
      key,
      limit,
      windowSeconds,
    );

    // Always set informational headers (clients can surface remaining budget)
    const setHeader = (name: string, value: string | number) =>
      void reply.header(name, String(value));

    setHeader('RateLimit-Limit', limit);
    setHeader('RateLimit-Remaining', remaining);
    setHeader('RateLimit-Reset', resetAt);

    if (!allowed) {
      const retryAfter = Math.max(resetAt - Math.floor(Date.now() / 1000), 1);
      setHeader('Retry-After', retryAfter);

      this.logger.warn({ key, tier, ip: req.ip, userId: req.user?.sub }, 'Rate limit exceeded');

      throw new RateLimitedException(`Rate limit exceeded (${tier}). Retry after ${retryAfter}s.`);
    }

    return true;
  }
}
