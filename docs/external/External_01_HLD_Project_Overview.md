# External 01 · High-Level Design – Project Overview

| | |
|---|---|
| **Audience** | EXTERNAL – the shop owner and stakeholders |
| **Product** | Luxe & Thread online fashion store for India |
| **Version** | 2.0 · October 2026 |

## 1. What you are getting
A complete online fashion shop for **women, men and kids** with a private **admin portal** for running the business day to day.

| For your customers | For you (owner / staff) |
|---|---|
| Browse by Women / Men / Kids, search, filters, sale prices | Add products, photos and sizes; change prices; run sales and coupons |
| Indian size guide, live stock per size | Receive stock, fix stock counts, upload stock by CSV |
| Pay by UPI, cards, net banking (Razorpay) or Cash on Delivery | See orders, send them to the courier with one click |
| Track the order, get e-mail/SMS/WhatsApp updates | Sales, profit & loss by day / month / year, downloadable |
| Cancel an order or request a return online | Approve returns, refund customers |
| Free delivery across India (PIN-code check) | Send offers to customers who agreed to receive them |

## 2. The big picture
![System architecture](../images/01-architecture-blocks.png)

| Part | What it does (plain English) |
|---|---|
| **Website + admin** | One application: the shop customers see and the private portal you use |
| **Database (PostgreSQL)** | The shop's memory: products, stock, orders, customers. Open source and free |
| **Razorpay** | Takes the money safely. Card details never touch your website |
| **Shiprocket** | Books the courier, gives a tracking number, reports delivery |
| **Messages** | E-mail (always), SMS and WhatsApp (optional) |
| **Backups** | A copy of everything every night, kept safe, with a monthly "can we really restore it?" test |

## 3. The journey of an order
![Checkout sequence](../images/03-checkout-sequence.png)

1. The customer chooses a size and adds to the bag – the **website checks the real price and stock**.
2. They pay on Razorpay's secure page.
3. The website confirms the payment two ways (browser *and* Razorpay's own call) so no paid order is ever lost.
4. The order goes to Shiprocket; a courier collects it; the customer is told at every step.
5. You see everything in the admin portal.

## 4. Order stages
![Order stages](../images/04-order-states.png)

## 5. What is included
Storefront · admin portal (products, stock, inventory, coupons, orders, returns, customers, expenses, reports, messages, activity log) · payments · shipping · notifications · cancellation & returns · backups · documentation · automated tests.

## 6. What you need to provide
Business details (name, address, GSTIN), Razorpay and Shiprocket accounts with KYC, real product photos, your GST rates (from your CA), policy texts reviewed by a lawyer, a domain name, and a server (guide provided).

## 7. Responsibilities
| You | Your technical partner |
|---|---|
| Packing, handing parcels to the courier, customer replies, price & stock decisions | Hosting, updates, backups checks, security, new features |

## 8. Honest limits of this version
Product photos supplied are placeholders · GST invoice PDFs and wishlist/reviews are not included yet · SMS and WhatsApp need provider approvals (TRAI/DLT, Meta templates) before they can be switched on · single-server hosting (very suitable for a growing boutique; scale-out path documented).

## 9. Documents for you
[Admin Portal Guide](External_02_Admin_Portal_Guide.md) · [Admin Dashboard & Reports Guide](External_03_Admin_Dashboard_and_Reports_Guide.md) · [Customer Handover](External_04_Customer_Handover.md) · [Go-Live Checklist](External_05_Go_Live_Checklist.md)
