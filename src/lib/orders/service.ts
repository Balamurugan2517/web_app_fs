import { randomBytes } from 'node:crypto';
import type { Order, OrderEvent, OrderStatus } from '../../types/order';
import { cancellationPolicy } from '../cancellation';
import { normalizeCode } from '../coupons';
import { tx } from '../db';
import { getEnv, isShiprocketConfigured, razorpayConfig } from '../env';
import { AppError } from '../errors';
import { logger } from '../logger';
import { notifyOrder } from '../notifications/outbox';
import { priceCart } from '../pricing';
import { createRazorpayOrder, refundRazorpayPayment } from '../razorpay';
import { addRefund, audit, bumpCustomerStats, createReturn, getCoupon, releaseCoupon, setReturnStatus, upsertCustomer, useCoupon, listReturns } from '../repos/admin';
import { getProductsByIds, restockOrder } from '../repos/catalog';
import { createOrder, findByRazorpayOrderId, getOrder, stalePending, updateOrder } from '../repos/orders';
import { assignAwb, autoCreateEnabled, cancelShiprocketOrder, createShiprocketOrder, requestPickup, trackByAwb, trackingUrl } from '../shiprocket';
import type { CheckoutRequest } from '../validation';
import { canTransition, mapCourierStatus } from './status';

const event = (type: string, message: string): OrderEvent => ({ at: new Date().toISOString(), type, message });

/** Moves an order to a new status only if the state machine allows it; otherwise keeps the old one (and logs why). */
export function move(order: Order, to: OrderStatus, ev: OrderEvent): Order {
  if (order.status === to) return order;
  if (!canTransition(order.status, to)) {
    logger.warn('ignored illegal status change', { orderId: order.id, from: order.status, to });
    order.events.push(event('IGNORED', `Ignored change ${order.status} -> ${to}`));
    return order;
  }
  order.status = to;
  order.events.push(ev);
  return order;
}

export const newOrderId = (): string => `LT${Date.now().toString(36).toUpperCase()}${randomBytes(2).toString('hex').toUpperCase()}`;

export interface PlacedOrder { order: Order; payment?: { keyId: string; razorpayOrderId: string; amountPaise: number } }

/**
 * Checkout, server side. In ONE database transaction: take the stock, count the coupon, save the customer and the order.
 * If anything fails (e.g. the last piece was just sold) the whole thing rolls back and nothing is half-saved.
 */
export async function placeOrder(input: CheckoutRequest): Promise<PlacedOrder> {
  const env = getEnv();
  const products = await getProductsByIds(input.items.map((i) => i.productId));
  const code = input.couponCode ? normalizeCode(input.couponCode) : '';
  const coupon = code ? await getCoupon(code) : null;
  if (code && !coupon) throw new AppError('VALIDATION_ERROR', 'That coupon code is not valid.', 422, { couponCode: 'That coupon code is not valid.' });
  const priced = priceCart(input.items, products, { coupon });

  if (input.paymentMethod === 'COD') {
    if (!env.COD_ENABLED) throw new AppError('VALIDATION_ERROR', 'Cash on Delivery is not available right now.', 422);
    if (priced.totals.total > env.COD_MAX_ORDER_VALUE) throw new AppError('VALIDATION_ERROR', 'This order is too large for Cash on Delivery. Please pay online.', 422);
  }

  const now = new Date().toISOString();
  const cod = input.paymentMethod === 'COD';
  const order: Order = {
    id: newOrderId(), publicToken: randomBytes(16).toString('hex'), createdAt: now, updatedAt: now,
    status: cod ? 'COD_CONFIRMED' : 'PENDING_PAYMENT', paymentMethod: input.paymentMethod,
    customer: { name: input.name, email: input.email, phone: input.phone },
    address: { line1: input.line1, line2: input.line2 || undefined, city: input.city, state: input.state, pincode: input.pincode },
    items: priced.items, couponCode: priced.coupon?.code, totals: priced.totals,
    payment: { status: cod ? 'NOT_REQUIRED' : 'PENDING', refundedAmount: 0 }, shipment: { attempts: 0, cost: 0 },
    events: [event('ORDER_PLACED', `Order placed (${input.paymentMethod})`)],
  };

  let razorpay: { keyId: string; razorpayOrderId: string; amountPaise: number } | undefined;
  if (!cod) {
    const { keyId } = razorpayConfig();                       // fail early if payments are not configured
    // Ask Razorpay FIRST: if it fails nothing has been saved or reserved. (An unused Razorpay order is harmless.)
    const rp = await createRazorpayOrder({ amountRupees: order.totals.total, receipt: order.id, notes: { orderId: order.id } });
    order.payment.razorpayOrderId = rp.id;
    order.events.push(event('PAYMENT_STARTED', `Razorpay order ${rp.id} created`));
    razorpay = { keyId, razorpayOrderId: rp.id, amountPaise: rp.amount };
  }

  await tx(async (db) => {
    order.customerId = await upsertCustomer(db, { name: input.name, email: input.email, phone: input.phone, optInEmail: input.optInEmail, optInSms: input.optInSms, optInWhatsapp: input.optInWhatsapp });
    if (order.couponCode && !(await useCoupon(db, order.couponCode))) throw new AppError('VALIDATION_ERROR', 'This coupon has just reached its usage limit.', 422, { couponCode: 'Coupon usage limit reached.' });
    await createOrder(order, db);                              // also reserves the stock
  });

  if (cod) {
    if (order.customerId) await bumpCustomerStats(order.customerId, order.totals.total);
    await notifyOrder(order, 'order_confirmed');
  }
  return { order, payment: razorpay };
}

