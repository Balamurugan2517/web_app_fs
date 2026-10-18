import { after } from 'next/server';
import { isShiprocketConfigured } from '@/lib/env';
import { AppError } from '@/lib/errors';
import { handle, readJson } from '@/lib/http';
import { processOutbox } from '@/lib/notifications/outbox';
import { autoCreateShipment, placeOrder } from '@/lib/orders/service';
import { getProductsByIds } from '@/lib/repos/catalog';
import { checkServiceability } from '@/lib/shiprocket';
import { checkoutRequestSchema, fieldErrors } from '@/lib/validation';

/**
 * Step 1 of checkout. Validates everything on the server, prices the bag from OUR database, reserves the stock,
 * saves the order and (for online payment) opens a Razorpay order for the browser to pay.
 */
export async function POST(request: Request) {
  return handle(request, 'checkout.create', async () => {
    const parsed = checkoutRequestSchema.safeParse(await readJson(request));
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 'Please correct the highlighted fields.', 422, fieldErrors(parsed.error));
    const input = parsed.data;

    if (isShiprocketConfigured()) {   // refuse PIN codes the courier network cannot serve (only when we can actually ask)
      const products = await getProductsByIds(input.items.map((i) => i.productId));
      const weight = input.items.reduce((s, i) => s + (products.get(i.productId)?.weightKg ?? 0.5) * i.quantity, 0) || 1;
      const check = await checkServiceability({ pincode: input.pincode, weightKg: weight, cod: input.paymentMethod === 'COD' }).catch(() => undefined);
      if (check && !check.serviceable) throw new AppError('VALIDATION_ERROR', 'Sorry, we cannot deliver to this PIN code yet.', 422, { pincode: 'We cannot deliver to this PIN code yet' });
    }

    const { order, payment } = await placeOrder(input);
    after(async () => { if (order.paymentMethod === 'COD') await autoCreateShipment(order.id); await processOutbox(); });

    return Response.json({
      orderId: order.id, token: order.publicToken, redirectUrl: `/order/${order.id}?t=${order.publicToken}`, payment,
      prefill: { name: order.customer.name, email: order.customer.email, contact: order.customer.phone },
    });
  }, { rateLimit: { limit: 10, windowMs: 60_000 } });
}
