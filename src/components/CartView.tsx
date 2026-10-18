'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { useCart } from '@/context/CartContext';
import { MAX_QTY_PER_LINE } from '@/lib/constants';
import { formatINR } from '@/lib/money';
import { useCartPreview } from './useCartPreview';

export default function CartView() {
  const { cart, isCartLoaded, updateQuantity, removeFromCart } = useCart();
  const [coupon, setCoupon] = useState('');
  const [applied, setApplied] = useState('');
  const { preview, loading, error } = useCartPreview(cart, applied, isCartLoaded);

  if (!isCartLoaded) return <section className="mx-auto max-w-5xl px-4 py-20 text-center text-sm">Loading your bag…</section>;
  if (cart.length === 0) {
    return (
      <section className="mx-auto max-w-5xl px-4 py-24 text-center">
        <h1 className="font-serif text-4xl font-light">Your bag is empty</h1>
        <p className="mt-3 text-maroon/70">Discover pieces made to be worn.</p>
        <Link href="/shop" className="mt-8 inline-block rounded-md bg-rose-950 px-8 py-3 text-sm font-medium uppercase tracking-wide text-white hover:bg-rose-900">Continue shopping</Link>
      </section>
    );
  }
  const line = (id: string, size: string) => preview?.lines.find((l) => l.productId === id && l.size === size);
  const blocked = !preview || !preview.ok || loading;

  return (
    <section className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
      <div>
        <h1 className="font-serif text-4xl font-light">Shopping bag</h1>
        {error && <p role="alert" className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        <ul className="mt-8 divide-y divide-rose-300/60 border-y border-rose-300/60">
          {cart.map(({ product, selectedSize, quantity }) => {
            const l = line(product.id, selectedSize);
            const unit = l?.unitPrice ?? product.price; const mrp = l?.mrp ?? product.mrp;
            return (
              <li key={`${product.id}-${selectedSize}`} className="flex gap-4 py-6">
                <Link href={`/products/${l?.slug || product.slug}`} className="relative h-28 w-20 shrink-0 overflow-hidden rounded-md border border-rose-200">
                  <Image src={product.image} alt={product.name} fill unoptimized={product.image.startsWith('/media/')} sizes="80px" className="object-cover" />
                </Link>
                <div className="flex-1">
                  <Link href={`/products/${l?.slug || product.slug}`} className="font-serif text-lg">{product.name}</Link>
                  <p className="text-sm text-maroon/70">Size {selectedSize}{mrp > unit && <> · <s>{formatINR(mrp)}</s> <b className="text-rose-700">{formatINR(unit)}</b></>}</p>
                  {l?.problem && <p role="alert" className="mt-1 text-sm font-medium text-red-700">{l.problem} – please change or remove this item.</p>}
                  <div className="mt-3 flex items-center gap-3 text-sm">
                    <button type="button" aria-label="Decrease quantity" onClick={() => updateQuantity(product.id, selectedSize, quantity - 1)} className="h-8 w-8 rounded-full border border-rose-300/70 hover:bg-rose-100">−</button>
                    <span aria-live="polite" className="w-6 text-center">{quantity}</span>
                    <button type="button" aria-label="Increase quantity" disabled={quantity >= Math.min(MAX_QTY_PER_LINE, l?.stock ?? MAX_QTY_PER_LINE)} onClick={() => updateQuantity(product.id, selectedSize, quantity + 1)} className="h-8 w-8 rounded-full border border-rose-300/70 hover:bg-rose-100 disabled:opacity-40">+</button>
                    <button type="button" onClick={() => removeFromCart(product.id, selectedSize)} className="ml-4 text-xs uppercase tracking-wider underline underline-offset-4">Remove</button>
                  </div>
                </div>
                <p className="font-medium">{formatINR(unit * quantity)}</p>
              </li>
            );
          })}
        </ul>
      </div>

      <aside className="h-fit rounded-2xl border border-rose-200 bg-white/80 p-6 shadow-xs">
        <h2 className="font-serif text-2xl">Order summary</h2>
        <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); setApplied(coupon.trim()); }}>
          <label htmlFor="coupon" className="sr-only">Coupon code</label>
          <input id="coupon" value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder="Coupon code" className="min-w-0 flex-1 rounded-lg border border-rose-200 px-3 py-2 text-sm uppercase" />
          <button className="rounded-lg border border-maroon px-4 text-xs font-semibold uppercase tracking-wider hover:bg-maroon hover:text-cream">Apply</button>
        </form>
        {preview?.couponError && <p className="mt-1 text-xs text-red-700">{preview.couponError}</p>}
        {preview?.coupon && <p className="mt-1 text-xs text-emerald-800">Coupon {preview.coupon.code} applied ✓ <button className="underline" onClick={() => { setApplied(''); setCoupon(''); }}>remove</button></p>}
        <dl className="mt-5 space-y-3 text-sm">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{preview ? formatINR(preview.totals.subtotal) : '…'}</dd></div>
          {preview && preview.totals.discount > 0 && <div className="flex justify-between text-emerald-800"><dt>Coupon discount</dt><dd>− {formatINR(preview.totals.discount)}</dd></div>}
          <div className="flex justify-between"><dt>Shipping</dt><dd>Free</dd></div>
          <div className="flex justify-between border-t border-rose-200 pt-3 text-base font-semibold"><dt>Total (incl. GST)</dt><dd>{preview ? formatINR(preview.totals.total) : '…'}</dd></div>
        </dl>
        {blocked ? <span aria-disabled className="mt-6 block rounded-xl bg-maroon/40 py-4 text-center text-sm font-medium uppercase tracking-wide text-white">{loading ? 'Updating prices…' : 'Fix items to continue'}</span>
          : <Link href={applied ? `/checkout?coupon=${encodeURIComponent(applied)}` : '/checkout'} className="mt-6 block rounded-xl bg-rose-950 py-4 text-center text-sm font-medium uppercase tracking-wide text-white hover:bg-rose-900">Proceed to checkout</Link>}
        <p className="mt-3 text-center text-xs text-maroon/60">Secure payment by Razorpay · Free shipping across India</p>
      </aside>
    </section>
  );
}
