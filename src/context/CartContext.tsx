'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { MAX_QTY_PER_LINE } from '@/lib/constants';
import { CartContextType, CartItem, CartProductSnapshot } from '@/types/cart';

const CartContext = createContext<CartContextType | undefined>(undefined);
const CART_STORAGE_KEY = 'luxe_thread_cart_v2';

/** The saved cart is untrusted (older version, edited by hand). Keep only well-formed lines. The SERVER decides prices and stock anyway. */
function sanitize(saved: unknown): CartItem[] {
  if (!Array.isArray(saved)) return [];
  const out: CartItem[] = [];
  for (const raw of saved) {
    const r = raw as { product?: Partial<CartProductSnapshot>; selectedSize?: unknown; quantity?: unknown };
    const p = r?.product;
    const qty = Number(r?.quantity);
    if (!p || typeof p.id !== 'string' || typeof p.name !== 'string' || typeof r.selectedSize !== 'string' || !Number.isInteger(qty) || qty < 1) continue;
    out.push({ product: { id: p.id, slug: String(p.slug ?? ''), name: p.name, image: String(p.image ?? '/images/hero.jpg'), price: Number(p.price) || 0, mrp: Number(p.mrp) || 0 }, selectedSize: r.selectedSize, quantity: Math.min(qty, MAX_QTY_PER_LINE) });
  }
  return out;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartLoaded, setIsCartLoaded] = useState(false);

  // Load after mount: server HTML and the first browser render both start empty, so hydration always matches.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        await Promise.resolve();
        const saved = window.localStorage.getItem(CART_STORAGE_KEY);
        if (saved && !cancelled) setCart(sanitize(JSON.parse(saved)));
      } catch (error) { console.error('Failed to load cart', error); }
      finally { if (!cancelled) setIsCartLoaded(true); }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!isCartLoaded) return;
    try { window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart)); } catch (error) { console.error('Failed to save cart', error); }
  }, [cart, isCartLoaded]);

  const addToCart = (product: CartProductSnapshot, size: string) => {
    setCart((prev) => {
      const i = prev.findIndex((it) => it.product.id === product.id && it.selectedSize === size);
      if (i === -1) return [...prev, { product, quantity: 1, selectedSize: size }];
      return prev.map((it, idx) => (idx === i ? { ...it, quantity: Math.min(it.quantity + 1, MAX_QTY_PER_LINE) } : it));
    });
  };
  const removeFromCart = (productId: string, size: string) => setCart((prev) => prev.filter((it) => !(it.product.id === productId && it.selectedSize === size)));
  const updateQuantity = (productId: string, size: string, quantity: number) => {
    if (quantity < 1) return removeFromCart(productId, size);
    setCart((prev) => prev.map((it) => (it.product.id === productId && it.selectedSize === size ? { ...it, quantity: Math.min(quantity, MAX_QTY_PER_LINE) } : it)));
  };
  const clearCart = () => setCart([]);
  const totalItems = cart.reduce((sum, it) => sum + it.quantity, 0);

  return <CartContext.Provider value={{ cart, isCartLoaded, addToCart, removeFromCart, updateQuantity, clearCart, totalItems }}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
}
