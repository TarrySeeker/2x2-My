# CI/CD — GitHub Actions → Timeweb VPS

Короткая инструкция по настройке автоматического деплоя при пуше в `main`.

---

## Что уже настроено

В репозитории есть три workflow:

| Файл | Триггер | Назначение |
|------|---------|------------|
| `.github/workflows/ci.yml` | push / PR в `main`, `develop` | Lint + typecheck + unit + build + Playwright E2E |
| `.github/workflows/deploy-docker.yml` | push в `main`, `workflow_dispatch` | **Боевой автодеплой на VPS** |
| `.github/workflows/lighthouse.yml` | PR | Lighthouse CI аудит |

Устаревшие (оставлены на случай отката):
- `deploy-vps.yml` — старый PM2-деплой, помечен DEPRECATED, при запуске сразу `exit 1`
- `deploy.yml` — GitHub Pages (проект переехал на VPS)

## Как работает `deploy-docker.yml`

1. Триггер: `push` в `main` или ручной запуск (`workflow_dispatch`).
2. Заходит по SSH на VPS (`appleboy/ssh-action`).
3. На VPS, в `/opt/2x2`:
   - `git fetch origin main && git reset --hard origin/main`
   - Если контейнер `app` уже запущен — применяет новые миграции идемпотентно через `scripts/apply-migrations.sh` (skip-on-error `|| true`).
   - `docker compose up -d --build app caddy` (пересобирает только app+caddy; postgres/minio не трогает).
   - Ждёт до 30 × 5 сек, пока `/api/health` внутри контейнера вернёт `"status":"healthy"`.
   - Делает финальный публичный healthcheck через Caddy HTTPS.
4. Отправляет Telegram-нотификацию (если включено).

Конкурентность: `concurrency: deploy-docker-prod` + `cancel-in-progress: false` — параллельно не бежит, следующий запуск встаёт в очередь.

---

## Необходимые GitHub Secrets

`Settings` → `Secrets and variables` → `Actions` → `New repository secret`:

| Secret | Значение | Откуда взять |
|--------|----------|--------------|
| `DEPLOY_HOST` | `130.49.129.65` (или `erfgv.website`) | IP / DNS VPS |
| `DEPLOY_USER` | `deploy` | Non-root пользователь на VPS |
| `DEPLOY_SSH_KEY` | приватный ключ ed25519 | Сгенерировать (см. ниже) |
| `DEPLOY_PORT` | `22` | SSH-порт (опционально, по умолчанию 22) |
| `TELEGRAM_BOT_TOKEN` | `123456:ABC-...` | @BotFather → Create Bot |
| `TELEGRAM_CHAT_ID` | `-1001234567890` | `getUpdates` после старта бота |

## Необходимые GitHub Variables

`Settings` → `Secrets and variables` → `Actions` → Вкладка `Variables`:

| Variable | Значение | Описание |
|----------|----------|----------|
| `PROD_URL` | `https://erfgv.website` | URL для `environment.url` в GitHub UI |
| `NOTIFY_TELEGRAM` | `true` / `false` | Включает шаги Telegram-нотификаций |

---

## Генерация deploy SSH-ключа

### 1. Сгенерировать пару ключей (локально)

```bash
# Отдельный ключ ТОЛЬКО для CI/CD — не используй свой основной!
ssh-keygen -t ed25519 -f ~/.ssh/2x2_deploy -C "github-actions-2x2-deploy" -N ""
```

Появятся два файла:
- `~/.ssh/2x2_deploy`      — приватный (пойдёт в GitHub Secret)
- `~/.ssh/2x2_deploy.pub`  — публичный (пойдёт на VPS)

### 2. Добавить публичную часть на VPS

```bash
# На VPS, от пользователя deploy:
ssh deploy@130.49.129.65
mkdir -p ~/.ssh && chmod 700 ~/.ssh
echo "ssh-ed25519 AAAA...github-actions-2x2-deploy" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

Или одной командой с локальной машины:

```bash
ssh-copy-id -i ~/.ssh/2x2_deploy.pub deploy@130.49.129.65
```

### 3. Проверить, что ключ работает

```bash
ssh -i ~/.ssh/2x2_deploy deploy@130.49.129.65 "whoami && pwd"
# → deploy
# → /home/deploy
```

### 4. Загрузить приватный ключ в GitHub Secret

```bash
# Содержимое целиком, включая BEGIN/END строки:
cat ~/.ssh/2x2_deploy
```

Скопировать всё вместе со строками `-----BEGIN OPENSSH PRIVATE KEY-----` / `-----END OPENSSH PRIVATE KEY-----` → вставить в секрет `DEPLOY_SSH_KEY`.

**Важно:** НЕ коммить приватный ключ в репо. Держи локальную копию в менеджере паролей (Bitwarden / 1Password).

---

## Проверка настройки workflow

### Шаг 1. Убедиться, что secrets загружены

`Settings` → `Secrets and variables` → `Actions` — должны быть перечислены:
- `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY` (обязательные)
- `DEPLOY_PORT`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` (опциональные)

