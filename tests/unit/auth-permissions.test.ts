/**
 * @vitest-environment node
 *
 * Unit-тесты для ролевой матрицы `lib/auth/permissions.ts`.
 * Покрывают каждый из 3-х ролей × все ресурсы — это «золотая таблица»,
 * любое изменение требует осознанной правки и здесь, и в комментарии
 * к `permissions.ts`, и в client-permissions.ts.
 *
 * Запускается БЕЗ моков БД — функции чисто синхронные.
 */
import { describe, it, expect } from "vitest";

import {
  canAccess,
  canAccessAny,
  rolesFor,
  fallbackPathFor,
  type AdminResource,
} from "@/lib/auth/permissions";

import { canAccessByRole } from "@/features/admin/utils/client-permissions";

import { resolveAccessForPath } from "@/features/admin/utils/access-matrix";

import type { UserRole } from "@/types/database";

// ────────────────────────────────────────────────────────
// 1. Матрица доступа — owner может всё.
// ────────────────────────────────────────────────────────

const ALL_RESOURCES: AdminResource[] = [
  "dashboard",
  "leads",
  "promos",
  "reviews",
  "blog",
  "portfolio",
  "portfolio.categories",
  "team",
  "promotions",
  "services",
  "services.categories",
  "content.cms",
  "seo",
  "settings.site",
  "settings.account",
  "users",
];

describe("permissions matrix — owner", () => {
  it.each(ALL_RESOURCES)("owner имеет доступ к %s", (resource) => {
    expect(canAccess("owner", resource)).toBe(true);
  });
});

// ────────────────────────────────────────────────────────
// 2. Матрица доступа — manager.
// ────────────────────────────────────────────────────────

const MANAGER_ALLOWED: AdminResource[] = [
  "dashboard",
  "promos",
  "reviews",
  "blog",
  "portfolio",
  "portfolio.categories",
  "team",
  "promotions",
  "settings.account",
];

const MANAGER_DENIED: AdminResource[] = [
  "leads",
  "services",
  "services.categories",
  "content.cms",
  "seo",
  "settings.site",
  "users",
];

describe("permissions matrix — manager (ограниченная роль)", () => {
  it.each(MANAGER_ALLOWED)("manager имеет доступ к %s", (resource) => {
    expect(canAccess("manager", resource)).toBe(true);
  });

  it.each(MANAGER_DENIED)("manager НЕ имеет доступа к %s", (resource) => {
    expect(canAccess("manager", resource)).toBe(false);
  });

  it("manager + leads — критично, чтобы не утекли PII", () => {
    expect(canAccess("manager", "leads")).toBe(false);
  });

  it("manager + services — клиент явно запретил", () => {
    expect(canAccess("manager", "services")).toBe(false);
  });

  it("manager + settings.site — клиент явно запретил", () => {
    expect(canAccess("manager", "settings.site")).toBe(false);
  });
});

// ────────────────────────────────────────────────────────
// 3. Матрица доступа — content.
// ────────────────────────────────────────────────────────

const CONTENT_ALLOWED: AdminResource[] = [
  "blog",
  "portfolio",
  "portfolio.categories",
  "team",
  "promotions",
  "content.cms",
  "settings.account",
];

const CONTENT_DENIED: AdminResource[] = [
  "dashboard",
  "leads",
  "promos",
  "reviews",
  "services",
  "services.categories",
  "seo",
  "settings.site",
  "users",
];

describe("permissions matrix — content", () => {
  it.each(CONTENT_ALLOWED)("content имеет доступ к %s", (resource) => {
    expect(canAccess("content", resource)).toBe(true);
  });

  it.each(CONTENT_DENIED)("content НЕ имеет доступа к %s", (resource) => {
    expect(canAccess("content", resource)).toBe(false);
  });
});

// ────────────────────────────────────────────────────────
// 4. canAccessAny — для UI-фильтрации (Sidebar).
// ────────────────────────────────────────────────────────

describe("canAccessAny", () => {
  it("manager имеет доступ хотя бы к одному из [leads, promos]", () => {
    expect(canAccessAny("manager", ["leads", "promos"])).toBe(true);
  });

  it("manager не имеет доступа ни к чему из [leads, services]", () => {
    expect(canAccessAny("manager", ["leads", "services"])).toBe(false);
  });

  it("content имеет доступ к [content.cms, blog]", () => {
    expect(canAccessAny("content", ["content.cms", "blog"])).toBe(true);
  });
});

// ────────────────────────────────────────────────────────
// 5. fallbackPathFor — куда редиректить при denied.
// ────────────────────────────────────────────────────────

describe("fallbackPathFor", () => {
  it.each<[UserRole, string]>([
    ["owner", "/admin/dashboard"],
    ["manager", "/admin/dashboard"],
    ["content", "/admin/blog"],
  ])("%s → %s", (role, path) => {
    expect(fallbackPathFor(role)).toBe(path);
  });
});

// ────────────────────────────────────────────────────────
// 6. rolesFor — корректные списки ролей по ресурсам.
// ────────────────────────────────────────────────────────

describe("rolesFor", () => {
  it("services → только owner", () => {
    expect(rolesFor("services")).toEqual(["owner"]);
  });

  it("blog → все 3 роли", () => {
    expect(rolesFor("blog")).toEqual(["owner", "manager", "content"]);
  });

  it("content.cms → owner и content (без manager)", () => {
    expect(rolesFor("content.cms")).toEqual(["owner", "content"]);
  });

  it("leads → только owner (PII)", () => {
    expect(rolesFor("leads")).toEqual(["owner"]);
  });
});

