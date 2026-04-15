# Supabase — «2х2»

База данных интернет-магазина рекламной компании «2х2» (Ханты-Мансийск).
PostgreSQL 15+, развёрнуто в Supabase. Полная схема ~27 таблиц + RLS + RPC + триггеры + storage-бакеты.

---

## Структура

```
supabase/
├─ migrations/
│  ├─ 00001_initial_schema.sql       — Полная схема: 27 таблиц, ENUM, индексы,
│  │                                   RLS-политики, триггеры, RPC, storage-buckets.
│  └─ 00002_portfolio_from_sanity.sql — Добавляет portfolio_items.published_at,
│                                       category_label для переезда с Sanity.
├─ seed.sql                           — Скелет seed-данных. Заполняет content-manager.
└─ README.md                          — этот файл
```

---

## Быстрый старт (локально)

### Вариант A — через Supabase CLI (рекомендуется)

```bash
# 1. Установи Supabase CLI
npm install -g supabase

# 2. Залогинься
supabase login

# 3. Инициализируй проект (из корня репозитория 2x2-shop)
supabase init            # создаст .supabase/ — ОК, можно в .gitignore
supabase link --project-ref <your-project-ref>

# 4. Применить миграции
supabase db push

# 5. Загрузить seed
psql "$(supabase status --output json | jq -r .DB_URL)" -f supabase/seed.sql
# или из удалённого dashboard:
supabase db remote commit
```

### Вариант B — через Supabase Dashboard (без CLI)

1. Открой проект в https://supabase.com/dashboard
2. Слева **SQL Editor → New query**
3. Открой локальный файл `supabase/migrations/00001_initial_schema.sql`,
   **скопируй целиком** в редактор, нажми **Run**. Дождись `Success`.
4. Повтори шаг 3 для `supabase/migrations/00002_portfolio_from_sanity.sql`.
5. Повтори шаг 3 для `supabase/seed.sql` (опционально, для стартового контента).

**Порядок применения критичен** — 00001 перед 00002 перед seed.

### Вариант C — чистый psql

```bash
export DATABASE_URL="postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres"
psql "$DATABASE_URL" -f supabase/migrations/00001_initial_schema.sql
psql "$DATABASE_URL" -f supabase/migrations/00002_portfolio_from_sanity.sql
psql "$DATABASE_URL" -f supabase/seed.sql
```

---

## Переменные окружения

Клиенту понадобятся три ключа из `Project Settings → API`:

| Переменная | Где взять | Пример |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API → Project URL | `https://xxxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API → anon public | `eyJhbGciOi...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → service_role (**secret**) | `eyJhbGciOi...` |

`SUPABASE_SERVICE_ROLE_KEY` **никогда** не попадает в клиент — только в серверный код (Next.js Route Handlers, Server Components, Server Actions).

Шаблон — в `.env.example` в корне `2x2-shop`.

---

## Что создаёт 00001_initial_schema.sql

### 27 таблиц

| # | Таблица | Назначение |
|---|---|---|
| 1 | `profiles` | Админы магазина (owner/manager/content) |
| 2 | `categories` | Древовидные категории услуг |
| 3 | `products` | Товары/услуги (~200 позиций) |
| 4 | `product_images` | Галерея товара |
| 5 | `product_variants` | Варианты (размер/материал/тираж) |
| 6 | `product_parameters` | Параметры для калькулятора и фильтров |
| 7 | `calculator_configs` | Формула калькулятора стоимости |
| 8 | `calculation_requests` | Заявки на расчёт (сложные услуги) |
| 9 | `orders` | Заказы (фикс. цена) |
| 10 | `order_items` | Позиции заказа |
| 11 | `order_status_history` | История статусов |
| 12 | `portfolio_items` | Работы в портфолио |
| 13 | `leads` | Универсальные лиды (1-клик, перезвонить) |
| 14 | `contact_requests` | Формы обратной связи |
| 15 | `reviews` | Отзывы с фото + пересчёт рейтинга |
| 16 | `promo_codes` | Промокоды |
| 17 | `cart_items` | Корзина авторизованных |
| 18 | `wishlist_items` | Избранное |
| 19 | `blog_categories` + `blog_posts` | Блог |
| 20 | `banners` | CMS-баннеры |
| 21 | `pages` | Статические страницы |
| 22 | `menu_items` | Меню навигации |
| 23 | `settings` | Key-value настройки магазина |
| 24 | `redirects` | SEO-редиректы |
| 25 | `seo_meta` | Мета-теги произвольных URL |
| 26 | `audit_log` | Журнал действий в админке |

