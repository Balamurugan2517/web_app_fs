import { Suspense } from 'react';
import { Table } from '@/components/admin/ui';
import { requireAdmin } from '@/lib/admin-auth';
import { recentAudit } from '@/lib/repos/admin';

export const instant = false;

export default function Audit() {
  return <Suspense fallback={<p>Loading…</p>}><Body /></Suspense>;
}

async function Body() {
  await requireAdmin('owner');
  const rows = await recentAudit(150);
  return (
    <div className="space-y-5">
      <h1 className="font-serif text-3xl">Activity log</h1>
      <p className="text-sm text-maroon/70">Who changed what, and when (last 150 actions).</p>
      <Table head={['When (IST)', 'Who', 'Action', 'What', 'Details']} empty={rows.length ? undefined : 'Nothing yet.'}>
        {rows.map((r, i) => <tr key={i}><td className="whitespace-nowrap">{r.at.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'short', timeStyle: 'short' })}</td><td>{r.actor}</td><td>{r.action}</td><td className="font-mono text-xs">{r.entity} {r.entity_id ?? ''}</td><td className="max-w-md truncate font-mono text-xs">{JSON.stringify(r.details)}</td></tr>)}
      </Table>
    </div>
  );
}
