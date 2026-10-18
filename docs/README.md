# Luxe & Thread – Documentation

Every document exists as **Markdown** (`docs/internal`, `docs/external`) and as **PDF** (`docs/pdf`). Names start with **Internal** (for developers) or **External** (for the customer).

## External – for the shop owner
| Document | Purpose |
|---|---|
| [External 01 · HLD – Project Overview](external/External_01_HLD_Project_Overview.md) | what the system is and how it works, in plain language |
| [External 02 · Admin Portal Guide](external/External_02_Admin_Portal_Guide.md) | every feature with screenshots; **add stock, change price, discounts, out of stock** |
| [External 03 · Admin Dashboard & Reports Guide](external/External_03_Admin_Dashboard_and_Reports_Guide.md) | sales, profit & loss by day/month/year, stock, downloads |
| [External 04 · Customer Handover](external/External_04_Customer_Handover.md) | what is delivered, acceptance tests, responsibilities |
| [External 05 · Go-Live Checklist](external/External_05_Go_Live_Checklist.md) | test → live |

## Internal – for developers and operations
| Document | Purpose |
|---|---|
| [Internal 01 · Requirements Review & Gap Fixes](internal/Internal_01_Requirements_Review_and_Gap_Fixes.md) | each requirement: status, fix, next steps |
| [Internal 02 · LLD](internal/Internal_02_LLD_Low_Level_Design.md) | architecture, diagrams, flows, tools & versions |
| [Internal 03 · Database Design](internal/Internal_03_Database_Design.md) | all tables, keys, examples, queries |
| [Internal 04 · Razorpay / Shiprocket / Platform Config](internal/Internal_04_Razorpay_Shiprocket_Config_Guide.md) | values for test and live + validation commands |
| [Internal 05 · Troubleshooting – Application](internal/Internal_05_Troubleshooting_Application.md) | overall |
| [Internal 06 · Troubleshooting – Payments](internal/Internal_06_Troubleshooting_Payments.md) | payments & refunds |
| [Internal 07 · Troubleshooting – Shipping & Returns](internal/Internal_07_Troubleshooting_Shipping_and_Returns.md) | shipping, cancellation, returns |
| [Internal 08 · Post-Deployment Health Check](internal/Internal_08_Post_Deployment_Health_Check_Guide.md) | HC lists |
| [Internal 09 · MOP – New Joiner Training](internal/Internal_09_MOP_New_Joiner_Training.md) | step-by-step procedures with explained commands |
| [Internal 10 · Database Backup & Restore](internal/Internal_10_Database_Backup_and_Restore.md) | manual/automatic, restore, validation |
| [Internal 11 · Test Strategy & Plan](internal/Internal_11_Test_Strategy_and_Test_Plan.md) | all test levels |
| [Internal 12 · Notifications & Marketing](internal/Internal_12_Notifications_and_Marketing_Design.md) | e-mail/SMS/WhatsApp, consent |
| [Internal 13 · Cancellation & Returns](internal/Internal_13_Order_Cancellation_and_Returns_Design.md) | design and flow |
| [Internal 14 · Security & Compliance](internal/Internal_14_Security_and_Compliance.md) | |
| [Internal 15 · Deployment Guide](internal/Internal_15_Deployment_Guide.md) | AWS EC2 + PostgreSQL |
| [Internal 16 · Error Handling](internal/Internal_16_Error_Handling.md) | |

`docs/api/` – generated API reference (`npm run docs`). `docs/screenshots/` – admin screens (illustrative; regenerate real ones with `node scripts/capture-screenshots.mjs`). `docs/images/` – diagrams.

**Beginner reading order:** External 01 → Internal 02 → Internal 03 → Internal 09 (practise) → Internal 05–08 when something breaks.
