'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/** Customer's cancel / return panel. The server decides what is allowed; this only shows the right wording. */
export default function OrderActions({ orderId, token, mode, message }: { orderId: string; token: string; mode: 'instant' | 'refund' | 'cancel-shipment' | 'return' | 'none'; message: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (mode === 'none') return <p className="rounded-lg border border-rose-200 bg-white/60 p-4 text-sm text-maroon/80">{message}</p>;
  const isReturn = mode === 'return';

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const res = await fetch('/api/orders/cancel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId, token, reason }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.details?.reason ?? data?.error?.message ?? 'Something went wrong.');
      router.refresh(); setOpen(false);
    } catch (err) { setError(err instanceof Error ? err.message : 'Something went wrong.'); }
    finally { setBusy(false); }
  }

  return (
    <div className="rounded-lg border border-rose-200 bg-white/70 p-4 text-sm">
      <p>{message}</p>
      {!open ? <button onClick={() => setOpen(true)} className="mt-3 rounded-md border border-maroon px-4 py-2 text-xs font-semibold uppercase tracking-wider hover:bg-maroon hover:text-cream">{isReturn ? 'Request a return' : 'Cancel this order'}</button> : (
        <form onSubmit={submit} className="mt-3 space-y-3">
          <label className="block">Reason<textarea required minLength={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1 w-full rounded-md border border-rose-200 p-2" rows={3} placeholder={isReturn ? 'e.g. size did not fit' : 'e.g. ordered by mistake'} /></label>
          {error && <p role="alert" className="text-red-700">{error}</p>}
          <div className="flex gap-2">
            <button disabled={busy} className="rounded-md bg-maroon px-4 py-2 text-xs font-semibold uppercase tracking-wider text-cream disabled:opacity-60">{busy ? 'Please wait…' : isReturn ? 'Send return request' : 'Confirm cancellation'}</button>
            <button type="button" onClick={() => setOpen(false)} className="px-3 text-xs underline">Keep my order</button>
          </div>
        </form>
      )}
    </div>
  );
}
