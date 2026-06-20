import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { AppConfigService } from '../config/app-config.service';

/**
 * Valkey / Redis client service.
 * Used for: rate-limiting token buckets, access-token denylist, distributed locks.
 */
@Injectable()
export class ValkeyService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ValkeyService.name);
  private client!: Redis;

  constructor(private readonly config: AppConfigService) {}

  onModuleInit(): void {
    this.client = new Redis(this.config.get('REDIS_URL'), {
      keyPrefix: this.config.get('REDIS_KEY_PREFIX'),
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
      lazyConnect: false,
    });

    this.client.on('error', (err) => this.logger.error({ err }, 'Valkey connection error'));
    this.client.on('ready', () => this.logger.log('Valkey ready'));
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }

  get instance(): Redis {
    return this.client;
  }

  // ── Denylist ─────────────────────────────────────────────────────────────────

  async denylistToken(jti: string, ttlSeconds: number): Promise<void> {
    await this.client.set(`denylist:${jti}`, '1', 'EX', ttlSeconds);
  }

  async isTokenDenied(jti: string): Promise<boolean> {
    const val = await this.client.get(`denylist:${jti}`);
    return val !== null;
  }

  // ── Rate-limit token bucket (sliding window) ─────────────────────────────────

  /**
   * Check + consume one token from a bucket.
   * Returns { allowed, remaining, resetAt }.
   */
  async consumeRateLimit(
    key: string,
    limit: number,
    windowSeconds: number,
  ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const now = Math.floor(Date.now() / 1000);
    const windowKey = `rl:${key}:${Math.floor(now / windowSeconds)}`;
    const resetAt = (Math.floor(now / windowSeconds) + 1) * windowSeconds;

    const current = await this.client
      .multi()
      .incr(windowKey)
      .expire(windowKey, windowSeconds)
      .exec();

    const count = (current?.[0]?.[1] as number) ?? 1;
    const allowed = count <= limit;
    const remaining = Math.max(0, limit - count);

    return { allowed, remaining, resetAt };
  }
}
