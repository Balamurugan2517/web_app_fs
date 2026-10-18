'use server';

import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin-auth';
import { ADMIN_COOKIE, ADMIN_SESSION_MS, createSessionValue } from '@/lib/admin-session';
import { parseProductsCsv, parseSizeStock, parseStockCsv } from '@/lib/catalog-import';
import { normalizeCode } from '@/lib/coupons';
import { adminConfig, getEnv } from '@/lib/env';
import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { detectImageType, MAX_IMAGE_BYTES, parseImageName } from '@/lib/media';
import { processOutbox, queueCampaign } from '@/lib/notifications/outbox';
import { cancelOrder, createShipment, decideReturn, refundOrder, syncTracking } from '@/lib/orders/service';
import { verifyPassword } from '@/lib/password';
import { checkRateLimit, clientIp } from '@/lib/rate-limit';
import { addExpense, audit, deleteExpense, findAdminByEmail, retryFailed, setCouponActive, touchAdminLogin, upsertCoupon } from '@/lib/repos/admin';
import { addImage, addSize, adjustStock, applyProductImport, bulkSale, clearSale, findProductIdBySku, getProduct, markOutOfStock, removeImage, setProductActive, setStock, upsertProduct } from '@/lib/repos/catalog';
import { setShippingCost } from '@/lib/repos/orders';
import { SIZE_SETS } from '@/lib/sizes';

export type LoginState = { error?: string };

const isRedirect = (e: unknown): boolean => typeof e === 'object' && e !== null && String((e as { digest?: unknown }).digest ?? '').startsWith('NEXT_REDIRECT');
const q = (m: string) => encodeURIComponent(m);
const text = (f: FormData, k: string): string => String(f.get(k) ?? '').trim();
const num = (f: FormData, k: string): number | null => { const v = text(f, k); return v === '' || Number.isNaN(Number(v)) ? null : Number(v); };
const date = (f: FormData, k: string): string | null => { const v = text(f, k); return /^\d{4}-\d{2}-\d{2}$/.test(v) ? `${v}T00:00:00+05:30` : null; };

/** Runs an admin action; on success redirects back with a green message, on failure with a red one (details go to the log). */
async function run(path: string, okMessage: string, fn: () => Promise<void | string>): Promise<never> {
  let msg = okMessage;
  try { const r = await fn(); if (typeof r === 'string') msg = r; }
  catch (e) {
    if (isRedirect(e)) throw e;
    logger.error('admin action failed', { path, error: e instanceof Error ? e.message : String(e), code: e instanceof AppError ? e.code : undefined });
    redirect(`${path}${path.includes('?') ? '&' : '?'}err=${q(e instanceof AppError && e.status < 500 ? e.message : e instanceof AppError ? `${e.message} (${e.code})` : 'Something went wrong. See the server log.')}`);
  }
  revalidatePath(path.split('?')[0]);
  redirect(`${path}${path.includes('?') ? '&' : '?'}ok=${q(msg)}`);
}

// ------------------------------------------------------------------ login / logout
export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const ip = clientIp(await headers());
  const rl = checkRateLimit(`admin-login:${ip}`, 8, 15 * 60_000);
  if (!rl.ok) return { error: `Too many attempts. Try again in ${Math.ceil(rl.retryAfterSec / 60)} minute(s).` };
  let secret: string;
  try { secret = adminConfig().sessionSecret; } catch { return { error: 'Admin login is not configured. Set SESSION_SECRET (32+ characters) and DATABASE_URL on the server.' }; }

  const user = await findAdminByEmail(text(formData, 'email')).catch(() => undefined);
  // Always run the password check (even for unknown e-mails) so response time does not reveal which e-mails exist.
  const ok = await verifyPassword(String(formData.get('password') ?? ''), user?.passwordHash ?? 'scrypt$16384$00$00');
  if (!user || !ok || !user.isActive) { logger.warn('admin login failed', { ip }); return { error: 'Incorrect e-mail or password.' }; }
  (await cookies()).set(ADMIN_COOKIE, createSessionValue(secret, { userId: user.id, role: user.role }), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/admin', maxAge: ADMIN_SESSION_MS / 1000 });
  await touchAdminLogin(user.id); await audit(user.email, 'login', 'admin', user.id);
  redirect('/admin');
}

