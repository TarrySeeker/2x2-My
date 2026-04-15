-- ============================================================
-- Миграция 00003: доработки каталога для Этапа 2
-- Рекламная компания «2х2» / Supabase PostgreSQL
-- ============================================================
-- Применяется после 00001_initial_schema.sql и 00002_portfolio_from_sanity.sql.
--
-- Что делает:
--   1. Заменяет calculate_product_price — надёжный расчёт для всех
--      формул per_unit / per_area / per_length / per_tiraj_tier,
--      включая выбор ступени тиража и fallback на product.price.
--   2. Добавляет RPC get_related_products() — похожие товары для
--      карточки товара.
--   3. Добавляет RPC list_products() — пагинация/сортировка/фильтры
--      в одном запросе для /catalog.
--   4. Добавляет композитный индекс (category_id, sort_order) для
--      быстрого отображения списков каталога.
-- ============================================================

-- ------------------------------------------------------------
-- Индекс для каталога (сортировка по sort_order внутри категории)
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_products_cat_sort
  ON products (category_id, sort_order)
  WHERE status = 'active' AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_products_active_sort
  ON products (sort_order)
  WHERE status = 'active' AND deleted_at IS NULL;

-- ------------------------------------------------------------
-- RPC: calculate_product_price (фикс)
-- ------------------------------------------------------------
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
  tier JSONB;
  matched_tier JSONB;
BEGIN
  SELECT cc.formula, cc.min_price, cc.currency, cc.notes,
         p.price AS product_price, p.name AS product_name
  INTO cfg
  FROM calculator_configs cc
  JOIN products p ON p.id = cc.product_id
  WHERE cc.product_id = p_product_id AND cc.is_active = true;

  IF NOT FOUND THEN
    -- Fallback: товар без калькулятора, возвращаем базовую цену
    SELECT price, name INTO base_price, cfg.product_name
    FROM products
    WHERE id = p_product_id AND status = 'active' AND deleted_at IS NULL;

    IF base_price IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Product not found or inactive'
      );
    END IF;

    RETURN jsonb_build_object(
      'success', true,
      'product_id', p_product_id,
      'product_name', cfg.product_name,
      'base_price', base_price,
      'total', base_price,
      'min_price', base_price,
      'currency', 'RUB',
      'breakdown', jsonb_build_array(jsonb_build_object(
        'label', 'Базовая стоимость',
        'value', '',
        'price_delta', base_price
      )),
      'notes', 'Фиксированная цена товара'
    );
  END IF;

  formula_type := cfg.formula->>'type';

  -- Базовая цена: unit_price → base → product.price
  base_price := COALESCE(
    (cfg.formula->>'unit_price')::numeric,
    (cfg.formula->>'base')::numeric,
    cfg.product_price
  );

  min_price := COALESCE(
    cfg.min_price,
    (cfg.formula->>'min_price')::numeric,
    (cfg.formula->>'min')::numeric,
    0
  );

  CASE formula_type
    -- ----------------------------------------------------
    -- per_unit: цена за штуку * количество
    -- ----------------------------------------------------
    WHEN 'per_unit' THEN
      DECLARE
        qty NUMERIC := COALESCE(
          (p_params->>'quantity')::numeric,
          (p_params->>'qty')::numeric,
          1
        );
      BEGIN
        computed_price := base_price * qty;
        breakdown := breakdown || jsonb_build_array(jsonb_build_object(
          'label', 'Количество',
          'value', qty::text || ' шт',
          'price_delta', ROUND(computed_price, 2)
        ));
      END;

    -- ----------------------------------------------------
    -- per_area: цена за м² * (width * height)
    -- ----------------------------------------------------
    WHEN 'per_area' THEN
      DECLARE
        w NUMERIC := COALESCE((p_params->>'width')::numeric, 1);
        h NUMERIC := COALESCE((p_params->>'height')::numeric, 1);
        area NUMERIC := w * h;
      BEGIN
        computed_price := base_price * area;
        breakdown := breakdown || jsonb_build_array(jsonb_build_object(
          'label', 'Площадь',
          'value', ROUND(area, 2)::text || ' м² (' || w::text || '×' || h::text || ')',
          'price_delta', ROUND(computed_price, 2)
        ));
      END;

    -- ----------------------------------------------------
    -- per_length: цена за см периметра
    -- Поддерживает: параметр perimeter ИЛИ letter_height+letters_count
    -- ----------------------------------------------------
    WHEN 'per_length' THEN
      DECLARE
        perim NUMERIC;
      BEGIN
        IF p_params ? 'perimeter' THEN
          perim := (p_params->>'perimeter')::numeric;
        ELSIF p_params ? 'length' THEN
          perim := (p_params->>'length')::numeric;
        ELSE
          perim := COALESCE((p_params->>'letter_height')::numeric, 50)
                 * COALESCE((p_params->>'letters_count')::numeric, 1);
        END IF;

        computed_price := base_price * perim;
        breakdown := breakdown || jsonb_build_array(jsonb_build_object(
          'label', 'Периметр',
          'value', perim::text || ' см × ' || base_price::text || ' ₽',
          'price_delta', ROUND(computed_price, 2)
        ));
      END;

    -- ----------------------------------------------------
    -- per_tiraj_tier: выбираем ближайшую ступень тиража
    -- ----------------------------------------------------
    WHEN 'per_tiraj_tier' THEN
      DECLARE
        qty NUMERIC := COALESCE(
          (p_params->>'tiraj')::numeric,
          (p_params->>'quantity')::numeric,
          (p_params->>'qty')::numeric,
          1000
        );
      BEGIN
        matched_tier := NULL;
        -- Ищем точное или ближайшее совпадение по qty (наименьший tier.qty >= qty)
        FOR tier IN SELECT * FROM jsonb_array_elements(cfg.formula->'tiers')
        LOOP
          IF (tier->>'qty')::numeric >= qty THEN
            IF matched_tier IS NULL OR
               (tier->>'qty')::numeric < (matched_tier->>'qty')::numeric THEN
              matched_tier := tier;
            END IF;
          END IF;
        END LOOP;

        -- Если все ступени меньше запрошенного тиража — берём максимальную
        IF matched_tier IS NULL THEN
          FOR tier IN SELECT * FROM jsonb_array_elements(cfg.formula->'tiers')
          LOOP
            IF matched_tier IS NULL OR
               (tier->>'qty')::numeric > (matched_tier->>'qty')::numeric THEN
              matched_tier := tier;
            END IF;
          END LOOP;
        END IF;

        IF matched_tier IS NOT NULL THEN
          computed_price := (matched_tier->>'price')::numeric;
          breakdown := breakdown || jsonb_build_array(jsonb_build_object(
            'label', 'Тираж',
            'value', (matched_tier->>'qty')::text || ' шт',
            'price_delta', ROUND(computed_price, 2)
          ));
        ELSE
          computed_price := base_price * qty;
          breakdown := breakdown || jsonb_build_array(jsonb_build_object(
            'label', 'Тираж (fallback)',
            'value', qty::text || ' шт',
            'price_delta', ROUND(computed_price, 2)
          ));
        END IF;
      END;

    ELSE
      computed_price := base_price;
      breakdown := breakdown || jsonb_build_array(jsonb_build_object(
        'label', 'Базовая стоимость',
        'value', '',
        'price_delta', ROUND(base_price, 2)
      ));
  END CASE;

  -- ------------------------------------------------
  -- Модификаторы от product_parameters (опции select с price_modifier)
  -- ------------------------------------------------
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

  -- Применяем минимальную цену
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

