/** Date ranges for reports, in INDIAN time (the shop's "day" starts at midnight IST, not UTC). */
const ist = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
export const istToday = (now = new Date()): string => ist.format(now);

export const addDays = (d: string, n: number): string => { const t = new Date(`${d}T00:00:00Z`); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };

export interface Range { from: string; to: string; fromIso: string; toIso: string; label: string }

/** `from`/`to` are inclusive YYYY-MM-DD dates. */
export function istRange(from: string, to: string, label = ''): Range {
  return { from, to, fromIso: `${from}T00:00:00+05:30`, toIso: `${addDays(to, 1)}T00:00:00+05:30`, label: label || `${from} to ${to}` };
}

export type Preset = 'today' | '7d' | '30d' | 'month' | 'last-month' | 'year' | 'last-year';
export function presetRange(p: Preset, now = new Date()): Range {
  const today = istToday(now); const y = Number(today.slice(0, 4)); const m = Number(today.slice(5, 7));
  const first = (yy: number, mm: number) => `${yy}-${String(mm).padStart(2, '0')}-01`;
  switch (p) {
    case 'today': return istRange(today, today, 'Today');
    case '7d': return istRange(addDays(today, -6), today, 'Last 7 days');
    case '30d': return istRange(addDays(today, -29), today, 'Last 30 days');
    case 'month': return istRange(first(y, m), today, 'This month');
    case 'last-month': { const py = m === 1 ? y - 1 : y; const pm = m === 1 ? 12 : m - 1; return istRange(first(py, pm), addDays(first(y, m), -1), 'Last month'); }
    case 'year': return istRange(`${y}-01-01`, today, 'This year');
    case 'last-year': return istRange(`${y - 1}-01-01`, `${y - 1}-12-31`, 'Last year');
  }
}

export const isDateString = (s: string | undefined): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
