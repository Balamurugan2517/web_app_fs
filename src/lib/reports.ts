import { SALE_STATUSES } from './orders/status';
import type { OrderStatus } from '../types/order';

export type Granularity = 'day' | 'month' | 'year';

export interface SaleRow {
  orderId: string;
  at: string;                 // ISO timestamp the order was placed
  status: OrderStatus;
  paymentMethod: 'PREPAID' | 'COD';
  units: number;
  total: number;              // what the customer paid, GST-inclusive
  discount: number;           // coupon discount given
  mrpTotal: number;           // value at MRP (to show sale discounts)
  gst: number;                // GST included in total
  cogs: number;               // cost of goods
  shippingCost: number;       // what the courier charged you
  refunded: number;
}
export interface ExpenseRow { on: string; category: string; amount: number }

export interface PeriodRow {
  period: string; orders: number; units: number; grossSales: number; discounts: number; refunds: number;
  netSales: number; gst: number; netSalesExGst: number; cogs: number; grossProfit: number;
  gatewayFees: number; shippingCost: number; expenses: number; netProfit: number;
}

const r2 = (n: number): number => Math.round(n * 100) / 100;
const ist = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });

/** "2026-10-16" / "2026-10" / "2026" for the INDIAN date of a timestamp (so a 11:30 pm order lands on the right day). */
export function periodKey(iso: string, g: Granularity): string {
  const day = ist.format(new Date(iso));
  return g === 'day' ? day : g === 'month' ? day.slice(0, 7) : day.slice(0, 4);
}

/**
 * Profit & loss by day / month / year.
 *   Net profit = (sales after refunds, without GST) − cost of goods − payment-gateway fees − courier cost − expenses
 * Orders that were cancelled / unpaid are ignored. Returned-to-origin orders count as fully refunded.
 */
export function buildProfitLoss(sales: SaleRow[], expenses: ExpenseRow[], g: Granularity, opts: { gatewayFeePercent: number }): PeriodRow[] {
  const map = new Map<string, PeriodRow>();
  const row = (p: string): PeriodRow => {
    let x = map.get(p);
    if (!x) { x = { period: p, orders: 0, units: 0, grossSales: 0, discounts: 0, refunds: 0, netSales: 0, gst: 0, netSalesExGst: 0, cogs: 0, grossProfit: 0, gatewayFees: 0, shippingCost: 0, expenses: 0, netProfit: 0 }; map.set(p, x); }
    return x;
  };
  for (const s of sales) {
    const counted = SALE_STATUSES.includes(s.status) || s.status === 'RTO' || s.status === 'RETURNED';
    if (!counted) continue;
    const p = row(periodKey(s.at, g));
    const refunded = s.status === 'RTO' || s.status === 'RETURNED' ? s.total : s.refunded;
    p.orders += 1; p.units += s.units; p.grossSales += s.total; p.discounts += s.discount; p.refunds += refunded;
    p.gst += s.total > 0 ? s.gst * ((s.total - refunded) / s.total) : 0;
    p.cogs += refunded >= s.total ? 0 : s.cogs;                // returned goods go back to stock
    p.gatewayFees += s.paymentMethod === 'PREPAID' ? (s.total * opts.gatewayFeePercent) / 100 : 0;
    p.shippingCost += s.shippingCost;
  }
  for (const e of expenses) row(periodKey(`${e.on}T12:00:00+05:30`, g)).expenses += e.amount;
  return [...map.values()].sort((a, b) => a.period.localeCompare(b.period)).map((p) => {
    const netSales = p.grossSales - p.refunds;
    const exGst = netSales - p.gst;
    const grossProfit = exGst - p.cogs;
    return { ...p, grossSales: r2(p.grossSales), discounts: r2(p.discounts), refunds: r2(p.refunds), netSales: r2(netSales), gst: r2(p.gst), netSalesExGst: r2(exGst),
      cogs: r2(p.cogs), grossProfit: r2(grossProfit), gatewayFees: r2(p.gatewayFees), shippingCost: r2(p.shippingCost), expenses: r2(p.expenses),
      netProfit: r2(grossProfit - p.gatewayFees - p.shippingCost - p.expenses) };
  });
}

export const totalsOf = (rows: PeriodRow[]): PeriodRow => rows.reduce((t, r) => ({
  period: 'TOTAL', orders: t.orders + r.orders, units: t.units + r.units, grossSales: r2(t.grossSales + r.grossSales), discounts: r2(t.discounts + r.discounts),
  refunds: r2(t.refunds + r.refunds), netSales: r2(t.netSales + r.netSales), gst: r2(t.gst + r.gst), netSalesExGst: r2(t.netSalesExGst + r.netSalesExGst),
  cogs: r2(t.cogs + r.cogs), grossProfit: r2(t.grossProfit + r.grossProfit), gatewayFees: r2(t.gatewayFees + r.gatewayFees),
  shippingCost: r2(t.shippingCost + r.shippingCost), expenses: r2(t.expenses + r.expenses), netProfit: r2(t.netProfit + r.netProfit),
}), { period: 'TOTAL', orders: 0, units: 0, grossSales: 0, discounts: 0, refunds: 0, netSales: 0, gst: 0, netSalesExGst: 0, cogs: 0, grossProfit: 0, gatewayFees: 0, shippingCost: 0, expenses: 0, netProfit: 0 });

export const PROFIT_COLUMNS = [
  { key: 'period', label: 'Period' }, { key: 'orders', label: 'Orders' }, { key: 'units', label: 'Units sold' },
  { key: 'grossSales', label: 'Gross sales (incl. GST)' }, { key: 'discounts', label: 'Coupon discounts' }, { key: 'refunds', label: 'Refunds / returns' },
  { key: 'netSales', label: 'Net sales (incl. GST)' }, { key: 'gst', label: 'GST included' }, { key: 'netSalesExGst', label: 'Net sales (excl. GST)' },
  { key: 'cogs', label: 'Cost of goods' }, { key: 'grossProfit', label: 'Gross profit' }, { key: 'gatewayFees', label: 'Payment fees (est.)' },
  { key: 'shippingCost', label: 'Courier cost' }, { key: 'expenses', label: 'Other expenses' }, { key: 'netProfit', label: 'Net profit / (loss)' },
];
