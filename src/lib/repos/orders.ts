import type { Order, OrderEvent, OrderItem, OrderStatus } from '../../types/order';
import { AppError } from '../errors';
import { query, tx, type Db } from '../db';
import { reserveStock } from './catalog';
import type { SaleRow } from '../reports';

interface OrderRow {
  id: string; public_token: string; customer_id: string | null; status: OrderStatus; payment_method: Order['paymentMethod']; payment_status: Order['payment']['status'];
  razorpay_order_id: string | null; razorpay_payment_id: string | null; payment_instrument: string | null; paid_at: Date | null; failure_reason: string | null;
  customer_name: string; customer_email: string; customer_phone: string; ship_line1: string; ship_line2: string | null; ship_city: string; ship_state: string; ship_pincode: string;
  subtotal: number; coupon_code: string | null; discount_total: number; shipping_fee: number; total: number; gst_included: number; cogs: number;
  shiprocket_order_id: number | null; shipment_id: number | null; awb: string | null; courier: string | null; tracking_url: string | null;
  shipment_last_status: string | null; shipment_last_error: string | null; shipment_attempts: number; shipping_cost: number; delivered_at: Date | null;
  cancel_reason: string | null; cancelled_at: Date | null; refunded_amount: number; created_at: Date; updated_at: Date;
}
interface ItemRow { product_id: string; variant_id: string; sku: string; name: string; size: string; quantity: number; mrp: number; unit_price: number; discount_alloc: number; unit_cost: number; gst_rate: number; hsn_code: string; weight_kg: number; image: string }
interface EventRow { at: Date; type: string; message: string }

const u = <T>(v: T | null): T | undefined => (v === null ? undefined : v);

function toOrder(r: OrderRow, items: ItemRow[], events: EventRow[]): Order {
  return {
    id: r.id, publicToken: r.public_token, customerId: u(r.customer_id), createdAt: r.created_at.toISOString(), updatedAt: r.updated_at.toISOString(),
    status: r.status, paymentMethod: r.payment_method,
    customer: { name: r.customer_name, email: r.customer_email, phone: r.customer_phone },
    address: { line1: r.ship_line1, line2: u(r.ship_line2), city: r.ship_city, state: r.ship_state, pincode: r.ship_pincode },
    items: items.map((i): OrderItem => ({ productId: i.product_id, variantId: i.variant_id, sku: i.sku, name: i.name, size: i.size, quantity: i.quantity, mrp: i.mrp, unitPrice: i.unit_price, discountAlloc: i.discount_alloc, unitCost: i.unit_cost, gstRate: i.gst_rate, hsnCode: i.hsn_code, weightKg: i.weight_kg, image: i.image })),
    couponCode: u(r.coupon_code),
    totals: { subtotal: r.subtotal, discount: r.discount_total, shipping: r.shipping_fee, total: r.total, gstIncluded: r.gst_included, cogs: r.cogs },
    payment: { status: r.payment_status, razorpayOrderId: u(r.razorpay_order_id), razorpayPaymentId: u(r.razorpay_payment_id), method: u(r.payment_instrument), failureReason: u(r.failure_reason), paidAt: r.paid_at?.toISOString(), refundedAmount: r.refunded_amount },
    shipment: { shiprocketOrderId: u(r.shiprocket_order_id), shipmentId: u(r.shipment_id), awb: u(r.awb), courier: u(r.courier), trackingUrl: u(r.tracking_url), lastStatus: u(r.shipment_last_status), lastError: u(r.shipment_last_error), attempts: r.shipment_attempts, cost: r.shipping_cost, deliveredAt: r.delivered_at?.toISOString() },
    cancel: r.cancelled_at ? { reason: r.cancel_reason ?? '', at: r.cancelled_at.toISOString() } : undefined,
    events: events.map((e): OrderEvent => ({ at: e.at.toISOString(), type: e.type, message: e.message })),
  };
}

async function hydrate(rows: OrderRow[], db?: Db): Promise<Order[]> {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const [items, events] = await Promise.all([
    query<ItemRow & { order_id: string }>('SELECT * FROM order_items WHERE order_id = ANY($1) ORDER BY id', [ids], db),
    query<EventRow & { order_id: string }>('SELECT order_id, at, type, message FROM order_events WHERE order_id = ANY($1) ORDER BY id', [ids], db),
  ]);
  return rows.map((r) => toOrder(r, items.filter((i) => i.order_id === r.id), events.filter((e) => e.order_id === r.id)));
}

