# DEPLOY — 2x2-shop на Timeweb Cloud VPS

Полная инструкция: от пустого VPS до работающего HTTPS-сайта.

---

## Что разворачиваем

Single-VPS Docker stack (всё на одном сервере):

```
Internet (HTTPS)
       |
   [Caddy] :80 :443  ← auto-SSL Let's Encrypt
       |
   [Next.js app] :3000  ← standalone build
       |
       +— [PostgreSQL 15] :5432  ← с pg_trgm + unaccent
       +— [MinIO] :9000  ← S3-совместимое хранилище
```

Все сервисы — в одной Docker-сети `app-network`. Постоянные данные —
в named volumes (`postgres_data`, `minio_data`, `caddy_data`).

---

## 1. Подготовка VPS

### 1.1 Заказать VPS

**Timeweb Cloud → Облачный сервер:**
- Регион: **Москва**
- ОС: **Ubuntu 24.04 LTS**
- Конфигурация: **2 vCPU / 4 GB RAM / 60 GB NVMe** (минимум)
- Сеть: публичный IPv4, 100 Mbit/s

После создания запиши IP-адрес и root-пароль (они придут на email).

### 1.2 Базовая настройка (от root)

```bash
ssh root@<VPS_IP>

# Часовой пояс и обновления
timedatectl set-timezone Europe/Moscow
apt update && apt upgrade -y

# Создать non-root пользователя для деплоя
adduser deploy
usermod -aG sudo deploy

# Загрузить свой SSH-ключ юзеру deploy
mkdir -p /home/deploy/.ssh
# вставь сюда содержимое ~/.ssh/id_ed25519.pub со своей машины:
echo "ssh-ed25519 AAAA... your-email@example.com" >> /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh

# Запретить root SSH и парольный логин (после проверки доступа deploy!)
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart sshd

# Firewall
apt install -y ufw
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp        # SSH
ufw allow 80/tcp        # HTTP (Caddy редиректит на HTTPS)
ufw allow 443/tcp       # HTTPS
ufw allow 443/udp       # HTTP/3 (Caddy)
ufw enable

# fail2ban (защита SSH)
apt install -y fail2ban
systemctl enable --now fail2ban
```

### 1.3 Установить Docker

```bash
# Официальный однострочник
curl -fsSL https://get.docker.com | sh

# Дать deploy запускать docker без sudo
usermod -aG docker deploy

# Проверка
docker --version          # Docker version 27.x.x
docker compose version    # Docker Compose version v2.x.x
```

Дальнейшие шаги — от пользователя `deploy`:

```bash
exit
ssh deploy@<VPS_IP>
```

---

## 2. Настройка DNS

В панели управления доменом создай **A-запись**:

| Тип | Имя              | Значение      | TTL |
|-----|------------------|---------------|-----|
| A   | `@` (или поддомен) | `<VPS_IP>`    | 300 |

Опционально (если будешь публиковать MinIO console):

| Тип | Имя       | Значение    | TTL |
|-----|-----------|-------------|-----|
| A   | `media`   | `<VPS_IP>`  | 300 |

**Важно:** Caddy при первом запуске делает HTTP-01 challenge — DNS должен
резолвиться **до** запуска `docker compose up`. Проверь:

```bash
dig +short 2x2hmao.ru     # должен вернуть <VPS_IP>
```

---

## 3. Деплой проекта

### 3.1 Склонировать репозиторий

```bash
sudo mkdir -p /opt/2x2
sudo chown deploy:deploy /opt/2x2
cd /opt/2x2

git clone https://github.com/<your-org>/2x2-shop.git .
```

### 3.2 Заполнить .env

```bash
cp .env.example .env

# Сгенерировать сильные пароли:
openssl rand -base64 32   # → POSTGRES_PASSWORD
openssl rand -base64 32   # → MINIO_ROOT_PASSWORD
openssl rand -base64 32   # → S3_SECRET_KEY (можно = MINIO_ROOT_PASSWORD)

nano .env
```

