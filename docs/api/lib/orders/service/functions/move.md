[**fashion-store**](../../../../README.md)

***

[fashion-store](../../../../README.md) / [lib/orders/service](../README.md) / move

# Function: move()

> **move**(`order`, `to`, `ev`): [`Order`](../../../../types/order/interfaces/Order.md)

Defined in: work/fashion-store/src/lib/orders/service.ts:22

Moves an order to a new status only if the state machine allows it; otherwise keeps the old one (and logs why).

## Parameters

### order

[`Order`](../../../../types/order/interfaces/Order.md)

### to

[`OrderStatus`](../../../../types/order/type-aliases/OrderStatus.md)

### ev

[`OrderEvent`](../../../../types/order/interfaces/OrderEvent.md)

## Returns

[`Order`](../../../../types/order/interfaces/Order.md)
