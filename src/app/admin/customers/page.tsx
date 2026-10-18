/* eslint-disable @next/next/no-html-link-for-pages -- these links download CSV files (route handlers), they are not pages */
import { Suspense } from 'react';
import { Badge, btn2Cls, btnCls, Field, Flash, inputCls, Panel, Table } from '@/components/admin/ui';
import { requireAdmin } from '@/lib/admin-auth';
import { formatINR } from '@/lib/money';
import { listCampaigns, listCustomers } from '@/lib/repos/admin';
import { sendCampaignAction } from '../actions';

export const instant = false;
type SP = Promise<{ q?: string; ok?: string; err?: string }>;

export default function Customers({ searchParams }: { searchParams: SP }) {
  return <Suspense fallback={<p>Loading…</p>}><Body searchParams={searchParams} /></Suspense>;
}

async function Body({ searchParams }: { searchParams: SP }) {
  await requireAdmin('owner');
  const sp = await searchParams;
  const [customers, campaigns, e, s, w] = await Promise.all([listCustomers({ q: sp.q, limit: 200 }), listCampaigns(), listCustomers({ optIn: 'email', limit: 5000 }), listCustomers({ optIn: 'sms', limit: 5000 }), listCustomers({ optIn: 'whatsapp', limit: 5000 })]);
  return (
    <div className="space-y-6">
      <Flash ok={sp.ok} err={sp.err} />
      <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="font-serif text-3xl">Customers</h1><a href="/admin/download/customers-csv" className={btn2Cls}>Download customer list (CSV)</a></div>
      <Panel title="Send offers / new-arrival news">
        <p className="mb-3 text-sm">Only customers who <b>ticked the box</b> at checkout receive these (e-mail: {e.length} · SMS: {s.length} · WhatsApp: {w.length}). Every message has an unsubscribe link. In India, SMS needs a DLT-registered template and WhatsApp needs an approved template – see the Notifications guide.</p>
        <form action={sendCampaignAction} className="grid gap-3 md:grid-cols-4">
          <Field label="Campaign name"><input name="name" required className={inputCls} placeholder="Diwali new arrivals" /></Field>
          <Field label="Channel"><select name="channel" className={inputCls}><option value="email">E-mail</option><option value="sms">SMS</option><option value="whatsapp">WhatsApp</option></select></Field>
          <div className="md:col-span-2"><Field label="E-mail subject"><input name="subject" className={inputCls} /></Field></div>
          <div className="md:col-span-4"><Field label="Message" hint="Plain text. “Hi <first name>,” is added automatically."><textarea name="body" required minLength={10} rows={4} className={inputCls} placeholder="Our festive silks have arrived! Use code DIWALI15 for 15% off until Sunday: https://your-shop.in/shop?new=1" /></Field></div>
          <button className={btnCls}>Queue campaign</button>
        </form>
        {campaigns.length > 0 && <p className="mt-4 text-xs text-maroon/60">Recent: {campaigns.slice(0, 5).map((c) => `${c.name} (${c.channel}, ${c.recipients})`).join(' · ')}</p>}
      </Panel>
      <form className="flex gap-2" action="/admin/customers"><input name="q" defaultValue={sp.q} placeholder="Search name, e-mail, phone" className={`${inputCls} max-w-sm`} /><button className={btn2Cls}>Search</button></form>
      <Table head={['Name', 'E-mail', 'Phone', 'Orders', 'Spent', 'Offers OK for']} empty={customers.length ? undefined : 'No customers yet.'}>
        {customers.map((c) => <tr key={c.id}><td>{c.name}</td><td>{c.email}</td><td>{c.phone ?? '—'}</td><td>{c.ordersCount}</td><td>{formatINR(c.totalSpent)}</td><td className="space-x-1">{c.emailOptIn && <Badge tone="good">e-mail</Badge>}{c.smsOptIn && <Badge tone="good">SMS</Badge>}{c.whatsappOptIn && <Badge tone="good">WhatsApp</Badge>}{!c.emailOptIn && !c.smsOptIn && !c.whatsappOptIn && <Badge>none</Badge>}</td></tr>)}
      </Table>
    </div>
  );
}
