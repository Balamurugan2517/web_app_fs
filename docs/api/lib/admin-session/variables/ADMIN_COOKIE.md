[**fashion-store**](../../../README.md)

***

[fashion-store](../../../README.md) / [lib/admin-session](../README.md) / ADMIN\_COOKIE

# Variable: ADMIN\_COOKIE

> `const` **ADMIN\_COOKIE**: `"lt_admin"` = `'lt_admin'`

Defined in: work/fashion-store/src/lib/admin-session.ts:7

Signed-cookie session for admin users.
Cookie value = "<userId>.<role>.<expiry-ms>.<HMAC of the first three parts>". It cannot be forged or extended without SESSION_SECRET.
