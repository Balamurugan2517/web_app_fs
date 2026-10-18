/* eslint-disable @next/next/no-html-link-for-pages -- these links download CSV files (route handlers), they are not pages */
import Link from 'next/link';
import { Suspense } from 'react';
import { btn2Cls, btnCls, Field, Flash, Panel } from '@/components/admin/ui';
import { requireAdmin } from '@/lib/admin-auth';
import { bulkImagesAction, importProductsAction } from '../../actions';

export const instant = false;
type SP = Promise<{ ok?: string; err?: string }>;

export default function ImportPage({ searchParams }: { searchParams: SP }) {
  return <Suspense fallback={<p>Loading…</p>}><Body searchParams={searchParams} /></Suspense>;
}

async function Body({ searchParams }: { searchParams: SP }) {
  await requireAdmin();
  const sp = await searchParams;
  return (
    <div className="space-y-6">
      <Link href="/admin/products" className="text-sm underline">← All products</Link>
      <Flash ok={sp.ok} err={sp.err} />
      <h1 className="font-serif text-3xl">Import products (new arrivals)</h1>
      <Panel title="Step 1 · Upload photos named after the SKU">
        <p className="mb-3 text-sm">Name each photo with the style code, then an underscore and the photo number: <code className="rounded bg-rose-50 px-1">LT-KNZ-001_1.jpg</code>, <code className="rounded bg-rose-50 px-1">LT-KNZ-001_2.jpg</code>. They attach to the right product by themselves (the product must exist – import the CSV first, or run this step again afterwards).</p>
        <form action={bulkImagesAction} className="flex flex-wrap items-end gap-3"><Field label="Photos (JPG / PNG / WebP, max 3 MB each)"><input name="files" type="file" accept="image/jpeg,image/png,image/webp" multiple required className="text-sm" /></Field><button className={btn2Cls}>Upload photos</button></form>
      </Panel>
      <Panel title="Step 2 · Upload the products CSV">
        <p className="mb-3 text-sm">One row per product. <a className="underline" href="/admin/download/product-template">Download the template</a> and open it in Excel / Google Sheets. Existing SKUs are <b>updated</b> (price, name, discount…) but their stock is <b>not</b> changed – use <Link className="underline" href="/admin/inventory">Inventory → stock CSV</Link> to refill stock. New sizes of an existing product are added with their stock.</p>
        <form action={importProductsAction} className="flex flex-wrap items-end gap-3"><Field label="CSV file"><input name="file" type="file" accept=".csv,text/csv" required className="text-sm" /></Field>
          <button name="mode" value="check" className={btn2Cls}>Check file only</button><button name="mode" value="import" className={btnCls}>Import now</button></form>
        <p className="mt-3 text-xs text-maroon/60">Columns: sku, name, description, department, category, size_set, mrp, price, sale_price, sale_starts, sale_ends, cost_price, gst_rate, hsn_code, weight_kg, new_arrival, active, images, sizes (e.g. S:10;M:12). Dates are YYYY-MM-DD. If any line has a mistake, nothing is imported and you get the line numbers.</p>
      </Panel>
    </div>
  );
}
