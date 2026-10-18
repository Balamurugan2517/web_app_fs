[**fashion-store**](../../../README.md)

***

[fashion-store](../../../README.md) / [lib/errors](../README.md) / ErrorCode

# Type Alias: ErrorCode

> **ErrorCode** = `"VALIDATION_ERROR"` \| `"NOT_FOUND"` \| `"UNAUTHORIZED"` \| `"RATE_LIMITED"` \| `"INVALID_STATE"` \| `"INVALID_SIGNATURE"` \| `"CONFIG_MISSING"` \| `"PAYMENT_PROVIDER_ERROR"` \| `"SHIPPING_PROVIDER_ERROR"` \| `"STORAGE_ERROR"` \| `"INTERNAL_ERROR"`

Defined in: work/fashion-store/src/lib/errors.ts:6

One error type for the whole backend.
Every expected failure is thrown as an AppError with a stable `code`, so the API layer can
turn it into a safe JSON response and the logs can be searched by code.
