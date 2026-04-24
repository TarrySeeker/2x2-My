# =============================================================
# Caddy 2 + caddy-ratelimit module
# =============================================================
# Зачем: нативный Caddy 2 НЕ имеет встроенного rate-limiting.
# Модуль mholt/caddy-ratelimit добавляет директиву `rate_limit`
# (in-memory, sliding-window, ключ по client IP / header / cookie).
#
# Сборка через xcaddy — официальный билдер Caddy от автора проекта.
#
# Размер итогового образа: ~50 MB (alpine + один бинарь caddy).
# =============================================================

FROM caddy:2.10-builder AS builder

# Версия модуля пинится (latest на момент 2026-04-24).
# Обновлять — внимательно: API директивы стабилизирована,
# но breaking changes в zone-конфиге случались (v0.x → v1.x).
RUN xcaddy build \
    --with github.com/mholt/caddy-ratelimit@v0.1.1

FROM caddy:2.10-alpine

# Подменяем дефолтный бинарь caddy на наш с модулем.
COPY --from=builder /usr/bin/caddy /usr/bin/caddy

# Sanity-check: модуль должен быть в списке.
# Билд упадёт сразу, если xcaddy собрал что-то не то.
RUN caddy list-modules | grep -q "http.handlers.rate_limit" \
 || (echo "FATAL: caddy-ratelimit module not built into binary" && exit 1)
