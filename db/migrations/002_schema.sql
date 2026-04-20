-- ============================================================
-- 002_schema.sql
-- Все таблицы и индексы проекта «2х2»
-- ============================================================
-- Применяется ПОСЛЕ 001_extensions_and_enums.sql.
--
-- Отличия от Supabase-версии (00001 + 00002 + 00003):
--   * Удалена таблица profiles (заменяется users в 004_lucia_auth.sql).
--   * Все ссылки на auth.users(id) заменены на TEXT (без FK constraint
--     в этом файле — FK будут добавлены через ALTER TABLE
--     в 004_lucia_auth.sql, после создания таблицы users).
--   * Удалены все ALTER TABLE ... ENABLE ROW LEVEL SECURITY.
--   * Удалены все CREATE POLICY ....
--   * Удалены INSERT INTO storage.buckets (Supabase Storage).
--   * Включены поля и индексы из 00002 (portfolio published_at,
--     category_label) и 00003 (idx_products_cat_sort,
--     idx_products_active_sort).
-- ============================================================

-- ============================================================
-- 1. КАТЕГОРИИ (древовидная структура услуг)
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id BIGSERIAL PRIMARY KEY,
  parent_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,                 -- имя иконки lucide
  image_url TEXT,
  cover_url TEXT,            -- обложка для страницы категории
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  seo_title TEXT,
  seo_description TEXT,
  seo_keywords TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_sort ON categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_categories_featured
  ON categories(is_featured) WHERE is_featured = true;

-- ============================================================
-- 2. ТОВАРЫ / УСЛУГИ
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id BIGSERIAL PRIMARY KEY,
  category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  short_description TEXT,
  sku TEXT UNIQUE,
  barcode TEXT,

  -- Ценообразование
  pricing_mode product_pricing_mode NOT NULL DEFAULT 'fixed',
  price NUMERIC(12,2) NOT NULL DEFAULT 0,           -- базовая / стартовая цена
  old_price NUMERIC(12,2),
  cost_price NUMERIC(12,2),
  price_from BOOLEAN NOT NULL DEFAULT false,        -- "от X руб."
  unit TEXT DEFAULT 'шт',                           -- единица измерения

  stock INT NOT NULL DEFAULT 0,
  track_stock BOOLEAN NOT NULL DEFAULT false,       -- услуги не трекают остатки
  weight INT,                                       -- граммы
  dimensions JSONB,                                 -- { length, width, height }

  brand TEXT,
  status product_status NOT NULL DEFAULT 'draft',
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_new BOOLEAN NOT NULL DEFAULT false,
  is_on_sale BOOLEAN NOT NULL DEFAULT false,
  has_installation BOOLEAN NOT NULL DEFAULT false,  -- требует монтаж
  lead_time_days INT,                               -- срок изготовления

  attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  tags TEXT[] NOT NULL DEFAULT '{}',

  seo_title TEXT,
  seo_description TEXT,
  seo_keywords TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  views_count INT NOT NULL DEFAULT 0,
  rating_avg NUMERIC(3,2) NOT NULL DEFAULT 0,
  reviews_count INT NOT NULL DEFAULT 0,

  -- Полнотекстовый поиск (заполняется триггером в 003_*)
  search_vector tsvector,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_pricing ON products(pricing_mode);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
