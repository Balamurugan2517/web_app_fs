# Internal 04 · Razorpay, Shiprocket & Platform Configuration Guide

| | |
|---|---|
| **Audience** | INTERNAL – developers / DevOps |
| **Purpose** | Which values to change during **testing** and **live**, how to validate each one, and what breaks if it is wrong |
| **Version** | 2.0 · October 2026 |

![Test to live](../images/08-test-to-live.png)

> **Where settings live.** Nothing is hard-coded. Values come from **environment variables**: `.env.local` (your computer), `.env.production.local` (server, `chmod 600`) or the host's settings. Template: `.env.example`. Validation: `lib/env.ts` (Zod) – a wrong value gives a clear message *when the feature is used*. After changing a value **restart** the app (`pm2 restart luxe-thread`). `NEXT_PUBLIC_*` values are baked in at **build** time – rebuild.
> ⚠️ Never put a secret in a `NEXT_PUBLIC_*` variable, a screenshot, e-mail or chat.

---

## 1 · Master table
| Variable | Secret | Needed for | TEST value | LIVE value | Validate (see §5) |
|---|---|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | no | links in e-mails, sitemap | `http://localhost:3000` / staging URL | `https://www.your-domain.in` | open `/sitemap.xml`, check links |
| `DATABASE_URL` | **yes** | everything | `postgres://luxe:…@localhost:5432/luxe_thread` | managed/own DB URL (`DATABASE_SSL=true` if required) | `GET /api/health` → `database:true` |
| `SESSION_SECRET` | **yes** | admin cookies | any 32+ chars | **new** `openssl rand -hex 32` | admin login works |
| `JOBS_SECRET` | **yes** | cron endpoints | any 16+ chars | **new** long random | `curl` job endpoint → 200 |
| `RAZORPAY_KEY_ID` | no | online payment | `rzp_test_…` | `rzp_live_…` | §5.1 |
| `RAZORPAY_KEY_SECRET` | **yes** | payment, verify, refund | test secret | live secret | §5.1 |
| `RAZORPAY_WEBHOOK_SECRET` | **yes** | payment webhook | secret you typed in the **test** webhook | secret of the **live** webhook (new) | §5.2 |
| `PAYMENT_FEE_PERCENT` | no | profit report estimate | 2 | your Razorpay plan % (e.g. 2) | report note |
| `SHIPROCKET_EMAIL` / `_PASSWORD` | **yes** | shipping | **API user** | same/dedicated API user | §5.3 |
| `SHIPROCKET_PICKUP_LOCATION` | no | shipment | pickup **nickname** exactly | real warehouse nickname | §5.3 |
| `SHIPROCKET_PICKUP_PINCODE` | no | PIN-code check | warehouse PIN | warehouse PIN | §5.3 |
| `SHIPROCKET_WEBHOOK_TOKEN` | **yes** | courier webhook | any long text | **new** long text | §5.4 |
| `SHIPROCKET_AUTO_CREATE` | no | auto shipment | `false` (avoid real bookings) | `true` | order flow |
| `COD_ENABLED` / `COD_MAX_ORDER_VALUE` | no | COD | `true` / 25000 | your decision | checkout |
| `SMTP_URL`, `MAIL_FROM` | **yes** | e-mail | MailHog/Mailpit or sandbox | real SMTP (`smtps://user:pass@host:465`) | §5.5 |
| `SMS_ENABLED`, `SMS_GATEWAY_*`, `SMS_SENDER_ID` | **yes** | SMS | `false` | `true` after DLT approval | §5.5 |
| `WHATSAPP_ENABLED`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TOKEN` | **yes** | WhatsApp | `false` | `true` after template approval | §5.5 |
| `UPLOAD_DIR` | no | photos | `./uploads` | `/var/lib/luxe-thread/uploads` | upload a photo |

> **Shiprocket has no sandbox.** API calls create real entries. In TEST keep `SHIPROCKET_AUTO_CREATE=false`, or cancel the test orders in the panel.

## 2 · Razorpay – what to configure
| Step | Where (verify on screen) | Result |
|---|---|---|
| Test keys | Dashboard in **Test Mode** → Account & Settings → **API Keys** → Generate | `rzp_test_…` id + secret (shown once) |
| Webhook | Account & Settings → **Webhooks** → Add | URL `https://<host>/api/webhooks/razorpay`; secret = *you invent it*; events ✅ `payment.captured` ✅ `payment.failed` |
| Capture mode | Settings → payment capture | **Automatic** (otherwise payments are auto-refunded) |
| Refunds | built-in (`refundRazorpayPayment`) | needs the same key pair |
| Live | KYC → switch to **Live Mode** → generate **live** keys → create a **new live webhook** | `rzp_live_…`; new secret |

