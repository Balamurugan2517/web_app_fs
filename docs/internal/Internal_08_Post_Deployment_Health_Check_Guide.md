# Internal 08 · Post-Deployment Health Check (HC) Guide

| | |
|---|---|
| **Audience** | INTERNAL – whoever deploys |
| **When** | after every deployment (full list) · every morning (daily list) · after any incident |
| **Time** | full: ~20 min · daily: ~5 min |

## A · Immediately after deploy (full check)
| # | Check | Command / action | Pass criteria |
|---|---|---|---|
| 1 | Process running | `pm2 status` | `luxe-thread` **online**, restarts = 0–1 |
| 2 | Health endpoint | `curl -s https://www.your-domain.in/api/health \| python3 -m json.tool` | `status:"ok"`, `database:true`, razorpay/shiprocket/email `true` as configured |
| 3 | HTTPS | `curl -sI https://www.your-domain.in \| head -1` and `curl -sI http://www.your-domain.in \| head -2` | `200`; http redirects to https |
| 4 | Certificate | `echo \| openssl s_client -connect www.your-domain.in:443 2>/dev/null \| openssl x509 -noout -dates` | expires > 14 days |
| 5 | Logs clean | `pm2 logs luxe-thread --lines 100 --nostream \| grep '"level":"error"'` | no new errors |
| 6 | Migrations applied | `psql "$DATABASE_URL" -c "select version from schema_migrations"` | latest file listed |
| 7 | Home, shop, a product, size guide load | open in browser (desktop + phone) | no errors, photos visible |
| 8 | Product data | shop shows expected products/stock | counts match admin |
| 9 | Sitemap/robots | `/sitemap.xml`, `/robots.txt` | products listed, `/admin` disallowed |
| 10 | Admin login | `/admin/login` | dashboard opens, numbers sensible |
| 11 | Background jobs | `curl -i -X POST -H "x-jobs-secret: $JOBS_SECRET" https://host/api/jobs/notifications` | `200 {"sent":…}` |
| 12 | Cron present | `crontab -l` | notifications (1 min), expire-orders (5 min), backup (daily) |
| 13 | Uploads | open a product photo URL `/media/<file>` | `200` image |
| 14 | Webhooks reachable | Razorpay & Shiprocket webhook test (Config guide §5.2/5.4) | 200 |
| 15 | Test order (prepaid) | place order with test card (staging) or small real order (live) | PAID, e-mail received, shipment created |
| 16 | Cancel flow | cancel that test order from the order page | CANCELLED, stock restored, refund (if paid) |
| 17 | Backup | run backup script manually; list file | file > 0 bytes, `pg_restore --list` ok |
| 18 | Disk / memory | `df -h /` and `free -m` | disk < 80 %, free memory > 200 MB |
| 19 | Security headers | `curl -sI https://host \| grep -iE "x-frame\|x-content\|strict-transport\|content-security"` | all present |
| 20 | Sign-off | write date, version/tag, checker name in the release log | ☐ |

## B · Daily check (5 minutes)
| # | Check | Pass |
|---|---|---|
| 1 | `/api/health` ok | database true |
| 2 | Admin Dashboard: "Orders to ship", "Return requests", "Messages failed" | zero stuck items; act on any |
| 3 | `pm2 status` restarts count unchanged | ✔ |
| 4 | Yesterday's backup exists | file dated today |
| 5 | Razorpay captured vs our CAPTURED (Payments guide §6) | match |
| 6 | Errors: `grep '"level":"error"'` last 24 h | none repeating |

## C · Weekly
Shiprocket wallet balance · Messages tab: failed = 0 · low-stock list · disk space · `sudo apt list --upgradable` · review audit log for unexpected admin actions.

## D · Monthly
Restore drill ([Internal 10](Internal_10_Database_Backup_and_Restore.md)) · `npm audit` · apply OS updates · rotate nothing unless needed, but confirm secrets storage · delete old `notifications` (Database doc §8) · SSL renewal dry-run `sudo certbot renew --dry-run`.

## E · Result template
| Date | Version | Checked by | Items failed | Action | Re-test OK |
|---|---|---|---|---|---|
| | | | | | |