export async function logoutAction(): Promise<void> {
  (await cookies()).delete({ name: ADMIN_COOKIE, path: '/admin' });
  redirect('/admin/login');
}

// ------------------------------------------------------------------ products
const productSchema = z.object({
  sku: z.string().trim().toUpperCase().regex(/^[A-Z0-9][A-Z0-9-]{2,40}$/, 'SKU: 3–40 letters, digits or dashes'),
  name: z.string().trim().min(2).max(120), description: z.string().trim().max(2000),
  department: z.enum(['women', 'men', 'kids', 'unisex']), category: z.string().trim().min(2).max(40), sizeSet: z.enum(['apparel', 'kids', 'footwear', 'free']),
  mrp: z.number().positive(), price: z.number().positive(), salePrice: z.number().positive().nullable(), costPrice: z.number().min(0), gstRate: z.number().min(0).max(40),
  hsnCode: z.string().trim().max(12), weightKg: z.number().positive().max(50),
}).refine((p) => p.price <= p.mrp, { message: 'Price cannot be higher than MRP', path: ['price'] }).refine((p) => p.salePrice == null || p.salePrice < p.price, { message: 'Sale price must be lower than the normal price', path: ['salePrice'] });

export async function saveProductAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const editing = text(formData, 'id');
  const back = editing ? `/admin/products/${editing}` : '/admin/products/new';
  return run(back, 'Product saved', async () => {
    const parsed = productSchema.safeParse({
      sku: text(formData, 'sku'), name: text(formData, 'name'), description: text(formData, 'description'), department: text(formData, 'department'), category: text(formData, 'category'),
      sizeSet: text(formData, 'sizeSet'), mrp: num(formData, 'mrp'), price: num(formData, 'price'), salePrice: num(formData, 'salePrice'), costPrice: num(formData, 'costPrice') ?? 0,
      gstRate: num(formData, 'gstRate') ?? 18, hsnCode: text(formData, 'hsnCode'), weightKg: num(formData, 'weightKg') ?? 0.5,
    });
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '), 422);
    const p = parsed.data;
    let sizes: { size: string; stock: number }[] = [];
    if (!editing) {
      const s = parseSizeStock(p.sizeSet, text(formData, 'sizes'));
      if ('error' in s) throw new AppError('VALIDATION_ERROR', s.error, 422);
      sizes = s.sizes;
    }
    const res = await upsertProduct({ ...p, slug: undefined, saleStartsAt: p.salePrice ? date(formData, 'saleStart') : null, saleEndsAt: p.salePrice ? date(formData, 'saleEnd') : null,
      isActive: formData.get('isActive') === 'on', isNewArrival: formData.get('isNewArrival') === 'on' }, sizes, [], admin.email);
    await audit(admin.email, res.created ? 'product_create' : 'product_update', 'product', res.id, { sku: p.sku, price: p.price, salePrice: p.salePrice });
    if (!editing) redirect(`/admin/products/${res.id}?ok=${q('Product created. Now add photos below.')}`);
  });
}

export async function stockAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const productId = text(formData, 'productId'); const back = `/admin/products/${productId}`;
  return run(back, 'Stock updated', async () => {
    const variantId = text(formData, 'variantId'); const mode = text(formData, 'mode'); const qty = num(formData, 'qty'); const note = text(formData, 'note');
    if (qty == null || !Number.isInteger(qty)) throw new AppError('VALIDATION_ERROR', 'Enter a whole number.', 422);
    if (mode === 'set') { if (qty < 0) throw new AppError('VALIDATION_ERROR', 'Stock cannot be negative.', 422); await setStock(variantId, qty, admin.email, note || 'Stock take'); }
    else if (mode === 'add') await adjustStock({ variantId, delta: qty, reason: qty >= 0 ? 'receive' : 'adjust', actor: admin.email, note: note || 'Stock received' });
    else throw new AppError('VALIDATION_ERROR', 'Unknown stock action.', 422);
    await audit(admin.email, `stock_${mode}`, 'variant', variantId, { qty, note });
  });
}

