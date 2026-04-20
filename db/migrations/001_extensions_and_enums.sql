-- ============================================================
-- 001_extensions_and_enums.sql
-- Расширения PostgreSQL и ENUM-типы для проекта «2х2»
-- ============================================================
-- Применяется на чистую БД (PostgreSQL 15+).
-- Идемпотентно (CREATE EXTENSION IF NOT EXISTS / DO ... EXCEPTION).
--
-- Отличия от Supabase-версии (00001_initial_schema.sql):
--   * Не создаёт auth.uid(), is_admin() и других хелперов RLS —
--     RLS в этой инсталляции не используется.
-- ============================================================

-- ------------------------------------------------------------
-- Расширения
-- ------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- ------------------------------------------------------------
-- ENUM-типы
-- ------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('owner', 'manager', 'content');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE product_status AS ENUM ('active', 'draft', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE product_pricing_mode AS ENUM ('fixed', 'calculator', 'quote');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE order_status AS ENUM (
    'new', 'confirmed', 'in_production', 'ready', 'shipped',
    'delivered', 'completed', 'cancelled', 'returned'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE order_type AS ENUM ('cart', 'one_click');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE review_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE promo_type AS ENUM ('fixed', 'percent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE post_status AS ENUM ('draft', 'published', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE calculation_status AS ENUM (
    'new', 'in_progress', 'quoted', 'approved', 'rejected'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE lead_status AS ENUM ('new', 'in_progress', 'done', 'spam');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE contact_status AS ENUM ('new', 'answered', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- Конец 001_extensions_and_enums.sql
-- ============================================================