**Test payment data:** card `4111 1111 1111 1111`, any future expiry/CVV, choose *Success*/*Failure* on the mock page; UPI `success@razorpay` / `failure@razorpay`.
**Locally** webhooks need a public URL: `npx ngrok http 3000` (or `cloudflared tunnel`).

## 3 · Shiprocket – what to configure
| Step | Where | Result |
|---|---|---|
| KYC + wallet | Shiprocket panel | can book shipments |
| Pickup address | Settings → Pickup Addresses | note the **nickname** → `SHIPROCKET_PICKUP_LOCATION` |
| API user | Settings → API → Configure → **Create an API User** | e-mail + password → `SHIPROCKET_EMAIL/PASSWORD` |
| Courier priority | Settings → courier preferences | decides who auto-assign picks |
| Webhook | Settings → API → Webhooks | URL `https://<host>/api/webhooks/courier-updates`; token = `SHIPROCKET_WEBHOOK_TOKEN` (sent as `x-api-key`); **URL must not contain** `shiprocket`, `kartrocket`, `sr`, `kr`; must answer **200** |
| Box size | `lib/shiprocket.ts` (`length/breadth/height`) | measure your real box (cm) – wrong values cause weight-discrepancy charges |
| Product weight | each product `weight_kg` | packed weight |

## 4 · Platform values (database, sessions, jobs, e-mail)
| Value | How to create | Notes |
|---|---|---|
| `SESSION_SECRET`, `JOBS_SECRET` | `openssl rand -hex 32` | different values per environment; rotate on staff change |
| Admin user | `npm run admin:create -- owner@shop.in "Long Passphrase 123" "Owner" owner` | password ≥ 12 chars; `staff` role for helpers |
| Cron jobs | `* * * * * curl -fsS -X POST -H "x-jobs-secret: $JOBS_SECRET" https://host/api/jobs/notifications >/dev/null` and `*/5 * * * * … /api/jobs/expire-orders` | without them messages still send right after orders, but retries and expiry will not run |
| SMTP | provider SMTP URL, port 465 TLS or 587 STARTTLS | SPF + DKIM + DMARC DNS records for deliverability |

## 5 · Validation commands
### 5.1 Razorpay keys are valid
```bash
curl -s -o /dev/null -w "%{http_code}\n" -u "$RAZORPAY_KEY_ID:$RAZORPAY_KEY_SECRET" "https://api.razorpay.com/v1/orders?count=1"
```
`200` = key id + secret match · `401` = wrong pair (test key with live secret, typo) · network error = firewall.
### 5.2 Webhook secret and signature
```bash
BODY='{"event":"payment.captured","payload":{"payment":{"entity":{"id":"pay_TEST1","order_id":"order_DOESNOTEXIST","method":"upi"}}}}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$RAZORPAY_WEBHOOK_SECRET" | sed 's/^.* //')
curl -i -X POST https://<host>/api/webhooks/razorpay -H "Content-Type: application/json" -H "X-Razorpay-Signature: $SIG" --data "$BODY"
```
`200 {"received":true}` (the unknown order is just logged) = secret matches · `400 INVALID_SIGNATURE` = secret differs. Then in the Razorpay dashboard open **Webhooks → event log** after a real test payment: delivery should show `200`.
### 5.3 Shiprocket login, pickup name, serviceability
```bash
TOKEN=$(curl -s -X POST https://apiv2.shiprocket.in/v1/external/auth/login -H "Content-Type: application/json" \
  -d "{\"email\":\"$SHIPROCKET_EMAIL\",\"password\":\"$SHIPROCKET_PASSWORD\"}" | sed 's/.*"token":"\([^"]*\)".*/\1/')
