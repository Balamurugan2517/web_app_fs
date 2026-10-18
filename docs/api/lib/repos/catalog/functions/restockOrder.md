[**fashion-store**](../../../../README.md)

***

[fashion-store](../../../../README.md) / [lib/repos/catalog](../README.md) / restockOrder

# Function: restockOrder()

> **restockOrder**(`orderId`, `reason`, `actor`, `db?`): `Promise`\<`boolean`\>

Defined in: work/fashion-store/src/lib/repos/catalog.ts:174

Puts an order's stock back (cancelled / expired / returned). Safe to call twice: it only restocks once per order.

## Parameters

### orderId

`string`

### reason

`"cancel_restock"` \| `"return_restock"`

### actor

`string`

### db?

[`Db`](../../../db/type-aliases/Db.md)

## Returns

`Promise`\<`boolean`\>
