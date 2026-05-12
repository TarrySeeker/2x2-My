import "server-only";

import type { UserRole } from "@/types/database";

/**
 * Ролевая модель «2х2» — 2026-05-11.
 *
 * Уточнение клиента 2026-05-11 (вторая итерация): `manager` — это
 * МЕНЕДЖЕР ПО ПРОДАЖАМ. Ему нужны ТОЛЬКО Дашборд и Заявки, чтобы
 * обрабатывать обращения клиентов. Никакого доступа к контенту,
 * каталогу, отзывам, промокодам, портфолио и блогу.
 *
 * Матрица доступа (true = доступ есть):
 *
 *   Ресурс \ Роль                owner  manager  content
 *   dashboard                    ✓      ✓        ✗
 *   leads (заявки)               ✓      ✓        ✗
 *   promos (промокоды)           ✓      ✗        ✗
 *   reviews (отзывы)             ✓      ✗        ✗
 *   blog                         ✓      ✗        ✓
 *   portfolio                    ✓      ✗        ✓
 *   portfolio.categories         ✓      ✗        ✓
 *   team (команда)               ✓      ✗        ✓
 *   promotions (акции)           ✓      ✗        ✓
 *   services                     ✓      ✗        ✗
 *   services.categories          ✓      ✗        ✗
 *   content.cms (homepage,
 *      sections, pages, banners,
 *      menu, legal-pages,
 *      ui-strings, metadata)     ✓      ✗        ✓
 *   seo                          ✓      ✗        ✗
 *   settings.site                ✓      ✗        ✗
 *   settings.account             ✓      ✓        ✓
 *   users (создание/смена ролей) ✓      ✗        ✗
 *
 * NB про `manager`:
 *   До 2026-05-11 `manager` имел те же права что и `owner`.
 *   Первая попытка урезания дала менеджеру доступ к продажам +
 *   контент-каталогу — но клиент уточнил что менеджер по продажам
 *   ТОЛЬКО обрабатывает заявки. Контент — отдельная роль `content`.
 *
 * Source of truth — этот файл. Везде, где раньше был
 *   `requireAdmin(["owner", "manager"])` для запрещённого ресурса
 *   нужно использовать `requireOwner()` или `requireRoles(rolesFor(resource))`.
 */

export type AdminResource =
  // Sidebar / общие
  | "dashboard"
  // Заявки и продажи
  | "leads"
  | "promos"
  | "reviews"
  // Контент-каталог (доступен manager'у — заказы клиентам формирует он)
  | "blog"
  | "portfolio"
  | "portfolio.categories"
  | "team"
  | "promotions"
  // Только owner
  | "services"
  | "services.categories"
  | "content.cms"
  | "seo"
  | "settings.site"
  // Все авторизованные могут менять свой пароль
  | "settings.account"
  // Управление пользователями
  | "users";

const RESOURCE_ROLES: Record<AdminResource, readonly UserRole[]> = {
  dashboard: ["owner", "manager"],
  leads: ["owner", "manager"],
  promos: ["owner"],
  reviews: ["owner"],
  blog: ["owner", "content"],
  portfolio: ["owner", "content"],
  "portfolio.categories": ["owner", "content"],
  team: ["owner", "content"],
  promotions: ["owner", "content"],
  services: ["owner"],
  "services.categories": ["owner"],
  "content.cms": ["owner", "content"],
  seo: ["owner"],
  "settings.site": ["owner"],
  "settings.account": ["owner", "manager", "content"],
  users: ["owner"],
};

/**
 * Список ролей, которым разрешён ресурс.
 * Если в `RESOURCE_ROLES` ресурс не указан — кидаем (защита от опечаток).
 */
export function rolesFor(resource: AdminResource): readonly UserRole[] {
  const roles = RESOURCE_ROLES[resource];
  if (!roles) {
    throw new Error(`[permissions] Unknown resource: ${resource}`);
  }
  return roles;
}

/** Имеет ли роль доступ к ресурсу. */
export function canAccess(role: UserRole, resource: AdminResource): boolean {
  return rolesFor(resource).includes(role);
}

/**
 * Куда редиректить пользователя без прав, исходя из его роли.
 * Не «/» — клиент потеряется. Возвращаем дашборд (для owner/manager)
 * либо первую доступную страницу (для content).
 */
export function fallbackPathFor(role: UserRole): string {
  switch (role) {
    case "owner":
      return "/admin/dashboard";
    case "manager":
      return "/admin/dashboard";
    case "content":
      return "/admin/blog";
    default:
      return "/admin/dashboard";
  }
}

/**
 * Утилита для UI-фильтрации (sidebar). Возвращает true, если у роли
 * есть доступ к перечисленным ресурсам (хотя бы к одному).
 */
export function canAccessAny(
  role: UserRole,
  resources: AdminResource[],
): boolean {
  return resources.some((r) => canAccess(role, r));
}
