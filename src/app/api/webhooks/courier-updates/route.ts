import { safeEqual } from '@/lib/crypto';
import { getEnv } from '@/lib/env';
import { AppError } from '@/lib/errors';
import { handle } from '@/lib/http';
import { logger } from '@/lib/logger';
import { processOutbox } from '@/lib/notifications/outbox';
import { applyCourierStatus } from '@/lib/orders/service';
import { after } from 'next/server';

/**
 * Shiprocket posts shipment status changes here (picked up, in transit, delivered, RTO...).
 * NOTE: the path deliberately avoids the words "shiprocket", "sr" or "kr" – Shiprocket rejects webhook URLs containing them.
 * Authenticated with the secret token you type into Shiprocket's webhook settings (sent as the x-api-key header).
 */
export async function POST(request: Request) {
  return handle(request, 'webhook.courier', async () => {
    const expected = getEnv().SHIPROCKET_WEBHOOK_TOKEN;
    const given = request.headers.get('x-api-key');
    if (!expected || !given || !safeEqual(given, expected)) throw new AppError('UNAUTHORIZED', 'Invalid webhook token.', 401);

    let body: Record<string, unknown>;
    try { body = JSON.parse(await request.text()) as Record<string, unknown>; } catch { throw new AppError('VALIDATION_ERROR', 'Malformed webhook body.', 400); }

    const orderId = typeof body.order_id === 'string' ? body.order_id : undefined;
    // Shiprocket's field names vary by event, so look in the usual places, then fall back to the newest scan.
    const scans = Array.isArray(body.scans) ? (body.scans as Record<string, unknown>[]) : [];
    const lastScan = scans[scans.length - 1];
    const status = String(body.current_status ?? body.shipment_status ?? lastScan?.['sr-status-label'] ?? lastScan?.activity ?? '');
    if (!orderId) { logger.info('courier webhook without order_id (probably a test ping)'); return Response.json({ received: true }); }

    const updated = await applyCourierStatus(orderId, status, {
      awb: typeof body.awb === 'string' && body.awb ? body.awb : undefined,
      courier: typeof body.courier_name === 'string' ? body.courier_name : undefined,
    });
    if (!updated) logger.warn('courier webhook for unknown order', { orderId });
    else after(() => processOutbox());
    return Response.json({ received: true });
  });
}
