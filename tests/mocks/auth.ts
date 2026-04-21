/**
 * Reusable mocks for `lib/auth/admin.ts`, `lib/auth/cookies.ts` и `next/headers`.
 *
 * Используется в тестах API-роутов и Server Actions, где требуется
 * имитировать авторизованного / неавторизованного пользователя.
 *
 * Пример:
 *   import { mockRequireAdmin, asAuthorizedAdmin, asUnauthorized } from "../mocks/auth";
 *   beforeEach(() => mockRequireAdmin.mockReset());
 *   it("401 без сессии", async () => { asUnauthorized(); … });
 *   it("200 с сессией", async () => { asAuthorizedAdmin(); … });
 */
import { vi } from "vitest";
import { NextResponse } from "next/server";
import type { UserRole } from "@/types/database";

export interface MockSessionUser {
  id: string;
  username: string;
  email: string | null;
  full_name: string | null;
  role: UserRole;
  avatar_url: string | null;
  is_active: boolean;
}

export const DEFAULT_ADMIN_USER: MockSessionUser = {
  id: "user-test-1",
  username: "admin",
  email: "admin@example.com",
  full_name: "Admin Test",
  role: "owner",
  avatar_url: null,
  is_active: true,
};

export const mockRequireAdmin = vi.fn();
export const mockGetCurrentUser = vi.fn();
export const mockGetSessionToken = vi.fn();
export const mockSetSessionCookie = vi.fn();
export const mockDeleteSessionCookie = vi.fn();

vi.mock("@/lib/auth/admin", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/auth/admin")>(
      "@/lib/auth/admin",
    );
  return {
    ...actual,
    requireAdmin: mockRequireAdmin,
    getCurrentUser: mockGetCurrentUser,
  };
});

vi.mock("@/lib/auth/cookies", () => ({
  SESSION_COOKIE_NAME: "auth_session",
  getSessionToken: mockGetSessionToken,
  setSessionCookie: mockSetSessionCookie,
  deleteSessionCookie: mockDeleteSessionCookie,
}));

/** Притвориться авторизованным админом. requireAdmin вернёт user. */
export function asAuthorizedAdmin(
  overrides?: Partial<MockSessionUser>,
): MockSessionUser {
  const user = { ...DEFAULT_ADMIN_USER, ...overrides };
  mockRequireAdmin.mockResolvedValue(user);
  mockGetCurrentUser.mockResolvedValue(user);
  mockGetSessionToken.mockResolvedValue("mock-session-token");
  return user;
}

/** Притвориться неавторизованным — requireAdmin отдаёт 401. */
export function asUnauthorized(): void {
  mockRequireAdmin.mockResolvedValue(
    NextResponse.json({ error: "Не авторизован" }, { status: 401 }),
  );
  mockGetCurrentUser.mockResolvedValue(null);
  mockGetSessionToken.mockResolvedValue(null);
}

/** Притвориться админом с ролью content (нет прав на products/orders). */
export function asForbidden(): void {
  mockRequireAdmin.mockResolvedValue(
    NextResponse.json({ error: "Недостаточно прав" }, { status: 403 }),
  );
}

export function resetAuthMocks(): void {
  mockRequireAdmin.mockReset();
  mockGetCurrentUser.mockReset();
  mockGetSessionToken.mockReset();
  mockSetSessionCookie.mockReset();
  mockDeleteSessionCookie.mockReset();
}