CREATE INDEX IF NOT EXISTS idx_products_created ON products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_featured
  ON products(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_products_new
  ON products(is_new) WHERE is_new = true;
CREATE INDEX IF NOT EXISTS idx_products_search
  ON products USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_products_tags
  ON products USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_products_attributes
  ON products USING GIN(attributes);
-- Композитные индексы из 00003 для каталога
CREATE INDEX IF NOT EXISTS idx_products_cat_sort
  ON products (category_id, sort_order)
  WHERE status = 'active' AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_active_sort
  ON products (sort_order)
  WHERE status = 'active' AND deleted_at IS NULL;

-- ============================================================
-- 3. PRODUCT IMAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS product_images (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  alt_text TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_product_images_product
  ON product_images(product_id);

-- ============================================================
-- 4. PRODUCT VARIANTS
-- ============================================================
CREATE TABLE IF NOT EXISTS product_variants (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT UNIQUE,
  price NUMERIC(12,2),
  old_price NUMERIC(12,2),
  stock INT NOT NULL DEFAULT 0,
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  image_url TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_product_variants_product
  ON product_variants(product_id);

-- ============================================================
-- 5. PRODUCT PARAMETERS (для калькулятора и фильтров)
-- ============================================================
CREATE TABLE IF NOT EXISTS product_parameters (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  key TEXT NOT NULL,              -- "tiraj", "format", "material"
  label TEXT NOT NULL,
  type TEXT NOT NULL,             -- number | select | range | text | boolean
  options JSONB,                  -- [{ value, label, price_modifier }]
  unit TEXT,                      -- "шт", "см²", "м"
  default_value TEXT,
  min_value NUMERIC(12,2),
  max_value NUMERIC(12,2),
  step NUMERIC(12,2),
  required BOOLEAN NOT NULL DEFAULT false,
  affects_price BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, key)
);
CREATE INDEX IF NOT EXISTS idx_product_parameters_product
  ON product_parameters(product_id);

-- ============================================================
-- 6. CALCULATOR CONFIGS (формула расчёта для товара)
-- ============================================================
CREATE TABLE IF NOT EXISTS calculator_configs (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  -- formula: JSONB-описание формулы. Поддерживаемые типы:
  -- per_unit | per_area | per_length | per_tiraj_tier
  formula JSONB NOT NULL,
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  min_price NUMERIC(12,2),
  max_price NUMERIC(12,2),
  currency TEXT NOT NULL DEFAULT 'RUB',
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id)
);
CREATE INDEX IF NOT EXISTS idx_calculator_configs_product
  ON calculator_configs(product_id);

-- ============================================================
-- 7. CALCULATION REQUESTS (заявки на расчёт)
-- ============================================================
CREATE TABLE IF NOT EXISTS calculation_requests (
  id BIGSERIAL PRIMARY KEY,
  request_number TEXT UNIQUE,
  product_id BIGINT REFERENCES products(id) ON DELETE SET NULL,
  category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,

  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  company_name TEXT,

  params JSONB NOT NULL DEFAULT '{}'::jsonb,
  attachments TEXT[] NOT NULL DEFAULT '{}',
  comment TEXT,
  source_url TEXT,

  status calculation_status NOT NULL DEFAULT 'new',
  manager_comment TEXT,
  quoted_amount NUMERIC(12,2),
  quoted_at TIMESTAMPTZ,
  -- FK на users(id) добавляется в 004_lucia_auth.sql
  assigned_to TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_calc_requests_status
  ON calculation_requests(status);
CREATE INDEX IF NOT EXISTS idx_calc_requests_created
  ON calculation_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calc_requests_product
  ON calculation_requests(product_id);

-- ============================================================
-- 8. ORDERS (заказы)
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id BIGSERIAL PRIMARY KEY,
  order_number TEXT UNIQUE,
  type order_type NOT NULL DEFAULT 'cart',
  status order_status NOT NULL DEFAULT 'new',

  -- Клиент. FK на users(id) добавляется в 004_lucia_auth.sql.
  customer_id TEXT,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT NOT NULL,

  -- B2B-поля
  is_b2b BOOLEAN NOT NULL DEFAULT false,
  company_name TEXT,
  company_inn TEXT,
  company_kpp TEXT,
  company_address TEXT,

  -- Суммы
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  delivery_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  installation_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,

  -- Промокод
  promo_code_id BIGINT,
  promo_code TEXT,

  -- Доставка СДЭК
  delivery_type TEXT,              -- pickup | office | door | installation
  delivery_tariff_code INT,
  delivery_tariff_name TEXT,
  delivery_point_code TEXT,
  delivery_point_address TEXT,
  delivery_address JSONB,
  delivery_period_min INT,
  delivery_period_max INT,
  cdek_order_uuid TEXT,
  cdek_order_number TEXT,
  cdek_tracking_url TEXT,

  -- Монтаж (специфика «2х2»)
  installation_required BOOLEAN NOT NULL DEFAULT false,
  installation_address TEXT,
  installation_date DATE,
  installation_notes TEXT,

  -- Оплата
  payment_method TEXT,             -- cdek_pay | invoice | cash
  payment_status TEXT NOT NULL DEFAULT 'pending',
  payment_order_number TEXT,
  payment_url TEXT,
  paid_at TIMESTAMPTZ,

  -- Менеджер (FK на users(id) добавляется в 004_lucia_auth.sql)
  manager_comment TEXT,
  customer_comment TEXT,
  assigned_to TEXT,

  source TEXT,                     -- web | one_click | calc_request | phone
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_type ON orders(type);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_payment ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);

-- ============================================================
-- 9. ORDER ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS order_items (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id BIGINT REFERENCES products(id) ON DELETE SET NULL,
  variant_id BIGINT REFERENCES product_variants(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  sku TEXT,
  price NUMERIC(12,2) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  total NUMERIC(12,2) NOT NULL,
  image_url TEXT,
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  calc_params JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- ============================================================
-- 10. ORDER STATUS HISTORY
-- ============================================================
CREATE TABLE IF NOT EXISTS order_status_history (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status order_status NOT NULL,
  comment TEXT,
  -- FK на users(id) добавляется в 004_lucia_auth.sql
  changed_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_order_status_history_order
  ON order_status_history(order_id);

-- ============================================================
-- 11. PORTFOLIO ITEMS (специфика рекламного агентства)
-- ============================================================
CREATE TABLE IF NOT EXISTS portfolio_items (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  short_description TEXT,
  category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
  related_product_id BIGINT REFERENCES products(id) ON DELETE SET NULL,

  client_name TEXT,                -- "ВТБ", "Брусника", "ЮКИОР"
  industry TEXT,                   -- "Банки", "Девелопмент", "Госсектор"
  location TEXT,                   -- "Ханты-Мансийск", "Сургут"
  year INT,
  project_date DATE,

  cover_url TEXT NOT NULL,
  images TEXT[] NOT NULL DEFAULT '{}',
  video_url TEXT,

  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_published BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,

  seo_title TEXT,
  seo_description TEXT,

  views_count INT NOT NULL DEFAULT 0,
  search_vector tsvector,

  -- Поля из 00002_portfolio_from_sanity.sql
  published_at TIMESTAMPTZ,
  category_label TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_portfolio_slug ON portfolio_items(slug);
CREATE INDEX IF NOT EXISTS idx_portfolio_category
  ON portfolio_items(category_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_industry
  ON portfolio_items(industry);
CREATE INDEX IF NOT EXISTS idx_portfolio_location
  ON portfolio_items(location);
CREATE INDEX IF NOT EXISTS idx_portfolio_featured
  ON portfolio_items(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_portfolio_published
  ON portfolio_items(is_published, sort_order);
CREATE INDEX IF NOT EXISTS idx_portfolio_search
  ON portfolio_items USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_portfolio_published_at
  ON portfolio_items(published_at DESC)
  WHERE is_published = true;

COMMENT ON COLUMN portfolio_items.published_at
  IS 'Дата публикации работы (импорт из Sanity publishedAt)';
COMMENT ON COLUMN portfolio_items.category_label
  IS 'Строковый лейбл категории (fallback если category_id NULL)';

-- ============================================================
-- 12. LEADS (универсальные — "купить в 1 клик", "перезвонить")
-- ============================================================
CREATE TABLE IF NOT EXISTS leads (
  id BIGSERIAL PRIMARY KEY,
  lead_number TEXT UNIQUE,
  source TEXT NOT NULL,            -- one_click | callback | hero_form | product_form
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,

  product_id BIGINT REFERENCES products(id) ON DELETE SET NULL,
  context JSONB,
  page_url TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  referer TEXT,
  user_agent TEXT,

  status lead_status NOT NULL DEFAULT 'new',
  manager_comment TEXT,
  -- FK на users(id) добавляется в 004_lucia_auth.sql
  assigned_to TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at DESC);

-- ============================================================
-- 13. CONTACT REQUESTS (форма "Связаться с нами")
-- ============================================================
CREATE TABLE IF NOT EXISTS contact_requests (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  subject TEXT,
  message TEXT NOT NULL,
  admin_reply TEXT,
  admin_reply_at TIMESTAMPTZ,
  status contact_status NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_contact_requests_status
  ON contact_requests(status);
CREATE INDEX IF NOT EXISTS idx_contact_requests_created
  ON contact_requests(created_at DESC);

-- ============================================================
-- 14. REVIEWS
-- ============================================================
CREATE TABLE IF NOT EXISTS reviews (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
  order_id BIGINT REFERENCES orders(id) ON DELETE SET NULL,
  portfolio_id BIGINT REFERENCES portfolio_items(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  author_email TEXT,
  author_company TEXT,
  author_position TEXT,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  text TEXT,
  pros TEXT,
  cons TEXT,
  images TEXT[] NOT NULL DEFAULT '{}',
  status review_status NOT NULL DEFAULT 'pending',
  is_featured BOOLEAN NOT NULL DEFAULT false,
  admin_reply TEXT,
  admin_reply_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_featured
  ON reviews(is_featured) WHERE is_featured = true;

-- ============================================================
-- 15. PROMO CODES
-- ============================================================
CREATE TABLE IF NOT EXISTS promo_codes (
  id BIGSERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  type promo_type NOT NULL,
  value NUMERIC(12,2) NOT NULL,
  min_order_amount NUMERIC(12,2),
  max_discount_amount NUMERIC(12,2),
  max_uses INT,
  max_uses_per_user INT,
  used_count INT NOT NULL DEFAULT 0,
  applies_to_category_ids BIGINT[] NOT NULL DEFAULT '{}',
  applies_to_product_ids BIGINT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  valid_from TIMESTAMPTZ,
  valid_to TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT check_percent CHECK (
    type != 'percent' OR (value > 0 AND value <= 100)
  )
);
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON promo_codes(is_active);

-- FK для orders.promo_code_id (после создания promo_codes)
DO $$ BEGIN
  ALTER TABLE orders
    ADD CONSTRAINT fk_orders_promo_code
    FOREIGN KEY (promo_code_id) REFERENCES promo_codes(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 16. CART ITEMS (для авторизованных)
-- ============================================================
-- FK на users(id) добавляется в 004_lucia_auth.sql.
CREATE TABLE IF NOT EXISTS cart_items (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id BIGINT REFERENCES product_variants(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  calc_params JSONB,
  price_snapshot NUMERIC(12,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cart_items_user ON cart_items(user_id);

-- ============================================================
-- 17. WISHLIST ITEMS
-- ============================================================
-- FK на users(id) добавляется в 004_lucia_auth.sql.
CREATE TABLE IF NOT EXISTS wishlist_items (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_wishlist_user ON wishlist_items(user_id);

-- ============================================================
-- 18. БЛОГ
-- ============================================================
CREATE TABLE IF NOT EXISTS blog_categories (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS blog_posts (
  id BIGSERIAL PRIMARY KEY,
  category_id BIGINT REFERENCES blog_categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT NOT NULL,
  cover_image_url TEXT,
  -- FK на users(id) добавляется в 004_lucia_auth.sql
  author_id TEXT,
  author_name TEXT,
  status post_status NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  seo_title TEXT,
  seo_description TEXT,
  seo_keywords TEXT,
  reading_time INT,
  views_count INT NOT NULL DEFAULT 0,
  tags TEXT[] NOT NULL DEFAULT '{}',
  search_vector tsvector,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published
  ON blog_posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category
  ON blog_posts(category_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_search
  ON blog_posts USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_blog_posts_tags
  ON blog_posts USING GIN(tags);

-- ============================================================
-- 19. CMS: BANNERS
-- ============================================================
CREATE TABLE IF NOT EXISTS banners (
  id BIGSERIAL PRIMARY KEY,
  title TEXT,
  subtitle TEXT,
  description TEXT,
  image_url TEXT NOT NULL,
  mobile_image_url TEXT,
  link TEXT,
  button_text TEXT,
  badge TEXT,
  position TEXT NOT NULL DEFAULT 'hero',  -- hero | promo | sidebar | category
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  active_from TIMESTAMPTZ,
  active_to TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_banners_position ON banners(position);
CREATE INDEX IF NOT EXISTS idx_banners_active ON banners(is_active);

-- ============================================================
-- 20. CMS: PAGES (статические страницы)
-- ============================================================
CREATE TABLE IF NOT EXISTS pages (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  excerpt TEXT,
  cover_url TEXT,
  seo_title TEXT,
  seo_description TEXT,
  seo_keywords TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  show_in_footer BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pages_slug ON pages(slug);

-- ============================================================
-- 21. CMS: MENU ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS menu_items (
  id BIGSERIAL PRIMARY KEY,
  parent_id BIGINT REFERENCES menu_items(id) ON DELETE CASCADE,
  position TEXT NOT NULL DEFAULT 'header',
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  icon TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  open_in_new_tab BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_menu_items_position ON menu_items(position);

-- ============================================================
-- 22. SETTINGS (key-value)
-- ============================================================
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  is_public BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 23. REDIRECTS (SEO)
-- ============================================================
CREATE TABLE IF NOT EXISTS redirects (
  id BIGSERIAL PRIMARY KEY,
  from_path TEXT NOT NULL UNIQUE,
  to_path TEXT NOT NULL,
  type INT NOT NULL DEFAULT 301,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_redirects_from ON redirects(from_path);

-- ============================================================
-- 24. SEO META
-- ============================================================
CREATE TABLE IF NOT EXISTS seo_meta (
  id BIGSERIAL PRIMARY KEY,
  path TEXT NOT NULL UNIQUE,
  title TEXT,
  description TEXT,
  keywords TEXT,
  og_title TEXT,
  og_description TEXT,
  og_image TEXT,
  noindex BOOLEAN NOT NULL DEFAULT false,
  canonical TEXT,
  schema_jsonld JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_seo_meta_path ON seo_meta(path);

-- ============================================================
-- 25. AUDIT LOG
-- ============================================================
-- FK на users(id) добавляется в 004_lucia_auth.sql.
CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT,
  action TEXT NOT NULL,            -- insert | update | delete | login | export
  table_name TEXT,
  record_id TEXT,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_table ON audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_created
  ON audit_log(created_at DESC);

-- ============================================================
-- Конец 002_schema.sql
-- ============================================================
