[**fashion-store**](../../../../README.md)

***

[fashion-store](../../../../README.md) / [lib/orders/service](../README.md) / refundOrder

# Function: refundOrder()

> **refundOrder**(`orderId`, `amount`, `reason`, `actor`): `Promise`\<[`Order`](../../../../types/order/interfaces/Order.md)\>

Defined in: work/fashion-store/src/lib/orders/service.ts:187

Refunds a captured Razorpay payment (default = everything not yet refunded). Records every attempt.

## Parameters

### orderId

`string`

### amount

`number` \| `undefined`

### reason

`string`

### actor

`string`

## Returns

`Promise`\<[`Order`](../../../../types/order/interfaces/Order.md)\>
