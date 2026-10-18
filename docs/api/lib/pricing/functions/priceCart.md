[**fashion-store**](../../../README.md)

***

[fashion-store](../../../README.md) / [lib/pricing](../README.md) / priceCart

# Function: priceCart()

> **priceCart**(`lines`, `products`, `opts?`): [`PricedCart`](../interfaces/PricedCart.md)

Defined in: work/fashion-store/src/lib/pricing.ts:41

SERVER-SIDE PRICE AUTHORITY.
The browser says WHAT it wants (product, size, quantity). Prices, stock, sale, tax and coupon are decided here.
Pure function (no database): the caller passes the products and the coupon it already loaded.

## Parameters

### lines

[`CartLine`](../interfaces/CartLine.md)[]

### products

`Map`\<`string`, [`Product`](../../../types/product/interfaces/Product.md)\>

### opts?

#### coupon?

[`Coupon`](../../coupons/interfaces/Coupon.md) \| `null`

#### now?

`Date`

## Returns

[`PricedCart`](../interfaces/PricedCart.md)