export async function addSizeAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const productId = text(formData, 'productId');
  return run(`/admin/products/${productId}`, 'Size added', async () => {
    const p = await getProduct(productId, { includeInactive: true });
    const size = text(formData, 'size'); const stock = num(formData, 'stock') ?? 0;
    if (!p || !SIZE_SETS[p.sizeSet].includes(size) || !Number.isInteger(stock) || stock < 0) throw new AppError('VALIDATION_ERROR', 'Choose a valid size and a whole-number stock.', 422);
    await addSize(p.id, size, `${p.sku}-${size.replace(/\s+/g, '')}`.toUpperCase(), stock, admin.email);
    await audit(admin.email, 'size_add', 'product', p.id, { size, stock });
  });
}

export async function outOfStockAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin(); const id = text(formData, 'productId');
  return run(`/admin/products/${id}`, 'Marked out of stock', async () => { const n = await markOutOfStock(id, admin.email); await audit(admin.email, 'mark_out_of_stock', 'product', id, { sizes: n }); return `Marked out of stock (${n} size${n === 1 ? '' : 's'} set to 0)`; });
}

export async function visibilityAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin(); const id = text(formData, 'productId'); const active = text(formData, 'active') === '1'; const back = text(formData, 'back') || `/admin/products/${id}`;
  return run(back, active ? 'Product is now visible in the shop' : 'Product hidden from the shop', async () => { await setProductActive(id, active); await audit(admin.email, active ? 'product_show' : 'product_hide', 'product', id); });
}

export async function bulkSaleAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  return run('/admin/products', 'Sale updated', async () => {
    const department = text(formData, 'department') as 'women' | 'men' | 'kids' | '';
    const category = text(formData, 'category'); const percent = num(formData, 'percent');
    const filter = { department: department || undefined, category: category || undefined };
    if (text(formData, 'op') === 'clear') { const n = await clearSale(filter); await audit(admin.email, 'sale_clear', 'product', undefined, { ...filter, n }); return `Sale removed from ${n} product(s)`; }
    if (percent == null || percent <= 0 || percent >= 90) throw new AppError('VALIDATION_ERROR', 'Enter a discount between 1 and 89 percent.', 422);
    const n = await bulkSale({ ...filter, percent, startsAt: date(formData, 'start'), endsAt: date(formData, 'end') });
    await audit(admin.email, 'sale_bulk', 'product', undefined, { ...filter, percent, n });
    return `${percent}% sale applied to ${n} product(s)`;
  });
}

// ------------------------------------------------------------------ images, CSV import
async function saveImage(file: File, sku: string, index: number): Promise<string> {
  if (file.size > MAX_IMAGE_BYTES) throw new AppError('VALIDATION_ERROR', `${file.name} is larger than 3 MB.`, 422);
  const buf = new Uint8Array(await file.arrayBuffer());
  const type = detectImageType(buf);
  if (!type) throw new AppError('VALIDATION_ERROR', `${file.name} is not a JPG, PNG or WebP image.`, 422);
  const name = `${sku}_${index}_${createHash('sha1').update(buf).digest('hex').slice(0, 8)}.${type.ext}`;
  const dir = path.resolve(getEnv().UPLOAD_DIR);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), buf);
  return `/media/${name}`;
}

export async function uploadImagesAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin(); const productId = text(formData, 'productId');
  return run(`/admin/products/${productId}`, 'Photos uploaded', async () => {
    const p = await getProduct(productId, { includeInactive: true });
    if (!p) throw new AppError('NOT_FOUND', 'Product not found.', 404);
    const files = formData.getAll('files').filter((f): f is File => f instanceof File && f.size > 0);
    if (!files.length) throw new AppError('VALIDATION_ERROR', 'Choose at least one photo.', 422);
    for (const [i, f] of files.entries()) await addImage(p.id, await saveImage(f, p.sku, p.images.length + i + 1), p.name);
    await audit(admin.email, 'images_add', 'product', p.id, { count: files.length });
  });
}

export async function removeImageAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin(); const productId = text(formData, 'productId');
  return run(`/admin/products/${productId}`, 'Photo removed', async () => { await removeImage(productId, text(formData, 'url')); await audit(admin.email, 'image_remove', 'product', productId); });
}

