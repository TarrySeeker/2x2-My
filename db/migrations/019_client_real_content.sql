-- ============================================================
-- 019_client_real_content.sql — реальные данные клиента из его таблицы
-- ============================================================
-- Источник: Google Sheets клиента, экспортирован 2026-04-25.
--
-- Что меняется:
--   1. promotions: добавляется колонка `slug` (для idempotent UPSERT
--      по бизнес-ключу), ремапятся 2 существующих seed-промо (visitki-500,
--      fotomontazh) и добавляются 3 новых (zamery-besplatno, rezhim-raboty,
--      verevka-banner). Итого — 5 промо как у клиента в таблице.
--   2. services: UPSERT 6 услуг по slug'у клиента. Существующие услуги,
--      слаги которых не пересекаются с новой 6-кой (polygrafiya,
--      naruzhnaya-reklama, svetovye-bukvy, stely, fasady), переводятся
--      в `enabled = FALSE` — они НЕ удаляются, остаются в БД и видны в
--      админке `/admin/content/services`, клиент может вернуть их в
--      эфир одной галочкой. Слаг `vyveski` — UPDATE-ится новым контентом.
--   3. site_settings: jsonb_set обновляет
--      socials.vk = "https://vk.com/ra2x2",
--      contacts.phone_primary_tel = "+79324247740" (формат для tel:),
--      organization.theme_color = "#FF6600" (если ещё не такой).
--
-- FAQ-вопрос про визитки (page_sections '/' / 'faq') НЕ добавляется —
-- такой вопрос уже присутствует (см. seed_cms.sql:340 «Сколько стоит
-- печать визиток или листовок?»). Заявка пользователя «если уже есть —
-- пропусти».
--
-- Идемпотентно. Все шаги — `IF NOT EXISTS` / `ON CONFLICT DO UPDATE` /
-- `jsonb_set`. Повторные накаты безопасны.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. promotions: новая колонка slug + UPSERT 5 промо клиента
-- ============================================================

-- 1.1. Добавляем slug-колонку и уникальный partial-индекс по slug.
--      Старые legacy-записи могут иметь slug = NULL — они продолжают
--      работать через unique-by-title (индекс из миграции 007).
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS slug TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_promotions_slug_unique
  ON promotions (slug)
  WHERE slug IS NOT NULL;

-- 1.2. Ремап существующих seed-промо на новые slug'и:
--      «500 визиток + 500 в подарок» → visitki-500
--      «Замер и фотомонтаж — бесплатно» → fotomontazh
--      Это нужно, чтобы последующий UPSERT по slug-у не создавал
--      дубликаты, а перезаписал содержимое существующих строк.
UPDATE promotions
   SET slug = 'visitki-500'
 WHERE title = '500 визиток + 500 в подарок'
   AND slug IS NULL;

UPDATE promotions
   SET slug = 'fotomontazh'
 WHERE title = 'Замер и фотомонтаж — бесплатно'
   AND slug IS NULL;

-- 1.3. Перед UPSERT-ом нужно снять title-уникальность с тех двух
--      legacy-записей, которые мы переименуем. Делаем UPDATE title→
--      target-title в один шаг (если title уже = target — ничего не
--      произойдёт). Это защищает от конфликта по uniq(title)
--      (миграция 007), когда через 2 секунды мы попробуем INSERT с
--      новым title.
UPDATE promotions
   SET title = '500 визиток + 500 в подарок: вторые в подарок',
       body  = 'При заказе 500 визиток вторые 500 шт. в подарок. Цена 1,78 ₽/шт. Офсет, полноцвет с двух сторон.'
 WHERE slug = 'visitki-500';

UPDATE promotions
   SET title = 'Фотомонтаж бесплатно',
       body  = 'Бесплатная фото-привязка вывески на фасад здания — увидите результат до начала работ.'
 WHERE slug = 'fotomontazh';

