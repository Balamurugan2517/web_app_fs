import { policies } from '@/lib/policies';
import { listProducts } from '@/lib/repos/catalog';

/** sitemap.xml built from the live catalogue, so new products are discoverable by Google without a redeploy. */
export async function GET() {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
  const products = await listProducts({ limit: 200 }).catch(() => []);
  const urls = ['', '/shop', '/shop?department=women', '/shop?department=men', '/shop?department=kids', '/about', '/contact', '/size-guide',
    ...products.map((p) => `/products/${p.slug}`), ...policies.map((p) => `/policies/${p.slug}`)];
  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((u) => `<url><loc>${(base + u).replace(/&/g, '&amp;')}</loc></url>`).join('')}</urlset>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=3600' } });
}
