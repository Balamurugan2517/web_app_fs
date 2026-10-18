# Internal 13 · Order Cancellation & Returns – Design and Flow

| | |
|---|---|
| **Audience** | INTERNAL – developers, support |
| **Code** | `lib/cancellation.ts` (rules) · `lib/orders/service.ts` (`cancelOrder`, `refundOrder`, `requestReturn`, `decideReturn`, `expireStaleOrders`) · `OrderActions.tsx` · `/api/orders/cancel` · admin order & returns pages |

![Cancellation flow](../images/09-cancellation-flow.png)

## 1 · Policy table (one source of truth: `cancellationPolicy`)
| Order status | Mode | What the customer sees | What happens |
|---|---|---|---|
| Awaiting payment / payment failed | **instant** | "You can cancel this order now." | CANCELLED · restock · release coupon · no refund |
| COD confirmed (not shipped) | **instant** | same | same |
| Paid (not shipped) | **refund** | "…payment will be refunded to the original method" | CANCELLED · restock · coupon · **Razorpay refund (full)** · e-mail |
| Shipment created (not picked up) | **cancel-shipment** | "parcel not picked up – we can still cancel" | **Shiprocket cancel first** → then as above |
| On its way | none | "request a return after delivery" | – |
| Delivered ≤ 7 days | **return** | "request a return within 7 days" | RETURN_REQUESTED + admin workflow |
| Delivered > 7 days / other | none | window closed | – |
Return window constant: `RETURN_WINDOW_DAYS = 7` (`cancellation.ts`).

## 2 · Order of operations (cancel)
1. Check policy (reject politely if not allowed).
2. If `cancel-shipment`: call Shiprocket cancel. **If it fails → stop**, keep the order unchanged, store `CANCEL_BLOCKED` event, tell the customer "our team will cancel it shortly" (no half-cancelled state).
3. `updateOrder` (row lock): status → CANCELLED via the state machine; store reason/time.
4. `restockOrder` – returns stock; **idempotent** (only once per order, via `stock_movements`).
5. Release coupon use.
6. If prepaid & captured → `refundOrder` (see §4). Refund failure is logged (`REFUND_FAILED`) and the order stays cancelled; owner retries.
7. Queue `order_cancelled` message; write `audit_log`.

## 3 · Edge cases
| Case | Handling |
|---|---|
| Customer abandons payment | cron expiry cancels after 30 min, restocks, releases coupon |
| Pays **after** expiry/cancel | `confirmPrepaidPayment` sees CANCELLED → records `LATE_PAYMENT` → auto-refund |
| Double click on Cancel | second call finds status CANCELLED → "can no longer be cancelled" |
| Cancel and webhook race | row lock + state machine → one wins; late "failed" cannot undo "paid" |
| Parcel picked up just now | Shiprocket rejects cancel → `CANCEL_BLOCKED`; owner handles as RTO/return |
| Partial refunds | owner can refund any amount ≤ remaining; status PARTIALLY_REFUNDED |
| COD order cancelled | no money; cancels shipment if booked |
| Refund to a closed account | Razorpay returns failure → manual follow-up |

## 4 · Refund rules (`refundOrder`)
Only PREPAID with captured payment; amount default = remaining; must be `0 < amount ≤ total − refunded`; calls Razorpay refund API (`speed: normal`); records `refunds` row + order event + `refunded_amount`; payment status becomes REFUNDED or PARTIALLY_REFUNDED; sends `refund_processed`. **Owner role** required for manual refunds.

## 5 · Returns
![Returns flow](../images/15-returns-flow.png)
1. Customer: order page → **Request a return** + reason → status `RETURN_REQUESTED`, row in `return_requests`.
2. Admin → Returns: **Approve** (e-mail) or **Reject** (order back to DELIVERED, e-mail with note).
3. After approval, create the **reverse pickup in Shiprocket** (manual) and wait for the parcel.
4. **Goods received → refund** (owner): status RETURNED · restock (`return_restock`) · refund (default full, or a partial amount if damaged) · return marked `refunded`.
RTO (courier returns an undelivered parcel): status RTO from courier updates, stock restocked automatically; refund prepaid manually if agreed.

## 6 · Customer communication
Cancelled · refund processed · return approved/rejected – via the outbox (see [Internal 12](Internal_12_Notifications_and_Marketing_Design.md)).

## 7 · Policy pages must match
`/policies/refund-and-cancellation-policy` and `shipping-policy` should state the same 7-day window and refund timelines. Change the constant and the text together.

## 8 · Tests
Unit: `cancellationPolicy` for every status, return window edges, state transitions. Provider checklist items 4, 8, 9, 14 in [Internal 11](Internal_11_Test_Strategy_and_Test_Plan.md).
