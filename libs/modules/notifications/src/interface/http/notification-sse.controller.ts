/**
 * NotificationSseController — Server-Sent Events endpoint for real-time
 * in-app notification delivery.
 *
 * Architecture:
 *   Worker relay writes to in_app_notifications
 *     → publishes to Valkey  notifications:user:{userId}
 *       → NotificationPubSubService delivers message to all subscribed handlers
 *         → this controller writes SSE event to the browser
 *
 * SSE event contract (for the frontend):
 *
 *   Connection established:
 *     event: connected
 *     data: { "unreadCount": <number> }
 *
 *   New notification dispatched:
 *     event: notification
 *     data: { "notificationId": "...", "type": "...", "title": "...",
 *              "body": "...", "resourceType": "...", "resourceId": "..." }
 *
 *   Heartbeat (every 25s — prevents proxy/LB from closing idle connections):
 *     : heartbeat
 *
 *   Reconnect hint (on server restart / graceful shutdown):
 *     event: reconnect
 *     data: { "retryMs": 3000 }
 *
 * The frontend should use the EventSource API with automatic reconnect.
 * On reconnect, it calls GET /notifications/unread-count to reconcile state
 * (the SSE stream is fire-and-forget; missed events are not replayed).
 *
 * Fastify notes:
 *   reply.hijack() transfers full response ownership to this handler so
 *   Fastify does not interfere with the long-lived streaming response.
 *   reply.raw is the underlying Node.js http.ServerResponse.
 */
import { Controller, Get, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import { Auth, ApiCommonErrors } from '@platform';
import type { JwtPayload } from '@platform';
import { CurrentUser } from '@modules/identity';
import { NotificationPubSubService } from '@platform/notifications';
import { NotificationsService } from '../../application/notifications.service';

@ApiTags('notifications')
@Controller('notifications')
@Auth()
export class NotificationSseController {
  constructor(
    private readonly pubSub: NotificationPubSubService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Get('stream')
  @ApiOperation({
    summary: 'SSE stream — real-time notification events',
    description:
      'Opens a Server-Sent Events stream.  The client receives a `connected` event ' +
      'with the current unread count, then a `notification` event for every new ' +
      'in-app notification.  Reconnect automatically on disconnect; ' +
      'call GET /notifications/unread-count on reconnect to reconcile missed events.',
  })
  @ApiResponse({ status: 200, description: 'SSE stream (text/event-stream)' })
  @ApiCommonErrors(401)
  async stream(@CurrentUser() user: JwtPayload, @Res() reply: FastifyReply): Promise<void> {
    // Transfer full response ownership to this handler so Fastify does not
    // attempt to send its own response or close the connection after the
    // async handler returns.
    reply.hijack();

    const raw = reply.raw;
    raw.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    raw.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    raw.setHeader('Connection', 'keep-alive');
    // Prevents Nginx, Caddy, and AWS ALB from buffering the stream.
    raw.setHeader('X-Accel-Buffering', 'no');
    raw.flushHeaders();

    // Send the current unread count immediately on connect so the client does
    // not need a separate GET /notifications/unread-count round-trip.
    const unreadCount = await this.notificationsService.getUnreadCount(user);
    writeEvent(raw, 'connected', { unreadCount });

    // Subscribe to Valkey pub/sub for this user's notifications.
    // Multiple browser tabs / devices each get their own subscription.
    const unsubscribe = await this.pubSub.subscribeUser(user.sub, (payload) => {
      if (!raw.writableEnded) {
        writeEvent(raw, 'notification', payload);
      }
    });

    // Heartbeat every 25s.
    // - Keeps the TCP connection alive through proxies and load balancers.
    // - The browser's EventSource re-fires the 'open' event if it reconnects.
    // SSE comments (": ...") are ignored by EventSource but keep the stream open.
    const heartbeat = setInterval(() => {
      if (raw.writableEnded) {
        clearInterval(heartbeat);
        return;
      }
      raw.write(': heartbeat\n\n');
    }, 25_000);

    // Graceful cleanup on client disconnect.
    raw.on('close', () => {
      clearInterval(heartbeat);
      unsubscribe().catch(() => {});
    });
  }
}

/** Write a typed SSE event to the raw response stream. */
function writeEvent(raw: NodeJS.WritableStream, event: string, data: unknown): void {
  raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}