-- 1.4. UPSERT всех 5 акций клиента по slug.
--      На вставке: создаст недостающие 3 (zamery-besplatno, rezhim-raboty,
--      verevka-banner). На конфликте по slug — перезапишет title/body/
--      порядок (закрепляем нужный sort_order и тексты).
INSERT INTO promotions (
  slug, title, body, link_url, link_text,
  is_active, show_as_popup, sort_order
) VALUES
  (
    'visitki-500',
    '500 визиток + 500 в подарок: вторые в подарок',
    'При заказе 500 визиток вторые 500 шт. в подарок. Цена 1,78 ₽/шт. Офсет, полноцвет с двух сторон.',
    '/contacts',
    'Заказать визитки',
    TRUE,
    TRUE,
    10
  ),
  (
    'zamery-besplatno',
    'Замеры в подарок',
    'Бесплатные замеры на объекте при заказе вывески любого типа. Выезжаем по Ханты-Мансийску, по ХМАО и ЯНАО — обсудим условия.',
    '/contacts',
    'Заказать вывеску',
    TRUE,
    FALSE,
    20
  ),
  (
    'rezhim-raboty',
    'Режим работы в подарок',
    'При заказе вывески — табличка с режимом работы для входной группы бесплатно. Один файл, один монтаж — два готовых результата.',
    '/contacts',
    'Заказать вывеску',
    TRUE,
    FALSE,
    30
  ),
  (
    'verevka-banner',
    'Верёвка для баннера в подарок',
    'При заказе баннера — крепёжная верёвка по периметру в подарок. Не нужно искать отдельно: вешайте сразу после получения.',
    '/contacts',
    'Заказать баннер',
    TRUE,
    FALSE,
    40
  ),
  (
    'fotomontazh',
    'Фотомонтаж бесплатно',
    'Бесплатная фото-привязка вывески на фасад здания — увидите результат до начала работ.',
    '/contacts',
    'Заказать фотомонтаж',
    TRUE,
    FALSE,
    50
  )
ON CONFLICT (slug) WHERE slug IS NOT NULL DO UPDATE SET
  title         = EXCLUDED.title,
  body          = EXCLUDED.body,
  link_url      = EXCLUDED.link_url,
  link_text     = EXCLUDED.link_text,
  is_active     = EXCLUDED.is_active,
  show_as_popup = EXCLUDED.show_as_popup,
  sort_order    = EXCLUDED.sort_order,
  updated_at    = NOW();

-- 1.5. Деактивируем legacy-промо «500 визиток или листовок в подарок»
--      (id=5 на проде, заведена ранним seed_cms, slug NULL). Сейчас она
--      дублирует visitki-500 с новой ценой 1,78 ₽/шт. Не удаляем —
--      выставляем is_active=FALSE, чтобы клиент мог восстановить через
--      админку при необходимости.
UPDATE promotions
   SET is_active  = FALSE,
       updated_at = NOW()
 WHERE slug IS NULL
   AND title = '500 визиток или листовок в подарок'
   AND is_active = TRUE;


-- ============================================================
-- 2. services: UPSERT 6 услуг клиента + disable дублирующих
-- ============================================================
--
-- В клиентской таблице 8 пунктов, которые сворачиваются в 6 укрупнённых
-- карточек витрины (вывески+баннеры+таблички в одной услуге, стелы АЗС
-- отдельно — есть портфолио и крупные клиенты типа АртСевер/Нефть).
--
-- Существующая 6-ка (миграция 018):
--   polygrafiya, naruzhnaya-reklama, vyveski, svetovye-bukvy, stely, fasady
-- Новая 6-ка (клиент):
--   vyveski, stely-azs, arhitekturnaya-podsvetka, oformlenie-fasadov,
--   montazhnye-raboty, poligraphy
--
-- Совпадает только `vyveski` — её UPSERT перезапишет содержимое.
-- Остальные 5 старых slug'ов будут disabled (не удаляются, лежат в БД,
-- доступны через админку).

-- 2.1. UPSERT 6 услуг клиента.
INSERT INTO services (
  slug, title, short_description,
  price_from, price_unit, price_label,
  icon, cover_image, category, href,
  enabled, display_order, features
) VALUES
  (
    'vyveski',
    'Вывески, баннеры, таблички',
    'Изготовление наружной рекламы любого формата: лайтбоксы, объёмные буквы, баннеры на каркасе, таблички и стенды. Замеры и фотомонтаж — бесплатно.',
    NULL, NULL, 'По запросу',
    'panels-top-left', '/port/1.png',
    'outdoor', '/services/vyveski',
    TRUE, 10,
    '["Замеры в подарок", "Фотомонтаж бесплатно", "Гарантия 12 месяцев"]'::jsonb
  ),
  (
    'stely-azs',
    'Стелы АЗС',
    'Изготовление и монтаж стел для АЗС: пилоны с LED-табло цен, навигационные стелы, реставрация существующих конструкций. Расчёт ветровых нагрузок.',
    NULL, NULL, 'По запросу',
    'flag', '/port/4.png',
    'outdoor', '/services/stely-azs',
    TRUE, 20,
    '["LED-табло цен", "Реставрация существующих", "Расчёт ветровых нагрузок"]'::jsonb
  ),
  (
    'arhitekturnaya-podsvetka',
    'Архитектурная подсветка',
    'Контурная и архитектурная подсветка зданий, фасадов и входных групп. Подбор оборудования, разработка эскизов, согласование, монтаж под ключ.',
    NULL, NULL, 'По запросу',
    'lightbulb', '/img/facades-maf.png',
    'outdoor', '/services/arhitekturnaya-podsvetka',
    TRUE, 30,
    '["Контурная и архитектурная", "Подбор LED-оборудования", "Согласование и монтаж"]'::jsonb
  ),
  (
    'oformlenie-fasadov',
    'Оформление фасадов',
    'Вентилируемые фасады, малые архитектурные формы (МАФ), входные группы. Комплексные решения для зданий с допуском к высотным работам.',
    NULL, NULL, 'По запросу',
    'building-2', '/img/facades-maf.png',
    'facade', '/services/oformlenie-fasadov',
    TRUE, 40,
    '["Вентфасады и МАФ", "Допуск к высотным работам", "Комплексные проекты"]'::jsonb
  ),
  (
    'montazhnye-raboty',
    'Монтажные работы',
    'Профессиональный монтаж рекламных конструкций любой сложности. Своя монтажная бригада с допуском к высотным работам, выезд по ХМАО и ЯНАО.',
    NULL, NULL, 'По запросу',
    'wrench', NULL,
    'installation', '/services/montazhnye-raboty',
    TRUE, 50,
    '["Своя бригада", "Допуск к высотным работам", "Выезд по ХМАО и ЯНАО"]'::jsonb
  ),
  (
    'poligraphy',
    'Полиграфия',
    'Цифровая и офсетная печать: визитки, листовки, буклеты, каталоги, журналы. Визитки — от 1,78 ₽/шт. при заказе 500 шт. (вторые 500 в подарок).',
    NULL, NULL, 'По запросу',
    'printer', '/img/pint.png',
    'polygraphy', '/services/poligraphy',
    TRUE, 60,
    '["Офсет и цифра", "Визитки от 1,78 ₽/шт.", "Дизайн в подарок при тираже от 500 шт."]'::jsonb
  )
