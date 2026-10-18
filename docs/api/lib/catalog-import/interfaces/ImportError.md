[**fashion-store**](../../../README.md)

***

[fashion-store](../../../README.md) / [lib/catalog-import](../README.md) / ImportError

# Interface: ImportError

Defined in: work/fashion-store/src/lib/catalog-import.ts:11

Bulk upload by CSV.
 - Products CSV: one row per product (style). `sizes` looks like  S:10;M:12;L:5   (size:stock). Existing SKUs are UPDATED.
 - Stock CSV:    one row per size to REFILL:  variant_sku,add_qty,note    e.g.  LT-KMB-002-M,10,Supplier delivery
Both functions only validate and normalise – nothing is saved here (so the admin can preview first).

## Properties

### line

> **line**: `number`

Defined in: work/fashion-store/src/lib/catalog-import.ts:11

***

### message

> **message**: `string`

Defined in: work/fashion-store/src/lib/catalog-import.ts:11
