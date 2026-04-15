# 🚀 DEPLOY-GUIDE — 2x2-shop

Пошаговая инструкция деплоя проекта «2х2» (Next.js 16 + Supabase + CDEK) на Timeweb VPS.

> **Актуально:** Этап 1 (Фундамент). Для Этапа 2+ (каталог, корзина, оплата) см. раздел «Обновление после релиза».

---

## 0. TL;DR (если уже знаешь — быстрый чек-лист)

```bash
# На VPS (от root)
bash provision-vps.sh

# От deploy
cd /var/www/2x2-shop
git clone <repo> .
cp .env.example .env.production
$EDITOR .env.production        # заполнить реальными значениями
pnpm install --frozen-lockfile
pnpm build
pm2 start ecosystem.config.cjs --env production
pm2 save

# Nginx + TLS
sudo cp deploy/nginx/limits.conf   /etc/nginx/conf.d/10-limits.conf
sudo cp deploy/nginx/2x2-shop.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/2x2-shop.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d 2x2hmao.ru -d www.2x2hmao.ru

# Smoke
curl -fsS https://2x2hmao.ru/api/health
```

---

## 1. Требования

| Компонент      | Версия                  | Комментарий                             |
|----------------|-------------------------|-----------------------------------------|
| Timeweb VPS    | Ubuntu 22.04 / 24.04    | Минимум: 2 vCPU, 2 ГБ RAM, 20 ГБ SSD    |
| Node.js        | 20 LTS                  | Ставится через NodeSource (см. provision) |
| pnpm           | 9.x                     | `npm i -g pnpm@9`                       |
| PM2            | 5.x                     | `npm i -g pm2`                          |
| Nginx          | 1.24+                   | `apt install nginx`                     |
| certbot        | —                       | `apt install certbot python3-certbot-nginx` |
| Supabase       | Cloud (free/pro)        | База + Storage, внешний сервис          |
| Домен          | —                       | A-запись на IP VPS, www → CNAME         |

---

## 2. Первичная настройка VPS

1. Получи от Timeweb root-доступ по SSH.
2. Скопируй на сервер `deploy/scripts/provision-vps.sh` и запусти от root:
   ```bash
   scp deploy/scripts/provision-vps.sh root@<IP>:/root/
   ssh root@<IP>
   bash /root/provision-vps.sh
   ```
   Скрипт установит Node 20, pnpm, PM2, Nginx, certbot, создаст пользователя `deploy`, откроет firewall, выключит root-login, поставит swap и timezone Asia/Yekaterinburg.
3. Добавь публичный SSH-ключ клиента (или GitHub Actions deploy-key) в `/home/deploy/.ssh/authorized_keys` (mode 600).
4. Проверь: `ssh deploy@<IP>` → должно залогинить по ключу.

---

## 3. Клонирование репозитория

```bash
ssh deploy@<IP>
sudo mkdir -p /var/www/2x2-shop && sudo chown deploy:deploy /var/www/2x2-shop
cd /var/www/2x2-shop
git clone https://github.com/<org>/2x2-shop.git .
```

Если репозиторий приватный — добавь deploy-key в GitHub:
1. На VPS: `ssh-keygen -t ed25519 -f ~/.ssh/github_deploy -N ""`
2. Показать pub-ключ: `cat ~/.ssh/github_deploy.pub`
3. В GitHub → Settings → Deploy keys → Add key (read-only)
4. В `~/.ssh/config`:
   ```
   Host github-2x2
     HostName github.com
     User git
     IdentityFile ~/.ssh/github_deploy
   ```
5. `git clone git@github-2x2:<org>/2x2-shop.git .`

---

## 4. Переменные окружения

1. `cp .env.example .env.production`
2. `chmod 600 .env.production && chown deploy:deploy .env.production`
3. Заполни реальные значения по шпаргалке `docs/env-vars.md`.

**Критичные для прода:**
- `NEXT_PUBLIC_SITE_URL=https://2x2hmao.ru`
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`
- `CDEK_API_URL=https://api.cdek.ru/v2` (прод, не edu!)
- `CDEK_CLIENT_ID` / `CDEK_CLIENT_SECRET`
- `CDEK_PAY_SHOP_LOGIN` / `CDEK_PAY_SECRET_KEY` (когда появятся)
- `NEXT_PUBLIC_YM_ID`
- `NEXT_PUBLIC_EMAILJS_*` (если форма контактов через EmailJS до Supabase)

> ⚠ **Никогда** не коммить `.env.production` в git.
> Ротация ключей — см. `docs/runbook.md` → «Инцидент: утечка ключей».

---

## 5. Сборка и запуск

```bash
cd /var/www/2x2-shop
pnpm install --frozen-lockfile
pnpm typecheck      # должен пройти без ошибок
pnpm test           # 22+ unit тестов
pnpm build          # .next/ собран
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup         # покажет команду sudo — выполнить один раз
pm2 status
```

Проверить локально: `curl http://127.0.0.1:3000/api/health` → `{"status":"healthy",...}`

---

## 6. Nginx + TLS

```bash
# Rate-limit зоны в http{}
sudo cp deploy/nginx/limits.conf   /etc/nginx/conf.d/10-limits.conf

# Основной server-блок
sudo cp deploy/nginx/2x2-shop.conf /etc/nginx/sites-available/
sudo ln -sf /etc/nginx/sites-available/2x2-shop.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

# Let's Encrypt
sudo certbot --nginx -d 2x2hmao.ru -d www.2x2hmao.ru --agree-tos --non-interactive -m sj_alex86@mail.ru
sudo systemctl enable --now certbot.timer   # auto-renewal
```