-- ------------------------------------------------------------
-- RPC: get_related_products — похожие товары из той же категории
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_related_products(
  p_product_id BIGINT,
  p_limit INT DEFAULT 4
)
RETURNS SETOF products AS $$
  SELECT p.*
  FROM products p
  WHERE p.status = 'active'
    AND p.deleted_at IS NULL
    AND p.id <> p_product_id
    AND p.category_id = (
      SELECT category_id FROM products WHERE id = p_product_id
    )
  ORDER BY p.is_featured DESC, p.sort_order ASC, p.created_at DESC
  LIMIT p_limit;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ------------------------------------------------------------
-- RPC: list_products — каталожный листинг с фильтрами и пагинацией
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION list_products(
  p_category_slug TEXT DEFAULT NULL,
  p_pricing_mode  TEXT DEFAULT NULL,
  p_price_min     NUMERIC DEFAULT NULL,
  p_price_max     NUMERIC DEFAULT NULL,
  p_search        TEXT DEFAULT NULL,
  p_sort          TEXT DEFAULT 'popular', -- popular|price_asc|price_desc|newest
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
  price_from BOOLEAN,
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
      p.pricing_mode, p.price, p.price_from, p.unit,
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
    f.pricing_mode, f.price, f.price_from, f.unit,
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
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ------------------------------------------------------------
-- Разрешаем вызов RPC анонимным/authenticated пользователям
-- (SECURITY DEFINER уже защищает от прав на таблицы)
-- ------------------------------------------------------------
GRANT EXECUTE ON FUNCTION calculate_product_price(BIGINT, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_related_products(BIGINT, INT)      TO anon, authenticated;
GRANT EXECUTE ON FUNCTION list_products(TEXT, TEXT, NUMERIC, NUMERIC, TEXT, TEXT, INT, INT)
  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION search_products(TEXT, TEXT, INT, INT)  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_category_tree()                    TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_product_facets(BIGINT, TEXT)       TO anon, authenticated;

-- ============================================================
-- Конец 00003_catalog_phase2.sql
-- ============================================================
