[**fashion-store**](../../../../README.md)

***

[fashion-store](../../../../README.md) / [lib/notifications/outbox](../README.md) / queueCampaign

# Function: queueCampaign()

> **queueCampaign**(`c`): `Promise`\<`number`\>

Defined in: work/fashion-store/src/lib/notifications/outbox.ts:58

Marketing broadcast to customers who OPTED IN to the chosen channel. Every message carries an unsubscribe link.

## Parameters

### c

#### body

`string`

#### by

`string`

#### channel

`"email"` \| `"sms"` \| `"whatsapp"`

#### name

`string`

#### subject?

`string`

## Returns

`Promise`\<`number`\>
