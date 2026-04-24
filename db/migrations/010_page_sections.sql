-- ============================================================
-- 010_page_sections.sql — универсальный контент секций всех страниц
-- ============================================================
-- Этап CMS-перевода витрины (2026-04-24). Переносит hardcoded JSX-блоки
-- со страниц /about, /contacts, /calculator, /portfolio, /faq, /blog
-- в редактируемый клиентом JSONB.
--
-- ── Почему новая таблица, а не расширение homepage_sections ──
--
--   1) homepage_sections уже используется боевым кодом (reads через
--      getSection(key), upsertSection). PK = key (TEXT), и ключи
--      глобально уникальны ('hero', 'about', 'services' ...). Добавить
--      page_path без breaking-changes нельзя — придётся менять PK,
--      перенастраивать кэш-теги `cms:<key>`, ломать все места читающие
--      getSection('hero'). Это большая миграция с риском регрессий.
--
--   2) Новая page_sections с composite UNIQUE (page_path, section_key) —
--      чистая модель: одна таблица, ключи локальны для страницы.
--      homepage_sections остаётся как legacy-хранилище для '/' и
--      существующий код продолжает работать без правок.
--
--   3) В будущем (когда homepage будет отрефачен на page_sections) —
--      перенесём данные и дропнем homepage_sections отдельной
--      миграцией. Это НЕ задача текущего этапа.
--
-- Что хранится в page_sections (по страницам):
--   /about       : hero, story, values, team_header, cta
--   /contacts    : hero, contact_info, map, form_header
--   /calculator  : hero, categories, faq, cta
--   /portfolio   : hero
--   /faq         : hero, items
--   /blog        : hero
--   /services    : hero, cards, cta  (page-level CTA, отдельно от '/')
--
-- Семантика:
--   content_type определяет интерпретацию content JSONB.
--   Поддерживаемые типы (zod-валидация на уровне backend):
--     * hero          — { badge, title, description }
--     * text_block    — { headline, paragraphs[], mission? }
--     * stats_grid    — { items: [{value, label}] }
--     * cards_grid    — { headline?, subheadline?, items: [...] }
--     * faq           — { headline?, subheadline?, items: [{question, answer, emoji?}] }
--     * cta           — { headline, subheadline?, button_text?, button_url? }
--     * contact_info  — { items: [{icon, label, value, link, external?}] }
--     * values        — { headline?, subheadline?, items: [{icon, title, description}] }
--
-- Идемпотентно. RLS не используется (см. db/README.md).
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. Таблица
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS page_sections (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_path     TEXT NOT NULL,                    -- '/about', '/contacts' ...
  section_key   TEXT NOT NULL,                    -- 'hero', 'story', 'faq' ...
  content_type  TEXT NOT NULL,                    -- 'hero' | 'cards_grid' | 'faq' | ...
  content       JSONB NOT NULL DEFAULT '{}'::jsonb,
  display_order INT NOT NULL DEFAULT 0,
  enabled       BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by    TEXT NULL,
  CONSTRAINT uq_page_sections_page_key UNIQUE (page_path, section_key)
);

COMMENT ON TABLE  page_sections IS 'Блоки контента для всех не-главных страниц. Структура content зависит от content_type (Zod-валидация в backend).';
COMMENT ON COLUMN page_sections.page_path IS 'Относительный путь страницы (/about, /contacts, /faq ...).';
COMMENT ON COLUMN page_sections.section_key IS 'Логический ключ секции в рамках страницы (hero, story, values, faq, cta ...).';
COMMENT ON COLUMN page_sections.content_type IS 'Тип контента — определяет, какую Zod-схему применять и какой компонент рендерить.';
COMMENT ON COLUMN page_sections.display_order IS 'Порядок отображения внутри страницы. Меньше — выше.';
COMMENT ON COLUMN page_sections.enabled IS 'Если false — секция не рендерится (даже fallback подавляется).';

-- ------------------------------------------------------------
-- 2. Индексы
-- ------------------------------------------------------------
-- Основной индекс: выборка всех опубликованных секций страницы в правильном порядке
CREATE INDEX IF NOT EXISTS idx_page_sections_path_order
  ON page_sections (page_path, display_order)
  WHERE enabled = true;

-- Индекс для админки (все секции страницы, включая отключённые)
CREATE INDEX IF NOT EXISTS idx_page_sections_path_all
  ON page_sections (page_path, display_order);

