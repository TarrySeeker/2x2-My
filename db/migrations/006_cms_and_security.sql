-- ============================================================
-- 006_cms_and_security.sql
-- ------------------------------------------------------------
-- Этап 1 master-плана 2026-04-23.
--
-- Делает:
--   A. Новые CMS-таблицы:
--        homepage_sections (key/JSONB content для секций главной)
--        site_settings     (key/JSONB value для глобальных настроек)
--        team_members      (карточки команды для /about)
--        promotions        (акции — попап + блок на главной)
--   B. ALTER TABLE на существующих таблицах:
--        portfolio_items.featured_order  (1..3 — "главные" работы)
--        users.must_change_password      (force-change при первом входе)
--        users.failed_login_attempts     (lockout по аккаунту)
--        users.locked_until              (lockout deadline)
--        leads / contact_requests / calculation_requests / orders:
--          + pd_consent_at / _version / _ip   (152-ФЗ согласие)
--          + idempotency_key                  (защита от двойной отправки)
--   C. DROP TABLE orders / order_items / order_status_history.
--      ⚠ DESTRUCTIVE: на проде применять ТОЛЬКО в Этапе 8 после
--        явного бэкапа. Команда `pg_dump --table=orders --table=order_items
--        --table=order_status_history` обязательна перед накатом.
--      Старые orders в проекте — dev-данные, бизнес перешёл
--        на модель "только индивидуальный расчёт".
--      get_dashboard_stats() переписан без зависимости от orders.
--   D. Сидинг дефолтов:
--        - homepage_sections: hero/about/services/promotions/portfolio/
--          features/faq/cta — тексты вытащены из текущих компонентов
--          components/sections/*.tsx
--        - site_settings: contacts/business_hours/socials/stats/seo_defaults
--        - team_members и promotions — пусто (заполнит клиент)
--
-- Идемпотентно: CREATE … IF NOT EXISTS, ADD COLUMN IF NOT EXISTS,
-- DROP TABLE IF EXISTS, ON CONFLICT DO NOTHING. Можно прогнать
-- повторно без побочных эффектов (после первого DROP таблицы orders
-- не существует — DROP IF EXISTS просто пропустится).
--
-- RLS не используется (см. db/README.md). Авторизация — в Server
-- Actions через requireAdmin(). Новые таблицы доступны бэку напрямую.
-- ============================================================

BEGIN;

-- ============================================================
-- A. НОВЫЕ ТАБЛИЦЫ
-- ============================================================

-- ------------------------------------------------------------
-- A.1 homepage_sections — контент секций главной (Zod-валидируемый JSONB)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS homepage_sections (
  key          TEXT PRIMARY KEY,        -- 'hero','about','services',...
  content      JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_published BOOLEAN NOT NULL DEFAULT true,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by   TEXT NULL                -- users.id (TEXT), без FK на случай удаления юзера
);

COMMENT ON TABLE  homepage_sections IS 'Секции главной страницы. Структура content зависит от key (валидируется Zod в backend).';
COMMENT ON COLUMN homepage_sections.is_published IS 'Если false — секция не рендерится на сайте (при этом дефолт-захардкоженный fallback тоже подавляется).';

-- ------------------------------------------------------------
-- A.2 site_settings — глобальные настройки сайта
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS site_settings (
  key        TEXT PRIMARY KEY,          -- 'contacts','socials','stats',...
  value      JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT NULL
);

COMMENT ON TABLE site_settings IS 'Глобальные настройки: контакты, соцсети, рабочие часы, дефолты SEO. ОТЛИЧАЕТСЯ от старой `settings` (key-value для магазина).';

-- ------------------------------------------------------------
-- A.3 team_members — карточки сотрудников (раздел /about)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS team_members (
  id         BIGSERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  role       TEXT NOT NULL,             -- должность
  photo_url  TEXT NULL,
  bio        TEXT NULL,
  sort_order INT  NOT NULL DEFAULT 0,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_members_active_sort
  ON team_members(is_active, sort_order);

-- ------------------------------------------------------------
-- A.4 promotions — акции (попап + блок на главной)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS promotions (
  id            BIGSERIAL PRIMARY KEY,
  title         TEXT NOT NULL,
  body          TEXT NOT NULL,            -- короткое описание для попапа/блока
  image_url     TEXT NULL,
  link_url      TEXT NULL,
  link_text     TEXT NULL,                -- default 'Подробнее' выставляет UI
  valid_from    TIMESTAMPTZ NULL,         -- NULL = с момента создания
  valid_to      TIMESTAMPTZ NULL,         -- NULL = бессрочно
  is_active     BOOLEAN NOT NULL DEFAULT true,
  show_as_popup BOOLEAN NOT NULL DEFAULT false,
  sort_order    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_promotions_active_valid
  ON promotions(is_active, valid_from, valid_to);

CREATE INDEX IF NOT EXISTS idx_promotions_popup
  ON promotions(show_as_popup) WHERE show_as_popup = true;

-- ------------------------------------------------------------
-- A.5 updated_at триггеры для новых таблиц
-- (trg_update_updated_at() создан в 003_triggers_and_functions.sql)
-- homepage_sections и site_settings PK = key, обновления делаются
-- через UPDATE — нужен триггер. team_members/promotions — тоже.
-- ------------------------------------------------------------
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'homepage_sections','site_settings','team_members','promotions'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS tr_%I_updated ON %I;', t, t);
    EXECUTE format(
      'CREATE TRIGGER tr_%I_updated BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION trg_update_updated_at();', t, t
    );
  END LOOP;
END $$;


-- ============================================================
-- B. ALTER TABLE: существующие таблицы
-- ============================================================

-- ------------------------------------------------------------
-- B.1 portfolio_items: featured_order (1..3) для блока "3 главные работы"
-- (is_featured уже есть в 002_schema.sql)
-- ------------------------------------------------------------
ALTER TABLE portfolio_items
  ADD COLUMN IF NOT EXISTS featured_order INT NULL;

-- Опциональный CHECK: либо обе NULL (не featured), либо featured + order 1..3.
-- Бэкенд (Этап 2) обеспечит целостность через транзакционный setFeatured(ids[]).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'portfolio_items_featured_order_check'
  ) THEN
    ALTER TABLE portfolio_items
      ADD CONSTRAINT portfolio_items_featured_order_check
      CHECK (
        featured_order IS NULL
        OR (featured_order BETWEEN 1 AND 3 AND is_featured = true)
      );
  END IF;
END $$;

-- Идемпотентный пересоздаваемый partial-индекс под выборку 3 featured.
-- Старый idx_portfolio_featured (из 002_schema.sql) остаётся — он по
-- одному столбцу is_featured. Новый — композитный по (is_featured, featured_order).
CREATE INDEX IF NOT EXISTS idx_portfolio_featured_order
  ON portfolio_items(is_featured, featured_order)
  WHERE is_featured = true;

-- ------------------------------------------------------------
-- B.2 users: force-change-password + lockout (P0/P1 security)
-- ------------------------------------------------------------
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS must_change_password   BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS failed_login_attempts  INT         NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until           TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_users_locked
  ON users(locked_until) WHERE locked_until IS NOT NULL;

COMMENT ON COLUMN users.must_change_password IS 'Если true — после логина редирект на /admin/settings/account/password. Сбрасывается в false после успешной смены.';
COMMENT ON COLUMN users.failed_login_attempts IS 'Счётчик подряд идущих неудачных попыток. Сбрасывается на 0 после успешного входа.';
COMMENT ON COLUMN users.locked_until IS 'Таймстамп окончания локаута. Если now() < locked_until — логин блокируется.';

-- ------------------------------------------------------------
-- B.3 ПД-согласие + идемпотентность для всех приёмников заявок.
-- Стратегия: на каждой существующей таблице с формой обратной
-- связи добавляем 4 колонки. NULL для существующих rows допустим
-- (миграция не enforce'ит NOT NULL — backend проставит значения
-- при INSERT новой записи).
-- Затронутые таблицы: leads, contact_requests, calculation_requests, orders.
-- ВАЖНО: orders дропнется ниже (секция C), но колонки добавляем в её
-- текущую инкарнацию для целостности схемы и чтобы прогон миграции 006
-- ДО прогона DROP (если запустят пошагово) был валидным.
-- ------------------------------------------------------------

-- leads
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS pd_consent_at      TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS pd_consent_version TEXT        NULL,
  ADD COLUMN IF NOT EXISTS pd_consent_ip      INET        NULL,
  ADD COLUMN IF NOT EXISTS idempotency_key    TEXT        NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_leads_idempotency_key
  ON leads(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- contact_requests
ALTER TABLE contact_requests
  ADD COLUMN IF NOT EXISTS pd_consent_at      TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS pd_consent_version TEXT        NULL,
  ADD COLUMN IF NOT EXISTS pd_consent_ip      INET        NULL,
  ADD COLUMN IF NOT EXISTS idempotency_key    TEXT        NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_contact_requests_idempotency_key
  ON contact_requests(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- calculation_requests
ALTER TABLE calculation_requests
  ADD COLUMN IF NOT EXISTS pd_consent_at      TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS pd_consent_version TEXT        NULL,
  ADD COLUMN IF NOT EXISTS pd_consent_ip      INET        NULL,
  ADD COLUMN IF NOT EXISTS idempotency_key    TEXT        NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_calc_requests_idempotency_key
  ON calculation_requests(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- orders (если ещё существует — будет дропнута в C)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='orders') THEN
    ALTER TABLE orders
      ADD COLUMN IF NOT EXISTS pd_consent_at      TIMESTAMPTZ NULL,
      ADD COLUMN IF NOT EXISTS pd_consent_version TEXT        NULL,
      ADD COLUMN IF NOT EXISTS pd_consent_ip      INET        NULL,
      ADD COLUMN IF NOT EXISTS idempotency_key    TEXT        NULL;

    -- partial unique index, аналогично leads
    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_idempotency_key
             ON orders(idempotency_key) WHERE idempotency_key IS NOT NULL';
  END IF;
END $$;


-- ============================================================
-- C. DROP корзины/orders.
-- ⚠ DESTRUCTIVE. На проде применять ТОЛЬКО в Этапе 8 после
-- pg_dump бэкапа. На локалке безопасно — данные dev-only.
--
-- Порядок DROP важен из-за FK:
--   reviews.order_id  -> orders          (set null on delete уже стоит, FK дропнется CASCADE)
--   order_items.order_id        -> orders (CASCADE)
--   order_status_history.order_id -> orders (CASCADE)
--   cart_items                  -> products (но связан с витриной корзины — клиент решил удалить вместе)
--
-- DROP TABLE … CASCADE сам почистит зависимые FK.
-- ============================================================

DROP TABLE IF EXISTS order_status_history CASCADE;
DROP TABLE IF EXISTS order_items          CASCADE;
DROP TABLE IF EXISTS orders               CASCADE;
DROP TABLE IF EXISTS cart_items           CASCADE;

-- reviews.order_id остаётся как BIGINT NULL (FK был удалён CASCADE'ом
-- от DROP orders). Колонку оставляем — у отзывов могут быть исторические
-- ссылки, заполнены NULL'ами после drop'а.

-- ------------------------------------------------------------
-- C.1 Пересоздать get_dashboard_stats() без orders
-- (Старая версия в 003_*.sql ссылается на orders — после DROP вызов
-- упадёт с relation does not exist.)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS JSONB AS $$
  SELECT jsonb_build_object(
    'new_calc_requests', (
      SELECT COUNT(*) FROM calculation_requests WHERE status = 'new'
    ),
    'calc_requests_week', (
      SELECT COUNT(*) FROM calculation_requests
      WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
    ),
    'calc_requests_month', (
      SELECT COUNT(*) FROM calculation_requests
      WHERE created_at >= date_trunc('month', CURRENT_DATE)
    ),
    'new_leads', (
      SELECT COUNT(*) FROM leads WHERE status = 'new'
    ),
    'leads_week', (
      SELECT COUNT(*) FROM leads
      WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
    ),
    'new_contacts', (
      SELECT COUNT(*) FROM contact_requests WHERE status = 'new'
    ),
    'pending_reviews', (
      SELECT COUNT(*) FROM reviews WHERE status = 'pending'
    ),
    'products_active', (
      SELECT COUNT(*) FROM products
      WHERE status = 'active' AND deleted_at IS NULL
    ),
    'products_draft', (
      SELECT COUNT(*) FROM products WHERE status = 'draft'
    ),
    'portfolio_count', (
      SELECT COUNT(*) FROM portfolio_items WHERE is_published = true
    ),
    'recent_calc_requests', (
      SELECT COALESCE(jsonb_agg(sub ORDER BY sub.created_at DESC), '[]'::jsonb)
      FROM (
        SELECT id, request_number, customer_name, customer_phone,
               status, created_at
        FROM calculation_requests ORDER BY created_at DESC LIMIT 5
      ) sub
    ),
    'recent_leads', (
      SELECT COALESCE(jsonb_agg(sub ORDER BY sub.created_at DESC), '[]'::jsonb)
      FROM (
        SELECT id, lead_number, customer_name, customer_phone,
               source, status, created_at
        FROM leads ORDER BY created_at DESC LIMIT 5
      ) sub
    )
  );
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION get_dashboard_stats() IS 'Версия после Chain CMS: orders/order_items удалены, дашборд показывает заявки.';

-- ------------------------------------------------------------
-- C.2 trg_orders_number / trg_orders_number_post / order_type ENUM:
-- триггеры на orders дропнулись CASCADE'ом вместе с таблицей.
-- Сами функции trg_orders_number()/trg_orders_number_post() остаются
-- висеть в схеме — они безвредны (не вызываются), DROP'ить не будем,
-- чтобы не задевать чужие миграции. Аналогично ENUM order_status /
-- order_type — оставляем (могут пригодиться при ре-вводе заказов
-- в будущем; CREATE TYPE IF NOT EXISTS из 001_*.sql их бережно вернёт).
-- ============================================================


COMMIT;


-- ============================================================
-- D. СИДИНГ ДЕФОЛТОВ
-- (вынесен в отдельный файл db/seed_cms.sql для чистоты —
-- миграции = DDL, сиды = DML).
-- ============================================================
-- См. db/seed_cms.sql.
