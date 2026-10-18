import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { Badge, btn2Cls, btnCls, dangerCls, Field, Flash, inputCls, Panel, Table } from '@/components/admin/ui';
import { requireAdmin } from '@/lib/admin-auth';
import { SIZE_SET_LABEL, SIZE_SETS } from '@/lib/sizes';
import { effectivePrice } from '@/lib/pricing';
import { getProduct } from '@/lib/repos/catalog';
import { addSizeAction, outOfStockAction, removeImageAction, saveProductAction, stockAction, uploadImagesAction, visibilityAction } from '../../actions';

export const instant = false;
type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; err?: string }> };
const day = (d: string | null) => (d ? d.slice(0, 10) : '');

export default function ProductEdit(props: Props) {
  return <Suspense fallback={<p>Loading…</p>}><Body {...props} /></Suspense>;
}

async function Body({ params, searchParams }: Props) {
  await requireAdmin();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const p = id === 'new' ? undefined : await getProduct(id, { includeInactive: true });
  if (id !== 'new' && !p) notFound();
  const missing = p ? SIZE_SETS[p.sizeSet].filter((s) => !p.variants.some((v) => v.size === s)) : [];
  const e = p ? effectivePrice(p, new Date()) : null;

  return (
    <div className="space-y-6">
      <Link href="/admin/products" className="text-sm underline">← All products</Link>
      <Flash ok={sp.ok} err={sp.err} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-3xl">{p ? p.name : 'Add a product'}</h1>
        {p && <div className="flex gap-2">{e?.onSale && <Badge tone="warn">On sale · {e.percentOff}% off</Badge>}{p.isActive ? <Badge tone="good">Visible in shop</Badge> : <Badge>Hidden</Badge>}</div>}
      </div>

      <Panel title="1 · Details, price & discount">
        <form action={saveProductAction} className="grid gap-4 md:grid-cols-3">
          {p && <input type="hidden" name="id" value={p.id} />}
          <Field label="SKU (style code)" hint={p ? 'Cannot be changed – it identifies this product forever' : 'e.g. LT-KMB-002. Used for sizes (LT-KMB-002-M) and photos.'}><input name="sku" defaultValue={p?.sku} readOnly={!!p} required className={`${inputCls} ${p ? 'bg-rose-50' : ''}`} /></Field>
          <Field label="Name"><input name="name" defaultValue={p?.name} required className={inputCls} /></Field>
          <Field label="Category"><input name="category" defaultValue={p?.category} required className={inputCls} placeholder="Sarees, Kurtas, Footwear…" /></Field>
          <Field label="Department"><select name="department" defaultValue={p?.department ?? 'women'} className={inputCls}><option value="women">Women</option><option value="men">Men</option><option value="kids">Kids</option><option value="unisex">Unisex</option></select></Field>
          <Field label="Size type" hint={p ? 'Fixed after creation' : undefined}>{p ? <><input value={SIZE_SET_LABEL[p.sizeSet]} disabled className={`${inputCls} bg-rose-50`} /><input type="hidden" name="sizeSet" value={p.sizeSet} /></> : <select name="sizeSet" defaultValue="apparel" className={inputCls}>{Object.entries(SIZE_SET_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>}</Field>
          <Field label="Description"><textarea name="description" defaultValue={p?.description} rows={3} className={inputCls} /></Field>
          <Field label="MRP ₹" hint="Printed price"><input name="mrp" type="number" step="0.01" defaultValue={p?.mrp} required className={inputCls} /></Field>
          <Field label="Selling price ₹ (incl. GST)"><input name="price" type="number" step="0.01" defaultValue={p?.price} required className={inputCls} /></Field>
          <Field label="Cost price ₹" hint="What it costs you – used for profit reports"><input name="costPrice" type="number" step="0.01" defaultValue={p?.costPrice ?? 0} className={inputCls} /></Field>
          <Field label="Discount (sale) price ₹" hint="Leave empty for no discount"><input name="salePrice" type="number" step="0.01" defaultValue={p?.salePrice ?? ''} className={inputCls} /></Field>
          <Field label="Sale starts"><input name="saleStart" type="date" defaultValue={day(p?.saleStartsAt ?? null)} className={inputCls} /></Field>
          <Field label="Sale ends"><input name="saleEnd" type="date" defaultValue={day(p?.saleEndsAt ?? null)} className={inputCls} /></Field>
          <Field label="GST %" hint="Confirm with your CA"><input name="gstRate" type="number" step="0.01" defaultValue={p?.gstRate ?? 18} className={inputCls} /></Field>
          <Field label="HSN code"><input name="hsnCode" defaultValue={p?.hsnCode} className={inputCls} /></Field>
          <Field label="Packed weight (kg)"><input name="weightKg" type="number" step="0.001" defaultValue={p?.weightKg ?? 0.5} className={inputCls} /></Field>
          {!p && <div className="md:col-span-3"><Field label="Sizes and starting stock" hint="Format  size:quantity  separated by ;   e.g.  S:10;M:12;L:8;XL:4   (XS, S, M, L, XL, XXL · kids 2-3Y… · footwear 5–11)"><input name="sizes" required className={inputCls} placeholder="S:10;M:12;L:8" /></Field></div>}
          <div className="flex flex-wrap items-center gap-6 md:col-span-3"><label className="flex gap-2 text-sm"><input type="checkbox" name="isActive" defaultChecked={p?.isActive ?? true} />Visible in the shop</label><label className="flex gap-2 text-sm"><input type="checkbox" name="isNewArrival" defaultChecked={p?.isNewArrival} />Show as “New arrival”</label><button className={btnCls}>{p ? 'Save changes' : 'Create product'}</button></div>
        </form>
      </Panel>

      {p && (
        <>
          <Panel title="2 · Stock by size" actions={<form action={outOfStockAction}><input type="hidden" name="productId" value={p.id} /><button className={dangerCls}>Mark whole product out of stock</button></form>}>
            <Table head={['Size', 'SKU', 'In stock', 'Receive new stock (+)', 'Correct count (stock-take)']}>
              {p.variants.map((v) => (
                <tr key={v.id}>
                  <td className="font-semibold">{v.size}</td><td className="font-mono text-xs">{v.sku}</td>
                  <td>{v.stock === 0 ? <Badge tone="bad">0 · out</Badge> : v.stock <= v.lowStockThreshold ? <Badge tone="warn">{v.stock} · low</Badge> : v.stock}</td>
                  <td><form action={stockAction} className="flex gap-2"><input type="hidden" name="productId" value={p.id} /><input type="hidden" name="variantId" value={v.id} /><input type="hidden" name="mode" value="add" /><input name="qty" type="number" min="1" required className={`${inputCls} w-24`} placeholder="+ qty" /><input name="note" className={`${inputCls} w-40`} placeholder="Note (optional)" /><button className={btn2Cls}>Add</button></form></td>
                  <td><form action={stockAction} className="flex gap-2"><input type="hidden" name="productId" value={p.id} /><input type="hidden" name="variantId" value={v.id} /><input type="hidden" name="mode" value="set" /><input name="qty" type="number" min="0" required className={`${inputCls} w-24`} placeholder="= qty" /><button className={btn2Cls}>Set</button></form></td>
                </tr>
              ))}
            </Table>
            {missing.length > 0 && <form action={addSizeAction} className="mt-4 flex flex-wrap items-end gap-3"><input type="hidden" name="productId" value={p.id} /><Field label="Add another size"><select name="size" className={inputCls}>{missing.map((s) => <option key={s}>{s}</option>)}</select></Field><Field label="Starting stock"><input name="stock" type="number" min="0" defaultValue={0} className={inputCls} /></Field><button className={btn2Cls}>Add size</button></form>}
            <p className="mt-3 text-xs text-maroon/60">Every change is recorded (who, when, why). Customers can never buy more than the stock shown here.</p>
          </Panel>

          <Panel title="3 · Photos">
            <div className="flex flex-wrap gap-3">
              {p.images.map((im) => (
                <div key={im.url} className="w-28"><div className="relative aspect-[4/5] overflow-hidden rounded border border-rose-200"><Image src={im.url} alt="" fill unoptimized sizes="112px" className="object-cover" /></div>
                  <form action={removeImageAction}><input type="hidden" name="productId" value={p.id} /><input type="hidden" name="url" value={im.url} /><button className="mt-1 text-xs text-red-700 underline">Remove</button></form></div>
              ))}
              {p.images.length === 0 && <p className="text-sm text-maroon/60">No photos yet.</p>}
            </div>
            <form action={uploadImagesAction} className="mt-4 flex flex-wrap items-end gap-3"><input type="hidden" name="productId" value={p.id} /><Field label="Add photos (JPG, PNG, WebP · max 3 MB each)"><input name="files" type="file" accept="image/jpeg,image/png,image/webp" multiple required className="text-sm" /></Field><button className={btn2Cls}>Upload</button></form>
            <p className="mt-2 text-xs text-maroon/60">The first photo is the main one. Tip: use portrait photos (4:5).</p>
          </Panel>

          <Panel title="4 · Visibility"><form action={visibilityAction} className="flex items-center gap-3"><input type="hidden" name="productId" value={p.id} /><input type="hidden" name="active" value={p.isActive ? '0' : '1'} /><button className={p.isActive ? dangerCls : btnCls}>{p.isActive ? 'Hide from shop' : 'Show in shop'}</button><span className="text-sm text-maroon/70">Hidden products keep their history and can be shown again any time.</span></form></Panel>
        </>
      )}
    </div>
  );
}
