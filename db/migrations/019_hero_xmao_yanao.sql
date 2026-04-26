-- ============================================================
-- 019_hero_xmao_yanao.sql — заменяем «Ханты-Мансийск» в Hero-заголовке
-- ============================================================
-- Правка клиента 2026-04-25. В hero-секции главной (page_sections,
-- page_path='/', section_key='hero', content_type='home_hero')
-- хранятся два альтернативных заголовка в content->'titles' (массив
-- строк, чередующиеся через CSS-fade в Hero — см.
-- components/sections/HeroSectionClient.tsx). До правки одна из строк
-- содержала «Ханты-Мансийск» — клиент попросил расширить географию
-- до «ХМАО, ЯНАО».
--
-- Подход: точечная замена подстроки в каждом элементе массива titles
-- через jsonb_build_array(...replace...). Затрагиваем ТОЛЬКО hero-
-- секцию. Если titles нет (массив пуст / поле отсутствует) — JSONB
-- остаётся прежним. Дефолты в коде (DEFAULT_HERO в HeroSection.tsx)
-- уже содержат «ХМАО и ЯНАО», поэтому при пустой БД миграция тоже не
-- требуется и не вредит.
--
-- Идемпотентно: повторный прогон не делает ничего (replace на
-- уже-чистой строке возвращает её же).
--
-- Также правим headline_line1/accent/line3 (legacy-формат старого
-- Hero, до titles-rotation) — на случай если клиент через админку
-- переключился обратно на статический формат.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. titles[] — массив чередующихся заголовков
-- ------------------------------------------------------------
DO $$
DECLARE
  hero_row RECORD;
  new_titles JSONB;
  old_titles JSONB;
  has_table BOOLEAN;
BEGIN
  -- Защита: если page_sections ещё не создан (миграция 010 не
  -- применена) — выходим без ошибки.
  SELECT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'page_sections'
  ) INTO has_table;

  IF NOT has_table THEN
    RAISE NOTICE '[019] page_sections отсутствует — пропускаем';
    RETURN;
  END IF;

  SELECT id, content
    INTO hero_row
    FROM page_sections
   WHERE page_path = '/' AND section_key = 'hero'
   LIMIT 1;

  IF NOT FOUND THEN
    RAISE NOTICE '[019] hero-секция в page_sections не найдена — пропускаем';
    RETURN;
  END IF;

  old_titles := hero_row.content -> 'titles';

  -- Если titles нет / не массив / пустой — пропускаем titles, идём к
  -- legacy-полям ниже.
  IF old_titles IS NOT NULL
     AND jsonb_typeof(old_titles) = 'array'
     AND jsonb_array_length(old_titles) > 0
  THEN
    SELECT jsonb_agg(
             to_jsonb(replace(elem #>> '{}', 'Ханты-Мансийск', 'ХМАО, ЯНАО'))
           )
      INTO new_titles
      FROM jsonb_array_elements(old_titles) AS elem;

    IF new_titles IS DISTINCT FROM old_titles THEN
      UPDATE page_sections
         SET content    = jsonb_set(content, '{titles}', new_titles, false),
             updated_at = NOW()
       WHERE id = hero_row.id;
      RAISE NOTICE '[019] hero.titles обновлён: % → %', old_titles, new_titles;
    ELSE
      RAISE NOTICE '[019] hero.titles уже без «Ханты-Мансийск» — no-op';
    END IF;
  END IF;
END $$;

-- ------------------------------------------------------------
-- 2. Legacy headline_line1/accent/line3 (статический формат Hero)
-- ------------------------------------------------------------
-- Используем jsonb_set с оператором replace через подзапрос.
-- Если поле отсутствует — jsonb_set с create_missing=false ничего не
-- меняет. Если поле есть и не содержит подстроки — replace вернёт ту
-- же строку (no-op).
DO $$
DECLARE
  rec RECORD;
  new_val TEXT;
  old_val TEXT;
  fields TEXT[] := ARRAY['headline_line1', 'headline_accent', 'headline_line3', 'eyebrow', 'subheadline'];
  fld TEXT;
  has_table BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'page_sections'
  ) INTO has_table;
  IF NOT has_table THEN RETURN; END IF;

  SELECT id, content
    INTO rec
    FROM page_sections
   WHERE page_path = '/' AND section_key = 'hero'
   LIMIT 1;
  IF NOT FOUND THEN RETURN; END IF;

  FOREACH fld IN ARRAY fields LOOP
    old_val := rec.content ->> fld;
    IF old_val IS NULL OR position('Ханты-Мансийск' in old_val) = 0 THEN
      CONTINUE;
    END IF;
    -- Eyebrow: «Ханты-Мансийск» → «ХМАО, ЯНАО»
    -- Subheadline: длинная фраза, тоже допускаем замену
    new_val := replace(old_val, 'Ханты-Мансийск', 'ХМАО, ЯНАО');
    UPDATE page_sections
       SET content    = jsonb_set(content, ARRAY[fld], to_jsonb(new_val), false),
           updated_at = NOW()
     WHERE id = rec.id;
    RAISE NOTICE '[019] hero.% обновлён', fld;
    -- Перечитаем content для следующей итерации (т.к. могли измениться
    -- другие поля в той же строке; держим row актуальной).
    SELECT id, content INTO rec FROM page_sections WHERE id = rec.id;
  END LOOP;
END $$;

-- ------------------------------------------------------------
-- 3. Также правим legacy homepage_sections (та же hero-секция,
--    оставлена как backup — миграция 017 ещё не дропает).
--    Если она уже снесена — DO-блок просто выйдет.
-- ------------------------------------------------------------
DO $$
DECLARE
  has_legacy BOOLEAN;
  legacy_row RECORD;
  new_titles JSONB;
  old_titles JSONB;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'homepage_sections'
  ) INTO has_legacy;
  IF NOT has_legacy THEN RETURN; END IF;

  SELECT key, content INTO legacy_row
    FROM homepage_sections
   WHERE key = 'hero'
   LIMIT 1;
  IF NOT FOUND THEN RETURN; END IF;

  old_titles := legacy_row.content -> 'titles';
  IF old_titles IS NOT NULL
     AND jsonb_typeof(old_titles) = 'array'
     AND jsonb_array_length(old_titles) > 0
  THEN
    SELECT jsonb_agg(
             to_jsonb(replace(elem #>> '{}', 'Ханты-Мансийск', 'ХМАО, ЯНАО'))
           )
      INTO new_titles
      FROM jsonb_array_elements(old_titles) AS elem;

    IF new_titles IS DISTINCT FROM old_titles THEN
      UPDATE homepage_sections
         SET content    = jsonb_set(content, '{titles}', new_titles, false),
             updated_at = NOW()
       WHERE key = 'hero';
    END IF;
  END IF;
END $$;

COMMIT;
