import Link from 'next/link';
import { Suspense } from 'react';
import { Badge, btn2Cls, btnCls, dangerCls, Flash, inputCls, Panel } from '@/components/admin/ui';
import { requireAdmin } from '@/lib/admin-auth';
import { listReturns } from '@/lib/repos/admin';
import { returnDecisionAction } from '../actions';

export const instant = false;
type SP = Promise<{ ok?: string; err?: string }>;

export default function Returns({ searchParams }: { searchParams: SP }) {
  return <Suspense fallback={<p>Loading…</p>}><Body searchParams={searchParams} /></Suspense>;
}

async function Body({ searchParams }: { searchParams: SP }) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const rows = await listReturns();
  const tone = (s: string) => (s === 'requested' ? 'warn' : s === 'rejected' ? 'bad' : s === 'refunded' ? 'good' : 'neutral') as 'warn' | 'bad' | 'good' | 'neutral';
  return (
    <div className="space-y-5">
      <Flash ok={sp.ok} err={sp.err} />
      <h1 className="font-serif text-3xl">Return requests</h1>
      <p className="text-sm text-maroon/70">Customers can ask for a return within 7 days of delivery. <b>Approve</b> → arrange the reverse pickup in Shiprocket → when the parcel is back press <b>Goods received</b> (owner) to restock and refund.</p>
      {rows.length === 0 && <Panel><p className="text-sm text-maroon/60">No return requests yet.</p></Panel>}
      {rows.map((r) => (
        <Panel key={r.id}>
          <div className="flex flex-wrap items-center justify-between gap-2"><Link className="font-mono underline" href={`/admin/orders/${r.orderId}`}>{r.orderId}</Link><Badge tone={tone(r.status)}>{r.status}</Badge></div>
          <p className="mt-2 text-sm">“{r.reason}” <span className="text-xs text-maroon/60">· {new Date(r.createdAt).toLocaleDateString('en-IN')}</span></p>
          {r.adminNote && <p className="text-xs text-maroon/60">Note: {r.adminNote}</p>}
          {(r.status === 'requested' || r.status === 'approved') && (
            <form action={returnDecisionAction} className="mt-3 flex flex-wrap items-end gap-2"><input type="hidden" name="returnId" value={r.id} /><input name="note" placeholder="Note to customer (optional)" className={`${inputCls} max-w-xs`} />
              {r.status === 'requested' && <><button name="decision" value="approve" className={btnCls}>Approve</button><button name="decision" value="reject" className={dangerCls}>Reject</button></>}
              {r.status === 'approved' && admin.role === 'owner' && <><input name="refundAmount" type="number" step="0.01" placeholder="Refund ₹ (blank = full)" className={`${inputCls} w-44`} /><button name="decision" value="received" className={btn2Cls}>Goods received → refund</button></>}
            </form>
          )}
        </Panel>
      ))}
    </div>
  );
}
