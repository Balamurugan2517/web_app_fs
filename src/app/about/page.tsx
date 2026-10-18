import type { Metadata } from 'next';
import Link from 'next/link';
import { siteConfig } from '@/lib/site-config';

export const metadata: Metadata = { title: 'About us' };

export default function About() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <h1 className="font-serif text-4xl font-light">About {siteConfig.name}</h1>
      <div className="mt-6 space-y-4 leading-relaxed text-maroon/85">
        <p>{siteConfig.name} brings the weaving traditions of Tamil Nadu and Kerala – Kanchipuram silk, Kasavu cotton – into modern, wearable silhouettes for women, men and children.</p>
        <p>Every piece is made in small batches with artisan partners, finished by hand and checked before it is packed. We ship across India, free of charge, and every order can be tracked from your order page.</p>
        <p>[Replace this page with your own story: who you are, where you work, what makes your pieces special. Razorpay and customers both look for this page.]</p>
      </div>
      <div className="mt-8 flex gap-3"><Link href="/shop" className="rounded-md bg-maroon px-6 py-3 text-sm uppercase tracking-wide text-cream">Shop now</Link><Link href="/contact" className="rounded-md border border-maroon px-6 py-3 text-sm uppercase tracking-wide">Contact us</Link></div>
    </article>
  );
}
