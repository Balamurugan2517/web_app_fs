# Internal 07 · Troubleshooting – Shipping, Cancellation & Returns

| | |
|---|---|
| **Audience** | INTERNAL – support & developers |
| **Use when** | an order did not reach Shiprocket, tracking is wrong, a cancel/return/RTO misbehaves |

## 1 · Where to look
| # | Where | What it shows |
|---|---|---|
| 1 | Admin → order → *Payment & shipping* box + *Event log* | `SHIPMENT_CREATED`, `AWB_ASSIGNED`, `AWB_PENDING`, `SHIPMENT_FAILED`, `CANCEL_BLOCKED`, `COURIER_UPDATE`… |
| 2 | Logs | `shiprocket request rejected` (status + provider body), `auto shipment failed`, `awb/pickup step failed` |
| 3 | Shiprocket panel → Orders (search our `LT…` id) | what Shiprocket has |
| 4 | Shiprocket panel → Settings → API → Webhooks | whether callbacks are enabled |

## 2 · Commands
| Purpose | Command |
|---|---|
| Paid orders not in Shiprocket | `psql "$DATABASE_URL" -c "select id,status,shipment_attempts,shipment_last_error from orders where status in ('PAID','COD_CONFIRMED') and shiprocket_order_id is null"` |
| Shipping errors in logs | `pm2 logs luxe-thread --lines 3000 --nostream \| grep -E "shiprocket\|shipment"` |
| Test Shiprocket login | Config guide §5.3 (token length > 100 = ok) |
| Pincode serviceability | `curl -s -H "Authorization: Bearer $TOKEN" "https://apiv2.shiprocket.in/v1/external/courier/serviceability/?pickup_postcode=<PIN>&delivery_postcode=<PIN>&weight=1&cod=0" \| head -c 600` |
| Simulate courier webhook | Config guide §5.4 |
| Orders with tracking number | `select id,awb,courier,shipment_last_status from orders where awb is not null order by updated_at desc limit 20` |
| Returns waiting | `select order_id,status,reason from return_requests where status in ('requested','approved')` |
| Retry shipment | Admin → order → **Create shipment (retry)** |
| Refresh tracking | Admin → order → **Sync tracking** |

## 3 · Shipping symptoms
| Symptom | Likely cause | Fix |
|---|---|---|
| Order stays PAID, red "Last shipping error" | read the message | fix, then **Create shipment (retry)** |
| "Shipping provider login failed" | normal login used instead of API user; password changed | create/reset **API user**; update env; restart |
| Wrong/invalid pickup location | nickname mismatch | copy nickname exactly (Config §5.3 lists them) |
| "Insufficient wallet balance" | wallet empty | recharge |
| Shipment created but no AWB (`AWB_PENDING`) | no courier for PIN/weight, wallet, priority rules | assign courier in Shiprocket panel; then **Sync tracking** |
| Customer's PIN "cannot deliver" | no courier serves it | customer uses another address; owner can ship manually |
| Weight-discrepancy charge | real weight/box > data | measure; update `weight_kg` per product and box size in `lib/shiprocket.ts` |
| Webhook URL rejected by Shiprocket | contains `sr`/`kr`/`shiprocket`/`kartrocket` | use a domain/path without them |
| Webhook returns 401 | token mismatch | align `SHIPROCKET_WEBHOOK_TOKEN` |
| Status stuck at "Packed" | webhook not enabled / not reaching | enable; test with curl; use **Sync tracking** |
| "Undelivered" shows as On its way | by design (not delivered) | wait; courier re-attempts |
| Address errors from Shiprocket | invalid phone/PIN/state spelling | edit in Shiprocket panel; ask customer |
| Duplicate order id error | order already exists in Shiprocket | the retry finds it? If not: cancel duplicate in panel; see events |

## 4 · Cancellation problems
| Symptom | Cause | Fix |
|---|---|---|
| Customer cancel shows "We could not cancel the courier booking automatically" | Shiprocket cancel failed (already picked up / API error) | event `CANCEL_BLOCKED` is on the order. Cancel in Shiprocket panel; then Admin → **Cancel order**. If parcel already picked up, treat as RTO |
| Order cancelled but stock didn't return | restock only once per order; check `stock_movements where ref='LT…'` | if missing: Admin → add stock back with note |
| Cancelled, no refund | refund failed → `REFUND_FAILED` event | Admin (owner) → **Refund**; or Razorpay dashboard |
| Customer can't see Cancel button | status past pickup / `none` policy | by design; return flow after delivery |
| Coupon not released | coupon code missing on order | adjust `used_count` manually if needed |
Check restock: `select variant_id,delta,reason from stock_movements where ref='LT…'` (sale then cancel_restock).

## 5 · Returns & RTO
| Symptom | Fix |
|---|---|
| Customer cannot request return | status not DELIVERED, or >7 days since `delivered_at` (policy) – owner can still handle manually in Shiprocket |
| `delivered_at` empty | delivered via manual change; set via SQL: `update orders set delivered_at=now() where id='LT…'` |
| Return approved but no reverse pickup | create it in **Shiprocket → Orders → Returns** (not automated yet) |
| "Goods received → refund" fails | owner role needed; refund error shown at top (see payment guide §5) |
| RTO (returned to origin) | status becomes RTO automatically from courier updates; stock is restocked (`return_restock`); refund prepaid manually if you agree |
| Return rejected but customer already shipped | contact customer; Admin note; re-open as new return if accepted |

## 6 · COD specifics
COD orders are `COD_CONFIRMED` → shipment as Prepaid? No – sent with `payment_method: COD` and the order total as collectible. Remittance arrives from Shiprocket on its cycle; reconcile against **Shiprocket → Billing → COD remittance**. RTO COD orders cost you freight both ways (enter courier cost on the order so reports show the loss).
