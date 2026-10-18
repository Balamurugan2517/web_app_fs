[**fashion-store**](../../../../README.md)

***

[fashion-store](../../../../README.md) / [lib/repos/admin](../README.md) / claimDue

# Function: claimDue()

> **claimDue**(`limit`): `Promise`\<[`OutboxRow`](../interfaces/OutboxRow.md)[]\>

Defined in: work/fashion-store/src/lib/repos/admin.ts:87

Takes a batch of due messages. SKIP LOCKED lets two workers run at once without sending anything twice.

## Parameters

### limit

`number`

## Returns

`Promise`\<[`OutboxRow`](../interfaces/OutboxRow.md)[]\>
