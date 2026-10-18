[**fashion-store**](../../../README.md)

***

[fashion-store](../../../README.md) / [lib/db](../README.md) / tx

# Function: tx()

> **tx**\<`T`\>(`fn`): `Promise`\<`T`\>

Defined in: work/fashion-store/src/lib/db.ts:31

Runs several statements as ONE all-or-nothing unit (BEGIN … COMMIT, ROLLBACK on any error).

## Type Parameters

### T

`T`

## Parameters

### fn

(`db`) => `Promise`\<`T`\>

## Returns

`Promise`\<`T`\>
