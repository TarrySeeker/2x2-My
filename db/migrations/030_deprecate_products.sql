-- 030_deprecate_products.sql — 2026-05-06
--
-- Помечаем таблицы products / product_images / product_variants /
-- product_parameters как deprecated на уровне SQL-комментариев.
-- Сами таблицы НЕ удаляем (DROP TABLE), потому что:
--   1) могут содержать исторические данные у клиента;
--   2) удаление BIGSERIAL-таблицы с FK-ссылками от calculation_requests /
--      leads / reviews / promo_codes = большой блокирующий миграционный
--      пакет. Не нужен прямо сейчас.
--
-- Прикладной слой 2х2 перестал обращаться к этим таблицам 2026-05-06
-- (см. удаление /admin/products + /admin/categories + /catalog).
-- Каталог теперь — только `services`.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'products') THEN
    EXECUTE $cmt$
      COMMENT ON TABLE products IS
        'DEPRECATED 2026-05-06. Сущность «Товары» удалена из приложения '
        '(см. AdminSidebar.tsx). Каталог 2х2 — таблица services. Таблица '
        'оставлена как read-only архив; новые INSERT/UPDATE не делаются.'
    $cmt$;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'product_images') THEN
    EXECUTE 'COMMENT ON TABLE product_images IS ''DEPRECATED 2026-05-06 — см. comment к products.''';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'product_variants') THEN
    EXECUTE 'COMMENT ON TABLE product_variants IS ''DEPRECATED 2026-05-06 — см. comment к products.''';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'product_parameters') THEN
    EXECUTE 'COMMENT ON TABLE product_parameters IS ''DEPRECATED 2026-05-06 — см. comment к products.''';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'categories') THEN
    EXECUTE $cmt$
      COMMENT ON TABLE categories IS
        'DEPRECATED 2026-05-06. Категории были привязаны к products; '
        'для услуг используется таблица services с полем category. '
        'Таблица оставлена как read-only архив.'
    $cmt$;
  END IF;
END$$;
