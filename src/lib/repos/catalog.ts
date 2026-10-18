import type { Department, Product, SizeSet, Variant } from '../../types/product';
import { AppError } from '../errors';
import { query, tx, type Db } from '../db';
import { slugify, type ProductImportRow } from '../catalog-import';
import { sortSizes } from '../sizes';

/** SQL for "the price the customer pays right now" (sale price while the sale window is open). */
const EFFECTIVE = `CASE WHEN p.sale_price IS NOT NULL AND p.sale_price < p.price AND (p.sale_starts_at IS NULL OR p.sale_starts_at <= now()) AND (p.sale_ends_at IS NULL OR p.sale_ends_at >= now()) THEN p.sale_price ELSE p.price END`;
const SALE_ACTIVE = `(p.sale_price IS NOT NULL AND p.sale_price < p.price AND (p.sale_starts_at IS NULL OR p.sale_starts_at <= now()) AND (p.sale_ends_at IS NULL OR p.sale_ends_at >= now()))`;

interface ProductRow {
  id: string; sku: string; slug: string; name: string; description: string; department: Department; category: string; size_set: SizeSet;
  mrp: number; price: number; sale_price: number | null; sale_starts_at: Date | null; sale_ends_at: Date | null; cost_price: number; gst_rate: number;
  hsn_code: string; weight_kg: number; is_active: boolean; is_new_arrival: boolean;
}
interface VariantRow { id: string; product_id: string; size: string; sku: string; stock: number; low_stock_threshold: number }
interface ImageRow { product_id: string; url: string; alt: string }

const iso = (d: Date | null): string | null => (d ? d.toISOString() : null);

function toProduct(r: ProductRow, variants: VariantRow[], images: ImageRow[]): Product {
  return {
    id: r.id, sku: r.sku, slug: r.slug, name: r.name, description: r.description, department: r.department, category: r.category, sizeSet: r.size_set,
    images: images.map((i) => ({ url: i.url, alt: i.alt })), mrp: r.mrp, price: r.price, salePrice: r.sale_price, saleStartsAt: iso(r.sale_starts_at), saleEndsAt: iso(r.sale_ends_at),
    costPrice: r.cost_price, gstRate: r.gst_rate, hsnCode: r.hsn_code, weightKg: r.weight_kg, isActive: r.is_active, isNewArrival: r.is_new_arrival,
    variants: sortSizes(r.size_set, variants.map((v) => v.size)).map((s) => variants.find((v) => v.size === s) as VariantRow)
      .map((v): Variant => ({ id: v.id, size: v.size, sku: v.sku, stock: v.stock, lowStockThreshold: v.low_stock_threshold })),
  };
}

async function hydrate(rows: ProductRow[], db?: Db): Promise<Product[]> {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const [variants, images] = await Promise.all([
    query<VariantRow>('SELECT * FROM product_variants WHERE product_id = ANY($1::uuid[])', [ids], db),
    query<ImageRow>('SELECT product_id, url, alt FROM product_images WHERE product_id = ANY($1::uuid[]) ORDER BY sort_order, id', [ids], db),
  ]);
  return rows.map((r) => toProduct(r, variants.filter((v) => v.product_id === r.id), images.filter((i) => i.product_id === r.id)));
}

export interface ProductFilter {
  department?: Department; category?: string; q?: string; size?: string; minPrice?: number; maxPrice?: number;
  inStock?: boolean; onSale?: boolean; newArrival?: boolean; includeInactive?: boolean;
  sort?: 'new' | 'price-asc' | 'price-desc' | 'name'; limit?: number; offset?: number;
}

export async function listProducts(f: ProductFilter = {}): Promise<Product[]> {
  const where: string[] = []; const params: unknown[] = [];
  const add = (sql: string, v?: unknown) => { if (v !== undefined) params.push(v); where.push(sql.replace('$#', `$${params.length}`)); };
  if (!f.includeInactive) add('p.is_active');
  if (f.department) add('(p.department = $# OR p.department = \'unisex\')', f.department);
  if (f.category) add('p.category = $#', f.category);
  if (f.q) add('(p.name ILIKE $# OR p.sku ILIKE $# OR p.category ILIKE $# OR p.description ILIKE $#)', `%${f.q.replace(/[%_\\]/g, '\\$&')}%`);
  if (f.size) add('EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id = p.id AND v.size = $# AND v.stock > 0)', f.size);
  if (f.inStock) add('EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id = p.id AND v.stock > 0)');
  if (f.minPrice != null) add(`${EFFECTIVE} >= $#`, f.minPrice);
  if (f.maxPrice != null) add(`${EFFECTIVE} <= $#`, f.maxPrice);
  if (f.onSale) add(SALE_ACTIVE);
  if (f.newArrival) add('p.is_new_arrival');
  const order = f.sort === 'price-asc' ? `${EFFECTIVE} ASC` : f.sort === 'price-desc' ? `${EFFECTIVE} DESC` : f.sort === 'name' ? 'p.name ASC' : 'p.created_at DESC';
  const sql = `SELECT p.* FROM products p ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY ${order}, p.id LIMIT ${Math.min(f.limit ?? 60, 200)} OFFSET ${Math.max(f.offset ?? 0, 0)}`;
  return hydrate(await query<ProductRow>(sql, params));
}

