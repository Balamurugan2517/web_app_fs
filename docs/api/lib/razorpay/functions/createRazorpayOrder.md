[**fashion-store**](../../../README.md)

***

[fashion-store](../../../README.md) / [lib/razorpay](../README.md) / createRazorpayOrder

# Function: createRazorpayOrder()

> **createRazorpayOrder**(`input`): `Promise`\<[`RazorpayOrder`](../interfaces/RazorpayOrder.md)\>

Defined in: work/fashion-store/src/lib/razorpay.ts:15

Step 1 of paying: ask Razorpay to create an "order" for an amount we calculated ourselves.
The browser then opens Razorpay Checkout for that order id.

## Parameters

### input

#### amountRupees

`number`

#### notes?

`Record`\<`string`, `string`\>

#### receipt

`string`

## Returns

`Promise`\<[`RazorpayOrder`](../interfaces/RazorpayOrder.md)\>
