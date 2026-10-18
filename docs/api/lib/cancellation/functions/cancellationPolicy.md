[**fashion-store**](../../../README.md)

***

[fashion-store](../../../README.md) / [lib/cancellation](../README.md) / cancellationPolicy

# Function: cancellationPolicy()

> **cancellationPolicy**(`order`, `now`, `windowDays?`): `object`

Defined in: work/fashion-store/src/lib/cancellation.ts:15

## Parameters

### order

`Pick`\<[`Order`](../../../types/order/interfaces/Order.md), `"status"` \| `"shipment"`\>

### now

`Date`

### windowDays?

`number` = `RETURN_WINDOW_DAYS`

## Returns

`object`

### message

> **message**: `string`

### mode

> **mode**: [`CancelMode`](../type-aliases/CancelMode.md)
