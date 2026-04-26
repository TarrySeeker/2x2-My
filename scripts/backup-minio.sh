#!/usr/bin/env bash
# =============================================================
# backup-minio.sh — зеркалирование MinIO бакета на локальный диск
# =============================================================
# Запускается на ХОСТЕ через cron. Использует mc (MinIO client)
# из официального контейнера `minio/mc:latest` — не требует
# установки mc на хост.
#
# Куда пишет:
#   ${BACKUP_DIR}/   ← полная копия содержимого бакета
#   (mirror --overwrite --remove → точная копия, как rsync --delete)
#
# Переменные окружения (можно переопределить из cron):
#   PROJECT_DIR       /home/deploy/2x2-shop
#   BACKUP_DIR        /home/deploy/backups/media
#   MINIO_BUCKET      2x2-media       (по умолчанию из $S3_BUCKET)
#   MINIO_HOST        minio:9000
#   DOCKER_NETWORK    2x2-shop_app-network
#
# Установка cron-задачи (от пользователя deploy):
#   crontab -e
#   30 3 * * * /home/deploy/2x2-shop/scripts/backup-minio.sh \
#               >> /home/deploy/backups/minio-backup.log 2>&1
#
# Ручной запуск:
#   bash /home/deploy/2x2-shop/scripts/backup-minio.sh
#
# Восстановление:
#   docker run --rm -v /home/deploy/backups/media:/backup:ro \
#     --network 2x2-shop_app-network \
#     -e MC_HOST_local="http://USER:PASS@minio:9000" \
#     minio/mc:latest mirror --overwrite /backup local/2x2-media
# =============================================================
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/home/deploy/2x2-shop}"
BACKUP_DIR="${BACKUP_DIR:-/home/deploy/backups/media}"
DOCKER_NETWORK="${DOCKER_NETWORK:-2x2-shop_app-network}"
MINIO_HOST="${MINIO_HOST:-minio:9000}"

ts() { date +'%Y-%m-%d %H:%M:%S'; }

if [ ! -f "$PROJECT_DIR/.env" ]; then
  echo "[$(ts)] ERROR: $PROJECT_DIR/.env not found" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
source "$PROJECT_DIR/.env"
set +a

if [ -z "${MINIO_ROOT_USER:-}" ] || [ -z "${MINIO_ROOT_PASSWORD:-}" ]; then
  echo "[$(ts)] ERROR: MINIO_ROOT_USER / MINIO_ROOT_PASSWORD not set in .env" >&2
  exit 1
fi

MINIO_BUCKET="${MINIO_BUCKET:-${S3_BUCKET:-2x2-media}}"

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

echo "[$(ts)] Starting mirror: local/${MINIO_BUCKET} → ${BACKUP_DIR}"

# mc mirror --overwrite --remove ⇒ точная копия (удаляет на приёмнике
# то, чего больше нет в источнике). Это полезно для бэкапа в смысле
# disaster recovery, но если хочется хранить удалённые файлы дольше —
# уберите --remove и добавьте отдельный сервис версионирования.
docker run --rm \
  -v "$BACKUP_DIR":/backup \
  --network "$DOCKER_NETWORK" \
  -e MC_HOST_local="http://${MINIO_ROOT_USER}:${MINIO_ROOT_PASSWORD}@${MINIO_HOST}" \
  minio/mc:latest \
  mirror --overwrite --remove "local/${MINIO_BUCKET}" /backup

# Подсчёт результата.
COUNT="$(find "$BACKUP_DIR" -type f 2>/dev/null | wc -l)"
SIZE="$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)"
echo "[$(ts)] Mirror OK: ${COUNT} files, ${SIZE} total in ${BACKUP_DIR}"
echo "[$(ts)] Done."
