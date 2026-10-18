import { formatINR } from '../money';
import { siteConfig } from '../site-config';

/**
 * Message templates. Each returns a subject, a plain-text body (used for email text, SMS and WhatsApp)
 * and a small HTML version for email. Pure functions: easy to test and to translate later.
 */
export type TemplateName = 'order_confirmed' | 'order_shipped' | 'order_delivered' | 'order_cancelled' | 'refund_processed' | 'return_update' | 'payment_failed' | 'marketing';

export interface TemplateData {
  name: string; orderId?: string; total?: number; courier?: string; awb?: string; trackingUrl?: string; orderUrl?: string;
  amount?: number; message?: string; unsubscribeUrl?: string; subject?: string; body?: string;
}
export interface Rendered { subject: string; text: string; html: string }

export const escapeHtml = (s: string): string => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
const first = (n: string): string => n.trim().split(/\s+/)[0] || 'there';

function wrap(title: string, lines: string[], footer = ''): string {
  const body = lines.map((l) => `<p style="margin:0 0 12px">${escapeHtml(l)}</p>`).join('');
  return `<div style="font-family:Arial,sans-serif;color:#4A151B;background:#FAF6F0;padding:24px"><h2 style="font-family:Georgia,serif;margin:0 0 16px">${escapeHtml(title)}</h2>${body}<p style="font-size:12px;color:#8a6a6d">${escapeHtml(siteConfig.name)} · ${escapeHtml(siteConfig.email)}${footer}</p></div>`;
}

export function render(t: TemplateName, d: TemplateData): Rendered {
  const hi = `Hi ${first(d.name)},`;
  const link = d.orderUrl ? [`View your order: ${d.orderUrl}`] : [];
  let subject: string; let lines: string[];
  switch (t) {
    case 'order_confirmed': subject = `Order ${d.orderId} confirmed`; lines = [hi, `Thank you! We have received your order ${d.orderId}${d.total != null ? ` for ${formatINR(d.total)}` : ''}. We will pack it with care and share tracking soon.`, ...link]; break;
    case 'payment_failed': subject = `Payment not completed for order ${d.orderId}`; lines = [hi, `Your payment for order ${d.orderId} did not go through, so the order is not confirmed yet. Please try again from our website.`]; break;
    case 'order_shipped': subject = `Your order ${d.orderId} is on its way`; lines = [hi, `Good news – order ${d.orderId} has been handed to ${d.courier ?? 'our courier partner'}.${d.awb ? ` Tracking number: ${d.awb}.` : ''}`, ...(d.trackingUrl ? [`Track it here: ${d.trackingUrl}`] : []), ...link]; break;
    case 'order_delivered': subject = `Order ${d.orderId} delivered`; lines = [hi, `Your order ${d.orderId} has been delivered. We hope you love it! If anything is wrong, reply to this message within 7 days.`, ...link]; break;
    case 'order_cancelled': subject = `Order ${d.orderId} cancelled`; lines = [hi, `Your order ${d.orderId} has been cancelled.${d.amount ? ` A refund of ${formatINR(d.amount)} has been started and usually reaches you in 5–7 business days.` : ''}`]; break;
    case 'refund_processed': subject = `Refund for order ${d.orderId}`; lines = [hi, `We have refunded ${formatINR(d.amount ?? 0)} for order ${d.orderId}. It usually appears in your account in 5–7 business days.`]; break;
    case 'return_update': subject = `Return update for order ${d.orderId}`; lines = [hi, d.message ?? `There is an update on the return for order ${d.orderId}.`, ...link]; break;
    case 'marketing': subject = d.subject ?? `News from ${siteConfig.name}`; lines = [hi, ...(d.body ?? '').split(/\n+/).filter(Boolean)]; break;
  }
  const unsub = t === 'marketing' && d.unsubscribeUrl ? [`To stop these messages: ${d.unsubscribeUrl}`] : [];
  const text = [...lines, ...unsub, '', `${siteConfig.name} · ${siteConfig.email}`].join('\n');
  return { subject, text, html: wrap(subject, [...lines, ...unsub]) };
}
