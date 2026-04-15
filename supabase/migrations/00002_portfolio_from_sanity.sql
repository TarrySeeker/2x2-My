-- ============================================================
-- Миграция: дополнения portfolio_items для переезда с Sanity
-- ============================================================
-- Добавляем поля, которые были в sanity/schemas/portfolio.ts,
-- но отсутствуют в базовой миграции 00001.
--
-- Sanity-поля: title, slug, category(string), description, image, publishedAt
-- portfolio_items уже имеет: title, slug, description, cover_url, images[],
-- category_id, related_product_id, year, client_name, industry, location.
--
-- Добавляется:
--   * published_at — дата публикации работы (аналог Sanity publishedAt)
--   * category_label — строковый лейбл категории на случай, когда работа
--     импортирована из Sanity и ещё не привязана к categories.id
--
-- Применяется после 00001_initial_schema.sql.
-- ============================================================

ALTER TABLE portfolio_items
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS category_label TEXT;

CREATE INDEX IF NOT EXISTS idx_portfolio_published_at
  ON portfolio_items(published_at DESC)
  WHERE is_published = true;

-- Backfill published_at из project_date / created_at,
-- чтобы витрина могла сортировать по единому полю.
UPDATE portfolio_items
  SET published_at = COALESCE(published_at, project_date::timestamptz, created_at)
  WHERE published_at IS NULL;

-- Комментарии для читаемости схемы
COMMENT ON COLUMN portfolio_items.published_at
  IS 'Дата публикации работы (импорт из Sanity publishedAt)';
COMMENT ON COLUMN portfolio_items.category_label
  IS 'Строковый лейбл категории (из Sanity category), fallback если category_id NULL';
