# Internal 05 · Troubleshooting – Whole Application

| | |
|---|---|
| **Audience** | INTERNAL – support & developers |
| **Method** | 1) What exactly did the user see? 2) Get the **request id** or **order id** 3) Search logs 4) Check the order's **event log** 5) Check the provider dashboard 6) Fix → retest |
| Specialised guides | [Payments](Internal_06_Troubleshooting_Payments.md) · [Shipping & returns](Internal_07_Troubleshooting_Shipping_and_Returns.md) |

## 0 · Command cheat-sheet
| Command | What it tells you |
|---|---|
| `curl -s https://host/api/health` | app up? database reachable? which integrations configured? message queue counts |
| `pm2 status` | is the process running, restarts count, memory |
| `pm2 logs luxe-thread --lines 200 --nostream` | recent application logs (JSON lines) |
| `pm2 logs luxe-thread --lines 2000 --nostream \| grep '"level":"error"'` | only errors |
| `pm2 logs luxe-thread --lines 2000 --nostream \| grep '<request-id>'` | everything about one request (id shown to the user in error responses) |
| `sudo systemctl status nginx postgresql` | web server / database service state |
| `sudo tail -n 100 /var/log/nginx/error.log` | proxy errors (502/504) |
| `df -h` / `free -m` / `uptime` | disk, memory, load |
| `psql "$DATABASE_URL" -c "select now()"` | can we reach the database from this server? |
| `psql "$DATABASE_URL" -c "select status,count(*) from orders group by 1"` | order counts by status |
| `psql "$DATABASE_URL" -c "select id,type,message from order_events where order_id='LT…' order by id"` | the story of one order |

## 1 · Installing / running locally
| Symptom | Cause | Fix |
|---|---|---|
| `npm install` network errors | offline/proxy | fix network, retry |
| `Permission denied` on `eslint`/`next` | `node_modules` copied from another OS | delete `node_modules`, `npm install` on this machine |
| Build: fonts / `fetch failed` | offline build | allow internet for the first build |
| Build: "uncached data was accessed outside of `<Suspense>`" | a page reads DB/cookies/URL outside Suspense | wrap in `<Suspense>` + `export const instant = false` (see LLD §2) |
| Build: `new Date()` / `Math.random()` error | clock/random in a pre-built server part | move after awaited data, to an API route, or `'use cache'` |
| `DATABASE_URL`/`Database is not configured` | env missing | `.env.local`; `docker compose up -d db`; `npm run db:migrate` |
| `relation "products" does not exist` | migrations not run | `npm run db:migrate` (then `npm run db:seed` for demo data) |
| Shop shows "We could not load the collection" | database down / wrong URL | `curl /api/health`; check `DATABASE_URL`; `docker compose ps` |
| Page white/black instead of sandalwood | old `globals.css` | use delivered file |
| Hydration warning | render differs server/browser | don't read `localStorage`/`window` during render |
| `npm test` fails to compile `pg` types | dependencies not installed | `npm install` |

## 2 · Storefront
| Symptom | Cause | Fix |
|---|---|---|
| Product missing in shop | hidden (`is_active=false`) / no stock filter | Admin → Products → Show; check filters |
| Sale price not showing | sale dates outside today, or sale ≥ price | Product → sale price lower than price; check dates (IST) |
| Size greyed out | stock 0 | Admin → receive stock |
| Photos broken | file missing in `UPLOAD_DIR` / wrong permissions | `ls -l $UPLOAD_DIR`; user running the app must read it; restore from backup |
| Bag says "No longer available" | product hidden/deleted | remove item; show product again |
| "Coupon not valid" | expired, minimum not met, usage limit | Admin → Coupons |
| COD radio disabled | PIN not entered, `COD_ENABLED=false`, PIN not COD-serviceable | env + PIN |
| "Too many requests" | rate limit | wait 1 min; behind one office IP? raise limit |

## 3 · Admin portal
| Symptom | Fix |
|---|---|
| "Admin login is not configured" | set `SESSION_SECRET` (≥32 chars) + `DATABASE_URL`; restart |
| "Incorrect e-mail or password" | `npm run admin:create -- email "new passphrase" "Name" owner` (also resets password) |
| Redirected to login repeatedly | session expired (8 h), server clock wrong (`timedatectl`), cookie blocked, `SESSION_SECRET` changed, not HTTPS in production |
| "That page is for the shop owner only" | staff role; use an owner account |
| CSV import says "Nothing was imported" | read the listed line numbers (e.g. price higher than MRP, size not valid for size_set); fix and re-upload |
| Photo upload fails | >3 MB, not JPG/PNG/WebP, `UPLOAD_DIR` not writable (`chown`) |
| Reports empty | no paid orders in range; wrong dates; check status filter in DB |
| Profit looks too high | `cost_price` is 0 on products – fill it in |

## 4 · Server & database
| Symptom | Fix |
|---|---|
| 502 Bad Gateway | app down: `pm2 restart luxe-thread`; read logs |
| `STORAGE_ERROR` in logs | read `sqlState`: `23505` duplicate · `23514` rule violated (e.g. stock < 0) · `23503` missing parent · `57P03`/`08006` DB down · `53300` too many connections |
| "too many connections" | only one app instance? `select count(*) from pg_stat_activity;` restart app |
| Slow pages | `pm2 monit`; missing index? `EXPLAIN ANALYZE`; low memory (`free -m`) |
| Disk full | `df -h`; clear old logs/backups; move uploads |
| Build killed ("Killed") | out of memory – ≥2 GB or add swap |
| Certificate expired | `sudo certbot renew`; check timer |
| Orders/products "disappeared" | wrong database after deploy → check `DATABASE_URL`; restore ([Internal 10](Internal_10_Database_Backup_and_Restore.md)) |

## 5 · Messages (e-mail / SMS / WhatsApp)
| Symptom | Fix |
|---|---|
| Status stays `queued` | cron not running: `crontab -l`; run job manually (see Config guide §5.5) |
| `failed` + "Email is not configured" → actually `skipped` | set `SMTP_URL`, `MAIL_FROM` |
| `failed` auth error | wrong SMTP user/password/port; try port 587 + STARTTLS |
| Goes to spam | SPF/DKIM/DMARC DNS; send from your own domain |
| SMS `failed` 4xx | DLT template/sender not approved; token wrong |
| WhatsApp `failed` | template not approved or recipient not opted-in; token expired |
After fixing: Admin → Messages → **Retry failed messages**.

## 6 · Escalation pack (send to the developer)
Time (IST) · order id / request id · screenshot · last 50 log lines (redacted) · `curl /api/health` output · what you already tried.
