# Offsite-бэкапы БД

> Цель — иметь копию дампа PostgreSQL **вне VPS** на случай, если VPS целиком уйдёт (потеря диска, отзыв доступа, удаление аккаунта). Локальные бэкапы продолжают работать как и раньше (`scripts/backup-db.sh`), offsite — это второй уровень защиты.

---

## Текущая конфигурация (fallback)

Пока у нас **нет credentials Yandex Object Storage / Selectel S3**, используется упрощённая схема через `scripts/backup-db-rotate.sh`:

1. cron в **03:00** ежедневно запускает `backup-db-rotate.sh` от пользователя `deploy` на проде (`130.49.129.65`).
2. Скрипт вызывает `backup-db.sh` → свежий `pg_dump` → `/home/deploy/backups/db/db-YYYYMMDD-HHMMSS.dump`.
3. Удаляет дампы старше **14 дней** (env `RETENTION_DAYS`).
4. Если задана переменная `OFFSITE_RSYNC_HOST` — `rsync` свежего дампа на второй VPS в `/var/backups/2x2/db/` (опционально).
5. Логи: `/var/log/2x2-backup.log`.

### Что включено сейчас на проде

| Компонент | Значение |
|-----------|----------|
| Cron | `0 3 * * * /home/deploy/2x2-shop/scripts/backup-db-rotate.sh >> /var/log/2x2-backup.log 2>&1` |
| Локальный путь | `/home/deploy/backups/db/db-YYYYMMDD-HHMMSS.dump` |
| Retention локально | 14 дней (`RETENTION_DAYS=14`) |
| Offsite rsync host | `root@5.42.101.115` (второй VPS) |
| Offsite путь | `/var/backups/2x2/db/` (через `rrsync`) |
| Offsite SSH key | `/home/deploy/.ssh/id_ed25519_offsite` (только rsync на эту директорию через `command="/usr/bin/rrsync ..."`) |
| Retention offsite | 14 дней — отдельный cron на самом backup-VPS: `15 5 * * * find /var/backups/2x2/db -maxdepth 1 -name "db-*.dump" -type f -mtime +14 -delete` |
| Алерт об ошибке | Telegram (если в `.env` есть `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID`) |

> Pubkey прода `ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFC7DE9ldvN8nP1q7qpe9nyRxiFNZCGVldnInesdvORj deploy@2x2-prod-offsite` записан в `/root/.ssh/authorized_keys` на `5.42.101.115` с `restrict,command="/usr/bin/rrsync /var/backups/2x2/db/"`. Это значит, что ключ может ТОЛЬКО заливать файлы rsync'ом в эту папку — никакого shell-доступа.

**Что это даёт.** Защиту от случайного удаления одного дампа и от частичной порчи (хранится 14 предыдущих суток). При rsync на второй VPS — дополнительно защиту от потери диска прода.

**Чего НЕ даёт.** Защиты от уничтожения аккаунта Timeweb. Для полноценного offsite нужен S3-бакет — см. ниже разделы 1–6 (актуально, как только появятся credentials).

### Когда появятся credentials Y.Cloud / Selectel

1. Заполнить блок `S3_OFFSITE_*` в `/home/deploy/2x2-shop/.env` (см. раздел 2.3).
2. Добавить cron-задачу:
   ```cron
   0 5 * * * /home/deploy/2x2-shop/scripts/backup-db-offsite.sh >> /var/log/backup-offsite.log 2>&1
   ```
3. `backup-db-rotate.sh` оставить как есть — он останется ответственным за локальный rotation.

---

## TL;DR

1. Создать bucket в Yandex Object Storage.
2. Получить **статический ключ доступа** (access key + secret key) для сервисного аккаунта.
3. Записать значения в `/home/deploy/2x2-shop/.env`:
   ```env
   S3_OFFSITE_ENDPOINT=https://storage.yandexcloud.net
   S3_OFFSITE_REGION=ru-central1
   S3_OFFSITE_BUCKET=2x2-shop-db-backups
   S3_OFFSITE_ACCESS_KEY=...
   S3_OFFSITE_SECRET_KEY=...
   S3_OFFSITE_PREFIX=db/
   ```
4. Прогнать ручной тест:
   ```bash
   bash /home/deploy/2x2-shop/scripts/backup-db-offsite.sh
   ```
5. Добавить cron:
   ```bash
   crontab -e
   # после локального бэкапа в 03:00 — заливка в облако в 04:00
   0 4 * * * /home/deploy/2x2-shop/scripts/backup-db-offsite.sh >> /var/log/backup-offsite.log 2>&1
   ```