Минимум что нужно поправить:
- `DOMAIN` — твой домен
- `ACME_EMAIL` — твой email (для Let's Encrypt)
- `POSTGRES_PASSWORD`
- `MINIO_ROOT_PASSWORD` + `S3_ACCESS_KEY` + `S3_SECRET_KEY`
- `S3_PUBLIC_URL` — `https://<DOMAIN>/<bucket>` или `https://media.<DOMAIN>/<bucket>`
- Все CDEK / Yandex Maps ключи (если есть)

### 3.3 Первый запуск

```bash
docker compose up -d --build
```

Что произойдёт:
1. Соберётся `Dockerfile.postgres` (postgres:15-alpine + contrib).
2. Соберётся `Dockerfile` (Next.js standalone build, ~5 минут на 2 vCPU).
3. Запустится `postgres` — при пустом volume **сразу** применит миграции
   из `db/migrations/*.sql` + `db/seed.sql` (через initdb-folder).
4. Запустится `minio` + сайдкар `minio-init` создаст bucket `2x2-media`.
5. Запустится `app` (Next.js). Healthcheck подождёт 40 сек.
6. Запустится `caddy` — выпустит Let's Encrypt серт (1-2 минуты).

Прогресс:

```bash
docker compose ps
docker compose logs -f caddy
docker compose logs -f app
```

После успешного запуска:

```bash
curl -fsSL https://<DOMAIN>/api/health | jq
# {
#   "status": "healthy",
#   "checks": { "nextjs": "ok", "database": "ok", ... }
# }
```

### 3.4 Сменить пароль admin

В seed-данных создаётся `admin / admin123` — это **только для локального dev**.
В production обязательно смени:

```bash
# Сгенерировать новый bcrypt-hash:
docker compose exec app node /app/scripts/generate-admin-hash.mjs 'MyStrongPassword!'
# Скопируй вывод (например: $2b$12$abc...)

# Обновить в БД:
docker compose exec postgres psql -U "$POSTGRES_USER" "$POSTGRES_DB" -c \
  "UPDATE users SET password_hash='$2b$12$abc...' WHERE username='admin';"
```

---

## 4. Бэкапы

### 4.1 PostgreSQL

```bash
sudo mkdir -p /var/backups/2x2/postgres
sudo chmod 700 /var/backups/2x2/postgres

# Тестовый запуск
sudo bash /opt/2x2/scripts/backup-db.sh
ls -lh /var/backups/2x2/postgres/

# Cron — ежедневно в 03:00
sudo crontab -e
```

Добавить строку:
```
0 3 * * * /opt/2x2/scripts/backup-db.sh >> /var/log/2x2-backup.log 2>&1
```

Скрипт хранит 30 дней истории, удаляет более старые. Размер БД магазина
~50-200 MB сжато, так что 6 GB для месяца хватит с запасом.

### 4.2 MinIO (медиа)

Самое простое — `mc mirror` на внешнее хранилище раз в сутки:

```bash
# Установить mc на хосте:
curl -O https://dl.min.io/client/mc/release/linux-amd64/mc
sudo install -m 755 mc /usr/local/bin/mc

# Настроить алиасы
mc alias set local http://localhost:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD"
mc alias set timeweb https://s3.timeweb.cloud "$TW_KEY" "$TW_SECRET"

# Cron (раз в сутки в 03:30)
30 3 * * * mc mirror --remove --overwrite local/2x2-media timeweb/2x2-backup
```

Для совсем минимального бэкапа — `tar czf` тома `minio_data`:

```bash
docker run --rm -v 2x2_minio_data:/data -v /var/backups/2x2:/backup \
  alpine tar czf /backup/minio-$(date +%Y%m%d).tar.gz -C /data .
```

### 4.3 .env (секреты)

```bash
# Зашифровать GPG и положить в надёжное место:
gpg --symmetric --output /var/backups/2x2/env-$(date +%Y%m%d).env.gpg /opt/2x2/.env
# Перенести .gpg-файл в 1Password / Bitwarden / Я.Диск.
```

---

## 5. Восстановление

### 5.1 Postgres

```bash
cd /opt/2x2
gunzip -c /var/backups/2x2/postgres/2x2-20260420-0300.sql.gz \
  | docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
```

Если БД полностью убита — пересоздай volume:

```bash
docker compose down
docker volume rm 2x2_postgres_data
docker compose up -d postgres
# Подожди healthcheck → восстанови дамп.
```

### 5.2 MinIO

```bash
# С внешнего бэкапа Timeweb
mc mirror timeweb/2x2-backup local/2x2-media
```

---

## 6. Обновление кода

```bash
cd /opt/2x2
git pull origin main

# Если в db/migrations/ появились новые файлы — применить:
docker compose exec app sh /app/scripts/apply-migrations.sh

# Пересобрать только app (postgres/minio не трогаем):
docker compose up -d --build app

# Проверить здоровье:
curl -fsSL https://<DOMAIN>/api/health | jq
```

GitHub Actions делает то же самое автоматически
(`.github/workflows/deploy-docker.yml`) — нужно настроить секреты:
- `DEPLOY_HOST` = `<VPS_IP>`
- `DEPLOY_USER` = `deploy`
- `DEPLOY_SSH_KEY` = приватный SSH-ключ для пользователя deploy
- `DEPLOY_PORT` = `22` (опционально)

---

## 7. Мониторинг

### Простейший uptime monitor — Better Stack / UptimeRobot:
- URL: `https://<DOMAIN>/api/health`
- Метод: GET, ожидаем код `200` и тело содержит `"status":"healthy"`
- Период: каждые 5 минут
- Алерт: Telegram / email

### Логи

```bash
# Live логи всех сервисов
docker compose logs -f

# Конкретный сервис
docker compose logs -f app --tail=200
docker compose logs -f caddy --tail=200

# Структурированный access-лог Caddy
docker compose exec caddy tail -f /var/log/caddy/access.log | jq
```

### Метрики

Caddy экспортирует Prometheus-метрики на `:2019/metrics` (из коробки,
admin API включён глобально). Если нужен дашборд — поставь Grafana отдельно.

---

## 8. Отладка частых проблем

### Caddy не получает Let's Encrypt серт
- Проверь DNS: `dig +short <DOMAIN>` → должен быть IP VPS.
- Проверь firewall: `sudo ufw status` → 80 и 443 открыты.
- Проверь что нет другого процесса на 80: `sudo ss -tlnp | grep :80`.
- Лог: `docker compose logs caddy | grep -i acme`.

### `CREATE EXTENSION unaccent` не работает
- Используй `Dockerfile.postgres` (он ставит `postgresql15-contrib`).
- Если ошибка осталась — проверь что в compose `image:` ссылается на
  собранный кастомный образ, а не на `postgres:15-alpine`.

### Миграции не применились при первом запуске
- Init-folder работает только на пустом volume. Если volume уже
  содержал данные (например, частичный краш) — initdb пропускается.
- Решение: `docker compose down -v && docker compose up -d`
  (внимание: УДАЛИТ ВСЕ ДАННЫЕ).
- Альтернатива: `docker compose exec app sh /app/scripts/apply-migrations.sh`.

### App стартует и сразу падает
- `docker compose logs app` — обычно видно сразу.
- Самые частые причины:
  - `DATABASE_URL` указывает на localhost, а нужно на `postgres`
    (внутри сети). Проверь `.env` — `DATABASE_URL` пересоздаётся
    в `docker-compose.yml` на корректный.
  - `S3_*` переменные пустые, а код требует их при импорте.

### Не хватает места на диске
```bash
df -h
docker system df         # сколько занимает Docker
docker system prune -af  # удалить неиспользуемые образы (осторожно!)
```

---

## 9. Безопасность — чек-лист

- [ ] root SSH отключён (`PermitRootLogin no`)
- [ ] парольный SSH отключён (`PasswordAuthentication no`)
- [ ] ufw активен, открыты только 22/80/443
- [ ] fail2ban запущен
- [ ] auto-updates включены: `apt install unattended-upgrades`
- [ ] `.env` не в git (проверь `git status` после клона)
- [ ] `POSTGRES_PASSWORD` ≠ `postgres`
- [ ] `MINIO_ROOT_PASSWORD` сильный (32+ символа)
- [ ] admin-юзер в БД: пароль не `admin123`
- [ ] HTTPS работает (Caddy выпустил серт)
- [ ] HSTS-заголовок отдаётся (проверь в DevTools → Network)
- [ ] Бэкап БД проверен restore'ом (хотя бы раз)
- [ ] Cron бэкапа работает (`grep CRON /var/log/syslog`)

---

## Вопросы и улучшения

- **Staging?** На том же VPS — отдельная папка `/opt/2x2-staging` с
  префиксом проекта `COMPOSE_PROJECT_NAME=2x2-staging` и доменом
  `staging.<DOMAIN>`. Caddy спокойно тянет несколько сайтов.
- **Балансировка?** При >100 RPS — добавить второй VPS под app, в Caddy
  `reverse_proxy app1:3000 app2:3000`. PostgreSQL вынести на отдельный
  managed-инстанс Timeweb.
- **CDN?** Cloudflare перед Caddy — бесплатный тариф даст DDoS-защиту
  и кэш статики.