/**
 * Called by BOTH the browser-verify route and the Razorpay webhook. Either (or both) may arrive, so it is idempotent:
 * confirming an already-paid order is a harmless no-op. A payment that arrives for an order we already cancelled is refunded.
 */
export async function confirmPrepaidPayment(args: { razorpayOrderId: string; paymentId: string; method?: string; source: 'verify' | 'webhook' }): Promise<Order | undefined> {
  const found = await findByRazorpayOrderId(args.razorpayOrderId);
  if (!found) { logger.warn('payment for unknown order', { razorpayOrderId: args.razorpayOrderId, source: args.source }); return undefined; }
  if (found.payment.status === 'CAPTURED' || found.payment.status === 'REFUNDED' || found.payment.status === 'PARTIALLY_REFUNDED') return found;

  const late = found.status === 'CANCELLED';
  const saved = await updateOrder(found.id, (o) => {
    o.payment = { ...o.payment, status: 'CAPTURED', razorpayPaymentId: args.paymentId, method: args.method, paidAt: new Date().toISOString(), failureReason: undefined };
    if (late) o.events.push(event('LATE_PAYMENT', `Payment ${args.paymentId} arrived after the order was cancelled – refunding`));
    return late ? o : move(o, 'PAID', event('PAYMENT_CAPTURED', `Payment ${args.paymentId} confirmed via ${args.source}`));
  });
  if (late) { await refundOrder(saved.id, undefined, 'Payment received after cancellation', 'system').catch((e) => logger.error('late-payment refund failed', { orderId: saved.id, error: String(e) })); return saved; }
  if (saved.customerId) await bumpCustomerStats(saved.customerId, saved.totals.total);
  await notifyOrder(saved, 'order_confirmed');
  return saved;
}

export async function recordPaymentFailure(razorpayOrderId: string, reason: string): Promise<void> {
  const found = await findByRazorpayOrderId(razorpayOrderId);
  if (!found || found.payment.status === 'CAPTURED') return;
  await updateOrder(found.id, (o) => { o.payment = { ...o.payment, status: 'FAILED', failureReason: reason }; return move(o, 'PAYMENT_FAILED', event('PAYMENT_FAILED', reason)); });
}

// ------------------------------------------------------------------ shipping