---

## 1. Что делает `scripts/backup-db-offsite.sh`

- Читает `/home/deploy/2x2-shop/.env`.
- Находит **самый свежий** дамп `db-*.dump` в `/home/deploy/backups/db/`.
- Защищается от пустого/битого дампа (минимум 1 KB).
- Через контейнер `minio/mc:latest` загружает файл в S3-бакет под ключом `${S3_OFFSITE_PREFIX}db-YYYYMMDD-HHMMSS.dump`.
- Если задан `TELEGRAM_BOT_TOKEN` — при ошибке шлёт алерт.
- При `RUN_LOCAL_BACKUP=1` сначала запустит `backup-db.sh`, чтобы не зависеть от порядка cron-jobs.

Скрипт **не управляет ретеншном в облаке** — это делает lifecycle-правило бакета (см. ниже). Так дешевле и надёжнее: правило остаётся в силе, даже если скрипт сломается.

---

## 2. Yandex Object Storage — пошагово

> Стоимость: ~50 ₽/мес за ~10 ГБ + копейки за PUT/GET. См. калькулятор: https://cloud.yandex.ru/prices#object-storage

### 2.1. Создать bucket

1. Зайти в консоль: https://console.yandex.cloud/
2. Если облака ещё нет — создать. Платёжный аккаунт можно подключить картой РФ.
3. Слева → **Object Storage** → **Создать бакет**.
4. Параметры:
   - **Имя:** `2x2-shop-db-backups` (имя глобально-уникальное, при коллизии добавить `-erfgv` или подобный суффикс).
   - **Макс. размер:** 50 ГБ (хватит с большим запасом).
   - **Доступ:** *Приватный* (никаких public-read).
   - **Класс хранилища по умолчанию:** *Стандартное* (Cold/Ice не подходит — мы кладём ежедневно, нужен предсказуемый PUT).
   - **Версионирование:** *Включить*. Это страхует от случайного перезаписывания/удаления — старая версия объекта остаётся.
   - **Шифрование:** *Включить (CMEK или SSE)*. Достаточно встроенного `AES-256`.

### 2.2. Создать сервисный аккаунт + ключ

1. Слева → **Identity and Access Management** → **Сервисные аккаунты** → **Создать сервисный аккаунт**.
   - Имя: `s3-backup-writer`
   - Роль на каталог: **`storage.uploader`** (только заливка/чтение, без права удалять чужое).
2. Открыть созданный сервисный аккаунт → **Создать ключ → Статический ключ доступа**.
3. Сохранить пару `access_key_id` + `secret`. Secret показывается **один раз** — записать в менеджер паролей.

> Не используй ключи root-аккаунта Я.Облако — компрометация сервисного ключа ограничится только бакетом бэкапов.

### 2.3. Записать в `.env` на VPS

```bash
ssh deploy@130.49.129.65
nano /home/deploy/2x2-shop/.env
```

Добавить блок:

```env
# -------------------------------------------------------------
# Offsite DB backup (Yandex Object Storage)
# -------------------------------------------------------------
S3_OFFSITE_ENDPOINT=https://storage.yandexcloud.net
S3_OFFSITE_REGION=ru-central1
S3_OFFSITE_BUCKET=2x2-shop-db-backups
S3_OFFSITE_ACCESS_KEY=YCAJEXXXXXXXXXXXXXXXX
S3_OFFSITE_SECRET_KEY=YCNxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
S3_OFFSITE_PREFIX=db/
```

---

## 3. Retention / lifecycle

Скрипт **не удаляет** старые объекты. Удалением занимается **bucket lifecycle**.

### Yandex Object Storage — через консоль

1. Открыть бакет → вкладка **Жизненный цикл** → **Создать правило**.
2. Параметры:
   - **Имя:** `delete-old-db-dumps`
   - **Префикс:** `db/`
   - **Срок жизни актуальной версии:** **30 дней** → удалить.
   - **Срок жизни неактуальных версий:** **7 дней** → удалить (если включено версионирование).
   - **Удалять незавершённые multipart-загрузки:** через **1 день**.
3. Сохранить.

### Альтернатива — через `mc` (один раз):

```bash
docker run --rm \
  -e MC_HOST_offsite="https://YCAJE...:YCN...@storage.yandexcloud.net" \
  minio/mc:latest \
  ilm rule add offsite/2x2-shop-db-backups \
    --expire-days 30 \
    --prefix "db/"
```

