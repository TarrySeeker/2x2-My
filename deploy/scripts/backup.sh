#!/usr/bin/env bash
# Ежедневный бэкап 2x2-shop.
# Запускать через cron от deploy:
#   0 3 * * * /var/www/2x2-shop/deploy/scripts/backup.sh >> /var/log/2x2-shop/backup.log 2>&1
#
# Бэкапим:
#   1. .env.production (зашифрованный, gpg-symmetric)
#   2. public/uploads (если есть локальное хранилище; Supabase Storage бэкапится отдельно)
#   3. Supabase Postgres через pg_dump (требует PGPASSWORD или ~/.pgpass)
#   4. Ротация — хранить 14 дней локально + weekly в S3-совместимое хранилище (Я.Облако)

set -euo pipefail

APP_DIR="/var/www/2x2-shop"
BACKUP_ROOT="/var/backups/2x2-shop"
DATE="$(date +%F_%H%M)"
DAY=$(date +%u)                  # 1..7
S3_BUCKET="${S3_BUCKET:-}"       # задаётся в /etc/default/2x2-shop-backup
GPG_PASSPHRASE_FILE="/etc/2x2-shop/backup.passphrase"

log() { echo "[$(date '+%F %T')] $*"; }

mkdir -p "$BACKUP_ROOT/daily" "$BACKUP_ROOT/weekly"

# 1) .env.production (зашифрованный)
if [[ -f "$APP_DIR/.env.production" ]] && [[ -f "$GPG_PASSPHRASE_FILE" ]]; then
  gpg --batch --yes --passphrase-file "$GPG_PASSPHRASE_FILE" \
      --symmetric --cipher-algo AES256 \
      -o "$BACKUP_ROOT/daily/env-$DATE.gpg" \
      "$APP_DIR/.env.production"
  log "env backup done"
else
  log "skip env backup (no file or no passphrase)"
fi

# 2) uploads (если есть)
if [[ -d "$APP_DIR/public/uploads" ]]; then
  tar -czf "$BACKUP_ROOT/daily/uploads-$DATE.tgz" -C "$APP_DIR/public" uploads
  log "uploads backup done"
fi

# 3) Supabase Postgres (pg_dump)
if [[ -n "${SUPABASE_DB_URL:-}" ]]; then
  pg_dump --no-owner --no-privileges --clean --if-exists \
          "$SUPABASE_DB_URL" | gzip > "$BACKUP_ROOT/daily/db-$DATE.sql.gz"
  log "db dump done"
else
  log "skip db dump (SUPABASE_DB_URL not set)"
fi

# 4) Ротация daily → 14 дней
find "$BACKUP_ROOT/daily" -type f -mtime +14 -delete
log "rotated daily (>14d)"

# 5) Weekly копия по воскресеньям
if [[ "$DAY" == "7" ]]; then
  cp -r "$BACKUP_ROOT/daily/." "$BACKUP_ROOT/weekly/" 2>/dev/null || true
  find "$BACKUP_ROOT/weekly" -type f -mtime +60 -delete
  log "weekly snapshot done"
fi

# 6) Выгрузка в Я.Облако / S3 (если настроено)
if [[ -n "$S3_BUCKET" ]] && command -v aws &>/dev/null; then
  aws s3 sync "$BACKUP_ROOT/daily/" "s3://$S3_BUCKET/daily/" \
      --endpoint-url="${S3_ENDPOINT:-https://storage.yandexcloud.net}" \
      --only-show-errors
  log "uploaded to $S3_BUCKET"
fi

log "backup complete"
