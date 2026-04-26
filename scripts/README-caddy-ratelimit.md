# Caddy Rate-Limit Deploy Script

## Что делает скрипт

`deploy-caddy-ratelimit.sh` собирает на VPS Caddy с подключённым модулем `caddy-ratelimit` (через `xcaddy`) и заменяет работающий контейнер Caddy. Применяет rate-limit правила из `Caddyfile` (защита `/admin/login` и `/api/*` от перебора).

Шаги:

1. `git archive HEAD` — упаковывает локальный `HEAD` (включая локальный коммит `fde1425` с `docker-compose.yml`, где у сервиса `caddy` стоит `build:` вместо `image:`) в tar.
2. `scp` — отправляет tar на VPS.
3. На VPS делает резервные копии `.env` и `docker-compose.yml` с timestamp, распаковывает tar, восстанавливает `.env`.
4. `docker compose build caddy` — собирает кастомный образ Caddy через `xcaddy` (включает `caddy-ratelimit`). Это самый долгий шаг (~5 мин).
5. `docker compose up -d caddy` — поднимает новый контейнер Caddy.
6. Smoke-тесты: `GET /api/health`, `/`, `/admin/login`. Если хоть один не вернул `200` — автоматический rollback на старый `docker-compose.yml` и старый Caddy-образ.
7. Rate-limit тест: 11 быстрых запросов к `/admin/login`. Ожидается, что 1–10 вернут `200`, начиная с 11-го — `429 Too Many Requests`.

## Когда запустить

После пробуждения / выхода sandbox-машины из throttle. Скрипт можно запускать в любой момент — он не зависит от внешних таймеров.

## Сколько займёт

**~6–8 минут** суммарно:

- git archive + scp: ~10 сек
- backup + extract: ~5 сек
- `docker compose build caddy` (xcaddy качает плагин, собирает Caddy из исходников Go): **~5 минут**
- up + sleep 30: ~40 сек
- smoke-тесты: ~5 сек
- rate-limit тест: ~5 сек

## Что произойдёт при ошибке

**Auto-rollback включён** для smoke-тестов (шаг 6). Если `/api/health`, `/` или `/admin/login` не вернёт `200`:

1. На VPS восстанавливается резервная копия `docker-compose.yml.bak.<timestamp>` (она ссылается на старый рабочий Caddy-образ).
2. `docker compose up -d caddy` поднимает старый Caddy.
3. Скрипт падает с `exit 1` — пользователь видит, что был rollback и какой код вернул сайт после отката.

`.env` и старый `docker-compose.yml` остаются на VPS под именами `*.bak.<timestamp>` неограниченно долго — их можно использовать для ручного отката позже.

**Что НЕ откатывается автоматически:**

- Если упал шаг 4 (`docker compose build caddy`) — скрипт упадёт по `set -e`, новый Caddy не поднимется, старый продолжит работать (т.к. `up -d` ещё не вызывался). Откат не нужен.
- Шаг 7 (rate-limit тест) — информационный. Если 11-й запрос не вернул `429`, это не считается ошибкой деплоя (rate-limit мог сработать на другом окне). Откат не выполняется.

## Как откатить вручную

Если позже окажется, что что-то сломано (например, обнаружится через час), вытащите timestamp из вывода скрипта (`Backup compose: .../docker-compose.yml.bak.YYYYMMDD-HHMMSS`) и выполните:

```bash
ssh deploy@130.49.129.65 "cd ~/2x2-shop && cp docker-compose.yml.bak.<TIMESTAMP> docker-compose.yml && docker compose up -d caddy"
```

Если нужно посмотреть список доступных бэкапов:

```bash
ssh deploy@130.49.129.65 "ls -la ~/2x2-shop/docker-compose.yml.bak.*"
```

## Команда для запуска

Из корня репозитория `c:/Users/pup/Desktop/2x2/2x2-shop`:

```bash
bash scripts/deploy-caddy-ratelimit.sh
```

(скрипт уже `chmod +x`, но `bash` явно — на случай Windows/WSL Git Bash, где executable-bit не всегда сохраняется)

## Предусловия

- SSH-доступ к `deploy@130.49.129.65` настроен (ключ в `~/.ssh/`).
- Локальный `HEAD` содержит коммит `fde1425` (`docker-compose.yml` с `build:` секцией для `caddy`).
- На VPS установлен `docker compose` v2.
- На VPS `~/2x2-shop/.env` существует и содержит prod-секреты (скрипт его сохраняет и восстанавливает).
- Домен `erfgv.website` указывает на VPS (DNS), TLS-сертификат у Caddy уже есть (он сохранится в томе `caddy_data`).

## После успешного деплоя

- Старые `*.bak.*` файлы на VPS можно почистить через неделю-другую (после подтверждения стабильности).
- Локальный коммит `fde1425` всё ещё не запушен на GitHub — это отдельная задача (запушить, когда GitHub снова доступен).
