import { normalizeCode } from './coupons';
import { effectivePrice, priceCart, type CartLine } from './pricing';
import { getCoupon } from './repos/admin';
import { getProductsByIds } from './repos/catalog';

export interface PreviewLine {
  productId: string; size: string; quantity: number; slug: string; name: string; image: string;
  unitPrice: number; mrp: number; lineTotal: number; stock: number; problem?: string;
}
export interface CartPreview {
  lines: PreviewLine[];
  totals: { subtotal: number; discount: number; shipping: number; total: number; gstIncluded: number };
  coupon?: { code: string; discount: number };
  couponError?: string;
  ok: boolean;
}

/** What the bag should show: fresh prices, sale prices, stock problems and the coupon – decided by the server. Never throws for bad lines. */
export async function previewCart(lines: CartLine[], couponCode: string): Promise<CartPreview> {
  const products = await getProductsByIds(lines.map((l) => l.productId));
  const now = new Date();
  const out: PreviewLine[] = []; const valid: CartLine[] = [];
  for (const l of lines) {
    const p = products.get(l.productId); const v = p?.variants.find((x) => x.size === l.size);
    const unit = p ? effectivePrice(p, now).price : 0;
    let problem: string | undefined;
    if (!p || !p.isActive || !v) problem = 'No longer available';
    else if (v.stock <= 0) problem = 'Out of stock';
    else if (v.stock < l.quantity) problem = `Only ${v.stock} left`;
    out.push({ ...l, slug: p?.slug ?? '', name: p?.name ?? 'Unavailable item', image: p?.images[0]?.url ?? '/images/hero.jpg', unitPrice: unit, mrp: p?.mrp ?? unit, lineTotal: unit * l.quantity, stock: v?.stock ?? 0, problem });
    if (!problem) valid.push(l);
  }
  const code = couponCode ? normalizeCode(couponCode) : '';
  let coupon = code ? await getCoupon(code) : null;
  let couponError: string | undefined;
  if (code && !coupon) couponError = 'That coupon code is not valid.';
  const empty = { subtotal: 0, discount: 0, shipping: 0, total: 0, gstIncluded: 0 };
  if (!valid.length) return { lines: out, totals: empty, couponError, ok: false };
  try {
    const priced = priceCart(valid, products, { coupon, now });
    return { lines: out, totals: priced.totals, coupon: priced.coupon, couponError, ok: out.every((l) => !l.problem) };
  } catch (e) {
    couponError = e instanceof Error ? e.message : 'Coupon cannot be applied.';
    coupon = null;
    const priced = priceCart(valid, products, { now });
    return { lines: out, totals: priced.totals, couponError, ok: out.every((l) => !l.problem) };
  }
}
