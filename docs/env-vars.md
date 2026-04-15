# 🔑 env-vars — переменные окружения 2x2-shop

Справочник всех переменных окружения, где используются, обязательные/опциональные, примеры.

**Источник правды:** `.env.example` в корне. Этот файл описывает **почему и как** каждая переменная нужна.

> ⚠ Все переменные с префиксом `NEXT_PUBLIC_` попадают в клиентский JS-бандл. **Никаких секретов** с этим префиксом.

---

## Публичные параметры сайта

| Переменная | Обязательна | Пример | Использование |
|------------|-------------|--------|---------------|
| `NEXT_PUBLIC_SITE_URL` | ✅ prod | `https://2x2hmao.ru` | `lib/siteConfig.ts`, `robots.ts`, `sitemap.ts`, JSON-LD, OG-метаданные |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | ⚪ | `abc123...` | Google Search Console верификация в `app/layout.tsx` |
| `NEXT_PUBLIC_YANDEX_VERIFICATION` | ⚪ | `xyz789...` | Я.Вебмастер мета-тег `app/layout.tsx` |

## Supabase

| Переменная | Обязательна | Где получить | Использование |
|------------|-------------|--------------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ prod | Supabase Dashboard → Settings → API | Supabase client (клиент и сервер) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ prod | Supabase Dashboard → Settings → API | Клиентские запросы с RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ prod | Supabase Dashboard → Settings → API | **ТОЛЬКО на сервере!** Admin-клиент для миграций seed'а, вебхуков, админ-операций. Никогда не показывать клиенту. |
| `SUPABASE_PROJECT_ID` | ⚪ | — | Для скриптов миграций (опционально) |
| `SUPABASE_DB_URL` | ⚪ | Supabase Dashboard → Settings → Database → Connection string | Для `pg_dump` в бэкапах |

## СДЭК API v2 (доставка)

| Переменная | Обязательна | Значение | Использование |
|------------|-------------|----------|---------------|
| `CDEK_API_URL` | ✅ | `https://api.edu.cdek.ru/v2` (test) / `https://api.cdek.ru/v2` (prod) | `lib/cdek/client.ts` |
| `CDEK_CLIENT_ID` | ✅ prod | — | OAuth 2.0 |
| `CDEK_CLIENT_SECRET` | ✅ prod | — | OAuth 2.0 |
| `CDEK_FROM_LOCATION_CODE` | ✅ | `1104` (Ханты-Мансийск) | Отправитель |
| `CDEK_FROM_ADDRESS` | ✅ | `ул. Парковая 92 Б` | Адрес склада |

## CDEK Pay (оплата)

| Переменная | Обязательна | Где | Использование |
|------------|-------------|-----|---------------|
| `CDEK_PAY_SHOP_LOGIN` | ✅ prod | ЛК CDEK Pay | `app/api/payment/*` |
| `CDEK_PAY_SECRET_KEY` | ✅ prod | ЛК CDEK Pay | Подпись запросов, вебхуки |
| `CDEK_PAY_API_URL` | ⚪ | `https://api.cdekpay.ru/v2` | `lib/cdekpay/client.ts` (Этап 5) |
| `CDEK_WEBHOOK_ALLOWED_IPS` | ⚪ | Из доков CDEK | Белый список IP для `/api/cdek/webhook` |

## Уведомления

| Переменная | Обязательна | Использование |
|------------|-------------|---------------|
| `TELEGRAM_BOT_TOKEN` | ⚪ | `lib/notifications.ts` — алерты в Telegram (заявки, инциденты) |
| `TELEGRAM_CHAT_ID` | ⚪ | ID чата для нотификаций |
| `SMTP_HOST` | ⚪ | Почтовые уведомления клиенту (заказы) |
| `SMTP_PORT` | ⚪ | Обычно `587` |
| `SMTP_USER` | ⚪ | SMTP логин |
| `SMTP_PASS` | ⚪ | SMTP пароль |
| `SMTP_FROM` | ⚪ | От какого адреса слать |
| `NOTIFICATION_EMAIL` | ⚪ | Куда слать уведомления менеджерам |

## EmailJS (временное решение, Этап 1)

**Внимание:** все три переменные требуют префикса `NEXT_PUBLIC_`, иначе `@emailjs/browser` не увидит их на клиенте (была ошибка BUG-011).

| Переменная | Обязательна | Где получить |
|------------|-------------|--------------|
| `NEXT_PUBLIC_EMAILJS_SERVICE_ID` | ⚪ Этап 1 | https://dashboard.emailjs.com/admin/ → Email Services |
| `NEXT_PUBLIC_EMAILJS_TEMPLATE_ID` | ⚪ Этап 1 | https://dashboard.emailjs.com/admin/templates |
| `NEXT_PUBLIC_EMAILJS_PUBLIC_KEY` | ⚪ Этап 1 | https://dashboard.emailjs.com/admin/account |

После Этапа 2 (когда заработает Supabase-форма) EmailJS можно выключить — просто оставить пустыми.

## Аналитика

| Переменная | Формат | Обязательна | Использование |
|------------|--------|-------------|---------------|
| `NEXT_PUBLIC_YM_ID` | Только цифры, `99999999` | ⚪ (сильно рекомендуется) | Яндекс.Метрика, `lib/analytics.ts`, `components/analytics/AnalyticsScripts.tsx` |
| `NEXT_PUBLIC_GA4_ID` | `G-XXXXXXXXXX` | ⚪ | Google Analytics 4 (опционально) |
| `NEXT_PUBLIC_DEBUG_ANALYTICS` | `1` / пусто | ⚪ | Включить `console.info` в `trackEvent` на preview-окружениях |

> **Валидация формата.** `AnalyticsScripts` проверяет `NEXT_PUBLIC_YM_ID` regex'ом `^\d{4,12}$`, `NEXT_PUBLIC_GA4_ID` — `^G-[A-Z0-9]{4,20}$`. Невалидные значения игнорируются (BUG-002 fix).

## Прочее

| Переменная | Обязательна | Использование |
|------------|-------------|---------------|
| `NODE_ENV` | автоматически | Next.js ставит сам, не менять вручную |
| `NEXT_TELEMETRY_DISABLED` | ⚪ | `1` чтобы отключить телеметрию Next.js на проде |
| `LOG_LEVEL` | ⚪ | `info` / `debug` / `warn` / `error` — для `lib/notifications.ts` |
| `PORT` | ⚪ | По умолчанию `3000` (задаётся в PM2 ecosystem) |
| `SENTRY_DSN` | ⚪ Этап 2+ | Sentry error tracking |

---

## Как добавить новую переменную

1. Добавить в `.env.example` с комментарием: где используется, каковы ожидаемые значения.
2. Добавить в этот файл (`docs/env-vars.md`) в соответствующую секцию.
3. Если переменная **публичная** — использовать префикс `NEXT_PUBLIC_` и читать через центральный `lib/env.ts` (решение D-077).
4. Если переменная **секрет** — **не** использовать префикс `NEXT_PUBLIC_`, читать только в server-only модулях (с `import "server-only"`).
5. В `.github/workflows/ci.yml` и `.github/workflows/deploy-vps.yml` добавить под `env:` или секреты GitHub.
6. В проде — добавить в `.env.production` на VPS (mode 600).

## Ротация ключей

- **Supabase service role key** — при утечке: Dashboard → Settings → API → Reset → обновить `.env.production` → `pm2 reload`.
- **CDEK Pay secret** — через ЛК CDEK Pay → сервисные запросы.
- **Telegram bot token** — через `@BotFather` → `/revoke`.

Полный инцидент-runbook — в `runbook.md`.
