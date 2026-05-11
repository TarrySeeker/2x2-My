-- ============================================================
-- 039_optimize_portfolio_images.sql — переименование путей к
-- портфолио-картинкам с .png/.jpg на .webp после оптимизации
-- исходников в public/port/.
-- ============================================================
-- Зачем. Скрипт scripts/optimize-portfolio-images.mjs (см. ветка
-- perf/optimize-portfolio-images) сконвертировал PNG/JPG из
-- public/port/ в WebP (q=82, max 1920px по широкой стороне):
-- 41 MB → 1.3 MB (-96.9 %). Старые .png/.jpg удалены из деплоя
-- (оригиналы лежат локально в public/port/_archive/, .gitignore'ed).
--
-- Без этой миграции на проде в БД остались бы старые ссылки вида
-- '/port/1.png', которые после деплоя дадут 404 (next/image вернёт
-- placeholder вместо реального изображения).
--
-- Колонки, содержащие пути:
--   • portfolio_items.cover_url   TEXT
--   • portfolio_items.images      TEXT[]
--   • services.cover_image        TEXT  (см. 018_services.sql:41)
--   • page_sections.content       JSONB (карточки услуг на главной;
--                                        строковое значение `image`
--                                        в JSON-структуре)
--
-- Идемпотентность:
--   * REGEXP_REPLACE с якорем `\.(png|jpg|jpeg)$` срабатывает только
--     если расширение действительно .png/.jpg/.jpeg. Повторный прогон
--     не задвоит .webp.webp и не тронет уже мигрированные строки.
--   * Условие `~ '\.(png|jpg|jpeg)$'` фильтрует строки, поэтому
--     `updated_at`/триггеры не дёргаются впустую.
--
-- Безопасность для прода:
--   * Затрагивает ТОЛЬКО пути, начинающиеся на `/port/` — клиентские
--     загрузки в MinIO (https://erfgv.website/2x2-media/...) не
--     трогаются.
--
-- Откат: если по какой-то причине нужно вернуть .png/.jpg,
-- разместите оригиналы из public/port/_archive/ обратно в
-- public/port/ и выполните обратный REGEXP_REPLACE через psql.
-- ============================================================

BEGIN;

-- 1. portfolio_items.cover_url
UPDATE portfolio_items
SET cover_url = REGEXP_REPLACE(cover_url, '\.(png|jpg|jpeg)$', '.webp')
WHERE cover_url LIKE '/port/%'
  AND cover_url ~ '\.(png|jpg|jpeg)$';

-- 2. portfolio_items.images (массив TEXT[])
--    REGEXP_REPLACE применяется к каждому элементу; WHERE-условие
--    фильтрует строки, в массиве которых есть хотя бы один элемент
--    с расширением .png/.jpg/.jpeg в /port/.
UPDATE portfolio_items
SET images = ARRAY(
  SELECT REGEXP_REPLACE(img, '\.(png|jpg|jpeg)$', '.webp')
  FROM unnest(images) AS img
)
WHERE EXISTS (
  SELECT 1 FROM unnest(images) AS img
  WHERE img LIKE '/port/%' AND img ~ '\.(png|jpg|jpeg)$'
);

-- 3. services.cover_image — карточки услуг, на которых
--    использовались /port/1.png и /port/4.png
--    (см. 018_services.sql, 019_client_real_content.sql).
UPDATE services
SET cover_image = REGEXP_REPLACE(cover_image, '\.(png|jpg|jpeg)$', '.webp')
WHERE cover_image LIKE '/port/%'
  AND cover_image ~ '\.(png|jpg|jpeg)$';

-- 4. page_sections.content — секции главной (services_preview,
--    services_cards) хранят JSON c полем "image". Подменяем все
--    вхождения /port/<имя>.<png|jpg> на /port/<имя>.webp в JSON-тексте
--    через regex на text-представлении и обратное приведение к JSONB.
--    Затрагивает ТОЛЬКО подстроки `/port/...png|jpg|jpeg` в кавычках,
--    остальной контент не меняется.
UPDATE page_sections
SET content = REGEXP_REPLACE(
  content::text,
  '("/port/[^"]+)\.(png|jpg|jpeg)"',
  '\1.webp"',
  'g'
)::jsonb
WHERE content::text ~ '"/port/[^"]+\.(png|jpg|jpeg)"';

COMMIT;
