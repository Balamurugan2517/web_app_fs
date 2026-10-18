import { z } from 'zod';
import { MAX_QTY_PER_LINE } from './constants';

export { MAX_QTY_PER_LINE };

/**
 * Validation rules, written ONCE and used twice:
 *  - in the browser, to show friendly messages while the customer types;
 *  - on the server, because anything coming from a browser can be forged.
 */
export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
  'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
] as const;


export const pincodeSchema = z.string().trim().regex(/^[1-9]\d{5}$/, 'Enter a valid 6-digit PIN code');
export const phoneSchema = z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number');

/** The customer-facing form (no cart items). */
export const checkoutDetailsSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name').max(80),
  email: z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address')),
  phone: phoneSchema,
  line1: z.string().trim().min(5, 'Enter your house / street address').max(120),
  line2: z.string().trim().max(120).optional().default(''),
  city: z.string().trim().min(2, 'Enter your city').max(60),
  state: z.enum(INDIAN_STATES, { error: 'Select your state' }),
  pincode: pincodeSchema,
  paymentMethod: z.enum(['PREPAID', 'COD']),
  couponCode: z.string().trim().max(30).optional().default(''),
  // Marketing consent is OPT-IN (unticked by default) – required by DPDP/TRAI rules. Order messages are always sent.
  optInEmail: z.boolean().optional().default(false),
  optInSms: z.boolean().optional().default(false),
  optInWhatsapp: z.boolean().optional().default(false),
});

export const cartLineSchema = z.object({
  productId: z.string().min(1).max(64),
  size: z.string().min(1).max(20),
  quantity: z.number().int().min(1).max(MAX_QTY_PER_LINE),
});

/** What the browser sends to POST /api/checkout/create. */
export const checkoutRequestSchema = checkoutDetailsSchema.extend({
  items: z.array(cartLineSchema).min(1, 'Your bag is empty').max(20),
});

export const priceRequestSchema = z.object({
  items: z.array(cartLineSchema).min(1).max(20),
  couponCode: z.string().trim().max(30).optional().default(''),
});

export const cancelRequestSchema = z.object({
  orderId: z.string().min(1).max(40),
  token: z.string().min(1).max(64),
  reason: z.string().trim().min(3, 'Please tell us briefly why').max(300),
});

export const verifyPaymentSchema = z.object({
  orderId: z.string().min(1).max(40),
  token: z.string().min(1).max(64),
  razorpay_order_id: z.string().min(1).max(64),
  razorpay_payment_id: z.string().min(1).max(64),
  razorpay_signature: z.string().min(1).max(256),
});

export const serviceabilitySchema = z.object({
  pincode: pincodeSchema,
  cod: z.boolean().optional().default(false),
  weightKg: z.number().positive().max(50).optional().default(1),
});

export type CheckoutDetails = z.infer<typeof checkoutDetailsSchema>;
export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>;
export type CartLine = z.infer<typeof cartLineSchema>;

/** Turns a Zod error into { fieldName: "message" } for forms and API responses. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form');
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