export async function getProduct(slugOrId: string, opts: { includeInactive?: boolean } = {}): Promise<Product | undefined> {
  const isId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);
  const rows = await query<ProductRow>(`SELECT p.* FROM products p WHERE ${isId ? 'p.id = $1::uuid' : 'p.slug = $1'} ${opts.includeInactive ? '' : 'AND p.is_active'}`, [slugOrId]);
  return (await hydrate(rows))[0];
}

export async function getProductsByIds(ids: string[], db?: Db): Promise<Map<string, Product>> {
  const uuids = ids.filter((i) => /^[0-9a-f-]{36}$/i.test(i));
  const rows = uuids.length ? await query<ProductRow>('SELECT * FROM products WHERE id = ANY($1::uuid[])', [uuids], db) : [];
  return new Map((await hydrate(rows, db)).map((p) => [p.id, p]));
}

export async function listCategories(): Promise<{ department: Department; category: string; count: number }[]> {
  return (await query<{ department: Department; category: string; count: string }>(
    'SELECT department, category, count(*)::int AS count FROM products WHERE is_active GROUP BY department, category ORDER BY department, category')).map((r) => ({ ...r, count: Number(r.count) }));
}

// ------------------------------------------------------------------ writes (admin)

export interface ProductWrite {
  sku: string; name: string; description: string; department: Department; category: string; sizeSet: SizeSet; mrp: number; price: number;
  salePrice: number | null; saleStartsAt: string | null; saleEndsAt: string | null; costPrice: number; gstRate: number; hsnCode: string; weightKg: number;
  isActive: boolean; isNewArrival: boolean; slug?: string;
}

async function writeProduct(db: Db, p: ProductWrite): Promise<{ id: string; created: boolean }> {
  const slug = p.slug || slugify(p.name) || slugify(p.sku);
  const rows = await query<{ id: string; created: boolean }>(
    `INSERT INTO products (sku, slug, name, description, department, category, size_set, mrp, price, sale_price, sale_starts_at, sale_ends_at, cost_price, gst_rate, hsn_code, weight_kg, is_active, is_new_arrival)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
     ON CONFLICT (sku) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description, department=EXCLUDED.department, category=EXCLUDED.category,
       mrp=EXCLUDED.mrp, price=EXCLUDED.price, sale_price=EXCLUDED.sale_price, sale_starts_at=EXCLUDED.sale_starts_at, sale_ends_at=EXCLUDED.sale_ends_at,
       cost_price=EXCLUDED.cost_price, gst_rate=EXCLUDED.gst_rate, hsn_code=EXCLUDED.hsn_code, weight_kg=EXCLUDED.weight_kg,
       is_active=EXCLUDED.is_active, is_new_arrival=EXCLUDED.is_new_arrival, updated_at=now()
     RETURNING id, (xmax = 0) AS created`,
    [p.sku, slug, p.name, p.description, p.department, p.category, p.sizeSet, p.mrp, p.price, p.salePrice, p.saleStartsAt, p.saleEndsAt, p.costPrice, p.gstRate, p.hsnCode, p.weightKg, p.isActive, p.isNewArrival], db);
  return rows[0];
}

