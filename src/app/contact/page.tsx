import type { Metadata } from 'next';
import { siteConfig } from '@/lib/site-config';

export const metadata: Metadata = { title: 'Contact us' };

export default function Contact() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <h1 className="font-serif text-4xl font-light">Contact us</h1>
      <dl className="mt-8 grid gap-6 sm:grid-cols-2">
        <div><dt className="text-xs font-semibold uppercase tracking-widest text-rose-800">Email</dt><dd className="mt-1"><a className="underline" href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a></dd></div>
        <div><dt className="text-xs font-semibold uppercase tracking-widest text-rose-800">Phone / WhatsApp</dt><dd className="mt-1">{siteConfig.phone}</dd></div>
        <div><dt className="text-xs font-semibold uppercase tracking-widest text-rose-800">Support hours</dt><dd className="mt-1">{siteConfig.supportHours}</dd></div>
        <div><dt className="text-xs font-semibold uppercase tracking-widest text-rose-800">Registered address</dt><dd className="mt-1">{siteConfig.legalName}<br />{siteConfig.address}</dd></div>
      </dl>
      <p className="mt-8 rounded-lg border border-rose-200 bg-cream p-4 text-sm">Order question? Please quote your order number (it starts with <b>LT</b>) – it is on your order page and in your confirmation email.</p>
    </article>
  );
}
