# 🧯 Runbook — 2x2-shop

Что делать, если что-то упало. Каждый сценарий — симптом → диагностика → фикс → как предотвратить.

---

## Быстрые команды

```bash
# SSH на прод
ssh deploy@<IP>

# Статус PM2
pm2 status
pm2 logs 2x2-shop --lines 200 --nostream
pm2 monit

# Nginx
sudo systemctl status nginx
sudo nginx -t
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Ресурсы
htop
df -h
free -h

# Health
curl -fsS https://2x2hmao.ru/api/health
curl -I https://2x2hmao.ru/
```

---

## Инцидент 1: сайт недоступен, 502/504 от Nginx

**Симптом:** `curl https://2x2hmao.ru/` → `502 Bad Gateway` или `504 Gateway Timeout`.

**Диагностика:**
```bash
pm2 status                    # какой статус у 2x2-shop?
pm2 logs 2x2-shop --lines 100 # последние ошибки
curl http://127.0.0.1:3000/api/health   # локально работает?
```

**Причины и фиксы:**
1. **PM2 упал / errored:**
   ```bash
   pm2 restart 2x2-shop
   pm2 logs 2x2-shop --err --lines 200
   ```
   Если после рестарта снова падает — см. `Инцидент 3`.

2. **Out of memory:**
   ```bash
   dmesg | tail -50                  # ищи "Out of memory: Killed process"
   free -h
   ```
   Увеличь swap (`/swapfile`) или уменьши `instances` в `ecosystem.config.cjs`.

3. **Nginx не видит апстрим:**
   ```bash
   sudo tail -100 /var/log/nginx/error.log
   # часто: "upstream prematurely closed connection"
   sudo systemctl reload nginx
   ```

**Предотвратить:** Uptime Kuma проверяет `/api/health` каждую минуту, алерт в Telegram.

---

## Инцидент 2: сайт отвечает медленно (>3c)

**Диагностика:**
```bash
htop                                       # CPU/RAM
pm2 monit
curl -w "@-" -o /dev/null -s https://2x2hmao.ru/ <<'EOF'
    time_namelookup:  %{time_namelookup}\n
       time_connect:  %{time_connect}\n
    time_appconnect:  %{time_appconnect}\n
   time_pretransfer:  %{time_pretransfer}\n
     time_starttransfer:  %{time_starttransfer}\n
                        ----------\n
          time_total:  %{time_total}\n
EOF
```

**Причины:**
- **Supabase долго отвечает** — проверь Supabase dashboard → Logs, или перейди на более высокий план.
- **CDEK API медленный** — добавь таймаут в `lib/cdek/client.ts` и graceful fallback.
- **Холодный кэш Next.js** — `pm2 reload` прогревает, либо настрой `ISR` (Этап 2+).

---

## Инцидент 3: сборка падает (`pnpm build` или CI)

**Симптом:** `ELIFECYCLE Command failed with exit code 1`.

**Диагностика:**
```bash
cd /var/www/2x2-shop
pnpm typecheck        # TS-ошибки?
pnpm lint             # ESLint-ошибки?
pnpm build 2>&1 | tee /tmp/build.log
```

**Типовые причины:**
1. **Новая env-переменная в коде, нет в .env.production** — ошибка `process.env.FOO is undefined` на build-time или на старте. Фикс: добавить в `.env.production` и в `docs/env-vars.md`.
2. **Несовместимая версия Node** — `node -v` должно быть 20.x. Если нет: `nvm install 20 && nvm use 20`.
3. **Перенаправления зависимостей (peer dep warnings) в pnpm** — обычно не ломают, но если ломают: `pnpm install --strict-peer-dependencies=false`.
4. **OOM при сборке** (`JavaScript heap out of memory`):
   ```bash
   NODE_OPTIONS="--max-old-space-size=2048" pnpm build
   ```

