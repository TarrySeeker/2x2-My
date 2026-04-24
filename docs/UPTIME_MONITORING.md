# Uptime-мониторинг

> Цель — мгновенно узнавать, если `https://erfgv.website` упал (контейнер свалился, истёк сертификат, провайдер сдох, забыли продлить домен и т.п.).

Есть три уровня:

1. **UptimeRobot** (бесплатно, основной) — внешний пинг каждые 5 минут, email + Telegram-алерты, public status page.
2. **Self-hosted скрипт** `scripts/health-check.sh` (запасной) — cron на стороннем хосте, шлёт прямо в Telegram. Защита от ситуации «UptimeRobot не уведомил».
3. **Internal `/api/health`** (уже есть) — endpoint, который и UptimeRobot, и наш скрипт дёргают.

---

## 1. Что мониторить

| URL | Что ждём | Зачем |
|-----|----------|-------|
| `https://erfgv.website/` | HTTP 200 + содержит «Рекламная компания» | Главная отвечает, HTML рендерится, Next жив |
| `https://erfgv.website/api/health` | HTTP 200 + JSON `"status":"healthy"` | Postgres достижим (SELECT 1) |
| `https://erfgv.website/admin/login` | HTTP 200 | Админка отдаётся |
| `https://erfgv.website/sitemap.xml` | HTTP 200 + `<urlset` | Сайтмап генерируется (важно для SEO) |
| TLS-сертификат `erfgv.website` | Срок > 14 дней | Caddy обычно auto-renew, но мониторинг = страховка |

---

## 2. UptimeRobot — настройка

### 2.1. Регистрация

1. Открыть https://uptimerobot.com/signUp
2. Зарегистрироваться (email + пароль). Бесплатный план = до **50 monitors**, интервал **5 минут**.
3. Подтвердить email.

### 2.2. Добавить мониторы

В **Dashboard → + Add New Monitor** для каждой строки таблицы выше:

#### Monitor #1 — главная (с проверкой ключевого слова)

- **Monitor Type:** `HTTP(s) - Keyword`
- **Friendly Name:** `2x2 Home`
- **URL:** `https://erfgv.website/`
- **Keyword Type:** `exists`
- **Keyword Value:** `Рекламная компания`
- **Monitoring Interval:** `5 minutes`
- **HTTP Method:** `GET`
- **Custom HTTP Headers:** *(пусто)*
- Сохранить.

#### Monitor #2 — health endpoint

- **Monitor Type:** `HTTP(s) - Keyword`
- **Friendly Name:** `2x2 API Health`
- **URL:** `https://erfgv.website/api/health`
- **Keyword Type:** `exists`
- **Keyword Value:** `"status":"healthy"`
- **Monitoring Interval:** `5 minutes`

#### Monitor #3 — админка

- **Monitor Type:** `HTTP(s)`
- **Friendly Name:** `2x2 Admin Login`
- **URL:** `https://erfgv.website/admin/login`
- **Monitoring Interval:** `5 minutes`

#### Monitor #4 — sitemap (необязательно, но дешёвая страховка SEO)

- **Monitor Type:** `HTTP(s) - Keyword`
- **Friendly Name:** `2x2 Sitemap`
- **URL:** `https://erfgv.website/sitemap.xml`
- **Keyword Type:** `exists`
- **Keyword Value:** `<urlset`
- **Monitoring Interval:** `5 minutes`

#### Monitor #5 — SSL expiry

UptimeRobot бесплатно проверяет срок сертификата у HTTPS-мониторов и шлёт алерт за **30/14/7/3/1 день** до истечения.
Включается через **My Settings → SSL Expiration Notifications → ON**.

### 2.3. Настройка алертов

**Dashboard → My Settings → Alert Contacts → + Add Alert Contact**.

Минимум — два канала:

#### Email

- **Alert Contact Type:** `E-mail`
- **Friendly Name:** `Owner Email`
- **E-mail:** `<email владельца>`
- Подтвердить (приходит письмо с ссылкой).

#### Telegram

