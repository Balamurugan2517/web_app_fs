import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cancellationPolicy } from '../cancellation';
import { parseProductsCsv, parseStockCsv, PRODUCT_CSV_TEMPLATE, slugify } from '../catalog-import';
import { evaluateCoupon, normalizeCode, type Coupon } from '../coupons';
import { parseCsv, toCsv } from '../csv';
import { render } from '../notifications/templates';
import { effectivePrice, priceCart, totalWeightKg } from '../pricing';
import { buildProfitLoss, periodKey, totalsOf, type SaleRow } from '../reports';
import { INDIAN_SIZE_CHARTS, isValidSize, sortSizes } from '../sizes';
import type { Product } from '../../types/product';

const product = (over: Partial<Product> = {}): Product => ({
  id: 'p1', sku: 'LT-X-1', slug: 'x', name: 'Test Kurta', description: '', department: 'men', category: 'Kurtas', sizeSet: 'apparel', images: [{ url: '/images/a.jpg', alt: '' }],
  mrp: 2000, price: 1500, salePrice: null, saleStartsAt: null, saleEndsAt: null, costPrice: 600, gstRate: 5, hsnCode: '6105', weightKg: 0.4, isActive: true, isNewArrival: false,
  variants: [{ id: 'v-m', size: 'M', sku: 'LT-X-1-M', stock: 3, lowStockThreshold: 2 }, { id: 'v-l', size: 'L', sku: 'LT-X-1-L', stock: 0, lowStockThreshold: 2 }], ...over,
});
const catalogue = (...p: Product[]) => new Map(p.map((x) => [x.id, x]));
const coupon = (over: Partial<Coupon> = {}): Coupon => ({ code: 'SAVE10', kind: 'percent', value: 10, minOrder: 1000, maxDiscount: null, startsAt: null, endsAt: null, usageLimit: null, usedCount: 0, isActive: true, ...over });

test('sizes: Indian size sets and charts', () => {
  assert.ok(isValidSize('apparel', 'XXL') && !isValidSize('apparel', '3XL'));
  assert.ok(isValidSize('kids', '4-5Y') && isValidSize('footwear', '8') && isValidSize('free', 'Free Size'));
  assert.deepEqual(sortSizes('apparel', ['XL', 'S', 'M']), ['S', 'M', 'XL']);
  assert.ok(INDIAN_SIZE_CHARTS.every((c) => c.rows.every((r) => r.length === c.headers.length)));
});

test('sale price: active only inside its date window', () => {
  const p = product({ salePrice: 1200, saleStartsAt: '2026-11-01T00:00:00Z', saleEndsAt: '2026-11-10T00:00:00Z' });
  assert.equal(effectivePrice(p, new Date('2026-10-31T00:00:00Z')).price, 1500);
  const on = effectivePrice(p, new Date('2026-11-05T00:00:00Z'));
  assert.equal(on.price, 1200); assert.ok(on.onSale); assert.equal(on.percentOff, 40);
  assert.equal(effectivePrice(p, new Date('2026-11-11T00:00:00Z')).price, 1500);
});

test('pricing: server prices from catalogue, applies sale, computes GST and cost', () => {
  const p = product({ salePrice: 1200 });
  const r = priceCart([{ productId: 'p1', size: 'M', quantity: 2 }], catalogue(p));
  assert.equal(r.items[0].unitPrice, 1200); assert.equal(r.totals.subtotal, 2400); assert.equal(r.totals.total, 2400);
  assert.equal(r.totals.cogs, 1200); assert.equal(r.totals.gstIncluded, 114.29);
  assert.equal(totalWeightKg(r.items), 0.8);
});

