-- ============================================================
-- 017_homepage_to_page_sections.sql
-- ============================================================
-- Унификация CMS: переносим контент главной из `homepage_sections`
-- (PK=key, миграция 006) в универсальную таблицу `page_sections`
-- (миграция 010) с `page_path = '/'`.
--
-- Зачем. До этой миграции витрина читала из homepage_sections, а
-- админка `/admin/content/sections` писала в page_sections. Изменения
-- в новой админке не доходили до сайта. Унифицируем источник истины:
-- всё через page_sections.
--
-- ВАЖНО:
--   * Таблица `homepage_sections` НЕ удаляется — оставляем как backup
--     на 1–2 деплоя. Дроп — отдельной миграцией после успешной
--     стабилизации.
--   * Каждая запись из homepage_sections становится одной строкой в
--     page_sections с уникальными content_type вида `home_<key>`.
--     Это сохраняет 1:1 структуру content и не конфликтует с
--     существующими content_type (hero, text_block, faq, cta и т.д.),
--     у которых уже есть свои Zod-схемы под не-главные страницы.
--   * Используется ON CONFLICT … DO UPDATE — если новая админка уже
--     успела что-то написать в page_sections('/', 'hero'), приоритет
--     отдаётся старым работающим данным из homepage_sections (это та
--     версия, которую видел сайт = что видел клиент). Если в проде
--     всё-таки нужно сохранить запись из page_sections — её нужно
--     забэкапить вручную перед прогоном.
--   * Идемпотентно: на повторных прогонах апдейтит content к текущему
--     состоянию homepage_sections (то есть свежие правки клиента,
--     сделанные через старую админку, переедут в page_sections).
--
-- display_order:
--   hero=10, services=20, promotions=30, portfolio=40, about=50,
--   features=60, faq=70, cta=80
--   (соответствует порядку рендера в app/page.tsx; trust_bar здесь не
--    участвует — он живёт в site_settings и НЕ в page_sections).
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- Гарантируем, что homepage_sections существует (раньше мог быть
-- частично отсутствующим в каких-то локальных средах). Если её нет —
-- молча выходим: миграция полностью no-op.
-- ------------------------------------------------------------
DO $$
DECLARE
  has_legacy BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'homepage_sections'
  ) INTO has_legacy;

  IF NOT has_legacy THEN
    RAISE NOTICE '[017] homepage_sections отсутствует — пропускаем перенос';
    RETURN;
  END IF;

  -- ----------------------------------------------------------
  -- Перенос с маппингом key → (display_order, content_type).
  -- ----------------------------------------------------------
  INSERT INTO page_sections (
    page_path, section_key, content_type, content,
    display_order, enabled, updated_at
  )
  SELECT
    '/'                                    AS page_path,
    hs.key                                 AS section_key,
    'home_' || hs.key                      AS content_type,
    hs.content                             AS content,
    CASE hs.key
      WHEN 'hero'       THEN 10
      WHEN 'services'   THEN 20
      WHEN 'promotions' THEN 30
      WHEN 'portfolio'  THEN 40
      WHEN 'about'      THEN 50
      WHEN 'features'   THEN 60
      WHEN 'faq'        THEN 70
      WHEN 'cta'        THEN 80
      ELSE 100
    END                                    AS display_order,
    COALESCE(hs.is_published, TRUE)        AS enabled,
    COALESCE(hs.updated_at, NOW())         AS updated_at
  FROM homepage_sections hs
  WHERE hs.key IN ('hero','about','services','promotions','portfolio','features','faq','cta')
  ON CONFLICT (page_path, section_key) DO UPDATE SET
    content_type  = EXCLUDED.content_type,
    content       = EXCLUDED.content,
    display_order = EXCLUDED.display_order,
    enabled       = EXCLUDED.enabled,
    updated_at    = NOW();

  RAISE NOTICE '[017] перенесено секций главной: %',
    (SELECT COUNT(*) FROM page_sections WHERE page_path = '/');
END $$;

COMMIT;
