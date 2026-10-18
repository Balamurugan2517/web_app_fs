import { Suspense } from 'react';
import { btn2Cls, btnCls, Field, Flash, inputCls, Panel, Table } from '@/components/admin/ui';
import { requireAdmin } from '@/lib/admin-auth';
import { addDays, istToday } from '@/lib/dates';
import { formatINR } from '@/lib/money';
import { listExpenses } from '@/lib/repos/admin';
import { addExpenseAction, deleteExpenseAction } from '../actions';

export const instant = false;
type SP = Promise<{ ok?: string; err?: string }>;

export default function Expenses({ searchParams }: { searchParams: SP }) {
  return <Suspense fallback={<p>Loading…</p>}><Body searchParams={searchParams} /></Suspense>;
}

async function Body({ searchParams }: { searchParams: SP }) {
  await requireAdmin('owner');
  const sp = await searchParams;
  const today = istToday();
  const rows = await listExpenses(addDays(today, -120), addDays(today, 1));
  return (
    <div className="space-y-6">
      <Flash ok={sp.ok} err={sp.err} />
      <h1 className="font-serif text-3xl">Expenses</h1>
      <p className="text-sm text-maroon/70">Add the shop&apos;s other costs (rent, salaries, advertising, packaging, software). They are subtracted in the profit &amp; loss report so you see your <b>real</b> profit.</p>
      <Panel title="Add an expense">
        <form action={addExpenseAction} className="grid gap-3 sm:grid-cols-5"><Field label="Date"><input name="spentOn" type="date" defaultValue={today} required className={inputCls} /></Field><Field label="Category"><input name="category" list="cats" required className={inputCls} placeholder="Advertising" /></Field>
          <datalist id="cats"><option>Advertising</option><option>Rent</option><option>Salaries</option><option>Packaging</option><option>Software</option><option>Other</option></datalist>
          <Field label="Amount ₹"><input name="amount" type="number" step="0.01" min="1" required className={inputCls} /></Field><Field label="Note"><input name="note" className={inputCls} /></Field><div className="flex items-end"><button className={btnCls}>Add</button></div></form>
      </Panel>
      <Table head={['Date', 'Category', 'Amount', 'Note', 'By', '']} empty={rows.length ? undefined : 'No expenses in the last 4 months.'}>
        {rows.map((r) => <tr key={r.id}><td>{r.spent_on}</td><td>{r.category}</td><td>{formatINR(r.amount)}</td><td>{r.note}</td><td className="text-xs">{r.created_by}</td><td><form action={deleteExpenseAction}><input type="hidden" name="id" value={r.id} /><button className={`${btn2Cls} !px-2 !py-1`}>Delete</button></form></td></tr>)}
      </Table>
    </div>
  );
}
