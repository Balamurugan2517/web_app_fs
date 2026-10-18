import type { Metadata } from 'next';
import { Suspense } from 'react';
import CheckoutForm from '@/components/CheckoutForm';

export const metadata: Metadata = { title: 'Checkout', robots: { index: false } };

export default function CheckoutPage() {
  return <Suspense fallback={<p className="py-20 text-center text-sm">Loading checkout…</p>}><CheckoutForm /></Suspense>;
}