> Проверить, что правило применилось: `mc ilm rule ls offsite/2x2-shop-db-backups`.

---

## 4. Тестирование

### 4.1. Ручной запуск

```bash
ssh deploy@130.49.129.65

# (1) Сначала сделать локальный дамп, если его ещё нет
bash /home/deploy/2x2-shop/scripts/backup-db.sh

# (2) Залить в облако
bash /home/deploy/2x2-shop/scripts/backup-db-offsite.sh
```

Ожидаемый вывод:
```
[2026-04-24 12:00:00] Latest dump: /home/deploy/backups/db/db-20260424-030001.dump (12M / 12345678 bytes)
[2026-04-24 12:00:00] Uploading → 2x2-shop-db-backups/db/db-20260424-030001.dump
[2026-04-24 12:00:05] Upload OK: s3://2x2-shop-db-backups/db/db-20260424-030001.dump
[2026-04-24 12:00:05] Done.
```

### 4.2. Проверить, что файл действительно в бакете

В консоли Я.Облако открыть бакет → должен появиться объект `db/db-YYYYMMDD-HHMMSS.dump`.

Или из CLI:
```bash
docker run --rm \
  -e MC_HOST_offsite="https://${S3_OFFSITE_ACCESS_KEY}:${S3_OFFSITE_SECRET_KEY}@storage.yandexcloud.net" \
  minio/mc:latest \
  ls offsite/2x2-shop-db-backups/db/
```

### 4.3. Тест на ошибки

- **Проверить алерт в Telegram:** временно подставь невалидный `S3_OFFSITE_SECRET_KEY` и запусти скрипт. В лог пойдёт `mc cp завершился с кодом N`, а в Telegram придёт `[2x2-shop] OFFSITE BACKUP FAILED ...`.
- **Проверить защиту от пустого дампа:** `truncate -s 100 /home/deploy/backups/db/db-test.dump && bash backup-db-offsite.sh` (не забудь удалить тестовый файл потом).

### 4.4. Cron

```bash
crontab -e
```

Добавить (после существующего `backup-db.sh` в 03:00):
```cron
# Offsite copy of latest DB dump → Yandex Object Storage
0 4 * * * /home/deploy/2x2-shop/scripts/backup-db-offsite.sh >> /var/log/backup-offsite.log 2>&1
```

Проверить:
```bash
sudo touch /var/log/backup-offsite.log
sudo chown deploy:deploy /var/log/backup-offsite.log
crontab -l                 # видим обе задачи (backup-db и backup-db-offsite)
```

Через сутки заглянуть в `/var/log/backup-offsite.log` — должна быть одна успешная запись.

---

## 5. Восстановление из бэкапа

### 5.0. Восстановление из локального дампа (fallback-режим)

Самый частый сценарий — восстановиться из дампа в `/home/deploy/backups/db/` на том же VPS:

```bash
ssh deploy@130.49.129.65

# 1) Найти нужный дамп:
ls -lh /home/deploy/backups/db/ | tail -10

# 2) (опционально) остановить app, чтобы избежать write-конфликтов:
cd /home/deploy/2x2-shop
docker compose stop app

# 3) Восстановить (--clean --if-exists снесёт старые таблицы):
#    Имена POSTGRES_USER / POSTGRES_DB берутся из .env.
set -a; source .env; set +a
docker exec -i 2x2-postgres pg_restore \
  -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  --clean --if-exists --no-owner \
  < /home/deploy/backups/db/db-20260426-040000.dump

# 4) Поднять app:
docker compose start app
```

> Если дамп лежит на другом хосте (rsync-offsite, например `root@5.42.101.115:/var/backups/2x2/db/`) — сначала скопируй его на прод через `scp`, а дальше команды те же.

### 5.1. Скачать дамп

```bash
# На любой машине с docker (например, на новом VPS):
mkdir -p /tmp/restore && cd /tmp/restore

docker run --rm -v "$PWD":/restore \
  -e MC_HOST_offsite="https://${S3_OFFSITE_ACCESS_KEY}:${S3_OFFSITE_SECRET_KEY}@storage.yandexcloud.net" \
  minio/mc:latest \
  ls offsite/2x2-shop-db-backups/db/
# выбрать нужный файл, например db-20260420-030001.dump

docker run --rm -v "$PWD":/restore \
  -e MC_HOST_offsite="https://${S3_OFFSITE_ACCESS_KEY}:${S3_OFFSITE_SECRET_KEY}@storage.yandexcloud.net" \
  minio/mc:latest \
  cp offsite/2x2-shop-db-backups/db/db-20260420-030001.dump /restore/
```

