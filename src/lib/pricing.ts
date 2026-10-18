import type { Order, OrderItem, OrderTotals } from '../types/order';
import type { Product } from '../types/product';
import { AppError } from './errors';
import { evaluateCoupon, type Coupon } from './coupons';
import { gstIncluded } from './money';

/** Shipping is free across India (the merchant pays the courier). Change here if that policy changes. */
export const SHIPPING_FEE = 0;

export interface CartLine { productId: string; size: string; quantity: number }

const rupees = (n: number): number => Math.round(n * 100) / 100;

/** Is the sale price active at `now`? */
export function saleActive(p: Pick<Product, 'price' | 'salePrice' | 'saleStartsAt' | 'saleEndsAt'>, now: Date): boolean {
  if (p.salePrice == null || p.salePrice >= p.price) return false;
  if (p.saleStartsAt && now < new Date(p.saleStartsAt)) return false;
  if (p.saleEndsAt && now > new Date(p.saleEndsAt)) return false;
  return true;
}

/** The price a customer pays today, and how much "off" it looks compared with the MRP. */
export function effectivePrice(p: Pick<Product, 'mrp' | 'price' | 'salePrice' | 'saleStartsAt' | 'saleEndsAt'>, now: Date) {
  const onSale = saleActive(p, now);
  const price = onSale ? (p.salePrice as number) : p.price;
  const percentOff = p.mrp > price ? Math.round(((p.mrp - price) / p.mrp) * 100) : 0;
  return { price, onSale, percentOff };
}

export interface PricedCart {
  items: OrderItem[];
  totals: OrderTotals;
  coupon?: { code: string; discount: number };
}

/**
 * SERVER-SIDE PRICE AUTHORITY.
 * The browser says WHAT it wants (product, size, quantity). Prices, stock, sale, tax and coupon are decided here.
 * Pure function (no database): the caller passes the products and the coupon it already loaded.
 */
export function priceCart(lines: CartLine[], products: Map<string, Product>, opts: { coupon?: Coupon | null; now?: Date } = {}): PricedCart {
  const now = opts.now ?? new Date();
  const wanted = new Map<string, number>();
  const items: OrderItem[] = lines.map((line) => {
    const p = products.get(line.productId);
    if (!p || !p.isActive) throw new AppError('VALIDATION_ERROR', 'One of the items in your bag is no longer available.', 422, { productId: line.productId });
    const v = p.variants.find((x) => x.size === line.size);
    if (!v) throw new AppError('VALIDATION_ERROR', `Size ${line.size} is not available for ${p.name}.`, 422);
    const total = (wanted.get(v.id) ?? 0) + line.quantity;
    wanted.set(v.id, total);
    if (v.stock <= 0) throw new AppError('VALIDATION_ERROR', `${p.name} (${line.size}) is out of stock.`, 409, { code: 'OUT_OF_STOCK', productId: p.id, size: line.size });
    if (total > v.stock) throw new AppError('VALIDATION_ERROR', `Only ${v.stock} left of ${p.name} (${line.size}).`, 409, { code: 'INSUFFICIENT_STOCK', productId: p.id, size: line.size, available: v.stock });
    return {
      productId: p.id, variantId: v.id, sku: v.sku, name: p.name, size: line.size, quantity: line.quantity,
      mrp: p.mrp, unitPrice: effectivePrice(p, now).price, discountAlloc: 0, unitCost: p.costPrice,
      gstRate: p.gstRate, hsnCode: p.hsnCode, weightKg: p.weightKg, image: p.images[0]?.url ?? '',
    };
  });

  const subtotal = rupees(items.reduce((s, i) => s + i.unitPrice * i.quantity, 0));
  let couponApplied: PricedCart['coupon'];
  if (opts.coupon) {
    const r = evaluateCoupon(opts.coupon, subtotal, now);
    if (!r.ok) throw new AppError('VALIDATION_ERROR', r.reason, 422, { coupon: r.reason });
    couponApplied = { code: opts.coupon.code, discount: r.discount };
    // Share the discount across lines in proportion to their value (the last line takes the rounding remainder).
    let left = r.discount;
    items.forEach((it, idx) => {
      const share = idx === items.length - 1 ? left : rupees((r.discount * it.unitPrice * it.quantity) / subtotal);
      it.discountAlloc = share; left = rupees(left - share);
    });
  }

  const discount = couponApplied?.discount ?? 0;
  const gst = items.reduce((s, i) => s + gstIncluded(i.unitPrice * i.quantity - i.discountAlloc, i.gstRate), 0);
  const cogs = items.reduce((s, i) => s + i.unitCost * i.quantity, 0);
  return {
    items, coupon: couponApplied,
    totals: { subtotal, discount, shipping: SHIPPING_FEE, total: rupees(subtotal - discount + SHIPPING_FEE), gstIncluded: rupees(gst), cogs: rupees(cogs) },
  };
}

export const totalWeightKg = (items: Pick<OrderItem, 'weightKg' | 'quantity'>[]): number =>
  Math.max(0.1, Math.round(items.reduce((s, i) => s + i.weightKg * i.quantity, 0) * 100) / 100);

export type { Order };
