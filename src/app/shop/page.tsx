import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import ProductCard from '@/components/ProductCard';
import { listCategories, listProducts, type ProductFilter } from '@/lib/repos/catalog';
import { SIZE_SETS } from '@/lib/sizes';
import type { Department } from '@/types/product';

export const metadata: Metadata = { title: 'Shop', description: 'Women, men and kids fashion – sarees, kurtas, ethnic sets, tailoring and footwear.' };
export const instant = false; // filters live in the URL (?department=women&size=M…), which is only known at request time

type SP = Promise<Record<string, string | undefined>>;
const DEPTS: [string, Department | ''][] = [['All', ''], ['Women', 'women'], ['Men', 'men'], ['Kids', 'kids']];
const PRICES: [string, string][] = [['Any price', ''], ['Under ₹2,000', '0-2000'], ['₹2,000 – ₹10,000', '2000-10000'], ['₹10,000 – ₹50,000', '10000-50000'], ['Above ₹50,000', '50000-']];
const ALL_SIZES = [...new Set(Object.values(SIZE_SETS).flat())].filter((s) => s !== 'Free Size');

export default function ShopPage({ searchParams }: { searchParams: SP }) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="font-serif text-4xl font-light sm:text-5xl">The collection</h1>
      <Suspense fallback={<div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <div key={i} className="aspect-[4/5] animate-pulse rounded-2xl bg-rose-100/60" />)}</div>}>
        <Catalogue searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Catalogue({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const dept = (['women', 'men', 'kids'] as const).find((d) => d === sp.department);
  const [min, max] = (sp.price ?? '').split('-').map((x) => (x ? Number(x) : undefined));
  const filter: ProductFilter = {
    department: dept, category: sp.category, q: sp.q?.slice(0, 60), size: sp.size, minPrice: min, maxPrice: max,
    inStock: sp.stock === '1', onSale: sp.sale === '1', newArrival: sp.new === '1',
    sort: (['new', 'price-asc', 'price-desc', 'name'] as const).find((s) => s === sp.sort),
  };
  const [products, categories] = await Promise.all([listProducts(filter).catch(() => null), listCategories().catch(() => [])]);
  const cats = [...new Set(categories.filter((c) => !dept || c.department === dept || c.department === 'unisex').map((c) => c.category))];
  const link = (patch: Record<string, string>) => `/shop?${new URLSearchParams(Object.entries({ ...sp, ...patch }).filter(([, v]) => v) as [string, string][])}`;
  const title = sp.sale === '1' ? 'Sale' : sp.new === '1' ? 'New arrivals' : sp.q ? `Results for “${sp.q}”` : dept ? dept[0].toUpperCase() + dept.slice(1) : 'All pieces';

  return (
    <>
      <nav aria-label="Departments" className="mt-6 flex flex-wrap gap-2">
        {DEPTS.map(([label, key]) => (
          <Link key={label} href={link({ department: key, category: '' })} className={`rounded-full border px-4 py-1.5 text-sm transition ${(dept ?? '') === key ? 'border-maroon bg-maroon text-cream' : 'border-rose-300/70 bg-white/70 hover:border-maroon'}`}>{label}</Link>
        ))}
        <span className="mx-1 hidden w-px bg-rose-300 sm:block" />
        {cats.map((c) => <Link key={c} href={link({ category: sp.category === c ? '' : c })} className={`rounded-full border px-3 py-1.5 text-xs transition ${sp.category === c ? 'border-rose-700 bg-rose-700 text-white' : 'border-rose-200 bg-white/60 hover:border-maroon'}`}>{c}</Link>)}
      </nav>

      <form className="mt-6 flex flex-wrap items-end gap-3 rounded-xl border border-rose-200 bg-white/70 p-4 text-sm" action="/shop">
        {dept && <input type="hidden" name="department" value={dept} />}{sp.category && <input type="hidden" name="category" value={sp.category} />}{sp.sale && <input type="hidden" name="sale" value="1" />}{sp.new && <input type="hidden" name="new" value="1" />}
        <label className="flex flex-col gap-1">Search<input name="q" defaultValue={sp.q} className="rounded-md border border-rose-200 px-3 py-1.5" placeholder="e.g. silk" /></label>
        <label className="flex flex-col gap-1">Size<select name="size" defaultValue={sp.size ?? ''} className="rounded-md border border-rose-200 px-3 py-1.5"><option value="">Any</option>{ALL_SIZES.map((s) => <option key={s}>{s}</option>)}</select></label>
        <label className="flex flex-col gap-1">Price<select name="price" defaultValue={sp.price ?? ''} className="rounded-md border border-rose-200 px-3 py-1.5">{PRICES.map(([l, v]) => <option key={l} value={v}>{l}</option>)}</select></label>
        <label className="flex flex-col gap-1">Sort by<select name="sort" defaultValue={sp.sort ?? 'new'} className="rounded-md border border-rose-200 px-3 py-1.5"><option value="new">Newest</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="name">Name</option></select></label>
        <label className="flex items-center gap-2 pb-2"><input type="checkbox" name="stock" value="1" defaultChecked={sp.stock === '1'} />In stock only</label>
        <button className="rounded-md bg-maroon px-5 py-2 text-xs font-semibold uppercase tracking-wider text-cream">Apply</button>
        <Link href="/shop" className="pb-2 text-xs underline">Clear</Link>
      </form>

      <div className="mt-8 flex items-baseline justify-between"><h2 className="font-serif text-2xl">{title}</h2>{products && <p className="text-sm text-maroon/70">{products.length} piece{products.length === 1 ? '' : 's'}</p>}</div>
      {products === null ? <p className="mt-10 text-center">We could not load the collection. Please try again in a moment.</p>
        : products.length === 0 ? <div className="mt-10 rounded-xl border border-dashed border-rose-300 p-10 text-center"><p className="font-serif text-xl">No pieces match these filters</p><Link href="/shop" className="mt-3 inline-block underline">See everything</Link></div>
        : <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">{products.map((p, i) => <ProductCard key={p.id} product={p} priority={i < 4} />)}</div>}
    </>
  );
}
