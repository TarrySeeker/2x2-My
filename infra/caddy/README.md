# Caddy + rate-limit

## Что здесь

- `Dockerfile` — кастомный Caddy 2 с модулем `mholt/caddy-ratelimit`.
- `Caddyfile` — обновлённая конфигурация с тремя rate-limit зонами.

## Зачем

Стандартный образ `caddy:2.10-alpine` НЕ умеет rate-limit. Это значит:

- `/admin/login` уязвим к brute-force паролей (10k попыток/мин с одного IP — норма).
- `/api/contact`, `/api/leads/*` уязвимы к спам-ботам.
- Любой публичный API можно скрепить за минуты.

Модуль `caddy-ratelimit` (от автора Caddy, mholt) — in-memory sliding window
с ключом по client IP. Лёгкий, без внешних зависимостей, без Redis.

## Зоны

| Зона | Что покрывает | Лимит |
|------|---------------|-------|
| `admin_login` | `/admin/login`, `/admin/api/login`, `/admin/api/auth/*` | 10 req / 1 min / IP |
| `public_api` | формы и интерактивные API: `/api/contact`, `/api/leads/*`, расчёт CDEK, расчёт продукта | 60 req / 1 min / IP |
| `api_general` | весь `/api/*`, кроме `/api/cdek/webhook` и `/api/health` | 300 req / 1 min / IP |

`/api/cdek/webhook` намеренно исключён — туда стучится CDEK Pay сервер
(может быть всплеск при оплате нескольких заказов одновременно).
`/api/health` — не лимитируем, чтобы внешний uptime-монитор не получал 429.

## Применение на проде (НЕ автоматически — отдельный maintenance window)

### Шаг 1. Задеплоить файлы на VPS

```bash
ssh root@130.49.129.65 "cd /root/2x2-shop && git pull"
ls /root/2x2-shop/infra/caddy/Dockerfile  # должен быть
ls /root/2x2-shop/infra/caddy/Caddyfile   # должен быть
```

### Шаг 2. Подменить сервис caddy в docker-compose.yml

Текущая конфигурация:

```yaml
caddy:
  image: caddy:2.10-alpine
  ...
  volumes:
    - ./Caddyfile:/etc/caddy/Caddyfile:ro
```

Заменить на:

```yaml
caddy:
  build:
    context: ./infra/caddy
    dockerfile: Dockerfile
  image: 2x2-caddy:2.10-ratelimit  # имя локального образа
  ...
  volumes:
    - ./infra/caddy/Caddyfile:/etc/caddy/Caddyfile:ro
    # ↑ ВАЖНО: смонтировать НОВЫЙ Caddyfile с rate_limit-директивами,
    # старый ./Caddyfile (без них) тоже работает, но без лимитов.
```

### Шаг 3. Собрать и применить

```bash
cd /root/2x2-shop
docker compose build caddy
docker compose up -d caddy
docker compose logs --tail=50 caddy
# Ищем строку: "serving initial configuration"
# Если ошибка "unknown directive rate_limit" → модуль не собрался,
#   пересобрать: docker compose build --no-cache caddy
```

### Шаг 4. Проверка

```bash
# 1. Sanity: сайт открывается, статика отдаётся
curl -I https://erfgv.website/
# 200 OK + security headers

# 2. Rate-limit на admin login: 11-й запрос — 429
for i in $(seq 1 11); do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST https://erfgv.website/admin/login \
    -d "email=test@test.com&password=wrong"
done
# Ожидание: 200/302 ×10, потом 429

# 3. Webhook CDEK НЕ лимитируется (страховка)
for i in $(seq 1 50); do
  curl -s -o /dev/null -w "%{http_code} " -X POST https://erfgv.website/api/cdek/webhook \
    -d '{}'
done; echo
# Ожидание: 50× по 4xx (валидации не проходят, но НИ ОДНОГО 429)
```

### Откат

Если что-то сломалось — вернуть `image: caddy:2.10-alpine` и
монтировать старый `./Caddyfile`. Сертификаты Let's Encrypt в томе
`caddy_data` сохранены, повторного выпуска не потребуется.

```bash
# Быстрый откат:
sed -i 's|build:|# build:|; s|context: ./infra/caddy|# context: ./infra/caddy|; s|dockerfile: Dockerfile|# dockerfile: Dockerfile|' docker-compose.yml
# (или просто откатить compose-файл из git: git checkout docker-compose.yml)
docker compose up -d caddy
```

## Альтернатива: Cloudflare

Если xcaddy + custom Dockerfile неудобно поддерживать — поставить
**Cloudflare** перед Caddy:

1. Завести бесплатный аккаунт Cloudflare.
2. Перенести NS домена `erfgv.website` на Cloudflare.
3. В разделе **Security → WAF → Rate limiting rules**:
   - Правило `admin-protect`: `URI Path contains /admin/login` →
     10 requests per minute per IP → Block on hit.
   - Правило `api-protect`: `URI Path starts with /api/` AND
     `URI Path doesn't contain /api/cdek/webhook` → 300 req/min/IP → Challenge.
4. Включить **DNS proxy** (оранжевое облако) — Cloudflare становится TLS-фронтом.
5. В Caddyfile отключить SSL (`{ acme_dns ... }` или `tls internal` для
   localhost-токена), оставить только plaintext на 80/443 за CF.

**Плюсы Cloudflare:**
- Бесплатно, мгновенный rollback (выключить proxy = вернуться к Caddy).
- DDoS-защита из коробки.
- Аналитика трафика, geo-блокировки.

**Минусы:**
- IP клиента приходит в `CF-Connecting-IP` — нужен `trusted_proxies` в Caddyfile.
- Платный план для расширенных WAF-правил (Free даёт до 5 простых правил).
- Зависимость от внешнего сервиса.

Решение между «xcaddy» и «Cloudflare» — за владельцем VPS.
По умолчанию рекомендую **xcaddy** — нет внешних зависимостей.
