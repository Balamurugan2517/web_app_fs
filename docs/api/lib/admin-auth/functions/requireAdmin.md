[**fashion-store**](../../../README.md)

***

[fashion-store](../../../README.md) / [lib/admin-auth](../README.md) / requireAdmin

# Function: requireAdmin()

> **requireAdmin**(`role?`): `Promise`\<[`AdminIdentity`](../interfaces/AdminIdentity.md)\>

Defined in: work/fashion-store/src/lib/admin-auth.ts:20

Call at the top of every admin page AND every admin server action. Hiding a button is not security; this check is.

## Parameters

### role?

[`AdminRole`](../../admin-session/type-aliases/AdminRole.md)

## Returns

`Promise`\<[`AdminIdentity`](../interfaces/AdminIdentity.md)\>
