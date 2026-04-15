-- ============================================================
-- Рекламная компания «2х2» — Полная схема БД
-- Postgres 15+ / Supabase
-- Применяется в Supabase SQL Editor на чистом проекте.
-- ============================================================

-- Расширения
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- ============================================================
-- ENUM-типы
-- ============================================================
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('owner', 'manager', 'content');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE product_status AS ENUM ('active', 'draft', 'archived');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE product_pricing_mode AS ENUM ('fixed', 'calculator', 'quote');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE order_status AS ENUM (
    'new', 'confirmed', 'in_production', 'ready', 'shipped',
    'delivered', 'completed', 'cancelled', 'returned'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE order_type AS ENUM ('cart', 'one_click');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE review_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE promo_type AS ENUM ('fixed', 'percent');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE post_status AS ENUM ('draft', 'published', 'archived');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE calculation_status AS ENUM (
    'new', 'in_progress', 'quoted', 'approved', 'rejected'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE lead_status AS ENUM ('new', 'in_progress', 'done', 'spam');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE contact_status AS ENUM ('new', 'answered', 'closed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================================
-- 1. PROFILES (админы магазина)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'manager',
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- ============================================================
-- 2. КАТЕГОРИИ (древовидная структура услуг «2х2»)
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id BIGSERIAL PRIMARY KEY,
  parent_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,            -- имя иконки lucide
  image_url TEXT,
  cover_url TEXT,       -- обложка для страницы категории
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
-- 3. ТОВАРЫ/УСЛУГИ
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
  unit TEXT DEFAULT 'шт',                           -- единица измерения (шт/см/м²)

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

  attributes JSONB NOT NULL DEFAULT '{}'::jsonb,    -- произвольные характеристики
  tags TEXT[] NOT NULL DEFAULT '{}',

  seo_title TEXT,
  seo_description TEXT,
  seo_keywords TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  views_count INT NOT NULL DEFAULT 0,
  rating_avg NUMERIC(3,2) NOT NULL DEFAULT 0,
  reviews_count INT NOT NULL DEFAULT 0,

  -- Полнотекстовый поиск
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

-- ============================================================
-- 4. PRODUCT IMAGES
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
-- 5. PRODUCT VARIANTS
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
-- 6. ПАРАМЕТРЫ ТОВАРА (для калькулятора и фильтров)
-- ============================================================
CREATE TABLE IF NOT EXISTS product_parameters (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  key TEXT NOT NULL,              -- например "tiraj", "format", "material"
  label TEXT NOT NULL,            -- "Тираж", "Формат"
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
-- 7. КОНФИГУРАЦИЯ КАЛЬКУЛЯТОРА (формула для товара)
-- ============================================================
CREATE TABLE IF NOT EXISTS calculator_configs (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  -- formula: JSONB-описание формулы.
  -- Пример: { "type": "per_area", "base": 800, "min": 1500, "unit": "m2" }
  -- Поддерживаемые типы: per_unit, per_area, per_length, per_tiraj_tier
  formula JSONB NOT NULL,
  -- fields: массив описаний полей формы (ссылаются на product_parameters.key)
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
-- 8. ЗАЯВКИ НА РАСЧЁТ (для сложных услуг)
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

  params JSONB NOT NULL DEFAULT '{}'::jsonb,    -- параметры с формы
  attachments TEXT[] NOT NULL DEFAULT '{}',     -- URL файлов из storage
  comment TEXT,
  source_url TEXT,                              -- откуда отправлена форма

  status calculation_status NOT NULL DEFAULT 'new',
  manager_comment TEXT,
  quoted_amount NUMERIC(12,2),
  quoted_at TIMESTAMPTZ,
  assigned_to UUID REFERENCES profiles(id),

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
-- 9. ЗАКАЗЫ
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id BIGSERIAL PRIMARY KEY,
  order_number TEXT UNIQUE,
  type order_type NOT NULL DEFAULT 'cart',
  status order_status NOT NULL DEFAULT 'new',

  -- Клиент
  customer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
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

  -- Менеджер
  manager_comment TEXT,
  customer_comment TEXT,
  assigned_to UUID REFERENCES profiles(id),

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
-- 10. ПОЗИЦИИ ЗАКАЗА
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
  calc_params JSONB,               -- параметры из калькулятора
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- ============================================================
-- 11. ИСТОРИЯ СТАТУСОВ ЗАКАЗА
-- ============================================================
CREATE TABLE IF NOT EXISTS order_status_history (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status order_status NOT NULL,
  comment TEXT,
  changed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_order_status_history_order
  ON order_status_history(order_id);

-- ============================================================
-- 12. ПОРТФОЛИО (специфика рекламного агентства)
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

-- ============================================================
-- 13. ЛИДЫ (универсальные — "купить в 1 клик", "перезвонить")
-- ============================================================
CREATE TABLE IF NOT EXISTS leads (
  id BIGSERIAL PRIMARY KEY,
  lead_number TEXT UNIQUE,
  source TEXT NOT NULL,            -- one_click | callback | hero_form | product_form
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,

  product_id BIGINT REFERENCES products(id) ON DELETE SET NULL,
  context JSONB,                   -- произвольный контекст (название услуги, параметры и т.п.)
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
  assigned_to UUID REFERENCES profiles(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at DESC);

-- ============================================================
-- 14. ОБРАЩЕНИЯ ИЗ ФОРМЫ КОНТАКТОВ
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
-- 15. ОТЗЫВЫ
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
-- 16. ПРОМОКОДЫ
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

-- FK для orders.promo_code_id
DO $$ BEGIN
  ALTER TABLE orders
    ADD CONSTRAINT fk_orders_promo_code
    FOREIGN KEY (promo_code_id) REFERENCES promo_codes(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================================
-- 17. КОРЗИНА (для авторизованных)
-- ============================================================
CREATE TABLE IF NOT EXISTS cart_items (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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
-- 18. ИЗБРАННОЕ
-- ============================================================
CREATE TABLE IF NOT EXISTS wishlist_items (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_wishlist_user ON wishlist_items(user_id);

-- ============================================================
-- 19. БЛОГ
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
  author_id UUID REFERENCES profiles(id),
  author_name TEXT,                -- fallback если нет profile
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
-- 20. CMS: БАННЕРЫ
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
  badge TEXT,                      -- "АКЦИЯ", "НОВИНКА"
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
-- 21. CMS: СТАТИЧЕСКИЕ СТРАНИЦЫ
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
-- 22. CMS: МЕНЮ НАВИГАЦИИ
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
-- 23. НАСТРОЙКИ МАГАЗИНА (key-value)
-- ============================================================
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  is_public BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 24. REDIRECTS (SEO)
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
-- 25. SEO META (произвольные теги для любых страниц)
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
-- 26. AUDIT LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
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
-- ФУНКЦИИ И ТРИГГЕРЫ
-- ============================================================

-- updated_at
CREATE OR REPLACE FUNCTION trg_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'profiles','categories','products','product_variants','product_parameters',
    'calculator_configs','calculation_requests','orders','portfolio_items',
    'leads','contact_requests','reviews','promo_codes','cart_items',
    'blog_posts','banners','pages','settings','seo_meta'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS tr_%I_updated ON %I;', t, t
    );
    EXECUTE format(
      'CREATE TRIGGER tr_%I_updated BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION trg_update_updated_at();', t, t
    );
  END LOOP;
END $$;

-- Автогенерация order_number
CREATE OR REPLACE FUNCTION trg_orders_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL THEN
    NEW.order_number := 'ORD-' || LPAD(NEW.id::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_orders_number ON orders;
CREATE TRIGGER tr_orders_number
  BEFORE INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION trg_orders_number();

-- Постобработка: после вставки проставляем номер по id
CREATE OR REPLACE FUNCTION trg_orders_number_post()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = 'ORD-000000' THEN
    UPDATE orders SET order_number = 'ORD-' || LPAD(NEW.id::TEXT, 6, '0')
      WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_orders_number_post ON orders;
CREATE TRIGGER tr_orders_number_post
  AFTER INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION trg_orders_number_post();

-- Автогенерация calc request number
CREATE OR REPLACE FUNCTION trg_calc_request_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.request_number IS NULL THEN
    NEW.request_number := 'CR-' || LPAD(COALESCE(NEW.id, 0)::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trg_calc_request_number_post()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.request_number IS NULL OR NEW.request_number = 'CR-000000' THEN
    UPDATE calculation_requests
      SET request_number = 'CR-' || LPAD(NEW.id::TEXT, 6, '0')
      WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_calc_req_number ON calculation_requests;
CREATE TRIGGER tr_calc_req_number
  BEFORE INSERT ON calculation_requests
  FOR EACH ROW EXECUTE FUNCTION trg_calc_request_number();

DROP TRIGGER IF EXISTS tr_calc_req_number_post ON calculation_requests;
CREATE TRIGGER tr_calc_req_number_post
  AFTER INSERT ON calculation_requests
  FOR EACH ROW EXECUTE FUNCTION trg_calc_request_number_post();

-- Автогенерация lead number
CREATE OR REPLACE FUNCTION trg_lead_number_post()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.lead_number IS NULL THEN
    UPDATE leads SET lead_number = 'LEAD-' || LPAD(NEW.id::TEXT, 6, '0')
      WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_leads_number_post ON leads;
CREATE TRIGGER tr_leads_number_post
  AFTER INSERT ON leads
  FOR EACH ROW EXECUTE FUNCTION trg_lead_number_post();

-- Полнотекстовый поиск для products
CREATE OR REPLACE FUNCTION trg_products_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('russian', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('russian', coalesce(NEW.short_description, '')), 'B') ||
    setweight(to_tsvector('russian', coalesce(NEW.description, '')), 'C') ||
    setweight(to_tsvector('russian', coalesce(array_to_string(NEW.tags, ' '), '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_products_search ON products;
CREATE TRIGGER tr_products_search
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION trg_products_search_vector();

-- Полнотекстовый поиск для portfolio_items
CREATE OR REPLACE FUNCTION trg_portfolio_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('russian', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('russian', coalesce(NEW.short_description, '')), 'B') ||
    setweight(to_tsvector('russian', coalesce(NEW.description, '')), 'C') ||
    setweight(to_tsvector('russian', coalesce(NEW.client_name, '')), 'B') ||
    setweight(to_tsvector('russian', coalesce(NEW.industry, '')), 'B') ||
    setweight(to_tsvector('russian', coalesce(NEW.location, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_portfolio_search ON portfolio_items;
CREATE TRIGGER tr_portfolio_search
  BEFORE INSERT OR UPDATE ON portfolio_items
  FOR EACH ROW EXECUTE FUNCTION trg_portfolio_search_vector();

-- Полнотекстовый поиск для blog_posts
CREATE OR REPLACE FUNCTION trg_blog_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('russian', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('russian', coalesce(NEW.excerpt, '')), 'B') ||
    setweight(to_tsvector('russian', coalesce(NEW.content, '')), 'C') ||
    setweight(to_tsvector('russian', coalesce(array_to_string(NEW.tags, ' '), '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_blog_search ON blog_posts;
CREATE TRIGGER tr_blog_search
  BEFORE INSERT OR UPDATE ON blog_posts
  FOR EACH ROW EXECUTE FUNCTION trg_blog_search_vector();

-- Пересчёт рейтинга товара при изменении отзывов
CREATE OR REPLACE FUNCTION trg_recalc_product_rating()
RETURNS TRIGGER AS $$
DECLARE
  pid BIGINT;
BEGIN
  pid := COALESCE(NEW.product_id, OLD.product_id);
  IF pid IS NOT NULL THEN
    UPDATE products
      SET rating_avg = COALESCE((
            SELECT ROUND(AVG(rating)::numeric, 2)
            FROM reviews
            WHERE product_id = pid AND status = 'approved'
          ), 0),
          reviews_count = COALESCE((
            SELECT COUNT(*) FROM reviews
            WHERE product_id = pid AND status = 'approved'
          ), 0)
      WHERE id = pid;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_reviews_recalc ON reviews;
CREATE TRIGGER tr_reviews_recalc
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION trg_recalc_product_rating();

-- ============================================================
-- ХЕЛПЕР-ФУНКЦИИ ДЛЯ RLS
-- ============================================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND role IN ('owner', 'manager')
      AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION is_content_manager()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND role IN ('owner', 'manager', 'content')
      AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION is_owner()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'owner' AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories            ENABLE ROW LEVEL SECURITY;
ALTER TABLE products              ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images        ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants      ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_parameters    ENABLE ROW LEVEL SECURITY;
ALTER TABLE calculator_configs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE calculation_requests  ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders                ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items           ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history  ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_requests      ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews               ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items            ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_categories       ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners               ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items            ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings              ENABLE ROW LEVEL SECURITY;
ALTER TABLE redirects             ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_meta              ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log             ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS: ПУБЛИЧНОЕ ЧТЕНИЕ (витрина)
-- ============================================================
DROP POLICY IF EXISTS "public read categories" ON categories;
CREATE POLICY "public read categories" ON categories
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "public read products" ON products;
CREATE POLICY "public read products" ON products
  FOR SELECT USING (status = 'active' AND deleted_at IS NULL);

DROP POLICY IF EXISTS "public read product_images" ON product_images;
CREATE POLICY "public read product_images" ON product_images
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "public read product_variants" ON product_variants;
CREATE POLICY "public read product_variants" ON product_variants
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "public read product_parameters" ON product_parameters;
CREATE POLICY "public read product_parameters" ON product_parameters
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "public read calculator_configs" ON calculator_configs;
CREATE POLICY "public read calculator_configs" ON calculator_configs
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "public read portfolio" ON portfolio_items;
CREATE POLICY "public read portfolio" ON portfolio_items
  FOR SELECT USING (is_published = true);

DROP POLICY IF EXISTS "public read approved reviews" ON reviews;
CREATE POLICY "public read approved reviews" ON reviews
  FOR SELECT USING (status = 'approved');

DROP POLICY IF EXISTS "public read active promos" ON promo_codes;
CREATE POLICY "public read active promos" ON promo_codes
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "public read blog_categories" ON blog_categories;
CREATE POLICY "public read blog_categories" ON blog_categories
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "public read published posts" ON blog_posts;
CREATE POLICY "public read published posts" ON blog_posts
  FOR SELECT USING (status = 'published');

DROP POLICY IF EXISTS "public read active banners" ON banners;
CREATE POLICY "public read active banners" ON banners
  FOR SELECT USING (
    is_active = true
    AND (active_from IS NULL OR active_from <= now())
    AND (active_to   IS NULL OR active_to   >= now())
  );

DROP POLICY IF EXISTS "public read active pages" ON pages;
CREATE POLICY "public read active pages" ON pages
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "public read active menu" ON menu_items;
CREATE POLICY "public read active menu" ON menu_items
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "public read public settings" ON settings;
CREATE POLICY "public read public settings" ON settings
  FOR SELECT USING (is_public = true);

DROP POLICY IF EXISTS "public read redirects" ON redirects;
CREATE POLICY "public read redirects" ON redirects
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "public read seo_meta" ON seo_meta;
CREATE POLICY "public read seo_meta" ON seo_meta
  FOR SELECT USING (true);

-- ============================================================
-- RLS: ПУБЛИЧНАЯ ВСТАВКА (формы)
-- ============================================================
DROP POLICY IF EXISTS "public insert orders" ON orders;
CREATE POLICY "public insert orders" ON orders
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "public insert order_items" ON order_items;
CREATE POLICY "public insert order_items" ON order_items
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "public insert calc_requests" ON calculation_requests;
CREATE POLICY "public insert calc_requests" ON calculation_requests
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "public insert leads" ON leads;
CREATE POLICY "public insert leads" ON leads
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "public insert contact_requests" ON contact_requests;
CREATE POLICY "public insert contact_requests" ON contact_requests
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "public insert reviews" ON reviews;
CREATE POLICY "public insert reviews" ON reviews
  FOR INSERT WITH CHECK (status = 'pending');

-- ============================================================
-- RLS: ПОЛЬЗОВАТЕЛЬСКИЕ ТАБЛИЦЫ (своя корзина/вишлист/заказы)
-- ============================================================
DROP POLICY IF EXISTS "users manage own cart" ON cart_items;
CREATE POLICY "users manage own cart" ON cart_items
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "users manage own wishlist" ON wishlist_items;
CREATE POLICY "users manage own wishlist" ON wishlist_items
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "users read own orders" ON orders;
CREATE POLICY "users read own orders" ON orders
  FOR SELECT USING (customer_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "users read own profile" ON profiles;
CREATE POLICY "users read own profile" ON profiles
  FOR SELECT USING (id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "users update own profile" ON profiles;
CREATE POLICY "users update own profile" ON profiles
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- ============================================================
-- RLS: АДМИНСКИЙ ДОСТУП
-- ============================================================
DROP POLICY IF EXISTS "admin all profiles" ON profiles;
CREATE POLICY "admin all profiles" ON profiles
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin all categories" ON categories;
CREATE POLICY "admin all categories" ON categories
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin all products" ON products;
CREATE POLICY "admin all products" ON products
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin all product_images" ON product_images;
CREATE POLICY "admin all product_images" ON product_images
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin all product_variants" ON product_variants;
CREATE POLICY "admin all product_variants" ON product_variants
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin all product_parameters" ON product_parameters;
CREATE POLICY "admin all product_parameters" ON product_parameters
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin all calculator_configs" ON calculator_configs;
CREATE POLICY "admin all calculator_configs" ON calculator_configs
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin all calc_requests" ON calculation_requests;
CREATE POLICY "admin all calc_requests" ON calculation_requests
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin all orders" ON orders;
CREATE POLICY "admin all orders" ON orders
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin all order_items" ON order_items;
CREATE POLICY "admin all order_items" ON order_items
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin all order_status_history" ON order_status_history;
CREATE POLICY "admin all order_status_history" ON order_status_history
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin all leads" ON leads;
CREATE POLICY "admin all leads" ON leads
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin all contact_requests" ON contact_requests;
CREATE POLICY "admin all contact_requests" ON contact_requests
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin all reviews" ON reviews;
CREATE POLICY "admin all reviews" ON reviews
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin all promo_codes" ON promo_codes;
CREATE POLICY "admin all promo_codes" ON promo_codes
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin all redirects" ON redirects;
CREATE POLICY "admin all redirects" ON redirects
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin all settings" ON settings;
CREATE POLICY "admin all settings" ON settings
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin all seo_meta" ON seo_meta;
CREATE POLICY "admin all seo_meta" ON seo_meta
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin read audit_log" ON audit_log;
CREATE POLICY "admin read audit_log" ON audit_log
  FOR SELECT USING (is_admin());

-- Контент-менеджер: блог, баннеры, страницы, меню, портфолио
DROP POLICY IF EXISTS "content all blog_posts" ON blog_posts;
CREATE POLICY "content all blog_posts" ON blog_posts
  FOR ALL USING (is_content_manager()) WITH CHECK (is_content_manager());

DROP POLICY IF EXISTS "content all blog_categories" ON blog_categories;
CREATE POLICY "content all blog_categories" ON blog_categories
  FOR ALL USING (is_content_manager()) WITH CHECK (is_content_manager());

DROP POLICY IF EXISTS "content all banners" ON banners;
CREATE POLICY "content all banners" ON banners
  FOR ALL USING (is_content_manager()) WITH CHECK (is_content_manager());

DROP POLICY IF EXISTS "content all pages" ON pages;
CREATE POLICY "content all pages" ON pages
  FOR ALL USING (is_content_manager()) WITH CHECK (is_content_manager());

DROP POLICY IF EXISTS "content all menu_items" ON menu_items;
CREATE POLICY "content all menu_items" ON menu_items
  FOR ALL USING (is_content_manager()) WITH CHECK (is_content_manager());

DROP POLICY IF EXISTS "content all portfolio" ON portfolio_items;
CREATE POLICY "content all portfolio" ON portfolio_items
  FOR ALL USING (is_content_manager()) WITH CHECK (is_content_manager());

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
  VALUES ('products', 'products', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public)
  VALUES ('portfolio', 'portfolio', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public)
  VALUES ('blog', 'blog', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public)
  VALUES ('banners', 'banners', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public)
  VALUES ('content', 'content', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public)
  VALUES ('reviews', 'reviews', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public)
  VALUES ('attachments', 'attachments', false) ON CONFLICT DO NOTHING;

-- Storage-политики: публичное чтение + авторизованная загрузка
DO $$
DECLARE b TEXT;
BEGIN
  FOR b IN SELECT unnest(ARRAY['products','portfolio','blog','banners','content','reviews']) LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS "public read %1$s" ON storage.objects;', b
    );
    EXECUTE format(
      'CREATE POLICY "public read %1$s" ON storage.objects
         FOR SELECT USING (bucket_id = %2$L);', b, b
    );
    EXECUTE format(
      'DROP POLICY IF EXISTS "auth upload %1$s" ON storage.objects;', b
    );
    EXECUTE format(
      'CREATE POLICY "auth upload %1$s" ON storage.objects
         FOR INSERT TO authenticated WITH CHECK (bucket_id = %2$L);', b, b
    );
    EXECUTE format(
      'DROP POLICY IF EXISTS "auth update %1$s" ON storage.objects;', b
    );
    EXECUTE format(
      'CREATE POLICY "auth update %1$s" ON storage.objects
         FOR UPDATE TO authenticated USING (bucket_id = %2$L);', b, b
    );
    EXECUTE format(
      'DROP POLICY IF EXISTS "auth delete %1$s" ON storage.objects;', b
    );
    EXECUTE format(
      'CREATE POLICY "auth delete %1$s" ON storage.objects
         FOR DELETE TO authenticated USING (bucket_id = %2$L);', b, b
    );
  END LOOP;
END $$;

-- Аттачменты (calculation_requests): публичная вставка, только админ читает
DROP POLICY IF EXISTS "public insert attachments" ON storage.objects;
CREATE POLICY "public insert attachments" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'attachments');

DROP POLICY IF EXISTS "admin read attachments" ON storage.objects;
CREATE POLICY "admin read attachments" ON storage.objects
  FOR SELECT USING (bucket_id = 'attachments' AND is_admin());

-- ============================================================
-- RPC: поиск товаров
-- ============================================================
CREATE OR REPLACE FUNCTION search_products(
  q TEXT,
  p_category_slug TEXT DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS SETOF products AS $$
  SELECT p.*
  FROM products p
  LEFT JOIN categories c ON p.category_id = c.id
  WHERE p.status = 'active'
    AND p.deleted_at IS NULL
    AND (p_category_slug IS NULL OR c.slug = p_category_slug)
    AND (
      q IS NULL OR q = '' OR
      p.search_vector @@ plainto_tsquery('russian', q) OR
      p.name ILIKE '%' || q || '%'
    )
  ORDER BY
    CASE WHEN q IS NOT NULL AND q <> ''
         THEN ts_rank(p.search_vector, plainto_tsquery('russian', q))
         ELSE 0 END DESC,
    p.is_featured DESC,
    p.sort_order ASC,
    p.created_at DESC
  LIMIT p_limit OFFSET p_offset;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- Автосоздание profile при регистрации в auth.users
-- ============================================================
CREATE OR REPLACE FUNCTION trg_handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'manager'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION trg_handle_new_user();

-- ============================================================
-- RPC: дерево категорий с подсчётом товаров
-- ============================================================
CREATE OR REPLACE FUNCTION get_category_tree()
RETURNS TABLE (
  id BIGINT,
  parent_id BIGINT,
  name TEXT,
  slug TEXT,
  description TEXT,
  icon TEXT,
  image_url TEXT,
  is_featured BOOLEAN,
  sort_order INT,
  products_count BIGINT,
  depth INT
) AS $$
  WITH RECURSIVE tree AS (
    SELECT c.id, c.parent_id, c.name, c.slug, c.description,
           c.icon, c.image_url, c.is_featured, c.sort_order,
           0 AS depth
    FROM categories c
    WHERE c.parent_id IS NULL AND c.is_active = true
    UNION ALL
    SELECT c.id, c.parent_id, c.name, c.slug, c.description,
           c.icon, c.image_url, c.is_featured, c.sort_order,
           t.depth + 1
    FROM categories c
    JOIN tree t ON c.parent_id = t.id
    WHERE c.is_active = true
  )
  SELECT t.id, t.parent_id, t.name, t.slug, t.description,
         t.icon, t.image_url, t.is_featured, t.sort_order,
         COALESCE(cnt.c, 0) AS products_count,
         t.depth
  FROM tree t
  LEFT JOIN (
    SELECT category_id, COUNT(*) AS c
    FROM products
    WHERE status = 'active' AND deleted_at IS NULL
    GROUP BY category_id
  ) cnt ON cnt.category_id = t.id
  ORDER BY t.depth, t.sort_order;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- RPC: фасетные фильтры для каталога
-- ============================================================
CREATE OR REPLACE FUNCTION get_product_facets(
  p_category_id BIGINT DEFAULT NULL,
  p_search TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  base_filter TEXT := 'status = ''active'' AND deleted_at IS NULL';
BEGIN
  IF p_category_id IS NOT NULL THEN
    base_filter := base_filter || ' AND category_id = ' || p_category_id;
  END IF;

  IF p_search IS NOT NULL AND p_search <> '' THEN
    base_filter := base_filter || ' AND (search_vector @@ plainto_tsquery(''russian'', ' || quote_literal(p_search) || ') OR name ILIKE ''%' || replace(p_search, '''', '''''') || '%'')';
  END IF;

  EXECUTE format('
    SELECT jsonb_build_object(
      ''price_range'', (
        SELECT jsonb_build_object(
          ''min'', COALESCE(MIN(price), 0),
          ''max'', COALESCE(MAX(price), 0)
        ) FROM products WHERE %s
      ),
      ''pricing_modes'', (
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
          ''value'', pm, ''count'', c
        )), ''[]''::jsonb)
        FROM (
          SELECT pricing_mode::text AS pm, COUNT(*) AS c
          FROM products WHERE %s
          GROUP BY pricing_mode ORDER BY c DESC
        ) sub
      ),
      ''brands'', (
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
          ''value'', b, ''count'', c
        )), ''[]''::jsonb)
        FROM (
          SELECT brand AS b, COUNT(*) AS c
          FROM products WHERE %s AND brand IS NOT NULL AND brand <> ''''
          GROUP BY brand ORDER BY c DESC LIMIT 30
        ) sub
      ),
      ''tags'', (
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
          ''value'', tag, ''count'', c
        )), ''[]''::jsonb)
        FROM (
          SELECT unnest(tags) AS tag, COUNT(*) AS c
          FROM products WHERE %s
          GROUP BY tag ORDER BY c DESC LIMIT 30
        ) sub
      ),
      ''has_installation'', (
        SELECT COUNT(*) FROM products
        WHERE %s AND has_installation = true
      ),
      ''is_new'', (
        SELECT COUNT(*) FROM products
        WHERE %s AND is_new = true
      ),
      ''is_on_sale'', (
        SELECT COUNT(*) FROM products
        WHERE %s AND is_on_sale = true
      ),
      ''total_count'', (
        SELECT COUNT(*) FROM products WHERE %s
      )
    )',
    base_filter, base_filter, base_filter, base_filter,
    base_filter, base_filter, base_filter, base_filter
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================
-- RPC: статистика для дашборда админки
-- ============================================================
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS JSONB AS $$
  SELECT jsonb_build_object(
    'orders_today', (
      SELECT COUNT(*) FROM orders
      WHERE created_at >= CURRENT_DATE
    ),
    'orders_week', (
      SELECT COUNT(*) FROM orders
      WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
    ),
    'orders_month', (
      SELECT COUNT(*) FROM orders
      WHERE created_at >= date_trunc('month', CURRENT_DATE)
    ),
    'revenue_today', (
      SELECT COALESCE(SUM(total), 0) FROM orders
      WHERE created_at >= CURRENT_DATE
        AND payment_status = 'paid'
    ),
    'revenue_week', (
      SELECT COALESCE(SUM(total), 0) FROM orders
      WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
        AND payment_status = 'paid'
    ),
    'revenue_month', (
      SELECT COALESCE(SUM(total), 0) FROM orders
      WHERE created_at >= date_trunc('month', CURRENT_DATE)
        AND payment_status = 'paid'
    ),
    'new_orders', (
      SELECT COUNT(*) FROM orders WHERE status = 'new'
    ),
    'new_calc_requests', (
      SELECT COUNT(*) FROM calculation_requests WHERE status = 'new'
    ),
    'new_leads', (
      SELECT COUNT(*) FROM leads WHERE status = 'new'
    ),
    'new_contacts', (
      SELECT COUNT(*) FROM contact_requests WHERE status = 'new'
    ),
    'pending_reviews', (
      SELECT COUNT(*) FROM reviews WHERE status = 'pending'
    ),
    'products_active', (
      SELECT COUNT(*) FROM products
      WHERE status = 'active' AND deleted_at IS NULL
    ),
    'products_draft', (
      SELECT COUNT(*) FROM products WHERE status = 'draft'
    ),
    'portfolio_count', (
      SELECT COUNT(*) FROM portfolio_items WHERE is_published = true
    ),
    'recent_orders', (
      SELECT COALESCE(jsonb_agg(sub ORDER BY sub.created_at DESC), '[]'::jsonb)
      FROM (
        SELECT id, order_number, customer_name, total, status,
               payment_status, created_at
        FROM orders ORDER BY created_at DESC LIMIT 5
      ) sub
    )
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- RPC: калькулятор стоимости
-- ============================================================
CREATE OR REPLACE FUNCTION calculate_product_price(
  p_product_id BIGINT,
  p_params JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB AS $$
DECLARE
  cfg RECORD;
  formula_type TEXT;
  base_price NUMERIC(12,2);
  computed_price NUMERIC(12,2);
  min_price NUMERIC(12,2);
  breakdown JSONB := '[]'::jsonb;
  param RECORD;
  modifier NUMERIC(12,2);
BEGIN
  SELECT cc.*, p.price AS product_price, p.name AS product_name
  INTO cfg
  FROM calculator_configs cc
  JOIN products p ON p.id = cc.product_id
  WHERE cc.product_id = p_product_id AND cc.is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Calculator not configured for this product'
    );
  END IF;

  formula_type := cfg.formula->>'type';
  base_price := COALESCE((cfg.formula->>'unit_price')::numeric, cfg.product_price);
  min_price := COALESCE(
    cfg.min_price,
    (cfg.formula->>'min_price')::numeric,
    0
  );

  CASE formula_type
    WHEN 'per_unit' THEN
      computed_price := base_price *
        COALESCE((p_params->>'quantity')::numeric, 1);
      breakdown := breakdown || jsonb_build_array(jsonb_build_object(
        'label', 'Количество',
        'value', COALESCE((p_params->>'quantity')::numeric, 1),
        'price_delta', computed_price
      ));

    WHEN 'per_area' THEN
      DECLARE
        w NUMERIC := COALESCE((p_params->>'width')::numeric, 1);
        h NUMERIC := COALESCE((p_params->>'height')::numeric, 1);
        area NUMERIC := w * h;
      BEGIN
        computed_price := base_price * area;
        breakdown := breakdown || jsonb_build_array(jsonb_build_object(
          'label', 'Площадь',
          'value', ROUND(area, 2)::text || ' м²',
          'price_delta', computed_price
        ));
      END;

    WHEN 'per_length' THEN
      DECLARE
        letter_h NUMERIC := COALESCE((p_params->>'letter_height')::numeric, 50);
        letters_n NUMERIC := COALESCE((p_params->>'letters_count')::numeric, 1);
      BEGIN
        computed_price := base_price * letter_h * letters_n;
        breakdown := breakdown || jsonb_build_array(jsonb_build_object(
          'label', 'Буквы',
          'value', letters_n::text || ' шт × ' || letter_h::text || ' см',
          'price_delta', computed_price
        ));
      END;

    WHEN 'per_tiraj_tier' THEN
      DECLARE
        qty NUMERIC := COALESCE((p_params->>'tiraj')::numeric, (p_params->>'quantity')::numeric, 1000);
      BEGIN
        computed_price := base_price * qty;
        breakdown := breakdown || jsonb_build_array(jsonb_build_object(
          'label', 'Тираж',
          'value', qty::text || ' шт',
          'price_delta', computed_price
        ));
      END;

    ELSE
      computed_price := base_price;
  END CASE;

  FOR param IN
    SELECT pp.key, pp.label, pp.options, pp.affects_price
    FROM product_parameters pp
    WHERE pp.product_id = p_product_id
      AND pp.affects_price = true
      AND pp.options IS NOT NULL
  LOOP
    IF p_params ? param.key THEN
      SELECT COALESCE((opt->>'price_modifier')::numeric, 0)
      INTO modifier
      FROM jsonb_array_elements(param.options) AS opt
      WHERE opt->>'value' = (p_params->>param.key)
      LIMIT 1;

      IF modifier IS NOT NULL AND modifier <> 0 THEN
        DECLARE
          delta NUMERIC := computed_price * modifier;
        BEGIN
          computed_price := computed_price + delta;
          breakdown := breakdown || jsonb_build_array(jsonb_build_object(
            'label', param.label,
            'value', p_params->>param.key,
            'price_delta', ROUND(delta, 2)
          ));
        END;
      END IF;
    END IF;
  END LOOP;

  IF computed_price < min_price THEN
    computed_price := min_price;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'product_id', p_product_id,
    'product_name', cfg.product_name,
    'base_price', ROUND(base_price, 2),
    'total', ROUND(computed_price, 2),
    'min_price', ROUND(min_price, 2),
    'currency', COALESCE(cfg.currency, 'RUB'),
    'breakdown', breakdown,
    'notes', cfg.notes
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================
-- RPC: вставка записи в audit_log
-- ============================================================
CREATE OR REPLACE FUNCTION log_admin_action(
  p_action TEXT,
  p_table_name TEXT DEFAULT NULL,
  p_record_id TEXT DEFAULT NULL,
  p_old_data JSONB DEFAULT NULL,
  p_new_data JSONB DEFAULT NULL,
  p_ip TEXT DEFAULT NULL,
  p_ua TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO audit_log (user_id, action, table_name, record_id, old_data, new_data, ip_address, user_agent)
  VALUES (auth.uid(), p_action, p_table_name, p_record_id, p_old_data, p_new_data, p_ip, p_ua);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Конец schema.sql
-- ============================================================
