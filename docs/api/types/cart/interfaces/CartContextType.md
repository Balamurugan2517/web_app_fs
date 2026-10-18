[**fashion-store**](../../../README.md)

***

[fashion-store](../../../README.md) / [types/cart](../README.md) / CartContextType

# Interface: CartContextType

Defined in: work/fashion-store/src/types/cart.ts:17

## Properties

### addToCart

> **addToCart**: (`product`, `size`) => `void`

Defined in: work/fashion-store/src/types/cart.ts:21

#### Parameters

##### product

[`CartProductSnapshot`](CartProductSnapshot.md)

##### size

`string`

#### Returns

`void`

***

### cart

> **cart**: [`CartItem`](CartItem.md)[]

Defined in: work/fashion-store/src/types/cart.ts:18

***

### clearCart

> **clearCart**: () => `void`

Defined in: work/fashion-store/src/types/cart.ts:24

#### Returns

`void`

***

### isCartLoaded

> **isCartLoaded**: `boolean`

Defined in: work/fashion-store/src/types/cart.ts:20

False until the saved cart has been read from the browser, so pages can avoid flashing "empty".

***

### removeFromCart

> **removeFromCart**: (`productId`, `size`) => `void`

Defined in: work/fashion-store/src/types/cart.ts:22

#### Parameters

##### productId

`string`

##### size

`string`

#### Returns

`void`

***

### totalItems

> **totalItems**: `number`

Defined in: work/fashion-store/src/types/cart.ts:25

***

### updateQuantity

> **updateQuantity**: (`productId`, `size`, `quantity`) => `void`

Defined in: work/fashion-store/src/types/cart.ts:23

#### Parameters

##### productId

`string`

##### size

`string`

##### quantity

`number`

#### Returns

`void`
