import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createSessionValue, parseSessionValue } from '../admin-session';
import { hmacSha256Hex } from '../crypto';
import { AppError, publicMessage } from '../errors';
import { redact } from '../logger';
import { formatINR, gstIncluded, toPaise } from '../money';
import { hashPassword, verifyPassword } from '../password';
import { checkRateLimit } from '../rate-limit';
import { verifyPaymentSignature, verifyWebhookSignature } from '../razorpay';
import { canTransition, isTerminal, mapCourierStatus } from '../orders/status';
import { checkoutRequestSchema, fieldErrors } from '../validation';

test('money: GST breakup and paise conversion', () => {
  assert.equal(gstIncluded(118, 18), 18);
  assert.equal(gstIncluded(105, 5), 5);
  assert.equal(toPaise(1999.5), 199950);
  assert.match(formatINR(285000), /2,85,000/);
});

const valid = { name: 'Asha Rao', email: 'ASHA@Example.com', phone: '9876543210', line1: '12 MG Road', city: 'Chennai', state: 'Tamil Nadu', pincode: '600001', paymentMethod: 'PREPAID', items: [{ productId: 'p1', size: 'M', quantity: 1 }] };

test('validation: accepts a good checkout; marketing consent defaults to OFF', () => {
  const r = checkoutRequestSchema.safeParse(valid);
  assert.ok(r.success);
  if (r.success) { assert.equal(r.data.email, 'asha@example.com'); assert.equal(r.data.optInEmail, false); assert.equal(r.data.optInSms, false); }
});

test('validation: rejects bad phone, pincode, state, quantity', () => {
  const r = checkoutRequestSchema.safeParse({ ...valid, phone: '12345', pincode: '012345', state: 'Atlantis', items: [{ productId: 'p1', size: 'M', quantity: 99 }] });
  assert.ok(!r.success);
  if (!r.success) { const f = fieldErrors(r.error); assert.ok(f.phone && f.pincode && f.state && f.items); }
});

test('razorpay: payment and webhook signatures', () => {
  const secret = 'test_secret';
  const sig = hmacSha256Hex(secret, 'order_1|pay_1');
  assert.ok(verifyPaymentSignature({ orderId: 'order_1', paymentId: 'pay_1', signature: sig, secret }));
  assert.ok(!verifyPaymentSignature({ orderId: 'order_1', paymentId: 'pay_2', signature: sig, secret }));
  assert.ok(!verifyPaymentSignature({ orderId: 'order_1', paymentId: 'pay_1', signature: 'short', secret }));
  const body = '{"event":"payment.captured"}';
  assert.ok(verifyWebhookSignature(body, hmacSha256Hex('whsec', body), 'whsec'));
  assert.ok(!verifyWebhookSignature(body + ' ', hmacSha256Hex('whsec', body), 'whsec'));
});

test('order state machine blocks illegal moves and allows return flow', () => {
  assert.ok(canTransition('PENDING_PAYMENT', 'PAID'));
  assert.ok(canTransition('PAYMENT_FAILED', 'PAID'));
  assert.ok(!canTransition('DELIVERED', 'PAID'));
  assert.ok(!canTransition('CANCELLED', 'SHIPPED'));
  assert.ok(canTransition('DELIVERED', 'RETURN_REQUESTED'));
  assert.ok(canTransition('RETURN_REQUESTED', 'RETURNED'));
  assert.ok(isTerminal('RETURNED') && isTerminal('CANCELLED'));
  assert.equal(mapCourierStatus('Out For Delivery'), 'SHIPPED');
  assert.equal(mapCourierStatus('RTO Initiated'), 'RTO');
  assert.equal(mapCourierStatus('DELIVERED'), 'DELIVERED');
  assert.equal(mapCourierStatus('Pickup Scheduled'), null);
  assert.equal(mapCourierStatus('UNDELIVERED-1st Attempt'), 'SHIPPED');
  assert.equal(mapCourierStatus('RTO Delivered'), 'RTO');
});

test('admin session: roles, expiry and tampering', () => {
  const v = createSessionValue('s3cret', { userId: 'u1', role: 'staff' }, 1000);
  assert.deepEqual(parseSessionValue(v, 's3cret', 2000), { userId: 'u1', role: 'staff' });
  assert.equal(parseSessionValue(v, 'other', 2000), null);
  assert.equal(parseSessionValue(v, 's3cret', 1000 + 9 * 3600 * 1000), null);
  assert.equal(parseSessionValue(v.replace('.staff.', '.owner.'), 's3cret', 2000), null); // cannot promote yourself
  assert.equal(parseSessionValue(undefined, 's3cret'), null);
});

test('password hashing: verifies right password only, hashes are salted', async () => {
  const h = await hashPassword('correct horse battery');
  assert.ok(await verifyPassword('correct horse battery', h));
  assert.ok(!(await verifyPassword('wrong', h)));
  assert.notEqual(h, await hashPassword('correct horse battery'));
  assert.ok(!(await verifyPassword('x', 'garbage')));
});

test('rate limiter blocks after the limit and resets after the window', () => {
  const k = 'k-' + Math.random();
  for (let i = 0; i < 3; i++) assert.ok(checkRateLimit(k, 3, 1000, 0).ok);
  assert.ok(!checkRateLimit(k, 3, 1000, 10).ok);
  assert.ok(checkRateLimit(k, 3, 1000, 1500).ok);
});

test('logger redacts secrets; errors hide internals from customers', () => {
  const out = redact({ razorpay_signature: 'abc', nested: { password: 'x', ok: 1 } }) as Record<string, unknown>;
  assert.equal(out.razorpay_signature, '[REDACTED]');
  assert.deepEqual(out.nested, { password: '[REDACTED]', ok: 1 });
  assert.match(publicMessage(new Error('db password leaked')), /Something went wrong/);
  assert.equal(publicMessage(new AppError('VALIDATION_ERROR', 'Bad PIN', 422)), 'Bad PIN');
});
