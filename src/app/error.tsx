'use client';

import { useEffect } from 'react';

/** Shown when a page crashes. The visitor sees a calm message; the details go to the browser console / server logs. */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <section className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="font-serif text-4xl font-light">Something went wrong</h1>
      <p className="mt-3 text-maroon/70">Please try again. If it keeps happening, contact us{error.digest ? ` and quote code ${error.digest}` : ''}.</p>
      <button onClick={reset} className="mt-8 rounded-md bg-rose-950 px-8 py-3 text-sm uppercase tracking-wide text-white">Try again</button>
    </section>
  );
}
