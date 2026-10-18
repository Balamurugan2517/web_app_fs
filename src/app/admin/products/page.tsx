import Link from 'next/link';
import Image from 'next/image';
import { Suspense } from 'react';
import { Badge, btn2Cls, btnCls, dangerCls, Field, Flash, inputCls, Panel, Table } from '@/components/admin/ui';
import { requireAdmin } from '@/lib/admin-auth';
import { formatINR } from '@/lib/money';
import { effectivePrice } from '@/lib/pricing';
import { listCategories, listProducts } from '@/lib/repos/catalog';
import { bulkSaleAction, visibilityAction } from '../actions';

export const instant = false;
type SP = Promise<{ q?: string; department?: string; ok?: string; err?: string }>;

export default function Products({ searchParams }: { searchParams: SP }) {
  return <Suspense fallback={<p>Loading products…</p>}><Body searchParams={searchParams} /></Suspense>;
}

async function Body({ searchParams }: { searchParams: SP }) {
  await requireAdmin();
  const sp = await searchParams;
  const dept = (['women', 'men', 'kids', 'unisex'] as const).find((d) => d === sp.department);
  const [products, cats] = await Promise.all([listProducts({ includeInactive: true, q: sp.q, department: dept, limit: 200 }), listCategories()]);
  const now = new Date();
  return (
    <div className="space-y-6">
      <Flash ok={sp.ok} err={sp.err} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-3xl">Products ({products.length})</h1>
        <div className="flex gap-2"><Link href="/admin/products/new" className={btnCls}>+ Add product</Link><Link href="/admin/products/import" className={btn2Cls}>Import CSV / photos</Link></div>
      </div>
      <form className="flex flex-wrap gap-2" action="/admin/products"><input name="q" defaultValue={sp.q} placeholder="Search name or SKU" className={`${inputCls} max-w-xs`} />
        <select name="department" defaultValue={sp.department ?? ''} className={`${inputCls} max-w-40`}><option value="">All departments</option><option value="women">Women</option><option value="men">Men</option><option value="kids">Kids</option></select><button className={btn2Cls}>Filter</button></form>
      <Table head={['', 'Product', 'SKU', 'Dept', 'Price', 'Stock', 'Status', '']} empty={products.length ? undefined : 'No products found.'}>
        {products.map((p) => {
          const e = effectivePrice(p, now); const stock = p.variants.reduce((s, v) => s + v.stock, 0);
          return (
            <tr key={p.id}>
              <td className="w-14"><div className="relative h-14 w-11 overflow-hidden rounded"><Image src={p.images[0]?.url ?? '/images/hero.jpg'} alt="" fill unoptimized sizes="44px" className="object-cover" /></div></td>
              <td><Link className="font-medium underline" href={`/admin/products/${p.id}`}>{p.name}</Link><br /><span className="text-xs text-maroon/60">{p.category}</span></td>
              <td className="font-mono text-xs">{p.sku}</td><td className="capitalize">{p.department}</td>
              <td>{e.onSale ? <><b className="text-rose-700">{formatINR(e.price)}</b> <s className="text-xs text-maroon/50">{formatINR(p.price)}</s> <Badge tone="warn">{e.percentOff}% off</Badge></> : formatINR(p.price)}</td>
              <td>{stock === 0 ? <Badge tone="bad">Out of stock</Badge> : stock <= 3 ? <Badge tone="warn">{stock} left</Badge> : stock}</td>
              <td>{p.isActive ? <Badge tone="good">Visible</Badge> : <Badge>Hidden</Badge>}</td>
              <td><form action={visibilityAction}><input type="hidden" name="productId" value={p.id} /><input type="hidden" name="active" value={p.isActive ? '0' : '1'} /><input type="hidden" name="back" value="/admin/products" /><button className="text-xs underline">{p.isActive ? 'Hide' : 'Show'}</button></form></td>
            </tr>
          );
        })}
      </Table>
      <Panel title="Festival sale – discount many products at once" id="sale">
        <form action={bulkSaleAction} className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Field label="Department"><select name="department" className={inputCls}><option value="">All</option><option value="women">Women</option><option value="men">Men</option><option value="kids">Kids</option></select></Field>
          <Field label="Category"><select name="category" className={inputCls}><option value="">All</option>{[...new Set(cats.map((c) => c.category))].map((c) => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Discount %"><input name="percent" type="number" min="1" max="89" className={inputCls} placeholder="e.g. 20" /></Field>
          <Field label="Starts"><input name="start" type="date" className={inputCls} /></Field><Field label="Ends"><input name="end" type="date" className={inputCls} /></Field>
          <div className="flex items-end gap-2"><button name="op" value="apply" className={btnCls}>Apply sale</button><button name="op" value="clear" className={dangerCls}>Remove sale</button></div>
        </form>
        <p className="mt-2 text-xs text-maroon/60">The sale price is calculated from each product&apos;s normal price and switches on and off by itself on the dates you choose. Leave the dates empty to start now with no end.</p>
      </Panel>
    </div>
  );
}
