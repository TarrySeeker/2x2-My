# db/ — миграции PostgreSQL для проекта «2х2»

Эта папка содержит SQL-миграции и seed-данные для **чистого PostgreSQL 15+**
(в Docker, без Supabase). Создана в рамках миграции с Supabase на
self-hosted стек для работы из РФ без VPN.

> Старая папка `supabase/` остаётся как референс и будет удалена в
> цепочке 3 миграции.

## Структура

```
db/
├── init/
│   └── 00_apply_migrations.sh         shell-обёртка для postgres init-folder
├── migrations/
│   ├── 001_extensions_and_enums.sql   расширения + ENUM-типы
│   ├── 002_schema.sql                 все таблицы + индексы (без RLS)
│   ├── 003_triggers_and_functions.sql триггеры updated_at, FTS, RPC
│   └── 004_lucia_auth.sql             users + sessions + ALTER FK
├── seed.sql                           1 admin + 7 категорий + 10 товаров
└── README.md                          этот файл
```

## Применение миграций (локально, через docker compose)

### 1. Запустить инфраструктуру

```bash
# из корня проекта
docker compose -f compose.dev.yml up -d
```

Postgres + MinIO поднимутся, при первом запуске init-folder
автоматически применит все миграции + `seed.sql`. Готово.

### 2. Проверка

```bash
psql "postgres://postgres:postgres@localhost:5432/shop2x2" -c "SELECT count(*) FROM categories;"
# 7
```

### 3. Полный сброс (dev)

```bash
docker compose -f compose.dev.yml down -v
docker compose -f compose.dev.yml up -d
```

## Применение новых миграций к работающему prod-стэку

Init-folder работает только на пустом volume. Если БД уже инициализирована
и в `db/migrations/` появились новые файлы — применяй их явно:

```bash
docker compose exec app sh /app/scripts/apply-migrations.sh
```

Все миграции написаны идемпотентно (CREATE TABLE IF NOT EXISTS, etc.) —
повторное применение безопасно.

После этого в БД будет:

- 1 админ (логин `admin`, пароль `admin123`)
- 7 категорий услуг
- 10 товаров для разработки
- 1 промокод (`WELCOME10`)
- 7 базовых настроек магазина

## Проверка

```bash
psql "$DATABASE_URL" -c "SELECT count(*) FROM categories;"
# 7

psql "$DATABASE_URL" -c "SELECT count(*) FROM products;"
# 10

psql "$DATABASE_URL" -c "SELECT username, role FROM users;"
# admin | owner

psql "$DATABASE_URL" -c "SELECT * FROM list_products(NULL, NULL, NULL, NULL, NULL, 'popular', 5, 0);"
# 5 строк
```

## Что внутри каждого файла

### `001_extensions_and_enums.sql`

- `pgcrypto`, `pg_trgm`, `unaccent`
- ENUM-типы: `user_role`, `product_status`, `product_pricing_mode`,
  `order_status`, `order_type`, `review_status`, `promo_type`,
  `post_status`, `calculation_status`, `lead_status`, `contact_status`

### `002_schema.sql`

Все 25 таблиц проекта (без `users` — она в `004_*.sql`):

- `categories`, `products`, `product_images`, `product_variants`,
  `product_parameters`, `calculator_configs`
- `calculation_requests`, `orders`, `order_items`,
  `order_status_history`
- `portfolio_items`, `leads`, `contact_requests`, `reviews`,
  `promo_codes`
- `cart_items`, `wishlist_items`
- `blog_categories`, `blog_posts`, `banners`, `pages`,
  `menu_items`, `settings`, `redirects`, `seo_meta`, `audit_log`

> **Без RLS, без storage.buckets**: безопасность реализована
> в Server Actions через `requireAdmin()`.

### `003_triggers_and_functions.sql`

- Триггер `updated_at` для всех таблиц со столбцом
- Автогенерация `order_number`, `request_number`, `lead_number`
- Полнотекстовый поиск (`tsvector` + GIN) для products / portfolio /
  blog_posts
- Пересчёт `rating_avg` товара при изменении отзывов
- RPC: `search_products`, `get_category_tree`, `get_product_facets`,
  `get_dashboard_stats`, `calculate_product_price`,
  `get_related_products`, `list_products`, `log_admin_action`

