'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useCart } from '@/context/CartContext';
import type { Product } from '@/types/product';

/** Size picker with live stock. Out-of-stock sizes are shown but disabled; low stock is called out. */
export default function AddToCartButton({ product, price }: { product: Product; price: number }) {
  const { addToCart, cart } = useCart();
  const available = product.variants.filter((v) => v.stock > 0);
  const [size, setSize] = useState<string | null>(available.length === 1 ? available[0].size : null);
  const [message, setMessage] = useState<{ text: string; tone: 'ok' | 'bad' } | null>(null);
  const selected = product.variants.find((v) => v.size === size);
  const inBag = cart.find((i) => i.product.id === product.id && i.selectedSize === size)?.quantity ?? 0;

  const add = () => {
    if (!size || !selected) return setMessage({ text: 'Please select a size', tone: 'bad' });
    if (inBag >= selected.stock) return setMessage({ text: `Only ${selected.stock} available in this size`, tone: 'bad' });
    addToCart({ id: product.id, slug: product.slug, name: product.name, image: product.images[0]?.url ?? '/images/hero.jpg', price, mrp: product.mrp }, size);
    setMessage({ text: 'Added to your bag ✓', tone: 'ok' });
    setTimeout(() => setMessage(null), 2500);
  };

  if (!available.length) return <p className="rounded-lg border border-rose-300 bg-rose-50 p-4 text-sm font-medium">This piece is sold out right now. Check back soon or browse similar pieces in the shop.</p>;

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest">Select size</p>
        {product.sizeSet !== 'free' && <Link href={`/size-guide#${product.department === 'kids' ? 'kids' : product.sizeSet === 'footwear' ? 'footwear' : product.department === 'men' ? 'men' : 'women'}`} target="_blank" className="text-xs underline underline-offset-4">Indian size guide</Link>}
      </div>
      <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Size">
        {product.variants.map((v) => (
          <button key={v.id} type="button" role="radio" aria-checked={size === v.size} disabled={v.stock <= 0} onClick={() => { setSize(v.size); setMessage(null); }}
            className={`min-w-14 rounded-sm border px-4 py-2 text-sm transition ${v.stock <= 0 ? 'cursor-not-allowed border-rose-100 text-maroon/30 line-through' : size === v.size ? 'border-maroon bg-maroon text-cream' : 'border-rose-300/60 hover:border-maroon'}`}>
            {v.size}
          </button>
        ))}
      </div>
      {selected && selected.stock <= selected.lowStockThreshold && <p className="mt-2 text-xs font-medium text-amber-700">Hurry – only {selected.stock} left in {selected.size}</p>}
      <button type="button" onClick={add} className="mt-5 w-full rounded-sm bg-maroon px-6 py-3 text-sm font-semibold uppercase tracking-widest text-cream transition hover:opacity-90">Add to bag</button>
      <p role="status" className={`mt-2 min-h-5 text-sm ${message?.tone === 'bad' ? 'text-red-700' : 'text-emerald-800'}`}>{message?.text} {message?.tone === 'ok' && <Link href="/cart" className="underline">View bag</Link>}</p>
    </div>
  );
}
