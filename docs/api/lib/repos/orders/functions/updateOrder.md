[**fashion-store**](../../../../README.md)

***

[fashion-store](../../../../README.md) / [lib/repos/orders](../README.md) / updateOrder

# Function: updateOrder()

> **updateOrder**(`id`, `change`): `Promise`\<[`Order`](../../../../types/order/interfaces/Order.md)\>

Defined in: work/fashion-store/src/lib/repos/orders.ts:102

Read → change → save, holding a row lock so two things happening at once (verify + webhook, two admins …) cannot overwrite each other.
New events pushed inside `change` are saved; existing ones are never rewritten.

## Parameters

### id

`string`

### change

(`o`) => [`Order`](../../../../types/order/interfaces/Order.md) \| `Promise`\<[`Order`](../../../../types/order/interfaces/Order.md)\>

## Returns

`Promise`\<[`Order`](../../../../types/order/interfaces/Order.md)\>
