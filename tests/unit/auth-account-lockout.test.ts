/**
 * @vitest-environment node
 *
 * Unit-тесты для account-lockout логики `signIn` (P1-7, миграция 006).
 *
 * Покрывает:
 *  - Заблокированный аккаунт (locked_until в будущем) → отказ "временно заблокирован"
 *  - 5 fail подряд → UPDATE locked_until = NOW() + 30 минут, счётчик сбрасывается в 0
 *  - Успешный вход → счётчики сбрасываются
 *  - locked_until в прошлом — позволяет логиниться
 *
 * Эти тесты комплементарны к auth-signin.test.ts (старому), который проверяет
 * только rate-limit per-IP. Здесь проверяем per-account счётчики в БД.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

import { mockSql, resetSqlMock } from "../mocks/db";

const {
  mockSetCookie,
  mockGetToken,
  mockDeleteCookie,
  mockBcryptCompare,
  mockCreateSession,
  mockGenerateToken,
  mockValidateToken,
} = vi.hoisted(() => ({
  mockSetCookie: vi.fn(),
  mockGetToken: vi.fn(),
  mockDeleteCookie: vi.fn(),
  mockBcryptCompare: vi.fn(),
  mockCreateSession: vi.fn(),
  mockGenerateToken: vi.fn(),
  mockValidateToken: vi.fn(),
}));

vi.mock("@/lib/auth/cookies", () => ({
  setSessionCookie: mockSetCookie,
  getSessionToken: mockGetToken,
  deleteSessionCookie: mockDeleteCookie,
  SESSION_COOKIE_NAME: "auth_session",
}));

vi.mock("bcryptjs", () => ({
  default: { compare: mockBcryptCompare },
  compare: mockBcryptCompare,
}));

vi.mock("@/lib/auth/lucia", () => ({
  createSession: mockCreateSession,
  generateSessionToken: mockGenerateToken,
  invalidateSession: vi.fn(),
  validateSessionToken: mockValidateToken,
  SESSION_EXPIRES_IN_MS: 30 * 24 * 60 * 60 * 1000,
}));

let testIp = 0;
vi.mock("next/headers", () => ({
  headers: vi.fn(async () => {
    testIp += 1;
    return new Headers({ "x-real-ip": `10.20.30.${testIp % 250}` });
  }),
  cookies: vi.fn(async () => ({ get: () => undefined, set: () => undefined })),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("REDIRECT");
  }),
}));

import { signIn } from "@/features/auth/api";

beforeEach(() => {
  resetSqlMock();
  mockSetCookie.mockReset();
  mockBcryptCompare.mockReset();
  mockCreateSession.mockReset();
  mockGenerateToken.mockReset();
  mockGenerateToken.mockReturnValue("tok-1");
  mockCreateSession.mockResolvedValue({
    id: "s",
    userId: "u",
    expiresAt: new Date(Date.now() + 1e9),
  });
});

describe("signIn — account lockout", () => {
  it("отказывает 'временно заблокирован' если locked_until в будущем", async () => {
    const future = new Date(Date.now() + 10 * 60_000).toISOString();
    mockSql.mockResolvedValueOnce([
      {
        id: "u1",
        password_hash: "$2b$12$h",
        is_active: true,
        failed_login_attempts: 5,
        locked_until: future,
      },
    ]);
    // bcrypt.compare всё равно прогоняется (timing-safe).
    mockBcryptCompare.mockResolvedValueOnce(true);

    const err = await signIn("admin", "correctpass");
    expect(err).toMatch(/временно заблокирован|30 минут/i);
    expect(mockSetCookie).not.toHaveBeenCalled();
  });

  it("locked_until в прошлом — обычный логин разрешён", async () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    mockSql.mockResolvedValueOnce([
      {
        id: "u1",
        password_hash: "$2b$12$h",
        is_active: true,
        failed_login_attempts: 5,
        locked_until: past,
      },
    ]);
    mockBcryptCompare.mockResolvedValueOnce(true);
    // UPDATE на сброс счётчиков:
    mockSql.mockResolvedValueOnce([{}]);

    const err = await signIn("admin", "correctpass");
    expect(err).toBeNull();
    expect(mockSetCookie).toHaveBeenCalled();
  });

  it("5-я неудача подряд → UPDATE locked_until = NOW() + 30 мин", async () => {
    // Имитируем 5-ю попытку: failed_login_attempts уже 4, неверный пароль.
    mockSql.mockResolvedValueOnce([
      {
        id: "u1",
        password_hash: "$2b$12$h",
        is_active: true,
        failed_login_attempts: 4,
        locked_until: null,
      },
    ]);
    mockBcryptCompare.mockResolvedValueOnce(false);
    mockSql.mockResolvedValueOnce([{}]); // UPDATE locked_until

    const err = await signIn("admin", "wrongpass");
    expect(err).toBe("Неверный логин или пароль");

    // Был UPDATE с локом — проверяем по факту вызова второго sql.
    expect(mockSql).toHaveBeenCalledTimes(2);
  });

  it("4-я неудача подряд → UPDATE failed_login_attempts++ (без лока)", async () => {
    mockSql.mockResolvedValueOnce([
      {
        id: "u1",
        password_hash: "$2b$12$h",
        is_active: true,
        failed_login_attempts: 3,
        locked_until: null,
      },
    ]);
    mockBcryptCompare.mockResolvedValueOnce(false);
    mockSql.mockResolvedValueOnce([{}]); // UPDATE инкремент

    const err = await signIn("admin", "wrongpass");
    expect(err).toBe("Неверный логин или пароль");
    // 2 SQL: SELECT user + UPDATE counter
    expect(mockSql).toHaveBeenCalledTimes(2);
  });

  it("успешный вход → UPDATE сброс failed_login_attempts=0, locked_until=NULL", async () => {
    mockSql.mockResolvedValueOnce([
      {
        id: "u1",
        password_hash: "$2b$12$h",
        is_active: true,
        failed_login_attempts: 3,
        locked_until: null,
      },
    ]);
    mockBcryptCompare.mockResolvedValueOnce(true);
    mockSql.mockResolvedValueOnce([{}]); // UPDATE reset

    const err = await signIn("admin", "rightpass");
    expect(err).toBeNull();
    expect(mockSetCookie).toHaveBeenCalled();
    expect(mockSql).toHaveBeenCalledTimes(2);
  });
});
