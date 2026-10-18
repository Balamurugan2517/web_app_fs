import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import AutoRefresh from '@/components/AutoRefresh';
import { safeEqual } from '@/lib/crypto';
import { formatINR } from '@/lib/money';
import OrderActions from '@/components/OrderActions';
import { cancellationPolicy } from '@/lib/cancellation';
import { getOrder } from '@/lib/repos/orders';
import { STATUS_LABEL } from '@/lib/orders/status';
import { siteConfig } from '@/lib/site-config';
import type { Order } from '@/types/order';

export const metadata: Metadata = { title: 'Your order', robots: { index: false } };
export const instant = false; // reads the URL and the order file at request time

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string }> };

export default function OrderPage({ params, searchParams }: Props) {
  return (
    <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <Suspense fallback={<p className="text-center text-sm">Loading your order…</p>}>
        <OrderDetails params={params} searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

const STEPS = ['Order placed', 'Paid', 'Shipped', 'Delivered'] as const;
function stepIndex(o: Order): number {
  if (o.status === 'DELIVERED') return 3;
  if (o.status === 'SHIPPED') return 2;
  if (o.status === 'PAID' || o.status === 'COD_CONFIRMED' || o.status === 'SHIPMENT_CREATED') return 1;
  if (o.status === 'RETURN_REQUESTED') return 3;
  return 0;
}

async function OrderDetails({ params, searchParams }: Props) {
  const { id } = await params;
  const { t } = await searchParams;
  const order = await getOrder(id);
  // The secret token in the link proves this visitor is the buyer. Wrong/missing token looks exactly like "not found".
  if (!order || !t || !safeEqual(order.publicToken, t)) notFound();

  const done = stepIndex(order);
  const dead = ['CANCELLED', 'RTO', 'PAYMENT_FAILED', 'RETURNED'].includes(order.status);
  const policy = cancellationPolicy(order, new Date());
  return (
    <div className="space-y-8">
      {order.status === 'PENDING_PAYMENT' && <AutoRefresh />}
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-rose-800">Order {order.id}</p>
        <h1 className="mt-1 font-serif text-4xl font-light">{order.status === 'PENDING_PAYMENT' ? 'Confirming your payment…' : 'Thank you, ' + order.customer.name.split(' ')[0]}</h1>
        <p className="mt-2 inline-block rounded-full border border-rose-300 bg-cream px-3 py-1 text-sm font-medium">{STATUS_LABEL[order.status]}</p>
        {order.status === 'PENDING_PAYMENT' && <p className="mt-3 text-sm text-maroon/80">If you have already paid, please don&apos;t pay again – this page updates automatically once the bank confirms.</p>}
        {order.status === 'PAYMENT_FAILED' && <p className="mt-3 text-sm text-red-700">{order.payment.failureReason ?? 'Your payment did not go through.'} Please place the order again.</p>}
      </header>

      {!dead && (
        <ol className="grid grid-cols-4 gap-2 text-center text-xs">
          {STEPS.map((s, i) => (
            <li key={s} className={`rounded-lg border px-2 py-3 ${i <= done ? 'border-maroon bg-maroon text-cream' : 'border-rose-200 bg-white/60 text-maroon/60'}`}>{s}</li>
          ))}
        </ol>
      )}

      {order.shipment.awb && (
        <p className="rounded-lg border border-rose-200 bg-white/70 p-4 text-sm">
          Courier: <b>{order.shipment.courier ?? '—'}</b> · Tracking number: <b>{order.shipment.awb}</b>
          {order.shipment.trackingUrl && <> · <a className="underline" href={order.shipment.trackingUrl} target="_blank" rel="noopener noreferrer">Track shipment</a></>}
        </p>
      )}

      <div className="rounded-2xl border border-rose-200 bg-white/80 p-6">
        <ul className="divide-y divide-rose-100">
          {order.items.map((i) => (
            <li key={`${i.productId}-${i.size}`} className="flex gap-3 py-3 text-sm">
              <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded"><Image src={i.image} alt="" fill sizes="48px" className="object-cover" /></div>
              <div className="flex-1"><p className="font-medium">{i.name}</p><p className="text-xs text-maroon/70">Size {i.size} · Qty {i.quantity}</p></div>
              <p>{formatINR(i.unitPrice * i.quantity)}</p>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-1 border-t border-rose-200 pt-4 text-sm">
          {order.totals.discount > 0 && <div className="flex justify-between text-emerald-800"><dt>Coupon {order.couponCode}</dt><dd>− {formatINR(order.totals.discount)}</dd></div>}
          <div className="flex justify-between"><dt>Shipping</dt><dd>{order.totals.shipping ? formatINR(order.totals.shipping) : 'Free'}</dd></div>
          <div className="flex justify-between text-xs text-maroon/70"><dt>GST included</dt><dd>{formatINR(order.totals.gstIncluded)}</dd></div>
          <div className="flex justify-between text-base font-semibold"><dt>Total {order.paymentMethod === 'COD' ? '(pay on delivery)' : 'paid'}</dt><dd>{formatINR(order.totals.total)}</dd></div>
        </dl>
      </div>

      {order.payment.refundedAmount > 0 && <p className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm">Refund of <b>{formatINR(order.payment.refundedAmount)}</b> started – it usually reaches your account in 5–7 business days.</p>}
      {order.status !== 'PENDING_PAYMENT' && <OrderActions orderId={order.id} token={t} mode={policy.mode} message={policy.message} />}

      <div className="text-sm text-maroon/80">
        <p className="font-semibold">Delivering to</p>
        <p>{order.customer.name}, {order.address.line1}{order.address.line2 ? `, ${order.address.line2}` : ''}, {order.address.city}, {order.address.state} {order.address.pincode}</p>
        <p className="mt-4">Questions? Write to <a className="underline" href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a> quoting <b>{order.id}</b>.</p>
      </div>
      <Link href="/shop" className="inline-block text-sm underline underline-offset-4">Continue shopping</Link>
    </div>
  );
}
