/**
 * Клиентская копия ролевой матрицы — БЕЗ server-only импорта.
 *
 * Используется в `AdminSidebar` (client component) для фильтрации
 * пунктов меню. Должна быть СИНХРОНИЗИРОВАНА с
 * `lib/auth/permissions.ts` (источник истины — там).
 *
 * Изменения в одном файле требуют ручной правки во втором — простой
 * способ избежать второго запроса к серверу при рендере sidebar и
 * утечки server-only имён в client bundle. Тип общий — берётся из
 * `lib/auth/permissions.ts` (он не содержит server-only кода и
 * безопасен для импорта).
 */
import type { UserRole } from "@/types/database";
import type { AdminResource } from "@/lib/auth/permissions";

export type ClientResource = AdminResource;

const RESOURCE_ROLES: Record<ClientResource, readonly UserRole[]> = {
  dashboard: ["owner", "manager"],
  leads: ["owner"],
  promos: ["owner", "manager"],
  reviews: ["owner", "manager"],
  blog: ["owner", "manager", "content"],
  portfolio: ["owner", "manager", "content"],
  "portfolio.categories": ["owner", "manager", "content"],
  team: ["owner", "manager", "content"],
  promotions: ["owner", "manager", "content"],
  services: ["owner"],
  "services.categories": ["owner"],
  "content.cms": ["owner", "content"],
  seo: ["owner"],
  "settings.site": ["owner"],
  "settings.account": ["owner", "manager", "content"],
  users: ["owner"],
};

export function canAccessByRole(
  role: UserRole,
  resource: ClientResource | readonly ClientResource[],
): boolean {
  const list: readonly ClientResource[] = Array.isArray(resource)
    ? (resource as readonly ClientResource[])
    : [resource as ClientResource];
  return list.some((r) => RESOURCE_ROLES[r]?.includes(role) ?? false);
}