/** Creates the shipment in Shiprocket. Safe to retry: an order that already has a Shiprocket id is returned as is. */
export async function createShipment(orderId: string): Promise<Order> {
  const order = await getOrder(orderId);
  if (!order) throw new AppError('NOT_FOUND', 'Order not found.', 404);
  if (order.shipment.shiprocketOrderId) return order;
  if (order.status !== 'PAID' && order.status !== 'COD_CONFIRMED') throw new AppError('INVALID_STATE', `Cannot ship an order that is ${order.status}.`, 409);
  try {
    const { shiprocketOrderId, shipmentId } = await createShiprocketOrder(order);
    let saved = await updateOrder(orderId, (o) => {
      o.shipment = { ...o.shipment, shiprocketOrderId, shipmentId, lastError: undefined, attempts: o.shipment.attempts + 1 };
      return move(o, 'SHIPMENT_CREATED', event('SHIPMENT_CREATED', `Shiprocket order ${shiprocketOrderId} created`));
    });
    try {   // courier + pickup are "best effort": the order is safely in Shiprocket even if this step fails
      const { awb, courier } = await assignAwb(shipmentId);
      if (awb) {
        await requestPickup(shipmentId);
        saved = await updateOrder(orderId, (o) => { o.shipment = { ...o.shipment, awb, courier, trackingUrl: trackingUrl(awb) }; o.events.push(event('AWB_ASSIGNED', `AWB ${awb} (${courier ?? 'courier'}) assigned, pickup requested`)); return o; });
      }
    } catch (e) {
      logger.warn('awb/pickup step failed', { orderId, error: e instanceof Error ? e.message : String(e) });
      saved = await updateOrder(orderId, (o) => { o.events.push(event('AWB_PENDING', 'Courier not assigned automatically – finish in the Shiprocket panel')); return o; });
    }
    return saved;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await updateOrder(orderId, (o) => { o.shipment = { ...o.shipment, lastError: message, attempts: o.shipment.attempts + 1 }; o.events.push(event('SHIPMENT_FAILED', message)); return o; });
    throw e;
  }
}

/** Runs after the HTTP reply, so the customer never waits for Shiprocket. Never throws. */
export async function autoCreateShipment(orderId: string): Promise<void> {
  if (!autoCreateEnabled() || !isShiprocketConfigured()) { logger.info('auto shipment skipped', { orderId }); return; }
  try { await createShipment(orderId); } catch (e) { logger.error('auto shipment failed', { orderId, error: e instanceof Error ? e.message : String(e) }); }
}

/** Applies a courier status (webhook or manual sync) to the order and tells the customer about the important changes. */
export async function applyCourierStatus(orderId: string, text: string | undefined, extra: { awb?: string; courier?: string } = {}): Promise<Order | undefined> {
  const before = await getOrder(orderId);
  if (!before) return undefined;
  const mapped = mapCourierStatus(text);
  const saved = await updateOrder(orderId, (o) => {
    o.shipment = { ...o.shipment, lastStatus: text, awb: extra.awb ?? o.shipment.awb, courier: extra.courier ?? o.shipment.courier };
    if (o.shipment.awb && !o.shipment.trackingUrl) o.shipment.trackingUrl = trackingUrl(o.shipment.awb);
    o.events.push(event('COURIER_UPDATE', text ?? 'status update'));
    if (!mapped) return o;
    const moved = move(o, mapped, event('STATUS', `Order ${mapped}`));
    if (moved.status === 'DELIVERED' && !moved.shipment.deliveredAt) moved.shipment.deliveredAt = new Date().toISOString();
    return moved;
  });
  if (before.status !== saved.status) {
    if (saved.status === 'SHIPPED') await notifyOrder(saved, 'order_shipped');
    if (saved.status === 'DELIVERED') await notifyOrder(saved, 'order_delivered');
    if (saved.status === 'RTO') await restockOrder(saved.id, 'return_restock', 'system');
  }
  return saved;
}

export async function syncTracking(orderId: string): Promise<Order> {
  const order = await getOrder(orderId);
  if (!order) throw new AppError('NOT_FOUND', 'Order not found.', 404);
  if (!order.shipment.awb) throw new AppError('INVALID_STATE', 'This order has no tracking number yet.', 409);
  return (await applyCourierStatus(orderId, await trackByAwb(order.shipment.awb))) ?? order;
}