> Все RPC — `STABLE` (можно вызывать в SELECT). `SECURITY DEFINER`
> убран — нет RLS, нет необходимости.

### `004_lucia_auth.sql`

- `users(id TEXT, username, password_hash, role, …)` — для Lucia v3
- `sessions(id TEXT, user_id, expires_at)` — токены сессии
- Триггер `updated_at` для `users`
- `ALTER TABLE … ADD CONSTRAINT FK …` для всех TEXT-полей,
  ссылающихся на `users(id)` (orders.customer_id, cart_items.user_id,
  blog_posts.author_id, audit_log.user_id и т.д.)

## Учётка администратора

| | |
|---|---|
| Логин | `admin` |
| Пароль | `admin123` |
| Email | `admin@2x2.ru` |
| Role | `owner` |

`password_hash` в seed — bcrypt-хеш cost=12, сгенерирован через
`scripts/generate-admin-hash.mjs` (библиотека `bcryptjs@3.x`).

Пересоздать hash (например, при смене пароля для локалки):

```bash
node scripts/generate-admin-hash.mjs            # "admin123"
node scripts/generate-admin-hash.mjs newpass    # свой пароль
```

Результат вставить в `db/seed.sql` вместо текущего значения
`users.password_hash`. Приложение проверяет пароль через
`bcrypt.compare()` в `features/auth/api.ts#signInAction`.

> В проде пароль `admin123` **использовать нельзя** — это тестовый
> пароль. Перед деплоем смените его через админку (после релиза
> UI управления пользователями) или вручную:
>
> ```sql
> UPDATE users SET password_hash = '<новый_hash>' WHERE username='admin';
> ```
>
> **Статус prod (erfgv.website):** дефолтный пароль `admin123` сменён
> 2026-04-23 в рамках Этапа 0 экстренных security-фиксов. Новый
> пароль хранится в `.secrets/server-credentials.txt` (НЕ в репо).

## Старая инструкция через docker run (без compose)

Если по какой-то причине не хочешь использовать docker compose:

```bash
docker build -t 2x2-postgres -f Dockerfile.postgres .
docker run --name 2x2-pg \
  -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=dev \
  -e POSTGRES_DB=shop \
  -v "$PWD/db/init/00_apply_migrations.sh:/docker-entrypoint-initdb.d/00_apply_migrations.sh:ro" \
  -v "$PWD/db/migrations:/docker-entrypoint-initdb.d/migrations:ro" \
  -v "$PWD/db/seed.sql:/docker-entrypoint-initdb.d/zz_seed.sql:ro" \
  -p 5432:5432 -d 2x2-postgres
```

## Чем эти миграции отличаются от Supabase-версии (`supabase/migrations/`)

| Что было в Supabase | Что в `db/` |
|---|---|
| Таблица `profiles` (FK на `auth.users`) | Удалена. Вместо неё — `users` от Lucia в `004_*.sql` |
| Все колонки `*_id UUID REFERENCES auth.users(id)` | `*_id TEXT REFERENCES users(id)` (через ALTER TABLE) |
| `ENABLE ROW LEVEL SECURITY` + 50+ `CREATE POLICY` | Убрано. Авторизация — в Server Actions. |
| `is_admin()`, `is_owner()`, `is_content_manager()` | Удалены (RLS-хелперы) |
| `trg_handle_new_user()` + триггер на `auth.users` | Удалены. Lucia сама вставляет в `users`. |
| `INSERT INTO storage.buckets` + `storage.objects` policies | Удалены. Storage — отдельно через S3 в цепочке 2. |
| `SECURITY DEFINER` у всех RPC | Убрано. Нет RLS — `STABLE` достаточно. |
| `GRANT EXECUTE ... TO anon, authenticated` | Убрано (нет таких ролей в чистом Postgres). |

## Связь со Supabase-папкой

Папка `supabase/` оставлена как **референс на время миграции**:
backend-developer (следующий агент в цепочке) сравнивает файлы
`lib/supabase/*` со старыми API и переписывает их на postgres-js.

После завершения цепочки 3 (Docker Compose + тесты) папка `supabase/`
удаляется — её SQL полностью скопирован сюда.
