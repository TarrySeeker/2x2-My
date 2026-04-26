#!/usr/bin/env bash
# =============================================================
# health-check.sh — health-check + Telegram-алерт + лог-fallback
# =============================================================
# Проверяет ${HEALTH_URL} (по умолчанию https://erfgv.website/api/health).
# Если HTTP != 200 ИЛИ JSON.status != "healthy" → шлёт сообщение
# в Telegram через bot API (если задан TELEGRAM_BOT_TOKEN).
# Если Telegram-creds нет — пишет в STDOUT/лог-файл (cron подхватит).
#
# Запускать можно:
#   • на ВНЕШНЕМ хосте раз в 5 минут (рекомендуется — при падении
#     самого VPS будет уведомление);
#   • на самом VPS как запасной канал (логирует локально, плюс
#     шлёт в Telegram если задан токен).
#
# Дедупликация: повторное уведомление об уже известном "down"-статусе
# НЕ отправляется, зато отправляется одно "RECOVERED", когда сайт встал.
#
# -------------------------------------------------------------
# Переменные окружения:
#
#   HEALTH_URL          https://erfgv.website/api/health   (по умолчанию)
#   EXPECT_STATUS       healthy                            (значение JSON.status)
#   TIMEOUT_SEC         10
#   STATE_FILE          /tmp/2x2-health-state              (последний known status)
#
#   TELEGRAM_BOT_TOKEN  опционально (если нет — fallback в лог)
#   TELEGRAM_CHAT_ID    опционально
#   ALERT_EMAIL         опционально (если установлен mail/mailx)
#
# -------------------------------------------------------------
# cron на внешнем мониторинг-хосте:
#   */5 * * * * /opt/scripts/health-check.sh \
#                 >> /var/log/2x2-health.log 2>&1
#
# cron на самом VPS (запасной канал):
#   */5 * * * * /home/deploy/2x2-shop/scripts/health-check.sh \
#                 >> /home/deploy/logs/2x2-uptime.log 2>&1
#
# Ручной тест Happy Path:
#   bash scripts/health-check.sh
#
# Симуляция падения (без вмешательства в продакшен URL):
#   bash scripts/health-check.sh --test-down
# =============================================================
set -euo pipefail

# -------------------------------------------------------------
# Опциональная подгрузка .env из стандартных мест
# -------------------------------------------------------------
for env_file in /etc/default/2x2-health "$(dirname "$0")/../.env" "/home/deploy/2x2-shop/.env"; do
  if [ -f "$env_file" ] && [ -r "$env_file" ]; then
    set -a
    # shellcheck disable=SC1090
    . "$env_file" 2>/dev/null || true
    set +a
    break
  fi
done

# -------------------------------------------------------------
# CLI-флаги
# -------------------------------------------------------------
TEST_DOWN=0
for arg in "$@"; do
  case "$arg" in
    --test-down) TEST_DOWN=1 ;;
    -h|--help)
      sed -n '2,50p' "$0"
      exit 0
      ;;
  esac
done

HEALTH_URL="${HEALTH_URL:-https://erfgv.website/api/health}"
EXPECT_STATUS="${EXPECT_STATUS:-healthy}"
TIMEOUT_SEC="${TIMEOUT_SEC:-10}"
STATE_FILE="${STATE_FILE:-/tmp/2x2-health-state}"

# Поддерживаем оба имени переменной (TELEGRAM_CHAT_ID и
# TELEGRAM_NOTIFICATIONS_CHAT_ID — последняя используется приложением).
if [ -z "${TELEGRAM_CHAT_ID:-}" ] && [ -n "${TELEGRAM_NOTIFICATIONS_CHAT_ID:-}" ]; then
  TELEGRAM_CHAT_ID="$TELEGRAM_NOTIFICATIONS_CHAT_ID"
fi

ts() { date +'%Y-%m-%d %H:%M:%S'; }
log() { echo "[$(ts)] $*"; }

HAS_TELEGRAM=0
if [ -n "${TELEGRAM_BOT_TOKEN:-}" ] && [ -n "${TELEGRAM_CHAT_ID:-}" ]; then
  HAS_TELEGRAM=1
