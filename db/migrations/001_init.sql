-- Luxe & Thread – PostgreSQL schema v1
-- Conventions: snake_case, money = numeric(12,2) in INR (GST-inclusive unless stated), timestamps = timestamptz (UTC).
-- Run with: npm run db:migrate

CREATE TABLE products (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku             text NOT NULL UNIQUE,                    -- "style code", stable forever, e.g. LT-KNZ-001
  slug            text NOT NULL UNIQUE,                    -- URL part, e.g. kanchipuram-neo-zari-silk-saree
  name            text NOT NULL,
  description     text NOT NULL DEFAULT '',
  department      text NOT NULL CHECK (department IN ('women','men','kids','unisex')),
  category        text NOT NULL,                           -- e.g. Sarees, Kurtas, Footwear
  size_set        text NOT NULL CHECK (size_set IN ('apparel','kids','footwear','free')),
  mrp             numeric(12,2) NOT NULL CHECK (mrp >= 0), -- printed "maximum retail price"
  price           numeric(12,2) NOT NULL CHECK (price >= 0),
  sale_price      numeric(12,2) CHECK (sale_price >= 0),   -- optional discount price
  sale_starts_at  timestamptz,
  sale_ends_at    timestamptz,
  cost_price      numeric(12,2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
  gst_rate        numeric(5,2)  NOT NULL DEFAULT 18 CHECK (gst_rate >= 0 AND gst_rate <= 40),
  hsn_code        text NOT NULL DEFAULT '',
  weight_kg       numeric(6,3)  NOT NULL DEFAULT 0.5 CHECK (weight_kg > 0),
  is_active       boolean NOT NULL DEFAULT true,           -- false = hidden from the shop
  is_new_arrival  boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX products_dept_cat_idx ON products (department, category) WHERE is_active;

CREATE TABLE product_images (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url         text NOT NULL,
  alt         text NOT NULL DEFAULT '',
  sort_order  int  NOT NULL DEFAULT 0
);
CREATE INDEX product_images_product_idx ON product_images (product_id, sort_order);

CREATE TABLE product_variants (                              -- one row per size of a product
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id           uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size                 text NOT NULL,
  sku                  text NOT NULL UNIQUE,                 -- e.g. LT-KNZ-001-M
  stock                int  NOT NULL DEFAULT 0 CHECK (stock >= 0),   -- the DB itself refuses negative stock
  low_stock_threshold  int  NOT NULL DEFAULT 3,
  UNIQUE (product_id, size)
);

CREATE TABLE stock_movements (                               -- audit trail of every stock change
  id             bigserial PRIMARY KEY,
  variant_id     uuid NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  delta          int  NOT NULL,
  balance_after  int  NOT NULL,
  reason         text NOT NULL CHECK (reason IN ('receive','adjust','sale','cancel_restock','return_restock','import','initial')),
  ref            text,                                       -- order id, import id ...
  note           text,
  actor          text,                                       -- admin email or 'system'
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX stock_movements_variant_idx ON stock_movements (variant_id, created_at DESC);

CREATE TABLE coupons (
  code           text PRIMARY KEY,                           -- always UPPERCASE
  kind           text NOT NULL CHECK (kind IN ('percent','flat')),
  value          numeric(12,2) NOT NULL CHECK (value > 0),
  min_order      numeric(12,2) NOT NULL DEFAULT 0,
  max_discount   numeric(12,2),
  starts_at      timestamptz,
  ends_at        timestamptz,
  usage_limit    int,
  used_count     int NOT NULL DEFAULT 0,
  is_active      boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE customers (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email                 text NOT NULL,
  phone                 text,
  name                  text NOT NULL,
  email_opt_in          boolean NOT NULL DEFAULT false,      -- marketing consent per channel (DPDP / TRAI)
  sms_opt_in            boolean NOT NULL DEFAULT false,
  whatsapp_opt_in       boolean NOT NULL DEFAULT false,
  consent_updated_at    timestamptz,
  unsubscribe_token     text NOT NULL UNIQUE,
  orders_count          int NOT NULL DEFAULT 0,
  total_spent           numeric(12,2) NOT NULL DEFAULT 0,
  last_order_at         timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX customers_email_uidx ON customers (lower(email));

CREATE TABLE orders (
  id                     text PRIMARY KEY,                    -- LT...  (human friendly)
  public_token           text NOT NULL,                       -- secret in the customer's order link
  customer_id            uuid REFERENCES customers(id),
  status                 text NOT NULL CHECK (status IN ('PENDING_PAYMENT','PAYMENT_FAILED','PAID','COD_CONFIRMED','SHIPMENT_CREATED','SHIPPED','DELIVERED','CANCELLED','RTO','RETURN_REQUESTED','RETURNED')),
  payment_method         text NOT NULL CHECK (payment_method IN ('PREPAID','COD')),
  payment_status         text NOT NULL CHECK (payment_status IN ('PENDING','CAPTURED','FAILED','NOT_REQUIRED','REFUNDED','PARTIALLY_REFUNDED')),
  razorpay_order_id      text UNIQUE,
  razorpay_payment_id    text,
  payment_instrument     text,
  paid_at                timestamptz,
  failure_reason         text,
  customer_name          text NOT NULL,
  customer_email         text NOT NULL,
  customer_phone         text NOT NULL,
  ship_line1             text NOT NULL,
  ship_line2             text,
  ship_city              text NOT NULL,
  ship_state             text NOT NULL,
  ship_pincode           text NOT NULL,
  subtotal               numeric(12,2) NOT NULL,              -- sum of line prices before coupon
  coupon_code            text,
  discount_total         numeric(12,2) NOT NULL DEFAULT 0,    -- coupon discount
  shipping_fee           numeric(12,2) NOT NULL DEFAULT 0,
  total                  numeric(12,2) NOT NULL,
  gst_included           numeric(12,2) NOT NULL DEFAULT 0,
  cogs                   numeric(12,2) NOT NULL DEFAULT 0,    -- cost of goods, frozen at sale time
  shiprocket_order_id    bigint,
  shipment_id            bigint,
  awb                    text,
  courier                text,
  tracking_url           text,
  shipment_last_status   text,
  shipment_last_error    text,
  shipment_attempts      int NOT NULL DEFAULT 0,
  shipping_cost          numeric(12,2) NOT NULL DEFAULT 0,    -- what the courier actually charged you (admin enters)
  delivered_at           timestamptz,
  cancel_reason          text,
  cancelled_at           timestamptz,
  refunded_amount        numeric(12,2) NOT NULL DEFAULT 0,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX orders_status_created_idx ON orders (status, created_at DESC);
CREATE INDEX orders_created_idx ON orders (created_at DESC);
CREATE INDEX orders_customer_idx ON orders (customer_id);

CREATE TABLE order_items (
  id             bigserial PRIMARY KEY,
  order_id       text NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id     uuid NOT NULL REFERENCES products(id),
  variant_id     uuid NOT NULL REFERENCES product_variants(id),
  sku            text NOT NULL,
  name           text NOT NULL,
  size           text NOT NULL,
  quantity       int  NOT NULL CHECK (quantity > 0),
  mrp            numeric(12,2) NOT NULL,
  unit_price     numeric(12,2) NOT NULL,                      -- price actually charged per unit (after sale price)
  discount_alloc numeric(12,2) NOT NULL DEFAULT 0,            -- share of the coupon discount for this line
  unit_cost      numeric(12,2) NOT NULL DEFAULT 0,
  gst_rate       numeric(5,2)  NOT NULL,
  hsn_code       text NOT NULL DEFAULT '',
  weight_kg      numeric(6,3)  NOT NULL,
  image          text NOT NULL DEFAULT ''
);
CREATE INDEX order_items_order_idx ON order_items (order_id);
CREATE INDEX order_items_variant_idx ON order_items (variant_id);

CREATE TABLE order_events (
  id        bigserial PRIMARY KEY,
  order_id  text NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  at        timestamptz NOT NULL DEFAULT now(),
  type      text NOT NULL,
  message   text NOT NULL
);
CREATE INDEX order_events_order_idx ON order_events (order_id, id);

CREATE TABLE refunds (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id             text NOT NULL REFERENCES orders(id),
  razorpay_refund_id   text UNIQUE,
  amount               numeric(12,2) NOT NULL CHECK (amount > 0),
  status               text NOT NULL CHECK (status IN ('requested','processed','failed')),
  reason               text NOT NULL DEFAULT '',
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE return_requests (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    text NOT NULL REFERENCES orders(id),
  status      text NOT NULL CHECK (status IN ('requested','approved','rejected','received','refunded')),
  reason      text NOT NULL,
  admin_note  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE notifications (                                  -- the "outbox": messages waiting to be sent
  id               bigserial PRIMARY KEY,
  channel          text NOT NULL CHECK (channel IN ('email','sms','whatsapp')),
  recipient        text NOT NULL,
  template         text NOT NULL,
  subject          text,
  body             text NOT NULL,
  html             text,
  payload          jsonb NOT NULL DEFAULT '{}'::jsonb,
  order_id         text,
  customer_id      uuid,
  kind             text NOT NULL DEFAULT 'transactional' CHECK (kind IN ('transactional','marketing')),
  status           text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','failed','skipped')),
  attempts         int  NOT NULL DEFAULT 0,
  next_attempt_at  timestamptz NOT NULL DEFAULT now(),
  last_error       text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  sent_at          timestamptz
);
CREATE INDEX notifications_due_idx ON notifications (next_attempt_at) WHERE status = 'queued';

CREATE TABLE campaigns (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  channel     text NOT NULL CHECK (channel IN ('email','sms','whatsapp')),
  subject     text,
  body        text NOT NULL,
  recipients  int NOT NULL DEFAULT 0,
  created_by  text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE expenses (                                        -- for true profit & loss (rent, ads, salaries ...)
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spent_on    date NOT NULL,
  category    text NOT NULL,
  amount      numeric(12,2) NOT NULL CHECK (amount > 0),
  note        text NOT NULL DEFAULT '',
  created_by  text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX expenses_spent_on_idx ON expenses (spent_on);

CREATE TABLE admin_users (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email          text NOT NULL,
  name           text NOT NULL,
  role           text NOT NULL CHECK (role IN ('owner','staff')),
  password_hash  text NOT NULL,                                -- scrypt, never the password itself
  is_active      boolean NOT NULL DEFAULT true,
  last_login_at  timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX admin_users_email_uidx ON admin_users (lower(email));

CREATE TABLE audit_log (                                       -- "who changed what, when" for admin actions
  id         bigserial PRIMARY KEY,
  at         timestamptz NOT NULL DEFAULT now(),
  actor      text NOT NULL,
  action     text NOT NULL,
  entity     text NOT NULL,
  entity_id  text,
  details    jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX audit_log_at_idx ON audit_log (at DESC);
