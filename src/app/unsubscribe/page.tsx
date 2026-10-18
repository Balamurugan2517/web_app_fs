import type { Metadata } from 'next';
import { Suspense } from 'react';
import { unsubscribeByToken } from '@/lib/repos/admin';

export const metadata: Metadata = { title: 'Unsubscribe', robots: { index: false } };
export const instant = false;

async function unsubscribe(formData: FormData) {
  'use server';
  const token = String(formData.get('t') ?? '');
  const ok = token.length >= 16 && (await unsubscribeByToken(token));
  const { redirect } = await import('next/navigation');
  redirect(`/unsubscribe?done=${ok ? 1 : 0}`);
}

export default function UnsubscribePage({ searchParams }: { searchParams: Promise<{ t?: string; done?: string }> }) {
  return <section className="mx-auto max-w-lg px-4 py-20 text-center"><Suspense fallback={null}><Body searchParams={searchParams} /></Suspense></section>;
}

async function Body({ searchParams }: { searchParams: Promise<{ t?: string; done?: string }> }) {
  const { t, done } = await searchParams;
  if (done === '1') return <><h1 className="font-serif text-3xl">You are unsubscribed</h1><p className="mt-3 text-maroon/80">You will no longer receive offers from us. You will still get messages about your orders.</p></>;
  if (done === '0') return <><h1 className="font-serif text-3xl">Link not valid</h1><p className="mt-3">Please write to us and we will remove you manually.</p></>;
  return (
    <form action={unsubscribe}>
      <h1 className="font-serif text-3xl">Stop offers and news?</h1>
      <p className="mt-3 text-maroon/80">You will keep receiving order updates.</p>
      <input type="hidden" name="t" value={t ?? ''} />
      <button className="mt-6 rounded-md bg-maroon px-6 py-3 text-sm uppercase tracking-wide text-cream">Unsubscribe me</button>
    </form>
  );
}
