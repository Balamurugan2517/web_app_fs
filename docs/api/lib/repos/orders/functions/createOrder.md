[**fashion-store**](../../../../README.md)

***

[fashion-store](../../../../README.md) / [lib/repos/orders](../README.md) / createOrder

# Function: createOrder()

> **createOrder**(`order`, `db`): `Promise`\<`void`\>

Defined in: work/fashion-store/src/lib/repos/orders.ts:58

Saves a new order, its lines and the first event, and TAKES THE STOCK – all in one transaction (all or nothing).

## Parameters

### order

[`Order`](../../../../types/order/interfaces/Order.md)

### db

[`Db`](../../../db/type-aliases/Db.md)

## Returns

`Promise`\<`void`\>
