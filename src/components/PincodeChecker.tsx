'use client';

import { useState } from 'react';
import { pincodeSchema } from '@/lib/validation';

type Result = { tone: 'ok' | 'bad' | 'info'; text: string };

/** "Can you deliver to me?" – used on the product page. Talks to /api/shipping/serviceability. */
export default function PincodeChecker({ weightKg }: { weightKg: number }) {
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function check() {
    const parsed = pincodeSchema.safeParse(pin);
    if (!parsed.success) return setResult({ tone: 'bad', text: parsed.error.issues[0].message });
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch('/api/shipping/serviceability', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pincode: parsed.data, weightKg }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? 'Could not check this PIN code.');
      if (!data.serviceable) setResult({ tone: 'bad', text: 'Sorry, we cannot deliver to this PIN code yet.' });
      else if (!data.verified) setResult({ tone: 'info', text: 'Free delivery across India. Exact delivery time is confirmed at checkout.' });
      else setResult({ tone: 'ok', text: `Delivery available${data.etaDays ? ` in about ${data.etaDays} days` : ''}${data.codAvailable ? ' · Cash on Delivery available' : ''}.` });
    } catch (e) {
      setResult({ tone: 'bad', text: e instanceof Error ? e.message : 'Could not check this PIN code.' });
    } finally {
      setBusy(false);
    }
  }

  const tone = result?.tone === 'ok' ? 'text-emerald-800' : result?.tone === 'bad' ? 'text-red-700' : 'text-maroon/80';
  return (
    <div>
      <label htmlFor="pincode" className="text-xs font-medium uppercase tracking-widest text-rose-800">Check delivery</label>
      <div className="mt-2 flex gap-2">
        <input
          id="pincode" inputMode="numeric" maxLength={6} value={pin} placeholder="Enter PIN code"
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          onKeyDown={(e) => { if (e.key === 'Enter') void check(); }}
          className="w-44 rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm"
        />
        <button type="button" onClick={() => void check()} disabled={busy} className="rounded-lg border border-maroon px-4 py-2 text-xs font-semibold uppercase tracking-wider hover:bg-maroon hover:text-cream disabled:opacity-50">
          {busy ? 'Checking…' : 'Check'}
        </button>
      </div>
      <p role="status" className={`mt-2 min-h-5 text-xs ${tone}`}>{result?.text}</p>
    </div>
  );
}