fi

HAS_MAIL=0
if [ -n "${ALERT_EMAIL:-}" ] && command -v mail >/dev/null 2>&1; then
  HAS_MAIL=1
fi

# -------------------------------------------------------------
# Каналы нотификации: Telegram (если задан) + mail (если есть) + лог.
# Лог пишется ВСЕГДА — это последняя линия обороны.
# -------------------------------------------------------------
notify() {
  local title="$1"
  local body="$2"

  # 1) Лог — всегда.
  log "ALERT [$title] $body"

  # 2) Telegram — если есть токен.
  if [ "$HAS_TELEGRAM" -eq 1 ]; then
    local text
    text="<b>${title}</b>%0A${body}"
    curl -fsS --max-time 10 -X POST \
      "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
      --data-urlencode "chat_id=${TELEGRAM_CHAT_ID}" \
      --data-urlencode "text=${text}" \
      --data-urlencode "parse_mode=HTML" \
      --data-urlencode "disable_web_page_preview=true" \
      >/dev/null 2>&1 || log "Telegram delivery failed"
  fi

  # 3) Email — если есть mail/mailx и ALERT_EMAIL.
  if [ "$HAS_MAIL" -eq 1 ]; then
    printf '%s\n' "$body" | mail -s "[2x2] $title" "$ALERT_EMAIL" 2>/dev/null || true
  fi
}

# -------------------------------------------------------------
# Запрос
# -------------------------------------------------------------
HTTP_CODE=000
BODY=""
RESP_FILE="$(mktemp)"
trap 'rm -f "$RESP_FILE"' EXIT

if [ "$TEST_DOWN" -eq 1 ]; then
  # Имитируем падение: подсовываем заведомо-битый URL,
  # боевой STATE_FILE НЕ трогаем, чтобы не сбить дедупликацию prod-цепочки.
  HEALTH_URL="https://erfgv.website/__simulated_down_for_test__"
  STATE_FILE="$(mktemp -u /tmp/2x2-health-test-XXXXXX)"
  log "TEST MODE: targeting $HEALTH_URL with state=$STATE_FILE"
fi

set +e
HTTP_CODE="$(curl -sS -o "$RESP_FILE" -w '%{http_code}' \
              --max-time "$TIMEOUT_SEC" \
              -H 'User-Agent: 2x2-health-check/1.0' \
              "$HEALTH_URL")"
CURL_EXIT=$?
set -e

BODY="$(cat "$RESP_FILE" 2>/dev/null || true)"

# Распарсить JSON.status без jq (минимальная зависимость).
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

log "URL=$HEALTH_URL HTTP=$HTTP_CODE status=${JSON_STATUS:--} → $CURRENT (telegram=$HAS_TELEGRAM mail=$HAS_MAIL)"

# -------------------------------------------------------------
# Дедупликация через STATE_FILE
# -------------------------------------------------------------
PREVIOUS="unknown"
if [ -f "$STATE_FILE" ]; then
  PREVIOUS="$(cat "$STATE_FILE" 2>/dev/null || echo unknown)"
fi

if [ "$CURRENT" = "down" ] && [ "$PREVIOUS" != "down" ]; then
  SNIPPET="$(echo "$BODY" | head -c 400 | tr '\n' ' ')"
  notify "2x2 DOWN" "${HEALTH_URL}
${REASON}

${SNIPPET}"
elif [ "$CURRENT" = "up" ] && [ "$PREVIOUS" = "down" ]; then
  notify "2x2 RECOVERED" "${HEALTH_URL}
status=${JSON_STATUS}"
fi

echo "$CURRENT" > "$STATE_FILE" 2>/dev/null || log "Cannot write STATE_FILE=$STATE_FILE"

# В тестовом режиме чистим временный state-файл.
if [ "$TEST_DOWN" -eq 1 ]; then
  rm -f "$STATE_FILE"
fi

# Возвращаем не-нулевой код только если down — удобно для wrapper-скриптов.
if [ "$CURRENT" = "down" ]; then
  exit 1
fi
exit 0
