import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPolicy, policies } from '@/lib/policies';

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return policies.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: getPolicy(slug)?.title ?? 'Policy' };
}

export default async function PolicyPage({ params }: Props) {
  const { slug } = await params;
  const policy = getPolicy(slug);
  if (!policy) notFound();
  return (
    <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <h1 className="font-serif text-4xl font-light">{policy.title}</h1>
      <div className="mt-8 space-y-6">
        {policy.sections.map((s) => (
          <section key={s.heading}>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-rose-800">{s.heading}</h2>
            <p className="mt-2 leading-relaxed text-maroon/85">{s.body}</p>
          </section>
        ))}
      </div>
    </article>
  );
}
