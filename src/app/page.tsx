import Image from 'next/image';
import Link from 'next/link';
import { Suspense } from 'react';
import ProductCard from '@/components/ProductCard';
import { listProducts } from '@/lib/repos/catalog';

export const instant = false;

const perks = [['Free shipping', 'Anywhere in India'], ['Secure payments', 'UPI · Cards · Net Banking'], ['Easy returns', '7 days after delivery'], ['Made by artisans', 'Tamil Nadu & Kerala']];
const depts = [['Women', 'women', '/images/zari.jpg'], ['Men', 'men', '/images/kasavu.jpg'], ['Kids', 'kids', '/images/hero.jpg']];

export default function Home() {
  return (
    <div className="space-y-20 py-8">
      <section className="mx-4 grid items-center gap-10 overflow-hidden rounded-2xl border border-rose-200/70 bg-cream px-8 py-12 sm:mx-8 md:grid-cols-2 md:px-12">
        <div className="space-y-6">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-800">Festive collection 2026</span>
          <h1 className="font-serif text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">Heritage, woven for today.</h1>
          <p className="max-w-md text-lg text-maroon/80">Kanchipuram silk and Kerala Kasavu, reimagined with modern tailoring. For women, men and little ones – delivered across India.</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/shop" className="rounded-md bg-rose-950 px-7 py-3 text-sm font-medium uppercase tracking-wide text-white transition-colors hover:bg-rose-900">Shop the collection</Link>
            <Link href="/shop?sale=1" className="rounded-md border border-maroon px-7 py-3 text-sm font-medium uppercase tracking-wide transition-colors hover:bg-maroon hover:text-cream">View sale</Link>
          </div>
        </div>
        <div className="relative mx-auto aspect-[3/4] w-full max-w-sm overflow-hidden rounded-xl border border-rose-200 shadow-xl">
          <Image src="/images/hero.jpg" alt="Neo-zari couture silk drape" fill priority sizes="(min-width: 768px) 384px, 90vw" className="object-cover" />
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-3 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        {perks.map(([t, d]) => <div key={t} className="rounded-lg border border-rose-200/70 bg-white/70 px-4 py-3 text-sm"><p className="font-semibold">{t}</p><p className="text-maroon/70">{d}</p></div>)}
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="mb-8 font-serif text-3xl font-semibold">Shop by department</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {depts.map(([label, key, img]) => (
            <Link key={key} href={`/shop?department=${key}`} className="group relative flex h-64 flex-col justify-end overflow-hidden rounded-xl p-5">
              <Image src={img} alt="" fill sizes="(min-width: 640px) 33vw, 100vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
              <div className="absolute inset-0 bg-linear-to-t from-black/70 to-transparent" />
              <div className="relative text-white"><h3 className="text-2xl font-bold">{label}</h3><span className="text-xs underline underline-offset-4">Explore &rarr;</span></div>
            </Link>
          ))}
        </div>
      </section>

      <Suspense fallback={<div className="mx-auto h-72 max-w-7xl animate-pulse rounded-2xl bg-rose-100/60" />}>
        <NewArrivals />
      </Suspense>
    </div>
  );
}

async function NewArrivals() {
  const items = await listProducts({ newArrival: true, limit: 4 }).catch(() => []);
  if (!items.length) return null;
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-end justify-between"><h2 className="font-serif text-3xl font-semibold">New arrivals</h2><Link href="/shop?new=1" className="text-sm underline">View all</Link></div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">{items.map((p) => <ProductCard key={p.id} product={p} />)}</div>
    </section>
  );
}
