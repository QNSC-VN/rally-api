import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/** Routes whose access logs are suppressed (probes + favicon spam). */
const SKIP_LOG_PREFIXES = new Set(['/v1/healthz', '/v1/readyz', '/favicon.ico']);

/** Body fields that must never appear in logs. */
const REDACTED_BODY_FIELDS = new Set([
  'password',
  'confirmPassword',
  'currentPassword',
  'newPassword',
  'token',
  'refreshToken',
  'secret',
  'privateKey',
  'creditCard',
]);

/**
 * HttpLoggingInterceptor
 *
 * Emits ONE structured log per request on completion:
 *   <-- POST /v1/auth/login 200 45ms userId=xxx correlationId=xxx
 *
 * Logs at WARN for 4xx, ERROR for 5xx, LOG for the rest.
 * Body is included for POST/PUT/PATCH with sensitive fields redacted.
 * pino-http autoLogging should be disabled when this interceptor is active.
 */
@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest<FastifyRequest & { user?: { id?: string } }>();
    const method = req.method;
    const url = (req as unknown as Record<string, unknown>)['originalUrl'] as string | undefined ?? req.url;

    if (SKIP_LOG_PREFIXES.has(url)) {
      return next.handle();
    }

    const startTime = Date.now();
    const correlationId = req.headers['x-correlation-id'] as string | undefined;
    const ip =
      (req.headers['x-real-ip'] as string) ||
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      'unknown';

    return next.handle().pipe(
      tap({
        next: () => {
          const statusCode = context.switchToHttp().getResponse<{ statusCode: number }>().statusCode;
          const duration = Date.now() - startTime;
          const userId = req.user?.id;

          this.log(statusCode, {
            msg: `<-- ${method} ${url} ${statusCode} ${duration}ms`,
            method,
            url,
            statusCode,
            duration,
            userId,
            correlationId,
            ip,
            query: this.extractQuery(req),
            body: this.extractBody(req),
          });
        },
        error: (err: unknown) => {
          const duration = Date.now() - startTime;
          const statusCode = (err as { getStatus?: () => number }).getStatus?.() ?? 500;
          const errorCode =
            (err as { getResponse?: () => { code?: string } }).getResponse?.()?.code ?? 'INTERNAL';
          const userId = req.user?.id;

          this.log(statusCode, {
            msg: `<-- ${method} ${url} ${statusCode} ${duration}ms [${errorCode}]`,
            method,
            url,
            statusCode,
            duration,
            errorCode,
            userId,
            correlationId,
            ip,
            query: this.extractQuery(req),
            body: this.extractBody(req),
          });
        },
      }),
    );
  }

  private log(statusCode: number, fields: Record<string, unknown>): void {
    if (statusCode >= 500) {
      this.logger.error(fields);
    } else if (statusCode >= 400) {
      this.logger.warn(fields);
    } else {
      this.logger.log(fields);
    }
  }

  private extractQuery(req: FastifyRequest): Record<string, unknown> | undefined {
    const q = req.query as Record<string, unknown> | undefined;
    if (!q || Object.keys(q).length === 0) return undefined;
    return q;
  }

  private extractBody(req: FastifyRequest): Record<string, unknown> | undefined {
    if (!['POST', 'PUT', 'PATCH'].includes(req.method)) return undefined;
    const body = req.body as Record<string, unknown> | undefined;
    if (!body || typeof body !== 'object') return undefined;

    const sanitized: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(body)) {
      sanitized[k] = REDACTED_BODY_FIELDS.has(k) ? '[REDACTED]' : v;
    }
    return sanitized;
  }
}
