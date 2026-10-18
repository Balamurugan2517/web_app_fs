'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useCart } from '@/context/CartContext';
import { formatINR } from '@/lib/money';
import { loadRazorpay, RazorpaySuccess } from '@/lib/razorpay-client';
import { useCartPreview } from './useCartPreview';
import { checkoutDetailsSchema, fieldErrors, INDIAN_STATES, pincodeSchema } from '@/lib/validation';

type Form = { optInEmail: boolean; optInSms: boolean; optInWhatsapp: boolean; couponCode: string; name: string; email: string; phone: string; line1: string; line2: string; city: string; state: string; pincode: string; paymentMethod: 'PREPAID' | 'COD' };
type Phase = 'idle' | 'creating' | 'paying' | 'verifying';

const empty: Form = { optInEmail: false, optInSms: false, optInWhatsapp: false, couponCode: '', name: '', email: '', phone: '', line1: '', line2: '', city: '', state: '', pincode: '', paymentMethod: 'PREPAID' };

const field = 'mt-1 w-full rounded-lg border bg-white px-3 py-2.5 text-sm focus:border-maroon focus:outline-none';

export default function CheckoutForm() {
  const router = useRouter();
  const { cart, isCartLoaded, clearCart } = useCart();
  const params = useSearchParams();
  const [form, setForm] = useState<Form>({ ...empty, couponCode: params.get('coupon') ?? '' });
  const { preview, loading } = useCartPreview(cart, form.couponCode, isCartLoaded);
  const subtotal = preview?.totals.total ?? 0;
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [pinNote, setPinNote] = useState('');
  const [codOk, setCodOk] = useState(false);

  const busy = phase !== 'idle';
  const set = (k: Exclude<keyof Form, 'optInEmail' | 'optInSms' | 'optInWhatsapp'>) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (errors[k]) setErrors((prev) => { const next = { ...prev }; delete next[k]; return next; });
  };

  // When the customer leaves the PIN field: confirm we deliver there and whether Cash on Delivery works.
  async function checkPin() {
    const parsed = pincodeSchema.safeParse(form.pincode);
    setPinNote('');
    setCodOk(false);
    if (!parsed.success) return;
    try {
      const weightKg = Math.max(0.5, cart.reduce((s, i) => s + i.quantity, 0) * 0.8); // rough estimate; the server uses real weights at order time
      const res = await fetch('/api/shipping/serviceability', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pincode: parsed.data, cod: true, weightKg }) });
      const data = await res.json();
      if (!res.ok) return;
      if (!data.serviceable) { setErrors((e) => ({ ...e, pincode: 'We cannot deliver to this PIN code yet' })); return; }
      setCodOk(Boolean(data.codAvailable));
      setPinNote(data.verified && data.etaDays ? `Delivery in about ${data.etaDays} days` : 'Free delivery across India');
    } catch { /* the PIN note is a convenience; the server re-checks at order time */ }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setServerError('');
    if (!preview?.ok) { setServerError('Some items in your bag are unavailable. Please review your bag.'); return; }
    const parsed = checkoutDetailsSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      document.getElementById('checkout-form')?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      return;
    }
    setErrors({});
    setPhase('creating');
    try {
      const res = await fetch('/api/checkout/create', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...parsed.data, items: cart.map((i) => ({ productId: i.product.id, size: i.selectedSize, quantity: i.quantity })) }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data?.error?.details && typeof data.error.details === 'object') setErrors(data.error.details as Record<string, string>);
        throw new Error(data?.error?.message ?? 'Could not place your order.');
      }

      if (!data.payment) { // Cash on Delivery: nothing to pay now
        clearCart();
        router.push(data.redirectUrl);
        return;
      }

      const Razorpay = await loadRazorpay();
      setPhase('paying');
      const rzp = new Razorpay({
        key: data.payment.keyId, amount: data.payment.amountPaise, currency: 'INR', name: 'Luxe & Thread',
        description: `Order ${data.orderId}`, order_id: data.payment.razorpayOrderId, prefill: data.prefill, theme: { color: '#4A151B' },
        handler: (r: RazorpaySuccess) => void verify(r, data.orderId, data.token, data.redirectUrl),
        modal: { ondismiss: () => { setPhase('idle'); setServerError('Payment was cancelled. Your bag is still saved – you can try again.'); } },
      });
      rzp.on('payment.failed', (r) => { setPhase('idle'); setServerError(r.error.description ?? 'Payment failed. Please try another method.'); });
      rzp.open();
    } catch (err) {
      setPhase('idle');
      setServerError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
  }

  async function verify(r: RazorpaySuccess, orderId: string, token: string, redirectUrl: string) {
    setPhase('verifying');
    try {
      const res = await fetch('/api/checkout/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId, token, ...r }) });
      if (!res.ok) throw new Error('verify failed');
    } catch {
      // The money has moved. Do NOT show an error: the Razorpay webhook will confirm the order shortly,
      // and the order page refreshes itself until it does.
    }
    clearCart();
    router.push(redirectUrl);
  }

  if (!isCartLoaded) return <section className="mx-auto max-w-5xl px-4 py-20 text-center text-sm">Loading…</section>;
  if (cart.length === 0 && phase === 'idle') {
    return (
      <section className="mx-auto max-w-5xl px-4 py-24 text-center">
        <h1 className="font-serif text-4xl font-light">Your bag is empty</h1>
        <Link href="/shop" className="mt-8 inline-block rounded-md bg-rose-950 px-8 py-3 text-sm font-medium uppercase tracking-wide text-white">Continue shopping</Link>
      </section>
    );
  }

  const err = (k: string) => (errors[k] ? <p id={`${k}-err`} className="mt-1 text-xs text-red-700">{errors[k]}</p> : null);
  const props = (k: Exclude<keyof Form, 'optInEmail' | 'optInSms' | 'optInWhatsapp'>) => ({ id: k, name: k, value: form[k], onChange: set(k), disabled: busy, 'aria-invalid': errors[k] ? true : undefined, 'aria-describedby': errors[k] ? `${k}-err` : undefined, className: `${field} ${errors[k] ? 'border-red-500' : 'border-rose-200'}` });

  return (
    <section className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_380px] lg:px-8">
      <form id="checkout-form" onSubmit={submit} noValidate className="space-y-8">
        <h1 className="font-serif text-4xl font-light">Checkout</h1>
        {form.couponCode && <p className="text-sm text-emerald-800">Coupon <b>{form.couponCode.toUpperCase()}</b> {preview?.coupon ? 'applied ✓' : 'will be checked'}</p>}

        {serverError && <div role="alert" className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">{serverError}</div>}

        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-2 text-xs font-semibold uppercase tracking-widest">Contact</legend>
          <div className="sm:col-span-2"><label htmlFor="name" className="text-sm">Full name</label><input {...props('name')} autoComplete="name" />{err('name')}</div>
          <div><label htmlFor="email" className="text-sm">Email</label><input {...props('email')} type="email" autoComplete="email" />{err('email')}</div>
          <div><label htmlFor="phone" className="text-sm">Mobile number</label><input {...props('phone')} inputMode="numeric" maxLength={10} autoComplete="tel-national" />{err('phone')}</div>
        </fieldset>

        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-2 text-xs font-semibold uppercase tracking-widest">Delivery address</legend>
          <div className="sm:col-span-2"><label htmlFor="line1" className="text-sm">Address</label><input {...props('line1')} autoComplete="address-line1" />{err('line1')}</div>
          <div className="sm:col-span-2"><label htmlFor="line2" className="text-sm">Apartment, landmark (optional)</label><input {...props('line2')} autoComplete="address-line2" /></div>
          <div><label htmlFor="city" className="text-sm">City</label><input {...props('city')} autoComplete="address-level2" />{err('city')}</div>
          <div>
            <label htmlFor="state" className="text-sm">State</label>
            <select {...props('state')} autoComplete="address-level1"><option value="">Select state</option>{INDIAN_STATES.map((s) => <option key={s}>{s}</option>)}</select>
            {err('state')}
          </div>
          <div>
            <label htmlFor="pincode" className="text-sm">PIN code</label>
            <input {...props('pincode')} inputMode="numeric" maxLength={6} autoComplete="postal-code" onBlur={() => void checkPin()} />
            {err('pincode')}
            {pinNote && !errors.pincode && <p className="mt-1 text-xs text-emerald-800">{pinNote}</p>}
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="mb-2 text-xs font-semibold uppercase tracking-widest">Payment</legend>
          <label className="flex items-start gap-3 rounded-lg border border-rose-200 bg-white p-4 text-sm">
            <input type="radio" name="paymentMethod" checked={form.paymentMethod === 'PREPAID'} onChange={() => setForm((f) => ({ ...f, paymentMethod: 'PREPAID' }))} disabled={busy} />
            <span><b>Pay online</b><br /><span className="text-maroon/70">UPI, cards, net banking &amp; wallets via Razorpay</span></span>
          </label>
          <label className={`flex items-start gap-3 rounded-lg border border-rose-200 bg-white p-4 text-sm ${codOk ? '' : 'opacity-60'}`}>
            <input type="radio" name="paymentMethod" checked={form.paymentMethod === 'COD'} onChange={() => setForm((f) => ({ ...f, paymentMethod: 'COD' }))} disabled={busy || !codOk} />
            <span><b>Cash on Delivery</b><br /><span className="text-maroon/70">{codOk ? 'Pay when your order arrives' : 'Enter a valid PIN code to see if this is available for you'}</span></span>
          </label>
        </fieldset>

        <fieldset className="space-y-2 rounded-lg border border-rose-200 bg-white/70 p-4 text-sm">
          <legend className="px-1 text-xs font-semibold uppercase tracking-widest">Offers &amp; updates (optional)</legend>
          <p className="text-xs text-maroon/70">We always send order updates. Tick below only if you also want news about new arrivals and offers. You can stop any time.</p>
          <label className="flex gap-2"><input type="checkbox" checked={form.optInEmail} onChange={(e) => setForm((f) => ({ ...f, optInEmail: e.target.checked }))} />Email me new arrivals &amp; offers</label>
          <label className="flex gap-2"><input type="checkbox" checked={form.optInSms} onChange={(e) => setForm((f) => ({ ...f, optInSms: e.target.checked }))} />SMS me offers</label>
          <label className="flex gap-2"><input type="checkbox" checked={form.optInWhatsapp} onChange={(e) => setForm((f) => ({ ...f, optInWhatsapp: e.target.checked }))} />WhatsApp me order updates &amp; offers</label>
        </fieldset>
        {preview?.couponError && <p className="text-sm text-red-700">{preview.couponError}</p>}

        <button type="submit" disabled={busy || loading} className="w-full rounded-xl bg-rose-950 py-4 text-sm font-medium uppercase tracking-wide text-white hover:bg-rose-900 disabled:opacity-60">
          {phase === 'creating' ? 'Preparing your order…' : phase === 'paying' ? 'Complete payment in the Razorpay window…' : phase === 'verifying' ? 'Confirming payment…' : form.paymentMethod === 'COD' ? `Place order · ${formatINR(subtotal)}` : `Pay ${formatINR(subtotal)}`}
        </button>
        <p className="text-center text-xs text-maroon/60">By placing your order you agree to our <Link href="/policies/terms-and-conditions" className="underline">Terms</Link> and <Link href="/policies/refund-and-cancellation-policy" className="underline">Refund Policy</Link>.</p>
      </form>

      <aside className="h-fit rounded-2xl border border-rose-200 bg-white/80 p-6">
        <h2 className="font-serif text-2xl">Your order</h2>
        <ul className="mt-4 divide-y divide-rose-100">
          {cart.map(({ product, selectedSize, quantity }) => {
            const l = preview?.lines.find((x) => x.productId === product.id && x.size === selectedSize);
            return (
              <li key={`${product.id}-${selectedSize}`} className="flex gap-3 py-3 text-sm">
                <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded"><Image src={product.image} alt="" fill unoptimized={product.image.startsWith('/media/')} sizes="48px" className="object-cover" /></div>
                <div className="flex-1"><p className="font-medium">{product.name}</p><p className="text-xs text-maroon/70">Size {selectedSize} · Qty {quantity}</p>{l?.problem && <p className="text-xs font-medium text-red-700">{l.problem}</p>}</div>
                <p>{formatINR((l?.unitPrice ?? product.price) * quantity)}</p>
              </li>
            );
          })}
        </ul>
        <dl className="mt-4 space-y-2 border-t border-rose-200 pt-4 text-sm">
          {preview && preview.totals.discount > 0 && <div className="flex justify-between text-emerald-800"><dt>Coupon {preview.coupon?.code}</dt><dd>− {formatINR(preview.totals.discount)}</dd></div>}
          <div className="flex justify-between"><dt>Shipping</dt><dd>Free</dd></div>
          <div className="flex justify-between text-base font-semibold"><dt>Total (incl. GST)</dt><dd>{loading || !preview ? '…' : formatINR(subtotal)}</dd></div>
        </dl>
      </aside>
    </section>
  );
}
