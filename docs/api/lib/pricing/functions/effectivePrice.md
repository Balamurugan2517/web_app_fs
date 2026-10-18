[**fashion-store**](../../../README.md)

***

[fashion-store](../../../README.md) / [lib/pricing](../README.md) / effectivePrice

# Function: effectivePrice()

> **effectivePrice**(`p`, `now`): `object`

Defined in: work/fashion-store/src/lib/pricing.ts:23

The price a customer pays today, and how much "off" it looks compared with the MRP.

## Parameters

### p

`Pick`\<[`Product`](../../../types/product/interfaces/Product.md), `"mrp"` \| `"price"` \| `"salePrice"` \| `"saleStartsAt"` \| `"saleEndsAt"`\>

### now

`Date`

## Returns

`object`

### onSale

> **onSale**: `boolean`

### percentOff

> **percentOff**: `number`

### price

> **price**: `number`
