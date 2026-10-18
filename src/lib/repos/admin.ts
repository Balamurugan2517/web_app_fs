import { randomBytes } from 'node:crypto';
import type { Coupon } from '../coupons';
import type { ExpenseRow } from '../reports';
import { query, type Db } from '../db';
import type { AdminRole } from '../admin-session';

// ------------------------------------------------------------------ admin users & audit
export interface AdminUser { id: string; email: string; name: string; role: AdminRole; passwordHash: string; isActive: boolean }
const mapAdmin = (r: { id: string; email: string; name: string; role: AdminRole; password_hash: string; is_active: boolean }): AdminUser => ({ id: r.id, email: r.email, name: r.name, role: r.role, passwordHash: r.password_hash, isActive: r.is_active });
export async function findAdminByEmail(email: string) { const r = (await query<Parameters<typeof mapAdmin>[0]>('SELECT * FROM admin_users WHERE lower(email) = lower($1)', [email]))[0]; return r ? mapAdmin(r) : undefined; }
export async function findAdminById(id: string) { if (!/^[0-9a-f-]{36}$/i.test(id)) return undefined; const r = (await query<Parameters<typeof mapAdmin>[0]>('SELECT * FROM admin_users WHERE id = $1', [id]))[0]; return r ? mapAdmin(r) : undefined; }
export const touchAdminLogin = (id: string) => query('UPDATE admin_users SET last_login_at = now() WHERE id = $1', [id]);

export const audit = (actor: string, action: string, entity: string, entityId?: string, details: Record<string, unknown> = {}) =>
  query('INSERT INTO audit_log (actor, action, entity, entity_id, details) VALUES ($1,$2,$3,$4,$5::jsonb)', [actor, action, entity, entityId ?? null, JSON.stringify(details)]);
export const recentAudit = (limit = 100) => query<{ at: Date; actor: string; action: string; entity: string; entity_id: string | null; details: unknown }>('SELECT at, actor, action, entity, entity_id, details FROM audit_log ORDER BY id DESC LIMIT $1', [limit]);

// ------------------------------------------------------------------ customers (marketing list)
export interface Customer { id: string; email: string; phone: string | null; name: string; emailOptIn: boolean; smsOptIn: boolean; whatsappOptIn: boolean; unsubscribeToken: string; ordersCount: number; totalSpent: number; lastOrderAt: string | null; createdAt: string }
interface CustomerRow { id: string; email: string; phone: string | null; name: string; email_opt_in: boolean; sms_opt_in: boolean; whatsapp_opt_in: boolean; unsubscribe_token: string; orders_count: number; total_spent: number; last_order_at: Date | null; created_at: Date }
const mapCustomer = (r: CustomerRow): Customer => ({ id: r.id, email: r.email, phone: r.phone, name: r.name, emailOptIn: r.email_opt_in, smsOptIn: r.sms_opt_in, whatsappOptIn: r.whatsapp_opt_in, unsubscribeToken: r.unsubscribe_token, ordersCount: r.orders_count, totalSpent: r.total_spent, lastOrderAt: r.last_order_at?.toISOString() ?? null, createdAt: r.created_at.toISOString() });