### Шаг 2. Первый ручной запуск

`Actions` → `Deploy Docker stack to VPS` → `Run workflow` → `Branch: main` → `Run workflow`.

Это безопаснее, чем пуш в `main`, потому что:
- не привязано к конкретному коммиту, можно откатить
- видно прогресс шагов в реальном времени
- если упадёт — не тронет пользователей (но изменит состояние VPS, если git pull прошёл!)

### Шаг 3. Следить за логами

В правой панели прогресса:
- `Deploy on VPS` — SSH-сессия, видно `git fetch`, `docker compose up`, healthcheck loop.
- Если зависло на `Waiting for app health` > 2 минут — зайди на VPS и посмотри `docker compose logs app --tail=100`.

### Шаг 4. Проверить результат

```bash
curl -fsSL https://erfgv.website/api/health | jq
# {
#   "status": "healthy",
#   "checks": { "nextjs": "ok", "database": "ok", "storage": "ok" }
# }
```

---

## Ручной запуск для тестирования (без пуша в main)

1. `Actions` → выбрать workflow → `Run workflow`.
2. Branch: `main` (или любая ветка, где есть изменённый workflow).
3. `Run workflow`.

Полезно:
- Тестировать изменения самого workflow — push в feature-ветку, Run workflow → Branch: `<feature>`.
- Откатить деплой: на VPS сделать `git reset --hard <old-sha>` и снова запустить workflow (или `docker compose up -d --build`).

---

## Типовые ошибки и решения

### `Permission denied (publickey)`

Причина: на VPS нет публичной части ключа или у `authorized_keys` неправильные права.

```bash
# На VPS:
ls -la ~/.ssh/authorized_keys
# должно быть: -rw------- (600), owner = deploy
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

Также проверь, что в `DEPLOY_SSH_KEY` целиком скопирован приватный ключ (все 4 строки `BEGIN/END` + тело).

### `Host key verification failed`

`appleboy/ssh-action` сам добавляет known_hosts при первом коннекте — обычно не проблема. Если всё равно падает, добавь перед SSH-шагом:

```yaml
- name: Add VPS to known_hosts
  run: |
    mkdir -p ~/.ssh
    ssh-keyscan -H ${{ secrets.DEPLOY_HOST }} >> ~/.ssh/known_hosts
```

### `docker: command not found`

Пользователь `deploy` не в группе `docker`. На VPS от root:

```bash
usermod -aG docker deploy
# выйти и зайти заново в SSH-сессию — группы подгружаются при логине
```

### `git fetch: Permission denied`

Репо приватное, а `/opt/2x2/.git/config` ссылается на HTTPS без токена. Решение: переключить на SSH и добавить deploy-ключ также в GitHub Deploy Keys:

```bash
# На VPS:
cd /opt/2x2
git remote set-url origin git@github.com:TarrySeeker/2x2-My.git
ssh-keygen -t ed25519 -f ~/.ssh/github_deploy -N ""
cat ~/.ssh/github_deploy.pub
# → добавить в GitHub → Repo Settings → Deploy keys (read-only)
```

### Healthcheck висит 30 итераций и workflow падает

```bash
# На VPS:
docker compose logs app --tail=200
docker compose ps
```

Частые причины:
- `DATABASE_URL` в `.env` неверный (должен указывать на `postgres:5432`, не `localhost`)
- Миграции упали и таблицы не созданы — `docker compose exec app sh /app/scripts/apply-migrations.sh`
- Нет свободной памяти — `free -h`, `docker system prune -af`

### Telegram-нотификации не приходят

Проверь:
1. Variable `NOTIFY_TELEGRAM=true` (не в secrets, а в variables!)
2. Бот добавлен в чат как администратор, если чат — группа/канал.
3. `TELEGRAM_CHAT_ID` — с минусом, если это группа: `-1001234567890`.

---

## Важные правила безопасности

- **НЕ коммить** `.env` и приватные ключи.
- **Использовать отдельный ключ** для CI/CD (не личный).
- **Не давать ключу sudo** без пароля — пользователь `deploy` должен иметь только доступ к `/opt/2x2` и `docker`.
- **Force-push в main** автоматически затрёт историю — защитить branch protection в GitHub Settings → Branches.
- **Миграции только идемпотентные** (CREATE TABLE IF NOT EXISTS / DO...EXCEPTION для ENUM). При откате нужен явный down-миграционный SQL.

---

## Ссылки

- Полная инструкция деплоя: `docs/DEPLOY.md`
- Переменные окружения: `docs/env-vars.md`
- Runbook при падении: `docs/runbook.md`
- Бэкапы и восстановление: `docs/backup-restore.md`