-- ------------------------------------------------------------
-- 3. Триггер updated_at
-- ------------------------------------------------------------
DROP TRIGGER IF EXISTS tr_page_sections_updated ON page_sections;
CREATE TRIGGER tr_page_sections_updated
  BEFORE UPDATE ON page_sections
  FOR EACH ROW EXECUTE FUNCTION trg_update_updated_at();

-- ------------------------------------------------------------
-- 4. Seed — переносим тексты из текущих компонентов и страниц
-- ------------------------------------------------------------

-- ═══════════════════════════════════════════════════════════
-- /about
-- ═══════════════════════════════════════════════════════════

-- Источник: components/sections/about/AboutHero.tsx
INSERT INTO page_sections (page_path, section_key, content_type, content, display_order) VALUES
  ('/about', 'hero', 'hero', $$
    {
      "badge": "О нас",
      "title": "Рекламное агентство с характером",
      "description": "Мы создаём рекламу, которая работает. Помогаем бизнесу быть заметным."
    }
  $$::jsonb, 10)
ON CONFLICT (page_path, section_key) DO NOTHING;

-- Источник: components/sections/about/AboutStory.tsx
INSERT INTO page_sections (page_path, section_key, content_type, content, display_order) VALUES
  ('/about', 'story', 'text_block', $$
    {
      "headline": "Наша история",
      "paragraphs": [
        "Агентство 2×2 основано в 2011 году партнёрами с многолетним опытом. Начинали с небольшой студии полиграфии, но быстро поняли: клиентам нужен комплексный подход.",
        "Сегодня мы — команда из 7 специалистов: дизайнеры, технологи, монтажники.",
        "За 15 лет реализовали более 500 проектов — от визиток до брендирования масштабных работ."
      ],
      "mission": {
        "title": "Наша миссия",
        "text": "Помогать бизнесу быть заметным. Создавать рекламу, которая привлекает внимание и приносит результат."
      },
      "stats": [
        {"value": "2011", "label": "год основания"},
        {"value": "7+",   "label": "специалистов в команде"},
        {"value": "15",   "label": "лет на рынке ХМАО"}
      ],
      "image": "/img/about-story-print.png",
      "image_alt": "Полиграфия, цветовые образцы и контроль качества печати"
    }
  $$::jsonb, 20)
ON CONFLICT (page_path, section_key) DO NOTHING;

-- Источник: components/sections/about/AboutValues.tsx
INSERT INTO page_sections (page_path, section_key, content_type, content, display_order) VALUES
  ('/about', 'values', 'values', $$
    {
      "headline": "Наши ценности",
      "subheadline": "То, что отличает нас от других агентств",
      "items": [
        {"icon": "Star",   "title": "Качество",  "description": "Не идём на компромисс с качеством материалов и исполнения."},
        {"icon": "Clock",  "title": "Сроки",     "description": "Всегда укладываемся в дедлайн, даже при срочных заказах."},
        {"icon": "Heart",  "title": "Отношение", "description": "К каждому клиенту — индивидуальный подход."},
        {"icon": "Users",  "title": "Команда",   "description": "Опытные специалисты на каждом этапе: дизайн, производство, монтаж."}
      ]
    }
  $$::jsonb, 30)
ON CONFLICT (page_path, section_key) DO NOTHING;

-- Источник: app/about/page.tsx — CtaSection (override title/subtitle)
INSERT INTO page_sections (page_path, section_key, content_type, content, display_order) VALUES
  ('/about', 'cta', 'cta', $$
    {
      "headline": "Хотите работать с нами?",
      "subheadline": "Свяжитесь — обсудим ваш проект и рассчитаем стоимость",
      "button_text": "Получить расчёт",
      "button_url": "/contacts"
    }
  $$::jsonb, 50)
ON CONFLICT (page_path, section_key) DO NOTHING;


-- ═══════════════════════════════════════════════════════════
-- /contacts
-- ═══════════════════════════════════════════════════════════

-- Источник: app/contacts/page.tsx — ServicesHero
INSERT INTO page_sections (page_path, section_key, content_type, content, display_order) VALUES
  ('/contacts', 'hero', 'hero', $$
    {
      "badge": "Контакты",
      "title": "Свяжитесь с нами",
      "description": "Перезвоним в течение часа и рассчитаем стоимость бесплатно"
    }
  $$::jsonb, 10)
ON CONFLICT (page_path, section_key) DO NOTHING;

