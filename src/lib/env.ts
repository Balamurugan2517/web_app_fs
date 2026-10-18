import { z } from 'zod';
import { AppError } from './errors';

/**
 * All configuration comes from environment variables (see .env.example).
 * We validate them with Zod so a typo shows up as a clear message instead of a mystery crash.
 * Reading is lazy: `npm run build` works without secrets; the error appears only when a feature
 * that needs a missing value is actually used.
 */
const bool = (def: 'true' | 'false') => z.enum(['true', 'false']).default(def).transform((v) => v === 'true');

const schema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().default('http://localhost:3000'),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  SHIPROCKET_EMAIL: z.string().optional(),
  SHIPROCKET_PASSWORD: z.string().optional(),
  SHIPROCKET_PICKUP_LOCATION: z.string().optional(),
  SHIPROCKET_PICKUP_PINCODE: z.string().optional(),
  SHIPROCKET_WEBHOOK_TOKEN: z.string().optional(),
  SHIPROCKET_AUTO_CREATE: bool('true'),
  COD_ENABLED: bool('false'),
  COD_MAX_ORDER_VALUE: z.coerce.number().int().positive().default(25000),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters').optional(),
  DATABASE_URL: z.string().optional(),
  DATABASE_SSL: bool('false'),
  JOBS_SECRET: z.string().min(16).optional(),
  UPLOAD_DIR: z.string().default('./uploads'),
  PAYMENT_FEE_PERCENT: z.coerce.number().min(0).max(10).default(2),
  SMTP_URL: z.string().optional(),
  MAIL_FROM: z.string().optional(),
  SMS_ENABLED: bool('false'),
  SMS_GATEWAY_URL: z.string().optional(),
  SMS_GATEWAY_TOKEN: z.string().optional(),
  SMS_SENDER_ID: z.string().optional(),
  WHATSAPP_ENABLED: bool('false'),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_TOKEN: z.string().optional(),
});

export type ServerEnv = z.infer<typeof schema>;
let cached: ServerEnv | undefined;

export function getEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    throw new AppError('CONFIG_MISSING', 'Server configuration is invalid.', 500, parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`));
  }
  cached = parsed.data;
  return cached;
}

/** Test helper: forget the cached value after changing process.env. */
export const resetEnvCache = (): void => { cached = undefined; };

function need<T extends Record<string, string | undefined>>(values: T, feature: string): { [K in keyof T]: string } {
  const missing = Object.entries(values).filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) throw new AppError('CONFIG_MISSING', `${feature} is not configured yet.`, 503, { missing });
  return values as { [K in keyof T]: string };
}

export const razorpayConfig = () => {
  const e = getEnv();
  return need({ keyId: e.RAZORPAY_KEY_ID, keySecret: e.RAZORPAY_KEY_SECRET }, 'Online payment');
};
export const razorpayWebhookSecret = () => need({ secret: getEnv().RAZORPAY_WEBHOOK_SECRET }, 'Razorpay webhook').secret;

export const shiprocketConfig = () => {
  const e = getEnv();
  return need({ email: e.SHIPROCKET_EMAIL, password: e.SHIPROCKET_PASSWORD, pickupLocation: e.SHIPROCKET_PICKUP_LOCATION, pickupPincode: e.SHIPROCKET_PICKUP_PINCODE }, 'Shipping');
};
export const isShiprocketConfigured = (): boolean => {
  const e = getEnv();
  return Boolean(e.SHIPROCKET_EMAIL && e.SHIPROCKET_PASSWORD && e.SHIPROCKET_PICKUP_LOCATION && e.SHIPROCKET_PICKUP_PINCODE);
};
export const adminConfig = () => need({ sessionSecret: getEnv().SESSION_SECRET }, 'Admin login');
export const jobsSecret = () => need({ secret: getEnv().JOBS_SECRET }, 'Background jobs').secret;
export const databaseUrl = () => need({ url: getEnv().DATABASE_URL }, 'Database').url;
