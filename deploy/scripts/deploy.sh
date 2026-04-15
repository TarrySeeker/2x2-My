#!/usr/bin/env bash
# Скрипт ручного деплоя 2x2-shop на Timeweb VPS.
# Запускать от пользователя deploy:  bash /var/www/2x2-shop/deploy/scripts/deploy.sh
# Автоматический деплой — через .github/workflows/deploy-vps.yml

set -euo pipefail

APP_DIR="/var/www/2x2-shop"
PM2_APP="2x2-shop"
HEALTH_URL="http://127.0.0.1:3000/api/health"
LOG="/var/log/2x2-shop/deploy.log"

log() { echo "[$(date '+%F %T')] $*" | tee -a "$LOG"; }
on_error() { log "❌ Deploy failed on line $1"; exit 1; }
trap 'on_error $LINENO' ERR

cd "$APP_DIR"

log "🔄 git pull"
git fetch origin main
git reset --hard origin/main

log "📦 pnpm install"
pnpm install --frozen-lockfile

log "🏗  pnpm build"
pnpm build

log "♻️  pm2 reload $PM2_APP"
pm2 reload ecosystem.config.cjs --update-env

log "💤 wait 5s for warmup"
sleep 5

log "🩺 healthcheck $HEALTH_URL"
for i in 1 2 3 4 5; do
  if curl -fsS "$HEALTH_URL" | grep -q '"status":"healthy"'; then
    log "✅ health OK"
    break
  fi
  if [[ $i -eq 5 ]]; then
    log "❌ health failed after 5 attempts — rolling back"
    pm2 reload "$PM2_APP" --update-env
    exit 1
  fi
  sleep 2
done

log "✅ Deploy complete: $(git rev-parse --short HEAD)"
