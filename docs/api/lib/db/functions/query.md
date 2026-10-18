[**fashion-store**](../../../README.md)

***

[fashion-store](../../../README.md) / [lib/db](../README.md) / query

# Function: query()

> **query**\<`T`\>(`text`, `params?`, `db?`): `Promise`\<`T`[]\>

Defined in: work/fashion-store/src/lib/db.ts:21

Runs one SQL statement with $1,$2… parameters (never build SQL by joining user text – that is how SQL injection happens).

## Type Parameters

### T

`T` *extends* `QueryResultRow` = `QueryResultRow`

## Parameters

### text

`string`

### params?

`unknown`[] = `[]`

### db?

[`Db`](../type-aliases/Db.md)

## Returns

`Promise`\<`T`[]\>
