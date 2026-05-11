-- ============================================================
-- 018_services.sql — каталог услуг (карточки на /services и главной)
-- ============================================================
-- Зачем. На витрине «2х2» нет товаров в классическом e-commerce смысле:
-- есть набор укрупнённых рекламных услуг (полиграфия, наружная реклама,
-- вывески, световые буквы, стелы, фасады), которые ведут на калькулятор
-- или форму расчёта. Раньше их ассеты лежали хардкодом в content/home.ts
-- (`servicesTeasers`) — клиент не мог отредактировать.
--
-- Эта миграция вводит таблицу `services` для CRUD'а карточек услуг через
-- админку (`/admin/content/services`) и для рендера на витрине (главная,
-- /services, опц. /services/[slug]).
--
-- Что НЕ удаляется:
--   * `products`, `product_variants`, `categories`, `product_images` —
--     остаются на месте (используются legacy /catalog и калькулятором).
--     Их вывод из админ-сайдбара = задача frontend-агента; данные не
--     трогаем.
--   * `homepage_sections`/`page_sections` — главная по-прежнему читает
--     CMS-секцию `services` оттуда, новая таблица — НЕЗАВИСИМЫЙ
--     источник для будущих читателей (в т.ч. /services/cards).
--
-- Идемпотентно. Без RLS (см. db/README.md).
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. Таблица
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS services (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              TEXT UNIQUE NOT NULL,
  title             TEXT NOT NULL,
  short_description TEXT,
  long_description  TEXT,
  price_from        NUMERIC(12, 2),                 -- стартовая цена в рублях, может быть NULL = «По запросу»
  price_unit        TEXT,                           -- 'шт', 'см периметра', 'м²', и т.п.
  price_label       TEXT,                           -- готовая строка-бейдж: 'от 1 700 ₽', 'По запросу'
  icon              TEXT,                           -- имя из lucide-react: 'printer', 'megaphone'...
  cover_image       TEXT,                           -- публичный URL (S3/MinIO либо /img/...)
  category          TEXT,                           -- свободный slug-маркер: 'polygraphy' | 'outdoor' | 'facade' | 'design' | 'installation'
  href              TEXT,                           -- ссылка карточки: /catalog/<slug>, /calculator, /contacts...
  enabled           BOOLEAN NOT NULL DEFAULT TRUE,
  display_order     INTEGER NOT NULL DEFAULT 0,
  features          JSONB,                          -- ["Срок 1-3 дня", "Дизайн в подарок"]
  seo_title         TEXT,
  seo_description   TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS services_display_order_enabled_idx
  ON services (display_order)
  WHERE enabled = TRUE;

CREATE INDEX IF NOT EXISTS services_category_idx
  ON services (category)
  WHERE enabled = TRUE;

-- ------------------------------------------------------------
-- 2. updated_at trigger (общий update_updated_at_column из 003)
-- ------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column'
  ) THEN
    -- DROP+CREATE — чтобы миграция была idempotent даже после ручных правок.
    DROP TRIGGER IF EXISTS services_updated_at ON services;
    CREATE TRIGGER services_updated_at
      BEFORE UPDATE ON services
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ------------------------------------------------------------
-- 3. Seed: 6 услуг из content/home.ts → servicesTeasers.
--    ON CONFLICT (slug) DO NOTHING — повторные прогоны не перезатирают
--    клиентские правки. Если клиент удалил seed-карточку через админку,
--    она НЕ восстановится при повторном прогоне (это by design — иначе
--    тяжело удалить из каталога что-то, что нам в seed'е не нужно).
-- ------------------------------------------------------------
INSERT INTO services (
  slug, title, short_description, price_from, price_unit, price_label,
  icon, cover_image, category, href, enabled, display_order, features
) VALUES
  (
    'polygrafiya',
    'Полиграфия',
    'Визитки от 1 700 ₽ за 1 000 шт, листовки, буклеты, каталоги. Офсет и цифра, срок — от 1 дня.',
    1700, 'тираж', 'от 1 700 ₽',
    'printer', '/img/pint.png',
    'polygraphy', '/catalog/polygrafiya',
    TRUE, 10,
    '["Офсет и цифра", "Срок от 1 дня", "Дизайн в подарок при тираже от 500 шт."]'::jsonb
  ),
  (
    'naruzhnaya-reklama',
    'Наружная реклама',
    'Баннеры, таблички, стенды, дорожные знаки. Производство и монтаж под ключ в ХМАО и ЯНАО.',
    550, 'м²', 'от 550 ₽/м²',
    'megaphone', '/port/1.webp',
    'outdoor', '/catalog/naruzhnaya-reklama',
    TRUE, 20,
    '["Производство и монтаж", "Замеры в подарок", "Работаем по 44-ФЗ и 223-ФЗ"]'::jsonb
  ),
  (
    'vyveski',
    'Вывески',
    'Лайтбоксы, крышные вывески, псевдообъёмные буквы. Замеры и фотомонтаж в подарок.',
    8500, 'м²', 'от 8 500 ₽/м²',
    'panels-top-left', '/catalog/vyveski',
    'outdoor', '/catalog/vyveski',
    TRUE, 30,
    '["Замеры в подарок", "Фотомонтаж бесплатно", "Гарантия 12 месяцев"]'::jsonb
  ),
  (
    'svetovye-bukvy',
    'Световые буквы',
    'Открытые, закрытые, контражур — от 150 ₽ за сантиметр. LED-подсветка, гарантия 3 года.',
    150, 'см периметра', 'от 150 ₽/см',
    'lightbulb', '/img/facades-maf.png',
    'outdoor', '/catalog/svetovye-bukvy',
    TRUE, 40,
    '["LED-подсветка", "Гарантия 36 месяцев на подсветку", "Открытые / закрытые / контражур"]'::jsonb
  ),
  (
    'stely',
    'Стелы',
    'Пилоны АЗС с LED-табло, навигационные стелы ЖК, реставрация существующих конструкций.',
    45000, 'шт', 'от 45 000 ₽',
    'flag', '/port/4.webp',
    'outdoor', '/catalog/stely',
    TRUE, 50,
    '["АЗС, ЖК, госструктуры", "Реставрация существующих", "Расчёт ветровых нагрузок"]'::jsonb
  ),
  (
    'fasady',
    'Фасады',
    'Вентфасады, архитектурная подсветка, входные группы, МАФы. Комплексные решения для зданий.',
    3500, 'м²', 'от 3 500 ₽/м²',
    'building-2', '/img/facades-maf.png',
    'facade', '/catalog/fasady',
    TRUE, 60,
    '["Вентфасады и подсветка", "Допуск к промышленному альпинизму", "Комплексные проекты"]'::jsonb
  )
ON CONFLICT (slug) DO NOTHING;

COMMIT;
