-- ============================================================
-- 003_triggers_and_functions.sql
-- Триггеры и RPC-функции проекта «2х2»
-- ============================================================
-- Применяется ПОСЛЕ 002_schema.sql.
--
-- Отличия от Supabase-версии:
--   * Удалены is_admin() / is_owner() / is_content_manager() — это
--     RLS-хелперы, использовавшие auth.uid().
--   * Удалён trg_handle_new_user() и триггер на auth.users —
--     Supabase-специфика. У Lucia пользователи создаются
--     приложением напрямую в users.
--   * Из всех RPC удалён SECURITY DEFINER (нет ролей anon/authenticated,
--     нет RLS — функции выполняются от имени вызывающего юзера).
--   * Удалены GRANT EXECUTE ... TO anon, authenticated.
--   * STABLE сохранён там, где был.
--   * В список таблиц для триггера updated_at не входит profiles
--     (таблица удалена); users получает свой триггер в 004_lucia_auth.sql.
-- ============================================================

-- ------------------------------------------------------------
-- Универсальный триггер updated_at
-- ------------------------------------------------------------
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
    'categories','products','product_variants','product_parameters',
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

-- ------------------------------------------------------------
-- Автогенерация order_number (BEFORE + AFTER INSERT)
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- Автогенерация номера заявки на расчёт
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- Автогенерация номера лида (только AFTER INSERT)
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- Полнотекстовый поиск: products
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- Полнотекстовый поиск: portfolio_items
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- Полнотекстовый поиск: blog_posts
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- Пересчёт рейтинга товара при изменении отзывов
-- ------------------------------------------------------------
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
-- RPC: search_products — полнотекстовый поиск товаров
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
$$ LANGUAGE sql STABLE;

-- ============================================================
-- RPC: get_category_tree — дерево категорий с подсчётом товаров
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
$$ LANGUAGE sql STABLE;

-- ============================================================
-- RPC: get_product_facets — фасетные фильтры для каталога
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
    base_filter := base_filter
      || ' AND (search_vector @@ plainto_tsquery(''russian'', '
      || quote_literal(p_search)
      || ') OR name ILIKE ''%'
      || replace(p_search, '''', '''''')
      || '%'')';
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
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- RPC: get_dashboard_stats — статистика для админки
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
$$ LANGUAGE sql STABLE;

-- ============================================================
-- RPC: calculate_product_price — онлайн-калькулятор
-- (версия из 00003_catalog_phase2.sql, без SECURITY DEFINER)
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
    -- per_unit: цена за штуку × количество
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
    -- per_area: цена за м² × (width * height)
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
    -- Поддерживает: perimeter / length / letter_height+letters_count
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
    -- per_tiraj_tier: ближайшая ступень тиража
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
        -- Наименьший tier.qty >= qty
        FOR tier IN SELECT * FROM jsonb_array_elements(cfg.formula->'tiers')
        LOOP
          IF (tier->>'qty')::numeric >= qty THEN
            IF matched_tier IS NULL OR
               (tier->>'qty')::numeric < (matched_tier->>'qty')::numeric THEN
              matched_tier := tier;
            END IF;
          END IF;
        END LOOP;

        -- Если все ступени меньше — берём максимальную
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
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- RPC: get_related_products — похожие товары из той же категории
-- ============================================================
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
$$ LANGUAGE sql STABLE;

-- ============================================================
-- RPC: list_products — каталожный листинг с фильтрами
-- ============================================================
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
$$ LANGUAGE sql STABLE;

-- ============================================================
-- log_admin_action — простая запись в audit_log.
-- В Supabase-версии использовался auth.uid(); здесь user_id
-- передаётся явным параметром (Server Action знает текущего юзера
-- через requireAdmin).
-- ============================================================
CREATE OR REPLACE FUNCTION log_admin_action(
  p_user_id   TEXT,
  p_action    TEXT,
  p_table_name TEXT DEFAULT NULL,
  p_record_id TEXT DEFAULT NULL,
  p_old_data  JSONB DEFAULT NULL,
  p_new_data  JSONB DEFAULT NULL,
  p_ip        TEXT DEFAULT NULL,
  p_ua        TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO audit_log (
    user_id, action, table_name, record_id,
    old_data, new_data, ip_address, user_agent
  )
  VALUES (
    p_user_id, p_action, p_table_name, p_record_id,
    p_old_data, p_new_data, p_ip, p_ua
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Конец 003_triggers_and_functions.sql
-- ============================================================