// ------------------------------------------------------------------ refunds, cancellation, returns

/** Refunds a captured Razorpay payment (default = everything not yet refunded). Records every attempt. */
export async function refundOrder(orderId: string, amount: number | undefined, reason: string, actor: string): Promise<Order> {
  const order = await getOrder(orderId);
  if (!order) throw new AppError('NOT_FOUND', 'Order not found.', 404);
  const paid = order.payment.razorpayPaymentId;
  if (order.paymentMethod !== 'PREPAID' || !paid || !['CAPTURED', 'PARTIALLY_REFUNDED'].includes(order.payment.status)) throw new AppError('INVALID_STATE', 'There is no online payment to refund on this order.', 409);
  const remaining = Math.round((order.totals.total - order.payment.refundedAmount) * 100) / 100;
  const value = amount ?? remaining;
  if (value <= 0 || value > remaining) throw new AppError('VALIDATION_ERROR', `Refund must be between ₹1 and ₹${remaining}.`, 422);
  try {
    const rf = await refundRazorpayPayment({ paymentId: paid, amountRupees: value, orderId, reason });
    await addRefund({ orderId, razorpayRefundId: rf.id, amount: value, status: 'processed', reason });
    const saved = await updateOrder(orderId, (o) => {
      o.payment.refundedAmount = Math.round((o.payment.refundedAmount + value) * 100) / 100;
      o.payment.status = o.payment.refundedAmount >= o.totals.total ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
      o.events.push(event('REFUND', `₹${value} refunded (${rf.id}) – ${reason}`));
      return o;
    });
    await audit(actor, 'refund', 'order', orderId, { amount: value, razorpayRefundId: rf.id, reason });
    await notifyOrder(saved, 'refund_processed', { amount: value });
    return saved;
  } catch (e) {
    await addRefund({ orderId, razorpayRefundId: null, amount: value, status: 'failed', reason }).catch(() => undefined);
    await updateOrder(orderId, (o) => { o.events.push(event('REFUND_FAILED', e instanceof Error ? e.message : String(e))); return o; }).catch(() => undefined);
    throw e;
  }
}

/**
 * Cancels an order according to cancellationPolicy(): put stock back, release the coupon, cancel the courier booking if needed,
 * and refund any online payment. `actor` is "customer" or an admin e-mail.
 */
export async function cancelOrder(orderId: string, reason: string, actor: string, opts: { silent?: boolean } = {}): Promise<Order> {
  const order = await getOrder(orderId);
  if (!order) throw new AppError('NOT_FOUND', 'Order not found.', 404);
  const policy = cancellationPolicy(order, new Date());
  if (!['instant', 'refund', 'cancel-shipment'].includes(policy.mode)) throw new AppError('INVALID_STATE', policy.message, 409);

  if (policy.mode === 'cancel-shipment' && order.shipment.shiprocketOrderId && isShiprocketConfigured()) {
    try { await cancelShiprocketOrder(order.shipment.shiprocketOrderId); }
    catch (e) {
      await updateOrder(orderId, (o) => { o.events.push(event('CANCEL_BLOCKED', `Courier booking could not be cancelled automatically: ${e instanceof Error ? e.message : e}`)); return o; });
      throw new AppError('SHIPPING_PROVIDER_ERROR', 'We could not cancel the courier booking automatically. Our team has been alerted and will cancel it for you shortly.', 502);
    }
  }
  const saved = await updateOrder(orderId, (o) => {
    o.cancel = { reason, at: new Date().toISOString() };
    return move(o, 'CANCELLED', event('CANCELLED', `Cancelled by ${actor}: ${reason}`));
  });
  if (saved.status !== 'CANCELLED') throw new AppError('INVALID_STATE', 'This order can no longer be cancelled.', 409);
  await restockOrder(orderId, 'cancel_restock', actor);
  if (saved.couponCode) await releaseCoupon(saved.couponCode);
  await audit(actor, 'cancel', 'order', orderId, { reason, mode: policy.mode });

  let result = saved;
  if (saved.paymentMethod === 'PREPAID' && saved.payment.status === 'CAPTURED') {
    result = await refundOrder(orderId, undefined, `Order cancelled: ${reason}`, actor).catch((e) => { logger.error('refund after cancel failed', { orderId, error: String(e) }); return saved; });
  }
  if (!opts.silent) await notifyOrder(result, 'order_cancelled', { amount: result.payment.refundedAmount || undefined });
  return result;
}