**Smoke-тест прод:**
```bash
curl -I https://2x2hmao.ru            # 200 OK
curl https://2x2hmao.ru/api/health    # {"status":"healthy",...}
curl https://2x2hmao.ru/robots.txt    # корректный robots
curl https://2x2hmao.ru/sitemap.xml   # XML c ≥15 URL
```

В браузере проверить: `https://2x2hmao.ru/` → загрузка <2c, в DevTools нет ошибок, security headers видны.

---

## 7. CI/CD через GitHub Actions

1. В GitHub → Settings → Secrets and variables → Actions добавить:
   - `DEPLOY_HOST` — IP или домен VPS
   - `DEPLOY_USER` — `deploy`
   - `DEPLOY_PORT` — `22`
   - `DEPLOY_SSH_KEY` — приватный ключ, соответствующий `~/.ssh/authorized_keys` на VPS
   - `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` (опционально)
2. В Variables: `NOTIFY_TELEGRAM=true` (если нужны нотификации), `PROD_URL=https://2x2hmao.ru`
3. Пуш в `main` → автоматически запустится `.github/workflows/deploy-vps.yml`.

Pull-request flow:
- `ci.yml` — lint + typecheck + unit + build + Playwright e2e — на PR и push.
- `lighthouse.yml` — LHCI — только на PR (Performance ≥ 90, a11y ≥ 95, Best Practices/SEO = 100).
- `deploy-vps.yml` — деплой — только на push в main.

---

## 8. Мониторинг

| Что                    | Инструмент               | Где смотреть                                   |
|------------------------|--------------------------|------------------------------------------------|
| Uptime                 | Uptime Kuma (самохост) / Better Stack | `/`, `/api/health`                   |
| Ошибки фронт/бэк       | Sentry (когда подключат) | `SENTRY_DSN` в .env.production                 |
| PM2 процессы           | `pm2 status`, `pm2 monit`| SSH                                            |
| Логи приложения        | `/var/log/2x2-shop/*.log`| `pm2 logs 2x2-shop --lines 200`                |
| Логи Nginx             | `/var/log/nginx/*.log`   | `tail -f /var/log/nginx/access.log`            |
| Диск, память, CPU      | `htop`, `df -h`          | SSH                                            |
| Бэкапы                 | `/var/backups/2x2-shop/` | cron, см. `backup-restore.md`                  |
| Certbot renewal        | `systemctl status certbot.timer` | SSH                                    |

Алерты в Telegram — см. `runbook.md` раздел «Настройка алертов».

---

## 9. Обновление проекта (hot-reload)

### Через CI/CD (рекомендовано)
`git push origin main` → GitHub Actions сам задеплоит, проверит health, нотифицирует в Telegram.

### Ручной деплой
```bash
ssh deploy@<IP>
cd /var/www/2x2-shop
bash deploy/scripts/deploy.sh
```

Скрипт: `git pull` → `pnpm install` → `pnpm build` → `pm2 reload` → health-check.

### Откат
```bash
cd /var/www/2x2-shop
git log --oneline -20                       # найти нужный sha
git reset --hard <sha>
pnpm install --frozen-lockfile && pnpm build
pm2 reload ecosystem.config.cjs --update-env
```

---

## 10. Чек-лист перед публичным релизом

- [ ] `.env.production` заполнен боевыми ключами (Supabase, CDEK, CDEK Pay, YM)
- [ ] `pnpm build` проходит на VPS
- [ ] `pm2 status` → `online`, ошибок нет
- [ ] `curl https://2x2hmao.ru/api/health` → `{"status":"healthy"}`
- [ ] Lighthouse на проде: Performance ≥ 90, a11y ≥ 95, Best Practices = 100, SEO = 100
- [ ] HTTPS, HSTS, security headers (проверка: https://securityheaders.com/)
- [ ] TLS: https://www.ssllabs.com/ssltest/analyze.html?d=2x2hmao.ru — A или A+
- [ ] Robots.txt и sitemap.xml отдают правильное содержимое
- [ ] JSON-LD: проверить через https://search.google.com/test/rich-results
- [ ] Я.Метрика установлена и принимает события
- [ ] Я.Вебмастер и Google Search Console: добавлен домен, отправлен sitemap
- [ ] Webhook CDEK Pay (когда будут ключи): проверен реальным запросом
- [ ] CDEK API: `/api/cdek/calculate` отдаёт не-моковые тарифы
- [ ] Бэкапы настроены в cron (`docs/backup-restore.md`)
- [ ] Uptime-мониторинг настроен
- [ ] Документация `runbook.md` прочитана владельцем

---

## 11. Альтернатива: Docker Compose

Если пользователь предпочитает Docker:
```bash
cd /var/www/2x2-shop/deploy/docker
docker compose --env-file /var/www/2x2-shop/.env.production up -d --build
```

Docker-образ есть (`Dockerfile`), compose в `deploy/docker/docker-compose.yml`. PM2-ветка при этом не запускается — nginx и Next.js оба в контейнерах.

---

## 12. Полезные ссылки

- Supabase dashboard: https://supabase.com/dashboard/project/_
- CDEK ЛК: https://lk.cdek.ru/
- CDEK Pay docs: https://docs.cdekpay.ru/
- Timeweb панель: https://timeweb.com/ru/my/
- Я.Метрика: https://metrika.yandex.ru/
- Я.Вебмастер: https://webmaster.yandex.ru/
- `docs/runbook.md` — типовые инциденты
- `docs/env-vars.md` — все переменные
- `docs/backup-restore.md` — бэкапы
- `docs/SUPABASE-SETUP.md` — первичная настройка БД