-- Источник: components/sections/contacts/ContactInfo.tsx
-- `phone_primary`/`phone_secondary`/`email`/`address` берутся из site_settings.contacts,
-- но label'ы и порядок блоков — здесь.
INSERT INTO page_sections (page_path, section_key, content_type, content, display_order) VALUES
  ('/contacts', 'contact_info', 'contact_info', $$
    {
      "items": [
        {"icon": "Phone",        "label": "По общим вопросам",     "binding": "contacts.phone_primary"},
        {"icon": "Phone",        "label": "По вопросам портфолио", "binding": "contacts.phone_secondary"},
        {"icon": "Mail",         "label": "Email",                 "binding": "contacts.email"},
        {"icon": "ExternalLink", "label": "ВКонтакте",             "binding": "socials.vk"},
        {"icon": "MapPin",       "label": "Адрес",                 "binding": "contacts.address"},
        {"icon": "Clock",        "label": "Режим работы",          "binding": "business_hours.display"}
      ],
      "form_title": "Оставьте заявку",
      "info_title": "Как с нами связаться",
      "map_embed_url": "https://www.google.com/maps?q=%D1%83%D0%BB.+%D0%9F%D0%B0%D1%80%D0%BA%D0%BE%D0%B2%D0%B0%D1%8F,+92%D0%B1,+%D0%A5%D0%B0%D0%BD%D1%82%D1%8B-%D0%9C%D0%B0%D0%BD%D1%81%D0%B8%D0%B9%D1%81%D0%BA&hl=ru&z=15&output=embed",
      "map_iframe_title": "Карта офиса 2×2"
    }
  $$::jsonb, 20)
ON CONFLICT (page_path, section_key) DO NOTHING;


-- ═══════════════════════════════════════════════════════════
-- /calculator
-- ═══════════════════════════════════════════════════════════

INSERT INTO page_sections (page_path, section_key, content_type, content, display_order) VALUES
  ('/calculator', 'hero', 'hero', $$
    {
      "badge": "Онлайн-калькулятор",
      "title": "Рассчитайте стоимость рекламы за 1 минуту",
      "description": "Визитки, баннеры, вывески, световые буквы — введите параметры и получите цену сразу. Без регистрации."
    }
  $$::jsonb, 10)
ON CONFLICT (page_path, section_key) DO NOTHING;

-- Источник: app/calculator/page.tsx:CALC_LINKS
INSERT INTO page_sections (page_path, section_key, content_type, content, display_order) VALUES
  ('/calculator', 'categories', 'cards_grid', $$
    {
      "headline": "Какую услугу считаем?",
      "subheadline": "Выберите категорию — калькулятор откроется внутри карточки услуги.",
      "items": [
        {"icon": "Calculator", "title": "Визитки",             "description": "Тираж, бумага, ламинация — цена за 1 тираж и за штуку.",       "href": "/catalog/poligrafiya",         "badge": "от 1,7 ₽/шт."},
        {"icon": "Calculator", "title": "Листовки и флаеры",   "description": "Формат А6–А4, плотность бумаги, цветность — мгновенный расчёт.","href": "/catalog/poligrafiya",         "badge": "от 3 ₽/шт."},
        {"icon": "Calculator", "title": "Баннеры",             "description": "Ширина × высота в метрах. Материал, люверсы, оформление.",     "href": "/catalog/naruzhnaya-reklama",  "badge": "от 450 ₽/м²"},
        {"icon": "Calculator", "title": "Световые буквы",      "description": "Длина периметра, тип подсветки, материал. Сразу вилка цены.",  "href": "/catalog/naruzhnaya-reklama",  "badge": "от 150 ₽/см"},
        {"icon": "Calculator", "title": "Вывески и лайтбоксы", "description": "Размеры, тип конструкции, материалы лицевой части.",           "href": "/catalog/naruzhnaya-reklama",  "badge": "от 8 500 ₽/м²"},
        {"icon": "Calculator", "title": "Оклейка транспорта",  "description": "Частичная или полный wrap. Плёнка, площадь, срок.",            "href": "/catalog/oformlenie",          "badge": "от 15 000 ₽"}
      ],
      "cta_text_on_card": "К калькулятору"
    }
  $$::jsonb, 20)
ON CONFLICT (page_path, section_key) DO NOTHING;

