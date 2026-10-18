/* eslint-disable @next/next/no-html-link-for-pages -- these links download CSV files (route handlers), they are not pages */
import Link from 'next/link';
import { Suspense } from 'react';
import { Badge, btn2Cls, btnCls, Field, Flash, Panel, Stat, Table } from '@/components/admin/ui';
import { requireAdmin } from '@/lib/admin-auth';
import { formatINR } from '@/lib/money';
import { stockReport } from '@/lib/repos/catalog';
import { importStockAction } from '../actions';

export const instant = false;
type SP = Promise<{ show?: string; ok?: string; err?: string }>;

export default function Inventory({ searchParams }: { searchParams: SP }) {
  return <Suspense fallback={<p>Loading…</p>}><Body searchParams={searchParams} /></Suspense>;
}

async function Body({ searchParams }: { searchParams: SP }) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const rows = await stockReport();
  const out = rows.filter((r) => r.stock === 0); const low = rows.filter((r) => r.stock > 0 && r.stock <= r.threshold);
  const show = sp.show === 'out' ? out : sp.show === 'low' ? low : sp.show === 'all' ? rows : [...out, ...low];
  const units = rows.reduce((s, r) => s + r.stock, 0); const cost = rows.reduce((s, r) => s + r.costValue, 0); const sell = rows.reduce((s, r) => s + r.sellValue, 0);
  return (
    <div className="space-y-6">
      <Flash ok={sp.ok} err={sp.err} />
      <h1 className="font-serif text-3xl">Inventory</h1>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Units in stock" value={units} /><Stat label="Stock value (at cost)" value={admin.role === 'owner' ? formatINR(cost) : '—'} /><Stat label="Stock value (at selling price)" value={admin.role === 'owner' ? formatINR(sell) : '—'} />
        <Stat label="Out / low sizes" value={`${out.length} / ${low.length}`} tone={out.length || low.length ? 'warn' : 'good'} />
      </div>
      <div className="flex flex-wrap gap-2 text-sm">{[['', 'Needs attention'], ['out', 'Out of stock'], ['low', 'Low stock'], ['all', 'Everything']].map(([k, l]) => <Link key={k} href={`/admin/inventory?show=${k}`} className={`rounded-full border px-4 py-1.5 ${(sp.show ?? '') === k ? 'border-maroon bg-maroon text-cream' : 'border-rose-300'}`}>{l}</Link>)}
        <a href="/admin/download/stock-csv" className={`${btn2Cls} ml-auto`}>Download stock report (CSV)</a></div>
      <Table head={['Product', 'Size', 'SKU', 'In stock', 'Alert at', 'Dept']} empty={show.length ? undefined : 'Nothing to show.'}>
        {show.map((r) => <tr key={r.sku}><td><Link className="underline" href={`/admin/products/${r.productId}`}>{r.product}</Link></td><td>{r.size}</td><td className="font-mono text-xs">{r.sku}</td><td>{r.stock === 0 ? <Badge tone="bad">Out</Badge> : r.stock <= r.threshold ? <Badge tone="warn">{r.stock}</Badge> : r.stock}</td><td>{r.threshold}</td><td className="capitalize">{r.department}</td></tr>)}
      </Table>
      <Panel title="Refill many sizes at once (CSV)">
        <p className="mb-3 text-sm">After a supplier delivery, list what arrived: <a className="underline" href="/admin/download/stock-template">download the template</a>. Columns: <code>variant_sku, add_qty, note</code> – e.g. <code>LT-KMB-002-M, 10, Supplier delivery</code>. The numbers are <b>added</b> to the current stock (use a minus sign to remove).</p>
        <form action={importStockAction} className="flex flex-wrap items-end gap-3"><Field label="CSV file"><input name="file" type="file" accept=".csv,text/csv" required className="text-sm" /></Field><button name="mode" value="check" className={btn2Cls}>Check file only</button><button name="mode" value="import" className={btnCls}>Add to stock</button></form>
      </Panel>
    </div>
  );
}
