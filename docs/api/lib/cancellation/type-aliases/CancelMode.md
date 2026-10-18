[**fashion-store**](../../../README.md)

***

[fashion-store](../../../README.md) / [lib/cancellation](../README.md) / CancelMode

# Type Alias: CancelMode

> **CancelMode** = `"instant"` \| `"refund"` \| `"cancel-shipment"` \| `"return"` \| `"none"`

Defined in: work/fashion-store/src/lib/cancellation.ts:11

Cancellation / return rules in one place.
 instant         – nothing was paid or shipped: cancel at once and put the stock back
 refund          – paid, not yet handed to a courier: cancel, restock, refund automatically
 cancel-shipment – order exists in Shiprocket but is not picked up: cancel there too, then refund
 return          – delivered recently: customer may request a return (admin approves)
 none            – cannot be cancelled (already on its way, too late, or already closed)
