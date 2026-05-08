-- ============================================================
-- 033_add_max_social.sql — добавить ключ `max` в socials
-- ============================================================
-- Зачем. MAX (max.ru) — российский мессенджер от VK, набирающий
-- аудиторию в 2026. Клиент «2х2» хочет иметь возможность ссылки
-- на свой канал/профиль в MAX.
--
-- Архитектурное решение. Соцсети хранятся в site_settings.socials
-- как JSONB-объект (см. db/seed_cms.sql:50). Структура:
--   { "vk": "...", "telegram": "...", "dzen": "..." }
-- Добавляем новый ключ `max` (по аналогии с остальными — короткий
-- идентификатор бренда, а не URL-полное имя). Значение — URL.
--
-- Идемпотентность:
--   • jsonb_set с create-flag=true создаёт ключ если его нет,
--     не трогает существующие значения.
--   • UPDATE … WHERE key='socials' выполняется только если строка
--     уже существует (после seed_cms.sql или 012_site_settings_extend.sql).
--   • Если строка `socials` ещё не создана (свежая БД без сидов) —
--     INSERT в ELSE-ветке создаст её с дефолтом.
--
-- Соответствующие изменения:
--   • Zod-схема `socialsSettingSchema` в
--     features/admin/schemas/site-settings.ts (добавлен max)
--   • Админ-форма SocialsForm в SiteSettingsPageClient.tsx
--   • Иконка MAX в HeaderSocials.tsx + Footer.tsx
-- ============================================================

BEGIN;

-- 1. Если строка socials уже есть — добавим ключ max со значением "".
UPDATE site_settings
   SET value = jsonb_set(value, '{max}', '""'::jsonb, TRUE),
       updated_at = NOW()
 WHERE key = 'socials';

-- 2. Если по какой-то причине строки нет (свежая БД без сидов) —
--    создадим с минимальным дефолтом.
INSERT INTO site_settings (key, value)
SELECT 'socials', '{"vk":"","telegram":"","dzen":"","max":""}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM site_settings WHERE key = 'socials');

COMMIT;