1. В Telegram написать боту [@UptimeRobotBot](https://t.me/UptimeRobotBot) → команда `/start`.
2. Бот выдаст числовой `Chat ID`.
3. В UptimeRobot:
   - **Alert Contact Type:** `Telegram`
   - **Chat ID:** *(вставить из шага 2)*
   - Подтвердить — бот пришлёт «Verified».
4. (Опционально) добавить групповой чат: добавить `@UptimeRobotBot` в группу, вызвать там `/chatid`, использовать выданный отрицательный ID.

#### Привязка контактов к мониторам

Открыть каждый из созданных Monitor → **Edit** → блок **Select Alert Contacts To Notify** → отметить **Email** и **Telegram** → Save.

> Дополнительно: **Notification Threshold** = `1` (присылать сразу, не ждать N инцидентов).
> **Re-Notification Interval** = `0` (не спамить — один down → одно сообщение).

### 2.4. Public status page

**Dashboard → Status Pages → + Add Status Page**.

- **Friendly Name:** `2x2 Status`
- **Custom Domain:** *(можно пропустить — будет URL вида `https://stats.uptimerobot.com/XXXXXXXX`)*
- **Monitors:** выбрать `2x2 Home`, `2x2 API Health`, `2x2 Admin Login`.
- **Password Protected:** off (если нужна публичная), либо on (если только для команды).
- Сохранить → скопировать URL и **передать пользователю**.

### 2.5. Стоимость

- Free plan: 50 мониторов × 5-минутный интервал = бесплатно навсегда.
- Pro ($7/мес): 1-минутный интервал, расширенная история, SMS. **Не нужен** в нашем случае.

---

## 3. Запасной канал — `scripts/health-check.sh`

UptimeRobot — внешний сервис. Если он сам упадёт или с ним что-то случится, мы об этом не узнаем. Поэтому держим вторую независимую проверку.

### 3.1. Где запускать

**НЕ на том же VPS**, что и сайт. Подойдёт:

- любой второй маленький VPS / VDS (Timeweb 1 vCPU + 1 ГБ RAM = ~150 ₽/мес);
- домашний Raspberry Pi с интернетом 24/7;
- бесплатный always-free тир Oracle Cloud / GitHub Actions schedule (см. ниже).

### 3.2. Установка на сторонний хост

```bash
# 1. Скопировать скрипт
sudo mkdir -p /opt/scripts
sudo curl -fsSL \
  https://raw.githubusercontent.com/<owner>/<repo>/main/scripts/health-check.sh \
  -o /opt/scripts/health-check.sh
# или scp с локалки:
# scp scripts/health-check.sh user@monitor-host:/opt/scripts/health-check.sh

sudo chmod +x /opt/scripts/health-check.sh

# 2. Положить env-переменные в /etc/default/2x2-health
sudo tee /etc/default/2x2-health >/dev/null <<'EOF'
TELEGRAM_BOT_TOKEN=123456:ABCdef...
TELEGRAM_CHAT_ID=-1001234567890
HEALTH_URL=https://erfgv.website/api/health
EOF
sudo chmod 600 /etc/default/2x2-health

# 3. Создать лог
sudo touch /var/log/2x2-health.log
sudo chown $USER:$USER /var/log/2x2-health.log

# 4. cron каждые 5 минут
crontab -e
```

В crontab:
```cron
*/5 * * * * set -a; . /etc/default/2x2-health; set +a; /opt/scripts/health-check.sh >> /var/log/2x2-health.log 2>&1
```

### 3.3. Как создать Telegram-бота (если ещё нет)

1. В Telegram → [@BotFather](https://t.me/BotFather) → `/newbot`.
2. Указать имя (например, `2x2 Monitor`) и username (например, `twox2_monitor_bot`).
3. BotFather выдаст токен вида `123456:ABCdef...` — это `TELEGRAM_BOT_TOKEN`.
4. Найти бота в поиске → нажать **Start**.
5. Узнать `chat_id`:
   - Для личного чата: открыть `https://api.telegram.org/bot<TOKEN>/getUpdates` после `/start`, найти `"chat":{"id":12345...}`.
   - Для группы: добавить бота в группу, написать любое сообщение, тот же `getUpdates`. ID групп начинается с `-100`.

### 3.4. Как работает дедупликация

- Скрипт хранит последний known статус в `/tmp/2x2-health-state` (`up` / `down`).
- Алерт `DOWN` шлётся **один раз** при переходе `up → down`.
- Алерт `RECOVERED` шлётся **один раз** при переходе `down → up`.
- Если перезагрузить сторонний хост — `/tmp` очистится и при следующем запуске статус будет `unknown` → если всё ок, ничего не пришлёт; если down — пришлёт алерт.

### 3.5. Ручной тест

```bash
# Проверка happy path (если сайт жив, ничего в Telegram не придёт):
TELEGRAM_BOT_TOKEN=xxx TELEGRAM_CHAT_ID=yyy \
  HEALTH_URL=https://erfgv.website/api/health \
  STATE_FILE=/tmp/test-state \
  bash scripts/health-check.sh
echo $?   # должно быть 0

# Симуляция падения — указать несуществующий URL:
rm -f /tmp/test-state
TELEGRAM_BOT_TOKEN=xxx TELEGRAM_CHAT_ID=yyy \
  HEALTH_URL=https://erfgv.website/api/does-not-exist \
  STATE_FILE=/tmp/test-state \
  bash scripts/health-check.sh
echo $?   # должно быть 1, в Telegram пришёл «2x2 DOWN»

# Симуляция восстановления:
TELEGRAM_BOT_TOKEN=xxx TELEGRAM_CHAT_ID=yyy \
  HEALTH_URL=https://erfgv.website/api/health \
  STATE_FILE=/tmp/test-state \
  bash scripts/health-check.sh
# в Telegram пришёл «2x2 RECOVERED»

rm -f /tmp/test-state
```

---

## 4. Альтернативы

### 4.1. Hetrix Tools (расширенный free-tier)

- 15 уптайм-мониторов бесплатно, 1-минутный интервал.
- Поддержка blacklist-мониторинга, SSL, домена.
- Telegram, Slack, webhook.

Ссылка: https://hetrixtools.com/uptime-monitoring

Подходит как замена UptimeRobot, если нужен более частый интервал бесплатно.

### 4.2. Self-hosted Uptime Kuma

- Open-source, ставится в один docker run.
- Подходит, если есть свободный VPS под мониторинг и не хочется зависеть от внешних сервисов.

```bash
docker run -d --restart=always \
  -p 3001:3001 \
  -v uptime-kuma:/app/data \
  --name uptime-kuma \
  louislam/uptime-kuma:1
```
Открыть `http://<monitor-host>:3001`, создать админа, добавить мониторы и Telegram-нотификации.

> Размещать **на другом сервере**, не на самом VPS с сайтом.

### 4.3. GitHub Actions (cron)

Бесплатный вариант без второго VPS — schedule-workflow в GitHub:

```yaml
# .github/workflows/health-check.yml
name: health-check
on:
  schedule:
    - cron: '*/10 * * * *'   # минимум 5 мин у GH, 10 — стабильнее
  workflow_dispatch:
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: bash scripts/health-check.sh
        env:
          HEALTH_URL: https://erfgv.website/api/health
          TELEGRAM_BOT_TOKEN: ${{ secrets.TELEGRAM_BOT_TOKEN }}
          TELEGRAM_CHAT_ID:   ${{ secrets.TELEGRAM_CHAT_ID }}
          STATE_FILE: /tmp/2x2-health-state
```

⚠ Минус: между runner-инвокациями `/tmp` очищается → дедупликация не сработает (будет алерт каждые 10 минут, пока down). Можно решить кэшем actions/cache, но для критичных алертов это и хорошо — не пропустишь.

### 4.4. Better Stack (бывший Better Uptime)

- Free: 10 мониторов, 3-минутный интервал.
- Очень красивые status-page, on-call расписание, инциденты.
- Платный от $24/мес.

### 4.5. Сравнение

| Решение | Цена | Интервал | Channels | Status page | Сложность |
|---------|------|----------|----------|-------------|-----------|
| UptimeRobot Free | 0 | 5 мин | Email/Telegram/Slack | да | низкая |
| Hetrix Tools | 0 | 1 мин (15 мониторов) | Email/Telegram/Webhook | да | низкая |
| `scripts/health-check.sh` + cron | 0–150 ₽ | любой | Telegram | нет | средняя |
| Uptime Kuma (self-host) | ~150 ₽/мес VPS | 20 сек+ | 90+ интеграций | да | средняя |
| GitHub Actions schedule | 0 | 5–10 мин | Telegram | нет | низкая |
| Better Stack | 0 / $24+ | 3 мин / 30 сек | Email/Phone/Slack/PD | да | низкая |

> **Рекомендация:** UptimeRobot (основной) + `scripts/health-check.sh` на любой второй машине (запасной). Итого 0 ₽/мес, два независимых канала, status-page есть.

---

## 5. Чек-лист после настройки

- [ ] UptimeRobot аккаунт создан, email подтверждён.
- [ ] Добавлены мониторы: Home, API Health, Admin, Sitemap.
- [ ] Email + Telegram alert contacts привязаны ко всем мониторам.
- [ ] Все мониторы показывают статус `Up` (зелёный).
- [ ] Status page создан, ссылка сохранена в `agents/handoffs/USER-ACTIONS.md`.
- [ ] (опционально) `scripts/health-check.sh` поставлен на сторонний хост, cron каждые 5 минут.
- [ ] Тестовое падение — намеренно остановить контейнер `2x2-app` на 6 минут → пришёл алерт → запустить обратно → пришёл RECOVERED.
- [ ] SSL Expiration уведомления включены в UptimeRobot.
