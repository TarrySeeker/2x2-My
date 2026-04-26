#!/usr/bin/env bash
# =============================================================
# backup-db-rotate.sh — обёртка над backup-db.sh c rotation
# =============================================================
# Пайплайн:
#   1) Запускает scripts/backup-db.sh (свежий pg_dump в BACKUP_DIR).
#   2) Удаляет дампы в BACKUP_DIR старше RETENTION_DAYS дней.
#   3) Опционально: rsync свежий дамп на второй VPS (offsite).
#
# Это fallback-вариант offsite-стратегии. Используется, пока у нас
# нет S3-совместимого хранилища (Yandex Object Storage / Selectel
# и т.п.). Когда credentials появятся — добавьте cron-задачу с
# scripts/backup-db-offsite.sh, а этот скрипт оставьте для local
# rotation.
#
# -------------------------------------------------------------
# Переменные окружения (можно переопределить из cron):
#
#   PROJECT_DIR       /home/deploy/2x2-shop
#   BACKUP_DIR        /home/deploy/backups/db
#   RETENTION_DAYS    14
#   PG_CONTAINER      2x2-postgres
#
#   Offsite rsync (необязательно — пропускается, если не задано):
#     OFFSITE_RSYNC_HOST           например, root@5.42.101.115
#     OFFSITE_RSYNC_PATH           ./   (если на той стороне rrsync с привязкой
#                                       к каталогу — путь относительный;
#                                       иначе абсолютный, например /var/backups/2x2/db)
#     OFFSITE_RSYNC_SSH_KEY        ~/.ssh/id_ed25519_offsite (опц.)
#     OFFSITE_RSYNC_PORT           22 (опц.)
#     OFFSITE_RSYNC_REMOTE_ROTATE  0  (по умолчанию — НЕ пытаться удалять
#                                       старые дампы на дальней стороне через
#                                       ssh-команду; не работает с rrsync)
#
#   Telegram-алерт об ошибке (необязательно — берёт из .env):
#     TELEGRAM_BOT_TOKEN
#     TELEGRAM_CHAT_ID
#
# -------------------------------------------------------------
# Установка cron-задачи (от пользователя deploy):
#   crontab -e
#   0 4 * * * /home/deploy/2x2-shop/scripts/backup-db-rotate.sh \
#               >> /var/log/2x2-backup.log 2>&1
#
# Ручной запуск:
#   bash /home/deploy/2x2-shop/scripts/backup-db-rotate.sh
#
# Восстановление: см. docs/BACKUP_OFFSITE.md (раздел «Восстановление»).
# =============================================================
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/home/deploy/2x2-shop}"
BACKUP_DIR="${BACKUP_DIR:-/home/deploy/backups/db}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

ts() { date +'%Y-%m-%d %H:%M:%S'; }
log()  { echo "[$(ts)] [rotate] $*"; }
err()  { echo "[$(ts)] [rotate] ERROR: $*" >&2; }

