-- ============================================================
-- 012_site_settings_extend.sql — расширение site_settings новыми ключами
-- ============================================================
-- Этап CMS-перевода витрины (2026-04-24). Добавляет в site_settings
-- четыре новых JSONB-ключа, которые заменяют hardcoded константы из
-- lib/seo/site.ts, lib/siteConfig.ts, HeaderClient.tsx, Footer.tsx,
-- content/home.ts.
--
-- Почему расширяем `site_settings`, а не создаём новые таблицы:
--   1) `site_settings` уже является "глобальным конфигом" с проверенным
--      инструментарием (getSetting/getSettingValue c кешем на 60с, тег
--      `settings:<key>`, upsertSetting, Zod-схема в
--      features/admin/schemas/site-settings.ts).
--   2) Структурные данные (Organization info, меню из ~6 пунктов, trust
--      bar из 6 логотипов) — это не "карточки, которыми можно массово
--      управлять как записями", а единый конфиг. Таблица — оверкилл.
--   3) Каждый ключ валидируется отдельной Zod-схемой в админке.
--      Клиент редактирует через form-UI, а не JSON-editor.
--
-- Новые ключи:
--   organization      — Organization info для JSON-LD, футера, SEO
--   navigation_header — массив { href, label, order } (top-level)
--   navigation_footer — { columns: [{ title, items: [{href, label}] }] }
--   homepage_trust_bar — { text, clients: [{ name, logo }] }
--
-- Идемпотентно: ON CONFLICT (key) DO NOTHING. НЕ затирает уже
-- введённые клиентом данные.
-- ============================================================

BEGIN;

-- ────────────────────────────────────────────────────────────
-- 1. organization — глобальные данные бренда
-- Источник: lib/seo/site.ts (SITE, BUSINESS, HOURS, ADDRESS частично)
-- ────────────────────────────────────────────────────────────
INSERT INTO site_settings (key, value) VALUES
  ('organization', $$
    {
      "name":              "Рекламная компания 2х2",
      "short_name":        "2х2",
      "legal_name":        "ИП Сивоконь А.А.",
      "slogan":            "2х2 — потому что с нами просто!",
      "description":       "Рекламная компания «2х2» в Ханты-Мансийске: полиграфия, наружная реклама, вывески, световые буквы, стелы, оформление фасадов. Работаем по ХМАО-Югре и ЯНАО.",
      "short_description": "Полиграфия, вывески, наружная реклама и фасады под ключ в Ханты-Мансийске и ХМАО.",
      "locale":            "ru_RU",
      "language":          "ru",
      "theme_color":       "#FF6600",
      "og_image":          "/og-image.jpg",
      "founding_year":     2014,
      "price_range":       "₽₽",
      "area_served": [
        "Ханты-Мансийск",
        "Сургут",
        "Нижневартовск",
        "Нефтеюганск",
        "Нягань",
        "Когалым",
        "Мегион",
        "Лангепас",
        "Пыть-Ях",
        "Урай",
        "пгт. Фёдоровский",
        "Новый Уренгой",
        "ХМАО-Югра",
        "ЯНАО"
      ],
      "keywords_global": [
        "рекламная компания ханты-мансийск",
        "реклама хмао",
        "наружная реклама ханты-мансийск",
        "полиграфия ханты-мансийск",
        "вывески ханты-мансийск",
        "световые буквы хмао",
        "печать визиток ханты-мансийск",
        "баннер ханты-мансийск",
        "стелы азс",
        "оформление фасадов хмао",
        "реклама сургут",
        "2х2 реклама"
      ]
    }
  $$::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- 2. navigation_header — верхнее меню
-- Источник: components/layout/HeaderClient.tsx:navLinks
-- ────────────────────────────────────────────────────────────
INSERT INTO site_settings (key, value) VALUES
  ('navigation_header', $$
    {
      "items": [
        { "href": "/",          "label": "Главная",    "order": 10, "visible": true },
        { "href": "/about",     "label": "О нас",      "order": 20, "visible": true },
        { "href": "/services",  "label": "Услуги",     "order": 30, "visible": true },
        { "href": "/portfolio", "label": "Портфолио",  "order": 40, "visible": true },
        { "href": "/faq",       "label": "FAQ",        "order": 50, "visible": true },
        { "href": "/contacts",  "label": "Контакты",   "order": 60, "visible": true }
      ]
    }
  $$::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- 3. navigation_footer — колонки футера
-- Источник: components/layout/Footer.tsx
-- ────────────────────────────────────────────────────────────
INSERT INTO site_settings (key, value) VALUES
  ('navigation_footer', $$
    {
      "columns": [
        {
          "title": "Навигация",
          "items": [
            { "href": "/",          "label": "Главная"   },
            { "href": "/about",     "label": "О нас"     },
            { "href": "/services",  "label": "Услуги"    },
            { "href": "/portfolio", "label": "Портфолио" },
            { "href": "/faq",       "label": "FAQ"       },
            { "href": "/contacts",  "label": "Контакты"  }
          ]
        },
        {
          "title": "Услуги",
          "items": [
            { "href": "/services", "label": "Полиграфия"          },
            { "href": "/services", "label": "Наружная реклама"     },
            { "href": "/services", "label": "Оформление фасадов"   }
          ]
        }
      ]
    }
  $$::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- 4. homepage_trust_bar — логотипы клиентов под hero главной
-- Источник: content/home.ts:trustBarText, trustBarClients
-- ────────────────────────────────────────────────────────────
INSERT INTO site_settings (key, value) VALUES
  ('homepage_trust_bar', $$
    {
      "text": "Нам доверяют крупные компании и госструктуры ХМАО и ЯНАО",
      "clients": [
        { "name": "ВТБ",         "logo": "/clients/vtb.svg"      },
        { "name": "Брусника",    "logo": "/clients/brusnika.svg" },
        { "name": "ЮКИОР",       "logo": "/clients/yukior.svg"   },
        { "name": "Pirelli",     "logo": "/clients/pirelli.svg"  },
        { "name": "АЗС АртСевер","logo": "/clients/artsever.svg" },
        { "name": "АЗС Нефть",   "logo": "/clients/neft.svg"     }
      ]
    }
  $$::jsonb)
ON CONFLICT (key) DO NOTHING;

COMMIT;
