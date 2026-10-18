export interface Coupon {
  code: string;
  kind: 'percent' | 'flat';
  value: number;
  minOrder: number;
  maxDiscount: number | null;
  startsAt: string | null;
  endsAt: string | null;
  usageLimit: number | null;
  usedCount: number;
  isActive: boolean;
}

export const normalizeCode = (code: string): string => code.trim().toUpperCase().replace(/\s+/g, '');

export type CouponResult = { ok: true; discount: number } | { ok: false; reason: string };

/** Decides whether a coupon works for this cart and how many rupees it takes off. */
export function evaluateCoupon(c: Coupon, subtotal: number, now: Date): CouponResult {
  if (!c.isActive) return { ok: false, reason: 'This coupon is not active.' };
  if (c.startsAt && now < new Date(c.startsAt)) return { ok: false, reason: 'This coupon is not valid yet.' };
  if (c.endsAt && now > new Date(c.endsAt)) return { ok: false, reason: 'This coupon has expired.' };
  if (c.usageLimit != null && c.usedCount >= c.usageLimit) return { ok: false, reason: 'This coupon has reached its usage limit.' };
  if (subtotal < c.minOrder) return { ok: false, reason: `Add items worth ₹${c.minOrder.toLocaleString('en-IN')} or more to use this coupon.` };
  let d = c.kind === 'percent' ? (subtotal * c.value) / 100 : c.value;
  if (c.maxDiscount != null) d = Math.min(d, c.maxDiscount);
  d = Math.min(d, subtotal);
  return { ok: true, discount: Math.round(d * 100) / 100 };
}
