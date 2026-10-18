import type { Metadata } from 'next';
import { INDIAN_SIZE_CHARTS } from '@/lib/sizes';

export const metadata: Metadata = { title: 'Indian size guide', description: 'Size charts for women, men, kids and footwear in Indian sizes (inches / cm).' };

export default function SizeGuide() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="font-serif text-4xl font-light">Indian size guide</h1>
      <p className="mt-3 text-maroon/80">Our sizes follow the Indian standard (S, M, L, XL, XXL). Measure your body – not an old garment – with a soft tape, and pick the size that matches your largest measurement. Between two sizes? Choose the larger.</p>
      <p className="mt-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">Each product page lists its own available sizes. Measurements are body measurements in inches and can vary by about ½ inch.</p>
      {INDIAN_SIZE_CHARTS.map((c) => (
        <section key={c.id} id={c.id} className="mt-10 scroll-mt-24">
          <h2 className="font-serif text-2xl">{c.title}</h2>
          <p className="mb-3 text-sm text-maroon/70">{c.note}</p>
          <div className="overflow-x-auto rounded-xl border border-rose-200 bg-white/80">
            <table className="w-full text-left text-sm">
              <thead className="bg-cream text-xs uppercase tracking-wider"><tr>{c.headers.map((h) => <th key={h} className="p-3">{h}</th>)}</tr></thead>
              <tbody>{c.rows.map((r) => <tr key={r[0]} className="border-t border-rose-100">{r.map((v, i) => <td key={i} className={`p-3 ${i === 0 ? 'font-semibold' : ''}`}>{v}</td>)}</tr>)}</tbody>
            </table>
          </div>
        </section>
      ))}
      <section className="mt-10 rounded-xl border border-rose-200 bg-cream p-5 text-sm">
        <h2 className="font-semibold">How to measure</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5"><li><b>Chest / bust:</b> around the fullest part, tape level under the arms.</li><li><b>Waist:</b> around the narrowest part, above the navel.</li><li><b>Hip:</b> around the fullest part of the hips.</li><li><b>Foot:</b> stand on paper, mark heel and longest toe, measure the distance in cm.</li></ul>
      </section>
    </div>
  );
}