/** Finds the customer by email (or creates them). Consent is only ever switched ON by an explicit tick; it is never switched on silently. */
export async function upsertCustomer(db: Db, c: { name: string; email: string; phone: string; optInEmail: boolean; optInSms: boolean; optInWhatsapp: boolean }): Promise<string> {
  const rows = await query<{ id: string }>(
    `INSERT INTO customers (email, phone, name, email_opt_in, sms_opt_in, whatsapp_opt_in, consent_updated_at, unsubscribe_token)
     VALUES ($1,$2,$3,$4,$5,$6, CASE WHEN $4 OR $5 OR $6 THEN now() END, $7)
     ON CONFLICT ((lower(email))) DO UPDATE SET name = EXCLUDED.name, phone = EXCLUDED.phone,
       email_opt_in = customers.email_opt_in OR EXCLUDED.email_opt_in, sms_opt_in = customers.sms_opt_in OR EXCLUDED.sms_opt_in,
       whatsapp_opt_in = customers.whatsapp_opt_in OR EXCLUDED.whatsapp_opt_in,
       consent_updated_at = CASE WHEN EXCLUDED.email_opt_in OR EXCLUDED.sms_opt_in OR EXCLUDED.whatsapp_opt_in THEN now() ELSE customers.consent_updated_at END
     RETURNING id`, [c.email, c.phone, c.name, c.optInEmail, c.optInSms, c.optInWhatsapp, randomBytes(18).toString('hex')], db);
  return rows[0].id;
}
export const bumpCustomerStats = (id: string, amount: number) => query('UPDATE customers SET orders_count = orders_count + 1, total_spent = total_spent + $2, last_order_at = now() WHERE id = $1', [id, amount]);
export async function listCustomers(f: { q?: string; optIn?: 'email' | 'sms' | 'whatsapp'; limit?: number } = {}): Promise<Customer[]> {
  const params: unknown[] = []; const where: string[] = [];
  if (f.q) { params.push(`%${f.q.replace(/[%_\\]/g, '\\$&')}%`); where.push(`(name ILIKE $${params.length} OR email ILIKE $${params.length} OR phone ILIKE $${params.length})`); }
  if (f.optIn) where.push(`${f.optIn === 'email' ? 'email_opt_in' : f.optIn === 'sms' ? 'sms_opt_in' : 'whatsapp_opt_in'}`);
  return (await query<CustomerRow>(`SELECT * FROM customers ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY created_at DESC LIMIT ${Math.min(f.limit ?? 200, 5000)}`, params)).map(mapCustomer);
}
export async function getCustomer(id: string) { const r = (await query<CustomerRow>('SELECT * FROM customers WHERE id = $1', [id]))[0]; return r ? mapCustomer(r) : undefined; }
export async function unsubscribeByToken(token: string): Promise<boolean> {
  return (await query('UPDATE customers SET email_opt_in = false, sms_opt_in = false, whatsapp_opt_in = false, consent_updated_at = now() WHERE unsubscribe_token = $1 RETURNING id', [token])).length > 0;
}

// ------------------------------------------------------------------ coupons
interface CouponRow { code: string; kind: 'percent' | 'flat'; value: number; min_order: number; max_discount: number | null; starts_at: Date | null; ends_at: Date | null; usage_limit: number | null; used_count: number; is_active: boolean }
const mapCoupon = (r: CouponRow): Coupon => ({ code: r.code, kind: r.kind, value: r.value, minOrder: r.min_order, maxDiscount: r.max_discount, startsAt: r.starts_at?.toISOString() ?? null, endsAt: r.ends_at?.toISOString() ?? null, usageLimit: r.usage_limit, usedCount: r.used_count, isActive: r.is_active });
export async function getCoupon(code: string, db?: Db): Promise<Coupon | undefined> { const r = (await query<CouponRow>('SELECT * FROM coupons WHERE code = $1', [code], db))[0]; return r ? mapCoupon(r) : undefined; }
export const listCoupons = async () => (await query<CouponRow>('SELECT * FROM coupons ORDER BY created_at DESC')).map(mapCoupon);
export const upsertCoupon = (c: Omit<Coupon, 'usedCount'>) => query(
  `INSERT INTO coupons (code, kind, value, min_order, max_discount, starts_at, ends_at, usage_limit, is_active) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
   ON CONFLICT (code) DO UPDATE SET kind=EXCLUDED.kind, value=EXCLUDED.value, min_order=EXCLUDED.min_order, max_discount=EXCLUDED.max_discount, starts_at=EXCLUDED.starts_at, ends_at=EXCLUDED.ends_at, usage_limit=EXCLUDED.usage_limit, is_active=EXCLUDED.is_active`,
  [c.code, c.kind, c.value, c.minOrder, c.maxDiscount, c.startsAt, c.endsAt, c.usageLimit, c.isActive]);
