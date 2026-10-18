[**fashion-store**](../../../../README.md)

***

[fashion-store](../../../../README.md) / [lib/repos/catalog](../README.md) / upsertProduct

# Function: upsertProduct()

> **upsertProduct**(`p`, `sizes`, `images`, `actor`): `Promise`\<\{ `created`: `boolean`; `id`: `string`; \}\>

Defined in: work/fashion-store/src/lib/repos/catalog.ts:105

Creates or updates a product by SKU. Size/stock rows are only ADDED for new sizes; existing stock is never overwritten here.

## Parameters

### p

[`ProductWrite`](../interfaces/ProductWrite.md)

### sizes

`object`[]

### images

`string`[]

### actor

`string`

## Returns

`Promise`\<\{ `created`: `boolean`; `id`: `string`; \}\>
