// Captures REAL screenshots of the admin portal for the documentation.
//   1) docker compose up -d db && npm run db:migrate && npm run db:seed
//   2) npm run admin:create -- owner@demo.in "Demo Passphrase 123" "Demo Owner" owner
//   3) npm run build && npm start      (in another terminal, with SESSION_SECRET set)
//   4) node scripts/capture-screenshots.mjs
import { chromium } from '@playwright/test';

const base = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const pages = [['dashboard', '/admin'], ['orders', '/admin/orders'], ['products', '/admin/products'], ['inventory', '/admin/inventory'], ['coupons', '/admin/coupons'], ['customers', '/admin/customers'], ['reports', '/admin/reports?preset=year'], ['expenses', '/admin/expenses'], ['returns', '/admin/returns'], ['import', '/admin/products/import'], ['messages', '/admin/notifications']];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await page.goto(`${base}/admin/login`);
await page.screenshot({ path: 'docs/screenshots/live-login.png' });
await page.fill('#email', 'owner@demo.in'); await page.fill('#password', 'Demo Passphrase 123'); await page.click('button:has-text("Sign in")');
await page.waitForURL(`${base}/admin`);
for (const [name, path] of pages) { await page.goto(`${base}${path}`); await page.waitForLoadState('networkidle'); await page.screenshot({ path: `docs/screenshots/live-${name}.png`, fullPage: true }); }
await browser.close();
