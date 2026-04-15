/**
 * Дизайн-токены бренда «2×2»
 *
 * Источник истины — `app/globals.css` (@theme inline). Эти константы — типизированное
 * зеркало для использования в TSX-коде, где `tailwindcss`-классов недостаточно
 * (inline-стили motion, JSON-LD theme_color, конфиги графиков и т. д.).
 *
 * Изменения здесь и в globals.css должны идти парами. При добавлении токенов
 * сначала правим CSS (@theme), потом зеркалим сюда.
 */

// ---------------------------------------------------------------------------
// Цвета
// ---------------------------------------------------------------------------

export const colors = {
  // Фирменная палитра (зафиксирована в Yna globals.css)
  brand: {
    orange: "#FF6B00",
    orangeHover: "#EA580C", // tailwind `orange-600` — используется в btn hover
    orangeSoft: "#FFE8D6", // tint для badge/trust-bar
    dark: "#1A1A1A",
    gray: "#F5F5F5",
  },

  // Расширения для e-commerce (добавлены designer'ом для этапов 2–6)
  // Когда добавляются сюда — добавляются и в @theme inline
  surface: {
    white: "#FFFFFF",
    cream: "#FFF9F5", // фон Hero («warm white»)
    creamDeep: "#FFF5EF", // нижний стоп hero-градиента
    paper: "#FAFAFA", // фон карточек каталога в светлой теме
  },

  border: {
    subtle: "#E5E5E5", // gray-200
    medium: "#D4D4D4", // gray-300
    strong: "#1A1A1A", // brand-dark
  },

  text: {
    primary: "#1A1A1A", // brand-dark
    secondary: "#525252", // neutral-600
    muted: "#737373", // neutral-500
    placeholder: "#A3A3A3", // neutral-400
    inverse: "#FFFFFF",
  },

  state: {
    success: "#16A34A",
    warning: "#F59E0B",
    danger: "#DC2626",
    info: "#2563EB",
  },

  // Статусы заказов / заявок (для админки Этапа 6–8)
  status: {
    new: "#2563EB",
    inProgress: "#F59E0B",
    completed: "#16A34A",
    cancelled: "#6B7280",
    quoted: "#7C3AED",
  },
} as const;

// ---------------------------------------------------------------------------
// Типографика
// ---------------------------------------------------------------------------

/**
 * Шрифты подключены через `next/font/google` в `app/layout.tsx`:
 *   Manrope  → `--font-manrope`  (sans, body)
 *   Rubik    → `--font-display`  (display, h1–h3)
 *
 * В Tailwind используем CSS-переменные через `[font-family:var(--font-display)]`
 * или через класс `font-sans` (у Manrope это default из @theme).
 */
export const fonts = {
  sans: "var(--font-manrope), system-ui, -apple-system, Segoe UI, sans-serif",
  display: "var(--font-display), var(--font-manrope), system-ui, sans-serif",
} as const;

/**
 * Fluid-типографика Yna: `clamp(min, preferred-vw, max)`.
 * Значения взяты из HeroSection `text-[clamp(...)]`.
 */
export const typography = {
  hero1: "clamp(2.4rem, 8.5vw, 5.5rem)", // Hero h1 line — «Мы создаём»
  hero2: "clamp(1.85rem, 5.5vw, 3.25rem)", // Hero h1 line — «которую замечают»
  h1: "clamp(2rem, 5vw, 3.5rem)",
  h2: "clamp(1.6rem, 3.5vw, 2.5rem)",
  h3: "clamp(1.25rem, 2.2vw, 1.75rem)",
  h4: "clamp(1.05rem, 1.5vw, 1.25rem)",
  bodyLg: "1.125rem", // 18
  body: "1rem", // 16
  bodySm: "0.875rem", // 14
  caption: "0.75rem", // 12
  overline: "0.6875rem", // 11 — `tracking-[0.22em] uppercase`
} as const;

export const fontWeights = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
  black: 900,
} as const;

export const letterSpacings = {
  tightest: "-0.04em",
  tight: "-0.02em",
  normal: "0",
  wide: "0.04em",
  overline: "0.22em", // Hero «РЕКЛАМНОЕ АГЕНТСТВО · ХАНТЫ-МАНСИЙСК»
} as const;

// ---------------------------------------------------------------------------
// Spacing / layout
// ---------------------------------------------------------------------------

/**
 * Контейнер из Yna globals.css — max 80rem (1280px), safe-area inset'ы.
 * Паддинги уже в CSS-переменных @theme, здесь только reference-значения.
 */
export const container = {
  maxWidth: "80rem",
  padding: {
    default: "1rem", // mobile
    sm: "2rem", // ≥640
    lg: "4rem", // ≥1024
    xl: "5rem", // ≥1280
  },
} as const;

export const section = {
  paddingY: "4rem", // section-padding py-16
  paddingYLg: "6rem", // md:py-24
} as const;