### 5.2. Восстановить в работающий контейнер `2x2-postgres`

```bash
# Если БД активная — сначала остановить app:
docker compose stop app

# Восстановление (--clean --if-exists снесёт старые таблицы):
docker exec -i 2x2-postgres pg_restore \
  -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  --clean --if-exists --no-owner \
  < /tmp/restore/db-20260420-030001.dump

docker compose start app
```

### 5.3. Восстановить на голый VPS

1. Поставить docker + docker compose.
2. `git clone` репо в `/home/deploy/2x2-shop`.
3. Восстановить `.env` из менеджера паролей.
4. `docker compose up -d postgres`.
5. Выполнить п. 5.2.
6. Применить актуальные миграции на всякий случай: `bash scripts/apply-migrations.sh`.
7. `docker compose up -d`.

---

## 6. Альтернативы

### 6.1. Selectel Object Storage (РФ, ~70 ₽/мес)

`.env`:
```env
S3_OFFSITE_ENDPOINT=https://s3.storage.selcloud.ru
S3_OFFSITE_REGION=ru-1
S3_OFFSITE_BUCKET=2x2-shop-backups
S3_OFFSITE_ACCESS_KEY=<from Selectel>
S3_OFFSITE_SECRET_KEY=<from Selectel>
```
Скрипт `backup-db-offsite.sh` работает без изменений (S3v4-совместимо).

### 6.2. Backblaze B2 (~$5 за 1 ТБ/мес, США)

Минусы: трансграничный трафик, медленнее, оплата картой международного банка.

`.env`:
```env
S3_OFFSITE_ENDPOINT=https://s3.us-west-004.backblazeb2.com
S3_OFFSITE_REGION=us-west-004
S3_OFFSITE_BUCKET=2x2-shop-backups
S3_OFFSITE_ACCESS_KEY=<application keyID>
S3_OFFSITE_SECRET_KEY=<application key>
```

### 6.3. AWS S3 (валюта USD)

`S3_OFFSITE_ENDPOINT=https://s3.eu-north-1.amazonaws.com` и т.п. Дороже Я.Облако, но есть нативный S3 lifecycle и Glacier.

### 6.4. Простой `rsync` на второй VPS / NAS

Если ни одно из облаков не подходит — арендуй второй маленький VPS (или используй домашний NAS с проброшенным портом):

```bash
# /home/deploy/2x2-shop/scripts/backup-db-rsync.sh (НЕ создан в репо)
rsync -av --delete \
  /home/deploy/backups/db/ \
  backup-user@backup-host.example.com:/srv/2x2-backups/db/
```
Минус: данные хранятся в одном географическом регионе, нет shared lifecycle, нужен SSH-ключ для backup-user.

### 6.5. Сравнение

| Провайдер | Цена/мес для ~10 ГБ | Регион | Card | Lifecycle | Версионирование |
|-----------|---------------------|--------|------|-----------|-----------------|
| Yandex Object Storage | ~50 ₽ | ru-central1 | РФ | да | да |
| Selectel | ~70 ₽ | ru-1 / ru-7 | РФ | да | да |
| Backblaze B2 | ~$0.06 (~6 ₽) | us-west | INT | да | да |
| AWS S3 | ~$0.23 (~22 ₽) | любой | INT | да | да |
| Второй VPS + rsync | от 200 ₽ | любой | любая | manual | manual |

> Рекомендация: **Yandex Object Storage** — самый простой путь для российского заказчика, оплата с того же кабинета, поддержка в РФ.

---

## 7. Безопасность

- `.env` с `S3_OFFSITE_SECRET_KEY` лежит на VPS с правами `600` (`chmod 600 /home/deploy/2x2-shop/.env`). Проверить:
  ```bash
  stat -c '%a %n' /home/deploy/2x2-shop/.env
  ```
- Сервисный аккаунт имеет роль **`storage.uploader`**, а не `storage.admin` — даже при утечке ключа атакующий не сможет грохнуть весь бакет.
- В бакете включено **версионирование** + **lifecycle 30 дней** → атакующий не сможет уничтожить историю одной командой `mc rm`.
- Дампы НЕ зашифрованы клиент-сайд (полагаемся на SSE-S3 и приватный bucket). Если надо поднять уровень — оборачивать дамп в `gpg --symmetric` перед загрузкой; ключ хранить отдельно (не на VPS).
