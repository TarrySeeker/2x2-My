/**
 * Analytics — единый фасад для трекинга событий «2х2».
 *
 * Поддерживает Яндекс.Метрику (ym), GA4 (gtag) и dataLayer для e-commerce.
 * Интеграция подключается через env-переменные:
 *   NEXT_PUBLIC_YM_ID           — ID счётчика Яндекс.Метрики (например "99999999")
 *   NEXT_PUBLIC_GA4_ID          — ID GA4 (например "G-XXXXXXXXXX")
 *
 * Если ID не заданы, функции становятся no-op (безопасно для dev/preview).
 *
 * Использование:
 *   import { trackEvent, EVENTS } from "@/lib/analytics";
 *   trackEvent(EVENTS.add_to_cart, { product_id: "vizitki", price: 1700 });
 *
 * Полный реестр событий и целей — см. metrics.md в корне репозитория 1clin.
 */

export type AnalyticsParams = Record<string, unknown> & {
  ecommerce?: Record<string, unknown>;
  value?: number;
  currency?: string;
};

/**
 * Реестр всех событий. Используй именно эти константы — любое событие,
 * которого нет в реестре, должно быть сначала добавлено сюда.
 *
 * Имена совпадают с целями в Яндекс.Метрике (см. metrics.md §1).
 */
export const EVENTS = {
  // Макро-конверсии
  purchase_complete: "purchase_complete",
  calc_request_submit: "calc_request_submit",
  one_click_submit: "one_click_submit",
  contact_form_submit: "contact_form_submit",
  phone_click: "phone_click",
  whatsapp_click: "whatsapp_click",
  telegram_click: "telegram_click",

  // Микро-конверсии
  view_product: "view_product",
  add_to_cart: "add_to_cart",
  remove_from_cart: "remove_from_cart",
  begin_checkout: "begin_checkout",
  checkout_delivery: "checkout_delivery",
  checkout_payment: "checkout_payment",
  calculator_start: "calculator_start",
  calculator_result: "calculator_result",
  email_subscribe: "email_subscribe",
  view_portfolio: "view_portfolio",
  view_category: "view_category",
  search_submit: "search_submit",
  promo_applied: "promo_applied",

  // Cart UI (Stage 3.1)
  cart_view: "cart_view",
  cart_icon_click: "cart_icon_click",
  cart_item_remove: "cart_item_remove",
  cart_clear: "cart_clear",
  checkout_start: "checkout_start",
  promo_apply: "promo_apply",

  // Checkout (Stage 3.2)
  checkout_view: "checkout_view",
  checkout_submit: "checkout_submit",
  order_created: "order_created",
  order_error: "order_error",
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];

type WindowWithAnalytics = Window & {
  ym?: (counterId: number, action: string, ...args: unknown[]) => void;
  gtag?: (...args: unknown[]) => void;
  dataLayer?: Record<string, unknown>[];
};

const YM_ID = toNumber(process.env.NEXT_PUBLIC_YM_ID);
const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID ?? "";

function toNumber(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getWin(): WindowWithAnalytics | null {
  if (typeof window === "undefined") return null;
  return window as WindowWithAnalytics;
}

/**
 * Основной API для отправки события во все подключённые системы.
 * Безопасно вызывать на сервере — там станет no-op.
 */
export function trackEvent(name: EventName | string, params?: AnalyticsParams): void {
  const win = getWin();
  if (!win) return;

  // Яндекс.Метрика
  if (YM_ID && typeof win.ym === "function") {
    try {
      win.ym(YM_ID, "reachGoal", name, params);
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[analytics] ym reachGoal failed", err);
      }
    }
  }

  // Google Analytics 4
  if (GA4_ID && typeof win.gtag === "function") {
    try {
      win.gtag("event", name, params);
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[analytics] gtag event failed", err);
      }
    }
  }

  // dataLayer для e-commerce (enhanced ecommerce модель)
  if (params?.ecommerce) {
    win.dataLayer = win.dataLayer ?? [];
    win.dataLayer.push({ event: name, ecommerce: params.ecommerce });
  }

  // Диагностика в dev — видно в DevTools, в прод не попадает
  if (process.env.NODE_ENV !== "production") {
    console.info("[analytics]", name, params ?? {});
  }
}

/**
 * Shortcut для просмотра страницы (SPA-роуты).
 * Вызывать в клиентском layout при смене pathname.
 */
export function trackPageView(path: string, title?: string): void {
  const win = getWin();
  if (!win) return;

  if (YM_ID && typeof win.ym === "function") {
    try {
      win.ym(YM_ID, "hit", path, { title });
    } catch {}
  }

  if (GA4_ID && typeof win.gtag === "function") {
    try {
      win.gtag("event", "page_view", { page_path: path, page_title: title });
    } catch {}
  }
}

/**
 * Утилита для UTM: извлекает utm_* и gclid/yclid из location.search,
 * сохраняет в sessionStorage на время сессии. Полезно для last-touch атрибуции.
 */
export function captureUtm(): void {
  const win = getWin();
  if (!win) return;
  try {
    const params = new URLSearchParams(win.location.search);
    const keys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "gclid", "yclid"];
    const utm: Record<string, string> = {};
    for (const key of keys) {
      const value = params.get(key);
      if (value) utm[key] = value;
    }
    if (Object.keys(utm).length > 0) {
      win.sessionStorage.setItem("utm", JSON.stringify(utm));
    }
  } catch {}
}

export function getCapturedUtm(): Record<string, string> | null {
  const win = getWin();
  if (!win) return null;
  try {
    const raw = win.sessionStorage.getItem("utm");
    return raw ? (JSON.parse(raw) as Record<string, string>) : null;
  } catch {
    return null;
  }
}