echo ${#TOKEN}                                   # a long number (>100) = login OK; 0/short = wrong API user
curl -s -H "Authorization: Bearer $TOKEN" https://apiv2.shiprocket.in/v1/external/settings/company/pickup   # lists pickup nicknames – copy EXACTLY
curl -s -H "Authorization: Bearer $TOKEN" "https://apiv2.shiprocket.in/v1/external/courier/serviceability/?pickup_postcode=$SHIPROCKET_PICKUP_PINCODE&delivery_postcode=600001&weight=1&cod=0" | head -c 400
```
### 5.4 Courier webhook token
```bash
curl -i -X POST https://<host>/api/webhooks/courier-updates -H "Content-Type: application/json" -H "x-api-key: $SHIPROCKET_WEBHOOK_TOKEN" \
  -d '{"order_id":"LTXXXXXXXX","awb":"123","courier_name":"Test","current_status":"IN TRANSIT"}'
```
`200` = token OK · `401` = mismatch.
### 5.5 Messages
```bash
curl -s https://<host>/api/health        # integrations.email / sms / whatsapp = true when configured
# place a TEST order, then: Admin → Messages → status must become "sent"
curl -i -X POST -H "x-jobs-secret: $JOBS_SECRET" https://<host>/api/jobs/notifications   # {"sent":n,"failed":0,"skipped":m}
```
### 5.6 Health & database
```bash
curl -s https://<host>/api/health | python3 -m json.tool
```
Expect `"status":"ok"`, `"database":true`, integrations matching what you configured. `503 degraded` = database unreachable.

## 6 · TEST → LIVE change list (copy into your ticket)
| # | Item | Done |
|---|---|---|
| 1 | `NEXT_PUBLIC_SITE_URL` → live domain; **rebuild** | ☐ |
| 2 | `RAZORPAY_KEY_ID/SECRET` → live; verify with §5.1 | ☐ |
| 3 | Create **live** Razorpay webhook (live URL, events, new secret) → `RAZORPAY_WEBHOOK_SECRET`; verify §5.2 | ☐ |
| 4 | Shiprocket pickup nickname/PIN = real warehouse; verify §5.3 | ☐ |
| 5 | Shiprocket webhook → live URL + **new** token; verify §5.4 | ☐ |
| 6 | `SHIPROCKET_AUTO_CREATE=true` | ☐ |
| 7 | New `SESSION_SECRET`, `JOBS_SECRET`; admin users re-created with strong passwords | ☐ |
| 8 | `DATABASE_URL` → production DB; migrations applied; **no demo seed** | ☐ |
| 9 | SMTP live + SPF/DKIM; send one real e-mail | ☐ |
| 10 | SMS/WhatsApp only after DLT / template approval | ☐ |
| 11 | `UPLOAD_DIR` persistent & in backups | ☐ |
| 12 | Box size, product weights, GST rates/HSN confirmed by CA | ☐ |
| 13 | One real ₹ order → refund it | ☐ |

## 7 · Things that go wrong (quick lookup)
| Symptom | Likely value at fault |
|---|---|
| "Online payment is not configured yet" | `RAZORPAY_KEY_ID/SECRET` empty |
| Payment OK but order stays "Awaiting payment" | `RAZORPAY_WEBHOOK_SECRET` wrong **and** verify call failed |
| `INVALID_SIGNATURE` on verify | test key id with live secret (or the reverse) |
| "Wrong pickup location" | `SHIPROCKET_PICKUP_LOCATION` spelling/case |
| Shipping provider login failed | using your normal login instead of the **API user** |
| Webhook 401 | token mismatch |
| Admin login "not configured" | `SESSION_SECRET` < 32 chars/missing, or `DATABASE_URL` missing |
| Messages stay `queued` | cron not running / SMTP wrong (see Admin → Messages → last error) |