**Откат на последнюю рабочую версию:**
```bash
git log --oneline -20
git reset --hard <last-good-sha>
pnpm install --frozen-lockfile && pnpm build && pm2 reload 2x2-shop
```

---

## Инцидент 4: CDEK API не отвечает

**Симптом:** в UI калькулятор доставки падает, в логах `CdekError: 401` или `ECONNREFUSED`.

**Диагностика:**
```bash
curl -v https://api.cdek.ru/v2/oauth/token \
  -d "grant_type=client_credentials" \
  -d "client_id=$CDEK_CLIENT_ID" \
  -d "client_secret=$CDEK_CLIENT_SECRET"
```

**Фиксы:**
- **401 Unauthorized** — сбросить кэш токена (перезапустить PM2), перепроверить `CDEK_CLIENT_ID`/`CDEK_CLIENT_SECRET`, ротировать в ЛК CDEK.
- **429 Too Many Requests** — исчерпана квота; включи более агрессивный rate-limit в `lib/rate-limit.ts` или разнеси запросы.
- **5xx от CDEK** — временный сбой CDEK; показывай пользователю fallback «Уточните доставку у менеджера» + кнопку «Перезвонить».

---

## Инцидент 5: Webhook CDEK Pay не приходит / не обрабатывается

**Симптом:** пользователь оплатил, но статус заказа остался `awaiting_payment`.

**Диагностика:**
```bash
# Последние обращения к webhook-эндпоинту
sudo grep "/api/cdek/webhook" /var/log/nginx/access.log | tail -20

# Логи приложения
pm2 logs 2x2-shop --lines 300 | grep -i webhook
```

**Фиксы:**
1. **CDEK Pay не дошёл до VPS** — проверь в ЛК CDEK Pay → Логи вебхуков. Причина обычно: неверный URL в настройках магазина.
2. **Подпись не совпадает** — `CDEK_PAY_SECRET_KEY` в `.env.production` отличается от того, что в ЛК CDEK. Сверить.
3. **IP не в whitelist** — добавить в `CDEK_WEBHOOK_ALLOWED_IPS` или в Nginx `allow` в `/api/cdek/webhook`.
4. **Ручная обработка:** в админке есть action «Подтвердить оплату вручную» (Этап 5+).

---

## Инцидент 6: Supabase выдаёт RLS-ошибки на проде

**Симптом:** `new row violates row-level security policy` в логах.

**Фиксы:**
- Админ-операции должны идти через **service_role_key** (см. `lib/supabase/admin.ts`). Не через anon.
- Проверить миграции RLS применены: Supabase Dashboard → SQL Editor → `SELECT * FROM pg_policies WHERE tablename = '...'`.
- Если клиент (анон) не имеет права на операцию — это корректное поведение; фикс на стороне приложения (использовать server action с admin-клиентом).

---

## Инцидент 7: SSL-сертификат скоро протухнет / уже протух

**Симптом:** браузер показывает предупреждение, `openssl s_client -connect 2x2hmao.ru:443` показывает `notAfter` близко.

**Фикс:**
```bash
sudo certbot renew --force-renewal
sudo systemctl reload nginx
sudo systemctl status certbot.timer    # должна быть enabled
```

Auto-renewal: `certbot.timer` запускается дважды в день, обновляет за 30 дней до истечения. Если не работает — включи: `sudo systemctl enable --now certbot.timer`.

---

## Инцидент 8: Диск заполнен

**Симптом:** `df -h` показывает 100% на `/`.

**Диагностика:**
```bash
sudo du -h -d 2 / 2>/dev/null | sort -hr | head -20
sudo du -sh /var/log /var/backups /var/www /home
```

**Типовые виновники:**
- `/var/log/nginx/access.log` — ротация через logrotate должна работать (проверить `/etc/logrotate.d/nginx`).
- `/var/log/2x2-shop/*.log` — ротация через `/etc/logrotate.d/2x2-shop` (создан provision-скриптом).
- `/var/backups/2x2-shop/` — старые бэкапы; ротация через `backup.sh` (>14 дней удаляются).
- `/root/.npm`, `/home/deploy/.pnpm-store` — очистка: `pnpm store prune`, `pm2 flush`.

