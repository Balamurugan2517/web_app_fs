[**fashion-store**](../../../README.md)

***

[fashion-store](../../../README.md) / [lib/razorpay](../README.md) / refundRazorpayPayment

# Function: refundRazorpayPayment()

> **refundRazorpayPayment**(`input`): `Promise`\<\{ `id`: `string`; `status`: `string`; \}\>

Defined in: work/fashion-store/src/lib/razorpay.ts:50

Refunds a captured payment (full or partial). Razorpay processes it and the money reaches the customer in ~5–7 business days.
`receipt` makes the call safe to repeat: we pass our own order id in the notes.

## Parameters

### input

#### amountRupees

`number`

#### orderId

`string`

#### paymentId

`string`

#### reason

`string`

## Returns

`Promise`\<\{ `id`: `string`; `status`: `string`; \}\>
