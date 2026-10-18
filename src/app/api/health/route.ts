import { getEnv, isShiprocketConfigured } from '@/lib/env';
import { dbPing, queueDepth } from '@/lib/repos/admin';

/** Liveness/readiness check for uptime monitors. Says WHICH parts are configured and whether the database answers – never any secret value. */
export async function GET() {
  const env = getEnv();
  let db = false; let queue: Record<string, number> = {};
  try { db = await dbPing(); queue = Object.fromEntries((await queueDepth()).map((r) => [r.status, r.n])); } catch { db = false; }
  return Response.json({
    status: db ? 'ok' : 'degraded', time: new Date().toISOString(), database: db,
    integrations: { razorpay: Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET), shiprocket: isShiprocketConfigured(), cod: env.COD_ENABLED, email: Boolean(env.SMTP_URL), sms: env.SMS_ENABLED, whatsapp: env.WHATSAPP_ENABLED },
    notificationQueue: queue,
  }, { status: db ? 200 : 503 });
}
