[**fashion-store**](../../../../README.md)

***

[fashion-store](../../../../README.md) / [lib/orders/service](../README.md) / placeOrder

# Function: placeOrder()

> **placeOrder**(`input`): `Promise`\<[`PlacedOrder`](../interfaces/PlacedOrder.md)\>

Defined in: work/fashion-store/src/lib/orders/service.ts:42

Checkout, server side. In ONE database transaction: take the stock, count the coupon, save the customer and the order.
If anything fails (e.g. the last piece was just sold) the whole thing rolls back and nothing is half-saved.

## Parameters

### input

#### city

`string` = `...`

#### couponCode

`string` = `...`

#### email

`string` = `...`

#### items

`object`[] = `...`

#### line1

`string` = `...`

#### line2

`string` = `...`

#### name

`string` = `...`

#### optInEmail

`boolean` = `...`

#### optInSms

`boolean` = `...`

#### optInWhatsapp

`boolean` = `...`

#### paymentMethod

`"PREPAID"` \| `"COD"` = `...`

#### phone

`string` = `phoneSchema`

#### pincode

`string` = `pincodeSchema`

#### state

`"Andhra Pradesh"` \| `"Arunachal Pradesh"` \| `"Assam"` \| `"Bihar"` \| `"Chhattisgarh"` \| `"Goa"` \| `"Gujarat"` \| `"Haryana"` \| `"Himachal Pradesh"` \| `"Jharkhand"` \| `"Karnataka"` \| `"Kerala"` \| `"Madhya Pradesh"` \| `"Maharashtra"` \| `"Manipur"` \| `"Meghalaya"` \| `"Mizoram"` \| `"Nagaland"` \| `"Odisha"` \| `"Punjab"` \| `"Rajasthan"` \| `"Sikkim"` \| `"Tamil Nadu"` \| `"Telangana"` \| `"Tripura"` \| `"Uttar Pradesh"` \| `"Uttarakhand"` \| `"West Bengal"` \| `"Andaman and Nicobar Islands"` \| `"Chandigarh"` \| `"Dadra and Nagar Haveli and Daman and Diu"` \| `"Delhi"` \| `"Jammu and Kashmir"` \| `"Ladakh"` \| `"Lakshadweep"` \| `"Puducherry"` = `...`

## Returns

`Promise`\<[`PlacedOrder`](../interfaces/PlacedOrder.md)\>