const COLS = ['status', 'payment_status', 'razorpay_order_id', 'razorpay_payment_id', 'payment_instrument', 'paid_at', 'failure_reason', 'coupon_code', 'discount_total', 'shipping_fee', 'total', 'gst_included', 'cogs',
  'shiprocket_order_id', 'shipment_id', 'awb', 'courier', 'tracking_url', 'shipment_last_status', 'shipment_last_error', 'shipment_attempts', 'shipping_cost', 'delivered_at', 'cancel_reason', 'cancelled_at', 'refunded_amount'] as const;

const colValues = (o: Order): unknown[] => [
  o.status, o.payment.status, o.payment.razorpayOrderId ?? null, o.payment.razorpayPaymentId ?? null, o.payment.method ?? null, o.payment.paidAt ?? null, o.payment.failureReason ?? null,
  o.couponCode ?? null, o.totals.discount, o.totals.shipping, o.totals.total, o.totals.gstIncluded, o.totals.cogs,
  o.shipment.shiprocketOrderId ?? null, o.shipment.shipmentId ?? null, o.shipment.awb ?? null, o.shipment.courier ?? null, o.shipment.trackingUrl ?? null,
  o.shipment.lastStatus ?? null, o.shipment.lastError ?? null, o.shipment.attempts, o.shipment.cost, o.shipment.deliveredAt ?? null, o.cancel?.reason ?? null, o.cancel?.at ?? null, o.payment.refundedAmount,
];

