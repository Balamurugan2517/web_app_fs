[**fashion-store**](../../../README.md)

***

[fashion-store](../../../README.md) / [lib/razorpay](../README.md) / verifyPaymentSignature

# Function: verifyPaymentSignature()

> **verifyPaymentSignature**(`args`): `boolean`

Defined in: work/fashion-store/src/lib/razorpay.ts:37

Razorpay signs `order_id|payment_id` with your key SECRET. We recompute and compare.

## Parameters

### args

#### orderId

`string`

#### paymentId

`string`

#### secret

`string`

#### signature

`string`

## Returns

`boolean`