export const setCouponActive = (code: string, active: boolean) => query('UPDATE coupons SET is_active = $2 WHERE code = $1', [code, active]);
/** Counts one use – refuses (returns false) if the usage limit was reached in the meantime. */
export async function useCoupon(db: Db, code: string): Promise<boolean> {
  return (await query('UPDATE coupons SET used_count = used_count + 1 WHERE code = $1 AND (usage_limit IS NULL OR used_count < usage_limit) RETURNING code', [code], db)).length > 0;
}
export const releaseCoupon = (code: string) => query('UPDATE coupons SET used_count = GREATEST(used_count - 1, 0) WHERE code = $1', [code]);

// ------------------------------------------------------------------ expenses
export const addExpense = (e: { spentOn: string; category: string; amount: number; note: string; by: string }) => query('INSERT INTO expenses (spent_on, category, amount, note, created_by) VALUES ($1,$2,$3,$4,$5)', [e.spentOn, e.category, e.amount, e.note, e.by]);
export const deleteExpense = (id: string) => query('DELETE FROM expenses WHERE id = $1', [id]);
export const listExpenses = (fromDate: string, toDate: string) => query<{ id: string; spent_on: string; category: string; amount: number; note: string; created_by: string }>(
  `SELECT id, to_char(spent_on,'YYYY-MM-DD') AS spent_on, category, amount, note, created_by FROM expenses WHERE spent_on >= $1 AND spent_on < $2 ORDER BY spent_on DESC, created_at DESC`, [fromDate, toDate]);
export const expenseRows = async (fromDate: string, toDate: string): Promise<ExpenseRow[]> => (await listExpenses(fromDate, toDate)).map((e) => ({ on: e.spent_on, category: e.category, amount: e.amount }));

// ------------------------------------------------------------------ returns & refunds
export interface ReturnRequest { id: string; orderId: string; status: 'requested' | 'approved' | 'rejected' | 'received' | 'refunded'; reason: string; adminNote: string | null; createdAt: string }
const mapReturn = (r: { id: string; order_id: string; status: ReturnRequest['status']; reason: string; admin_note: string | null; created_at: Date }): ReturnRequest => ({ id: r.id, orderId: r.order_id, status: r.status, reason: r.reason, adminNote: r.admin_note, createdAt: r.created_at.toISOString() });
export const createReturn = (orderId: string, reason: string) => query('INSERT INTO return_requests (order_id, reason, status) VALUES ($1,$2,\'requested\')', [orderId, reason]);
export const listReturns = async (status?: string) => (await query<Parameters<typeof mapReturn>[0]>(`SELECT * FROM return_requests ${status ? 'WHERE status = $1' : ''} ORDER BY created_at DESC LIMIT 200`, status ? [status] : [])).map(mapReturn);
export const returnsForOrder = async (orderId: string) => (await query<Parameters<typeof mapReturn>[0]>('SELECT * FROM return_requests WHERE order_id = $1 ORDER BY created_at DESC', [orderId])).map(mapReturn);
export const setReturnStatus = (id: string, status: ReturnRequest['status'], note?: string) => query('UPDATE return_requests SET status = $2, admin_note = COALESCE($3, admin_note), updated_at = now() WHERE id = $1', [id, status, note ?? null]);
export const addRefund = (r: { orderId: string; razorpayRefundId: string | null; amount: number; status: 'requested' | 'processed' | 'failed'; reason: string }) =>
  query('INSERT INTO refunds (order_id, razorpay_refund_id, amount, status, reason) VALUES ($1,$2,$3,$4,$5)', [r.orderId, r.razorpayRefundId, r.amount, r.status, r.reason]);
