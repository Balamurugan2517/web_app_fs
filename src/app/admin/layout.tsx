import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AdminNav } from '@/components/admin/ui';
import { getAdmin } from '@/lib/admin-auth';
import { logoutAction } from './actions';

export const metadata: Metadata = { title: 'Admin', robots: { index: false, follow: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6"><Suspense fallback={null}><Shell>{children}</Shell></Suspense></div>;
}

async function Shell({ children }: { children: React.ReactNode }) {
  const admin = await getAdmin().catch(() => null);
  return (
    <>
      {admin && (
        <div className="mb-3 flex items-center justify-between text-sm print:hidden">
          <p><b>Luxe &amp; Thread admin</b> · {admin.name} <span className="rounded bg-rose-100 px-2 py-0.5 text-xs">{admin.role}</span></p>
          <form action={logoutAction}><button className="underline">Sign out</button></form>
        </div>
      )}
      {admin && <AdminNav role={admin.role} />}
      {children}
    </>
  );
}
