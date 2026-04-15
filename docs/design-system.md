# Дизайн-система «2×2» — интернет-магазин

**Версия:** 1.0 (Этап 1, фундамент)
**Ведёт:** `designer` (через handoff'ы)
**Связанные файлы:**
- `app/globals.css` — источник истины для CSS-переменных (`@theme inline`)
- `styles/tokens.ts` — типизированное зеркало токенов для TSX-кода
- `components/ui/*` — базовые Yna-компоненты (Button, Card, Badge, Accordion, SectionTitle, AnimatedSection)

---

## 0. Главный принцип

**Визуал главной Yna — неприкосновенен.** Всё, что строят новые e-commerce экраны
(каталог, карточка, корзина, чекаут, портфолио, админка), должно выглядеть
как естественное продолжение Yna-макета, а не как вкрученный shadcn-дашборд.

> Если новый компонент можно «воткнуть» рядом с `HeroSection` и он
> не выбивается по ритму/шрифту/цвету — значит попали в язык.

---

## 1. Бренд

| | |
|---|---|
| Название | Рекламное агентство «2×2» |
| Слоган | 2×2, потому что с нами просто! |
| Тон | премиальный, дружелюбный, региональный |
| Аудитория | B2B ХМАО/ЯНАО, B2G, крупные сети (ВТБ, Брусника) |
| Город | Ханты-Мансийск, ул. Парковая 92Б |
| Основной цвет | `#FF6B00` — brand orange (единственный акцент на странице) |

**Логотип:** лежит в `public/img/logo.svg`. Высота в header — 32–40 px
на мобилке, 48 px на десктопе. Всегда монохромный (не раскрашиваем градиентами).

---

## 2. Цвета

Полный перечень — в `styles/tokens.ts` и `app/globals.css` (`@theme inline`).
Ниже — рекомендации по применению.

### 2.1 Фирменная палитра (обязательна)

| Токен | HEX | Применение |
|---|---|---|
| `--color-brand-orange` | `#FF6B00` | CTA, ссылки hover, активный фильтр, prices |
| `--color-brand-orange-hover` | `#EA580C` | hover состояние primary-кнопки |
| `--color-brand-orange-soft` | `#FFE8D6` | фон badge «Акция», tint trust-bar |
| `--color-brand-dark` | `#1A1A1A` | основной текст, outline-hover |
| `--color-brand-gray` | `#F5F5F5` | фон секций footer, карточек skeleton |

### 2.2 Поверхности e-commerce (Этап 2+)

| Токен | HEX | Применение |
|---|---|---|
| `--color-surface-cream` | `#FFF9F5` | Hero-фон (как на Yna), фон карточки товара |
| `--color-surface-cream-deep` | `#FFF5EF` | градиентный переход фона |
| `--color-surface-paper` | `#FAFAFA` | фон каталога (между карточками) |

### 2.3 Семантика (формы, алерты)

| Токен | HEX | Применение |
|---|---|---|
| `--color-success` | `#16A34A` | «Заказ оплачен», зелёный тик |
| `--color-warning` | `#F59E0B` | «Ожидает расчёта», жёлтый |
| `--color-danger` | `#DC2626` | ошибки формы, «Отклонено» |
| `--color-info` | `#2563EB` | инфо-бейджи, ссылки (не CTA) |

### 2.4 Что НЕ делать

- ❌ Не использовать серый текст светлее `#737373` на белом — контраст < 4.5
- ❌ Не делать оранжевый фон крупных блоков (текст на brand-orange — только крошечные бейджи и CTA)
- ❌ Не вводить второй акцентный цвет. Только `#FF6B00`. Градиенты — внутри оранжево-амбровой гаммы (`from-brand-orange via-amber-500 to-[#FF8A4C]`) как в HeroSection.

---

## 3. Типографика

### 3.1 Семейства

| Слот | Шрифт | CSS-переменная | Где |
|---|---|---|---|
| body / UI | **Manrope** | `var(--font-manrope)` → `font-sans` | весь текст, кнопки, формы |
| display / h1–h3 | **Rubik** | `var(--font-display)` | Hero, section titles, карточки-хиро |

Оба шрифта подключены через `next/font/google` в `app/layout.tsx`.
Поддерживают кириллицу. Веса Rubik — 600/700/800/900.

### 3.2 Fluid-шкала

Yna использует `text-[clamp(min, vw, max)]`. Мы это **не меняем** и
распространяем на новые экраны. Зеркало в `styles/tokens.ts` → `typography`.

```tsx
// Hero h1 (НЕ трогать на главной)
<h1 className="text-[clamp(2.4rem,8.5vw,5.5rem)]">Мы создаём</h1>

// Catalog page title (можно)
<h1 className="text-[clamp(2rem,5vw,3.5rem)]">Каталог услуг</h1>

// Product card title (среднее)
<h3 className="text-[clamp(1.25rem,2.2vw,1.75rem)]">Визитки «Стандарт»</h3>
```

### 3.3 Правила

- Заголовки всегда `font-weight: 700-900`, `line-height: 0.92-1.15`, `tracking-tight`
- Hero-стиль `uppercase` + `font-black` — только на главной + 404/пустые состояния
- Для каталога — Rubik `semibold` без uppercase, чтобы не конкурировать с Hero
- Body text: Manrope 400/500, `leading-relaxed`
- Overline (breadcrumbs, метки категории): Manrope 600 uppercase `tracking-[0.22em]` размер 11–12 px

---

## 4. Spacing и layout

### 4.1 Контейнер

Класс `.container` из `globals.css` — `max-width: 80rem` + fluid-паддинги
через `@media + env(safe-area-inset-*)`. **Всё содержимое страниц кладём в `.container`**,
кроме full-bleed секций (Hero, Footer).

### 4.2 Вертикальный ритм

- `section-padding` (`py-16 md:py-24`) — стандартная секция
- Между карточками каталога: `gap-6 md:gap-8`
- Внутри карточки товара: `p-6` (Yna Card) или `p-8` для hero-карточек
- Spacing шкала из `tokens.ts`: xxs 4 → xxxl 64 px

### 4.3 Grid-каталог

| Breakpoint | Колонок |
|---|---|
| < 640 | 1 |
| ≥ 640 | 2 |
| ≥ 1024 | 3 |
| ≥ 1280 | 4 |

Карточка фиксированной высоты 420 px (с изображением ~260 px).

---

## 5. Радиусы и тени

### 5.1 Радиусы

Yna уже зафиксировал ощущение «мягкие, но не пузыри»:

| Элемент | Радиус | Токен |
|---|---|---|
| Input / select / textarea | 8 px | `--radius-input` / `rounded-lg` |
| Button | 12 px | `--radius-button` / `rounded-lg` |
| Hero CTA | pill | `rounded-full` |
| Card (Yna Card.tsx) | 20 px | `--radius-card` / `rounded-2xl` |
| Badge | pill | `rounded-full` |
| Modal / Sheet | 16 px top | `rounded-t-2xl` |

### 5.2 Тени

- `shadow-sm` — карточка каталога в покое
- `shadow-md` — та же карточка на hover (+ `hover:-translate-y-1`)
- `shadow-xl shadow-brand-orange/25` = `--shadow-glow-brand` — только primary-CTA
- `--shadow-lift` — hover карточки портфолио (темнее и шире, чем обычный md)

**Не добавляем** drop-shadow с `backdrop-blur` для всего подряд —
glassmorphism оставляем для специальных блоков (sticky mobile bar, sheets).

---

## 6. Анимации (framer-motion)

### 6.1 Easing

Yna использует `[0.22, 1, 0.36, 1]` — soft out-expo.
**Все** новые анимации появления — через эту же кривую, чтобы ритм страницы не ломался.

```tsx
import { tokens } from "@/styles/tokens";

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.6, ease: tokens.easings.softOut }}
>
```

### 6.2 Длительности

| Что | ms |
|---|---|
| hover / press | 150 |
| появление элемента | 500–600 |
| появление секции (stagger) | 800 |
| Hero blob loop | 11–14 s (infinite) |

### 6.3 Паттерны

1. **AnimatedSection** (`components/ui/AnimatedSection.tsx`) — обёртка для входа
   в viewport (`useInView + once`). Используем на всех новых секциях каталога/портфолио.
2. **Stagger children** для списков: `staggerChildren: 0.08`, первый
   `delay: 0`, каждый следующий `+0.08s`.
3. **Hero typewriter** — только на главной, не тиражируем.
4. **Blob parallax** (`useScroll + useTransform`) — только на Hero секций
   (главная, /portfolio hero, /about hero). На карточках — запрещено,
   слишком тяжело.

### 6.4 Микровзаимодействия

- Карточка товара hover: `-translate-y-1` + `shadow-md` (как Yna Card)
- Добавить в корзину: `scale: [1, 1.05, 1]` 300 ms + toast
- Loading button: spinner `animate-spin` (уже есть в Yna Button)
- Page transition: fade через `AnimatePresence` в layout (Этап 2)

---

## 7. Фоны и текстуры

### 7.1 Fractal noise

Фирменный SVG-шум из HeroSection — экспортирован как `tokens.noiseBackground`.
Используем как overlay `mix-blend-multiply opacity-[0.07]` для:

- Hero секций под-страниц (каталог, портфолио)
- Пустых состояний (404, «Нет заказов»)
- CTA-блоков в футере

```tsx
<div
  className="absolute inset-0 opacity-[0.07] mix-blend-multiply"
  style={{ backgroundImage: tokens.noiseBackground }}
/>
```

### 7.2 Blob-градиенты

Компонент `AbstractCluster` из HeroSection — **не копируем** в другие страницы.
Для Hero под-страниц (каталог, портфолио) — упрощённая версия:
два static blob без motion, blur 2xl, opacity 0.2.

---

## 8. UI-компоненты: что уже есть и что строим

### 8.1 Базовые компоненты Yna (`components/ui/`)

| Компонент | Использовать для | Изменять? |
|---|---|---|
| `Button.tsx` | все кнопки | **не менять API**, расширяем новыми variant'ами внутри |
| `Card.tsx` | карточки на главной | НЕ менять, для каталога делаем новый `ProductCard` |
| `Badge.tsx` | метки | расширить variant `success`/`danger`/`info` |
| `Accordion.tsx` | FAQ, характеристики | готов |
| `SectionTitle.tsx` | заголовки секций главной | готов |
| `AnimatedSection.tsx` | появление в viewport | готов |

### 8.2 Новые компоненты, которые должен построить frontend-developer (Этап 2+)

> Designer фиксирует спеку, frontend-developer реализует.
> Все — в `components/ui/` или `components/shop/*` в стиле Yna.

#### Этап 2 (каталог / карточка)

- `ProductCard` — `rounded-2xl` + `shadow-sm` + hover lift. Изображение 4:3 сверху, бренд-бейдж в углу, цена жирно справа внизу, CTA `В корзину` snap к правому краю. **Высота фиксированная 420 px** чтобы grid не плясал.
- `PriceTag` — форматирование RUB через `Intl.NumberFormat`, оранжевая цена + серая старая зачёркнутая + красный бейдж скидки
- `Filters` (sidebar) — Radix Accordion + checkbox-группы, на мобилке — Sheet снизу
- `CategoryChip` — pill, активный `bg-brand-orange text-white`, неактивный `bg-neutral-100`
- `Calculator` — форма параметров (RadioGroup для тиража/формата/бумаги), внизу live-price через `calculate_product_price` RPC
- `ProductGallery` — основной слайд + thumbnails снизу. На десктопе — ImageZoom на hover (lupa 1.5x внутри контейнера)
- `QuantityStepper` — `-` / число / `+`, `rounded-lg`, высота 40 px

#### Этап 3 (корзина / чекаут)

- `CartSheet` — Radix Sheet справа, `rounded-l-2xl`, список позиций с `AnimatePresence` при удалении
- `CheckoutStepper` — 4 шага (Данные → Доставка → Оплата → Подтверждение), активный шаг оранжевый, завершённые — чёрные, будущие — серые. На мобилке — horizontal scroll
- `CdekWidget` — обёртка стандартного СДЭК-виджета в `rounded-2xl` контейнер с нашими цветами
- `PaymentMethodTile` — радио-плитка: СБП / карта / счёт для юрлиц. Активная — оранжевая рамка + soft-fill
- `OneClickModal` — Radix Dialog, 2 поля (имя, телефон), submit → trust-message + close

#### Этап 4 (портфолио)

- `PortfolioCard` — 4:5 изображение, overlay `bg-gradient-to-t from-black/60` при hover, название работы белым
- `PortfolioLightbox` — Radix Dialog fullscreen (D-012), swiper-галерея, CTA «Заказать такую же»
- `PortfolioFilters` — chips по типу работы и по отрасли клиента

#### Этап 6+ (админка)

- `DataTable` — TanStack Table с нашими `rounded-2xl` контейнером и Manrope
- `StatusPill` — badge с цветом из `colors.status`
- `ImageUploader` — drag-drop + preview grid, оранжевая рамка при drag
- `TipTapEditor` — rounded-lg, toolbar sticky сверху, контент max-w-3xl
- `AdminSidebar` — компактный (60 px collapsed / 240 px expanded), оранжевая активная секция

### 8.3 Shadcn/ui — подход

**Не ставим весь shadcn.** Устанавливаем точечно, только то, что
реально нужно, и сразу адаптируем под наши токены. В приоритете:
`Dialog`, `Sheet`, `Popover`, `Tabs`, `Accordion`, `Tooltip`, `Select`,
`Command`, `ScrollArea`, `DropdownMenu`, `ToggleGroup`, `RadioGroup`.

**Правила адаптации:**
1. Убрать дефолтные `bg-background` / `text-foreground` shadcn-переменные
2. Подставить наши `bg-white` / `text-brand-dark` / `border-[var(--color-border)]`
3. Радиусы заменить на наши токены (`rounded-2xl` для overlay, `rounded-lg` для кнопок)
4. Шрифт — автоматом через body inheritance Manrope
5. Анимации — заменить на `easing: [0.22, 1, 0.36, 1]`

---

## 9. Иконки

**Библиотека:** Lucide React (уже в зависимостях Yna).
**Размер по умолчанию:** 20 px (`w-5 h-5`).
**Stroke:** 2 (дефолт).
**Цвет:** `currentColor` — наследуется от родителя.

**Запреты:**
- ❌ Не смешиваем Lucide с другими набросками (Heroicons, Tabler…)
- ❌ Не раскрашиваем иконки в оранжевый «для выразительности» — используем `text-brand-orange` только на активных состояниях

---

## 10. Тёмная тема

### 10.1 Статус на Этапе 1

**Выключена.** Yna-макет спроектирован под светлый фон. Добавление
тёмной темы — отдельная задача Этапа 6–7 (админка).

### 10.2 План (Этап 7)

- `next-themes` провайдер в `app/layout.tsx`
- Тёмные варианты через `[data-theme="dark"] { --color-foreground: #FAFAFA; ... }`
- Переключатель — **только в админке**, витрина всегда светлая
- Hero-страница и Hero-градиенты — требуют отдельной адаптации:
  - `--color-surface-cream` → `#1A1410` (тёплый уголь)
  - orange-gradient остаётся
  - noise overlay увеличивает opacity до 0.12

### 10.3 Временно

В `tokens.ts` предусмотрены семантические токены (`colors.text`, `colors.surface`),
чтобы в будущем dark mode требовал только замены CSS-переменных, не JSX.

---

## 11. Responsive / mobile-first

### 11.1 Брейкпоинты

Совпадают с Tailwind default:
`sm 640 / md 768 / lg 1024 / xl 1280 / 2xl 1536`.

### 11.2 Правила

- **Mobile-first:** все базовые классы = мобилка, `md:`/`lg:` — расширения
- Минимальный тап-таргет: 44×44 px (`min-h-11 min-w-11` или `py-3`)
- Hero 100 dvh на мобилке с учётом `env(safe-area-inset-top)`
- Каталог-фильтры на `<lg` — кнопка «Фильтры» → открывает Sheet снизу
- Корзина на `<lg` — full-screen Sheet, не side-panel
- Sticky mobile bottom bar (D-032) — от 300 px скролла, `bottom-0 z-40`
- Шрифт на мобилке: hero `2.4rem` (из clamp), body `16px` (чтобы не было iOS zoom)

### 11.3 Что тестировать

- Хаб: iPhone SE (375), iPhone 14 (390), Pixel 7 (412), iPad (768)
- Desktop: 1280, 1440, 1920
- Touch: hover-состояния не должны ломать UX (заменяем hover: на active:)

---

## 12. Доступность (a11y)

- Все интерактивные элементы через Radix UI — keyboard nav «из коробки»
- Все кнопки с только-иконкой → `aria-label="..."`
- Все формы → `<label htmlFor>` или `aria-labelledby`
- Контраст текста ≥ 4.5:1 на всех фонах (проверять axe-core в tester'е)
- Focus ring — оранжевый `focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2`
- Анимации уважают `prefers-reduced-motion` — wrap в `useReducedMotion()` из framer-motion

---

## 13. SEO-визуал

Компоненты, которые **влияют на SEO**, должны сохранять семантику:

- H1 только один на странице, в Hero
- Категории — `<nav aria-label="Категории">` + `<ul>`
- Breadcrumbs — `<nav aria-label="Breadcrumbs">` + BreadcrumbList JSON-LD
- Цены — `<span itemprop="price">` для Product microdata (Этап 2)

---

## 14. Что замокано / не готово

> Designer в Этапе 1 делает мост, не полный дизайн. Ниже — что отложено.

- [ ] **Макеты экранов** (каталог, карточка, корзина, чекаут, портфолио, админка)
      → Этап 2-6, когда у frontend-developer'а появятся компоненты.
      Сейчас есть только спеки компонентов в п.8.2
- [ ] **Иллюстрации пустых состояний** (empty cart, 404, «Нет заказов»)
      → Этап 2. Пока — Lucide иконка 64 px + текст
- [ ] **Фотографии портфолио** — будут от клиента. Пока `unsplash.com` + SVG-плейсхолдеры
- [ ] **Логотипы trust-bar** (ВТБ, Брусника, ЮКИОР, Pirelli, АЗС АртСевер)
      → запрос к пользователю в USER-ACTIONS.md
- [ ] **Иконки способов оплаты** (СБП, МИР, Visa) — брать официальные SVG
- [ ] **Favicon / OG-image** — уже есть в Yna, не трогаем
- [ ] **Dark mode** — Этап 6-7 (только админка)

---

## 15. Чек-лист для каждого нового компонента

Перед тем как закоммитить новый компонент:

- [ ] Шрифты: Manrope (body) или Rubik (display) через CSS-переменные
- [ ] Цвета: только токены из `styles/tokens.ts` / `@theme inline`
- [ ] Радиусы: из `--radius-*` (не кастомные mm/px)
- [ ] Тени: из `--shadow-*` или Tailwind preset (`shadow-sm`, `shadow-md`)
- [ ] Анимации: easing `tokens.easings.softOut`, длительность из `tokens.durations`
- [ ] Responsive: mobile-first, hover для `hover:` + active для `active:`
- [ ] A11y: aria-label, keyboard, focus-visible, контраст
- [ ] Контент: русский, региональный тон (ХМАО/Югра)
- [ ] Не ломает визуал главной при встраивании рядом

---

## 16. Источники и ссылки

- **Yna компоненты:** `components/ui/*`, `components/sections/*`
- **Tokens CSS:** `app/globals.css` (`@theme inline`)
- **Tokens TS:** `styles/tokens.ts`
- **Framer Motion Hero reference:** `components/sections/HeroSection.tsx`
- **Проектные решения:** `../1clin/agents/handoffs/DECISIONS.md` (D-008…D-015, D-050)
- **Брифинг:** `../1clin/CLAUDE.md`
- **Конкуренты (для ориентира по визуалу e-commerce секций):**
  реклама-наружная.рф, ra86.ru, zametno.su, palitra.biz, zaprintom.ru

---

## 17. Каталог и карточка товара (Этап 2)

> Добавлено designer'ом в рамках Этапа 2. Спека для frontend-developer
> по реализации `/catalog` и `/product/[slug]` в стиле Yna.

### 17.1 Общий принцип

Каталог «2×2» — **не generic магазин**, а витрина рекламного агентства:
услуги с разной логикой цены (фикс / калькулятор / по запросу). Визуально
каталог читается как **продолжение Hero главной**: тот же кремовый фон,
fractal noise overlay, Rubik-акценты, оранжевый `#FF6B00` только на CTA
и ценах.

**Главные принципы каталога:**

1. **Карточка = услуга, а не товар.** Название крупное, изображение важнее
   цены (клиент покупает «результат», а не SKU).
2. **Цена всегда видна**, но с префиксом «от» и честной формой оплаты —
   конкуренты скрывают цены, мы их показываем (D-010, D-088).
3. **3-режимный CTA** (D-010): `fixed` → «В корзину», `calculator` →
   «Рассчитать», `quote` → «Заказать расчёт». Это **главный UX-сигнал**
   карточки — цвет и текст кнопки сразу говорят пользователю, что ждёт.
4. **Никаких shadcn-дашборд фильтров** слева. Фильтры — это
   «паспорт услуги»: категория крупными чипами сверху + компактные
   accordion-группы в sidebar. На мобилке — Sheet снизу.
5. **Сетка дышит.** `gap-6` на мобиле, `gap-8` на десктопе.
   Карточки не прилипают друг к другу — ритм страницы важнее плотности.

### 17.2 Экран `/catalog` — layout

```
┌──────────────────────────────────────────────────────────────────┐
│  Header (Yna, уже есть)                                          │
├──────────────────────────────────────────────────────────────────┤
│  Hero-полоска каталога:                                          │
│     Breadcrumbs: Главная / Каталог                               │
│     H1: «Каталог услуг»  (Rubik, clamp(2rem, 5vw, 3.5rem))       │
│     Подзаголовок: «200+ решений для бизнеса ХМАО и ЯНАО»         │
│     fractal noise overlay, cream-фон                             │
├──────────────────────────────────────────────────────────────────┤
│  CategoryChips row (горизонтальный скролл на мобиле):            │
│    [Все 50] [Полиграфия 8] [Наружная 7] [Вывески 6] ...          │
├──────────────────────────────────────────────────────────────────┤
│  ┌──Filters (lg:280px sidebar)──┐ ┌──Toolbar──────────────────┐  │
│  │ ▸ Цена (range slider 0-100k)│ │ 50 услуг    Сортировка ▼  │  │
│  │ ▸ Режим (fixed/calc/quote)  │ └──────────────────────────┘  │
│  │ ▸ Характеристики             │ ┌──────┐┌──────┐┌──────┐     │
│  │ ▸ Монтаж включён             │ │ Card ││ Card ││ Card │     │
│  │ ▸ Есть скидка                │ ├──────┤├──────┤├──────┤     │
│  │ [Сбросить фильтры]           │ │ Card ││ Card ││ Card │     │
│  └─────────────────────────────┘ ├──────┤├──────┤├──────┤     │
│                                   │  ... 50 карточек          │
│                                   └──────────────────────────┘  │
│                                   ┌──Pagination───┐              │
│                                   │ ‹ 1 2 3 … 7 › │              │
│                                   └──────────────┘              │
├──────────────────────────────────────────────────────────────────┤
│  CTA-полоска: «Не нашли? Закажите расчёт» → Quote-modal          │
├──────────────────────────────────────────────────────────────────┤
│  Footer (Yna, уже есть)                                          │
└──────────────────────────────────────────────────────────────────┘
```

### 17.3 `ProductCard` — спека

**Размер:** `aspect-[4/3]` изображение + фиксированная высота карточки
**420 px** (чтобы grid не плясал при разной длине названий).

**Anatomy:**

```
┌──────────────────────────────┐  ← rounded-2xl, shadow-sm
│  ┌────────────────────────┐  │     bg-white, hover:-translate-y-1
│  │                        │  │     hover:shadow-md
│  │   Image (4:3)          │  │
│  │                        │  │
│  │   [Badge Хит/Новинка]  │  │  ← top-left, rounded-full, brand-orange
│  │                        │  │
│  │                   [♡]  │  │  ← top-right, white/80 backdrop-blur
│  │                        │  │     hover:fill-red-500
│  └────────────────────────┘  │
│                              │
│  ОВЕРЛАЙН: ПОЛИГРАФИЯ         │  ← 11px Manrope 600 uppercase,
│                              │     tracking-[0.22em], text-neutral-500
│  Визитки «Стандарт»          │  ← h3 Rubik 700, clamp(1.1rem,1.8vw,1.35rem)
│  на мелованной бумаге        │     line-clamp-2
│                              │
│  от 1 700 ₽ · 1000 шт        │  ← text-brand-orange font-bold
│                              │     Rubik 700, text-xl
│                              │
│  ┌──────────────────────┐    │
│  │  В корзину →         │    │  ← rounded-full brand-orange,
│  └──────────────────────┘    │     w-full на hover
└──────────────────────────────┘
```

**Варианты CTA по `pricing_mode`:**

| Режим | Текст кнопки | Иконка | Вариант |
|---|---|---|---|
| `fixed` | «В корзину» | `ShoppingCart` | `primary` (brand-orange) |
| `calculator` | «Рассчитать» | `Calculator` | `primary` (brand-orange) |
| `quote` | «Заказать расчёт» | `FileText` | `outline` (border-brand-orange) |

**Форматирование цены (PriceTag):**

```tsx
pricing_mode === "fixed"      → «1 700 ₽» (жирно, без префикса)
pricing_mode === "calculator" → «от 1 700 ₽»
pricing_mode === "quote"      → «По запросу» (тёмно-серый, не оранжевый)
```

**Hover-state:**
- `-translate-y-1` (6 ms ease-out)
- `shadow-md` (из `shadow-sm`)
- Если 2+ фото в `product_images` — кроссфейд ко второй картинке (300 ms)
- Заголовок → `text-brand-orange`

**Badge'ы:**
- `is_new` → «Новинка» (success green)
- `is_featured` → «Хит» (brand-orange)
- `is_on_sale` (старая цена > новой) → «-XX%» (danger red)
- Если `has_installation=true` → иконка `Wrench` в правом нижнем углу
  изображения с tooltip «Монтаж включён»

### 17.4 `FilterSidebar` — спека

**Desktop (`≥lg`):** sticky sidebar, `w-[280px]`, `top-24`,
отдельный `<aside>` в `<nav aria-label="Фильтры">`.

**Mobile (`<lg`):** скрыт. Появляется кнопка «Фильтры» в `CatalogToolbar`
→ открывает `<Sheet side="bottom">` (Radix Dialog + slide-up).
Внутри Sheet — тот же состав фильтров + sticky footer `[Сбросить]
[Показать N]`.

**Состав (в порядке сверху вниз):**

1. **Цена** — range slider (Radix `Slider` + 2 number inputs), шаг 500 ₽,
   min/max читается из `get_product_facets()` RPC.
2. **Режим оплаты** (новое для 2х2):
   - ☐ Фиксированная цена (fixed)
   - ☐ С калькулятором (calculator)
   - ☐ По запросу (quote)
3. **Характеристики** (динамически из facets):
   - ☐ Монтаж включён
   - ☐ Новинки
   - ☐ Со скидкой
4. **Бренды / материалы** (если есть) — collapsed accordion, показывать
   только если `facets.brands.length > 0`.
5. Кнопка `[Сбросить фильтры]` (text-button, только если активны фильтры).

**Визуал:**
- Каждая группа — Radix `Accordion.Item`, стрелка `ChevronDown`
- Чекбоксы — кастомные (Radix `Checkbox`), оранжевый check,
  `rounded` 4 px, ×16 px
- При активном фильтре — count справа серым «(12)»
- Accordion всегда `defaultValue="price"` — первая группа открыта

### 17.5 `CatalogToolbar` — спека

```
┌──────────────────────────────────────────────────────────────┐
│  [⚙ Фильтры]  50 услуг         Сортировка: Популярные ▼      │
│  (lg:hidden)                                                 │
└──────────────────────────────────────────────────────────────┘
```

- **Сортировка** — Radix `Select`, варианты: «Популярные»,
  «Сначала дешёвые», «Сначала дорогие», «Новинки».
  **Значения — строковые константы `popular | price_asc | price_desc | newest`**
  (D-084 — контракт с `list_products` RPC).
- **Вид** (grid/list) — **убираем** в Этапе 2. Только grid.
  Добавим list в Этапе 4, если пользователь попросит.

### 17.6 `CategoryChips` — спека

Горизонтальная полоса чипсов над сеткой. На мобиле — `overflow-x-auto`,
scroll-snap. На десктопе — `flex-wrap`.

```
[ Все · 50 ]  [ Полиграфия · 8 ]  [ Наружная реклама · 7 ] ...
```

- Активный чип: `bg-brand-orange text-white shadow-sm`
- Неактивный: `bg-white text-brand-dark border border-neutral-200`
- `rounded-full`, `px-5 py-2.5`, Manrope 600
- Клик → `?category=<slug>` через `useRouter().push` (shallow)
- Счётчик `· 8` — мелкий, text-neutral-400 / text-white/70

### 17.7 Пустое состояние каталога

Когда фильтры вернули 0 результатов:

```
┌──────────────────────────────────────┐
│           ╱ ╲                        │
│          ╱   ╲   (Lucide SearchX)    │
│         ╱     ╲      64 px           │
│                                      │
│   По вашему запросу ничего           │
│   не найдено                         │
│                                      │
│   Попробуйте убрать часть фильтров   │
│   или воспользуйтесь поиском         │
│                                      │
│   [Сбросить фильтры]                 │
└──────────────────────────────────────┘
```

- Контейнер: `py-24 text-center`
- Иконка: `text-neutral-300`
- H3: `Rubik 700`, `text-2xl`, `text-brand-dark`
- Параграф: `text-neutral-500`, `max-w-md mx-auto`
- Кнопка: `Button variant="outline"`, ведёт на `/catalog` без query

### 17.8 Пагинация

- **24 товара на странице** (совпадает с `per_page` дефолтом в My).
- Компонент `CatalogPagination` — 5 кнопок: `‹ 1 … 5 6 7 … 10 ›`
- Активная страница — `bg-brand-orange text-white rounded-lg`
- URL: `?page=N` (первая страница — без параметра)
- `<link rel="prev">` / `<link rel="next">` — через `generateMetadata`
- SSR-пагинация (каждая страница — отдельный URL для SEO), не infinite scroll

---

## 18. Карточка товара `/product/[slug]` — layout

### 18.1 Сетка

```
┌─────────────────────────────────────────────────────────────┐
│  Breadcrumbs: Главная / Каталог / Полиграфия / Визитки      │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────── Gallery 60% ──────────┐ ┌── Info+CTA 40% ──┐  │
│  │                                  │ │                  │  │
│  │   ┌────────────────────────┐    │ │ ОВЕРЛАЙН         │  │
│  │   │                        │    │ │ КАТЕГОРИЯ         │  │
│  │   │   Main image           │    │ │                  │  │
│  │   │   aspect-[4/3]         │    │ │ H1 название       │  │
│  │   │                        │    │ │                  │  │
│  │   └────────────────────────┘    │ │ ★★★★★ 4.8 (12)    │  │
│  │   [▫][▫][▫][▫] thumbs           │ │                  │  │
│  │                                  │ │ от 1 700 ₽        │  │
│  │                                  │ │ 2 400 ₽           │  │
│  │                                  │ │                  │  │
│  │                                  │ │ ─── Калькулятор ─ │  │
│  │                                  │ │ (если calc)      │  │
│  │                                  │ │                  │  │
│  │                                  │ │ [В корзину]      │  │
│  │                                  │ │ [Купить в 1 клик]│  │
│  │                                  │ │ [♡ В избранное]  │  │
│  │                                  │ │                  │  │
│  │                                  │ │ ✓ Доставка СДЭК  │  │
│  │                                  │ │ ✓ Монтаж         │  │
│  │                                  │ │ ✓ Гарантия 2 года│  │
│  │                                  │ └──────────────────┘  │
│  └──────────────────────────────────┘                      │
├─────────────────────────────────────────────────────────────┤
│  Tabs: [Описание] [Характеристики] [Отзывы] [Доставка]      │
├─────────────────────────────────────────────────────────────┤
│  «С этим покупают» — grid 4 ProductCard (same category)     │
├─────────────────────────────────────────────────────────────┤
│  CTA-полоска: «Нужна консультация?» + телефон               │
└─────────────────────────────────────────────────────────────┘
```

### 18.2 `ProductGallery` — спека

- **Desktop:** главное фото `aspect-[4/3]`, `rounded-2xl`, thumbnails
  под ним `flex gap-2` (4-5 фото по 80 px). Клик на thumb → смена главного.
  Клик на главное → Lightbox (Radix Dialog fullscreen, Embla swipe).
- **Mobile:** свайп-слайдер через Embla Carousel (уже в репе Yna), высота
  `aspect-[4/3]`, dots-индикатор снизу. Без lightbox (на мобиле
  fullscreen избыточен).
- **Zoom:** на десктопе при hover главного фото — `scale-110` + cursor-zoom-in.
  Это мягкий зум без lupe-компонента (lupa — Этап 4, если попросят).

### 18.3 `ProductInfo` — спека

```tsx
<div className="lg:sticky lg:top-24 space-y-6">
  {/* Overline */}
  <div className="text-[11px] uppercase tracking-[0.22em] text-neutral-500 font-semibold">
    {category.name}
  </div>

  {/* H1 */}
  <h1 className="font-display font-bold text-[clamp(1.75rem,3.5vw,2.5rem)] leading-tight text-brand-dark">
    {product.name}
  </h1>

  {/* Rating */}
  <div className="flex items-center gap-2">
    <Stars value={4.8} />
    <a href="#reviews" className="text-sm text-neutral-500 hover:text-brand-orange">
      12 отзывов
    </a>
  </div>

  {/* PriceTag */}
  <div className="flex items-baseline gap-3">
    <span className="text-4xl font-display font-bold text-brand-orange tabular-nums">
      от 1 700 ₽
    </span>
    {oldPrice && (
      <span className="text-lg text-neutral-400 line-through tabular-nums">
        2 400 ₽
      </span>
    )}
  </div>

  {/* Short description */}
  <p className="text-base text-neutral-600 leading-relaxed">
    {product.short_description}
  </p>

  {/* Calculator (if pricing_mode=calculator) */}
  {pricing_mode === "calculator" && <Calculator config={calculator_config} />}

  {/* CTAs */}
  <div className="flex flex-col gap-3">
    <Button size="lg" className="w-full rounded-full">В корзину</Button>
    <Button size="lg" variant="outline" className="w-full rounded-full">
      Купить в 1 клик
    </Button>
  </div>

  {/* Trust list */}
  <ul className="space-y-2 pt-4 border-t border-neutral-200">
    <li className="flex gap-2 text-sm text-neutral-600">
      <Check className="text-success w-5 h-5" />
      Доставка СДЭК по всей России
    </li>
    ...
  </ul>
</div>
```

### 18.4 `ProductCalculator` — универсальный движок

> Калькулятор читает `calculator_config.fields[]` из БД и рендерит форму.
> Всегда одна и та же структура, но разные поля для разных `pricing_mode`.

**Кейсы (D-083, D-085):**

#### 1. `per_tiraj_tier` — тиражная ступень (визитки)

```
┌─── Тираж ────────────────┐
│ ○ 100 шт    — 700 ₽      │  ← RadioGroup, рендер из tiers[]
│ ○ 500 шт    — 1 200 ₽    │     Активная опция:
│ ● 1 000 шт  — 1 700 ₽    │     bg-brand-orange-soft, border-brand-orange
│ ○ 2 000 шт  — 3 000 ₽    │
│ ○ 5 000 шт  — 6 500 ₽    │
└──────────────────────────┘
       ▼ live-update
  Итого: 1 700 ₽
```

- Formdata: `{ tiraj: "1000" }` (string — матчится к `tier.qty`)
- API call debounced 300 ms → `/api/products/calculate`

#### 2. `per_area` — по площади (баннеры)

```
┌─── Ширина, м ─┐  ┌─── Высота, м ─┐
│ [   3.00   ] │  │ [   2.00   ] │  ← numeric input, шаг 0.1
└──────────────┘  └──────────────┘
       ▼
   Площадь: 6.00 м²
   Цена за м²: 850 ₽
   ─────────────
   Итого: 5 100 ₽
```

- Formdata: `{ width: 3, height: 2 }`
- min/max из `calculator_config.limits`

#### 3. `per_length` — по периметру (световые буквы)

```
┌─── Периметр, см ────────────────────┐
│ [■■■■■■■■■■■■■■■■──] 300 см          │  ← Radix Slider + number input
└─────────────────────────────────────┘
       ▼
   Цена за см: 150 ₽
   ─────────────
   Итого: 45 000 ₽
```

- Formdata: `{ perimeter: 300 }`
- диапазон 50–1000 см

#### 4. `per_unit` — по штукам (листовки, если нет тиражных ступеней)

```
┌─── Количество ────────┐
│ [−]  [ 500 ]  [+]     │  ← QuantityStepper
└──────────────────────┘
```

- Formdata: `{ quantity: 500 }`

**Общее поведение:**

- Калькулятор в контейнере `rounded-2xl bg-brand-orange-soft/40 p-6`
- Заголовок «Рассчитать стоимость» — Rubik 700, text-lg
- При изменении поля — debounce 300 ms → API → live-update цены
- Loading: лёгкий spinner справа от «Итого»
- Ошибки валидации — text-danger под полем
- Breakdown (если `result.breakdown[]` непустой) — раскрывается через
  Accordion «Как считается» под итогом
- Форма контролируется React Hook Form + Zod (схема генерится из
  `calculator_config.fields`)

### 18.5 `ProductTabs` — спека

Radix `Tabs`, 4 таба, активный — `border-b-2 border-brand-orange text-brand-orange`.

1. **Описание** — sanitized HTML из `product.description`
2. **Характеристики** — `<dl>` двухколоночная из `product_attributes`
   (ключ-значение)
3. **Отзывы** — список ReviewCard + форма (reCaptcha добавит marketer).
   Заглушка: «Пока нет отзывов. Будьте первым» + форма
4. **Доставка и оплата** — статический markdown из CMS

На мобиле `<lg` — tabs → `Accordion`.

### 18.6 `RelatedProducts`

- Блок под tabs, `py-16 section-padding`
- H2 «С этим покупают» — Rubik 700, `text-3xl`
- 4 `ProductCard`'а в grid (тот же компонент что в каталоге)
- Данные — из RPC `get_related_products(product_id, limit: 4)`

### 18.7 Mobile sticky bottom bar

На мобиле `<lg`, при скролле ≥ 300 px, снизу появляется:

```
┌────────────────────────────────────────┐
│  от 1 700 ₽   [В корзину]   [♡]        │
└────────────────────────────────────────┘
```

- `fixed bottom-0 inset-x-0 z-40`
- `bg-white/95 backdrop-blur-md border-t`
- `py-3 px-4`
- Slide-up анимация через Framer Motion
- Скрывается при клике на кнопку «В корзину» → toast

---

## 19. `OneClickModal` — спека

Radix `Dialog`, открывается на клик `[Купить в 1 клик]`.

```
┌───────────────────────────────────────┐
│                                   [✕] │
│                                       │
│   Купить в 1 клик                     │
│   Мы перезвоним через 15 минут        │
│                                       │
│   ┌─ Имя ──────────────────────┐     │
│   │ [ Иван Петров           ]  │     │
│   └────────────────────────────┘     │
│                                       │
│   ┌─ Телефон ──────────────────┐     │
│   │ [ +7 (___) ___-__-__    ]  │     │
│   └────────────────────────────┘     │
│                                       │
│   Товар: Визитки «Стандарт»           │
│   Цена: 1 700 ₽                       │
│                                       │
│   ┌───────────────────────────┐      │
│   │     Отправить заявку      │      │
│   └───────────────────────────┘      │
│                                       │
│   Отправляя, вы соглашаетесь          │
│   с политикой обработки данных        │
└───────────────────────────────────────┘
```

- `max-w-md`, `rounded-2xl`, `p-8`
- Формы — React Hook Form + Zod
- Маска телефона — `react-imask` или inline handler
- Submit → `POST /api/leads` (backend-developer сделает в Этапе 2)
  → toast «Заявка отправлена, мы перезвоним!» + close
- Loading — кнопка в `loading` state

## 20. `QuoteModal` — модалка «Заказать расчёт»

Появляется для `pricing_mode=quote` (стелы, фасады) или по кнопке
«Заказать расчёт» в калькуляторе при нестандартных размерах.

```
┌─────────────────────────────────────────┐
│                                     [✕] │
│                                          │
│   Заказать индивидуальный расчёт         │
│   Менеджер подготовит КП за 1 рабочий   │
│   день                                   │
│                                          │
│   ┌─ Имя * ────────────────────────┐    │
│   │ [                             ]│    │
│   └────────────────────────────────┘    │
│   ┌─ Телефон * ────────────────────┐    │
│   │ [ +7 (___) ___-__-__        ] │    │
│   └────────────────────────────────┘    │
│   ┌─ Email ────────────────────────┐    │
│   │ [                             ]│    │
│   └────────────────────────────────┘    │
│   ┌─ Параметры (если применимо) ───┐    │
│   │ Размер: [ __ × __ ] м          │    │
│   │ Материал: [Select ▼]           │    │
│   │ Адрес монтажа: [          ]    │    │
│   └────────────────────────────────┘    │
│   ┌─ Комментарий ──────────────────┐    │
│   │ [                             ]│    │
│   │ [                             ]│    │
│   └────────────────────────────────┘    │
│   ┌─ Прикрепить файл (макет) ─────┐    │
│   │ [📎 Перетащите или выберите ] │    │
│   └────────────────────────────────┘    │
│                                          │
│   [Отправить заявку]                     │
└─────────────────────────────────────────┘
```

- `max-w-lg`, scroll внутри если не помещается
- Submit → `POST /api/quote` → запись в `calculation_requests`
- Upload файла — опционально (Supabase Storage, путь из Этапа 1)

---

## 21. Компоненты Этапа 2 — чеклист для frontend-developer

### Новые компоненты (в `components/shop/` или `components/catalog/`)

- [ ] `ProductCard.tsx` — карточка услуги (п. 17.3)
- [ ] `PriceTag.tsx` — форматирование RUB + режимы (fixed/from/quote)
- [ ] `CategoryChips.tsx` — горизонтальная полоса чипсов (п. 17.6)
- [ ] `FilterSidebar.tsx` — desktop sidebar (п. 17.4)
- [ ] `FilterSheet.tsx` — mobile Sheet с теми же фильтрами
- [ ] `CatalogToolbar.tsx` — count + sort select (п. 17.5)
- [ ] `CatalogPagination.tsx` — 5-кнопочная пагинация (п. 17.8)
- [ ] `CatalogGrid.tsx` — responsive grid обёртка
- [ ] `CatalogEmpty.tsx` — пустое состояние (п. 17.7)
- [ ] `ProductGallery.tsx` — Embla + thumbs + zoom (п. 18.2)
- [ ] `ProductInfo.tsx` — правая колонка карточки (п. 18.3)
- [ ] `ProductCalculator.tsx` — универсальный движок (п. 18.4)
- [ ] `CalculatorField.tsx` — поле калькулятора (radio/slider/stepper/numeric)
- [ ] `ProductTabs.tsx` — tabs / accordion на мобилке (п. 18.5)
- [ ] `RelatedProducts.tsx` — блок «С этим покупают» (п. 18.6)
- [ ] `StickyMobileBar.tsx` — bottom bar на мобиле (п. 18.7)
- [ ] `OneClickModal.tsx` — модалка 1-клика (п. 19)
- [ ] `QuoteModal.tsx` — модалка заказа расчёта (п. 20)
- [ ] `Breadcrumbs.tsx` — хлебные крошки + JSON-LD (если нет)

### Расширения базовых Yna-компонентов

- [ ] `Badge.tsx` — добавить variant `success` (новинка), `danger` (скидка)
- [ ] `Button.tsx` — убедиться что есть `outline` и `ghost` варианты
- [ ] `Sheet.tsx` — из shadcn/ui (Radix `Dialog` с slide-анимацией)
- [ ] `Dialog.tsx` — из shadcn/ui, адаптированный под наши токены
- [ ] `Tabs.tsx` — из shadcn/ui
- [ ] `Accordion.tsx` — уже есть, использовать в фильтрах
- [ ] `Select.tsx` — из shadcn/ui (для сортировки)
- [ ] `Slider.tsx` — из shadcn/ui (range для цены, калькулятор)
- [ ] `Checkbox.tsx` — из shadcn/ui
- [ ] `RadioGroup.tsx` — из shadcn/ui (калькулятор)
- [ ] `Input.tsx` — общий инпут
- [ ] `QuantityStepper.tsx` — -/+/число

### Контракты API (из handoff 001)

Компоненты вызывают **только эти RPC/роуты** — никаких прямых Supabase-запросов
в client-components:

- `POST /api/products/list` → `list_products(...)` — возвращает
  `{ products[], total_count }`
- `GET /api/categories` → `get_category_tree()` — дерево категорий
- `GET /api/products/facets?category_id&search` → `get_product_facets()`
  для динамических фильтров
- `GET /api/products/[slug]` — один товар + images + parameters
- `POST /api/products/calculate` → `calculate_product_price(product_id, params)`
- `GET /api/products/[id]/related` → `get_related_products(product_id, 4)`
- `POST /api/leads` — «купить в 1 клик»
- `POST /api/quote` — «заказать расчёт» (запись в `calculation_requests`)

---

## 22. Анимации Этапа 2 (framer-motion)

Всё через `tokens.easings.softOut` = `[0.22, 1, 0.36, 1]`.

| Элемент | Анимация | Длительность |
|---|---|---|
| CatalogGrid появление | `stagger` по карточкам, `y: 20 → 0`, `opacity: 0 → 1` | 0.5 s, stagger 0.06 |
| ProductCard hover | `-translate-y-1` + `shadow-md` | 0.3 s |
| Hover swap image | opacity crossfade | 0.5 s |
| FilterSheet slide-up | `y: 100% → 0` (Radix Dialog) | 0.35 s |
| OneClickModal / QuoteModal | `scale: 0.95 → 1` + `opacity: 0 → 1` | 0.25 s |
| Calculator price update | `scale: [1, 1.08, 1]` + `color flash` | 0.35 s |
| Sticky mobile bar | `y: 100% → 0` при scroll > 300 | 0.3 s |
| Toast «Добавлено» | `y: 20 → 0` + shake 2 ms | 0.4 s |
| Empty state icon | `rotate: 0 → 5 → -5 → 0` бесконечно | 3 s |

**Правила:**
- Все motion-компоненты обёрнуты в `useReducedMotion()` — при включенном
  prefers-reduced-motion, анимации либо убираются, либо остаются только
  opacity (без transform).
- Stagger — только на каталожной сетке, **не** на карточке товара
  (на карточке — монолитный appear, stagger бы выглядел суетливо).

---

**Последнее обновление:** 2026-04-15, designer (Этап 2)
