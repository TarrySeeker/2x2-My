-- ============================================================
-- 031_portfolio_categories.sql — справочник категорий портфолио
-- ============================================================
-- Зачем. До этой миграции категории портфолио (`portfolio_items.category_label`)
-- были вшиты в код константой `PORTFOLIO_CATEGORIES` в lib/portfolio/categories.ts
-- (3 значения: «Полиграфия», «Наружная реклама», «Фасады»). Чтобы добавить
-- новую категорию, разработчику нужно было править код и передеплоивать.
-- Эта миграция даёт клиенту возможность управлять списком через админку
-- (/admin/content/portfolio-categories) — полный аналог 029_service_categories.sql.
--
-- Архитектурное решение:
--   * Заводим отдельную таблицу `portfolio_categories` (BIGSERIAL PK,
--     UNIQUE slug). Slug — это то самое значение, которое уже лежит в
--     `portfolio_items.category_label` (legacy-данные). В отличие от
--     services (где в БД хранится англоязычный slug), у портфолио в БД
--     лежит русская строка целиком — это исторический выбор (см.
--     комментарий в lib/portfolio/categories.ts). Мы НЕ переписываем
--     этот контракт: slug в новой таблице тоже будет латиницей, а вот
--     `label` совпадает 1:1 со значением `portfolio_items.category_label`.
--     Маппинг "категория ↔ работа" делаем ПО `label`, не по slug,
--     потому что фильтр на витрине уже сравнивает строку с label'ом.
--
--     Slug всё равно нужен — как машинное имя для URL/фильтра в
--     админке и для устойчивости к опечаткам label'а в будущем.
--
--   * НЕ делаем FK `portfolio_items.category_label → portfolio_categories.label`.
--     Причина:
--       (а) category_label свободный (бывали legacy-значения вне набора);
--       (б) в БД нет UNIQUE на category_label у работ (и не должно);
--       (в) аналогично сделано для service_categories — слабая связь.
--     UI-слой показывает legacy-значения отдельно (см. блок «(старая)»
--     в PortfolioPageClient.tsx).
--
--   * Сидим 3 текущие категории из lib/portfolio/categories.ts +
--     все уникальные значения, реально встречающиеся в БД портфолио
--     прода (по запросу — те же 3 значения, никаких legacy не осталось).
--     ON CONFLICT (slug) DO NOTHING — повторный прогон не перезатирает
--     ручные правки клиента.
--
-- Идемпотентно. Без RLS (см. db/README.md — Lucia, не Supabase).
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. Таблица
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS portfolio_categories (
  id            BIGSERIAL PRIMARY KEY,
  slug          TEXT UNIQUE NOT NULL,                     -- 'polygraphy', 'outdoor', ...
  label         TEXT NOT NULL,                            -- 'Полиграфия', 'Наружная реклама'
  description   TEXT,                                     -- опц. короткое описание
  sort_order    INTEGER NOT NULL DEFAULT 0,
  is_published  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Защита от пустого slug / лейбла на уровне БД (Zod-схема в админке
  -- тоже проверяет, но второй слой не помешает).
  CONSTRAINT portfolio_categories_slug_format
    CHECK (slug ~ '^[a-z0-9_-]+$' AND char_length(slug) BETWEEN 1 AND 60),
  CONSTRAINT portfolio_categories_label_not_empty
    CHECK (char_length(btrim(label)) >= 1)
);

CREATE INDEX IF NOT EXISTS portfolio_categories_published_sort_idx
  ON portfolio_categories(is_published, sort_order);

COMMENT ON TABLE portfolio_categories IS
  'Справочник категорий портфолио. Label совпадает с portfolio_items.category_label (без FK — гибкая связь).';
COMMENT ON COLUMN portfolio_categories.slug IS
  'Машинный slug, латиница [a-z0-9_-]. Для URL/фильтра в админке.';
COMMENT ON COLUMN portfolio_categories.label IS
  'Человекочитаемая надпись для UI и витрины. Совпадает с portfolio_items.category_label.';

-- ------------------------------------------------------------
-- 2. updated_at trigger (общий trg_update_updated_at из 003)
-- ------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'trg_update_updated_at'
  ) THEN
    DROP TRIGGER IF EXISTS tr_portfolio_categories_updated ON portfolio_categories;
    CREATE TRIGGER tr_portfolio_categories_updated
      BEFORE UPDATE ON portfolio_categories
      FOR EACH ROW
      EXECUTE FUNCTION trg_update_updated_at();
  ELSE
    RAISE NOTICE 'trg_update_updated_at() not found — пропускаю триггер updated_at для portfolio_categories. Запустите 003_triggers_and_functions.sql сначала.';
  END IF;
END $$;

-- ------------------------------------------------------------
-- 3. Сид текущих 3 категорий из lib/portfolio/categories.ts
--    (объединение с уникальными category_label из прод-БД — ровно те же 3).
-- ------------------------------------------------------------
INSERT INTO portfolio_categories (slug, label, description, sort_order, is_published) VALUES
  ('polygraphy', 'Полиграфия',       'Печать визиток, каталогов, наклеек и сувенирной продукции', 10, TRUE),
  ('outdoor',    'Наружная реклама', 'Вывески, крышные установки, стелы, входные группы',          20, TRUE),
  ('facade',     'Фасады',           'Фасадные работы, оформление городской среды, архитектурная подсветка', 30, TRUE)
ON CONFLICT (slug) DO NOTHING;

COMMIT;