/** Creates or updates a product by SKU. Size/stock rows are only ADDED for new sizes; existing stock is never overwritten here. */
export async function upsertProduct(p: ProductWrite, sizes: { size: string; stock: number }[], images: string[], actor: string): Promise<{ id: string; created: boolean }> {
  return tx(async (db) => {
    const { id, created } = await writeProduct(db, p);
    for (const s of sizes) {
      const rows = await query<{ id: string }>(
        `INSERT INTO product_variants (product_id, size, sku, stock) VALUES ($1,$2,$3,$4) ON CONFLICT (product_id, size) DO NOTHING RETURNING id`,
        [id, s.size, `${p.sku}-${s.size.replace(/\s+/g, '')}`.toUpperCase(), s.stock], db);
      if (rows[0] && s.stock > 0) await query(`INSERT INTO stock_movements (variant_id, delta, balance_after, reason, actor) VALUES ($1,$2,$2,'initial',$3)`, [rows[0].id, s.stock, actor], db);
    }
    if (images.length) {
      await query('DELETE FROM product_images WHERE product_id = $1', [id], db);
      for (const [i, url] of images.entries()) await query('INSERT INTO product_images (product_id, url, alt, sort_order) VALUES ($1,$2,$3,$4)', [id, url, p.name, i], db);
    }
    return { id, created };
  });
}

export const setProductActive = (id: string, active: boolean) => query('UPDATE products SET is_active = $2, updated_at = now() WHERE id = $1', [id, active]);

export async function addImage(productId: string, url: string, alt: string): Promise<void> {
  await query('INSERT INTO product_images (product_id, url, alt, sort_order) VALUES ($1,$2,$3,(SELECT COALESCE(max(sort_order)+1,0) FROM product_images WHERE product_id=$1))', [productId, url, alt]);
}
export const removeImage = (productId: string, url: string) => query('DELETE FROM product_images WHERE product_id = $1 AND url = $2', [productId, url]);
export async function findProductIdBySku(sku: string): Promise<string | undefined> {
  return (await query<{ id: string }>('SELECT id FROM products WHERE sku = $1', [sku.toUpperCase()]))[0]?.id;
}

// ------------------------------------------------------------------ stock

export type StockReason = 'receive' | 'adjust' | 'sale' | 'cancel_restock' | 'return_restock' | 'import' | 'initial';

/** Changes stock by `delta` (+ add, − remove). The database refuses to go below zero, so this can never oversell. */
export async function adjustStock(args: { variantId?: string; variantSku?: string; delta: number; reason: StockReason; actor: string; ref?: string; note?: string }, db?: Db): Promise<number> {
  const rows = await query<{ id: string; stock: number }>(
    `UPDATE product_variants SET stock = stock + $1 WHERE ${args.variantId ? 'id = $2::uuid' : 'sku = $2'} AND stock + $1 >= 0 RETURNING id, stock`,
    [args.delta, args.variantId ?? args.variantSku], db);
  if (!rows[0]) throw new AppError('VALIDATION_ERROR', 'Stock cannot go below zero (or the size was not found).', 409, { variant: args.variantId ?? args.variantSku });
  await query('INSERT INTO stock_movements (variant_id, delta, balance_after, reason, ref, note, actor) VALUES ($1,$2,$3,$4,$5,$6,$7)',
    [rows[0].id, args.delta, rows[0].stock, args.reason, args.ref ?? null, args.note ?? null, args.actor], db);
  return rows[0].stock;
}

/** Sets stock to an exact number (a stock-take). Records the difference as an "adjust" movement. */
export async function setStock(variantId: string, newStock: number, actor: string, note?: string): Promise<void> {
  await tx(async (db) => {
    const cur = (await query<{ stock: number }>('SELECT stock FROM product_variants WHERE id = $1 FOR UPDATE', [variantId], db))[0];
    if (!cur) throw new AppError('NOT_FOUND', 'Size not found.', 404);
    if (newStock !== cur.stock) await adjustStock({ variantId, delta: newStock - cur.stock, reason: 'adjust', actor, note }, db);
  });
}

export async function markOutOfStock(productId: string, actor: string): Promise<number> {
  return tx(async (db) => {
    const vs = await query<{ id: string; stock: number }>('SELECT id, stock FROM product_variants WHERE product_id = $1 AND stock > 0 FOR UPDATE', [productId], db);
    for (const v of vs) await adjustStock({ variantId: v.id, delta: -v.stock, reason: 'adjust', actor, note: 'Marked out of stock' }, db);
    return vs.length;
  });
}

/** Takes stock for an order, inside the order's transaction. Fails (rolling the order back) if anyone else bought the last piece first. */
export async function reserveStock(db: Db, items: { variantId: string; quantity: number; name: string; size: string }[], orderId: string): Promise<void> {
  for (const it of items) {
    const rows = await query<{ stock: number; id: string }>('UPDATE product_variants SET stock = stock - $2 WHERE id = $1 AND stock >= $2 RETURNING id, stock', [it.variantId, it.quantity], db);
    if (!rows[0]) throw new AppError('VALIDATION_ERROR', `Sorry – ${it.name} (${it.size}) just sold out.`, 409, { code: 'OUT_OF_STOCK' });
    await query(`INSERT INTO stock_movements (variant_id, delta, balance_after, reason, ref, actor) VALUES ($1,$2,$3,'sale',$4,'system')`, [it.variantId, -it.quantity, rows[0].stock, orderId], db);
  }
}

