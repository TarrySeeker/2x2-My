# 🗄 Supabase Setup — 2x2-shop

Как владельцу «2х2» (или DevOps) развернуть Supabase-проект и подключить его к 2x2-shop.

> **Статус Этапа 1:** Код работает без Supabase в demo-mode (использует `demo-data.ts`). Этот документ понадобится в Этапе 2, когда будет подключаться реальная БД.

---

## 1. Создать проект

1. Открой https://supabase.com/ → Sign in с email `sj_alex86@mail.ru`.
2. **New project** → Organization: «2x2-agency» (создай если нет).
3. Параметры:
   - **Name:** `2x2-shop-prod`
   - **Database Password:** сгенерировать случайный (сохранить в 1Password — понадобится для `pg_dump`)
   - **Region:** `Frankfurt (eu-central-1)` — ближе всего к ХМАО; или `London`. Избегать `ap-*`.
   - **Pricing Plan:** Free (старт), потом Pro за $25/мес когда появится трафик (нужен для PITR бэкапов)
4. Подожди 2 минуты — Supabase создаст Postgres + Auth + Storage.

Опционально — **staging-проект** с именем `2x2-shop-staging` на Free-плане для тестов миграций.

---

## 2. Забрать ключи

Dashboard → **Settings** → **API**:

| Поле | Куда положить в `.env.production` |
|------|-----------------------------------|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| `anon` `public` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `service_role` `secret` | `SUPABASE_SERVICE_ROLE_KEY` ⚠ не публиковать |

Dashboard → **Settings** → **Database**:

| Поле | Куда |
|------|------|
| Connection string (`URI`) | `SUPABASE_DB_URL` в `/etc/default/2x2-shop-backup` (для pg_dump) |

---

## 3. Применить миграции

Миграции лежат в `supabase/migrations/` (создал database-architect в Этапе 02).

### Способ А — через Supabase CLI (рекомендовано)

```bash
# Установить Supabase CLI на локальной машине или VPS
npm install -g supabase

# Привязать к проекту
cd /var/www/2x2-shop
supabase login              # откроет браузер
supabase link --project-ref <project-ref>    # ref из URL дашборда

# Применить миграции
supabase db push

# Проверить
supabase db diff            # не должно быть расхождений
```

### Способ Б — вручную через SQL Editor

1. Открыть Dashboard → **SQL Editor** → New query.
2. Скопировать содержимое `supabase/migrations/00001_initial_schema.sql`.
3. Выполнить.
4. Повторить для остальных файлов миграций в порядке возрастания номеров.

### Способ В — через psql

```bash
psql "$SUPABASE_DB_URL" -f supabase/migrations/00001_initial_schema.sql
psql "$SUPABASE_DB_URL" -f supabase/migrations/00002_seed.sql
# и т.д.
```

После применения в **Table Editor** должны появиться таблицы:
`products`, `categories`, `orders`, `order_items`, `leads`, `calculation_requests`, `contact_requests`, `portfolio_items`, `users`, `blog_posts`, `promos`, `reviews`, `settings`, `site_content`...

---

## 4. Настроить Auth

Dashboard → **Authentication**:

1. **Providers** → включить **Email** (остальное можно оставить выключенным).
2. **URL Configuration**:
   - Site URL: `https://2x2hmao.ru`
   - Redirect URLs: `https://2x2hmao.ru/auth/callback`, `https://2x2hmao.ru/admin/login`
3. **Email templates** — русифицировать (Confirm signup, Reset password, Magic link).
4. **Policies** — RLS должна быть уже включена миграциями. Проверить: Table Editor → любая таблица → RLS = ON.

---

## 5. Создать первых пользователей админки

```sql
-- В SQL Editor:
-- 1. Owner (владелец)
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, role)
VALUES ('sj_alex86@mail.ru', crypt('TEMPORARY_PASSWORD', gen_salt('bf')), now(), 'authenticated');

-- 2. Связать с ролью в таблице users (если есть такая)
INSERT INTO public.users (id, email, role, full_name)
SELECT id, email, 'owner', 'Алексей'
FROM auth.users WHERE email = 'sj_alex86@mail.ru';
```

**Или проще** — через Dashboard → Authentication → Users → Invite user. Роль `owner` выставить в Table Editor → `users`.

---

## 6. Настроить Storage

Dashboard → **Storage**:

1. Create bucket: `products` (public).
2. Create bucket: `portfolio` (public).
3. Create bucket: `blog` (public).
4. Create bucket: `uploads` (private) — для временных загрузок из админки.

**Policies** (Storage → bucket → Policies → New):
- `products`: анонимный read, owner/manager write.
- `portfolio`: анонимный read, owner/manager/content write.
- `uploads`: только аутентифицированные с ролью owner/manager/content.

---

## 7. Seed-данные (опционально)

Файл `supabase/seed.sql` (создаст content-manager в Этапе 2). Применение:
```bash
psql "$SUPABASE_DB_URL" -f supabase/seed.sql
```

Это загрузит 30–50 demo-товаров, 8–10 работ в портфолио, базовый контент блога. Можно потом заменить через админку.

---

## 8. Подключить к приложению

```bash
# На VPS
cd /var/www/2x2-shop
$EDITOR .env.production       # вписать NEXT_PUBLIC_SUPABASE_URL, ANON_KEY, SERVICE_ROLE_KEY
pm2 reload ecosystem.config.cjs --update-env

# Проверить
curl https://2x2hmao.ru/api/health
# Ожидание: {"status":"healthy", "checks": { "supabase": "ok", ... }}
```

---

## 9. Troubleshooting

| Симптом | Причина | Фикс |
|---------|---------|------|
| `/api/health` → `supabase: "not_configured"` | env не заданы или `placeholder` URL | Проверь `.env.production`, `pm2 env 0 \| grep SUPABASE` |
| `new row violates row-level security policy` | Операция идёт от anon, а нужна admin | Использовать `createAdminClient()` (server-only) |
| `JWT expired` на фронте | Кеш браузера | Перелогин пользователя; можно уменьшить `session timeout` в Auth → URL Config |
| `pg_dump: error: server version mismatch` | Локальный pg_dump старее серверного | `apt install postgresql-client-16` |

---

## 10. Лимиты Free-плана (на что обратить внимание)

- **500 МБ Postgres** — хватает на ~50 000 строк с текстом; в случае роста → Pro
- **1 ГБ Storage** — хватает на ~200 фото в JPEG; в случае роста → Pro или подключить S3
- **50 000 MAU** — бесплатно
- **7-дневный лог** — только Pro даёт PITR-бэкап

**Когда переходить на Pro ($25/мес):**
- Появился реальный трафик (>100 заказов/месяц)
- Нужен PITR-бэкап
- Нужно больше БД/Storage

---

## Чек-лист Supabase

- [ ] Проект создан в eu-central-1 / eu-west
- [ ] `Database Password` сохранён в 1Password
- [ ] Ключи (`URL`, `anon`, `service_role`) перенесены в `.env.production`
- [ ] Миграции применены (все таблицы видны в Table Editor)
- [ ] RLS включена на всех таблицах
- [ ] Auth Email-провайдер включён, URLs настроены, шаблоны русифицированы
- [ ] Создан owner-пользователь и он может залогиниться в `/admin/login`
- [ ] Storage buckets созданы (products, portfolio, blog, uploads) с политиками
- [ ] `curl /api/health` показывает `supabase: "connected"`
- [ ] Тест: через админку создан товар, он отображается на витрине
