'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/** While we wait for the payment webhook, re-fetch the page every few seconds (max ~40s) so the status updates by itself. */
export default function AutoRefresh({ everyMs = 5000, times = 8 }: { everyMs?: number; times?: number }) {
  const router = useRouter();
  useEffect(() => {
    let n = 0;
    const id = setInterval(() => {
      if (++n > times) return clearInterval(id);
      router.refresh();
    }, everyMs);
    return () => clearInterval(id);
  }, [router, everyMs, times]);
  return null;
}
