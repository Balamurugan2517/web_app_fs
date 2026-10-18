[**fashion-store**](../../../../README.md)

***

[fashion-store](../../../../README.md) / [lib/repos/catalog](../README.md) / reserveStock

# Function: reserveStock()

> **reserveStock**(`db`, `items`, `orderId`): `Promise`\<`void`\>

Defined in: work/fashion-store/src/lib/repos/catalog.ts:165

Takes stock for an order, inside the order's transaction. Fails (rolling the order back) if anyone else bought the last piece first.

## Parameters

### db

[`Db`](../../../db/type-aliases/Db.md)

### items

`object`[]

### orderId

`string`

## Returns

`Promise`\<`void`\>
