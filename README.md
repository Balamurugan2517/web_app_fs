# Luxe & Thread – Fashion E-Commerce for India (v2.0)

Women · Men · Kids fashion store built with **Next.js 16**, **React 19**, **TypeScript**, **Tailwind CSS v4**, **Zod** and **PostgreSQL 16**, with **Razorpay** payments, **Shiprocket** shipping, an owner **admin portal** (stock, prices, discounts, coupons, orders, returns, customers, reports & profit/loss) and complete documentation.

## What is included
| Area | Highlights |
|---|---|
| Storefront | Women/Men/Kids/New/Sale/About/Contact · search, filters, sort · Indian size guide (S–XXL, kids, footwear) · live stock per size · sale prices · gallery · PIN-code check |
| Checkout | server-side pricing & stock reservation · coupons · UPI/cards/net banking · COD (switchable) · opt-in marketing consent |
| Orders | tracking page · customer **cancel / return** · automatic refunds · late-payment refund · unpaid orders expire in 30 min |
| Admin | products, sizes, stock receive/stock-take, CSV import, SKU-named photos, festival sales, coupons, shipments, refunds, returns, customers & campaigns, expenses, **reports (day/month/year) with CSV & PDF**, activity log, roles (owner/staff) |
| Messages | outbox with retries: e-mail (SMTP), SMS (HTTP gateway), WhatsApp (Cloud API) – optional |
| Quality | strict TS · ESLint · 23 unit tests · PostgreSQL integration tests · Playwright e2e · k6 load test |

## Quick start
```bash
npm install                                   # (not "npm ci" the first time – package-lock needs the new packages)
cp .env.example .env.local                    # set SESSION_SECRET, JOBS_SECRET (openssl rand -hex 32)
docker compose up -d db                       # local PostgreSQL 16
npm run db:migrate && npm run db:seed         # tables + demo catalogue
npm run admin:create -- me@test.in "A Long Passphrase 123" "Me" owner
npm run dev                                   # http://localhost:3000   ·   admin: /admin
```
Requires **Node.js 22+**. Never copy `node_modules` between computers.

| Command | Purpose |
|---|---|
| `npm run typecheck` · `npm run lint` · `npm test` · `npm run build` | the four quality checks (run before every commit) |
| `npm run test:integration` | database tests (needs a TEST PostgreSQL – see docs) |
| `npm run test:e2e` | browser tests (Playwright) |
| `npm run db:migrate` / `db:seed` / `admin:create` | database & admin setup |
| `npm run docs` | regenerate API docs (`docs/api`) |
| `python3 scripts/build-pdfs.py` | rebuild the PDF versions of all documents |

## Documentation
Start at **[docs/README.md](docs/README.md)**. Documents are prefixed **Internal** (developers) or **External** (customer) and exist as Markdown and PDF (`docs/pdf`).

## Project phases
✅ 1 Foundation & design system · ✅ 2 Catalogue & routing · ✅ 3 Cart engine · ✅ 4 Checkout, validation, payments · ✅ 5 Shipping, admin, hardening, deployment · ✅ 6 (v2) Inventory, sizes, discounts, reports, notifications, customers, cancellation & returns, PostgreSQL.

## Notes for contributors / AI assistants
Next.js 16 with Cache Components – read `AGENTS.md` and `node_modules/next/dist/docs/` before changing routing or caching. Pages that read the database, cookies or the URL must be inside `<Suspense>` and export `instant = false`.
