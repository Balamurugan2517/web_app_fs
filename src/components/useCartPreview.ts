'use client';

import { useEffect, useRef, useState } from 'react';
import type { CartPreview } from '@/lib/cart-preview';
import type { CartItem } from '@/types/cart';

/** Asks the server for fresh prices/stock/coupon whenever the bag or coupon changes (debounced). */
export function useCartPreview(cart: CartItem[], couponCode: string, enabled: boolean) {
  const [preview, setPreview] = useState<CartPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const seq = useRef(0);
  const key = JSON.stringify([cart.map((i) => [i.product.id, i.selectedSize, i.quantity]), couponCode]);

  useEffect(() => {
    if (!enabled || cart.length === 0) return;
    const mine = ++seq.current;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/cart/price', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: cart.map((i) => ({ productId: i.product.id, size: i.selectedSize, quantity: i.quantity })), couponCode }) });
        const data = await res.json();
        if (mine !== seq.current) return;
        if (!res.ok) throw new Error(data?.error?.message ?? 'Could not refresh prices.');
        setPreview(data as CartPreview); setError('');
      } catch (e) { if (mine === seq.current) setError(e instanceof Error ? e.message : 'Could not refresh prices.'); }
      finally { if (mine === seq.current) setLoading(false); }
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  return { preview, loading, error };
}
