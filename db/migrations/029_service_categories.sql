-- ============================================================
-- 029_service_categories.sql — справочник категорий услуг
-- ============================================================
-- Зачем. До этого категории услуг (`services.category`) были вшиты в
-- код константой `SERVICE_CATEGORIES` в lib/services/categories.ts (5
-- значений: polygraphy, outdoor, facade, design, installation). Чтобы
-- добавить новую категорию, разработчику нужно было править код и
-- передеплоивать. Клиент по телефону сказал «нельзя создавать новые
-- категории в услугах» — задача даёт ему такую возможность через
-- админку (/admin/content/services-categories, добавляется в следующей
-- цепочке).
--
-- Архитектурное решение:
--   * Заводим отдельную таблицу `service_categories` (BIGSERIAL PK,
--     UNIQUE slug). Slug — это то самое значение, которое уже лежит в
--     `services.category` (legacy-данные).
--   * НЕ делаем FK `services.category → service_categories.slug`.
--     Причина: services.category уже мог содержать значения вне
--     SERVICE_CATEGORIES (свободный input в старых версиях UI). FK
--     сломал бы существующие записи. Вместо FK — слабая связь
--     "category строкой совпадает со slug" + UI-слой показывает
--     legacy-значения отдельно (как уже сделано для портфолио в
--     lib/portfolio/categories.ts через isKnownPortfolioCategory).
--   * Сидим 5 текущих категорий из lib/services/categories.ts,
--     ON CONFLICT (slug) DO NOTHING — повторный прогон не перезатирает
--     ручные правки клиента.
--
-- Идемпотентно. Без RLS (см. db/README.md — Lucia, не Supabase).
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. Таблица
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS service_categories (
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
  CONSTRAINT service_categories_slug_format
    CHECK (slug ~ '^[a-z0-9_-]+$' AND char_length(slug) BETWEEN 1 AND 60),
  CONSTRAINT service_categories_label_not_empty
    CHECK (char_length(btrim(label)) >= 1)
);

CREATE INDEX IF NOT EXISTS service_categories_published_sort_idx
  ON service_categories(is_published, sort_order);

COMMENT ON TABLE service_categories IS
  'Справочник категорий услуг. Slug совпадает со значением services.category (без FK — гибкая связь).';
COMMENT ON COLUMN service_categories.slug IS
  'Машинный slug, латиница [a-z0-9_-]. Используется в services.category.';
COMMENT ON COLUMN service_categories.label IS
  'Человекочитаемая надпись для UI и витрины (группировка карточек).';

-- ------------------------------------------------------------
-- 2. updated_at trigger (общий trg_update_updated_at из 003)
-- ------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'trg_update_updated_at'
  ) THEN
    DROP TRIGGER IF EXISTS tr_service_categories_updated ON service_categories;
    CREATE TRIGGER tr_service_categories_updated
      BEFORE UPDATE ON service_categories
      FOR EACH ROW
      EXECUTE FUNCTION trg_update_updated_at();
  END IF;
END $$;

-- ------------------------------------------------------------
-- 3. Сид текущих 5 категорий из lib/services/categories.ts
-- ------------------------------------------------------------
INSERT INTO service_categories (slug, label, description, sort_order, is_published) VALUES
  ('polygraphy',   'Полиграфия',           'Визитки, листовки, буклеты, каталоги — офсет и цифра',    10, TRUE),
  ('outdoor',      'Наружная реклама',     'Баннеры, вывески, стелы, световые буквы',                  20, TRUE),
  ('facade',       'Фасады и оформление',  'Вентфасады, архитектурная подсветка, входные группы',     30, TRUE),
  ('design',       'Дизайн',               'Разработка макетов, фирменный стиль, фотомонтаж',          40, TRUE),
  ('installation', 'Монтаж',               'Производство и монтаж рекламных конструкций под ключ',     50, TRUE)
ON CONFLICT (slug) DO NOTHING;

COMMIT;
