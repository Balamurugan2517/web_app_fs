'use client';

import Link from 'next/link';
import { useCart } from '@/context/CartContext';

const links = [
  { href: '/shop?department=women', label: 'Women' }, { href: '/shop?department=men', label: 'Men' }, { href: '/shop?department=kids', label: 'Kids' },
  { href: '/shop?new=1', label: 'New Arrivals' }, { href: '/shop?sale=1', label: 'Sale' }, { href: '/about', label: 'About' }, { href: '/contact', label: 'Contact' },
];

export default function Header() {
  const { totalItems } = useCart();
  return (
    <header className="sticky top-0 z-50 border-b border-rose-300/60 bg-cream/95 shadow-xs backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="shrink-0 font-serif text-2xl font-bold tracking-tight text-maroon">Luxe &amp; Thread<span className="text-rose-600">.</span></Link>
        <nav aria-label="Main" className="hidden items-center gap-6 text-sm font-medium uppercase tracking-wide text-maroon/80 lg:flex">
          {links.map((l) => <Link key={l.label} href={l.href} className={`transition-colors hover:text-rose-700 ${l.label === 'Sale' ? 'text-rose-700' : ''}`}>{l.label}</Link>)}
        </nav>
        <div className="flex items-center gap-3">
          <form action="/shop" role="search" className="hidden sm:block">
            <label htmlFor="site-search" className="sr-only">Search products</label>
            <input id="site-search" name="q" type="search" placeholder="Search sarees, kurtas…" className="w-44 rounded-full border border-rose-200 bg-white/80 px-4 py-1.5 text-sm placeholder:text-maroon/40 focus:w-64 focus:border-maroon focus:outline-none" />
          </form>
          <Link href="/cart" aria-label={`Shopping bag, ${totalItems} items`} className="relative flex items-center justify-center rounded-full border border-rose-300/70 bg-rose-200/50 p-2.5 text-maroon transition-colors hover:text-rose-700">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
            {totalItems > 0 && <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-900 text-[10px] font-bold text-white shadow-sm">{totalItems}</span>}
          </Link>
        </div>
      </div>
      <nav aria-label="Main (mobile)" className="flex gap-5 overflow-x-auto border-t border-rose-200/60 px-4 py-2 text-xs font-medium uppercase tracking-wide text-maroon/80 lg:hidden">
        {links.map((l) => <Link key={l.label} href={l.href} className={`whitespace-nowrap ${l.label === 'Sale' ? 'text-rose-700' : ''}`}>{l.label}</Link>)}
      </nav>
    </header>
  );
}
