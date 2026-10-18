import type { Order } from '../../types/order';
import { getEnv } from '../env';
import { logger } from '../logger';
import { claimDue, createCampaign, enqueue, getCustomer, listCustomers, markFailed, markSent, markSkipped, type OutboxRow } from '../repos/admin';
import { ChannelDisabled, sendEmail, sendSms, sendWhatsApp } from './providers';
import { render, type TemplateData, type TemplateName } from './templates';

/**
 * Notifications use the "outbox" pattern: we first WRITE the message to the database (inside the same request as the order change),
 * and a worker sends it afterwards. So a slow or broken email server can never break checkout, and nothing is lost – failures are retried.
 */
const site = () => getEnv().NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
const MAX_ATTEMPTS = 5;

export async function notifyOrder(order: Order, template: TemplateName, extra: Partial<TemplateData> = {}): Promise<void> {
  try {
    const env = getEnv();
    const data: TemplateData = {
      name: order.customer.name, orderId: order.id, total: order.totals.total, courier: order.shipment.courier, awb: order.shipment.awb, trackingUrl: order.shipment.trackingUrl,
      orderUrl: `${site()}/order/${order.id}?t=${order.publicToken}`, ...extra,
    };
    const r = render(template, data);
    await enqueue({ channel: 'email', recipient: order.customer.email, template, subject: r.subject, body: r.text, html: r.html, payload: data as unknown as Record<string, unknown>, orderId: order.id, customerId: order.customerId });
    if (env.SMS_ENABLED) await enqueue({ channel: 'sms', recipient: order.customer.phone, template, body: r.text.split('\n')[1] ?? r.subject, orderId: order.id, customerId: order.customerId });
    if (env.WHATSAPP_ENABLED && order.customerId && (await getCustomer(order.customerId))?.whatsappOptIn) {
      await enqueue({ channel: 'whatsapp', recipient: order.customer.phone, template, body: r.text, payload: { params: [order.customer.name.split(' ')[0], order.id] }, orderId: order.id, customerId: order.customerId });
    }
  } catch (e) {
    // A notification problem must never undo or block an order change.
    logger.error('could not queue notification', { orderId: order.id, template, error: e instanceof Error ? e.message : String(e) });
  }
}

async function deliver(n: OutboxRow): Promise<void> {
  if (n.channel === 'email') return sendEmail(n.recipient, n.subject ?? 'Message', n.body, n.html ?? undefined);
  if (n.channel === 'sms') return sendSms(n.recipient, n.body);
  const params = Array.isArray(n.payload.params) ? (n.payload.params as string[]) : [];
  return sendWhatsApp(n.recipient, n.template, params);
}

export async function processOutbox(limit = 25): Promise<{ sent: number; failed: number; skipped: number }> {
  const out = { sent: 0, failed: 0, skipped: 0 };
  for (const n of await claimDue(limit)) {
    try { await deliver(n); await markSent(n.id); out.sent++; }
    catch (e) {
      if (e instanceof ChannelDisabled) { await markSkipped(n.id, e.message); out.skipped++; continue; }
      const msg = e instanceof Error ? e.message : String(e);
      const final = n.attempts >= MAX_ATTEMPTS;
      await markFailed(n.id, msg, final, 2 ** n.attempts);          // retry after 2, 4, 8 … minutes
      logger.warn('notification failed', { id: n.id, channel: n.channel, attempts: n.attempts, final, error: msg });
      out.failed++;
    }
  }
  return out;
}

/** Marketing broadcast to customers who OPTED IN to the chosen channel. Every message carries an unsubscribe link. */
export async function queueCampaign(c: { name: string; channel: 'email' | 'sms' | 'whatsapp'; subject?: string; body: string; by: string }): Promise<number> {
  const audience = await listCustomers({ optIn: c.channel, limit: 5000 });
  for (const cust of audience) {
    const recipient = c.channel === 'email' ? cust.email : cust.phone;
    if (!recipient) continue;
    const unsub = `${site()}/unsubscribe?t=${cust.unsubscribeToken}`;
    const r = render('marketing', { name: cust.name, subject: c.subject, body: c.body, unsubscribeUrl: unsub });
    await enqueue({ channel: c.channel, recipient, template: 'marketing', subject: r.subject, body: r.text, html: r.html, payload: { params: [cust.name.split(' ')[0], c.body.slice(0, 200)] }, customerId: cust.id, kind: 'marketing' });
  }
  await createCampaign({ name: c.name, channel: c.channel, subject: c.subject, body: c.body, recipients: audience.length, by: c.by });
  return audience.length;
}
