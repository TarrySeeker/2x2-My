import type { AdminResource } from "@/lib/auth/permissions";

/**
 * Маппинг pathname → AdminResource.
 *
 * Используется в `app/admin/layout.tsx` для централизованной проверки
 * доступа: layout вычисляет ресурс по текущему URL и спрашивает у
 * `lib/auth/permissions.ts`, может ли пользователь с такой ролью
 * открыть страницу.
 *
 * Порядок имеет значение — проходим сверху вниз и берём первый матч.
 * Более специфичные пути должны идти ВЫШЕ общих:
 *   `/admin/content/services-categories` ДО `/admin/content/services`,
 *   `/admin/content/portfolio-categories` ДО `/admin/content/portfolio`,
 *   `/admin/settings/account`            ДО `/admin/settings`.
 *
 * Если pathname не подпадает ни под одну запись — возвращаем null.
 * Это допустимо для:
 *   - /admin/login (отсечён выше в layout),
 *   - /admin (корень, редирект),
 *   - /admin/dashboard, /admin/blog, /admin/promos —
 *     все они обрабатываются как доступные, проверка делается
 *     отдельной записью в матрице.
 *
 * 2026-05-12: ресурс `reviews` и правило `/admin/reviews` удалены вместе
 * с разделом «Отзывы».
 */

interface AccessRule {
  /** Префикс с обязательным `/admin/` началом. */
  prefix: string;
  /** Ресурс из ролевой матрицы. */
  resource: AdminResource;
}

const RULES: AccessRule[] = [
  // Settings / account (доступно всем) — должно быть ВЫШЕ /admin/settings.
  { prefix: "/admin/settings/account", resource: "settings.account" },
  { prefix: "/admin/settings", resource: "settings.site" },

  // Content/CMS — более специфичные пути СНАЧАЛА.
  { prefix: "/admin/content/services-categories", resource: "services.categories" },
  { prefix: "/admin/content/services", resource: "services" },
  { prefix: "/admin/content/portfolio-categories", resource: "portfolio.categories" },
  { prefix: "/admin/content/portfolio", resource: "portfolio" },
  { prefix: "/admin/content/team", resource: "team" },
  { prefix: "/admin/content/promotions", resource: "promotions" },
  { prefix: "/admin/content/settings", resource: "settings.site" },

  // Прочие CMS-разделы (homepage, sections, pages, banners, menu,
  // legal-pages, ui-strings, metadata) — общий префикс `/admin/content`.
  // ВАЖНО: должно идти ПОСЛЕ всех более специфичных правил выше.
  { prefix: "/admin/content", resource: "content.cms" },

  // SEO
  { prefix: "/admin/seo", resource: "seo" },

  // Заявки
  { prefix: "/admin/leads", resource: "leads" },

  // Простые разделы (просто префикс).
  { prefix: "/admin/promos", resource: "promos" },
  { prefix: "/admin/blog", resource: "blog" },
  { prefix: "/admin/dashboard", resource: "dashboard" },

  // Orders — таблица удалена, но страницы остались (рудимент).
  // Помечаем как leads-only — менеджер всё равно их не видит.
  { prefix: "/admin/orders", resource: "leads" },
];

export function resolveAccessForPath(pathname: string): AdminResource | null {
  for (const rule of RULES) {
    if (
      pathname === rule.prefix ||
      pathname.startsWith(rule.prefix + "/")
    ) {
      return rule.resource;
    }
  }
  return null;
}
