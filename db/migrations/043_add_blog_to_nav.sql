-- ============================================================
-- 043_add_blog_to_nav.sql — добавить пункт «Блог» в верхнее меню
-- ============================================================
-- Правка клиента 2026-05-11. Сейчас в site_settings.navigation_header
-- 6 пунктов без блога: Главная / О нас / Услуги / Портфолио / FAQ / Контакты.
-- Добавляем «Блог» (href=/blog, order=45) между Портфолио и FAQ.
--
-- Идемпотентно: jsonb_path_exists проверяет, нет ли уже пункта с
-- href='/blog'. Если есть — UPDATE no-op. Это безопасно при повторном
-- прогоне миграции и при ручных правках клиента.
-- ============================================================

UPDATE site_settings
SET value = jsonb_set(
  value,
  '{items}',
  (value->'items') || '[{
    "href": "/blog",
    "label": "Блог",
    "order": 45,
    "visible": true
  }]'::jsonb
)
WHERE key = 'navigation_header'
  AND NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(value->'items') item
    WHERE item->>'href' = '/blog'
  );