ON CONFLICT (slug) DO UPDATE SET
  title             = EXCLUDED.title,
  short_description = EXCLUDED.short_description,
  price_from        = EXCLUDED.price_from,
  price_unit        = EXCLUDED.price_unit,
  price_label       = EXCLUDED.price_label,
  icon              = EXCLUDED.icon,
  cover_image       = COALESCE(EXCLUDED.cover_image, services.cover_image),
  category          = EXCLUDED.category,
  href              = EXCLUDED.href,
  enabled           = EXCLUDED.enabled,
  display_order     = EXCLUDED.display_order,
  features          = EXCLUDED.features,
  updated_at        = NOW();

-- 2.2. Disable 5 старых услуг, которые сменились на укрупнённые
--      из 6-ки клиента. Записи остаются в БД и могут быть вновь
--      включены клиентом через /admin/content/services.
UPDATE services
   SET enabled    = FALSE,
       updated_at = NOW()
 WHERE slug IN (
         'polygrafiya',         -- замещена 'poligraphy'
         'naruzhnaya-reklama',  -- замещена 'vyveski' (вывески+баннеры+таблички)
         'svetovye-bukvy',      -- замещена 'vyveski' (как подкатегория)
         'stely',               -- замещена 'stely-azs'
         'fasady'               -- замещена 'oformlenie-fasadov'
       )
   AND enabled = TRUE;


-- ============================================================
-- 3. site_settings: соцсеть VK, tel-формат телефона, theme_color
-- ============================================================

-- 3.1. socials.vk = "https://vk.com/ra2x2".
--      jsonb_set с create-flag = true создаёт ключ, если его нет.
UPDATE site_settings
   SET value = jsonb_set(value, '{vk}', '"https://vk.com/ra2x2"'::jsonb, TRUE),
       updated_at = NOW()
 WHERE key = 'socials';

-- 3.2. contacts.phone_primary остаётся "+7-932-424-77-40" (уже такой
--      в seed_cms.sql), но добавляем готовый tel-формат для href.
UPDATE site_settings
   SET value = jsonb_set(
                 jsonb_set(value,
                   '{phone_primary}', '"+7-932-424-77-40"'::jsonb, TRUE),
                 '{phone_primary_tel}', '"+79324247740"'::jsonb, TRUE
               ),
       updated_at = NOW()
 WHERE key = 'contacts';

-- 3.3. organization.theme_color = "#FF6600" (форсируем фирменный
--      оранжевый, на случай если кто-то редактировал).
UPDATE site_settings
   SET value = jsonb_set(value, '{theme_color}', '"#FF6600"'::jsonb, TRUE),
       updated_at = NOW()
 WHERE key = 'organization';


-- ============================================================
-- 4. FAQ на главной — НЕ трогаем
-- ============================================================
-- На главной (page_sections где page_path='/' и section_key='faq')
-- уже есть вопрос «Сколько стоит печать визиток или листовок?» с
-- ответом про офсетную печать (см. seed_cms.sql:340). По заявке клиента
-- «если уже есть — пропусти». Клиент может позже отредактировать ответ
-- через админку и упомянуть конкретно цену 1,78 ₽/шт.

COMMIT;
