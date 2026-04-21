#!/bin/bash
# =============================================================
# 2x2-shop — entry для postgres docker-entrypoint-initdb.d/
# =============================================================
# Этот скрипт запускается ОДИН РАЗ при инициализации пустого
# postgres volume (см. https://hub.docker.com/_/postgres).
#
# Postgres-entrypoint исполняет файлы из /docker-entrypoint-initdb.d/
# в alphanumeric-порядке, но НЕ заходит в подкаталоги. Поэтому мы
# монтируем `db/migrations/` как подкаталог `/docker-entrypoint-initdb.d/migrations/`
# и явно проходим по нему.
#
# После всех миграций — опционально применяется seed.sql, если
# монтирован как `/docker-entrypoint-initdb.d/zz_seed.sql`.
# =============================================================
set -eu

MIGRATIONS_DIR="/docker-entrypoint-initdb.d/migrations"

if [ ! -d "$MIGRATIONS_DIR" ]; then
  echo "ERROR: migrations dir not mounted at $MIGRATIONS_DIR" >&2
  exit 1
fi

echo "==> Applying migrations from $MIGRATIONS_DIR"
for f in "$MIGRATIONS_DIR"/*.sql; do
  [ -e "$f" ] || continue
  echo "    -> $(basename "$f")"
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f "$f"
done

echo "==> Migrations applied."
# zz_seed.sql (если есть) автоматически выполнится postgres-entrypoint'ом
# СЛЕДУЮЩИМ файлом в init-folder благодаря сортировке имён.
