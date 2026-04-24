#!/usr/bin/env bash
# =============================================================
# health-check.sh — внешний health-check + Telegram-алерт
# =============================================================
# Проверяет ${HEALTH_URL} (по умолчанию https://erfgv.website/api/health).
# Если HTTP != 200 ИЛИ JSON.status != "healthy" → шлёт сообщение
# в Telegram через bot API.
#
# Запускается раз в 5 минут через cron на ВНЕШНЕМ хосте
# (НЕ на том же VPS — иначе при падении VPS алерта не будет).
# Допустимо параллельно с UptimeRobot — это запасной канал.
#
# Чтобы один и тот же инцидент не спамил каждые 5 минут,
# скрипт дедуплицирует алерты через ${STATE_FILE}: повторное
# уведомление об уже известном "down"-статусе НЕ отправляется,
# зато отправляется одно "RECOVERED" сообщение, когда сайт встал.
#
# -------------------------------------------------------------
# Переменные окружения:
#
#   HEALTH_URL          https://erfgv.website/api/health   (по умолчанию)
#   EXPECT_STATUS       healthy                            (значение JSON.status)
#   TIMEOUT_SEC         10
#   STATE_FILE          /tmp/2x2-health-state              (последний known status)
#
#   TELEGRAM_BOT_TOKEN  обязательно
#   TELEGRAM_CHAT_ID    обязательно
#
# -------------------------------------------------------------
# cron (на внешнем мониторинг-хосте):
#   */5 * * * * /opt/scripts/health-check.sh \
#                 >> /var/log/2x2-health.log 2>&1
#
# Ручной тест:
#   TELEGRAM_BOT_TOKEN=xxx TELEGRAM_CHAT_ID=yyy \
#     bash health-check.sh
# =============================================================
set -euo pipefail

HEALTH_URL="${HEALTH_URL:-https://erfgv.website/api/health}"
EXPECT_STATUS="${EXPECT_STATUS:-healthy}"
TIMEOUT_SEC="${TIMEOUT_SEC:-10}"
STATE_FILE="${STATE_FILE:-/tmp/2x2-health-state}"

ts() { date +'%Y-%m-%d %H:%M:%S'; }
log() { echo "[$(ts)] $*"; }

if [ -z "${TELEGRAM_BOT_TOKEN:-}" ] || [ -z "${TELEGRAM_CHAT_ID:-}" ]; then
  echo "[$(ts)] ERROR: TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID не заданы" >&2
  exit 1
fi

# -------------------------------------------------------------
# Telegram-нотификатор (URL-encode по правилам HTML-режима)
# -------------------------------------------------------------
notify() {
  local text="$1"
  curl -fsS --max-time 10 -X POST \
    "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    --data-urlencode "chat_id=${TELEGRAM_CHAT_ID}" \
    --data-urlencode "text=${text}" \
    --data-urlencode "parse_mode=HTML" \
    --data-urlencode "disable_web_page_preview=true" \
    >/dev/null || true
}

# -------------------------------------------------------------
# Запрос
# -------------------------------------------------------------
HTTP_CODE=000
BODY=""
RESP_FILE="$(mktemp)"
trap 'rm -f "$RESP_FILE"' EXIT

set +e
HTTP_CODE="$(curl -sS -o "$RESP_FILE" -w '%{http_code}' \
              --max-time "$TIMEOUT_SEC" \
              -H 'User-Agent: 2x2-health-check/1.0' \
              "$HEALTH_URL")"
CURL_EXIT=$?
set -e

BODY="$(cat "$RESP_FILE" 2>/dev/null || true)"

# Распарсить JSON.status без jq (минимальная зависимость).
# Ищем "status":"<value>" — допускаем пробелы между ":" и значением.
JSON_STATUS=""
if echo "$BODY" | grep -qE '"status"[[:space:]]*:[[:space:]]*"[^"]+"'; then
  JSON_STATUS="$(echo "$BODY" \
    | grep -oE '"status"[[:space:]]*:[[:space:]]*"[^"]+"' \
    | head -n1 \
    | sed -E 's/.*"status"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/')"
fi

# -------------------------------------------------------------
# Решение: healthy / degraded
# -------------------------------------------------------------
CURRENT="down"
REASON=""

if [ "$CURL_EXIT" -ne 0 ]; then
  REASON="curl exit ${CURL_EXIT} (timeout/network/DNS)"
elif [ "$HTTP_CODE" != "200" ]; then
  REASON="HTTP ${HTTP_CODE}"
elif [ "$JSON_STATUS" != "$EXPECT_STATUS" ]; then
  REASON="status='${JSON_STATUS:-<missing>}' (ожидалось '${EXPECT_STATUS}')"
else
  CURRENT="up"
fi

log "URL=$HEALTH_URL HTTP=$HTTP_CODE status=${JSON_STATUS:--} → $CURRENT"

# -------------------------------------------------------------
# Дедупликация через STATE_FILE
# -------------------------------------------------------------
PREVIOUS="unknown"
if [ -f "$STATE_FILE" ]; then
  PREVIOUS="$(cat "$STATE_FILE" 2>/dev/null || echo unknown)"
fi

if [ "$CURRENT" = "down" ] && [ "$PREVIOUS" != "down" ]; then
  notify "<b>2x2 DOWN</b>%0A${HEALTH_URL}%0A${REASON}%0A%0A<pre>$(echo "$BODY" | head -c 400 | sed 's/</\&lt;/g')</pre>"
  log "Sent DOWN alert ($REASON)"
elif [ "$CURRENT" = "up" ] && [ "$PREVIOUS" = "down" ]; then
  notify "<b>2x2 RECOVERED</b>%0A${HEALTH_URL}%0Astatus=${JSON_STATUS}"
  log "Sent RECOVERED alert"
fi

echo "$CURRENT" > "$STATE_FILE"

# Возвращаем не-нулевой код только если down — удобно для других wrapper-скриптов.
if [ "$CURRENT" = "down" ]; then
  exit 1
fi
exit 0