// ────────────────────────────────────────────────────────
// 7. client-permissions — должен совпадать с server-side.
// ────────────────────────────────────────────────────────

describe("client-permissions = server-permissions (sync)", () => {
  const ROLES: UserRole[] = ["owner", "manager", "content"];

  it.each(
    ROLES.flatMap((role) => ALL_RESOURCES.map((res) => [role, res] as const)),
  )("%s × %s — клиент == сервер", (role, resource) => {
    expect(canAccessByRole(role, resource)).toBe(canAccess(role, resource));
  });
});

// ────────────────────────────────────────────────────────
// 8. resolveAccessForPath — pathname → resource маппинг.
// ────────────────────────────────────────────────────────

describe("resolveAccessForPath", () => {
  // Конкретные кейсы, важные для бизнес-логики.
  it.each<[string, AdminResource | null]>([
    ["/admin/dashboard", "dashboard"],
    ["/admin/leads", "leads"],
    ["/admin/leads/quote/42", "leads"],
    ["/admin/promos", "promos"],
    ["/admin/blog", "blog"],
    ["/admin/blog/123", "blog"],
    ["/admin/seo", "seo"],
    ["/admin/settings", "settings.site"],
    ["/admin/settings/account/password", "settings.account"],
    ["/admin/content/services", "services"],
    ["/admin/content/services-categories", "services.categories"],
    ["/admin/content/portfolio", "portfolio"],
    ["/admin/content/portfolio-categories", "portfolio.categories"],
    ["/admin/content/team", "team"],
    ["/admin/content/promotions", "promotions"],
    ["/admin/content/promotions/new", "promotions"],
    ["/admin/content/settings", "settings.site"],
    ["/admin/content/homepage", "content.cms"],
    ["/admin/content/sections", "content.cms"],
    ["/admin/content/legal-pages", "content.cms"],
    ["/admin/content/menu", "content.cms"],
    ["/admin/content/banners", "content.cms"],
    ["/admin/content/ui-strings", "content.cms"],
    ["/admin/content/metadata", "content.cms"],
    ["/admin/content/pages", "content.cms"],
    ["/admin/reviews", "reviews"],
    ["/admin/orders", "leads"], // legacy
    // Неизвестные пути → null (layout трактует как «не блокировать»)
    ["/admin", null],
    ["/", null],
    ["/something/else", null],
  ])("path=%s → resource=%s", (path, expected) => {
    expect(resolveAccessForPath(path)).toBe(expected);
  });

  it("services-categories НЕ матчит более общий services-префикс", () => {
    // /admin/content/services-categories должен попасть в
    // services.categories, а не в services.
    expect(resolveAccessForPath("/admin/content/services-categories")).toBe(
      "services.categories",
    );
  });

  it("settings/account НЕ матчит более общий settings", () => {
    expect(resolveAccessForPath("/admin/settings/account")).toBe(
      "settings.account",
    );
    expect(resolveAccessForPath("/admin/settings/account/password")).toBe(
      "settings.account",
    );
  });
});

// ────────────────────────────────────────────────────────
// 9. End-to-end: «может ли роль X открыть страницу Y».
// ────────────────────────────────────────────────────────

describe("E2E: роль × pathname", () => {
  function canRoleOpenPath(role: UserRole, path: string): boolean {
    const resource = resolveAccessForPath(path);
    if (!resource) return true; // layout не блокирует неизвестные пути
    return canAccess(role, resource);
  }

  it("manager НЕ может открыть /admin/leads", () => {
    expect(canRoleOpenPath("manager", "/admin/leads")).toBe(false);
  });

  it("manager НЕ может открыть /admin/content/services", () => {
    expect(canRoleOpenPath("manager", "/admin/content/services")).toBe(false);
  });

  it("manager НЕ может открыть /admin/seo", () => {
    expect(canRoleOpenPath("manager", "/admin/seo")).toBe(false);
  });

  it("manager НЕ может открыть /admin/content/settings", () => {
    expect(canRoleOpenPath("manager", "/admin/content/settings")).toBe(false);
  });

  it("manager НЕ может открыть /admin/settings (управление командой)", () => {
    expect(canRoleOpenPath("manager", "/admin/settings")).toBe(false);
  });

  it("manager МОЖЕТ открыть /admin/content/portfolio", () => {
    expect(canRoleOpenPath("manager", "/admin/content/portfolio")).toBe(true);
  });

  it("manager МОЖЕТ открыть /admin/blog", () => {
    expect(canRoleOpenPath("manager", "/admin/blog")).toBe(true);
  });

  it("manager МОЖЕТ открыть /admin/promos", () => {
    expect(canRoleOpenPath("manager", "/admin/promos")).toBe(true);
  });

  it("content НЕ может открыть /admin/leads", () => {
    expect(canRoleOpenPath("content", "/admin/leads")).toBe(false);
  });

  it("content НЕ может открыть /admin/seo", () => {
    expect(canRoleOpenPath("content", "/admin/seo")).toBe(false);
  });

  it("content МОЖЕТ открыть /admin/content/homepage", () => {
    expect(canRoleOpenPath("content", "/admin/content/homepage")).toBe(true);
  });

  it("owner может всё", () => {
    for (const path of [
      "/admin/dashboard",
      "/admin/leads",
      "/admin/seo",
      "/admin/settings",
      "/admin/content/services",
      "/admin/content/settings",
    ]) {
      expect(canRoleOpenPath("owner", path)).toBe(true);
    }
  });
});
