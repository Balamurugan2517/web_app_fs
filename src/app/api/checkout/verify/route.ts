import { after } from 'next/server';
import { safeEqual } from '@/lib/crypto';
import { razorpayConfig } from '@/lib/env';
import { AppError } from '@/lib/errors';
import { handle, readJson } from '@/lib/http';
import { logger } from '@/lib/logger';
import { getOrder } from '@/lib/repos/orders';
import { processOutbox } from '@/lib/notifications/outbox';
import { autoCreateShipment, confirmPrepaidPayment } from '@/lib/orders/service';
import { verifyPaymentSignature } from '@/lib/razorpay';
import { fieldErrors, verifyPaymentSchema } from '@/lib/validation';

/**
 * Step 2 of checkout. After the customer pays, Razorpay hands the browser three values.
 * We recompute the signature with our SECRET key; only if it matches do we mark the order paid.
 */
export async function POST(request: Request) {
  return handle(request, 'checkout.verify', async () => {
    const parsed = verifyPaymentSchema.safeParse(await readJson(request));
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 'Invalid payment details.', 422, fieldErrors(parsed.error));
    const p = parsed.data;

    const order = await getOrder(p.orderId);
    if (!order || !safeEqual(order.publicToken, p.token) || order.payment.razorpayOrderId !== p.razorpay_order_id) {
      throw new AppError('NOT_FOUND', 'Order not found.', 404);
    }
    const valid = verifyPaymentSignature({ orderId: p.razorpay_order_id, paymentId: p.razorpay_payment_id, signature: p.razorpay_signature, secret: razorpayConfig().keySecret });
    if (!valid) {
      logger.warn('payment signature mismatch', { orderId: order.id });
      throw new AppError('INVALID_SIGNATURE', 'We could not verify this payment. If money was deducted it will be refunded automatically.', 400);
    }

    const updated = await confirmPrepaidPayment({ razorpayOrderId: p.razorpay_order_id, paymentId: p.razorpay_payment_id, source: 'verify' });
    after(async () => { await autoCreateShipment(order.id); await processOutbox(); });
    return Response.json({ status: updated?.status ?? order.status, redirectUrl: `/order/${order.id}?t=${order.publicToken}` });
  }, { rateLimit: { limit: 20, windowMs: 60_000 } });
}
