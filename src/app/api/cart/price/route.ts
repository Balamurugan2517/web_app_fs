import { previewCart } from '@/lib/cart-preview';
import { AppError } from '@/lib/errors';
import { handle, readJson } from '@/lib/http';
import { fieldErrors, priceRequestSchema } from '@/lib/validation';

/** The bag asks the server "what do these items cost today?" – sale prices, stock, coupon. The browser never decides prices. */
export async function POST(request: Request) {
  return handle(request, 'cart.price', async () => {
    const parsed = priceRequestSchema.safeParse(await readJson(request));
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 'Invalid bag.', 422, fieldErrors(parsed.error));
    return Response.json(await previewCart(parsed.data.items, parsed.data.couponCode));
  }, { rateLimit: { limit: 60, windowMs: 60_000 } });
}
