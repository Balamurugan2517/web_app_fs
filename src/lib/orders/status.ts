import type { OrderStatus } from '../../types/order';

/**
 * The order life-cycle as a state machine. An order may only move along these arrows.
 * This stops bugs such as "a delivered order becomes unpaid again" when webhooks arrive late or twice.
 */
const ALLOWED: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ['PAID', 'PAYMENT_FAILED', 'CANCELLED'],
  PAYMENT_FAILED: ['PAID', 'CANCELLED'],
  PAID: ['SHIPMENT_CREATED', 'CANCELLED'],
  COD_CONFIRMED: ['SHIPMENT_CREATED', 'CANCELLED'],
  SHIPMENT_CREATED: ['SHIPPED', 'DELIVERED', 'CANCELLED', 'RTO'],
  SHIPPED: ['DELIVERED', 'RTO'],
  DELIVERED: ['RETURN_REQUESTED'],
  RETURN_REQUESTED: ['RETURNED', 'DELIVERED'], // back to DELIVERED when the request is rejected
  RETURNED: [],
  CANCELLED: [],
  RTO: [],
};

export const canTransition = (from: OrderStatus, to: OrderStatus): boolean => ALLOWED[from].includes(to);
export const isTerminal = (s: OrderStatus): boolean => ALLOWED[s].length === 0;

/** Statuses that count as a real sale in reports. */
export const SALE_STATUSES: OrderStatus[] = ['PAID', 'COD_CONFIRMED', 'SHIPMENT_CREATED', 'SHIPPED', 'DELIVERED', 'RETURN_REQUESTED'];

/** Maps the free-text status a courier reports to our own status (or null if we do not track it). */
export function mapCourierStatus(text: string | undefined): OrderStatus | null {
  const t = (text ?? '').toUpperCase();
  if (!t) return null;
  if (t.includes('RTO')) return 'RTO';
  if (t.includes('UNDELIVERED')) return 'SHIPPED'; // "Undelivered – 1st attempt" must NOT count as delivered
  if (t.includes('DELIVERED')) return 'DELIVERED';
  if (t.includes('CANCEL')) return 'CANCELLED';
  if (t.includes('TRANSIT') || t.includes('PICKED') || t.includes('SHIPPED') || t.includes('OUT FOR DELIVERY')) return 'SHIPPED';
  return null;
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_PAYMENT: 'Awaiting payment',
  PAYMENT_FAILED: 'Payment failed',
  PAID: 'Paid – preparing your order',
  COD_CONFIRMED: 'Confirmed (Cash on Delivery)',
  SHIPMENT_CREATED: 'Packed – awaiting pickup',
  SHIPPED: 'On its way',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  RTO: 'Returned to seller',
  RETURN_REQUESTED: 'Return requested',
  RETURNED: 'Returned',
};
