-- ============================================================
-- 016_lead_promo_code.sql
-- ============================================================
-- Промокод-маркер на формах заявок (без онлайн-оплаты).
--
-- Контекст. Раздел /admin/promos оставлен (см. memory:
-- project_2x2_pricing_model — все услуги по индивидуальному
-- расчёту, CDEK Pay не нужен). Промокод НЕ даёт автоскидку,
-- а служит маркером «клиент знает про акцию X»: помогает
-- менеджеру при подготовке КП и аналитике эффективности
-- кампаний/баннеров.
--
-- Решение. Не трогаем существующую таблицу `promo_codes`
-- (её схема — для классической корзины+чекаута). Просто
-- добавляем nullable `promo_code text` в три таблицы заявок:
--   - leads
--   - calculation_requests
--   - contact_requests
--
-- Привязка к `promo_codes.id` намеренно НЕ делается — клиент
-- может ввести любой текст, в т.ч. устаревший/опечатанный код.
-- Менеджер уточняет вручную, аналитика смотрит сырое значение.
-- При необходимости в будущем можно завести триггер, который
-- по INSERT матчит promo_code → promo_code_id (FK SET NULL).
--
-- Идемпотентно: ADD COLUMN IF NOT EXISTS.
--
-- Автор: backend-developer, 2026-04-25.
-- ============================================================

BEGIN;

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS promo_code TEXT;

ALTER TABLE calculation_requests
  ADD COLUMN IF NOT EXISTS promo_code TEXT;

ALTER TABLE contact_requests
  ADD COLUMN IF NOT EXISTS promo_code TEXT;

-- Индексы — точное совпадение и быстрые отчёты «сколько заявок
-- по коду X». Промокодов мало, выборка частая (отчёт менеджера),
-- запись редкая → выгодно держать btree.
CREATE INDEX IF NOT EXISTS idx_leads_promo_code
  ON leads(promo_code) WHERE promo_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_calc_requests_promo_code
  ON calculation_requests(promo_code) WHERE promo_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contact_requests_promo_code
  ON contact_requests(promo_code) WHERE promo_code IS NOT NULL;

COMMIT;
