#!/usr/bin/env bash
# =============================================================
# backup-db.sh — ежедневный бэкап PostgreSQL (custom format)
# =============================================================
# Запускается на ХОСТЕ (не в контейнере), через cron.
# pg_dump берётся из контейнера 2x2-postgres (через `docker exec`).
#
# Куда пишет:
#   ${BACKUP_DIR}/db-YYYYMMDD-HHMMSS.dump
#   (custom format, восстановление через pg_restore)
#
# Retention: ${RETENTION_DAYS:-14} дней (старше — удаляются).
#
# Переменные окружения (можно переопределить из cron):
#   PROJECT_DIR    /home/deploy/2x2-shop
#   BACKUP_DIR     /home/deploy/backups/db
#   RETENTION_DAYS 14
#   PG_CONTAINER   2x2-postgres
#
# Установка cron-задачи (от пользователя deploy):
#   crontab -e
#   0 3 * * * /home/deploy/2x2-shop/scripts/backup-db.sh \
#               >> /home/deploy/backups/backup.log 2>&1
#
# Ручной запуск:
#   bash /home/deploy/2x2-shop/scripts/backup-db.sh
#
# Восстановление:
#   docker exec -i 2x2-postgres pg_restore -U "$POSTGRES_USER" \
#       -d "$POSTGRES_DB" --clean --if-exists --no-owner \
#       < /home/deploy/backups/db/db-YYYYMMDD-HHMMSS.dump
# =============================================================
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/home/deploy/2x2-shop}"
BACKUP_DIR="${BACKUP_DIR:-/home/deploy/backups/db}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
PG_CONTAINER="${PG_CONTAINER:-2x2-postgres}"

ts() { date +'%Y-%m-%d %H:%M:%S'; }

if [ ! -f "$PROJECT_DIR/.env" ]; then
  echo "[$(ts)] ERROR: $PROJECT_DIR/.env not found" >&2
  exit 1
fi

# .env содержит значения с пробелами в одинарных кавычках,
# поэтому нужен `set -a` + `source` в bash (не sh).
set -a
# shellcheck disable=SC1091
source "$PROJECT_DIR/.env"
set +a

if [ -z "${POSTGRES_USER:-}" ] || [ -z "${POSTGRES_DB:-}" ] || [ -z "${POSTGRES_PASSWORD:-}" ]; then
  echo "[$(ts)] ERROR: POSTGRES_USER / POSTGRES_DB / POSTGRES_PASSWORD not set in .env" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

DATE="$(date +%Y%m%d-%H%M%S)"
TARGET="$BACKUP_DIR/db-$DATE.dump"

echo "[$(ts)] Starting backup → $TARGET"

# pg_dump custom format (-F c) — компактнее, поддерживает pg_restore с
# параллельной загрузкой и выборочным восстановлением таблиц.
# Передаём пароль через PGPASSWORD внутрь контейнера.
docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" "$PG_CONTAINER" \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -F c --no-owner \
  > "$TARGET"

if [ ! -s "$TARGET" ]; then
  echo "[$(ts)] ERROR: backup is empty: $TARGET" >&2
  rm -f "$TARGET"
  exit 1
fi

SIZE="$(du -h "$TARGET" | cut -f1)"
SIZE_BYTES="$(stat -c%s "$TARGET")"
echo "[$(ts)] Backup OK: $TARGET ($SIZE / $SIZE_BYTES bytes)"

echo "[$(ts)] Cleaning backups older than $RETENTION_DAYS days"
DELETED="$(find "$BACKUP_DIR" -name 'db-*.dump' -type f -mtime +"$RETENTION_DAYS" -print -delete | wc -l)"
echo "[$(ts)] Deleted $DELETED old backup(s)"

echo "[$(ts)] Done."
