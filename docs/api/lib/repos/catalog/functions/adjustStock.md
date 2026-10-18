[**fashion-store**](../../../../README.md)

***

[fashion-store](../../../../README.md) / [lib/repos/catalog](../README.md) / adjustStock

# Function: adjustStock()

> **adjustStock**(`args`, `db?`): `Promise`\<`number`\>

Defined in: work/fashion-store/src/lib/repos/catalog.ts:137

Changes stock by `delta` (+ add, − remove). The database refuses to go below zero, so this can never oversell.

## Parameters

### args

#### actor

`string`

#### delta

`number`

#### note?

`string`

#### reason

[`StockReason`](../type-aliases/StockReason.md)

#### ref?

`string`

#### variantId?

`string`

#### variantSku?

`string`

### db?

[`Db`](../../../db/type-aliases/Db.md)

## Returns

`Promise`\<`number`\>