/** Customer asks to return a delivered order (inside the return window). The shop owner then approves or rejects. */
export async function requestReturn(orderId: string, reason: string): Promise<Order> {
  const order = await getOrder(orderId);
  if (!order) throw new AppError('NOT_FOUND', 'Order not found.', 404);
  const policy = cancellationPolicy(order, new Date());
  if (policy.mode !== 'return') throw new AppError('INVALID_STATE', policy.message, 409);
  const saved = await updateOrder(orderId, (o) => move(o, 'RETURN_REQUESTED', event('RETURN_REQUESTED', `Customer asked to return: ${reason}`)));
  await createReturn(orderId, reason);
  await audit('customer', 'return_request', 'order', orderId, { reason });
  return saved;
}

/** Admin decision on a return request: approve, reject, or "received" (goods are back → restock and refund). */
export async function decideReturn(returnId: string, decision: 'approve' | 'reject' | 'received', note: string, actor: string, refundAmount?: number): Promise<void> {
  const req = (await listReturns()).find((r) => r.id === returnId);
  if (!req) throw new AppError('NOT_FOUND', 'Return request not found.', 404);
  const order = await getOrder(req.orderId);
  if (!order) throw new AppError('NOT_FOUND', 'Order not found.', 404);
  if (decision === 'approve') {
    await setReturnStatus(returnId, 'approved', note);
    const o = await updateOrder(order.id, (x) => { x.events.push(event('RETURN_APPROVED', note || 'Return approved')); return x; });
    await notifyOrder(o, 'return_update', { message: `Your return for order ${o.id} is approved. We will arrange the pickup and contact you.` });
  } else if (decision === 'reject') {
    await setReturnStatus(returnId, 'rejected', note);
    const o = await updateOrder(order.id, (x) => move(x, 'DELIVERED', event('RETURN_REJECTED', note || 'Return rejected')));
    await notifyOrder(o, 'return_update', { message: `We could not accept the return for order ${o.id}.${note ? ` Reason: ${note}` : ''}` });
  } else {
    await setReturnStatus(returnId, 'received', note);
    await updateOrder(order.id, (x) => move(x, 'RETURNED', event('RETURN_RECEIVED', note || 'Returned goods received')));
    await restockOrder(order.id, 'return_restock', actor);
    if (order.paymentMethod === 'PREPAID') { await refundOrder(order.id, refundAmount, `Return received${note ? `: ${note}` : ''}`, actor); await setReturnStatus(returnId, 'refunded'); }
  }
  await audit(actor, `return_${decision}`, 'order', order.id, { returnId, note });
}

/** Run every few minutes: unpaid checkouts older than `minutes` are cancelled and their stock released. */
export async function expireStaleOrders(minutes = 30): Promise<number> {
  let n = 0;
  for (const id of await stalePending(minutes)) {
    try {
      const saved = await updateOrder(id, (o) => (o.status === 'PENDING_PAYMENT' ? (o.cancel = { reason: 'Payment not completed in time', at: new Date().toISOString() }, move(o, 'CANCELLED', event('EXPIRED', `No payment within ${minutes} minutes – order released`))) : o));
      if (saved.status === 'CANCELLED') { await restockOrder(id, 'cancel_restock', 'system'); if (saved.couponCode) await releaseCoupon(saved.couponCode); n++; }
    } catch (e) { logger.error('expire order failed', { orderId: id, error: e instanceof Error ? e.message : String(e) }); }
  }
  return n;
}