/** Bulk photos named after the style code: LT-KNZ-001_1.jpg, LT-KNZ-001_2.jpg … are attached to the right product automatically. */
export async function bulkImagesAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  return run('/admin/products/import', 'Photos uploaded', async () => {
    const files = formData.getAll('files').filter((f): f is File => f instanceof File && f.size > 0);
    if (!files.length) throw new AppError('VALIDATION_ERROR', 'Choose at least one photo.', 422);
    let attached = 0; const unmatched: string[] = [];
    for (const f of files) {
      const parsed = parseImageName(f.name);
      const id = parsed ? await findProductIdBySku(parsed.sku) : undefined;
      if (!parsed || !id) { unmatched.push(f.name); continue; }
      await addImage(id, await saveImage(f, parsed.sku, parsed.index), parsed.sku); attached++;
    }
    await audit(admin.email, 'images_bulk', 'product', undefined, { attached, unmatched });
    return `${attached} photo(s) attached.${unmatched.length ? ` Not matched to any product (check the SKU in the file name): ${unmatched.join(', ')}` : ''}`;
  });
}

export async function importProductsAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  return run('/admin/products/import', 'Import finished', async () => {
    const file = formData.get('file');
    if (!(file instanceof File) || !file.size) throw new AppError('VALIDATION_ERROR', 'Choose a CSV file.', 422);
    const { rows, errors } = parseProductsCsv(await file.text());
    if (errors.length) throw new AppError('VALIDATION_ERROR', `Nothing was imported. Fix these lines and upload again: ${errors.slice(0, 8).map((e) => `line ${e.line}: ${e.message}`).join(' | ')}${errors.length > 8 ? ` … and ${errors.length - 8} more` : ''}`, 422);
    if (text(formData, 'mode') === 'check') return `File is valid: ${rows.length} product(s) ready. Choose "Import now" to save them.`;
    const r = await applyProductImport(rows, admin.email);
    await audit(admin.email, 'import_products', 'product', undefined, r);
    return `Imported: ${r.created} new, ${r.updated} updated.`;
  });
}

export async function importStockAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  return run('/admin/inventory', 'Stock imported', async () => {
    const file = formData.get('file');
    if (!(file instanceof File) || !file.size) throw new AppError('VALIDATION_ERROR', 'Choose a CSV file.', 422);
    const { rows, errors } = parseStockCsv(await file.text());
    if (errors.length) throw new AppError('VALIDATION_ERROR', `Nothing was imported. ${errors.slice(0, 8).map((e) => `line ${e.line}: ${e.message}`).join(' | ')}`, 422);
    if (text(formData, 'mode') === 'check') return `File is valid: ${rows.length} stock line(s).`;
    for (const r of rows) await adjustStock({ variantSku: r.variantSku, delta: r.qty, reason: 'import', actor: admin.email, note: r.note || 'CSV stock update' });
    await audit(admin.email, 'import_stock', 'variant', undefined, { lines: rows.length });
    return `Stock updated for ${rows.length} line(s).`;
  });
}

// ------------------------------------------------------------------ coupons, expenses (owner only)
export async function saveCouponAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin('owner');
  return run('/admin/coupons', 'Coupon saved', async () => {
    const code = normalizeCode(text(formData, 'code')); const value = num(formData, 'value'); const kind = text(formData, 'kind');
    if (!/^[A-Z0-9]{3,20}$/.test(code)) throw new AppError('VALIDATION_ERROR', 'Code: 3–20 letters or digits.', 422);
    if (!['percent', 'flat'].includes(kind) || value == null || value <= 0 || (kind === 'percent' && value > 90)) throw new AppError('VALIDATION_ERROR', 'Enter a valid discount (percent up to 90).', 422);
    await upsertCoupon({ code, kind: kind as 'percent' | 'flat', value, minOrder: num(formData, 'minOrder') ?? 0, maxDiscount: num(formData, 'maxDiscount'), startsAt: date(formData, 'start'), endsAt: date(formData, 'end') ? date(formData, 'end')!.replace('T00:00:00', 'T23:59:59') : null, usageLimit: num(formData, 'usageLimit'), isActive: true });
    await audit(admin.email, 'coupon_save', 'coupon', code, { kind, value });
  });
}
export async function couponToggleAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin('owner'); const code = text(formData, 'code');
  return run('/admin/coupons', 'Coupon updated', async () => { await setCouponActive(code, text(formData, 'active') === '1'); await audit(admin.email, 'coupon_toggle', 'coupon', code); });
}
export async function addExpenseAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin('owner');
  return run('/admin/expenses', 'Expense added', async () => {
    const amount = num(formData, 'amount'); const on = text(formData, 'spentOn'); const category = text(formData, 'category');
    if (amount == null || amount <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(on) || category.length < 2) throw new AppError('VALIDATION_ERROR', 'Enter a date, a category and an amount.', 422);
    await addExpense({ spentOn: on, category, amount, note: text(formData, 'note'), by: admin.email });
    await audit(admin.email, 'expense_add', 'expense', undefined, { amount, category });
  });
}
export async function deleteExpenseAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin('owner');
  return run('/admin/expenses', 'Expense deleted', async () => { await deleteExpense(text(formData, 'id')); await audit(admin.email, 'expense_delete', 'expense', text(formData, 'id')); });
}

