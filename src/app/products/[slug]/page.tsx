import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import AddToCartButton from '@/components/AddToCartButton';
import Gallery from '@/components/Gallery';
import PincodeChecker from '@/components/PincodeChecker';
import ProductCard from '@/components/ProductCard';
import { formatINR } from '@/lib/money';
import { effectivePrice } from '@/lib/pricing';
import { getProduct, listProducts } from '@/lib/repos/catalog';

export const instant = false;
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProduct(slug).catch(() => undefined);
  return p ? { title: p.name, description: p.description.slice(0, 160), openGraph: { images: p.images.slice(0, 1).map((i) => i.url) } } : { title: 'Product not found' };
}

export default function ProductPage({ params }: Props) {
  return <Suspense fallback={<div className="mx-auto h-[70vh] max-w-7xl animate-pulse px-4 py-16"><div className="h-full rounded-2xl bg-rose-100/60" /></div>}><Detail params={params} /></Suspense>;
}

async function Detail({ params }: Props) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();
  const { price, onSale, percentOff } = effectivePrice(product, new Date());
  const related = (await listProducts({ department: product.department === 'unisex' ? undefined : product.department, category: product.category, inStock: true, limit: 5 }).catch(() => [])).filter((p) => p.id !== product.id).slice(0, 4);
  const jsonLd = { '@context': 'https://schema.org', '@type': 'Product', name: product.name, description: product.description, sku: product.sku, image: product.images.map((i) => i.url),
    offers: { '@type': 'Offer', priceCurrency: 'INR', price, availability: product.variants.some((v) => v.stock > 0) ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock' } };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <nav aria-label="Breadcrumb" className="mb-8 flex flex-wrap items-center gap-2 text-xs uppercase tracking-widest text-rose-800/70">
        <Link href="/" className="hover:text-maroon">Home</Link>/<Link href={`/shop?department=${product.department}`} className="capitalize hover:text-maroon">{product.department}</Link>/<Link href={`/shop?category=${encodeURIComponent(product.category)}`} className="hover:text-maroon">{product.category}</Link>
      </nav>
      <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-2">
        <Gallery images={product.images} name={product.name} />
        <div className="space-y-6">
          <div>
            <span className="inline-block rounded-full border border-rose-200 bg-rose-100/80 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-widest">{product.category}</span>
            <h1 className="mt-4 font-serif text-3xl font-light tracking-tight sm:text-5xl">{product.name}</h1>
            <p className="mt-3 flex flex-wrap items-baseline gap-3 text-2xl font-light">{formatINR(price)}{product.mrp > price && <><s className="text-base text-maroon/50">{formatINR(product.mrp)}</s><span className="rounded bg-rose-100 px-2 py-0.5 text-sm font-medium text-rose-800">{percentOff}% off{onSale ? ' · Sale' : ''}</span></>}</p>
            <p className="mt-1 text-xs text-maroon/70">Inclusive of GST · Free shipping across India · SKU {product.sku}</p>
          </div>
          <p className="border-t border-rose-200/80 pt-6 font-light leading-relaxed text-maroon/80">{product.description}</p>
          <div className="border-t border-rose-200/80 pt-6"><AddToCartButton product={product} price={price} /></div>
          <div className="border-t border-rose-200/80 pt-6"><PincodeChecker weightKg={product.weightKg} /></div>
          <ul className="space-y-2 border-t border-rose-200/80 pt-6 text-xs font-medium uppercase tracking-wider text-rose-900/80">
            <li>✦ Free shipping across India</li><li>✦ Easy 7-day returns on unworn pieces</li><li>✦ Secure payment by Razorpay (UPI, cards, net banking)</li>
          </ul>
        </div>
      </div>
      {related.length > 0 && <section className="mt-20"><h2 className="mb-6 font-serif text-2xl">You may also like</h2><div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{related.map((p) => <ProductCard key={p.id} product={p} />)}</div></section>}
    </div>
  );
}
