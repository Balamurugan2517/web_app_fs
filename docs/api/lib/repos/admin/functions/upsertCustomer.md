[**fashion-store**](../../../../README.md)

***

[fashion-store](../../../../README.md) / [lib/repos/admin](../README.md) / upsertCustomer

# Function: upsertCustomer()

> **upsertCustomer**(`db`, `c`): `Promise`\<`string`\>

Defined in: work/fashion-store/src/lib/repos/admin.ts:24

Finds the customer by email (or creates them). Consent is only ever switched ON by an explicit tick; it is never switched on silently.

## Parameters

### db

[`Db`](../../../db/type-aliases/Db.md)

### c

#### email

`string`

#### name

`string`

#### optInEmail

`boolean`

#### optInSms

`boolean`

#### optInWhatsapp

`boolean`

#### phone

`string`

## Returns

`Promise`\<`string`\>
