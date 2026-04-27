-- =============================================================
-- 026 — удаление страницы /calculator
-- =============================================================
-- chore(calculator) 2026-04-27.
--
-- Сайт продаёт услуги ТОЛЬКО по индивидуальному расчёту через
-- QuoteModal — онлайн-калькулятор не нужен. Страница `/calculator`
-- удалена из app/ и закрыта 308-редиректом на `/services`
-- (см. next.config.ts → redirects()).
--
-- В БД остаются записи:
--   page_sections (4 строки): hero, categories, faq, cta
--   page_metadata (1 строка): SEO-мета
-- Удаляем их, чтобы:
--   1) админка /admin/seo и /admin/content/sections не показывала
--      путь, которого больше нет (PAGE_SECTIONS_ALLOWED и
--      PAGE_METADATA_ALLOWED_PATHS уже почищены).
--   2) sitemap.xml/SEO консистентны с реальной структурой сайта.
--
-- Идемпотентно: повторный запуск ничего не сломает (DELETE с WHERE
-- по уникальному пути; если строки уже нет — просто 0 rows).
-- =============================================================

DELETE FROM page_sections WHERE page_path = '/calculator';
DELETE FROM page_metadata WHERE path = '/calculator';