/** Saves a new order, its lines and the first event, and TAKES THE STOCK – all in one transaction (all or nothing). */
export async function createOrder(order: Order, db: Db): Promise<void> {
  await query(
    `INSERT INTO orders (id, public_token, customer_id, status, payment_method, payment_status, razorpay_order_id, customer_name, customer_email, customer_phone,
       ship_line1, ship_line2, ship_city, ship_state, ship_pincode, subtotal, coupon_code, discount_total, shipping_fee, total, gst_included, cogs, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$23)`,
    [order.id, order.publicToken, order.customerId ?? null, order.status, order.paymentMethod, order.payment.status, order.payment.razorpayOrderId ?? null, order.customer.name, order.customer.email, order.customer.phone,
      order.address.line1, order.address.line2 ?? null, order.address.city, order.address.state, order.address.pincode, order.totals.subtotal, order.couponCode ?? null, order.totals.discount, order.totals.shipping,
      order.totals.total, order.totals.gstIncluded, order.totals.cogs, order.createdAt], db);
  for (const i of order.items) {
    await query(`INSERT INTO order_items (order_id, product_id, variant_id, sku, name, size, quantity, mrp, unit_price, discount_alloc, unit_cost, gst_rate, hsn_code, weight_kg, image)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [order.id, i.productId, i.variantId, i.sku, i.name, i.size, i.quantity, i.mrp, i.unitPrice, i.discountAlloc, i.unitCost, i.gstRate, i.hsnCode, i.weightKg, i.image], db);
  }
  for (const e of order.events) await query('INSERT INTO order_events (order_id, at, type, message) VALUES ($1,$2,$3,$4)', [order.id, e.at, e.type, e.message], db);
  await reserveStock(db, order.items.map((i) => ({ variantId: i.variantId, quantity: i.quantity, name: i.name, size: i.size })), order.id);
}

export async function getOrder(id: string): Promise<Order | undefined> {
  return (await hydrate(await query<OrderRow>('SELECT * FROM orders WHERE id = $1', [id])))[0];
}
export async function findByRazorpayOrderId(rid: string): Promise<Order | undefined> {
  return (await hydrate(await query<OrderRow>('SELECT * FROM orders WHERE razorpay_order_id = $1', [rid])))[0];
}

export interface OrderFilter { status?: OrderStatus; q?: string; from?: string; to?: string; limit?: number; offset?: number }
export async function listOrders(f: OrderFilter = {}): Promise<Order[]> {
  const where: string[] = []; const params: unknown[] = [];
  const add = (sql: string, v: unknown) => { params.push(v); where.push(sql.replace('$#', `$${params.length}`)); };
  if (f.status) add('status = $#', f.status);
  if (f.q) add('(id ILIKE $# OR customer_name ILIKE $# OR customer_email ILIKE $# OR customer_phone ILIKE $# OR awb ILIKE $#)', `%${f.q.replace(/[%_\\]/g, '\\$&')}%`);
  if (f.from) add('created_at >= $#', f.from);
  if (f.to) add('created_at < $#', f.to);
  return hydrate(await query<OrderRow>(`SELECT * FROM orders ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY created_at DESC LIMIT ${Math.min(f.limit ?? 50, 500)} OFFSET ${Math.max(f.offset ?? 0, 0)}`, params));
}

export async function countByStatus(): Promise<Record<string, number>> {
  const rows = await query<{ status: string; n: number }>('SELECT status, count(*)::int AS n FROM orders GROUP BY status');
  return Object.fromEntries(rows.map((r) => [r.status, r.n]));
}

/**
 * Read → change → save, holding a row lock so two things happening at once (verify + webhook, two admins …) cannot overwrite each other.
 * New events pushed inside `change` are saved; existing ones are never rewritten.
 */
export async function updateOrder(id: string, change: (o: Order) => Order | Promise<Order>): Promise<Order> {
  return tx(async (db) => {
    const rows = await query<OrderRow>('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [id], db);
    if (!rows[0]) throw new AppError('NOT_FOUND', 'Order not found.', 404);
    const [current] = await hydrate(rows, db);
    const before = current.events.length;
    const next = await change(structuredClone(current));
    const sets = COLS.map((c, i) => `${c} = $${i + 2}`).join(', ');
    await query(`UPDATE orders SET ${sets}, updated_at = now() WHERE id = $1`, [id, ...colValues(next)], db);
    for (const e of next.events.slice(before)) await query('INSERT INTO order_events (order_id, at, type, message) VALUES ($1,$2,$3,$4)', [id, e.at, e.type, e.message], db);
    return (await hydrate(await query<OrderRow>('SELECT * FROM orders WHERE id = $1', [id], db), db))[0];
  });
}

export async function setShippingCost(id: string, cost: number): Promise<void> { await query('UPDATE orders SET shipping_cost = $2, updated_at = now() WHERE id = $1', [id, cost]); }
export async function addEvent(id: string, type: string, message: string): Promise<void> { await query('INSERT INTO order_events (order_id, type, message) VALUES ($1,$2,$3)', [id, type, message]); }

export async function stalePending(olderThanMinutes: number): Promise<string[]> {
  return (await query<{ id: string }>(`SELECT id FROM orders WHERE status = 'PENDING_PAYMENT' AND created_at < now() - ($1 || ' minutes')::interval`, [String(olderThanMinutes)])).map((r) => r.id);
}

/** Rows for the sales / profit reports. */
export async function salesRows(fromIso: string, toIso: string): Promise<SaleRow[]> {
  const rows = await query<{ id: string; created_at: Date; status: OrderStatus; payment_method: 'PREPAID' | 'COD'; units: number; total: number; discount_total: number; mrp_total: number; gst_included: number; cogs: number; shipping_cost: number; refunded_amount: number }>(
    `SELECT o.id, o.created_at, o.status, o.payment_method, COALESCE(sum(i.quantity),0)::int AS units, o.total, o.discount_total,
            COALESCE(sum(i.mrp * i.quantity),0) AS mrp_total, o.gst_included, o.cogs, o.shipping_cost, o.refunded_amount
       FROM orders o LEFT JOIN order_items i ON i.order_id = o.id
      WHERE o.created_at >= $1 AND o.created_at < $2 GROUP BY o.id ORDER BY o.created_at`, [fromIso, toIso]);
  return rows.map((r) => ({ orderId: r.id, at: r.created_at.toISOString(), status: r.status, paymentMethod: r.payment_method, units: r.units, total: r.total, discount: r.discount_total, mrpTotal: r.mrp_total, gst: r.gst_included, cogs: r.cogs, shippingCost: r.shipping_cost, refunded: r.refunded_amount }));
}

export async function topProducts(fromIso: string, toIso: string, limit = 10) {
  return query<{ name: string; sku: string; units: number; revenue: number }>(
    `SELECT i.name, split_part(i.sku,'-',1) || '-' || split_part(i.sku,'-',2) || '-' || split_part(i.sku,'-',3) AS sku, sum(i.quantity)::int AS units, sum(i.unit_price * i.quantity - i.discount_alloc) AS revenue
       FROM order_items i JOIN orders o ON o.id = i.order_id
      WHERE o.created_at >= $1 AND o.created_at < $2 AND o.status IN ('PAID','COD_CONFIRMED','SHIPMENT_CREATED','SHIPPED','DELIVERED')
      GROUP BY i.name, 2 ORDER BY revenue DESC LIMIT $3`, [fromIso, toIso, limit]);
}
