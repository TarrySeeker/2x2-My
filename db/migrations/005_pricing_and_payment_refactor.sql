-- ============================================================
-- 005_pricing_and_payment_refactor.sql
-- Chain 4a: индивидуальный расчёт + банковский перевод
-- ------------------------------------------------------------
-- Бизнес:
--   1) Цены в каталоге — это диапазон «от X до Y» (price..price_to).
--      Булевый флаг price_from БОЛЬШЕ НЕ НУЖЕН — UX строится на
--      pricing_mode и наличии price_to.
--   2) Онлайн-оплата выпиливается. Никаких payment_url /
--      payment_order_number в orders. Оплата = банковский перевод
--      (счёт от менеджера) или наличные (самовывоз).
--
-- Forward-only. Идемпотентно (IF EXISTS / IF NOT EXISTS).
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. products: убираем price_from BOOLEAN, добавляем price_to
-- ------------------------------------------------------------
ALTER TABLE products
  DROP COLUMN IF EXISTS price_from;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS price_to NUMERIC(12,2) NULL;

-- price_to (если задан) должен быть >= price.
-- Constraint вешаем NOT VALID-style — но через DO-блок,
-- чтобы повторный запуск не падал.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'products_price_to_check'
  ) THEN
    ALTER TABLE products
      ADD CONSTRAINT products_price_to_check
      CHECK (price_to IS NULL OR price_to >= price);
  END IF;
END $$;

-- Индекс пригодится для сортировок «цена до» (необязательно, но дёшево).
CREATE INDEX IF NOT EXISTS idx_products_price_to
  ON products(price_to) WHERE price_to IS NOT NULL;

COMMENT ON COLUMN products.price IS 'Нижняя граница цены, "от X" в каталоге.';
COMMENT ON COLUMN products.price_to IS 'Верхняя граница диапазона, NULL = показывать только "от price".';


-- ------------------------------------------------------------
-- 2. orders: выпиливаем онлайн-платёжные поля,
--    добавляем CHECK на допустимые значения payment_method/status.
-- ------------------------------------------------------------
ALTER TABLE orders
  DROP COLUMN IF EXISTS payment_url,
  DROP COLUMN IF EXISTS payment_order_number;

-- metadata jsonb — для произвольной служебной инфы:
--   { "requisites": { "company": "...", "inn": "...", "kpp": "..." } }
-- Заполняется менеджером в админке (Chain 4a frontend).
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Допустимые методы оплаты: банковский перевод (по умолчанию)
-- или наличные при самовывозе.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'orders_payment_method_check'
  ) THEN
    ALTER TABLE orders
      ADD CONSTRAINT orders_payment_method_check
      CHECK (
        payment_method IS NULL
        OR payment_method IN ('bank_transfer', 'cash')
      );
  END IF;
END $$;

-- Статусы платежа в реальном workflow:
--   pending   — ждём согласования / счёта
--   invoiced  — счёт выставлен клиенту
--   paid      — оплата зачислена
--   cancelled — отменён до оплаты
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'orders_payment_status_check'
  ) THEN
    ALTER TABLE orders
      ADD CONSTRAINT orders_payment_status_check
      CHECK (payment_status IN ('pending', 'invoiced', 'paid', 'cancelled'));
  END IF;
END $$;

COMMENT ON COLUMN orders.payment_method IS 'Метод оплаты: bank_transfer | cash. NULL = ещё не определён.';
COMMENT ON COLUMN orders.payment_status IS 'pending | invoiced | paid | cancelled. Двигает менеджер из админки.';
COMMENT ON COLUMN orders.metadata IS 'Произвольный JSON: requisites юрлица (ИНН/КПП/название), служебные пометки менеджера.';


-- ------------------------------------------------------------
-- 3. RPC list_products — обновляем сигнатуру: price_from -> price_to
--    DROP+CREATE, потому что меняется тип возвращаемой колонки.
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS list_products(TEXT, TEXT, NUMERIC, NUMERIC, TEXT, TEXT, INT, INT);

CREATE OR REPLACE FUNCTION list_products(
  p_category_slug TEXT DEFAULT NULL,
  p_pricing_mode  TEXT DEFAULT NULL,
  p_price_min     NUMERIC DEFAULT NULL,
  p_price_max     NUMERIC DEFAULT NULL,
  p_search        TEXT DEFAULT NULL,
  p_sort          TEXT DEFAULT 'popular',
  p_limit         INT  DEFAULT 24,
  p_offset        INT  DEFAULT 0
)
RETURNS TABLE (
  id BIGINT,
  category_id BIGINT,
  name TEXT,
  slug TEXT,
  short_description TEXT,
  pricing_mode product_pricing_mode,
  price NUMERIC,
  price_to NUMERIC,
  unit TEXT,
  is_featured BOOLEAN,
  is_new BOOLEAN,
  has_installation BOOLEAN,
  rating_avg NUMERIC,
  reviews_count INT,
  image_url TEXT,
  category_slug TEXT,
  category_name TEXT,
  total_count BIGINT
) AS $$
  WITH filtered AS (
    SELECT
      p.id, p.category_id, p.name, p.slug, p.short_description,
      p.pricing_mode, p.price, p.price_to, p.unit,
      p.is_featured, p.is_new, p.has_installation,
      p.rating_avg, p.reviews_count, p.sort_order, p.views_count,
      p.created_at, p.is_on_sale,
      c.slug AS category_slug,
      c.name AS category_name,
      (SELECT url FROM product_images pi
         WHERE pi.product_id = p.id
         ORDER BY pi.is_primary DESC, pi.sort_order ASC
         LIMIT 1) AS image_url
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE p.status = 'active'
      AND p.deleted_at IS NULL
      AND (p_category_slug IS NULL OR c.slug = p_category_slug)
      AND (p_pricing_mode IS NULL OR p.pricing_mode::text = p_pricing_mode)
      AND (p_price_min IS NULL OR p.price >= p_price_min)
      AND (p_price_max IS NULL OR p.price <= p_price_max)
      AND (
        p_search IS NULL OR p_search = '' OR
        p.search_vector @@ plainto_tsquery('russian', p_search) OR
        p.name ILIKE '%' || p_search || '%'
      )
  ),
  total AS (SELECT COUNT(*) AS cnt FROM filtered)
  SELECT
    f.id, f.category_id, f.name, f.slug, f.short_description,
    f.pricing_mode, f.price, f.price_to, f.unit,
    f.is_featured, f.is_new, f.has_installation,
    f.rating_avg, f.reviews_count, f.image_url,
    f.category_slug, f.category_name,
    (SELECT cnt FROM total) AS total_count
  FROM filtered f
  ORDER BY
    CASE WHEN p_sort = 'price_asc'  THEN f.price END ASC  NULLS LAST,
    CASE WHEN p_sort = 'price_desc' THEN f.price END DESC NULLS LAST,
    CASE WHEN p_sort = 'newest'     THEN f.created_at END DESC NULLS LAST,
    CASE WHEN p_sort = 'popular'    THEN f.is_featured END DESC NULLS LAST,
    CASE WHEN p_sort = 'popular'    THEN f.views_count END DESC NULLS LAST,
    f.sort_order ASC,
    f.id ASC
  LIMIT p_limit OFFSET p_offset;
$$ LANGUAGE sql STABLE;

COMMIT;
