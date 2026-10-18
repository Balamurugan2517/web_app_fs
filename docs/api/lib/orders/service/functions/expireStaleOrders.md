[**fashion-store**](../../../../README.md)

***

[fashion-store](../../../../README.md) / [lib/orders/service](../README.md) / expireStaleOrders

# Function: expireStaleOrders()

> **expireStaleOrders**(`minutes?`): `Promise`\<`number`\>

Defined in: work/fashion-store/src/lib/orders/service.ts:284

Run every few minutes: unpaid checkouts older than `minutes` are cancelled and their stock released.

## Parameters

### minutes?

`number` = `30`

## Returns

`Promise`\<`number`\>
