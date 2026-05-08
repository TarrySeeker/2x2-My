# =============================================================
# Caddy 2 + caddy-ratelimit + caddy-brotli modules
# =============================================================
# Зачем:
#   1) caddy-ratelimit — нативный Caddy 2 НЕ имеет встроенного rate-limiting.
#      Модуль mholt/caddy-ratelimit добавляет директиву `rate_limit`
#      (in-memory, sliding-window, ключ по client IP / header / cookie).
#   2) caddy-brotli — стандартный Caddy 2 поддерживает только zstd и gzip
#      в директиве `encode`. Brotli (br) даёт лучшее сжатие HTML/CSS/JS
#      на 10–15 % по сравнению с gzip — критично для мобильного TTFB.
#      ubicloud/caddy-brotli — community-плагин, импортирующий пакет
#      andybalholm/brotli (Go-нативная реализация).
#
# Сборка через xcaddy — официальный билдер Caddy от автора проекта.
#
# Размер итогового образа: ~52 MB (alpine + один бинарь caddy).
# =============================================================

FROM caddy:2.10-builder AS builder

# Версии плагинов пиннуем (latest на момент 2026-05-09).
# rate-limit — пин был с 2026-04-24.
# brotli — последний релиз ubicloud/caddy-brotli@v1.0.1 (2025-09).
# Обновлять — внимательно: API директивы `rate_limit` стабилизирована,
# но breaking changes в zone-конфиге случались (v0.x → v1.x).
RUN xcaddy build \
    --with github.com/mholt/caddy-ratelimit@v0.1.1 \
    --with github.com/ubicloud/caddy-brotli@v1.0.1

FROM caddy:2.10-alpine

# Подменяем дефолтный бинарь caddy на наш с модулями.
COPY --from=builder /usr/bin/caddy /usr/bin/caddy

# Sanity-check: оба модуля должны быть в списке.
# Билд упадёт сразу, если xcaddy собрал что-то не то.
RUN caddy list-modules | grep -q "http.handlers.rate_limit" \
 || (echo "FATAL: caddy-ratelimit module not built into binary" && exit 1)
RUN caddy list-modules | grep -q "http.encoders.br" \
 || (echo "FATAL: caddy-brotli module not built into binary" && exit 1)