**Срочно:**
```bash
sudo find /var/log -type f -name '*.log' -size +100M -exec truncate -s 0 {} \;
pm2 flush
```

---

## Инцидент 9: Утечка `.env.production` / ключей

**Немедленно:**
1. **Supabase service role** — Dashboard → Settings → API → Reset JWT secret.
2. **CDEK OAuth** — сгенерировать новый секрет в ЛК CDEK.
3. **CDEK Pay secret key** — в ЛК CDEK Pay.
4. **Telegram bot** — `/revoke` у BotFather, получить новый токен.
5. Обновить `.env.production` на VPS (`chmod 600`).
6. `pm2 reload ecosystem.config.cjs --update-env`.
7. **Запушить из git-истории** если ключ попал в коммит: `git filter-repo --path .env.production --invert-paths`, force-push, уведомить всех коллабораторов. (Лучше так никогда не делать — не коммитить `.env*`.)

**Предотвратить:** `.gitignore` должен включать `.env*` кроме `.env.example`. Pre-commit hook с `git secrets` на локальной машине.

---

## Инцидент 10: Я.Метрика / GA4 не считают события

**Диагностика:**
```bash
# В браузере DevTools → Console:
window.ym            # должен быть function
window.dataLayer     # должен быть array

# Проверить env:
pm2 env 0 | grep -i '(YM|GA4)'
```

**Фиксы:**
- **Env-ключи не попали в бандл** — перезапустить `pnpm build && pm2 reload`. Переменные `NEXT_PUBLIC_*` читаются на build-time.
- **ID невалидный** — `AnalyticsScripts` отбрасывает невалидные (regex). Проверь формат: `NEXT_PUBLIC_YM_ID` — только цифры, `NEXT_PUBLIC_GA4_ID` — `G-XXXXXX`.
- **Блокировщики** — тест из инкогнито без uBlock/AdGuard.

---

## Настройка алертов (рекомендация)

**Uptime Kuma на отдельном VPS (или на том же):**
```bash
docker run -d --restart=always -p 3001:3001 \
  -v /var/uptime-kuma:/app/data \
  --name uptime-kuma louislam/uptime-kuma:1
```
Добавить монитор: `https://2x2hmao.ru/api/health`, интервал 60с, ключевое слово `"ok"`, нотификация в Telegram.

**Монитор VPS ресурсов через Netdata:**
```bash
bash <(curl -Ss https://my-netdata.io/kickstart.sh)
```
Web-интерфейс: `http://<IP>:19999`.

**Простой disk-space alert в cron:**
```cron
0 * * * * deploy test $(df /|awk 'NR==2{print $5+0}') -lt 85 || curl -s "https://api.telegram.org/bot$TG_TOKEN/sendMessage" -d chat_id=$TG_CHAT -d text="⚠ 2x2-shop VPS disk >85%"
```

---

## Контакты эскалации

| Проблема | Кому писать | Канал |
|----------|-------------|-------|
| Инфраструктура VPS | Timeweb support | https://timeweb.com/ru/support |
| Supabase | Supabase support | Dashboard → Support |
| CDEK API | integrator@cdek.ru | email |
| CDEK Pay | support@cdekpay.ru | email |
| Владелец проекта | sj_alex86@mail.ru, +7-932-424-77-40 | email/телефон |

---

## Чек-лист при передаче дежурства

- [ ] `pm2 status` — все процессы `online`
- [ ] `curl https://2x2hmao.ru/api/health` → `ok`
- [ ] `df -h` — диск < 80%
- [ ] Uptime Kuma — зелёный
- [ ] Последний бэкап — вчера, в `/var/backups/2x2-shop/daily/`
- [ ] Нет критичных алертов в Telegram за последние 24ч
