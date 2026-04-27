-- =============================================================
-- 027 — seed: одна базовая запись в team_members
-- =============================================================
-- feat(home) 2026-04-27.
--
-- На главной добавлена секция «Наша команда» (AboutTeam),
-- которая gracefully скрывается, если в БД нет активных
-- сотрудников. Чтобы клиент сразу увидел блок после деплоя,
-- сидим одну plaintext-запись с placeholder-аватаркой
-- (TeamSectionClient рендерит /team/placeholder.svg при NULL
-- photo_url). Клиент потом загрузит реальное фото и допишет
-- bio через /admin/content/team.
--
-- Идемпотентно: WHERE NOT EXISTS — повторный запуск ничего
-- не меняет (у team_members нет UNIQUE на name, поэтому ON
-- CONFLICT DO NOTHING без таргета невозможен).
-- =============================================================

INSERT INTO team_members (name, role, photo_url, bio, sort_order, is_active)
SELECT
  'Александр',
  'Руководитель',
  NULL,
  'Основатель компании «2х2». 15 лет в наружной рекламе ХМАО-Югры.',
  0,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM team_members WHERE name = 'Александр' AND role = 'Руководитель'
);
