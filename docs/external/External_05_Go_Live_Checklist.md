# External 05 · Go-Live Checklist

| | |
|---|---|
| **Audience** | EXTERNAL – owner with your technical partner |
| **Rule** | The software does not change between test and live – only accounts and values do. |

![Test to live](../images/08-test-to-live.png)

## A · Paperwork (start early – takes days)
- [ ] Business registration, PAN, bank account in the business name
- [ ] GST registration and your CA's confirmation of **GST rate and HSN code for each product**
- [ ] Domain bought; DNS access available
- [ ] **Razorpay KYC** approved; **Shiprocket KYC** approved; wallet recharged; pickup address verified; API user created
- [ ] Business e-mail (support@…); e-mail sending set up (SPF/DKIM)
- [ ] Two-factor login on every account

## B · Content
- [ ] Real **photos** for every product (4:5 portrait, under 300 KB)
- [ ] Prices, **MRP**, **cost price**, weights and sizes entered for every product
- [ ] Business details (legal name, address, phone, GSTIN, grievance officer) in the site settings
- [ ] Policy pages (Privacy, Terms, Shipping, Refund & Cancellation, Contact) **reviewed by a lawyer**; About Us written
- [ ] Packing-box size and product weights measured
- [ ] Delete demo products; remove demo coupon if not needed

## C · Technical (your partner ticks these)
- [ ] Server, HTTPS, database, cron jobs and **backups** running; one **restore drill** passed
- [ ] Live Razorpay keys + **new live webhook**; live Shiprocket webhook; secrets are new
- [ ] E-mail sends from your domain; SMS/WhatsApp only after approvals
- [ ] Health check list completed
- [ ] Monitoring/alerts on

## D · Live rehearsal (use a real small amount)
1. [ ] Add a ₹10 test product (hidden from the menu or deleted afterwards).
2. [ ] Pay online → order *Paid* → shipment visible in Shiprocket (cancel it there) → e-mail received.
3. [ ] **Cancel** the order from the customer page → refund arrives; stock returns.
4. [ ] COD order (if enabled) → cancel.
5. [ ] Check one real PIN code on a product page.
6. [ ] Remove the test product.

## E · First week
- [ ] Dashboard morning check; Razorpay vs portal match every day
- [ ] Watch for failed messages and shipping errors
- [ ] Tell your partner about anything confusing

## F · Rollback plan
If payments misbehave on day one: your partner removes the online-payment keys (checkout then says payment is not configured) or puts up a maintenance page; the problem is fixed on the test setup; then re-released. Orders already taken stay safe in the database and in Razorpay.
