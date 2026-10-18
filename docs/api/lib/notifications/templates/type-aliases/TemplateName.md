[**fashion-store**](../../../../README.md)

***

[fashion-store](../../../../README.md) / [lib/notifications/templates](../README.md) / TemplateName

# Type Alias: TemplateName

> **TemplateName** = `"order_confirmed"` \| `"order_shipped"` \| `"order_delivered"` \| `"order_cancelled"` \| `"refund_processed"` \| `"return_update"` \| `"payment_failed"` \| `"marketing"`

Defined in: work/fashion-store/src/lib/notifications/templates.ts:8

Message templates. Each returns a subject, a plain-text body (used for email text, SMS and WhatsApp)
and a small HTML version for email. Pure functions: easy to test and to translate later.
