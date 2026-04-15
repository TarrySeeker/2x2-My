# 💾 Backup & Restore — 2x2-shop

Что бэкапим, где хранится, как восстанавливать.

---

## Что подлежит бэкапу

| Артефакт | Критичность | Как | Где лежит | Частота | Retention |
|----------|-------------|-----|-----------|---------|-----------|
| **Supabase Postgres** | P0 | `pg_dump` или встроенный PITR | Supabase + `/var/backups/2x2-shop/daily/` | Ежедневно 03:00 | 14 дней daily + 60 дней weekly |
| **Supabase Storage** (фото товаров, портфолио) | P0 | `rsync` бакетов в локальную папку | `/var/backups/2x2-shop/storage/` | Ежедневно 03:15 | 14 дней |
| **`.env.production`** (секреты) | P0 | `gpg --symmetric` | `/var/backups/2x2-shop/daily/env-*.gpg` + 1Password | Ежедневно | 14 дней + перманент в 1Password |
| **Код** (git) | P1 | `git push origin main` | GitHub | На каждый push | Навсегда |
| **Nginx конфиги** | P2 | `/etc/nginx/sites-*` в гит-репо `infra-2x2` | Локально + GitHub | При изменении | Навсегда |
| **Weekly off-site copy** | P0 | S3/Я.Облако | `s3://2x2-shop-backups/weekly/` | Каждое воскресенье | 60 дней |

---

## Настройка

### 1. Создать директории

```bash
sudo mkdir -p /var/backups/2x2-shop/{daily,weekly,storage}
sudo chown -R deploy:deploy /var/backups/2x2-shop
sudo mkdir -p /etc/2x2-shop
```

### 2. GPG passphrase для шифрования .env

```bash
# Сгенерировать случайный passphrase (32 символа)
openssl rand -base64 32 | sudo tee /etc/2x2-shop/backup.passphrase
sudo chmod 600 /etc/2x2-shop/backup.passphrase
sudo chown root:root /etc/2x2-shop/backup.passphrase
```

Сохранить копию этого passphrase **вне сервера** (1Password/Bitwarden/бумажка в сейфе). Без него бэкапы `.env` не расшифровать.

### 3. Переменные окружения для backup.sh

`/etc/default/2x2-shop-backup`:
```bash
SUPABASE_DB_URL=postgresql://postgres:PASS@db.<proj>.supabase.co:5432/postgres?sslmode=require
S3_BUCKET=2x2-shop-backups
S3_ENDPOINT=https://storage.yandexcloud.net
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

`sudo chmod 600 /etc/default/2x2-shop-backup`

### 4. Cron

```cron
# /etc/cron.d/2x2-shop-backup
SHELL=/bin/bash
ENV_FILE=/etc/default/2x2-shop-backup

0 3 * * *  deploy  set -a; . /etc/default/2x2-shop-backup; set +a; /var/www/2x2-shop/deploy/scripts/backup.sh >> /var/log/2x2-shop/backup.log 2>&1
15 3 * * * deploy  /var/www/2x2-shop/deploy/scripts/backup-storage.sh >> /var/log/2x2-shop/backup.log 2>&1
```

---

## Восстановление

### Supabase Postgres (частичное — одна таблица)

```bash
# Найти нужный дамп
ls -lh /var/backups/2x2-shop/daily/db-*.sql.gz

# Восстановить одну таблицу (пример: products)
gunzip -c /var/backups/2x2-shop/daily/db-2026-04-14_0300.sql.gz \
  | grep -A 1000000 'COPY public.products' \
  | head -1000 \
  | psql "$SUPABASE_DB_URL"
```

### Supabase Postgres (полное восстановление)

⚠ Полное восстановление **перезапишет БД**. Используй только если данные уже потеряны.

```bash
# 1. Скачать свежий дамп
DUMP=/var/backups/2x2-shop/daily/db-2026-04-14_0300.sql.gz

# 2. На чистом проекте — применить
gunzip -c "$DUMP" | psql "$SUPABASE_DB_URL"

