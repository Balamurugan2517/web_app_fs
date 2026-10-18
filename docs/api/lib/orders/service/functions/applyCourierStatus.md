[**fashion-store**](../../../../README.md)

***

[fashion-store](../../../../README.md) / [lib/orders/service](../README.md) / applyCourierStatus

# Function: applyCourierStatus()

> **applyCourierStatus**(`orderId`, `text`, `extra?`): `Promise`\<[`Order`](../../../../types/order/interfaces/Order.md) \| `undefined`\>

Defined in: work/fashion-store/src/lib/orders/service.ts:156

Applies a courier status (webhook or manual sync) to the order and tells the customer about the important changes.

## Parameters

### orderId

`string`

### text

`string` \| `undefined`

### extra?

#### awb?

`string`

#### courier?

`string`

## Returns

`Promise`\<[`Order`](../../../../types/order/interfaces/Order.md) \| `undefined`\>
