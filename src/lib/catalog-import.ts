import type { Department, SizeSet } from '../types/product';
import { parseCsv } from './csv';
import { isValidSize, SIZE_SETS } from './sizes';

/**
 * Bulk upload by CSV.
 *  - Products CSV: one row per product (style). `sizes` looks like  S:10;M:12;L:5   (size:stock). Existing SKUs are UPDATED.
 *  - Stock CSV:    one row per size to REFILL:  variant_sku,add_qty,note    e.g.  LT-KMB-002-M,10,Supplier delivery
 * Both functions only validate and normalise – nothing is saved here (so the admin can preview first).
 */
export interface ImportError { line: number; message: string }

export interface ProductImportRow {
  sku: string; slug: string; name: string; description: string; department: Department; category: string; sizeSet: SizeSet;
  mrp: number; price: number; salePrice: number | null; saleStartsAt: string | null; saleEndsAt: string | null;
  costPrice: number; gstRate: number; hsnCode: string; weightKg: number; isNewArrival: boolean; isActive: boolean;
  images: string[]; sizes: { size: string; stock: number }[];
}

export const PRODUCT_CSV_HEADERS = ['sku', 'name', 'description', 'department', 'category', 'size_set', 'mrp', 'price', 'sale_price', 'sale_starts', 'sale_ends', 'cost_price', 'gst_rate', 'hsn_code', 'weight_kg', 'new_arrival', 'active', 'images', 'sizes'];
export const PRODUCT_CSV_TEMPLATE =
  PRODUCT_CSV_HEADERS.join(',') + '\r\n' +
  'LT-EXM-100,"Example Cotton Kurta","Soft handloom cotton kurta",men,Kurtas,apparel,2499,1999,1799,2026-11-01,2026-11-10,900,5,6105,0.4,yes,yes,/media/LT-EXM-100_1.jpg;/media/LT-EXM-100_2.jpg,S:10;M:12;L:8;XL:4\r\n';

export const slugify = (s: string): string => s.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);

const yes = (v: string): boolean => ['yes', 'y', 'true', '1'].includes(v.trim().toLowerCase());
const num = (v: string): number | null => (v.trim() === '' || Number.isNaN(Number(v)) ? null : Number(v));
const date = (v: string): string | null => (/^\d{4}-\d{2}-\d{2}$/.test(v.trim()) ? `${v.trim()}T00:00:00+05:30` : null);

/** "S:10;M:12;L:5" -> sizes with starting stock, validated against the product's size set. */
export function parseSizeStock(sizeSet: SizeSet, text: string): { sizes: { size: string; stock: number }[] } | { error: string } {
  const sizes: { size: string; stock: number }[] = [];
  for (const part of text.split(/[;\n]/).map((x) => x.trim()).filter(Boolean)) {
    const [size, qty] = part.split(':').map((x) => x.trim());
    const stock = Number(qty);
    if (!size || !isValidSize(sizeSet, size)) return { error: `Size "${size}" is not valid for size_set "${sizeSet}" (allowed: ${SIZE_SETS[sizeSet].join(', ')}).` };
    if (!Number.isInteger(stock) || stock < 0) return { error: `Stock for size ${size} must be a whole number 0 or more.` };
    if (sizes.some((x) => x.size === size)) return { error: `Size ${size} is listed twice.` };
    sizes.push({ size, stock });
  }
  return sizes.length ? { sizes } : { error: 'Add at least one size, e.g. S:10;M:12' };
}