# 3. Перезапустить приложение
pm2 reload 2x2-shop
curl https://2x2hmao.ru/api/health
```

**Альтернатива через Supabase PITR** (если включён платный план): Dashboard → Database → Backups → Restore to point-in-time.

### .env.production (дешифровка)

```bash
PASSPHRASE=$(sudo cat /etc/2x2-shop/backup.passphrase)
gpg --batch --yes --passphrase "$PASSPHRASE" \
    -o /tmp/env-restored \
    /var/backups/2x2-shop/daily/env-2026-04-14_0300.gpg
sudo mv /tmp/env-restored /var/www/2x2-shop/.env.production
sudo chown deploy:deploy /var/www/2x2-shop/.env.production
sudo chmod 600 /var/www/2x2-shop/.env.production
pm2 reload ecosystem.config.cjs --update-env
```

### Код

```bash
cd /var/www/2x2-shop
git fetch origin
git reset --hard origin/main
pnpm install --frozen-lockfile && pnpm build && pm2 reload 2x2-shop
```

Если нужно восстановить на конкретный коммит (откат):
```bash
git log --oneline -30
git reset --hard <sha>
pnpm install && pnpm build && pm2 reload 2x2-shop
```

### Nginx конфиги

Конфиги лежат в репозитории в `deploy/nginx/`. Просто скопировать заново:
```bash
sudo cp /var/www/2x2-shop/deploy/nginx/2x2-shop.conf /etc/nginx/sites-available/
sudo cp /var/www/2x2-shop/deploy/nginx/limits.conf /etc/nginx/conf.d/10-limits.conf
sudo nginx -t && sudo systemctl reload nginx
```

---

## Тест восстановления (обязательно раз в месяц)

1. Развернуть отдельный «staging» Supabase проект.
2. Применить последний дамп: `gunzip -c db-*.sql.gz | psql "$STAGING_DB_URL"`.
3. Поднять локально с `.env.staging` (с восстановленными секретами и staging URL БД).
4. Сверить 5 ключевых таблиц: `products`, `orders`, `leads`, `portfolio_items`, `users`.
5. Сделать тестовый заказ через UI.
6. Задокументировать результат в этом файле в таблице «Последние тесты восстановления».

### Последние тесты восстановления

| Дата | Кто | Что восстанавливали | Результат | Комментарий |
|------|-----|---------------------|-----------|-------------|
| _пусто_ | — | — | — | Этап 1: БД ещё не создана |

---

## Storage (отдельный скрипт)

`deploy/scripts/backup-storage.sh` (создать при подключении Supabase Storage в Этапе 2+). Пример:

```bash
#!/usr/bin/env bash
set -euo pipefail
DEST="/var/backups/2x2-shop/storage"
mkdir -p "$DEST"
# rclone подключить к Supabase Storage, или использовать supabase CLI
supabase storage cp "ss:/products" "$DEST/products/" --recursive
supabase storage cp "ss:/portfolio" "$DEST/portfolio/" --recursive
# Архивировать
tar -czf "$DEST/storage-$(date +%F).tgz" -C "$DEST" products portfolio
find "$DEST" -name 'storage-*.tgz' -mtime +14 -delete
```

---

## Что НЕ бэкапим

- `node_modules` — воспроизводится из `pnpm-lock.yaml`.
- `.next` — собирается при деплое.
- Системные логи Nginx/PM2 — хранятся 14 дней через logrotate.
- Кэш браузеров, Cloudflare, CDN — не наши данные.

## Чек-лист готовности бэкапов

- [ ] `/var/backups/2x2-shop/` существует и пишется
- [ ] `/etc/2x2-shop/backup.passphrase` существует (mode 600, root-only)
- [ ] Passphrase скопирован в 1Password
- [ ] `/etc/default/2x2-shop-backup` настроен с `SUPABASE_DB_URL`
- [ ] Cron `/etc/cron.d/2x2-shop-backup` активен
- [ ] `backup.sh` выполняется вручную без ошибок (тест)
- [ ] В `/var/backups/2x2-shop/daily/` появляются файлы после первого прогона
- [ ] S3/Я.Облако бакет создан, ключи настроены
- [ ] Тест восстановления проведён (см. выше)
- [ ] Владельцу проекта переданы: passphrase, AWS-ключи, инструкция из этого файла
