/** Loads Razorpay's checkout.js on demand (browser only) and returns the global constructor. */
export interface RazorpaySuccess { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }
export interface RazorpayOptions {
  key: string; amount: number; currency: string; name: string; description: string; order_id: string;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
  handler: (response: RazorpaySuccess) => void;
  modal?: { ondismiss?: () => void };
}
export interface RazorpayInstance { open(): void; on(event: 'payment.failed', cb: (r: { error: { description?: string } }) => void): void }
type RazorpayCtor = new (options: RazorpayOptions) => RazorpayInstance;

let loading: Promise<RazorpayCtor> | undefined;

export function loadRazorpay(): Promise<RazorpayCtor> {
  const existing = (window as unknown as { Razorpay?: RazorpayCtor }).Razorpay;
  if (existing) return Promise.resolve(existing);
  loading ??= new Promise<RazorpayCtor>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => {
      const ctor = (window as unknown as { Razorpay?: RazorpayCtor }).Razorpay;
      if (ctor) resolve(ctor);
      else reject(new Error('Razorpay failed to initialise'));
    };
    s.onerror = () => { loading = undefined; reject(new Error('Could not load the payment window. Check your internet connection or ad-blocker.')); };
    document.head.appendChild(s);
  });
  return loading;
}
