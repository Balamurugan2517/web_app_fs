// Integration tests against a REAL PostgreSQL. Run:  docker compose up -d db && DATABASE_URL=postgres://luxe:luxe_dev_password@localhost:5432/luxe_thread_test npm run test:integration
// They create their own tables in a throw-away database – NEVER point DATABASE_URL at production.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import pg from 'pg';

const url = process.env.DATABASE_URL;
const skip = !url || /prod/i.test(url) ? 'set DATABASE_URL to a TEST database to run' : false;
let pool;

before(async () => {
  if (skip) return;
  pool = new pg.Pool({ connectionString: url });
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await pool.query(await readFile('db/migrations/001_init.sql', 'utf8'));
  await pool.query(await readFile('db/seed/seed.sql', 'utf8'));
});
after(async () => { await pool?.end(); });

test('seed loads products, sizes and stock', { skip }, async () => {
  const { rows } = await pool.query('SELECT count(*)::int AS n FROM product_variants WHERE stock > 0');
  assert.ok(rows[0].n > 10);
});

test('the database refuses negative stock (cannot oversell)', { skip }, async () => {
  const v = (await pool.query("SELECT id FROM product_variants WHERE sku = 'LT-KNZ-001-FREESIZE'")).rows[0];
  await assert.rejects(pool.query('UPDATE product_variants SET stock = -1 WHERE id = $1', [v.id]), /check constraint/);
});

test('two buyers racing for the last piece: exactly one wins', { skip }, async () => {
  const v = (await pool.query("SELECT id FROM product_variants WHERE sku = 'LT-TCB-004-10'")).rows[0];       // seeded with stock = 1
  await pool.query('UPDATE product_variants SET stock = 1 WHERE id = $1', [v.id]);
  const take = () => pool.query('UPDATE product_variants SET stock = stock - 1 WHERE id = $1 AND stock >= 1 RETURNING id', [v.id]);
  const results = await Promise.all(Array.from({ length: 10 }, take));
  assert.equal(results.filter((r) => r.rowCount === 1).length, 1);
  assert.equal((await pool.query('SELECT stock FROM product_variants WHERE id = $1', [v.id])).rows[0].stock, 0);
});

test('unique rules: SKU, e-mail (case-insensitive), coupon code', { skip }, async () => {
  await assert.rejects(pool.query("INSERT INTO products (sku, slug, name, department, category, size_set, mrp, price) VALUES ('LT-KNZ-001','x','x','men','x','apparel',1,1)"), /unique/);
  await pool.query("INSERT INTO customers (email, name, unsubscribe_token) VALUES ('Asha@Example.com','Asha','tok1')");
  await assert.rejects(pool.query("INSERT INTO customers (email, name, unsubscribe_token) VALUES ('asha@example.com','Asha2','tok2')"), /unique/);
});

test('order status and money rules are enforced by the database', { skip }, async () => {
  await assert.rejects(pool.query(`INSERT INTO orders (id, public_token, status, payment_method, payment_status, customer_name, customer_email, customer_phone, ship_line1, ship_city, ship_state, ship_pincode, subtotal, total)
    VALUES ('T1','t','NOT_A_STATUS','PREPAID','PENDING','a','a@b.in','9876543210','x','c','s','600001',1,1)`), /check constraint/);
});
