-- ============================================================
-- 028_portfolio_seed.sql — восстановление работ портфолио
-- ============================================================
-- Зачем. После того как мы убрали STUB-fallback из админки
-- (38f3437 «fix(admin): убрать stub-fallback из админки портфолио»),
-- админ-страница `/admin/content/portfolio` стала показывать только
-- реальные строки из `portfolio_items`. Если в БД работ нет — клиент
-- видит пустую заглушку «Работ пока нет».
--
-- Корневая проблема: db/seed.sql (минимальный сид, который вшит в
-- pipeline `apply-migrations.sh`) НЕ содержит INSERT в portfolio_items.
-- Полный сид лежит в supabase/seed.sql, но Docker pipeline его не
-- запускает. Поэтому на любой свежей БД (или после ручного
-- пересоздания) работ просто нет.
--
-- Решение: вынести seed портфолио в идемпотентную миграцию, которая
-- автоматически прогоняется через apply-migrations.sh.
--
-- Источник данных: data/portfolio-stub.ts (тот же набор, что показывает
-- витрина в качестве fallback'а). 7 работ, имена файлов изображений
-- соответствуют public/port/*.png.
--
-- Идемпотентность:
--   * `ON CONFLICT (slug) DO NOTHING` — повторный прогон не перезатрёт
--     ручные правки клиента и не задвоит записи.
--   * Если клиент удалил какую-то seed-работу через админку, повторный
--     прогон НЕ восстановит её (by design — иначе невозможно удалить
--     то, что нам не нужно).
-- ============================================================

BEGIN;

INSERT INTO portfolio_items (
  title, slug, description, short_description,
  category_label,
  client_name, industry, location, year,
  cover_url, images,
  is_featured, is_published, sort_order
) VALUES
  (
    'Полиграфия: визитки, наклейки и сопутствующая продукция',
    'print-visiting-cards-catalogs',
    'Печать визиток, каталогов и наклеек; производство в типографии для корпоративных клиентов ХМАО.',
    'Печать визиток, каталогов и наклеек',
    'Полиграфия',
    'Корпоративные клиенты', 'B2B', 'Ханты-Мансийск', 2024,
    '/port/print-visiting-cards-catalogs.webp',
    ARRAY['/port/print-visiting-cards-catalogs.webp'],
    true, true, 10
  ),
  (
    'Крышная установка ВТБ, Ханты-Мансийск, ул. Мира 38',
    'vtb-rooftop-khm',
    'Проект, изготовление и монтаж крышной вывески ВТБ на здании в центре Ханты-Мансийска.',
    'Крышная вывеска ВТБ',
    'Наружная реклама',
    'ВТБ', 'Финансы', 'Ханты-Мансийск', 2024,
    '/port/1.webp',
    ARRAY['/port/1.webp'],
    true, true, 20
  ),
  (
    'Стелы АЗС «АртСевер» и «Нефть», Сургут',
    'azs-stele-surgut',
    'Разработка эскизов, проект, изготовление и монтаж стел для АЗС в Сургуте.',
    'Стелы АЗС в Сургуте',
    'Наружная реклама',
    'АЗС АртСевер / Нефть', 'Топливо', 'Сургут', 2023,
    '/port/5.webp',
    ARRAY['/port/5.webp'],
    true, true, 30
  ),
  (
    'Декоративные фигуры и оформление городской среды',
    'city-decor-surgut',
    'Световые фигуры и декоративные конструкции для оформления городской среды Сургута.',
    'Декоративные фигуры Сургут',
    'Фасады',
    'Брусника', 'Девелопмент', 'Сургут', 2024,
    '/port/3.webp',
    ARRAY['/port/3.webp'],
    true, true, 40
  ),
  (
    'Реставрация имеющихся конструкций и элементов',
    'restoration-fedorovsky',
    'Изготовление не световых объёмных букв и конструкций, реставрация стелы «Я ДОМА» в пгт. Фёдоровский.',
    'Реставрация стелы «Я ДОМА»',
    'Наружная реклама',
    'ЮКИОР', 'Госструктуры', 'пгт. Фёдоровский', 2023,
    '/port/4.webp',
    ARRAY['/port/4.webp'],
    true, true, 50
  ),
  (
    'Разработка эскизов, проект, изготовление и монтаж наружного оформления',
    'outdoor-decor-pirelli',
    'Металлоконструкции, светодиодная подсветка, оформление баннерами. Входная группа шиномонтажа Pirelli в Сургуте.',
    'Входная группа Pirelli',
    'Наружная реклама',
    'Pirelli', 'Автосервис', 'Сургут', 2024,
    '/port/2.webp',
    ARRAY['/port/2.webp'],
    true, true, 60
  ),
  (
    'Выставочная стена, логотип и стенды',
    'exhibition-wall',
    'Возведение и оклейка стены, установка логотипа, установка стендов для внутреннего оформления.',
    'Наружная реклама',
    'Наружная реклама',
    'ЮКИОР', 'Госструктуры', 'Ханты-Мансийск', 2023,
    '/port/66.webp',
    ARRAY['/port/66.webp'],
    true, true, 70
  )
ON CONFLICT (slug) DO NOTHING;

-- Авто-проставить is_featured = true для первых 3 по sort_order, если
-- никто ещё не помечен (чтобы блок «Наши работы» на главной не пустовал).
-- 006_cms_and_security.sql добавил CHECK на featured_order BETWEEN 1..3,
-- поэтому ставим разные значения.
DO $$
DECLARE
  current_featured INT;
BEGIN
  SELECT COUNT(*) INTO current_featured
  FROM portfolio_items
  WHERE is_featured = true;

  IF current_featured = 0 THEN
    UPDATE portfolio_items SET is_featured = true, featured_order = 1
      WHERE slug = 'vtb-rooftop-khm';
    UPDATE portfolio_items SET is_featured = true, featured_order = 2
      WHERE slug = 'azs-stele-surgut';
    UPDATE portfolio_items SET is_featured = true, featured_order = 3
      WHERE slug = 'outdoor-decor-pirelli';
  END IF;
END $$;

COMMIT;
