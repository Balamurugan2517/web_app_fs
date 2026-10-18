import Link from 'next/link';
import type { ReactNode } from 'react';

export const inputCls = 'w-full rounded-md border border-rose-200 bg-white px-3 py-2 text-sm focus:border-maroon focus:outline-none';
export const btnCls = 'rounded-md bg-rose-950 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white hover:bg-rose-900 disabled:opacity-60';
export const btn2Cls = 'rounded-md border border-maroon px-4 py-2 text-xs font-semibold uppercase tracking-wider hover:bg-maroon hover:text-cream';
export const dangerCls = 'rounded-md border border-red-700 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-red-700 hover:bg-red-700 hover:text-white';

export function Panel({ title, children, actions, id }: { title?: string; children: ReactNode; actions?: ReactNode; id?: string }) {
  return (
    <section id={id} className="rounded-xl border border-rose-200 bg-white/80 p-5">
      {(title || actions) && <div className="mb-3 flex flex-wrap items-center justify-between gap-2">{title && <h2 className="text-sm font-semibold uppercase tracking-wider">{title}</h2>}{actions}</div>}
      {children}
    </section>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <label className="block text-sm"><span className="mb-1 block font-medium">{label}</span>{children}{hint && <span className="mt-1 block text-xs text-maroon/60">{hint}</span>}</label>;
}

export function Flash({ ok, err }: { ok?: string; err?: string }) {
  if (!ok && !err) return null;
  return <p role={err ? 'alert' : 'status'} className={`rounded-lg border p-3 text-sm ${err ? 'border-red-300 bg-red-50 text-red-800' : 'border-emerald-300 bg-emerald-50 text-emerald-900'}`}>{err ?? ok}</p>;
}

export function Table({ head, children, empty }: { head: string[]; children: ReactNode; empty?: string }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-rose-200 bg-white/80">
      <table className="w-full text-left text-sm"><thead className="bg-cream text-xs uppercase tracking-wider"><tr>{head.map((h) => <th key={h} className="whitespace-nowrap p-3">{h}</th>)}</tr></thead>
        <tbody className="[&>tr]:border-t [&>tr]:border-rose-100 [&_td]:p-3">{children}</tbody></table>
      {empty && <p className="p-6 text-center text-maroon/60">{empty}</p>}
    </div>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: string; tone?: 'good' | 'bad' | 'warn' }) {
  const c = tone === 'bad' ? 'text-red-700' : tone === 'good' ? 'text-emerald-800' : tone === 'warn' ? 'text-amber-700' : 'text-maroon';
  return <div className="rounded-xl border border-rose-200 bg-white/80 p-4"><p className="text-xs uppercase tracking-wider text-maroon/60">{label}</p><p className={`mt-1 font-serif text-2xl ${c}`}>{value}</p>{sub && <p className="text-xs text-maroon/60">{sub}</p>}</div>;
}

export const Badge = ({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'good' | 'bad' | 'warn' | 'neutral' }) => (
  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${tone === 'good' ? 'bg-emerald-100 text-emerald-900' : tone === 'bad' ? 'bg-red-100 text-red-800' : tone === 'warn' ? 'bg-amber-100 text-amber-900' : 'bg-rose-100 text-maroon'}`}>{children}</span>
);

export function AdminNav({ role }: { role: 'owner' | 'staff' | null }) {
  const items: [string, string, boolean][] = [['/admin', 'Dashboard', false], ['/admin/orders', 'Orders', false], ['/admin/returns', 'Returns', false], ['/admin/products', 'Products', false], ['/admin/inventory', 'Inventory', false],
    ['/admin/coupons', 'Coupons', true], ['/admin/customers', 'Customers', true], ['/admin/reports', 'Reports', true], ['/admin/expenses', 'Expenses', true], ['/admin/notifications', 'Messages', false], ['/admin/audit', 'Activity log', true]];
  return (
    <nav aria-label="Admin" className="mb-6 flex flex-wrap gap-1 rounded-xl border border-rose-200 bg-cream p-2 text-sm print:hidden">
      {items.filter(([, , owner]) => !owner || role === 'owner').map(([href, label]) => <Link key={href} href={href} className="rounded-md px-3 py-1.5 hover:bg-white">{label}</Link>)}
    </nav>
  );
}
