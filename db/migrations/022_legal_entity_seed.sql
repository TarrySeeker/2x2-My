-- ============================================================
-- 022_legal_entity_seed.sql — заполнение реальных юр. реквизитов
-- ============================================================
-- Контекст: миграция 008 создала ключ `legal_entity` в site_settings
-- с пустыми полями (правильно — не хардкодим за клиента). До 2026-04-26
-- в Footer.tsx был fallback `ИНН: 861006205140 · ОГРН: 323861700071382`
-- (это реальные данные ИП Сивоконь А.А. по выписке клиента). E2E-аудит
-- (handoff e2e-admin-storefront-2026-04-26) обнаружил, что:
--   1. legal_entity в БД полностью пустой,
--   2. Footer показывает hardcoded fallback,
--   3. /privacy подставляет «—» в плейсхолдеры.
--
-- Решение: записать реальные реквизиты в БД, fallback из Footer убран
-- параллельным коммитом. Дальше клиент правит из админки
-- /admin/content/settings → раздел «Юридические реквизиты».
--
-- Источник данных (по согласованию с клиентом):
--   legal_name     : ИП Сивоконь А.А.
--   inn            : 861006205140 (12 цифр — ИП)
--   ogrn           : 323861700071382 (15 цифр — ОГРНИП)
--   kpp            : '' — не применимо для ИП
--   legal_address  : г. Ханты-Мансийск, ул. Парковая, д. 92 Б
--   actual_address : '' (по умолчанию использует тот же, что legal_address;
--                       /privacy сам подставит дефолт «628011, …, Парковая 92Б»)
--   ceo_name       : '' — у ИП нет «директора»
--   bank_account   : '' — клиент заполнит позже, не для публичного отображения
--   bank_name      : ''
--   bik            : ''
--
-- Идемпотентность: используем jsonb_set с COALESCE — если ключ уже
-- частично заполнен через админку, мы не «затрём» актуальные значения,
-- а только дополним недостающие поля. Логика:
--   * если поле в БД пустое (= "") — записываем seed-значение,
--   * если поле уже заполнено — оставляем как есть.
--
-- Это безопасно перепрогнать: повторный запуск ничего не сломает.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- Хелпер: записать поле, только если оно пустое или отсутствует.
-- В одном UPDATE через цепочку jsonb_set'ов.
-- ------------------------------------------------------------
WITH current_legal AS (
  SELECT COALESCE(value, '{}'::jsonb) AS v
  FROM site_settings
  WHERE key = 'legal_entity'
),
seeded AS (
  SELECT
    jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            v,
            '{legal_name}',
            CASE
              WHEN COALESCE(v->>'legal_name', '') = ''
                THEN to_jsonb('ИП Сивоконь А.А.'::text)
              ELSE v->'legal_name'
            END,
            true
          ),
          '{inn}',
          CASE
            WHEN COALESCE(v->>'inn', '') = ''
              THEN to_jsonb('861006205140'::text)
            ELSE v->'inn'
          END,
          true
        ),
        '{ogrn}',
        CASE
          WHEN COALESCE(v->>'ogrn', '') = ''
            THEN to_jsonb('323861700071382'::text)
          ELSE v->'ogrn'
        END,
        true
      ),
      '{legal_address}',
      CASE
        WHEN COALESCE(v->>'legal_address', '') = ''
          THEN to_jsonb('г. Ханты-Мансийск, ул. Парковая, д. 92 Б'::text)
        ELSE v->'legal_address'
      END,
      true
    ) AS v
  FROM current_legal
)
UPDATE site_settings
SET value      = (SELECT v FROM seeded),
    updated_at = NOW()
WHERE key = 'legal_entity';

-- На случай, если по какой-то причине ключа ещё нет (например,
-- БД восстановлена из старого дампа без миграции 008) — INSERT
-- с теми же значениями, ON CONFLICT DO NOTHING не нужен, потому
-- что предыдущий UPDATE уже бы сработал. Но страхуемся:
INSERT INTO site_settings (key, value)
SELECT 'legal_entity', jsonb_build_object(
  'legal_name',     'ИП Сивоконь А.А.',
  'inn',            '861006205140',
  'ogrn',           '323861700071382',
  'kpp',            '',
  'legal_address',  'г. Ханты-Мансийск, ул. Парковая, д. 92 Б',
  'actual_address', '',
  'ceo_name',       '',
  'bank_account',   '',
  'bank_name',      '',
  'bik',            ''
)
WHERE NOT EXISTS (SELECT 1 FROM site_settings WHERE key = 'legal_entity');

COMMIT;
