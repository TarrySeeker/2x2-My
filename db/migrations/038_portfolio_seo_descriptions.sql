-- ============================================================
-- 038_portfolio_seo_descriptions.sql
-- ============================================================
-- Зачем. Аудит 2026-05-06 (audit/2026-05-06-content-seo.md, п.3
-- «Критично — соответствие реальности»): все 7 страниц портфолио
-- имели <meta name="description"> длиной 16-35 символов («Крышная
-- вывеска ВТБ», «Наружная реклама», «Стелы АЗС в Сургуте»). Это:
--   * сигнал «слабая страница» для Яндекса/Google;
--   * в SERP-сниппет вместо описания подтягивается случайный кусок
--     текста (часто кнопка или меню);
--   * страницы фактически не продают работу.
--
-- Решение: проставить осмысленные descriptions ~150-160 символов
-- (норма для SERP) для каждого из 7 базовых slug'ов из миграции 028.
--
-- Идемпотентность: UPDATE ... WHERE seo_description IS NULL OR
-- LENGTH(seo_description) < 100. Это значит:
--   * если клиент уже прописал свою длинную description через админку
--     (≥ 100 символов) — мы её НЕ перезатираем;
--   * пустые / короткие — заменяем на canonical-текст из этой миграции.
--
-- Не добавлены slug'и из 032_portfolio_seed_extra.sql — для них
-- описания клиент пишет вручную через админку, миграция здесь —
-- одноразовый patch для исторических 7 работ.
-- ============================================================

BEGIN;

-- vtb-rooftop-khm — крышная вывеска ВТБ
UPDATE portfolio_items
SET seo_description = 'Проект, изготовление и монтаж крышной вывески банка ВТБ на здании в центре Ханты-Мансийска. Каркас, световые буквы, монтаж промальпом — реализовано «2х2».'
WHERE slug = 'vtb-rooftop-khm'
  AND (seo_description IS NULL OR LENGTH(seo_description) < 100);

-- azs-stele-surgut — стелы АЗС в Сургуте
UPDATE portfolio_items
SET seo_description = 'Разработка проекта, изготовление и монтаж рекламных стел для сетей АЗС «АртСевер» и «Нефть» в Сургуте. Металлоконструкции, баннер, светодиодная подсветка.'
WHERE slug = 'azs-stele-surgut'
  AND (seo_description IS NULL OR LENGTH(seo_description) < 100);

-- city-decor-surgut — городское оформление, фигуры
UPDATE portfolio_items
SET seo_description = 'Декоративные световые фигуры и арт-объекты для оформления городской среды Сургута по заказу девелопера «Брусника». Производство и монтаж под ключ агентством «2х2».'
WHERE slug = 'city-decor-surgut'
  AND (seo_description IS NULL OR LENGTH(seo_description) < 100);

-- restoration-fedorovsky — реставрация стелы «Я ДОМА»
UPDATE portfolio_items
SET seo_description = 'Реставрация и обновление стелы «Я ДОМА» в пгт. Фёдоровский, изготовление не световых объёмных букв и металлоконструкций. Работы выполнены агентством «2х2».'
WHERE slug = 'restoration-fedorovsky'
  AND (seo_description IS NULL OR LENGTH(seo_description) < 100);

-- outdoor-decor-pirelli — входная группа Pirelli, Сургут
UPDATE portfolio_items
SET seo_description = 'Входная группа шиномонтажа Pirelli в Сургуте: проект, металлоконструкции, светодиодная подсветка, баннеры, монтаж под ключ. Реализовано рекламной компанией «2х2».'
WHERE slug = 'outdoor-decor-pirelli'
  AND (seo_description IS NULL OR LENGTH(seo_description) < 100);

-- exhibition-wall — выставочная стена и стенды для ЮКИОР
UPDATE portfolio_items
SET seo_description = 'Выставочная стена с логотипом и информационные стенды для внутреннего оформления ЮКИОР в Ханты-Мансийске. Возведение, оклейка, монтаж — производство «2х2».'
WHERE slug = 'exhibition-wall'
  AND (seo_description IS NULL OR LENGTH(seo_description) < 100);

-- print-visiting-cards-catalogs — полиграфия (визитки, каталоги)
UPDATE portfolio_items
SET seo_description = 'Печать визиток, каталогов и наклеек: офсетная и оперативная печать в типографии «2х2», Ханты-Мансийск. Работаем с корпоративными клиентами ХМАО-Югры и ЯНАО.'
WHERE slug = 'print-visiting-cards-catalogs'
  AND (seo_description IS NULL OR LENGTH(seo_description) < 100);

COMMIT;

-- Проверка после миграции (вручную):
--   SELECT slug, LENGTH(seo_description) AS len, seo_description
--   FROM portfolio_items
--   ORDER BY sort_order;
-- Все базовые 7 работ должны иметь len BETWEEN 140 AND 165.
