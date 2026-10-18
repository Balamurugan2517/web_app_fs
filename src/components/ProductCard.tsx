import Image from 'next/image';
import Link from 'next/link';
import { effectivePrice } from '@/lib/pricing';
import { formatINR } from '@/lib/money';
import { mainImage, type Product } from '@/types/product';

export default function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const { price, onSale, percentOff } = effectivePrice(product, new Date());
  const total = product.variants.reduce((s, v) => s + v.stock, 0);
  const soldOut = total <= 0;
  const low = !soldOut && total <= 3;
  return (
    <Link href={`/products/${product.slug}`} className="group flex flex-col overflow-hidden rounded-2xl border border-rose-200/70 bg-white/90 shadow-xs transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl">
      <div className="relative aspect-[4/5] overflow-hidden bg-rose-50">
        <Image src={mainImage(product)} alt={product.name} fill priority={priority} unoptimized={mainImage(product).startsWith('/media/')}
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" className={`object-cover transition-transform duration-500 group-hover:scale-105 ${soldOut ? 'opacity-60 grayscale' : ''}`} />
        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          {onSale && <span className="rounded-full bg-rose-700 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-white">{percentOff}% off</span>}
          {product.isNewArrival && <span className="rounded-full bg-maroon px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-cream">New</span>}
        </div>
        {soldOut && <span className="absolute inset-x-0 bottom-0 bg-maroon/85 py-1.5 text-center text-xs font-semibold uppercase tracking-widest text-cream">Sold out</span>}
        {low && <span className="absolute inset-x-0 bottom-0 bg-amber-600/90 py-1.5 text-center text-xs font-semibold uppercase tracking-widest text-white">Only {total} left</span>}
      </div>
      <div className="flex grow flex-col justify-between bg-white p-5">
        <div>
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-rose-800">{product.department} · {product.category}</span>
          <h2 className="font-serif text-lg font-medium text-maroon transition-colors group-hover:text-rose-700">{product.name}</h2>
        </div>
        <div className="mt-4 flex items-baseline justify-between border-t border-rose-100/60 pt-3">
          <span className="flex items-baseline gap-2"><span className="text-base font-medium text-maroon">{formatINR(price)}</span>{product.mrp > price && <s className="text-xs text-maroon/50">{formatINR(product.mrp)}</s>}</span>
          <span className="text-xs font-medium uppercase tracking-wider text-rose-900 transition-transform group-hover:translate-x-1">View &rarr;</span>
        </div>
      </div>
    </Link>
  );
}
