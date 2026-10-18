import { after } from 'next/server';
import { razorpayWebhookSecret } from '@/lib/env';
import { AppError } from '@/lib/errors';
import { handle } from '@/lib/http';
import { logger } from '@/lib/logger';
import { processOutbox } from '@/lib/notifications/outbox';
import { autoCreateShipment, confirmPrepaidPayment, recordPaymentFailure } from '@/lib/orders/service';
import { verifyWebhookSignature } from '@/lib/razorpay';

interface RazorpayEvent {
  event?: string;
  payload?: { payment?: { entity?: { id?: string; order_id?: string; method?: string; error_description?: string } } };
}

/**
 * Razorpay calls this URL by itself when a payment is captured or fails – even if the customer closed the browser.
 * It is the safety net behind /api/checkout/verify. We must read the RAW body to check the signature.
 */
export async function POST(request: Request) {
  return handle(request, 'webhook.razorpay', async () => {
    const raw = await request.text();
    const signature = request.headers.get('x-razorpay-signature');
    if (!signature || !verifyWebhookSignature(raw, signature, razorpayWebhookSecret())) {
      throw new AppError('INVALID_SIGNATURE', 'Invalid webhook signature.', 400);
    }
    let evt: RazorpayEvent;
    try { evt = JSON.parse(raw) as RazorpayEvent; } catch { throw new AppError('VALIDATION_ERROR', 'Malformed webhook body.', 400); }

    const payment = evt.payload?.payment?.entity;
    if (evt.event === 'payment.captured' && payment?.order_id && payment.id) {
      const order = await confirmPrepaidPayment({ razorpayOrderId: payment.order_id, paymentId: payment.id, method: payment.method, source: 'webhook' });
      if (order && order.status === 'PAID') after(async () => { await autoCreateShipment(order.id); await processOutbox(); });
    } else if (evt.event === 'payment.failed' && payment?.order_id) {
      await recordPaymentFailure(payment.order_id, payment.error_description ?? 'Payment failed');
    } else {
      logger.info('razorpay webhook ignored', { event: evt.event });
    }
    return Response.json({ received: true });
  });
}
