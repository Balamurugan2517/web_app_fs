import { getAdmin } from '@/lib/admin-auth';
import { toCsv } from '@/lib/csv';
import { PRODUCT_CSV_TEMPLATE } from '@/lib/catalog-import';
import { addDays, isDateString, istRange, presetRange } from '@/lib/dates';
import { getEnv } from '@/lib/env';
import { PROFIT_COLUMNS, buildProfitLoss, totalsOf, type Granularity } from '@/lib/reports';
import { audit, expenseRows, listCustomers } from '@/lib/repos/admin';
import { stockReport } from '@/lib/repos/catalog';
import { listOrders, salesRows } from '@/lib/repos/orders';

const csv = (name: string, body: string) => new Response('\uFEFF' + body, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${name}"`, 'Cache-Control': 'no-store' } });
const OWNER_ONLY = new Set(['profit-csv', 'sales-csv', 'customers-csv']);

/** CSV downloads for the owner/staff. Each request re-checks the admin session (downloads are not protected by the page). */
export async function GET(request: Request, ctx: { params: Promise<{ report: string }> }) {
  const admin = await getAdmin();
  const { report } = await ctx.params;
  if (!admin) return new Response('Please sign in at /admin/login', { status: 401 });
  if (OWNER_ONLY.has(report) && admin.role !== 'owner') return new Response('Owner access only', { status: 403 });
  const url = new URL(request.url);
  const from = url.searchParams.get('from') ?? undefined; const to = url.searchParams.get('to') ?? undefined;
  const range = isDateString(from) && isDateString(to) && from <= to ? istRange(from, to) : presetRange('month');
  await audit(admin.email, 'download', 'report', report, { from: range.from, to: range.to });

  switch (report) {
    case 'product-template': return csv('products-template.csv', PRODUCT_CSV_TEMPLATE);
    case 'stock-template': return csv('stock-refill-template.csv', 'variant_sku,add_qty,note\r\nLT-KMB-002-M,10,Supplier delivery\r\n');
    case 'stock-csv': {
      const rows = await stockReport();
      return csv('stock-report.csv', toCsv([{ key: 'sku', label: 'Variant SKU' }, { key: 'product', label: 'Product' }, { key: 'size', label: 'Size' }, { key: 'stock', label: 'In stock' }, { key: 'threshold', label: 'Alert at' }, ...(admin.role === 'owner' ? [{ key: 'costValue', label: 'Value at cost' }, { key: 'sellValue', label: 'Value at selling price' }] : []), { key: 'department', label: 'Department' }, { key: 'category', label: 'Category' }], rows as never));
    }
    case 'orders-csv': {
      const orders = await listOrders({ from: range.fromIso, to: range.toIso, limit: 500 });
      return csv('orders.csv', toCsv([{ key: 'id', label: 'Order' }, { key: 'at', label: 'Placed' }, { key: 'status', label: 'Status' }, { key: 'name', label: 'Customer' }, { key: 'city', label: 'City' }, { key: 'state', label: 'State' }, { key: 'pincode', label: 'PIN' }, { key: 'method', label: 'Payment' }, { key: 'total', label: 'Total' }, { key: 'awb', label: 'Tracking no.' }],
        orders.map((o) => ({ id: o.id, at: o.createdAt, status: o.status, name: o.customer.name, city: o.address.city, state: o.address.state, pincode: o.address.pincode, method: o.paymentMethod, total: o.totals.total, awb: o.shipment.awb ?? '' }))));
    }
    case 'sales-csv': {
      const rows = await salesRows(range.fromIso, range.toIso);
      return csv(`sales-${range.from}-to-${range.to}.csv`, toCsv([{ key: 'orderId', label: 'Order' }, { key: 'at', label: 'Placed' }, { key: 'status', label: 'Status' }, { key: 'paymentMethod', label: 'Payment' }, { key: 'units', label: 'Units' }, { key: 'total', label: 'Total' }, { key: 'discount', label: 'Coupon discount' }, { key: 'gst', label: 'GST included' }, { key: 'cogs', label: 'Cost of goods' }, { key: 'shippingCost', label: 'Courier cost' }, { key: 'refunded', label: 'Refunded' }], rows as never));
    }
    case 'profit-csv': {
      const by = (['day', 'month', 'year'] as const).find((g) => g === url.searchParams.get('by')) as Granularity | undefined ?? 'month';
      const [sales, exp] = await Promise.all([salesRows(range.fromIso, range.toIso), expenseRows(range.from, addDays(range.to, 1))]);
      const rows = buildProfitLoss(sales, exp, by, { gatewayFeePercent: getEnv().PAYMENT_FEE_PERCENT });
      return csv(`profit-loss-${by}-${range.from}-to-${range.to}.csv`, toCsv(PROFIT_COLUMNS, [...rows, totalsOf(rows)] as never));
    }
    case 'customers-csv': {
      const rows = await listCustomers({ limit: 5000 });
      return csv('customers.csv', toCsv([{ key: 'name', label: 'Name' }, { key: 'email', label: 'E-mail' }, { key: 'phone', label: 'Phone' }, { key: 'ordersCount', label: 'Orders' }, { key: 'totalSpent', label: 'Total spent' }, { key: 'emailOptIn', label: 'OK to e-mail offers' }, { key: 'smsOptIn', label: 'OK to SMS offers' }, { key: 'whatsappOptIn', label: 'OK to WhatsApp' }], rows as never));
    }
    default: return new Response('Unknown report', { status: 404 });
  }
}
