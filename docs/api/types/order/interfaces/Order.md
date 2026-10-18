[**fashion-store**](../../../README.md)

***

[fashion-store](../../../README.md) / [types/order](../README.md) / Order

# Interface: Order

Defined in: work/fashion-store/src/types/order.ts:48

## Properties

### address

> **address**: `object`

Defined in: work/fashion-store/src/types/order.ts:58

#### city

> **city**: `string`

#### line1

> **line1**: `string`

#### line2?

> `optional` **line2?**: `string`

#### pincode

> **pincode**: `string`

#### state

> **state**: `string`

***

### cancel?

> `optional` **cancel?**: `object`

Defined in: work/fashion-store/src/types/order.ts:84

#### at

> **at**: `string`

#### reason

> **reason**: `string`

***

### couponCode?

> `optional` **couponCode?**: `string`

Defined in: work/fashion-store/src/types/order.ts:60

***

### createdAt

> **createdAt**: `string`

Defined in: work/fashion-store/src/types/order.ts:53

***

### customer

> **customer**: `object`

Defined in: work/fashion-store/src/types/order.ts:57

#### email

> **email**: `string`

#### name

> **name**: `string`

#### phone

> **phone**: `string`

***

### customerId?

> `optional` **customerId?**: `string`

Defined in: work/fashion-store/src/types/order.ts:52

***

### events

> **events**: [`OrderEvent`](OrderEvent.md)[]

Defined in: work/fashion-store/src/types/order.ts:85

***

### id

> **id**: `string`

Defined in: work/fashion-store/src/types/order.ts:49

***

### items

> **items**: [`OrderItem`](OrderItem.md)[]

Defined in: work/fashion-store/src/types/order.ts:59

***

### payment

> **payment**: `object`

Defined in: work/fashion-store/src/types/order.ts:62

#### failureReason?

> `optional` **failureReason?**: `string`

#### method?

> `optional` **method?**: `string`

#### paidAt?

> `optional` **paidAt?**: `string`

#### razorpayOrderId?

> `optional` **razorpayOrderId?**: `string`

#### razorpayPaymentId?

> `optional` **razorpayPaymentId?**: `string`

#### refundedAmount

> **refundedAmount**: `number`

#### status

> **status**: [`PaymentStatus`](../type-aliases/PaymentStatus.md)

***

### paymentMethod

> **paymentMethod**: [`PaymentMethod`](../type-aliases/PaymentMethod.md)

Defined in: work/fashion-store/src/types/order.ts:56

***

### publicToken

> **publicToken**: `string`

Defined in: work/fashion-store/src/types/order.ts:51

Secret that lets a guest customer open their own order page.

***

### shipment

> **shipment**: `object`

Defined in: work/fashion-store/src/types/order.ts:71

#### attempts

> **attempts**: `number`

#### awb?

> `optional` **awb?**: `string`

#### cost

> **cost**: `number`

What the courier actually charged you (entered by the admin) – used in profit reports.

#### courier?

> `optional` **courier?**: `string`

#### deliveredAt?

> `optional` **deliveredAt?**: `string`

#### lastError?

> `optional` **lastError?**: `string`

#### lastStatus?

> `optional` **lastStatus?**: `string`

#### shipmentId?

> `optional` **shipmentId?**: `number`

#### shiprocketOrderId?

> `optional` **shiprocketOrderId?**: `number`

#### trackingUrl?

> `optional` **trackingUrl?**: `string`

***

### status

> **status**: [`OrderStatus`](../type-aliases/OrderStatus.md)

Defined in: work/fashion-store/src/types/order.ts:55

***

### totals

> **totals**: [`OrderTotals`](OrderTotals.md)

Defined in: work/fashion-store/src/types/order.ts:61

***

### updatedAt

> **updatedAt**: `string`

Defined in: work/fashion-store/src/types/order.ts:54
