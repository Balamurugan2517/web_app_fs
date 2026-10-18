import Link from 'next/link';

export default function NotFound() {
  return (
    <section className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-rose-800">404</p>
      <h1 className="mt-2 font-serif text-4xl font-light">We couldn&apos;t find that page</h1>
      <Link href="/shop" className="mt-8 inline-block rounded-md bg-rose-950 px-8 py-3 text-sm uppercase tracking-wide text-white">Back to the shop</Link>
    </section>
  );
}
