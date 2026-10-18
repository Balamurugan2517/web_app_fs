import Link from 'next/link';
import { Suspense } from 'react';
import { Badge, Flash, Panel, Stat, Table } from '@/components/admin/ui';
import { requireAdmin } from '@/lib/admin-auth';
import { addDays, presetRange } from '@/lib/dates';
import { formatINR } from '@/lib/money';
import { buildProfitLoss, totalsOf } from '@/lib/reports';
import { getEnv } from '@/lib/env';
import { expenseRows, listReturns, queueDepth } from '@/lib/repos/admin';
import { stockReport } from '@/lib/repos/catalog';
import { countByStatus, salesRows, topProducts } from '@/lib/repos/orders';

export const instant = false;

export default function Dashboard({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string; denied?: string }> }) {
  return <Suspense fallback={<p>Loading dashboard…</p>}><Body searchParams={searchParams} /></Suspense>;
}

async function Body({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string; denied?: string }> }) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const owner = admin.role === 'owner';
  const [today, month, year, d14, statuses, returns, queue, stock, top] = await Promise.all([
    salesRows(presetRange('today').fromIso, presetRange('today').toIso), salesRows(presetRange('month').fromIso, presetRange('month').toIso), salesRows(presetRange('year').fromIso, presetRange('year').toIso),
    salesRows(presetRange('7d').fromIso, presetRange('7d').toIso), countByStatus(), listReturns('requested'), queueDepth(), stockReport(), topProducts(presetRange('30d').fromIso, presetRange('30d').toIso, 5),
  ]);
  const fee = getEnv().PAYMENT_FEE_PERCENT;
  const exp = owner ? await Promise.all([presetRange('month'), presetRange('year')].map((r) => expenseRows(r.from, addDays(r.to, 1)).catch(() => []))) : [[], []];
  const sum = (rows: typeof today, e: Awaited<ReturnType<typeof expenseRows>>) => totalsOf(buildProfitLoss(rows, e, 'year', { gatewayFeePercent: fee }));
  const T = sum(today, []), M = sum(month, exp[0]), Y = sum(year, exp[1]);
  const days = buildProfitLoss(d14, [], 'day', { gatewayFeePercent: fee });
  const maxDay = Math.max(1, ...days.map((d) => d.netSales));
  const low = stock.filter((s) => s.stock > 0 && s.stock <= s.threshold); const out = stock.filter((s) => s.stock === 0);
  const toShip = (statuses.PAID ?? 0) + (statuses.COD_CONFIRMED ?? 0); const failedMsgs = queue.find((q) => q.status === 'failed')?.n ?? 0;

  return (
    <div className="space-y-6">
      <Flash ok={sp.ok} err={sp.err ?? (sp.denied ? 'That page is for the shop owner only.' : undefined)} />
      <h1 className="font-serif text-3xl">Dashboard</h1>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Orders to ship" value={toShip} tone={toShip ? 'warn' : 'good'} sub="Paid / COD, not yet in Shiprocket" />
        <Stat label="Return requests" value={returns.length} tone={returns.length ? 'warn' : 'good'} sub="Waiting for your decision" />
        <Stat label="Low stock sizes" value={low.length} tone={low.length ? 'warn' : 'good'} sub={`${out.length} sizes out of stock`} />
        <Stat label="Messages failed" value={failedMsgs} tone={failedMsgs ? 'bad' : 'good'} sub="Emails / SMS that could not be sent" />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {([['Today', T], ['This month', M], ['This year', Y]] as const).map(([label, t]) => (
          <Panel key={label} title={label}>
            <p className="font-serif text-2xl">{formatINR(t.netSales)}</p><p className="text-xs text-maroon/60">net sales (incl. GST) · {t.orders} order{t.orders === 1 ? '' : 's'} · {t.units} unit{t.units === 1 ? '' : 's'}</p>
            {owner && <p className={`mt-2 text-sm ${t.netProfit < 0 ? 'text-red-700' : 'text-emerald-800'}`}>{t.netProfit < 0 ? 'Loss' : 'Profit'}: <b>{formatINR(Math.abs(t.netProfit))}</b></p>}
          </Panel>
        ))}
      </div>

      <Panel title="Last 7 days – net sales" actions={owner ? <Link href="/admin/reports" className="text-xs underline">Full reports</Link> : undefined}>
        {days.length === 0 ? <p className="text-sm text-maroon/60">No sales yet.</p> : (
          <div className="flex h-40 items-end gap-2" role="img" aria-label="Bar chart of net sales per day">
            {days.map((d) => <div key={d.period} className="flex flex-1 flex-col items-center justify-end gap-1 text-[10px]"><span>{formatINR(d.netSales)}</span><div className="w-full rounded-t bg-maroon" style={{ height: `${Math.max(4, (d.netSales / maxDay) * 100)}px` }} /><span>{d.period.slice(5)}</span></div>)}
          </div>
        )}
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Needs attention">
          <ul className="space-y-2 text-sm">
            <li><Link className="underline" href="/admin/orders?status=PAID">{statuses.PAID ?? 0} paid orders</Link> · <Link className="underline" href="/admin/orders?status=COD_CONFIRMED">{statuses.COD_CONFIRMED ?? 0} COD orders</Link></li>
            <li><Link className="underline" href="/admin/orders?status=PENDING_PAYMENT">{statuses.PENDING_PAYMENT ?? 0} awaiting payment</Link> (released automatically after 30 minutes)</li>
            <li><Link className="underline" href="/admin/returns">{returns.length} return request(s)</Link></li>
            <li><Link className="underline" href="/admin/inventory">{low.length} low-stock and {out.length} out-of-stock sizes</Link></li>
          </ul>
        </Panel>
        <Panel title="Best sellers – last 30 days">
          {top.length === 0 ? <p className="text-sm text-maroon/60">No sales yet.</p> : <Table head={['Product', 'Units', 'Revenue']}>{top.map((t) => <tr key={t.name}><td>{t.name}</td><td>{t.units}</td><td>{formatINR(t.revenue)}</td></tr>)}</Table>}
        </Panel>
      </div>
      <Panel title="Low stock"><Table head={['Product', 'Size', 'Left']} empty={low.length ? undefined : 'Nothing is running low. 🎉'}>{low.slice(0, 8).map((s) => <tr key={s.sku}><td><Link className="underline" href={`/admin/products/${s.productId}`}>{s.product}</Link></td><td>{s.size}</td><td><Badge tone="warn">{s.stock}</Badge></td></tr>)}</Table></Panel>
    </div>
  );
}
