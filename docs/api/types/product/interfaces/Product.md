[**fashion-store**](../../../README.md)

***

[fashion-store](../../../README.md) / [types/product](../README.md) / Product

# Interface: Product

Defined in: work/fashion-store/src/types/product.ts:17

A product ("style"). Prices are INR, whole or 2-decimal rupees, GST-inclusive. Lives in PostgreSQL.

## Properties

### category

> **category**: `string`

Defined in: work/fashion-store/src/types/product.ts:25

***

### costPrice

> **costPrice**: `number`

Defined in: work/fashion-store/src/types/product.ts:33

***

### department

> **department**: [`Department`](../type-aliases/Department.md)

Defined in: work/fashion-store/src/types/product.ts:24

***

### description

> **description**: `string`

Defined in: work/fashion-store/src/types/product.ts:23

***

### gstRate

> **gstRate**: `number`

Defined in: work/fashion-store/src/types/product.ts:34

***

### hsnCode

> **hsnCode**: `string`

Defined in: work/fashion-store/src/types/product.ts:35

***

### id

> **id**: `string`

Defined in: work/fashion-store/src/types/product.ts:18

***

### images

> **images**: [`ProductImage`](ProductImage.md)[]

Defined in: work/fashion-store/src/types/product.ts:27

***

### isActive

> **isActive**: `boolean`

Defined in: work/fashion-store/src/types/product.ts:37

***

### isNewArrival

> **isNewArrival**: `boolean`

Defined in: work/fashion-store/src/types/product.ts:38

***

### mrp

> **mrp**: `number`

Defined in: work/fashion-store/src/types/product.ts:28

***

### name

> **name**: `string`

Defined in: work/fashion-store/src/types/product.ts:22

***

### price

> **price**: `number`

Defined in: work/fashion-store/src/types/product.ts:29

***

### saleEndsAt

> **saleEndsAt**: `string` \| `null`

Defined in: work/fashion-store/src/types/product.ts:32

***

### salePrice

> **salePrice**: `number` \| `null`

Defined in: work/fashion-store/src/types/product.ts:30

***

### saleStartsAt

> **saleStartsAt**: `string` \| `null`

Defined in: work/fashion-store/src/types/product.ts:31

***

### sizeSet

> **sizeSet**: [`SizeSet`](../type-aliases/SizeSet.md)

Defined in: work/fashion-store/src/types/product.ts:26

***

### sku

> **sku**: `string`

Defined in: work/fashion-store/src/types/product.ts:20

Style code – never changes, even when stock is refilled. Variants are `${sku}-${size}`.

***

### slug

> **slug**: `string`

Defined in: work/fashion-store/src/types/product.ts:21

***

### variants

> **variants**: [`Variant`](Variant.md)[]

Defined in: work/fashion-store/src/types/product.ts:39

***

### weightKg

> **weightKg**: `number`

Defined in: work/fashion-store/src/types/product.ts:36
