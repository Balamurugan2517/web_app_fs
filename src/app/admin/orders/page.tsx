/* eslint-disable @next/next/no-html-link-for-pages -- these links download CSV files (route handlers), they are not pages */
import Link from 'next/link';
import { Suspense } from 'react';
import { Badge, btn2Cls, Flash, inputCls, Table } from '@/components/admin/ui';
import { requireAdmin } from '@/lib/admin-auth';
import { formatINR } from '@/lib/money';
import { listOrders } from '@/lib/repos/orders';
import { STATUS_LABEL } from '@/lib/orders/status';
import type { OrderStatus } from '@/types/order';

export const instant = false;
type SP = Promise<{ status?: string; q?: string; page?: string; ok?: string; err?: string }>;
const STATUSES = Object.keys(STATUS_LABEL) as OrderStatus[];
const tone = (s: OrderStatus) => (['DELIVERED'].includes(s) ? 'good' : ['CANCELLED', 'PAYMENT_FAILED', 'RTO', 'RETURNED'].includes(s) ? 'bad' : ['PAID', 'COD_CONFIRMED', 'RETURN_REQUESTED'].includes(s) ? 'warn' : 'neutral') as 'good' | 'bad' | 'warn' | 'neutral';

export default function Orders({ searchParams }: { searchParams: SP }) {
  return <Suspense fallback={<p>Loading orders…</p>}><Body searchParams={searchParams} /></Suspense>;
}

async function Body({ searchParams }: { searchParams: SP }) {
  await requireAdmin();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const status = STATUSES.find((s) => s === sp.status);
  const orders = await listOrders({ status, q: sp.q, limit: 50, offset: (page - 1) * 50 });
  const qs = (p: number) => `/admin/orders?${new URLSearchParams({ ...(status ? { status } : {}), ...(sp.q ? { q: sp.q } : {}), page: String(p) })}`;
  return (
    <div className="space-y-5">
      <Flash ok={sp.ok} err={sp.err} />
      <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="font-serif text-3xl">Orders</h1><a href="/admin/download/orders-csv" className={btn2Cls}>Download orders (CSV)</a></div>
      <form className="flex flex-wrap gap-2" action="/admin/orders"><input name="q" defaultValue={sp.q} placeholder="Order no., name, e-mail, phone, tracking no." className={`${inputCls} max-w-sm`} />
        <select name="status" defaultValue={status ?? ''} className={`${inputCls} max-w-52`}><option value="">All statuses</option>{STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select><button className={btn2Cls}>Search</button></form>
      <Table head={['Order', 'Placed (IST)', 'Customer', 'Total', 'Payment', 'Status']} empty={orders.length ? undefined : 'No orders found.'}>
        {orders.map((o) => (
          <tr key={o.id}>
            <td><Link className="font-mono underline" href={`/admin/orders/${o.id}`}>{o.id}</Link></td>
            <td>{new Date(o.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}</td>
            <td>{o.customer.name}<br /><span className="text-xs text-maroon/60">{o.address.city}, {o.address.state}</span></td>
            <td>{formatINR(o.totals.total)}</td><td>{o.paymentMethod} · {o.payment.status}</td><td><Badge tone={tone(o.status)}>{STATUS_LABEL[o.status]}</Badge></td>
          </tr>
        ))}
      </Table>
      <div className="flex justify-between text-sm">{page > 1 ? <Link href={qs(page - 1)} className="underline">← Newer</Link> : <span />}{orders.length === 50 && <Link href={qs(page + 1)} className="underline">Older →</Link>}</div>
    </div>
  );
}
