import { Suspense } from 'react';
import { Badge, btn2Cls, Flash, Table } from '@/components/admin/ui';
import { requireAdmin } from '@/lib/admin-auth';
import { getEnv } from '@/lib/env';
import { queueDepth, recentNotifications } from '@/lib/repos/admin';
import { retryMessagesAction } from '../actions';

export const instant = false;
type SP = Promise<{ status?: string; ok?: string; err?: string }>;

export default function Messages({ searchParams }: { searchParams: SP }) {
  return <Suspense fallback={<p>Loading…</p>}><Body searchParams={searchParams} /></Suspense>;
}

async function Body({ searchParams }: { searchParams: SP }) {
  await requireAdmin();
  const sp = await searchParams;
  const env = getEnv();
  const [rows, depth] = await Promise.all([recentNotifications(100, sp.status), queueDepth()]);
  const tone = (s: string) => (s === 'sent' ? 'good' : s === 'failed' ? 'bad' : s === 'queued' ? 'warn' : 'neutral') as 'good' | 'bad' | 'warn' | 'neutral';
  return (
    <div className="space-y-5">
      <Flash ok={sp.ok} err={sp.err} />
      <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="font-serif text-3xl">Customer messages</h1><form action={retryMessagesAction}><button className={btn2Cls}>Retry failed messages</button></form></div>
      <p className="text-sm">Channels: E-mail {env.SMTP_URL ? <Badge tone="good">configured</Badge> : <Badge tone="bad">not configured</Badge>} SMS {env.SMS_ENABLED ? <Badge tone="good">on</Badge> : <Badge>off</Badge>} WhatsApp {env.WHATSAPP_ENABLED ? <Badge tone="good">on</Badge> : <Badge>off</Badge>} · {depth.map((d) => `${d.status}: ${d.n}`).join(' · ') || 'no messages yet'}</p>
      <Table head={['When (IST)', 'Channel', 'To', 'Message', 'Kind', 'Status', 'Tries', 'Last error']} empty={rows.length ? undefined : 'No messages yet.'}>
        {rows.map((r) => <tr key={r.id}><td>{r.created_at.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'short', timeStyle: 'short' })}</td><td>{r.channel}</td><td>{r.recipient}</td><td>{r.template}</td><td>{r.kind}</td><td><Badge tone={tone(r.status)}>{r.status}</Badge></td><td>{r.attempts}</td><td className="max-w-xs truncate text-xs text-red-700">{r.last_error}</td></tr>)}
      </Table>
    </div>
  );
}