// ------------------------------------------------------------------ orders & returns
export async function createShipmentAction(orderId: string): Promise<void> {
  await requireAdmin();
  return run(`/admin/orders/${orderId}`, 'Shipment created', async () => { await createShipment(orderId); });
}
export async function syncTrackingAction(orderId: string): Promise<void> {
  await requireAdmin();
  return run(`/admin/orders/${orderId}`, 'Tracking updated', async () => { await syncTracking(orderId); await processOutbox(); });
}
export async function adminCancelAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin(); const id = text(formData, 'orderId');
  return run(`/admin/orders/${id}`, 'Order cancelled', async () => { await cancelOrder(id, text(formData, 'reason') || 'Cancelled by shop', admin.email); await processOutbox(); });
}
export async function refundAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin('owner'); const id = text(formData, 'orderId');
  return run(`/admin/orders/${id}`, 'Refund started', async () => { await refundOrder(id, num(formData, 'amount') ?? undefined, text(formData, 'reason') || 'Refund by shop', admin.email); await processOutbox(); });
}
export async function shippingCostAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin(); const id = text(formData, 'orderId');
  return run(`/admin/orders/${id}`, 'Courier cost saved', async () => {
    const c = num(formData, 'cost'); if (c == null || c < 0) throw new AppError('VALIDATION_ERROR', 'Enter the amount the courier charged.', 422);
    await setShippingCost(id, c); await audit(admin.email, 'shipping_cost', 'order', id, { cost: c });
  });
}
export async function returnDecisionAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin(text(formData, 'decision') === 'received' ? 'owner' : undefined);
  return run('/admin/returns', 'Return updated', async () => {
    await decideReturn(text(formData, 'returnId'), text(formData, 'decision') as 'approve' | 'reject' | 'received', text(formData, 'note'), admin.email, num(formData, 'refundAmount') ?? undefined);
    await processOutbox();
  });
}

// ------------------------------------------------------------------ marketing & messages (owner only)
const campaignSchema = z.object({ name: z.string().trim().min(3).max(80), channel: z.enum(['email', 'sms', 'whatsapp']), subject: z.string().trim().max(120).optional(), body: z.string().trim().min(10).max(1000) });
export async function sendCampaignAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin('owner');
  return run('/admin/customers', 'Campaign queued', async () => {
    const parsed = campaignSchema.safeParse({ name: text(formData, 'name'), channel: text(formData, 'channel'), subject: text(formData, 'subject') || undefined, body: text(formData, 'body') });
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 'Give the campaign a name (3+ characters) and a message (10+ characters).', 422);
    const n = await queueCampaign({ ...parsed.data, by: admin.email });
    await audit(admin.email, 'campaign', 'campaign', undefined, { ...parsed.data, recipients: n });
    return `Queued for ${n} customer(s) who agreed to receive ${parsed.data.channel} offers. They are sent within a minute.`;
  });
}
export async function retryMessagesAction(): Promise<void> {
  const admin = await requireAdmin();
  return run('/admin/notifications', 'Failed messages queued again', async () => { const n = await retryFailed(); await audit(admin.email, 'retry_messages', 'notification', undefined, { n: n.length }); });
}

