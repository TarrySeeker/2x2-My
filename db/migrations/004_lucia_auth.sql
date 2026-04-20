-- ============================================================
-- 004_lucia_auth.sql
-- Таблицы для Lucia Auth v3 + ALTER TABLE FK на users(id)
-- ============================================================
-- Применяется ПОСЛЕ 003_triggers_and_functions.sql.
--
-- Что делает:
--   1. Создаёт таблицу users (id TEXT) — заменяет Supabase auth.users
--      и удалённую profiles. Содержит роли и поля для Lucia.
--   2. Создаёт таблицу sessions (id TEXT) — для Lucia v3.
--   3. Добавляет триггер updated_at для users.
--   4. Прописывает FK из доменных таблиц (orders.customer_id,
--      cart_items.user_id, blog_posts.author_id, audit_log.user_id и т.д.)
--      на users(id). В 002_schema.sql эти поля созданы как TEXT
--      без FK, чтобы не зависеть от порядка миграций.
--
-- Lucia v3 spec: https://lucia-auth.com/database/postgresql
-- ============================================================

-- ------------------------------------------------------------
-- USERS (для Lucia + админка)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  username      TEXT UNIQUE NOT NULL,
  email         TEXT UNIQUE,
  full_name     TEXT,
  password_hash TEXT NOT NULL,
  role          user_role NOT NULL DEFAULT 'manager',
  avatar_url    TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ------------------------------------------------------------
-- SESSIONS (Lucia v3)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- ------------------------------------------------------------
-- updated_at для users
-- (trg_update_updated_at() создан в 003_triggers_and_functions.sql)
-- ------------------------------------------------------------
DROP TRIGGER IF EXISTS tr_users_updated ON users;
CREATE TRIGGER tr_users_updated BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION trg_update_updated_at();

-- ============================================================
-- FK на users(id) для доменных таблиц.
-- Все ALTER TABLE обёрнуты в DO ... EXCEPTION duplicate_object,
-- чтобы миграцию можно было прогнать повторно.
-- ============================================================

-- orders.customer_id -> users(id)
DO $$ BEGIN
  ALTER TABLE orders
    ADD CONSTRAINT fk_orders_customer
    FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- orders.assigned_to -> users(id)
DO $$ BEGIN
  ALTER TABLE orders
    ADD CONSTRAINT fk_orders_assigned_to
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- order_status_history.changed_by -> users(id)
DO $$ BEGIN
  ALTER TABLE order_status_history
    ADD CONSTRAINT fk_order_status_history_changed_by
    FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- cart_items.user_id -> users(id)
DO $$ BEGIN
  ALTER TABLE cart_items
    ADD CONSTRAINT fk_cart_items_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- wishlist_items.user_id -> users(id)
DO $$ BEGIN
  ALTER TABLE wishlist_items
    ADD CONSTRAINT fk_wishlist_items_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- calculation_requests.assigned_to -> users(id)
DO $$ BEGIN
  ALTER TABLE calculation_requests
    ADD CONSTRAINT fk_calc_requests_assigned_to
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- leads.assigned_to -> users(id)
DO $$ BEGIN
  ALTER TABLE leads
    ADD CONSTRAINT fk_leads_assigned_to
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- blog_posts.author_id -> users(id)
DO $$ BEGIN
  ALTER TABLE blog_posts
    ADD CONSTRAINT fk_blog_posts_author
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- audit_log.user_id -> users(id)
DO $$ BEGIN
  ALTER TABLE audit_log
    ADD CONSTRAINT fk_audit_log_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- Конец 004_lucia_auth.sql
-- ============================================================
