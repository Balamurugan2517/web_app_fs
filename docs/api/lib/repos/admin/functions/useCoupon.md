[**fashion-store**](../../../../README.md)

***

[fashion-store](../../../../README.md) / [lib/repos/admin](../README.md) / useCoupon

# Function: useCoupon()

> **useCoupon**(`db`, `code`): `Promise`\<`boolean`\>

Defined in: work/fashion-store/src/lib/repos/admin.ts:58

Counts one use – refuses (returns false) if the usage limit was reached in the meantime.

## Parameters

### db

[`Db`](../../../db/type-aliases/Db.md)

### code

`string`

## Returns

`Promise`\<`boolean`\>
