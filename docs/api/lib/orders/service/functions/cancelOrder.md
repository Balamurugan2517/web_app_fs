[**fashion-store**](../../../../README.md)

***

[fashion-store](../../../../README.md) / [lib/orders/service](../README.md) / cancelOrder

# Function: cancelOrder()

> **cancelOrder**(`orderId`, `reason`, `actor`, `opts?`): `Promise`\<[`Order`](../../../../types/order/interfaces/Order.md)\>

Defined in: work/fashion-store/src/lib/orders/service.ts:218

Cancels an order according to cancellationPolicy(): put stock back, release the coupon, cancel the courier booking if needed,
and refund any online payment. `actor` is "customer" or an admin e-mail.

## Parameters

### orderId

`string`

### reason

`string`

### actor

`string`

### opts?

#### silent?

`boolean`

## Returns

`Promise`\<[`Order`](../../../../types/order/interfaces/Order.md)\>
