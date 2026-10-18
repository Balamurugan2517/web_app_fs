import type { Order } from '../types/order';

/**
 * Cancellation / return rules in one place.
 *  instant         – nothing was paid or shipped: cancel at once and put the stock back
 *  refund          – paid, not yet handed to a courier: cancel, restock, refund automatically
 *  cancel-shipment – order exists in Shiprocket but is not picked up: cancel there too, then refund
 *  return          – delivered recently: customer may request a return (admin approves)
 *  none            – cannot be cancelled (already on its way, too late, or already closed)
 */
export type CancelMode = 'instant' | 'refund' | 'cancel-shipment' | 'return' | 'none';

export const RETURN_WINDOW_DAYS = 7;

export function cancellationPolicy(
  order: Pick<Order, 'status' | 'shipment'>, now: Date, windowDays = RETURN_WINDOW_DAYS,
): { mode: CancelMode; message: string } {
  switch (order.status) {
    case 'PENDING_PAYMENT': case 'PAYMENT_FAILED': case 'COD_CONFIRMED':
      return { mode: 'instant', message: 'You can cancel this order now.' };
    case 'PAID':
      return { mode: 'refund', message: 'You can cancel this order. Your payment will be refunded to the original payment method.' };
    case 'SHIPMENT_CREATED':
      return { mode: 'cancel-shipment', message: 'Your parcel has not been picked up yet, so we can still cancel it. Any payment will be refunded.' };
    case 'SHIPPED':
      return { mode: 'none', message: 'Your order is already on its way. You can request a return after it is delivered.' };
    case 'DELIVERED': {
      const at = order.shipment.deliveredAt ? new Date(order.shipment.deliveredAt) : null;
      if (at && now.getTime() - at.getTime() > windowDays * 86_400_000) return { mode: 'none', message: `The ${windowDays}-day return window has closed.` };
      return { mode: 'return', message: `You can request a return within ${windowDays} days of delivery.` };
    }
    default:
      return { mode: 'none', message: 'This order can no longer be changed.' };
  }
}
