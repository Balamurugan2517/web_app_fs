[**fashion-store**](../../../../README.md)

***

[fashion-store](../../../../README.md) / [lib/orders/service](../README.md) / confirmPrepaidPayment

# Function: confirmPrepaidPayment()

> **confirmPrepaidPayment**(`args`): `Promise`\<[`Order`](../../../../types/order/interfaces/Order.md) \| `undefined`\>

Defined in: work/fashion-store/src/lib/orders/service.ts:94

Called by BOTH the browser-verify route and the Razorpay webhook. Either (or both) may arrive, so it is idempotent:
confirming an already-paid order is a harmless no-op. A payment that arrives for an order we already cancelled is refunded.

## Parameters

### args

#### method?

`string`

#### paymentId

`string`

#### razorpayOrderId

`string`

#### source

`"verify"` \| `"webhook"`

## Returns

`Promise`\<[`Order`](../../../../types/order/interfaces/Order.md) \| `undefined`\>
