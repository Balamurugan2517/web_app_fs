[**fashion-store**](../../../../README.md)

***

[fashion-store](../../../../README.md) / [lib/repos/catalog](../README.md) / bulkSale

# Function: bulkSale()

> **bulkSale**(`f`): `Promise`\<`number`\>

Defined in: work/fashion-store/src/lib/repos/catalog.ts:210

Puts every matching product on sale at `percent` off its normal price (rounded to whole rupees), between two dates.

## Parameters

### f

#### category?

`string`

#### department?

[`Department`](../../../../types/product/type-aliases/Department.md)

#### endsAt

`string` \| `null`

#### percent

`number`

#### startsAt

`string` \| `null`

## Returns

`Promise`\<`number`\>
