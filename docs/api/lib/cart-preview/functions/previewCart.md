[**fashion-store**](../../../README.md)

***

[fashion-store](../../../README.md) / [lib/cart-preview](../README.md) / previewCart

# Function: previewCart()

> **previewCart**(`lines`, `couponCode`): `Promise`\<[`CartPreview`](../interfaces/CartPreview.md)\>

Defined in: work/fashion-store/src/lib/cart-preview.ts:19

What the bag should show: fresh prices, sale prices, stock problems and the coupon – decided by the server. Never throws for bad lines.

## Parameters

### lines

[`CartLine`](../../pricing/interfaces/CartLine.md)[]

### couponCode

`string`

## Returns

`Promise`\<[`CartPreview`](../interfaces/CartPreview.md)\>
