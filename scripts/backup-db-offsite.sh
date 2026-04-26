#!/usr/bin/env bash
# =============================================================
# backup-db-offsite.sh — offsite-копия PostgreSQL дампа в S3
# =============================================================
# Запускается на ХОСТЕ через cron, ПОСЛЕ backup-db.sh.
# Берёт самый свежий дамп из ${BACKUP_DIR}/db/db-*.dump и
# заливает в S3-совместимое хранилище (Yandex Object Storage,
# Selectel, Backblaze B2, AWS S3 — любое, поддерживающее S3 API).
#
# Для загрузки используется MinIO Client (mc) из официального
# контейнера minio/mc:latest — установка mc на хост не нужна.
#
# Опционально: если флаг RUN_LOCAL_BACKUP=1, скрипт сначала
# выполнит ./backup-db.sh (т.е. может быть единственной cron-job).
#
# -------------------------------------------------------------
# Переменные окружения (из ${PROJECT_DIR}/.env или из cron):
#
#   PROJECT_DIR             /home/deploy/2x2-shop
#   BACKUP_DIR              /home/deploy/backups/db
#   RUN_LOCAL_BACKUP        0   (1 — запускать backup-db.sh перед загрузкой)
#
#   S3_OFFSITE_ENDPOINT     https://storage.yandexcloud.net
#   S3_OFFSITE_REGION       ru-central1
#   S3_OFFSITE_BUCKET       2x2-shop-db-backups
#   S3_OFFSITE_ACCESS_KEY   <static access key>
#   S3_OFFSITE_SECRET_KEY   <static secret key>
#   S3_OFFSITE_PREFIX       db/   (опционально, по умолчанию db/)
#
#   TELEGRAM_BOT_TOKEN      опционально — алерт об ошибке
#   TELEGRAM_CHAT_ID        опционально
#
# -------------------------------------------------------------
# Установка cron-задачи (от пользователя deploy):
#   crontab -e
#   0 4 * * * /home/deploy/2x2-shop/scripts/backup-db-offsite.sh \
#               >> /var/log/backup-offsite.log 2>&1
#
# Ручной запуск:
#   bash /home/deploy/2x2-shop/scripts/backup-db-offsite.sh
#
# Восстановление:
#   1) Скачать дамп из бакета:
#      docker run --rm -v "$PWD":/restore minio/mc:latest \
#        alias set offsite "$S3_OFFSITE_ENDPOINT" \
#          "$S3_OFFSITE_ACCESS_KEY" "$S3_OFFSITE_SECRET_KEY"
#      docker run --rm -v "$PWD":/restore minio/mc:latest \
#        cp offsite/$S3_OFFSITE_BUCKET/db/db-YYYYMMDD-HHMMSS.dump /restore/
#   2) Восстановить через pg_restore (см. backup-db.sh).
# =============================================================
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/home/deploy/2x2-shop}"
BACKUP_DIR="${BACKUP_DIR:-/home/deploy/backups/db}"
RUN_LOCAL_BACKUP="${RUN_LOCAL_BACKUP:-0}"

ts() { date +'%Y-%m-%d %H:%M:%S'; }

log()  { echo "[$(ts)] $*"; }
err()  { echo "[$(ts)] ERROR: $*" >&2; }

# -------------------------------------------------------------
# 0. Загрузка .env
# -------------------------------------------------------------
if [ ! -f "$PROJECT_DIR/.env" ]; then
  err "$PROJECT_DIR/.env not found"
  exit 1
fi

set -a
# shellcheck disable=SC1091
source "$PROJECT_DIR/.env"
set +a

# -------------------------------------------------------------
# 1. Опциональный локальный бэкап
# -------------------------------------------------------------
if [ "$RUN_LOCAL_BACKUP" = "1" ]; then
  log "RUN_LOCAL_BACKUP=1 — запускаю backup-db.sh"
  bash "$PROJECT_DIR/scripts/backup-db.sh"
fi

# -------------------------------------------------------------
# 2. Проверка S3-credentials
# -------------------------------------------------------------
S3_OFFSITE_ENDPOINT="${S3_OFFSITE_ENDPOINT:-}"
S3_OFFSITE_REGION="${S3_OFFSITE_REGION:-ru-central1}"
S3_OFFSITE_BUCKET="${S3_OFFSITE_BUCKET:-}"
S3_OFFSITE_ACCESS_KEY="${S3_OFFSITE_ACCESS_KEY:-}"
S3_OFFSITE_SECRET_KEY="${S3_OFFSITE_SECRET_KEY:-}"
S3_OFFSITE_PREFIX="${S3_OFFSITE_PREFIX:-db/}"