test('pricing: stock rules (out of stock, too many, same size twice)', () => {
  const c = catalogue(product());
  assert.throws(() => priceCart([{ productId: 'p1', size: 'L', quantity: 1 }], c), /out of stock/);
  assert.throws(() => priceCart([{ productId: 'p1', size: 'M', quantity: 4 }], c), /Only 3 left/);
  assert.throws(() => priceCart([{ productId: 'p1', size: 'M', quantity: 2 }, { productId: 'p1', size: 'M', quantity: 2 }], c), /Only 3 left/);
  assert.throws(() => priceCart([{ productId: 'nope', size: 'M', quantity: 1 }], c), /no longer available/);
  assert.throws(() => priceCart([{ productId: 'p1', size: 'XXL', quantity: 1 }], c), /not available/);
  assert.throws(() => priceCart([{ productId: 'p1', size: 'M', quantity: 1 }], catalogue(product({ isActive: false }))), AppErrorLike);
});
function AppErrorLike(e: unknown) { return e instanceof Error && e.name === 'AppError'; }

test('coupon: percent, flat, caps, minimum, dates, usage', () => {
  const now = new Date('2026-10-16T00:00:00Z');
  assert.deepEqual(evaluateCoupon(coupon(), 3000, now), { ok: true, discount: 300 });
  assert.deepEqual(evaluateCoupon(coupon({ maxDiscount: 200 }), 3000, now), { ok: true, discount: 200 });
  assert.deepEqual(evaluateCoupon(coupon({ kind: 'flat', value: 5000 }), 3000, now), { ok: true, discount: 3000 });
  assert.equal(evaluateCoupon(coupon(), 500, now).ok, false);
  assert.equal(evaluateCoupon(coupon({ endsAt: '2026-10-01T00:00:00Z' }), 3000, now).ok, false);
  assert.equal(evaluateCoupon(coupon({ startsAt: '2026-11-01T00:00:00Z' }), 3000, now).ok, false);
  assert.equal(evaluateCoupon(coupon({ usageLimit: 5, usedCount: 5 }), 3000, now).ok, false);
  assert.equal(evaluateCoupon(coupon({ isActive: false }), 3000, now).ok, false);
  assert.equal(normalizeCode(' save 10 '), 'SAVE10');
});

test('pricing: coupon discount is shared across lines and tax follows the discounted price', () => {
  const a = product(); const b = product({ id: 'p2', sku: 'LT-Y-1', price: 500, mrp: 500, variants: [{ id: 'v2', size: 'M', sku: 'LT-Y-1-M', stock: 5, lowStockThreshold: 2 }] });
  const r = priceCart([{ productId: 'p1', size: 'M', quantity: 1 }, { productId: 'p2', size: 'M', quantity: 1 }], catalogue(a, b), { coupon: coupon({ value: 10 }) });
  assert.equal(r.coupon?.discount, 200);
  assert.equal(r.items.reduce((s, i) => s + i.discountAlloc, 0), 200);   // shares add up exactly
  assert.equal(r.totals.total, 1800);
  assert.throws(() => priceCart([{ productId: 'p2', size: 'M', quantity: 1 }], catalogue(b), { coupon: coupon() }), /Add items worth/);
});

test('cancellation policy by order status', () => {
  const now = new Date('2026-10-20T00:00:00Z');
  const o = (status: string, shipment = {}) => ({ status, shipment: { attempts: 0, cost: 0, ...shipment } }) as never;
  assert.equal(cancellationPolicy(o('PENDING_PAYMENT'), now).mode, 'instant');
  assert.equal(cancellationPolicy(o('COD_CONFIRMED'), now).mode, 'instant');
  assert.equal(cancellationPolicy(o('PAID'), now).mode, 'refund');
  assert.equal(cancellationPolicy(o('SHIPMENT_CREATED'), now).mode, 'cancel-shipment');
  assert.equal(cancellationPolicy(o('SHIPPED'), now).mode, 'none');
  assert.equal(cancellationPolicy(o('DELIVERED', { deliveredAt: '2026-10-18T00:00:00Z' }), now).mode, 'return');
  assert.equal(cancellationPolicy(o('DELIVERED', { deliveredAt: '2026-10-01T00:00:00Z' }), now).mode, 'none');
  assert.equal(cancellationPolicy(o('CANCELLED'), now).mode, 'none');
});

