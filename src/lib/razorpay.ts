import { AppError } from './errors';
import { hmacSha256Hex, safeEqual } from './crypto';
import { razorpayConfig } from './env';
import { logger } from './logger';
import { toPaise } from './money';

const API = 'https://api.razorpay.com/v1';

export interface RazorpayOrder { id: string; amount: number; currency: string; receipt?: string }

/**
 * Step 1 of paying: ask Razorpay to create an "order" for an amount we calculated ourselves.
 * The browser then opens Razorpay Checkout for that order id.
 */
export async function createRazorpayOrder(input: { amountRupees: number; receipt: string; notes?: Record<string, string> }): Promise<RazorpayOrder> {
  const { keyId, keySecret } = razorpayConfig();
  let res: Response;
  try {
    res = await fetch(`${API}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}` },
      body: JSON.stringify({ amount: toPaise(input.amountRupees), currency: 'INR', receipt: input.receipt, notes: input.notes }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (cause) {
    throw new AppError('PAYMENT_PROVIDER_ERROR', 'Could not reach the payment provider. Please try again.', 502, undefined, cause);
  }
  const body = (await res.json().catch(() => ({}))) as { id?: string; amount?: number; currency?: string; receipt?: string; error?: { description?: string; code?: string } };
  if (!res.ok || !body.id) {
    logger.error('razorpay order creation rejected', { status: res.status, providerCode: body.error?.code, providerMessage: body.error?.description });
    throw new AppError('PAYMENT_PROVIDER_ERROR', 'The payment provider could not start this payment. Please try again.', 502);
  }
  return { id: body.id, amount: body.amount ?? toPaise(input.amountRupees), currency: body.currency ?? 'INR', receipt: body.receipt };
}

/** Razorpay signs `order_id|payment_id` with your key SECRET. We recompute and compare. */
export function verifyPaymentSignature(args: { orderId: string; paymentId: string; signature: string; secret: string }): boolean {
  return safeEqual(hmacSha256Hex(args.secret, `${args.orderId}|${args.paymentId}`), args.signature);
}

/** Webhooks are signed over the RAW request body with the WEBHOOK secret (a different secret). */
export function verifyWebhookSignature(rawBody: string, signature: string, secret: string): boolean {
  return safeEqual(hmacSha256Hex(secret, rawBody), signature);
}

/**
 * Refunds a captured payment (full or partial). Razorpay processes it and the money reaches the customer in ~5–7 business days.
 * `receipt` makes the call safe to repeat: we pass our own order id in the notes.
 */
export async function refundRazorpayPayment(input: { paymentId: string; amountRupees: number; orderId: string; reason: string }): Promise<{ id: string; status: string }> {
  const { keyId, keySecret } = razorpayConfig();
  let res: Response;
  try {
    res = await fetch(`${API}/payments/${encodeURIComponent(input.paymentId)}/refund`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}` },
      body: JSON.stringify({ amount: toPaise(input.amountRupees), speed: 'normal', notes: { orderId: input.orderId, reason: input.reason.slice(0, 200) } }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (cause) {
    throw new AppError('PAYMENT_PROVIDER_ERROR', 'Could not reach the payment provider to start the refund.', 502, undefined, cause);
  }
  const body = (await res.json().catch(() => ({}))) as { id?: string; status?: string; error?: { description?: string; code?: string } };
  if (!res.ok || !body.id) {
    logger.error('razorpay refund rejected', { status: res.status, providerCode: body.error?.code, providerMessage: body.error?.description, orderId: input.orderId });
    throw new AppError('PAYMENT_PROVIDER_ERROR', body.error?.description ?? 'The refund was rejected by the payment provider.', 502);
  }
  return { id: body.id, status: body.status ?? 'processed' };
}
