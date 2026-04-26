-- ============================================================
-- 021_clear_homepage_services_items.sql
-- Очистить устаревший массив карточек услуг на главной странице.
-- ============================================================
-- Причина: до миграции 018_services.sql карточки блока «Наши услуги» на
-- главной редактировались как массив объектов в
--   page_sections('/', 'services').content.items
-- После 018 источник истины — таблица `services` (видна на /services
-- и редактируется в /admin/content/services). Компонент
-- components/sections/ServicesPreview.tsx с этой же миграцией берёт
-- данные из таблицы и больше НЕ обращается к items.
--
-- В проде (erfgv.website) в content.items на момент 2026-04-25 лежали
-- демо/тест-карточки («Офсетная печать», «Наружная реклама», «Световые
-- буквы», «test») с битыми внешними URL картинок (vinegret.cz/бегемотик).
-- Сейчас они не рендерятся (есть включённые services), но любой сбой
-- (выключили все services / обнулили таблицу) приводил бы к показу
-- мусора. Чистим страховочно.
--
-- Безопасность:
--   * Оставляем headline / subheadline / also_we_do_text /
--     also_we_do_subtitle / also_we_do_items без изменений — это
--     актуальный CMS-контент, читается компонентом.
--   * Затрагиваем только секцию ('/', 'services').
--   * Идемпотентно: если items уже [] или нет вовсе — no-op.
--   * При отсутствии таблицы page_sections — выходим без ошибки.
-- ============================================================

BEGIN;

DO $$
DECLARE
  has_table BOOLEAN;
  rec RECORD;
  items_arr JSONB;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'page_sections'
  ) INTO has_table;

  IF NOT has_table THEN
    RAISE NOTICE '[021] page_sections отсутствует — пропускаем';
    RETURN;
  END IF;

  SELECT id, content
    INTO rec
    FROM page_sections
   WHERE page_path = '/' AND section_key = 'services'
   LIMIT 1;

  IF NOT FOUND THEN
    RAISE NOTICE '[021] секция (/, services) не найдена — пропускаем';
    RETURN;
  END IF;

  items_arr := rec.content -> 'items';

  IF items_arr IS NULL THEN
    RAISE NOTICE '[021] поле items отсутствует — no-op';
    RETURN;
  END IF;

  IF jsonb_typeof(items_arr) <> 'array' THEN
    RAISE NOTICE '[021] поле items не массив (%), очищаем в []',
      jsonb_typeof(items_arr);
  ELSIF jsonb_array_length(items_arr) = 0 THEN
    RAISE NOTICE '[021] items уже пуст — no-op';
    RETURN;
  ELSE
    RAISE NOTICE '[021] чистим items: % карточек → []',
      jsonb_array_length(items_arr);
  END IF;

  UPDATE page_sections
     SET content    = jsonb_set(content, '{items}', '[]'::jsonb, false),
         updated_at = NOW()
   WHERE id = rec.id;
END $$;

COMMIT;
