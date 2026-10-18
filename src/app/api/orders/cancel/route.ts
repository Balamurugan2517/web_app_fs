import { after } from 'next/server';
import { safeEqual } from '@/lib/crypto';
import { cancellationPolicy } from '@/lib/cancellation';
import { AppError } from '@/lib/errors';
import { handle, readJson } from '@/lib/http';
import { processOutbox } from '@/lib/notifications/outbox';
import { cancelOrder, requestReturn } from '@/lib/orders/service';
import { getOrder } from '@/lib/repos/orders';
import { cancelRequestSchema, fieldErrors } from '@/lib/validation';

/**
 * The customer's "Cancel order" / "Request return" button. The secret token from the order link proves it is their order.
 * What actually happens (instant cancel, cancel + refund, or a return request) is decided by cancellationPolicy().
 */
export async function POST(request: Request) {
  return handle(request, 'orders.cancel', async () => {
    const parsed = cancelRequestSchema.safeParse(await readJson(request));
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 'Please tell us briefly why.', 422, fieldErrors(parsed.error));
    const { orderId, token, reason } = parsed.data;
    const order = await getOrder(orderId);
    if (!order || !safeEqual(order.publicToken, token)) throw new AppError('NOT_FOUND', 'Order not found.', 404);

    const policy = cancellationPolicy(order, new Date());
    const result = policy.mode === 'return' ? await requestReturn(orderId, reason) : await cancelOrder(orderId, reason, 'customer');
    after(() => processOutbox());
    return Response.json({ status: result.status, mode: policy.mode });
  }, { rateLimit: { limit: 5, windowMs: 60_000 } });
}