export function parseProductsCsv(text: string): { rows: ProductImportRow[]; errors: ImportError[] } {
  const table = parseCsv(text);
  const errors: ImportError[] = [];
  const rows: ProductImportRow[] = [];
  if (table.length < 2) return { rows, errors: [{ line: 1, message: 'The file has no data rows.' }] };
  const header = table[0].map((h) => h.trim().toLowerCase());
  const missing = ['sku', 'name', 'department', 'category', 'size_set', 'mrp', 'price', 'sizes'].filter((h) => !header.includes(h));
  if (missing.length) return { rows, errors: [{ line: 1, message: `Missing column(s): ${missing.join(', ')}` }] };
  const seen = new Set<string>();

  table.slice(1).forEach((cells, i) => {
    const line = i + 2;
    const get = (k: string): string => (cells[header.indexOf(k)] ?? '').trim();
    const fail = (m: string) => errors.push({ line, message: m });
    const sku = get('sku').toUpperCase();
    if (!/^[A-Z0-9][A-Z0-9-]{2,40}$/.test(sku)) return fail('SKU must be 3–40 letters/digits/dashes (e.g. LT-KMB-002).');
    if (seen.has(sku)) return fail(`Duplicate SKU ${sku} in this file.`);
    seen.add(sku);
    const name = get('name'); if (name.length < 2) return fail('Name is required.');
    const department = get('department').toLowerCase() as Department;
    if (!['women', 'men', 'kids', 'unisex'].includes(department)) return fail('Department must be women, men, kids or unisex.');
    const sizeSet = get('size_set').toLowerCase() as SizeSet;
    if (!(sizeSet in SIZE_SETS)) return fail('size_set must be apparel, kids, footwear or free.');
    const mrp = num(get('mrp')), price = num(get('price'));
    if (mrp == null || price == null || mrp <= 0 || price <= 0) return fail('MRP and price must be numbers greater than 0.');
    if (price > mrp) return fail('Price cannot be higher than MRP.');
    const salePrice = num(get('sale_price'));
    if (salePrice != null && (salePrice <= 0 || salePrice >= price)) return fail('Sale price must be lower than the normal price.');
    const parsedSizes = parseSizeStock(sizeSet, get('sizes'));
    if ('error' in parsedSizes) return fail(parsedSizes.error);
    const sizes = parsedSizes.sizes;
    const gst = num(get('gst_rate')) ?? 18;
    const weight = num(get('weight_kg')) ?? 0.5;
    if (gst < 0 || gst > 40) return fail('GST rate must be between 0 and 40.');
    if (weight <= 0) return fail('weight_kg must be greater than 0.');
    rows.push({
      sku, slug: slugify(name) || slugify(sku), name, description: get('description'), department, category: get('category') || 'General', sizeSet,
      mrp, price, salePrice, saleStartsAt: salePrice != null ? date(get('sale_starts')) : null, saleEndsAt: salePrice != null ? date(get('sale_ends')) : null,
      costPrice: num(get('cost_price')) ?? 0, gstRate: gst, hsnCode: get('hsn_code'), weightKg: weight,
      isNewArrival: yes(get('new_arrival')), isActive: get('active') === '' ? true : yes(get('active')),
      images: get('images').split(';').map((s) => s.trim()).filter((u) => /^(\/(media|images)\/|https:\/\/)/.test(u)), sizes,
    });
  });
  return { rows, errors };
}

export interface StockImportRow { variantSku: string; qty: number; note: string }

export function parseStockCsv(text: string): { rows: StockImportRow[]; errors: ImportError[] } {
  const table = parseCsv(text);
  const rows: StockImportRow[] = [], errors: ImportError[] = [];
  if (table.length < 2) return { rows, errors: [{ line: 1, message: 'The file has no data rows.' }] };
  const header = table[0].map((h) => h.trim().toLowerCase());
  if (!header.includes('variant_sku') || !header.includes('add_qty')) return { rows, errors: [{ line: 1, message: 'Columns required: variant_sku, add_qty (optional: note).' }] };
  table.slice(1).forEach((cells, i) => {
    const get = (k: string): string => (cells[header.indexOf(k)] ?? '').trim();
    const qty = Number(get('add_qty'));
    if (!get('variant_sku')) errors.push({ line: i + 2, message: 'variant_sku is empty.' });
    else if (!Number.isInteger(qty) || qty === 0 || Math.abs(qty) > 100000) errors.push({ line: i + 2, message: 'add_qty must be a whole number other than 0 (use a negative number to remove stock).' });
    else rows.push({ variantSku: get('variant_sku').toUpperCase(), qty, note: get('note') });
  });
  return { rows, errors };
}
