#!/usr/bin/env bash
# Apply migration 024 (safer variant): RENAME homepage_sections -> homepage_sections_legacy_2026_04_26
# instead of DROP. Reversible — данные сохраняются, можно мгновенно откатить.
#
# Перед RENAME — обязательный pg_dump (локально + на VPS).
# Если smoke-тесты после RENAME упадут — auto-rollback (обратный RENAME).
#
# Запуск с локальной машины. Требует SSH доступа к deploy@130.49.129.65.

set -euo pipefail

VPS=deploy@130.49.129.65
REMOTE_DIR=~/2x2-shop
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOCAL_BACKUP_DIR="$SCRIPT_DIR/../.secrets"
LEGACY_NAME=homepage_sections_legacy_2026_04_26

echo "==> 1/6: git archive HEAD -> tar -> VPS (sync repo state, без миграций — RENAME руками)"
git archive HEAD -o /tmp/2x2-deploy.tar
scp /tmp/2x2-deploy.tar $VPS:/tmp/
ssh $VPS "cd $REMOTE_DIR && cp .env /tmp/.env.bak.$TIMESTAMP && tar -xf /tmp/2x2-deploy.tar -C . && cp /tmp/.env.bak.$TIMESTAMP .env"

echo "==> 2/6: pg_dump бэкап homepage_sections на VPS (--inserts, отдельный файл)"
ssh $VPS "cd $REMOTE_DIR && docker compose exec -T postgres bash -c 'PGPASSWORD=\$POSTGRES_PASSWORD pg_dump -U postgres -d shop2x2 -t homepage_sections --inserts > /tmp/homepage_sections_backup_$TIMESTAMP.sql'"
ssh $VPS "ls -lh /tmp/homepage_sections_backup_$TIMESTAMP.sql"

echo "==> 3/6: scp бэкапа на локальную машину (.secrets/)"
mkdir -p "$LOCAL_BACKUP_DIR"
scp $VPS:/tmp/homepage_sections_backup_$TIMESTAMP.sql "$LOCAL_BACKUP_DIR/"
ls -lh "$LOCAL_BACKUP_DIR/homepage_sections_backup_$TIMESTAMP.sql"

echo "==> 4/6: ALTER TABLE homepage_sections RENAME TO $LEGACY_NAME"
ssh $VPS "cd $REMOTE_DIR && docker compose exec -T postgres bash -c 'PGPASSWORD=\$POSTGRES_PASSWORD psql -U postgres -d shop2x2 -c \"ALTER TABLE IF EXISTS homepage_sections RENAME TO $LEGACY_NAME;\"'"

echo "==> 5/6: verify (table list LIKE %homepage%)"
ssh $VPS "cd $REMOTE_DIR && docker compose exec -T postgres bash -c 'PGPASSWORD=\$POSTGRES_PASSWORD psql -U postgres -d shop2x2 -c \"SELECT table_name FROM information_schema.tables WHERE table_schema='\\''public'\\'' AND table_name LIKE '\\''%homepage%'\\'' ORDER BY table_name;\"'"

echo "==> 6/6: smoke tests на проде"
HEALTH=$(curl -sS -o /dev/null -w "%{http_code}" https://erfgv.website/api/health || echo "FAIL")
ROOT=$(curl -sS -o /dev/null -w "%{http_code}" https://erfgv.website/ || echo "FAIL")
ADMIN=$(curl -sS -o /dev/null -w "%{http_code}" https://erfgv.website/admin/login || echo "FAIL")
HERO=$(curl -s https://erfgv.website/ | grep -c "Рекламное агентство" || echo "0")
echo "  /api/health   -> $HEALTH"
echo "  /             -> $ROOT"
echo "  /admin/login  -> $ADMIN"
echo "  Hero text hits -> $HERO"

if [ "$HEALTH" != "200" ] || [ "$ROOT" != "200" ] || [ "$ADMIN" != "200" ] || [ "$HERO" -lt 1 ]; then
  echo "X SMOKE FAILED. Rolling back rename ($LEGACY_NAME -> homepage_sections)..."
  ssh $VPS "cd $REMOTE_DIR && docker compose exec -T postgres bash -c 'PGPASSWORD=\$POSTGRES_PASSWORD psql -U postgres -d shop2x2 -c \"ALTER TABLE IF EXISTS $LEGACY_NAME RENAME TO homepage_sections;\"'"
  echo "  Rollback executed. Verify (post-rollback codes):"
  echo "  /api/health  -> $(curl -sS -o /dev/null -w '%{http_code}' https://erfgv.website/api/health || echo FAIL)"
  echo "  /            -> $(curl -sS -o /dev/null -w '%{http_code}' https://erfgv.website/ || echo FAIL)"
  exit 1
fi

echo ""
echo "OK Done. homepage_sections renamed to $LEGACY_NAME"
echo "    Local backup : $LOCAL_BACKUP_DIR/homepage_sections_backup_$TIMESTAMP.sql"
echo "    VPS backup   : /tmp/homepage_sections_backup_$TIMESTAMP.sql"
echo ""
echo "Откатить позже (вернуть имя):"
echo "  ssh $VPS \"cd $REMOTE_DIR && docker compose exec -T postgres bash -c 'PGPASSWORD=\\\$POSTGRES_PASSWORD psql -U postgres -d shop2x2 -c \\\"ALTER TABLE $LEGACY_NAME RENAME TO homepage_sections;\\\"'\""
echo ""
echo "Восстановить из dump (если таблицы уже нет):"
echo "  scp $LOCAL_BACKUP_DIR/homepage_sections_backup_$TIMESTAMP.sql $VPS:/tmp/"
echo "  ssh $VPS \"cd $REMOTE_DIR && docker compose exec -T postgres bash -c 'PGPASSWORD=\\\$POSTGRES_PASSWORD psql -U postgres -d shop2x2 < /tmp/homepage_sections_backup_$TIMESTAMP.sql'\""
echo ""
echo "Окончательный DROP $LEGACY_NAME — отдельной миграцией 025 через 1+ неделю стабильной работы."
