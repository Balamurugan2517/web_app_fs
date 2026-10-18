import { getEnv, isShiprocketConfigured } from '@/lib/env';
import { AppError } from '@/lib/errors';
import { handle, readJson } from '@/lib/http';
import { logger } from '@/lib/logger';
import { checkServiceability } from '@/lib/shiprocket';
import { fieldErrors, serviceabilitySchema } from '@/lib/validation';

/** "Can you deliver to my PIN code, and is Cash on Delivery possible?" */
export async function POST(request: Request) {
  return handle(request, 'shipping.serviceability', async () => {
    const parsed = serviceabilitySchema.safeParse(await readJson(request));
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 'Enter a valid 6-digit PIN code.', 422, fieldErrors(parsed.error));
    const codAllowed = getEnv().COD_ENABLED;

    // Graceful degradation: without Shiprocket (not configured, or temporarily down) we still validate the PIN
    // format and say "unverified", rather than blocking every customer.
    if (!isShiprocketConfigured()) return Response.json({ serviceable: true, codAvailable: codAllowed, verified: false });
    try {
      const r = await checkServiceability({ pincode: parsed.data.pincode, weightKg: parsed.data.weightKg, cod: parsed.data.cod });
      return Response.json({ ...r, codAvailable: r.codAvailable && codAllowed });
    } catch (e) {
      logger.warn('serviceability lookup failed, degrading', { error: e instanceof Error ? e.message : String(e) });
      return Response.json({ serviceable: true, codAvailable: codAllowed, verified: false });
    }
  }, { rateLimit: { limit: 30, windowMs: 60_000 } });
}
