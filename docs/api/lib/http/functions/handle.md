[**fashion-store**](../../../README.md)

***

[fashion-store](../../../README.md) / [lib/http](../README.md) / handle

# Function: handle()

> **handle**(`request`, `name`, `fn`, `opts?`): `Promise`\<`Response`\>

Defined in: work/fashion-store/src/lib/http.ts:12

Wraps every API route handler so that:
 1. each request gets a requestId (customers can quote it to support, and it appears in the logs);
 2. optional rate limiting is applied;
 3. ANY error is caught, logged in full, and returned as a SAFE, uniform JSON body.

## Parameters

### request

`Request`

### name

`string`

### fn

(`ctx`) => `Promise`\<`Response`\>

### opts?

#### rateLimit?

\{ `limit`: `number`; `windowMs`: `number`; \}

#### rateLimit.limit

`number`

#### rateLimit.windowMs

`number`

## Returns

`Promise`\<`Response`\>
