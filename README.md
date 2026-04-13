# 2×2 — сайт рекламного агентства

Next.js 16 (App Router) + Tailwind 4, Sanity CMS для портфолио, EmailJS для формы обратной связи.

## Требования

- Node.js 20+
- npm 10+

## Быстрый старт (локально)

```bash
npm install
cp .env.local.example .env.local   # если файла нет — создайте вручную, см. ниже
npm run dev
```

Откройте http://localhost:3000

### Переменные окружения

Создайте файл `.env.local` в корне проекта:

```env
# EmailJS (форма обратной связи)
NEXT_PUBLIC_EMAILJS_SERVICE_ID=service_xxxxxxx
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=template_xxxxxxx
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=xxxxxxxxxxxxxxxx

# Sanity CMS (портфолио)
NEXT_PUBLIC_SANITY_PROJECT_ID=xxxxxxx
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_SANITY_API_VERSION=2024-01-01
```

Если Sanity не настроен — страница `/portfolio` покажет галерею из локальных данных (из `lib/featuredPortfolioWorks.ts`). Форма заявки без EmailJS-ключей отправлять ничего не будет.

## Скрипты

| Команда | Что делает |
| --- | --- |
| `npm run dev` | Dev-сервер на http://localhost:3000 |
| `npm run build` | Продакшн-сборка (`next build`) |
| `npm run start` | Запуск продакшн-билда |
| `npm run lint` | ESLint |
| `npm run clean` | Удалить `.next/` |

Статическая сборка (для GitHub Pages) — запускается отдельной переменной:

```bash
BUILD_STATIC=true NEXT_PUBLIC_BASE_PATH=/2x2-Yna npm run build
# Результат в папке out/
```

## Деплой на GitHub Pages

В репозитории уже настроен workflow [.github/workflows/deploy.yml](.github/workflows/deploy.yml), который на каждый push в `main`:

1. Устанавливает зависимости
2. Собирает статический экспорт (`BUILD_STATIC=true`, `basePath=/2x2-Yna`)
3. Публикует папку `out/` на GitHub Pages

### Первоначальная настройка (один раз)

1. **Включите Pages.** В репозитории на GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. **Добавьте секреты** (Settings → Secrets and variables → Actions → New repository secret). Все опциональны — если не заданы, сборка пройдёт, но соответствующая функциональность отключится:
   - `NEXT_PUBLIC_SANITY_PROJECT_ID`
   - `NEXT_PUBLIC_SANITY_DATASET` (по умолчанию `production`)
   - `NEXT_PUBLIC_SANITY_API_VERSION` (по умолчанию `2024-01-01`)
   - `NEXT_PUBLIC_EMAILJS_SERVICE_ID`
   - `NEXT_PUBLIC_EMAILJS_TEMPLATE_ID`
   - `NEXT_PUBLIC_EMAILJS_PUBLIC_KEY`
3. **Проверьте деплой.** После push'а workflow запустится автоматически (вкладка **Actions**). После успешного прогона сайт будет доступен на `https://tarryseeker.github.io/2x2-Yna/`.

> ⚠️ Все `NEXT_PUBLIC_*` переменные попадают в клиентский бандл и видны в исходниках сайта. Не храните там приватные ключи.

### Замечания про статическую сборку

- Раздел `/studio` (Sanity Studio) на GitHub Pages работать не будет (ему нужен валидный `projectId`). Для редактирования контента запускайте `npm run dev` локально и ходите на http://localhost:3000/studio, либо используйте облачный Sanity Studio на sanity.io.
- Все ссылки в `next/link` и `next/image` автоматически учитывают `basePath=/2x2-Yna`. Не хардкодьте абсолютные пути вроде `/foo.png` — используйте `next/image` или `next/link`.
- `out/.nojekyll` создаётся автоматически в workflow, чтобы GitHub Pages не игнорировал папку `_next/`.

## Структура

```
app/            — страницы (App Router)
components/     — UI-компоненты
lib/            — утилиты, конфиги, статические данные
sanity/         — клиент и схемы Sanity
public/         — статические ассеты
```
