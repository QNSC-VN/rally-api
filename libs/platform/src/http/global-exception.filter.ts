import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Injectable,
  Logger,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { ZodValidationException } from 'nestjs-zod';
import { DomainException } from '../errors/exceptions';
import { ErrorCodes } from '../errors/error-codes';
import { RequestContextService } from '../context/request-context';

/**
 * Global exception filter — maps every thrown error to one stable wire envelope:
 * { error: { code, message, details, correlationId, traceId } }
 *
 * code is the FE contract — machine-readable, switches on code not message.
 * Internal error details (stack, SQL) never leak to the wire.
 */
@Catch()
@Injectable()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(private readonly ctx: RequestContextService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const reply = http.getResponse<FastifyReply>();
    const correlationId = this.ctx.getCorrelationId() ?? 'unknown';

    // Zod validation error → 422 + field-level details
    if (exception instanceof ZodValidationException) {
      void reply.status(422).send({
        error: {
          code: ErrorCodes.VALIDATION_FAILED,
          message: 'Validation failed',
          details: exception.getZodError().errors,
          correlationId,
        },
      });
      return;
    }

    // Domain / application errors (typed, expected)
    if (exception instanceof DomainException) {
      void reply.status(exception.httpStatus).send({
        error: {
          code: exception.code,
          message: exception.message,
          details: exception.details ?? [],
          correlationId,
        },
      });
      return;
    }

    // NestJS HttpException (guards, pipes, etc.)
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      void reply.status(status).send({
        error: {
          code: ErrorCodes.INTERNAL_ERROR,
          message: typeof res === 'string' ? res : ((res as Record<string, unknown>)['message'] as string) ?? 'Error',
          details: [],
          correlationId,
        },
      });
      return;
    }

    // Unhandled — log full detail server-side, return safe shape
    this.logger.error({ correlationId, err: exception }, 'Unhandled exception');
    void reply.status(500).send({
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: 'An unexpected error occurred',
        details: [],
        correlationId,
      },
    });
  }
}
