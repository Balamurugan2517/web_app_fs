# External 04 · Customer Handover Document

| | |
|---|---|
| **Project** | Luxe & Thread – fashion e-commerce for India |
| **Version** | 2.0.0 |
| **Delivered to** | [CUSTOMER NAME] |
| **Delivered by** | [YOUR NAME / COMPANY] |
| **Date** | [DD-MM-YYYY] |

## 1 · Summary
A complete online fashion shop for women, men and kids with online payment (Razorpay), courier booking and tracking (Shiprocket), automatic customer messages, cancellations and returns, an admin portal with stock, discounts, coupons, customers, reports and profit & loss, plus documentation and automated tests. Overview: [External 01](External_01_HLD_Project_Overview.md).

## 2 · What is delivered
| # | Item | Where |
|---|---|---|
| 1 | Source code (Next.js 16, React 19, TypeScript, PostgreSQL 16) | Git repository |
| 2 | Database schema + demo data | `db/` |
| 3 | Admin portal and storefront | the website |
| 4 | Documentation – *internal* (developers) and *external* (you) | `docs/` – Markdown and PDF |
| 5 | Automated tests (unit, integration, end-to-end, load) | `src/lib/__tests__`, `tests/` |

## 3 · Features
| Area | Included |
|---|---|
| Storefront | Women / Men / Kids / New / Sale / About / Contact, search, filters, sort, sale prices, photo gallery, Indian size guide, live stock per size, PIN-code delivery check |
| Bag & checkout | prices and stock verified by the server, coupons, Indian address form, UPI/cards/net banking, Cash on Delivery (switchable), marketing consent boxes (un-ticked) |
| Orders | tracking page for customers, cancel / return requests, automatic refunds, e-mail (and optional SMS/WhatsApp) updates |
| Admin | products, sizes, stock receive & stock-take, CSV import, photos, discounts & festival sales, coupons, orders, shipments, refunds, returns, customers & campaigns, expenses, reports, activity log |
| Operations | health check, backups with restore procedure, background jobs, security headers, rate limits, audit log |

## 4 · Accounts & ownership (complete at handover)
| Account | Owner / login e-mail | 2-factor on | Notes |
|---|---|---|---|
| Domain & DNS | | ☐ | |
| Cloud server (AWS) | | ☐ | |
| GitHub repository | | ☐ | customer is *owner* |
| Razorpay | | ☐ | live keys with customer |
| Shiprocket | | ☐ | API user created |
| E-mail/SMTP | | ☐ | |
| Backup bucket (S3) | | ☐ | |
| Admin portal users | | – | one login per person |
Credentials are shared only through a password manager – never by chat or e-mail.

## 5 · Verification status – honest summary
| Check | Status |
|---|---|
| Strict TypeScript check of the whole project | ✅ passes |
| Code-quality check (ESLint) | ✅ passes |
| 23 automated tests of business rules | ✅ pass |
| Production build, PostgreSQL integration tests, browser tests, load tests | ⏳ to be run on the delivery server – procedures in the test plan |
| Razorpay test payments, Shiprocket booking, e-mail delivery | ⏳ to be run with your accounts in TEST mode |
| Live payments | ⏳ after KYC and the [Go-Live Checklist](External_05_Go_Live_Checklist.md) |
Screens in the Admin Guide use sample data.

## 6 · Acceptance checklist
| # | Test | Pass | Initials |
|---|---|---|---|
| 1 | Shop opens on your domain over HTTPS; Women/Men/Kids work | ☐ | |
| 2 | Size guide shows Indian charts; sold-out sizes cannot be chosen | ☐ | |
| 3 | Add to bag, change quantity, apply a coupon | ☐ | |
| 4 | Checkout rejects wrong phone/PIN with clear messages | ☐ | |
| 5 | Test-card payment succeeds → order *Paid*; e-mail received | ☐ | |
| 6 | Failed payment → friendly message, bag kept | ☐ | |
| 7 | Close the tab after paying → order still becomes *Paid* | ☐ | |
| 8 | Shipment appears in Shiprocket; tracking number saved | ☐ | |
| 9 | Courier status updates the order; delivered e-mail sent | ☐ | |
| 10 | Customer cancels a paid order → refund + stock back | ☐ | |
| 11 | Return request → approve → goods received → refund | ☐ | |
| 12 | Admin: add product, receive stock, discount, mark out of stock | ☐ | |
| 13 | CSV import of products and stock refill work | ☐ | |
| 14 | Reports show correct day/month/year numbers; CSV downloads open | ☐ | |
| 15 | Campaign reaches only opted-in customers; unsubscribe works | ☐ | |
| 16 | Backup ran last night; a restore drill was done | ☐ | |
| 17 | Policy pages show your real business details | ☐ | |
| 18 | One real small payment on LIVE and refund | ☐ | |

## 7 · Responsibilities after handover
| Task | Who | How often |
|---|---|---|
| Pack and hand over parcels, reply to customers | You | daily |
| Dashboard check, ship, returns, stock | You | daily |
| Update stock, prices, discounts, photos | You | as needed |
| Recharge Shiprocket wallet, reconcile Razorpay | You | weekly |
| Health checks, backups check, security updates | Technical partner | daily/weekly/monthly |
| New features, fixes, deployments | Technical partner | as agreed |
| GST, accounts, legal pages | Your CA / lawyer | as needed |

## 8 · Known limitations
GST invoice PDFs not included · wishlist/reviews not included · photos supplied are placeholders · SMS and WhatsApp need TRAI/DLT and Meta approvals · one-server hosting · Shiprocket return pickups are created in its panel.

## 9 · Support & warranty
[Define warranty period, response times, scope (bug fixes vs new features), contact.]

## 10 · Change log
| Version | Date | Changes |
|---|---|---|
| 2.0.0 | [date] | Women/Men/Kids navigation, size system, PostgreSQL, inventory, discounts & coupons, admin portal, reports & P&L, notifications, cancellation & returns, customers & campaigns, full documentation |
| 1.0.0 | | First storefront with cart, Razorpay, Shiprocket |

## 11 · Sign-off
| | Name | Signature | Date |
|---|---|---|---|
| Delivered by | | | |
| Accepted by | | | |