# -------------------------------------------------------------
# 0. Загрузка .env (для PG_* и опциональных TELEGRAM_*/OFFSITE_*)
# -------------------------------------------------------------
if [ -f "$PROJECT_DIR/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$PROJECT_DIR/.env"
  set +a
fi

# Telegram-уведомление при критической ошибке.
notify_fail() {
  local stage="$1"
  local code="$2"
  err "$stage завершился с кодом $code"
  if [ -n "${TELEGRAM_BOT_TOKEN:-}" ] && [ -n "${TELEGRAM_CHAT_ID:-}" ]; then
    local host
    host="$(hostname -s 2>/dev/null || echo unknown)"
    local msg
    msg="[2x2-shop@${host}] BACKUP-ROTATE FAILED%0A${stage}%0Aexit=${code}"
    curl -fsS --max-time 10 -X POST \
      "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
      --data-urlencode "chat_id=${TELEGRAM_CHAT_ID}" \
      --data-urlencode "text=${msg}" >/dev/null 2>&1 || true
  fi
}

trap 'rc=$?; if [ $rc -ne 0 ]; then notify_fail "trap" "$rc"; fi' EXIT

# -------------------------------------------------------------
# 1. Запуск backup-db.sh — он сам проверит .env, сделает pg_dump,
#    положит файл в $BACKUP_DIR и удалит дампы старше своих
#    RETENTION_DAYS. Мы дополнительно делаем своё rotation ниже,
#    чтобы можно было задавать другой срок жизни.
# -------------------------------------------------------------
backup_status=0
log "Шаг 1/3: запуск backup-db.sh"
bash "$PROJECT_DIR/scripts/backup-db.sh" || backup_status=$?
if [ "$backup_status" -ne 0 ]; then
  notify_fail "backup-db.sh" "$backup_status"
  exit "$backup_status"
fi

# -------------------------------------------------------------
# 2. Дополнительная rotation — наш собственный RETENTION_DAYS
#    (на случай если в backup-db.sh он короче/длиннее).
# -------------------------------------------------------------
log "Шаг 2/3: rotation, удаляем дампы старше $RETENTION_DAYS дней"
if [ -d "$BACKUP_DIR" ]; then
  # -mtime +N даёт файлы старше N*24 часов (целое количество суток).
  DELETED_LIST="$(find "$BACKUP_DIR" -maxdepth 1 -name 'db-*.dump' -type f \
                   -mtime +"$RETENTION_DAYS" -print 2>/dev/null || true)"
  if [ -n "$DELETED_LIST" ]; then
    echo "$DELETED_LIST" | while IFS= read -r f; do
      [ -z "$f" ] && continue
      rm -f -- "$f" && log "  rm $f"
    done
  else
    log "  старых дампов нет"
  fi
else
  err "BACKUP_DIR не существует: $BACKUP_DIR (должен быть создан backup-db.sh)"
fi

# -------------------------------------------------------------
# 3. Опциональный offsite rsync на второй VPS / NAS.
#    Активируется только если задана переменная OFFSITE_RSYNC_HOST.
# -------------------------------------------------------------
OFFSITE_RSYNC_HOST="${OFFSITE_RSYNC_HOST:-}"
OFFSITE_RSYNC_PATH="${OFFSITE_RSYNC_PATH:-./}"
OFFSITE_RSYNC_PORT="${OFFSITE_RSYNC_PORT:-22}"
OFFSITE_RSYNC_SSH_KEY="${OFFSITE_RSYNC_SSH_KEY:-}"
OFFSITE_RSYNC_REMOTE_ROTATE="${OFFSITE_RSYNC_REMOTE_ROTATE:-0}"

if [ -z "$OFFSITE_RSYNC_HOST" ]; then
  log "Шаг 3/3: offsite rsync пропущен (OFFSITE_RSYNC_HOST не задан)"
else
  log "Шаг 3/3: offsite rsync → ${OFFSITE_RSYNC_HOST}:${OFFSITE_RSYNC_PATH}"

  # Найти самый свежий дамп для отправки.
  LATEST="$(find "$BACKUP_DIR" -maxdepth 1 -name 'db-*.dump' -type f \
             -printf '%T@ %p\n' 2>/dev/null \
             | sort -nr | head -n1 | cut -d' ' -f2-)"

  if [ -z "${LATEST:-}" ] || [ ! -f "$LATEST" ]; then
    err "Не найдено ни одного db-*.dump для rsync (BACKUP_DIR=$BACKUP_DIR)"
    exit 1
  fi

  if ! command -v rsync >/dev/null 2>&1; then
    err "rsync не установлен на этой машине — sudo apt install rsync"
    exit 1
  fi

  # Опции SSH: -o BatchMode=yes — не задавать вопросов в cron;
  #            -o StrictHostKeyChecking=accept-new — принять fingerprint
  #            нового хоста один раз, дальше использовать known_hosts.
  ssh_opts="-o BatchMode=yes -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15 -p ${OFFSITE_RSYNC_PORT}"
  if [ -n "$OFFSITE_RSYNC_SSH_KEY" ]; then
    ssh_opts="$ssh_opts -i $OFFSITE_RSYNC_SSH_KEY"
  fi

  rsync_status=0
  # -a — архивный режим, -z — gzip, --partial — докачка при обрыве.
  # Передаём только свежий дамп; rotation на дальней стороне
  # делается отдельной cron-задачей на самом host'е (см. ниже).
  # Нормализуем хвостовой слэш у пути назначения.
  remote_path="${OFFSITE_RSYNC_PATH%/}/"
  rsync -az --partial -e "ssh $ssh_opts" \
    "$LATEST" "${OFFSITE_RSYNC_HOST}:${remote_path}" \
    || rsync_status=$?

  if [ "$rsync_status" -ne 0 ]; then
    notify_fail "rsync" "$rsync_status"
    exit "$rsync_status"
  fi

  log "  rsync OK: $(basename "$LATEST")"

  # Опциональный rotation через ssh-команду (find ... -delete).
  # По умолчанию выключено: не работает в режиме rrsync (rrsync
  # запрещает любые ssh-команды кроме самого rsync).
  # Включи через OFFSITE_RSYNC_REMOTE_ROTATE=1 в .env, если на
  # дальней стороне ключ имеет полный shell-доступ.
  if [ "$OFFSITE_RSYNC_REMOTE_ROTATE" = "1" ]; then
    log "  rotation на удалённой стороне"
    ssh $ssh_opts "$OFFSITE_RSYNC_HOST" \
      "find '${remote_path%/}' -maxdepth 1 -name 'db-*.dump' -type f -mtime +${RETENTION_DAYS} -print -delete" \
      2>/dev/null | while IFS= read -r f; do
        [ -z "$f" ] && continue
        log "    remote rm $f"
      done || log "    (warning) удалить старые дампы на удалённой стороне не удалось"
  fi
fi

log "Готово."

# Снимаем trap и выходим без ошибки.
trap - EXIT
exit 0
