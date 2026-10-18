import { Suspense } from 'react';
import { btn2Cls, btnCls, Field, inputCls, Panel, Stat } from '@/components/admin/ui';
import PrintButton from '@/components/admin/PrintButton';
import { requireAdmin } from '@/lib/admin-auth';
import { addDays, isDateString, istRange, presetRange, type Preset } from '@/lib/dates';
import { getEnv } from '@/lib/env';
import { formatINR } from '@/lib/money';
import { buildProfitLoss, totalsOf, type Granularity } from '@/lib/reports';
import { expenseRows } from '@/lib/repos/admin';
import { salesRows } from '@/lib/repos/orders';

export const instant = false;
type SP = Promise<{ preset?: string; from?: string; to?: string; by?: string }>;
const PRESETS: [Preset, string][] = [['today', 'Today'], ['7d', 'Last 7 days'], ['30d', 'Last 30 days'], ['month', 'This month'], ['last-month', 'Last month'], ['year', 'This year'], ['last-year', 'Last year']];

export default function Reports({ searchParams }: { searchParams: SP }) {
  return <Suspense fallback={<p>Loading report…</p>}><Body searchParams={searchParams} /></Suspense>;
}

async function Body({ searchParams }: { searchParams: SP }) {
  await requireAdmin('owner');
  const sp = await searchParams;
  const preset = PRESETS.find(([k]) => k === sp.preset)?.[0];
  const range = isDateString(sp.from) && isDateString(sp.to) && sp.from <= sp.to ? istRange(sp.from, sp.to) : presetRange(preset ?? 'month');
  const by: Granularity = (['day', 'month', 'year'] as const).find((g) => g === sp.by) ?? (range.from.slice(0, 4) !== range.to.slice(0, 4) ? 'year' : range.from.slice(0, 7) !== range.to.slice(0, 7) ? 'month' : 'day');
  const [sales, expenses] = await Promise.all([salesRows(range.fromIso, range.toIso), expenseRows(range.from, addDays(range.to, 1))]);
  const rows = buildProfitLoss(sales, expenses, by, { gatewayFeePercent: getEnv().PAYMENT_FEE_PERCENT });
  const t = totalsOf(rows);
  const qs = new URLSearchParams({ from: range.from, to: range.to, by });
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden"><h1 className="font-serif text-3xl">Sales &amp; profit reports</h1><div className="flex gap-2"><a className={btn2Cls} href={`/admin/download/profit-csv?${qs}`}>Download CSV</a><a className={btn2Cls} href={`/admin/download/sales-csv?${qs}`}>Order-wise CSV</a><PrintButton /></div></div>
      <div className="flex flex-wrap gap-2 text-sm print:hidden">{PRESETS.map(([k, l]) => <a key={k} href={`/admin/reports?preset=${k}`} className={`rounded-full border px-4 py-1.5 ${preset === k && !sp.from ? 'border-maroon bg-maroon text-cream' : 'border-rose-300'}`}>{l}</a>)}</div>
      <form className="flex flex-wrap items-end gap-3 print:hidden" action="/admin/reports"><Field label="From"><input type="date" name="from" defaultValue={range.from} className={inputCls} /></Field><Field label="To"><input type="date" name="to" defaultValue={range.to} className={inputCls} /></Field>
        <Field label="Group by"><select name="by" defaultValue={by} className={inputCls}><option value="day">Day</option><option value="month">Month</option><option value="year">Year</option></select></Field><button className={btnCls}>Show</button></form>
      <p className="hidden text-sm print:block">Luxe &amp; Thread · Profit &amp; loss · {range.from} to {range.to} (Indian time)</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Net sales (incl. GST)" value={formatINR(t.netSales)} sub={`${t.orders} orders · ${t.units} units`} /><Stat label="Gross profit" value={formatINR(t.grossProfit)} sub="after cost of goods, excl. GST" />
        <Stat label="Costs (fees + courier + expenses)" value={formatINR(t.gatewayFees + t.shippingCost + t.expenses)} /><Stat label={t.netProfit < 0 ? 'Net LOSS' : 'Net profit'} value={formatINR(Math.abs(t.netProfit))} tone={t.netProfit < 0 ? 'bad' : 'good'} />
      </div>
      <Panel title={`By ${by}`}>
        <div className="overflow-x-auto"><table className="w-full whitespace-nowrap text-right text-sm"><thead className="text-xs uppercase tracking-wider"><tr className="border-b border-rose-200 [&>th]:p-2"><th className="text-left">Period</th><th>Orders</th><th>Units</th><th>Gross sales</th><th>Discounts</th><th>Refunds</th><th>Net sales</th><th>GST</th><th>Cost of goods</th><th>Gross profit</th><th>Pay fees</th><th>Courier</th><th>Expenses</th><th>Net profit</th></tr></thead>
          <tbody className="[&_td]:p-2">{[...rows, t].map((r) => <tr key={r.period} className={`border-b border-rose-100 ${r.period === 'TOTAL' ? 'bg-cream font-semibold' : ''}`}><td className="text-left">{r.period}</td><td>{r.orders}</td><td>{r.units}</td><td>{formatINR(r.grossSales)}</td><td>{formatINR(r.discounts)}</td><td>{formatINR(r.refunds)}</td><td>{formatINR(r.netSales)}</td><td>{formatINR(r.gst)}</td><td>{formatINR(r.cogs)}</td><td>{formatINR(r.grossProfit)}</td><td>{formatINR(r.gatewayFees)}</td><td>{formatINR(r.shippingCost)}</td><td>{formatINR(r.expenses)}</td><td className={r.netProfit < 0 ? 'text-red-700' : 'text-emerald-800'}>{formatINR(r.netProfit)}</td></tr>)}</tbody></table></div>
        {rows.length === 0 && <p className="p-4 text-center text-sm text-maroon/60">No sales in this period.</p>}
      </Panel>
      <p className="text-xs text-maroon/60">How it is calculated: Net profit = net sales (after refunds, without GST) − cost of goods − payment fees (estimated {getEnv().PAYMENT_FEE_PERCENT}% of online payments) − courier cost you entered on each order − expenses. Cancelled and unpaid orders are ignored; returned-to-origin orders are reversed.</p>
    </div>
  );
}
