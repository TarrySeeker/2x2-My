#!/bin/sh
# =============================================================
# backup-db.sh — ежедневный бэкап PostgreSQL в файл .sql.gz
# =============================================================
# Запускается на ХОСТЕ (не в контейнере), через cron.
#
# Зависимости: docker (compose v2), gzip, find.
# Команда `pg_dump` берётся из контейнера postgres
# (через `docker compose exec`) — на хосте postgres не нужен.
#
# Куда пишет:
#   /var/backups/2x2/postgres/2x2-YYYYMMDD-HHMM.sql.gz
#
# Retention: 30 дней (старше — удаляются).
#
# Установка cron-задачи (от root или sudo):
#   crontab -e
#   # Ежедневно в 03:00 по времени сервера:
#   0 3 * * * /opt/2x2/scripts/backup-db.sh >> /var/log/2x2-backup.log 2>&1
#
# Ручной запуск:
#   sudo bash /opt/2x2/scripts/backup-db.sh
#
# Восстановление из бэкапа:
#   gunzip -c /var/backups/2x2/postgres/2x2-YYYYMMDD-HHMM.sql.gz | \
#     docker compose -f /opt/2x2/docker-compose.yml exec -T postgres \
#       psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
# =============================================================
set -eu

# Куда положить бэкап + сколько дней хранить.
BACKUP_DIR="${BACKUP_DIR:-/var/backups/2x2/postgres}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

# Где живёт docker-compose.yml + .env проекта.
PROJECT_DIR="${PROJECT_DIR:-/opt/2x2}"

# Загружаем переменные из .env, чтобы знать POSTGRES_USER/DB.
if [ ! -f "$PROJECT_DIR/.env" ]; then
  echo "ERROR: $PROJECT_DIR/.env not found" >&2
  exit 1
fi

# shellcheck disable=SC1091
. "$PROJECT_DIR/.env"

if [ -z "${POSTGRES_USER:-}" ] || [ -z "${POSTGRES_DB:-}" ]; then
  echo "ERROR: POSTGRES_USER / POSTGRES_DB not set in .env" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"  # бэкапы содержат хеши паролей юзеров — только root

DATE="$(date +%Y%m%d-%H%M)"
TARGET="$BACKUP_DIR/2x2-$DATE.sql.gz"

echo "[$(date)] Starting backup → $TARGET"

# pg_dump через docker compose exec.
# -T (без TTY) — обязательно для скриптов через cron, иначе cron упадёт.
cd "$PROJECT_DIR"
docker compose exec -T postgres \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner \
  | gzip -9 > "$TARGET"

# Проверка, что файл реально создался и не пустой.
if [ ! -s "$TARGET" ]; then
  echo "ERROR: backup is empty: $TARGET" >&2
  rm -f "$TARGET"
  exit 1
fi

SIZE="$(du -h "$TARGET" | cut -f1)"
echo "[$(date)] Backup OK: $TARGET ($SIZE)"

# Ротация старых бэкапов.
echo "[$(date)] Cleaning backups older than $RETENTION_DAYS days"
find "$BACKUP_DIR" -name "2x2-*.sql.gz" -type f -mtime +"$RETENTION_DAYS" -delete

echo "[$(date)] Done."