-- Источник: app/calculator/page.tsx:FAQ
INSERT INTO page_sections (page_path, section_key, content_type, content, display_order) VALUES
  ('/calculator', 'faq', 'faq', $$
    {
      "headline": "Частые вопросы о калькуляторе",
      "items": [
        {
          "question": "Насколько точен калькулятор?",
          "answer":   "Калькулятор даёт стартовую цену по базовым параметрам. Финальная стоимость уточняется менеджером после замеров, фотомонтажа и согласования материалов."
        },
        {
          "question": "Нужно ли что-то платить за расчёт?",
          "answer":   "Нет. Расчёт стоимости, консультация и фотомонтаж бесплатны. Мы берём оплату только за готовый заказ."
        },
        {
          "question": "Работает ли калькулятор для сложных проектов?",
          "answer":   "Для крышных вывесок, стел и комплексных фасадных решений нужен индивидуальный расчёт. Оставьте заявку «Заказать расчёт» — ответим в течение часа в рабочее время."
        },
        {
          "question": "Можно ли получить счёт для юр. лица?",
          "answer":   "Да. Работаем с ООО, ИП и госструктурами по договору. Выставляем счёт, акт, счёт-фактуру и УПД."
        }
      ]
    }
  $$::jsonb, 30)
ON CONFLICT (page_path, section_key) DO NOTHING;

INSERT INTO page_sections (page_path, section_key, content_type, content, display_order) VALUES
  ('/calculator', 'cta', 'cta', $$
    {
      "headline": "Не нашли свою услугу в калькуляторе?",
      "subheadline": "Закажите индивидуальный расчёт — ответим в течение часа в рабочее время",
      "button_text": "Получить расчёт",
      "button_url": "/contacts"
    }
  $$::jsonb, 40)
ON CONFLICT (page_path, section_key) DO NOTHING;


-- ═══════════════════════════════════════════════════════════
-- /portfolio
-- ═══════════════════════════════════════════════════════════

-- Hero без кнопок — badge/title/description
INSERT INTO page_sections (page_path, section_key, content_type, content, display_order) VALUES
  ('/portfolio', 'hero', 'hero', $$
    {
      "badge": "Реализованные проекты",
      "title": "Портфолио",
      "description": "Наши работы в Ханты-Мансийске, Сургуте и других городах ХМАО и ЯНАО"
    }
  $$::jsonb, 10)
ON CONFLICT (page_path, section_key) DO NOTHING;


-- ═══════════════════════════════════════════════════════════
-- /faq
-- ═══════════════════════════════════════════════════════════

INSERT INTO page_sections (page_path, section_key, content_type, content, display_order) VALUES
  ('/faq', 'hero', 'hero', $$
    {
      "badge": "FAQ",
      "title": "Частые вопросы",
      "description": "Отвечаем на самые популярные вопросы наших клиентов"
    }
  $$::jsonb, 10)
ON CONFLICT (page_path, section_key) DO NOTHING;

