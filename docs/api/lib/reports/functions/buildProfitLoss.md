[**fashion-store**](../../../README.md)

***

[fashion-store](../../../README.md) / [lib/reports](../README.md) / buildProfitLoss

# Function: buildProfitLoss()

> **buildProfitLoss**(`sales`, `expenses`, `g`, `opts`): [`PeriodRow`](../interfaces/PeriodRow.md)[]

Defined in: work/fashion-store/src/lib/reports.ts:42

Profit & loss by day / month / year.
  Net profit = (sales after refunds, without GST) − cost of goods − payment-gateway fees − courier cost − expenses
Orders that were cancelled / unpaid are ignored. Returned-to-origin orders count as fully refunded.

## Parameters

### sales

[`SaleRow`](../interfaces/SaleRow.md)[]

### expenses

[`ExpenseRow`](../interfaces/ExpenseRow.md)[]

### g

[`Granularity`](../type-aliases/Granularity.md)

### opts

#### gatewayFeePercent

`number`

## Returns

[`PeriodRow`](../interfaces/PeriodRow.md)[]
