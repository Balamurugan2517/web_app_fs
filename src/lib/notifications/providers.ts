import { createTransport, type Transporter } from 'nodemailer';
import { getEnv } from '../env';
import { AppError } from '../errors';

/**
 * The three delivery channels. Each one is OPTIONAL: if it is not configured the message is marked "skipped", never lost silently.
 *  - email    : any SMTP server (Postfix, Mailu, Brevo, Amazon SES SMTP …) via nodemailer (MIT licence)
 *  - sms      : an HTTP SMS gateway of your choice (India needs a TRAI DLT-registered sender & template)
 *  - whatsapp : Meta WhatsApp Business Cloud API with pre-approved templates
 */
export class ChannelDisabled extends Error {}

let transport: Transporter | undefined;

export async function sendEmail(to: string, subject: string, text: string, html?: string): Promise<void> {
  const env = getEnv();
  if (!env.SMTP_URL || !env.MAIL_FROM) throw new ChannelDisabled('Email is not configured (SMTP_URL, MAIL_FROM).');
  transport ??= createTransport(env.SMTP_URL);
  try { await transport.sendMail({ from: env.MAIL_FROM, to, subject, text, html }); }
  catch (cause) { throw new AppError('INTERNAL_ERROR', `Email send failed: ${(cause as Error).message}`, 502, undefined, cause); }
}

const intl = (phone: string): string => (phone.startsWith('+') ? phone.slice(1) : phone.length === 10 ? `91${phone}` : phone);

export async function sendSms(to: string, text: string): Promise<void> {
  const env = getEnv();
  if (!env.SMS_ENABLED || !env.SMS_GATEWAY_URL) throw new ChannelDisabled('SMS is not enabled (SMS_ENABLED, SMS_GATEWAY_URL).');
  const res = await fetch(env.SMS_GATEWAY_URL, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(env.SMS_GATEWAY_TOKEN ? { Authorization: `Bearer ${env.SMS_GATEWAY_TOKEN}` } : {}) },
    body: JSON.stringify({ to: intl(to), message: text.slice(0, 600), sender: env.SMS_SENDER_ID }), signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new AppError('INTERNAL_ERROR', `SMS gateway answered ${res.status}`, 502);
}

export async function sendWhatsApp(to: string, template: string, params: string[]): Promise<void> {
  const env = getEnv();
  if (!env.WHATSAPP_ENABLED || !env.WHATSAPP_PHONE_NUMBER_ID || !env.WHATSAPP_TOKEN) throw new ChannelDisabled('WhatsApp is not enabled.');
  const res = await fetch(`https://graph.facebook.com/v21.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.WHATSAPP_TOKEN}` },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: intl(to), type: 'template', template: { name: template, language: { code: 'en' }, components: [{ type: 'body', parameters: params.map((text) => ({ type: 'text', text })) }] } }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new AppError('INTERNAL_ERROR', `WhatsApp API answered ${res.status}`, 502);
}
