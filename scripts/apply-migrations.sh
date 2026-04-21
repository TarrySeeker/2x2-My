#!/bin/sh
# =============================================================
# apply-migrations.sh — идемпотентное применение миграций
# =============================================================
# Когда нужен этот скрипт:
#   * При обновлении кода после первого деплоя — postgres init-folder
#     (`/docker-entrypoint-initdb.d/`) запускается ТОЛЬКО на пустой
#     volume. Для применения новых миграций к существующей БД
#     используем этот скрипт.
#
# Запуск (изнутри контейнера app):
#   docker compose exec app sh /app/scripts/apply-migrations.sh
#
# С seed (только для пустой БД!):
#   docker compose exec -e APPLY_SEED=true app sh /app/scripts/apply-migrations.sh
#
# Все миграции написаны идемпотентно (CREATE TABLE IF NOT EXISTS,
# DO ... EXCEPTION для ENUM, etc.) — повторное применение безопасно.
# =============================================================
set -eu

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL is not set" >&2
  exit 1
fi

# Пытаемся найти psql; в node:20-alpine его нет — устанавливаем.
if ! command -v psql >/dev/null 2>&1; then
  echo "Installing postgresql-client (psql) ..."
  apk add --no-cache postgresql-client >/dev/null
fi

MIGRATIONS_DIR="${MIGRATIONS_DIR:-/app/db/migrations}"
SEED_FILE="${SEED_FILE:-/app/db/seed.sql}"

if [ ! -d "$MIGRATIONS_DIR" ]; then
  echo "ERROR: migrations dir not found: $MIGRATIONS_DIR" >&2
  exit 1
fi

echo "==> Applying migrations from $MIGRATIONS_DIR"
for f in "$MIGRATIONS_DIR"/*.sql; do
  [ -e "$f" ] || continue  # на случай пустой папки
  echo "    -> $f"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
done

if [ "${APPLY_SEED:-false}" = "true" ]; then
  if [ -f "$SEED_FILE" ]; then
    echo "==> Applying seed: $SEED_FILE"
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$SEED_FILE"
  else
    echo "WARN: APPLY_SEED=true но файл $SEED_FILE не найден" >&2
  fi
fi

echo "==> Done."
