[**fashion-store**](../../../../README.md)

***

[fashion-store](../../../../README.md) / [lib/orders/service](../README.md) / decideReturn

# Function: decideReturn()

> **decideReturn**(`returnId`, `decision`, `note`, `actor`, `refundAmount?`): `Promise`\<`void`\>

Defined in: work/fashion-store/src/lib/orders/service.ts:261

Admin decision on a return request: approve, reject, or "received" (goods are back → restock and refund).

## Parameters

### returnId

`string`

### decision

`"approve"` \| `"reject"` \| `"received"`

### note

`string`

### actor

`string`

### refundAmount?

`number`

## Returns

`Promise`\<`void`\>
