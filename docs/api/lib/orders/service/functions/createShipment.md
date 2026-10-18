[**fashion-store**](../../../../README.md)

***

[fashion-store](../../../../README.md) / [lib/orders/service](../README.md) / createShipment

# Function: createShipment()

> **createShipment**(`orderId`): `Promise`\<[`Order`](../../../../types/order/interfaces/Order.md)\>

Defined in: work/fashion-store/src/lib/orders/service.ts:120

Creates the shipment in Shiprocket. Safe to retry: an order that already has a Shiprocket id is returned as is.

## Parameters

### orderId

`string`

## Returns

`Promise`\<[`Order`](../../../../types/order/interfaces/Order.md)\>
