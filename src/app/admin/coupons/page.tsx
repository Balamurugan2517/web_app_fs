import { Suspense } from 'react';
import { Badge, btn2Cls, btnCls, Field, Flash, inputCls, Panel, Table } from '@/components/admin/ui';
import { requireAdmin } from '@/lib/admin-auth';
import { formatINR } from '@/lib/money';
import { listCoupons } from '@/lib/repos/admin';
import { couponToggleAction, saveCouponAction } from '../actions';

export const instant = false;
type SP = Promise<{ ok?: string; err?: string }>;

export default function Coupons({ searchParams }: { searchParams: SP }) {
  return <Suspense fallback={<p>Loading…</p>}><Body searchParams={searchParams} /></Suspense>;
}

async function Body({ searchParams }: { searchParams: SP }) {
  await requireAdmin('owner');
  const sp = await searchParams;
  const coupons = await listCoupons();
  const d = (s: string | null) => (s ? new Date(s).toLocaleDateString('en-IN') : '—');
  return (
    <div className="space-y-6">
      <Flash ok={sp.ok} err={sp.err} />
      <h1 className="font-serif text-3xl">Coupons</h1>
      <Table head={['Code', 'Discount', 'Min. order', 'Valid', 'Used', 'Status', '']} empty={coupons.length ? undefined : 'No coupons yet.'}>
        {coupons.map((c) => (
          <tr key={c.code}><td className="font-mono font-semibold">{c.code}</td><td>{c.kind === 'percent' ? `${c.value}%${c.maxDiscount ? ` (max ${formatINR(c.maxDiscount)})` : ''}` : formatINR(c.value)}</td><td>{formatINR(c.minOrder)}</td><td>{d(c.startsAt)} → {d(c.endsAt)}</td><td>{c.usedCount}{c.usageLimit ? ` / ${c.usageLimit}` : ''}</td><td>{c.isActive ? <Badge tone="good">Active</Badge> : <Badge>Off</Badge>}</td>
            <td><form action={couponToggleAction}><input type="hidden" name="code" value={c.code} /><input type="hidden" name="active" value={c.isActive ? '0' : '1'} /><button className="text-xs underline">{c.isActive ? 'Switch off' : 'Switch on'}</button></form></td></tr>
        ))}
      </Table>
      <Panel title="Create or change a coupon (same code = update)">
        <form action={saveCouponAction} className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <Field label="Code" hint="e.g. DIWALI15"><input name="code" required className={`${inputCls} uppercase`} /></Field>
          <Field label="Type"><select name="kind" className={inputCls}><option value="percent">Percent off</option><option value="flat">Flat ₹ off</option></select></Field>
          <Field label="Value"><input name="value" type="number" step="0.01" required className={inputCls} /></Field>
          <Field label="Minimum order ₹"><input name="minOrder" type="number" defaultValue={0} className={inputCls} /></Field>
          <Field label="Max discount ₹" hint="For percent coupons"><input name="maxDiscount" type="number" className={inputCls} /></Field>
          <Field label="Starts"><input name="start" type="date" className={inputCls} /></Field><Field label="Ends (inclusive)"><input name="end" type="date" className={inputCls} /></Field>
          <Field label="Usage limit" hint="Total uses; empty = unlimited"><input name="usageLimit" type="number" className={inputCls} /></Field>
          <div className="flex items-end"><button className={btnCls}>Save coupon</button></div>
        </form>
      </Panel>
      <p className="text-xs text-maroon/60"><span className={btn2Cls + ' hidden'} />Customers enter the code in their bag. The discount is shared across the items and GST is calculated on the discounted price.</p>
    </div>
  );
}