/** Puts an order's stock back (cancelled / expired / returned). Safe to call twice: it only restocks once per order. */
export async function restockOrder(orderId: string, reason: 'cancel_restock' | 'return_restock', actor: string, db?: Db): Promise<boolean> {
  const done = await query('SELECT 1 FROM stock_movements WHERE ref = $1 AND reason IN (\'cancel_restock\',\'return_restock\') LIMIT 1', [orderId], db);
  if (done.length) return false;
  const items = await query<{ variant_id: string; quantity: number }>('SELECT variant_id, quantity FROM order_items WHERE order_id = $1', [orderId], db);
  for (const it of items) await adjustStock({ variantId: it.variant_id, delta: it.quantity, reason, actor, ref: orderId }, db);
  return items.length > 0;
}

export interface StockRow { sku: string; product: string; size: string; stock: number; threshold: number; costValue: number; sellValue: number; department: string; category: string; productId: string }

export async function stockReport(): Promise<StockRow[]> {
  return query<StockRow>(
    `SELECT v.sku, p.name AS product, v.size, v.stock, v.low_stock_threshold AS threshold, (v.stock * p.cost_price) AS "costValue", (v.stock * p.price) AS "sellValue",
            p.department, p.category, p.id AS "productId"
       FROM product_variants v JOIN products p ON p.id = v.product_id ORDER BY p.name, v.size`);
}

export async function stockMovements(variantId: string, limit = 50) {
  return query<{ at: Date; delta: number; balance_after: number; reason: string; ref: string | null; note: string | null; actor: string | null }>(
    'SELECT created_at AS at, delta, balance_after, reason, ref, note, actor FROM stock_movements WHERE variant_id = $1 ORDER BY id DESC LIMIT $2', [variantId, limit]);
}

// ------------------------------------------------------------------ CSV import (applies already-validated rows)

export async function applyProductImport(rows: ProductImportRow[], actor: string): Promise<{ created: number; updated: number }> {
  let created = 0, updated = 0;
  for (const r of rows) {
    const res = await upsertProduct({ ...r }, r.sizes, r.images, actor);
    if (res.created) created++; else updated++;
  }
  return { created, updated };
}

// ------------------------------------------------------------------ festival sales

/** Puts every matching product on sale at `percent` off its normal price (rounded to whole rupees), between two dates. */
export async function bulkSale(f: { department?: Department; category?: string; percent: number; startsAt: string | null; endsAt: string | null }): Promise<number> {
  const where = ['is_active']; const params: unknown[] = [f.percent, f.startsAt, f.endsAt];
  if (f.department) { params.push(f.department); where.push(`department = $${params.length}`); }
  if (f.category) { params.push(f.category); where.push(`category = $${params.length}`); }
  return (await query(`UPDATE products SET sale_price = round(price * (1 - $1::numeric / 100)), sale_starts_at = $2, sale_ends_at = $3, updated_at = now() WHERE ${where.join(' AND ')} RETURNING id`, params)).length;
}
export async function clearSale(f: { department?: Department; category?: string }): Promise<number> {
  const where = ['sale_price IS NOT NULL']; const params: unknown[] = [];
  if (f.department) { params.push(f.department); where.push(`department = $${params.length}`); }
  if (f.category) { params.push(f.category); where.push(`category = $${params.length}`); }
  return (await query(`UPDATE products SET sale_price = NULL, sale_starts_at = NULL, sale_ends_at = NULL, updated_at = now() WHERE ${where.join(' AND ')} RETURNING id`, params)).length;
}

export async function addSize(productId: string, size: string, sku: string, stock: number, actor: string): Promise<void> {
  await tx(async (db) => {
    const rows = await query<{ id: string }>('INSERT INTO product_variants (product_id, size, sku, stock) VALUES ($1,$2,$3,$4) ON CONFLICT (product_id, size) DO NOTHING RETURNING id', [productId, size, sku, stock], db);
    if (!rows[0]) throw new AppError('VALIDATION_ERROR', `Size ${size} already exists for this product.`, 409);
    if (stock > 0) await query(`INSERT INTO stock_movements (variant_id, delta, balance_after, reason, actor) VALUES ($1,$2,$2,'initial',$3)`, [rows[0].id, stock, actor], db);
  });
}
