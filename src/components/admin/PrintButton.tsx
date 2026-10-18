'use client';

export default function PrintButton() {
  return <button type="button" onClick={() => window.print()} className="rounded-md border border-maroon px-4 py-2 text-xs font-semibold uppercase tracking-wider hover:bg-maroon hover:text-cream">Print / Save as PDF</button>;
}