test('csv: parse quotes/commas/newlines and write safely (formula injection guard)', () => {
  assert.deepEqual(parseCsv('a,b\r\n"x,1","he said ""hi"""\n'), [['a', 'b'], ['x,1', 'he said "hi"']]);
  const out = toCsv([{ key: 'n', label: 'Name' }, { key: 'v', label: 'Value' }], [{ n: '=cmd|calc', v: 12.5 }, { n: 'a,b', v: -3 }]);
  assert.match(out, /'=cmd\|calc/); assert.match(out, /"a,b",-3/);
});

test('product CSV import: template is valid; common mistakes are explained per line', () => {
  const ok = parseProductsCsv(PRODUCT_CSV_TEMPLATE);
  assert.equal(ok.errors.length, 0); assert.equal(ok.rows[0].sku, 'LT-EXM-100'); assert.equal(ok.rows[0].sizes.length, 4); assert.equal(ok.rows[0].salePrice, 1799);
  const head = 'sku,name,department,category,size_set,mrp,price,sizes\n';
  const bad = parseProductsCsv(head + 'LT-A-1,Aaa,men,K,apparel,100,200,S:1\nLT-B-1,Bbb,men,K,apparel,200,100,Q:1\nLT-C-1,Ccc,dog,K,apparel,200,100,S:1\nLT-D-1,Ddd,men,K,apparel,200,100,S:-2\nLT-D-1,Ddd,men,K,apparel,200,100,S:2');
  assert.deepEqual(bad.errors.map((e) => e.line), [2, 3, 4, 5, 6]);
  assert.match(bad.errors[0].message, /higher than MRP/); assert.match(bad.errors[1].message, /not valid for size_set/);
  assert.match(parseProductsCsv('sku,name\nA,B').errors[0].message, /Missing column/);
  assert.equal(slugify('Kasavu Mundu & Bandhgala Set'), 'kasavu-mundu-and-bandhgala-set');
});

test('stock CSV import (refill)', () => {
  const r = parseStockCsv('variant_sku,add_qty,note\nlt-x-1-m,10,Supplier\nLT-X-1-L,0,\n,5,');
  assert.equal(r.rows.length, 1); assert.equal(r.rows[0].variantSku, 'LT-X-1-M'); assert.equal(r.errors.length, 2);
});

test('reports: day / month / year profit & loss in Indian time, refunds, RTO, expenses, fees', () => {
  const sale = (o: Partial<SaleRow>): SaleRow => ({ orderId: 'o', at: '2026-10-16T10:00:00Z', status: 'DELIVERED', paymentMethod: 'PREPAID', units: 1, total: 1180, discount: 0, mrpTotal: 1500, gst: 180, cogs: 400, shippingCost: 60, refunded: 0, ...o });
  const rows = [sale({}), sale({ orderId: 'o2', at: '2026-10-31T19:00:00Z', paymentMethod: 'COD', total: 2360, gst: 360, cogs: 800, units: 2 }), sale({ orderId: 'o3', status: 'CANCELLED' }), sale({ orderId: 'o4', at: '2026-11-02T10:00:00Z', status: 'RTO', cogs: 400 })];
  assert.equal(periodKey('2026-10-31T19:00:00Z', 'day'), '2026-11-01');           // 12:30 am IST is already tomorrow
  const m = buildProfitLoss(rows, [{ on: '2026-10-20', category: 'Ads', amount: 200 }], 'month', { gatewayFeePercent: 2 });
  assert.deepEqual(m.map((r) => r.period), ['2026-10', '2026-11']);
  assert.equal(m[0].orders, 1); assert.equal(m[0].grossSales, 1180); assert.equal(m[0].netSalesExGst, 1000); assert.equal(m[0].cogs, 400);
  assert.equal(m[0].gatewayFees, 23.6); assert.equal(m[0].expenses, 200); assert.equal(m[0].netProfit, 1000 - 400 - 23.6 - 60 - 200);
  assert.equal(m[1].orders, 2); assert.equal(buildProfitLoss(rows, [], 'year', { gatewayFeePercent: 2 }).length, 1);
  const rto = m[1];                                                                  // 2026-11: COD order (31 Oct 19:00Z) + the RTO order
  assert.equal(rto.refunds, 1180); assert.ok(rto.netProfit < rto.grossProfit);        // RTO: sale reversed, courier cost still lost
  assert.equal(totalsOf(m).orders, 3);
});

test('notification templates: content, escaping, unsubscribe link only on marketing', () => {
  const c = render('order_confirmed', { name: 'Asha Rao', orderId: 'LT1', total: 1999, orderUrl: 'https://x.in/order/LT1' });
  assert.match(c.subject, /LT1/); assert.match(c.text, /Hi Asha/); assert.match(c.text, /₹1,999/);
  const s = render('order_shipped', { name: 'A', orderId: 'LT1', courier: 'Delhivery', awb: '123', trackingUrl: 'https://t' });
  assert.match(s.text, /Delhivery/); assert.match(s.text, /123/);
  const m = render('marketing', { name: 'Asha', subject: 'New arrivals', body: 'Fresh <b>silk</b>', unsubscribeUrl: 'https://x.in/unsubscribe?t=1' });
  assert.match(m.text, /unsubscribe/); assert.ok(!m.html.includes('<b>silk</b>')); assert.match(m.html, /&lt;b&gt;/);
  assert.ok(!render('order_delivered', { name: 'A', orderId: 'x', unsubscribeUrl: 'u' }).text.includes('unsubscribe'));
});

import { istRange, presetRange } from '../dates';
import { parseSizeStock } from '../catalog-import';
import { detectImageType, isSafeMediaName, parseImageName } from '../media';

test('dates: Indian-time report ranges and presets', () => {
  const r = istRange('2026-10-01', '2026-10-31');
  assert.equal(r.fromIso, '2026-10-01T00:00:00+05:30'); assert.equal(r.toIso, '2026-11-01T00:00:00+05:30');
  const now = new Date('2026-01-15T20:00:00Z');                    // 16 Jan, 1:30 am in India
  assert.equal(presetRange('today', now).from, '2026-01-16');
  assert.equal(presetRange('last-month', now).from, '2025-12-01'); assert.equal(presetRange('last-month', now).to, '2025-12-31');
  assert.equal(presetRange('7d', now).from, '2026-01-10'); assert.equal(presetRange('last-year', now).to, '2025-12-31');
});

test('sizes field parser and media helpers', () => {
  assert.deepEqual(parseSizeStock('apparel', 'S:2; M:3'), { sizes: [{ size: 'S', stock: 2 }, { size: 'M', stock: 3 }] });
  assert.ok('error' in parseSizeStock('apparel', 'Q:1')); assert.ok('error' in parseSizeStock('apparel', '')); assert.ok('error' in parseSizeStock('apparel', 'S:1;S:2'));
  assert.equal(detectImageType(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0, 0]))?.ext, 'jpg');
  assert.equal(detectImageType(new TextEncoder().encode('<?php echo 1; ?>   ')), null);
  assert.deepEqual(parseImageName('lt-knz-001_2.JPG'), { sku: 'LT-KNZ-001', index: 2 });
  assert.deepEqual(parseImageName('LT-KNZ-001.png'), { sku: 'LT-KNZ-001', index: 1 }); assert.equal(parseImageName('holiday.pdf'), null);
  assert.ok(isSafeMediaName('LT-KNZ-001_1_ab12cd34.jpg')); assert.ok(!isSafeMediaName('../etc/passwd')); assert.ok(!isSafeMediaName('a..b.jpg'));
});