# Нормализуем prefix: должен заканчиваться на /, не должен начинаться с /
S3_OFFSITE_PREFIX="${S3_OFFSITE_PREFIX#/}"
[[ "$S3_OFFSITE_PREFIX" != */ ]] && S3_OFFSITE_PREFIX="${S3_OFFSITE_PREFIX}/"

missing=()
[ -z "$S3_OFFSITE_ENDPOINT" ]   && missing+=("S3_OFFSITE_ENDPOINT")
[ -z "$S3_OFFSITE_BUCKET" ]     && missing+=("S3_OFFSITE_BUCKET")
[ -z "$S3_OFFSITE_ACCESS_KEY" ] && missing+=("S3_OFFSITE_ACCESS_KEY")
[ -z "$S3_OFFSITE_SECRET_KEY" ] && missing+=("S3_OFFSITE_SECRET_KEY")

if [ ${#missing[@]} -gt 0 ]; then
  err "Missing env vars: ${missing[*]}"
  exit 1
fi

# -------------------------------------------------------------
# 3. Поиск свежего дампа
# -------------------------------------------------------------
if [ ! -d "$BACKUP_DIR" ]; then
  err "BACKUP_DIR не существует: $BACKUP_DIR"
  exit 1
fi

LATEST="$(find "$BACKUP_DIR" -maxdepth 1 -name 'db-*.dump' -type f \
           -printf '%T@ %p\n' 2>/dev/null \
           | sort -nr | head -n1 | cut -d' ' -f2-)"

if [ -z "${LATEST:-}" ] || [ ! -f "$LATEST" ]; then
  err "В $BACKUP_DIR не найдено ни одного db-*.dump (запусти backup-db.sh)"
  exit 1
fi

FILENAME="$(basename "$LATEST")"
SIZE_BYTES="$(stat -c%s "$LATEST")"
SIZE_HUMAN="$(du -h "$LATEST" | cut -f1)"

log "Latest dump: $LATEST ($SIZE_HUMAN / $SIZE_BYTES bytes)"

# Защита от заливки пустого файла.
if [ "$SIZE_BYTES" -lt 1024 ]; then
  err "Дамп подозрительно мал ($SIZE_BYTES bytes) — отказываюсь заливать"
  exit 1
fi

# -------------------------------------------------------------
# 4. Загрузка через mc (MinIO Client) в Docker
# -------------------------------------------------------------
TARGET_KEY="${S3_OFFSITE_PREFIX}${FILENAME}"
log "Uploading → ${S3_OFFSITE_BUCKET}/${TARGET_KEY}"

# `mc alias set` живёт внутри контейнера, поэтому делаем единый run
# с цепочкой команд через bash -c. Алиас называем `offsite`.
# `--api S3v4` — стандарт, поддерживается всеми перечисленными провайдерами.
upload_status=0
docker run --rm \
  -v "$LATEST":"/data/${FILENAME}":ro \
  -e MC_HOST_offsite="${S3_OFFSITE_ENDPOINT}" \
  minio/mc:latest \
  bash -c "
    set -e
    mc --quiet alias set offsite '${S3_OFFSITE_ENDPOINT}' \
        '${S3_OFFSITE_ACCESS_KEY}' '${S3_OFFSITE_SECRET_KEY}' \
        --api S3v4 >/dev/null
    mc --quiet cp '/data/${FILENAME}' \
        'offsite/${S3_OFFSITE_BUCKET}/${TARGET_KEY}'
  " || upload_status=$?

if [ "$upload_status" -ne 0 ]; then
  err "mc cp завершился с кодом $upload_status"
  # Telegram-алерт (если настроен)
  if [ -n "${TELEGRAM_BOT_TOKEN:-}" ] && [ -n "${TELEGRAM_CHAT_ID:-}" ]; then
    msg="[2x2-shop] OFFSITE BACKUP FAILED%0A${FILENAME}%0Aexit=$upload_status"
    curl -fsS --max-time 10 -X POST \
      "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
      --data-urlencode "chat_id=${TELEGRAM_CHAT_ID}" \
      --data-urlencode "text=${msg}" >/dev/null || true
  fi
  exit "$upload_status"
fi

log "Upload OK: s3://${S3_OFFSITE_BUCKET}/${TARGET_KEY}"
log "Done."

# -------------------------------------------------------------
# Retention в S3 — НЕ управляется этим скриптом.
# Настраивается через bucket lifecycle rule на стороне провайдера.
# Подробнее см. docs/BACKUP_OFFSITE.md (раздел «Retention / lifecycle»).
# -------------------------------------------------------------