export const spacing = {
  /** базовая единица = 0.25rem (Tailwind default) */
  xxs: "0.25rem", // 4
  xs: "0.5rem", // 8
  sm: "0.75rem", // 12
  md: "1rem", // 16
  lg: "1.5rem", // 24
  xl: "2rem", // 32
  xxl: "3rem", // 48
  xxxl: "4rem", // 64
} as const;

// ---------------------------------------------------------------------------
// Радиусы (Yna использует rounded-lg для кнопок, rounded-2xl для карточек, rounded-full для pill)
// ---------------------------------------------------------------------------

export const radii = {
  none: "0",
  sm: "0.375rem", // 6
  md: "0.5rem", // 8 — input
  lg: "0.75rem", // 12 — button (Yna btn-primary)
  xl: "1rem", // 16
  "2xl": "1.25rem", // 20 — card (Yna Card.tsx)
  "3xl": "1.5rem", // 24
  pill: "9999px", // Hero CTA `rounded-full`
  full: "9999px",
} as const;

// ---------------------------------------------------------------------------
// Тени (Yna: shadow-sm/md, кастом shadow-brand-orange/25 для CTA)
// ---------------------------------------------------------------------------

export const shadows = {
  none: "none",
  xs: "0 1px 2px 0 rgba(0, 0, 0, 0.04)",
  sm: "0 1px 3px 0 rgba(0, 0, 0, 0.06), 0 1px 2px -1px rgba(0, 0, 0, 0.04)",
  md: "0 4px 12px -2px rgba(0, 0, 0, 0.08), 0 2px 6px -2px rgba(0, 0, 0, 0.05)",
  lg: "0 10px 30px -8px rgba(0, 0, 0, 0.12), 0 6px 14px -6px rgba(0, 0, 0, 0.08)",
  xl: "0 20px 40px -12px rgba(0, 0, 0, 0.18)",
  // Фирменное «оранжевое свечение» под CTA Hero — `shadow-xl shadow-brand-orange/25`
  glowBrand: "0 20px 40px -10px rgba(255, 107, 0, 0.25)",
  glowBrandSoft: "0 10px 24px -8px rgba(255, 107, 0, 0.18)",
  // Карточка портфолио на hover
  lift: "0 18px 40px -16px rgba(26, 26, 26, 0.18)",
} as const;

// ---------------------------------------------------------------------------
// Blur / эффекты
// ---------------------------------------------------------------------------

export const blurs = {
  none: "0",
  sm: "4px",
  md: "12px",
  lg: "24px",
  xl: "48px", // Hero blobs
  "2xl": "72px", // `blur-[72px]` из AbstractCluster
  "3xl": "96px",
} as const;

// ---------------------------------------------------------------------------
// Анимации
// ---------------------------------------------------------------------------

/**
 * Easing curves из Yna HeroSection: `[0.22, 1, 0.36, 1]` — soft out-expo.
 * Все новые компоненты должны использовать эти же функции для консистентности.
 */
export const easings = {
  /** Мягкий выход (Yna default) */
  softOut: [0.22, 1, 0.36, 1] as const,
  /** In-Out для long-running loops (blobs, typewriter) */
  easeInOut: "easeInOut" as const,
  /** Appear из framer-motion */
  easeOut: "easeOut" as const,
  linear: "linear" as const,
} as const;

export const durations = {
  instant: 0.15,
  fast: 0.3,
  base: 0.5,
  slow: 0.8,
  hero: 1.2, // Lenis scroll + typewriter start
} as const;

// ---------------------------------------------------------------------------
// Breakpoints (совпадают с Tailwind default)
// ---------------------------------------------------------------------------

export const breakpoints = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px",
} as const;

// ---------------------------------------------------------------------------
// Z-index шкала
// ---------------------------------------------------------------------------

export const zIndex = {
  base: 0,
  sticky: 10,
  header: 40,
  dropdown: 50,
  modal: 60,
  toast: 70,
  tooltip: 80,
  cursor: 90,
} as const;

// ---------------------------------------------------------------------------
// Noise background (SVG fractal — фирменная фактура Yna)
// ---------------------------------------------------------------------------

/**
 * Fractal noise, использованный в HeroSection. Дублируется сюда, чтобы любые
 * новые экраны (чекаут, карточка товара hero, 404) могли переиспользовать.
 */
export const noiseBackground = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`;

// ---------------------------------------------------------------------------
// Экспорт агрегата
// ---------------------------------------------------------------------------

export const tokens = {
  colors,
  fonts,
  typography,
  fontWeights,
  letterSpacings,
  container,
  section,
  spacing,
  radii,
  shadows,
  blurs,
  easings,
  durations,
  breakpoints,
  zIndex,
  noiseBackground,
} as const;

export type Tokens = typeof tokens;
export default tokens;