-- Источник: lib/homeFaq.ts (6 вопросов) + lib/faqPageItems.ts (ещё 6)
-- Всего 12 вопросов. homeFaq — оставлен в CMS через homepage_sections.faq (миграция 006).
-- Здесь сохраняем ПОЛНЫЙ список для /faq страницы.
INSERT INTO page_sections (page_path, section_key, content_type, content, display_order) VALUES
  ('/faq', 'items', 'faq', $$
    {
      "items": [
        {
          "question": "Сколько стоит вывеска?",
          "answer": "Зависит от типа и размера. Ориентир: лайтбокс — от 8 500 ₽/м², световые буквы — от 150 ₽/см периметра, крышная вывеска — от 150 000 ₽ за проект. Пришлём точный расчёт в течение часа после вашей заявки. Замер и фотомонтаж — бесплатно.",
          "emoji": "💡"
        },
        {
          "question": "Сколько стоят визитки и листовки?",
          "answer": "Визитки 90×50 мм, офсет, 300 г/м², двусторонние: 1 000 шт. — от 1 700 ₽. Листовки А5, 130 г/м²: 1 000 шт. — от 1 900 ₽. Точная цена зависит от тиража, бумаги и ламинации. Расчёт — за час.",
          "emoji": "🖨️"
        },
        {
          "question": "Каковы сроки изготовления?",
          "answer": "Визитки и листовки — от 1 рабочего дня. Баннеры и таблички — от 2–3 дней. Вывески и световые буквы — от 7 до 21 рабочего дня. Крышные конструкции и стелы — от 30 дней. Срочный заказ обсудим отдельно.",
          "emoji": "⏱️"
        },
        {
          "question": "Как сделать заказ?",
          "answer": "Оставьте заявку на сайте или позвоните. Менеджер уточнит детали и пришлёт расчёт. После согласования подпишем договор, получим аванс и запустим производство. По готовности — доставка или монтаж.",
          "emoji": "📋"
        },
        {
          "question": "Работаете с юридическими лицами?",
          "answer": "Да. Договор, счёт, акт, накладная. Работаем по безналичному расчёту. Участвуем в тендерах по 44-ФЗ и 223-ФЗ. Реквизиты предоставим по запросу.",
          "emoji": "🏢"
        },
        {
          "question": "Даёте ли гарантию на работы?",
          "answer": "Полиграфия — 100% замена при производственном браке. Наружная реклама и вывески — 12 месяцев на материалы и монтаж. LED-подсветка — 36 месяцев. Гарантия фиксируется в договоре.",
          "emoji": "🛡️"
        },
        {
          "question": "Есть ли доставка и монтаж?",
          "answer": "Да! Организуем доставку по Москве и МО. Монтажная бригада выполняет установку вывесок и наружной рекламы. Работаем также в регионах — уточните наличие у менеджера.",
          "emoji": "🚚"
        },
        {
          "question": "Как рассчитать стоимость?",
          "answer": "Отправьте заявку на сайте или позвоните — бесплатно рассчитаем стоимость по вашему ТЗ. Для полиграфии важен тираж и формат, для наружной рекламы — размер и материал.",
          "emoji": "📋"
        },
        {
          "question": "Минимальный тираж для полиграфии?",
          "answer": "Для большинства позиций минимальный тираж — 100 шт. Для некоторых позиций (брошюры, буклеты) — от 50 шт. Малые тиражи возможны при цифровой печати.",
          "emoji": "📄"
        },
        {
          "question": "Нужен ли мне готовый макет?",
          "answer": "Нет. Наши дизайнеры разработают макет с нуля или доработают ваши исходники. Разработка дизайна оплачивается отдельно или входит в стоимость при крупных заказах.",
          "emoji": "🎨"
        },
        {
          "question": "Можно ли оплатить по безналу с НДС?",
          "answer": "Да, работаем с юридическими лицами и ИП. Принимаем наличный и безналичный расчёт, выставляем счета, заключаем договоры. Работаем с НДС и без НДС.",
          "emoji": "🏢"
        },
        {
          "question": "Как проходит работа с заказом?",
          "answer": "Этапы: 1) Заявка и консультация → 2) Расчёт и договор → 3) Разработка макета → 4) Согласование и печать → 5) Доставка или монтаж. Менеджер сопровождает на каждом этапе.",
          "emoji": "🔁"
        }
      ]
    }
  $$::jsonb, 20)
ON CONFLICT (page_path, section_key) DO NOTHING;

INSERT INTO page_sections (page_path, section_key, content_type, content, display_order) VALUES
  ('/faq', 'cta', 'cta', $$
    {
      "headline": "Остались вопросы?",
      "subheadline": "Позвоните или напишите — ответим быстро и развёрнуто",
      "button_text": "Получить расчёт",
      "button_url": "/contacts"
    }
  $$::jsonb, 30)
ON CONFLICT (page_path, section_key) DO NOTHING;


-- ═══════════════════════════════════════════════════════════
-- /blog
-- ═══════════════════════════════════════════════════════════

INSERT INTO page_sections (page_path, section_key, content_type, content, display_order) VALUES
  ('/blog', 'hero', 'hero', $$
    {
      "badge": "Блог",
      "title": "Статьи, гайды и кейсы",
      "description": "Цены, практика и требования к рекламе в Ханты-Мансийске и ХМАО. Материалы от команды «2х2»."
    }
  $$::jsonb, 10)
ON CONFLICT (page_path, section_key) DO NOTHING;


-- ═══════════════════════════════════════════════════════════
-- /services
-- ═══════════════════════════════════════════════════════════

INSERT INTO page_sections (page_path, section_key, content_type, content, display_order) VALUES
  ('/services', 'hero', 'hero', $$
    {
      "badge": "Услуги",
      "title": "Что мы делаем",
      "description": "Полиграфия, наружная реклама, вывески, световые буквы, стелы, оформление фасадов и транспорта — под ключ в ХМАО и ЯНАО."
    }
  $$::jsonb, 10)
ON CONFLICT (page_path, section_key) DO NOTHING;


COMMIT;