export const refundsForOrder = (orderId: string) => query<{ amount: number; status: string; reason: string; created_at: Date; razorpay_refund_id: string | null }>('SELECT amount, status, reason, created_at, razorpay_refund_id FROM refunds WHERE order_id = $1 ORDER BY created_at DESC', [orderId]);

// ------------------------------------------------------------------ notifications outbox & campaigns
export interface OutboxRow { id: number; channel: 'email' | 'sms' | 'whatsapp'; recipient: string; template: string; subject: string | null; body: string; html: string | null; payload: Record<string, unknown>; attempts: number; kind: string }
export const enqueue = (n: { channel: OutboxRow['channel']; recipient: string; template: string; subject?: string; body: string; html?: string; payload?: Record<string, unknown>; orderId?: string; customerId?: string; kind?: 'transactional' | 'marketing' }, db?: Db) =>
  query('INSERT INTO notifications (channel, recipient, template, subject, body, html, payload, order_id, customer_id, kind) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10)',
    [n.channel, n.recipient, n.template, n.subject ?? null, n.body, n.html ?? null, JSON.stringify(n.payload ?? {}), n.orderId ?? null, n.customerId ?? null, n.kind ?? 'transactional'], db);
/** Takes a batch of due messages. SKIP LOCKED lets two workers run at once without sending anything twice. */
export const claimDue = (limit: number) => query<OutboxRow>(
  `UPDATE notifications SET attempts = attempts + 1, next_attempt_at = now() + interval '10 minutes'
    WHERE id IN (SELECT id FROM notifications WHERE status = 'queued' AND next_attempt_at <= now() ORDER BY id LIMIT $1 FOR UPDATE SKIP LOCKED)
    RETURNING id, channel, recipient, template, subject, body, html, payload, attempts, kind`, [limit]);
export const markSent = (id: number) => query("UPDATE notifications SET status='sent', sent_at=now(), last_error=NULL WHERE id=$1", [id]);
export const markSkipped = (id: number, why: string) => query("UPDATE notifications SET status='skipped', last_error=$2 WHERE id=$1", [id, why]);
export const markFailed = (id: number, error: string, final: boolean, retryMinutes: number) =>
  query(`UPDATE notifications SET status = $2, last_error = $3, next_attempt_at = now() + ($4 || ' minutes')::interval WHERE id = $1`, [id, final ? 'failed' : 'queued', error.slice(0, 500), String(retryMinutes)]);
export const recentNotifications = (limit = 100, status?: string) => query<{ id: number; created_at: Date; channel: string; recipient: string; template: string; status: string; attempts: number; last_error: string | null; kind: string }>(
  `SELECT id, created_at, channel, recipient, template, status, attempts, last_error, kind FROM notifications ${status ? 'WHERE status = $2' : ''} ORDER BY id DESC LIMIT $1`, status ? [limit, status] : [limit]);
export const retryFailed = () => query("UPDATE notifications SET status='queued', attempts=0, next_attempt_at=now() WHERE status='failed' RETURNING id");
export const createCampaign = (c: { name: string; channel: string; subject?: string; body: string; recipients: number; by: string }) => query('INSERT INTO campaigns (name, channel, subject, body, recipients, created_by) VALUES ($1,$2,$3,$4,$5,$6)', [c.name, c.channel, c.subject ?? null, c.body, c.recipients, c.by]);
export const listCampaigns = () => query<{ id: string; name: string; channel: string; recipients: number; created_by: string; created_at: Date }>('SELECT id, name, channel, recipients, created_by, created_at FROM campaigns ORDER BY created_at DESC LIMIT 50');
export const queueDepth = async () => (await query<{ status: string; n: number }>('SELECT status, count(*)::int AS n FROM notifications GROUP BY status'));
export const dbPing = async () => (await query<{ ok: number }>('SELECT 1 AS ok'))[0]?.ok === 1;
