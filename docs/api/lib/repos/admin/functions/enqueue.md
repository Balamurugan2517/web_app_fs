[**fashion-store**](../../../../README.md)

***

[fashion-store](../../../../README.md) / [lib/repos/admin](../README.md) / enqueue

# Function: enqueue()

> **enqueue**(`n`, `db?`): `Promise`\<`QueryResultRow`[]\>

Defined in: work/fashion-store/src/lib/repos/admin.ts:83

## Parameters

### n

#### body

`string`

#### channel

`"email"` \| `"sms"` \| `"whatsapp"`

#### customerId?

`string`

#### html?

`string`

#### kind?

`"marketing"` \| `"transactional"`

#### orderId?

`string`

#### payload?

`Record`\<`string`, `unknown`\>

#### recipient

`string`

#### subject?

`string`

#### template

`string`

### db?

[`Db`](../../../db/type-aliases/Db.md)

## Returns

`Promise`\<`QueryResultRow`[]\>
