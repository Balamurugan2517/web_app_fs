import Link from 'next/link';
import { policies } from '@/lib/policies';
import { siteConfig } from '@/lib/site-config';

const COPYRIGHT_FROM = 2026; // first year of publication

export default function Footer() {
  return (
    <footer className="border-t border-rose-300/60 bg-cream pb-10 pt-16 text-maroon">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 grid grid-cols-1 gap-10 md:grid-cols-4">
          <div className="space-y-4">
            <h3 className="font-serif text-xl font-bold">Luxe &amp; Thread<span className="text-rose-600">.</span></h3>
            <p className="text-xs leading-relaxed text-maroon/80">Handcrafted luxury fashion, made with artisans across South India and delivered across the country.</p>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-widest">Shop</h4>
            <ul className="space-y-2.5 text-xs text-maroon/80">
              <li><Link href="/shop?department=women" className="hover:text-rose-700">Women</Link></li>
              <li><Link href="/shop?department=men" className="hover:text-rose-700">Men</Link></li>
              <li><Link href="/shop?department=kids" className="hover:text-rose-700">Kids</Link></li>
              <li><Link href="/shop?sale=1" className="hover:text-rose-700">Sale</Link></li>
              <li><Link href="/size-guide" className="hover:text-rose-700">Size guide (India)</Link></li>
              <li><Link href="/about" className="hover:text-rose-700">About us</Link></li>
              <li><Link href="/contact" className="hover:text-rose-700">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-widest">Help &amp; policies</h4>
            <ul className="space-y-2.5 text-xs text-maroon/80">
              {policies.map((p) => (
                <li key={p.slug}><Link href={`/policies/${p.slug}`} className="hover:text-rose-700">{p.title}</Link></li>
              ))}
            </ul>
          </div>

          <div className="space-y-2 text-xs text-maroon/80">
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-widest text-maroon">Contact</h4>
            <p>{siteConfig.email}</p>
            <p>{siteConfig.phone}</p>
            <p>{siteConfig.supportHours}</p>
            <p className="pt-2">Free shipping across India · UPI · Cards · Net Banking</p>
          </div>
        </div>

        <p className="border-t border-rose-300/60 pt-6 text-center text-[11px] text-maroon/70">
          © {COPYRIGHT_FROM} {siteConfig.name}. All prices in INR, inclusive of GST.
        </p>
      </div>
    </footer>
  );
}
