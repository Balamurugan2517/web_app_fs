import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { Badge, btn2Cls, btnCls, dangerCls, Field, Flash, inputCls, Panel } from '@/components/admin/ui';
import { requireAdmin } from '@/lib/admin-auth';
import { cancellationPolicy } from '@/lib/cancellation';
import { formatINR } from '@/lib/money';
import { refundsForOrder } from '@/lib/repos/admin';
import { getOrder } from '@/lib/repos/orders';
import { STATUS_LABEL } from '@/lib/orders/status';
import { adminCancelAction, createShipmentAction, refundAction, shippingCostAction, syncTrackingAction } from '../../actions';

export const instant = false;
type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; err?: string }> };

export default function AdminOrder(props: Props) {
  return <Suspense fallback={<p>Loading order…</p>}><Body {...props} /></Suspense>;
}

async function Body({ params, searchParams }: Props) {
  const admin = await requireAdmin();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const o = await getOrder(id);
  if (!o) notFound();
  const refunds = await refundsForOrder(id);
  const canShip = (o.status === 'PAID' || o.status === 'COD_CONFIRMED') && !o.shipment.shiprocketOrderId;
  const policy = cancellationPolicy(o, new Date());
  const canCancel = ['instant', 'refund', 'cancel-shipment'].includes(policy.mode);
  const refundable = o.paymentMethod === 'PREPAID' && ['CAPTURED', 'PARTIALLY_REFUNDED'].includes(o.payment.status) ? o.totals.total - o.payment.refundedAmount : 0;
  const at = (d: string) => new Date(d).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });

  return (
    <div className="space-y-6">
      <Link href="/admin/orders" className="text-sm underline">← All orders</Link>
      <Flash ok={sp.ok} err={sp.err} />
      <div className="flex flex-wrap items-center justify-between gap-4"><h1 className="font-mono text-2xl">{o.id}</h1><Badge>{STATUS_LABEL[o.status]}</Badge></div>

      <div className="grid gap-6 md:grid-cols-2">
        <Panel title="Customer"><p className="text-sm">{o.customer.name}<br />{o.customer.email}<br />{o.customer.phone}</p><p className="mt-3 text-sm">{o.address.line1}{o.address.line2 ? `, ${o.address.line2}` : ''}<br />{o.address.city}, {o.address.state} {o.address.pincode}</p><p className="mt-3 text-xs text-maroon/60">Placed {at(o.createdAt)}</p></Panel>
        <Panel title="Payment & shipping">
          <p className="text-sm">{o.paymentMethod} · {o.payment.status}{o.payment.razorpayPaymentId ? ` · ${o.payment.razorpayPaymentId}` : ''}{o.payment.refundedAmount ? ` · refunded ${formatINR(o.payment.refundedAmount)}` : ''}</p>
          {o.payment.failureReason && <p className="text-sm text-red-700">{o.payment.failureReason}</p>}
          <p className="mt-3 text-sm">Shiprocket order: {o.shipment.shiprocketOrderId ?? '—'}<br />Tracking no.: {o.shipment.awb ?? '—'} {o.shipment.courier ? `(${o.shipment.courier})` : ''}<br />Last courier status: {o.shipment.lastStatus ?? '—'}</p>
          {o.shipment.lastError && <p className="mt-2 rounded bg-red-50 p-2 text-sm text-red-800">Last shipping error: {o.shipment.lastError}</p>}
          <div className="mt-4 flex flex-wrap gap-3">
            {canShip && <form action={createShipmentAction.bind(null, o.id)}><button className={btnCls}>Create shipment{o.shipment.attempts ? ' (retry)' : ''}</button></form>}
            {o.shipment.awb && <form action={syncTrackingAction.bind(null, o.id)}><button className={btn2Cls}>Sync tracking</button></form>}
          </div>
          <form action={shippingCostAction} className="mt-4 flex items-end gap-2"><input type="hidden" name="orderId" value={o.id} /><Field label="Courier charged you (₹)" hint="Used in profit reports"><input name="cost" type="number" step="0.01" min="0" defaultValue={o.shipment.cost} className={`${inputCls} w-32`} /></Field><button className={btn2Cls}>Save</button></form>
        </Panel>
      </div>

      <Panel title="Items">
        {o.items.map((i) => <p key={`${i.sku}`} className="flex justify-between border-b border-rose-100 py-1.5 text-sm"><span>{i.name} · {i.size} × {i.quantity} <span className="text-maroon/50">({i.sku})</span></span><span>{formatINR(i.unitPrice * i.quantity)}</span></p>)}
        <div className="mt-3 space-y-1 text-right text-sm">{o.totals.discount > 0 && <p>Coupon {o.couponCode}: − {formatINR(o.totals.discount)}</p>}<p className="font-semibold">Total {formatINR(o.totals.total)} <span className="font-normal text-maroon/60">(GST included {formatINR(o.totals.gstIncluded)} · cost of goods {formatINR(o.totals.cogs)})</span></p></div>
      </Panel>

      {(canCancel || refundable > 0) && (
        <Panel title="Cancel / refund">
          <div className="flex flex-wrap gap-6">
            {canCancel && <form action={adminCancelAction} className="flex flex-wrap items-end gap-2"><input type="hidden" name="orderId" value={o.id} /><Field label="Cancel this order" hint={policy.message}><input name="reason" required minLength={3} placeholder="Reason" className={`${inputCls} w-64`} /></Field><button className={dangerCls}>Cancel order</button></form>}
            {refundable > 0 && admin.role === 'owner' && <form action={refundAction} className="flex flex-wrap items-end gap-2"><input type="hidden" name="orderId" value={o.id} /><Field label={`Refund (up to ${formatINR(refundable)})`}><input name="amount" type="number" step="0.01" max={refundable} placeholder="blank = full" className={`${inputCls} w-36`} /></Field><Field label="Reason"><input name="reason" className={`${inputCls} w-52`} /></Field><button className={dangerCls}>Refund</button></form>}
          </div>
          <p className="mt-2 text-xs text-maroon/60">Cancelling puts the stock back, releases the coupon, cancels the courier booking (if not picked up) and refunds online payments automatically.</p>
        </Panel>
      )}
      {refunds.length > 0 && <Panel title="Refunds">{refunds.map((r, i) => <p key={i} className="text-sm">{at(r.created_at.toISOString())} · {formatINR(r.amount)} · {r.status}{r.razorpay_refund_id ? ` · ${r.razorpay_refund_id}` : ''} · {r.reason}</p>)}</Panel>}

      <Panel title="Event log"><ol className="space-y-1 font-mono text-xs">{o.events.map((e, i) => <li key={i}>{at(e.at)} · <b>{e.type}</b> · {e.message}</li>)}</ol></Panel>
    </div>
  );
}