### RPC-функции

- `search_products(q, category_slug, limit, offset)` — полнотекстовый поиск по каталогу
- `get_category_tree()` — дерево категорий с подсчётом товаров
- `get_product_facets(category_id, search)` — фасеты для фильтров каталога
- `get_dashboard_stats()` — агрегированная статистика для админ-дашборда
- `calculate_product_price(product_id, params)` — расчёт цены по формуле калькулятора
- `log_admin_action(...)` — запись в `audit_log`

### Триггеры

- `updated_at` автопроставляется на 19 таблицах
- Автогенерация номеров: `orders.order_number` (ORD-000001), `calculation_requests.request_number` (CR-000001), `leads.lead_number` (LEAD-000001)
- `search_vector` (tsvector) автообновляется для `products`, `portfolio_items`, `blog_posts` через `setweight` + `to_tsvector('russian', …)`
- Пересчёт `rating_avg`, `reviews_count` при изменении `reviews`
- Автосоздание `profiles` при регистрации через `auth.users`

### RLS

**RLS включён на всех 26 пользовательских таблицах.** Ключевые политики:

- **public read** для `categories`, `products`, `product_images`, `product_variants`, `product_parameters`, `calculator_configs`, `portfolio_items`, approved `reviews`, active `promo_codes`, `blog_categories`, published `blog_posts`, active `banners`, active `pages`, active `menu_items`, public `settings`, active `redirects`, `seo_meta`
- **public insert** для `orders`, `order_items`, `calculation_requests`, `leads`, `contact_requests`, pending `reviews` (формы витрины)
- **users manage own** для `cart_items`, `wishlist_items`, own `orders`, own `profiles`
- **admin-only** (через `is_admin()`) для всех CRUD-операций над `products`, `categories`, `orders`, `leads`, `reviews`, `promo_codes`, `settings`, `redirects`, `seo_meta`, `audit_log`
- **content-manager доступ** (через `is_content_manager()`) для `blog_posts`, `blog_categories`, `banners`, `pages`, `menu_items`, `portfolio_items`

### Storage buckets

| Bucket | Public | Назначение |
|---|---|---|
| `products` | ✅ | Фото товаров |
| `portfolio` | ✅ | Фото работ |
| `blog` | ✅ | Обложки и вставки статей |
| `banners` | ✅ | Баннеры главной/промо |
| `content` | ✅ | Вставки в статические страницы |
| `reviews` | ✅ | Фото от клиентов в отзывах |
| `attachments` | ❌ | Вложения из `calculation_requests` — только админ |

---

## Что добавляет 00002_portfolio_from_sanity.sql

- `portfolio_items.published_at TIMESTAMPTZ` — дата публикации (Sanity `publishedAt`)
- `portfolio_items.category_label TEXT` — строковый лейбл категории из Sanity (когда ещё не привязано к `categories.id`)
- Индекс `idx_portfolio_published_at` — для сортировки по свежести
- Backfill: `published_at ← COALESCE(project_date, created_at)`

---

## Как назначить пользователя админом

После регистрации через `auth.users` автоматически создаётся `profiles` с `role='manager'`. Чтобы сделать пользователя владельцем:

```sql
UPDATE profiles SET role = 'owner' WHERE email = 'you@example.com';
```

---

## Тестирование RLS

После применения миграций:

```sql
-- Публичное чтение должно работать
SELECT id, name FROM categories LIMIT 5;     -- ОК
SELECT id, name FROM products LIMIT 5;       -- ОК (status='active')

-- Попытка записи без авторизации — должна падать
INSERT INTO products (name, slug) VALUES ('Test', 'test');  -- ERROR: new row violates RLS
```

---

## Откат

Все миграции идемпотентны (`IF NOT EXISTS`, `ON CONFLICT`), но полноценного down-миграционного механизма нет. Чтобы снести всё:

```sql
-- ОСТОРОЖНО: удаляет ВСЕ данные магазина
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
```

Затем заново применить миграции.

---

## Ссылки

- Документация Supabase: https://supabase.com/docs
- Supabase CLI: https://supabase.com/docs/guides/cli
- RLS гайд: https://supabase.com/docs/guides/auth/row-level-security
- Полная инструкция по настройке Supabase для клиента: `docs/SUPABASE-SETUP.md` (создаёт devops-engineer)
