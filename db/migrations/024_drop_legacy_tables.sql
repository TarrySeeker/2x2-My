-- ============================================================
-- 024_drop_legacy_tables.sql
-- ============================================================
-- Удаление неиспользуемых таблиц после миграции на новую CMS-архитектуру.
--
-- ЭТА МИГРАЦИЯ ДРОПАЕТ ТОЛЬКО `homepage_sections`.
-- ----------------------------------------------------------------
-- Историческая справка:
--   * Миграция 017_homepage_to_page_sections.sql перенесла контент главной
--     из homepage_sections (PK=key) в page_sections (page_path='/'+section_key).
--   * Витрина (app/page.tsx + lib/data/page-sections.ts) с тех пор читает
--     только page_sections.
--   * Админка `/admin/content/homepage` (app/admin/content/homepage/page.tsx
--     + .../[key]/page.tsx) тоже теперь работает с page_sections через
--     getPageSection() / upsertPageSectionAction(). Старые экшены
--     updateSectionAction / setSectionPublishedAction (features/admin/actions/cms.ts)
--     больше не вызываются ни из одного UI-компонента (см. grep '*.tsx').
--   * 017 в комментарии явно зарезервировал отдельную миграцию для DROP'а:
--       «Таблица homepage_sections НЕ удаляется — оставляем как backup
--        на 1–2 деплоя. Дроп — отдельной миграцией после успешной
--        стабилизации.»
--     Эта миграция и есть тот «отдельный DROP».
--
-- ДРУГИЕ КАНДИДАТЫ (products, categories, customers, reviews, banners,
-- menu_items, pages, product_images, product_variants) НЕ ТРОГАЕМ:
--   * Они ещё используются активным кодом:
--       - lib/data/catalog.ts (listProducts/getCategoryTree/getProductFacets/
--         getProductBySlugWithRelations) — обслуживает публичные роуты
--         /catalog, /catalog/[category], /product/[slug].
--       - features/admin/api/{products,categories,reviews,banners,menu,pages}.ts
--         — admin REST/server actions для orphan'ов в /admin/products,
--         /admin/categories, /admin/reviews, /admin/content/banners,
--         /admin/content/menu, /admin/content/pages. Страницы скрыты
--         из sidebar, но доступны по прямому URL и читают из этих таблиц.
--       - app/sitemap.ts (getProducts/getCategories) — роуты sitemap,
--         завёрнут в try/catch, но при дропе sitemap станет пустым.
--   * Триггеры/RPC из 003_triggers_and_functions.sql ссылаются на эти
--     таблицы:
--       - trg_products_search_vector / tr_products_search
--       - tr_reviews_recalc → UPDATE products SET rating_avg / reviews_count
--       - search_products(), get_product_facets(), list_products(),
--         get_category_tree(), get_dashboard_stats() — все читают из
--         products / categories / reviews.
--     Их удаление потребует одновременного DROP FUNCTION + правок в коде,
--     что выходит за рамки этой миграции (см. отчёт «drop-legacy-tables»).
--   * `customers` — в схеме 002_schema.sql отсутствует как таблица
--     (только колонки customer_* в orders / leads / calculation_requests).
--     Дропать нечего. UI-папка /admin/customers скрыта из sidebar
--     и должна быть удалена кодом отдельно.
--
-- Идемпотентность: проверяем наличие через information_schema перед DROP.
-- Безопасность: рекомендуется выполнить pg_dump таблицы перед прогоном
-- (см. handoff drop-legacy-tables).
-- ============================================================

BEGIN;

DO $$
BEGIN
  -- A. homepage_sections (legacy CMS-таблица главной, заменена page_sections в 017)
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'homepage_sections'
  ) THEN
    -- CASCADE: на homepage_sections нет FK от других таблиц,
    -- но добавляем для безопасности (на случай view/индексов).
    DROP TABLE homepage_sections CASCADE;
    RAISE NOTICE '[024] dropped: homepage_sections';
  ELSE
    RAISE NOTICE '[024] skipped: homepage_sections (already absent)';
  END IF;
END $$;

COMMIT;
