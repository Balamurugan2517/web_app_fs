import { AppError } from './errors';
import { getEnv, shiprocketConfig } from './env';
import { logger } from './logger';
import { totalWeightKg } from './pricing';
import type { Order } from '../types/order';

const API = 'https://apiv2.shiprocket.in/v1/external';

type Json = Record<string, unknown>;
const asRecord = (v: unknown): Json => (v && typeof v === 'object' ? (v as Json) : {});

/** Shiprocket login returns a token valid for ~10 days. We keep it in memory and renew early. */
let tokenCache: { token: string; expiresAt: number } | undefined;

async function login(): Promise<string> {
  const { email, password } = shiprocketConfig();
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }), signal: AbortSignal.timeout(10_000),
  }).catch((cause) => { throw new AppError('SHIPPING_PROVIDER_ERROR', 'Could not reach the shipping provider.', 502, undefined, cause); });
  const body = asRecord(await res.json().catch(() => ({})));
  if (!res.ok || typeof body.token !== 'string') {
    logger.error('shiprocket login failed', { status: res.status, message: body.message });
    throw new AppError('SHIPPING_PROVIDER_ERROR', 'Shipping provider login failed. Check the API user credentials.', 502);
  }
  tokenCache = { token: body.token, expiresAt: Date.now() + 8 * 24 * 3600 * 1000 };
  return body.token;
}

async function sr(path: string, init: RequestInit = {}, retried = false): Promise<Json> {
  const token = tokenCache && tokenCache.expiresAt > Date.now() ? tokenCache.token : await login();
  const res = await fetch(`${API}${path}`, {
    ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...init.headers }, signal: AbortSignal.timeout(15_000),
  }).catch((cause) => { throw new AppError('SHIPPING_PROVIDER_ERROR', 'Could not reach the shipping provider.', 502, undefined, cause); });
  if (res.status === 401 && !retried) { tokenCache = undefined; return sr(path, init, true); }
  const body = asRecord(await res.json().catch(() => ({})));
  if (!res.ok) {
    logger.error('shiprocket request rejected', { path, status: res.status, body });
    throw new AppError('SHIPPING_PROVIDER_ERROR', String(body.message ?? 'The shipping provider rejected the request.'), 502, { status: res.status });
  }
  return body;
}

export interface Serviceability { serviceable: boolean; codAvailable: boolean; etaDays?: number; verified: boolean }

export async function checkServiceability(args: { pincode: string; weightKg: number; cod: boolean }): Promise<Serviceability> {
  const { pickupPincode } = shiprocketConfig();
  const q = new URLSearchParams({ pickup_postcode: pickupPincode, delivery_postcode: args.pincode, weight: String(args.weightKg), cod: args.cod ? '1' : '0' });
  try {
    const body = await sr(`/courier/serviceability/?${q}`);
    const couriers = asRecord(body.data).available_courier_companies;
    if (!Array.isArray(couriers) || couriers.length === 0) return { serviceable: false, codAvailable: false, verified: true };
    const list = couriers.map(asRecord);
    const days = list.map((c) => Number(c.estimated_delivery_days)).filter((n) => Number.isFinite(n) && n > 0);
    return { serviceable: true, codAvailable: list.some((c) => Number(c.cod) === 1), etaDays: days.length ? Math.min(...days) : undefined, verified: true };
  } catch (e) {
    // Shiprocket answers "no courier for this pincode" with an error status; treat as not serviceable.
    if (e instanceof AppError && (e.details as { status?: number } | undefined)?.status === 404) return { serviceable: false, codAvailable: false, verified: true };
    throw e;
  }
}

const num = (v: unknown): number | undefined => (typeof v === 'number' ? v : typeof v === 'string' && v && Number.isFinite(Number(v)) ? Number(v) : undefined);

/** Creates the order inside Shiprocket (appears in your Shiprocket panel under Orders). */
export async function createShiprocketOrder(order: Order): Promise<{ shiprocketOrderId: number; shipmentId: number }> {
  const { pickupLocation } = shiprocketConfig();
  const [first, ...rest] = order.customer.name.split(' ');
  const body = await sr('/orders/create/adhoc', {
    method: 'POST',
    body: JSON.stringify({
      order_id: order.id,
      order_date: order.createdAt.slice(0, 16).replace('T', ' '),
      pickup_location: pickupLocation,
      billing_customer_name: first, billing_last_name: rest.join(' '),
      billing_address: order.address.line1, billing_address_2: order.address.line2 ?? '',
      billing_city: order.address.city, billing_pincode: order.address.pincode, billing_state: order.address.state,
      billing_country: 'India', billing_email: order.customer.email, billing_phone: order.customer.phone,
      shipping_is_billing: true,
      order_items: order.items.map((i) => ({ name: `${i.name} (${i.size})`, sku: `${i.sku}-${i.size}`, units: i.quantity, selling_price: Math.round(((i.unitPrice * i.quantity - i.discountAlloc) / i.quantity) * 100) / 100, hsn: i.hsnCode, tax: i.gstRate })),
      payment_method: order.paymentMethod === 'COD' ? 'COD' : 'Prepaid',
      sub_total: order.totals.total,
      total_discount: 0,
      // Package size is a placeholder: measure your real packing box and update (cm).
      length: 35, breadth: 28, height: 8, weight: totalWeightKg(order.items),
    }),
  });
  const shiprocketOrderId = num(body.order_id);
  const shipmentId = num(body.shipment_id);
  if (!shiprocketOrderId || !shipmentId) throw new AppError('SHIPPING_PROVIDER_ERROR', 'Shipping provider did not return an order id.', 502, body);
  return { shiprocketOrderId, shipmentId };
}

/** Lets Shiprocket choose the courier per your panel's courier priority, and returns the AWB (tracking number). */
export async function assignAwb(shipmentId: number): Promise<{ awb?: string; courier?: string }> {
  const body = await sr('/courier/assign/awb', { method: 'POST', body: JSON.stringify({ shipment_id: shipmentId }) });
  const data = asRecord(asRecord(asRecord(body.response).data));
  return { awb: typeof data.awb_code === 'string' && data.awb_code ? data.awb_code : undefined, courier: typeof data.courier_name === 'string' ? data.courier_name : undefined };
}

export async function requestPickup(shipmentId: number): Promise<void> {
  await sr('/courier/generate/pickup', { method: 'POST', body: JSON.stringify({ shipment_id: [shipmentId] }) });
}

/** Returns the courier's latest status text, e.g. "In Transit" or "Delivered". */
export async function trackByAwb(awb: string): Promise<string | undefined> {
  const body = await sr(`/courier/track/awb/${encodeURIComponent(awb)}`);
  const tracks = asRecord(body.tracking_data).shipment_track;
  const latest = asRecord(Array.isArray(tracks) ? tracks[0] : undefined).current_status;
  return typeof latest === 'string' ? latest : undefined;
}

/** Cancels the order inside Shiprocket (only possible before pickup). */
export async function cancelShiprocketOrder(shiprocketOrderId: number): Promise<void> {
  await sr('/orders/cancel', { method: 'POST', body: JSON.stringify({ ids: [shiprocketOrderId] }) });
}

export const trackingUrl = (awb: string): string => `https://shiprocket.co/tracking/${encodeURIComponent(awb)}`;
export const autoCreateEnabled = (): boolean => getEnv().SHIPROCKET_AUTO_CREATE;
