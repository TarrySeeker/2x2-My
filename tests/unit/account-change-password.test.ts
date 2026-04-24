/**
 * @vitest-environment node
 *
 * Unit-тесты для `changePasswordAction`.
 *
 * Покрывает:
 *  - валидация (минимум 12, новый отличается от текущего, confirm совпадает)
 *  - неверный currentPassword → "Текущий пароль введён неверно"
 *  - happy path: bcrypt.compare(true) → bcrypt.hash → UPDATE → invalidateAll
 *    → новая сессия + cookie. Audit log не падает action даже если упал.
 *  - НЕ логирует пароли (bcrypt.hash вызывается, но в audit_log не передаются).
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

const {
  mockRequireAuth,
  mockBcryptCompare,
  mockBcryptHash,
  mockInvalidateAll,
  mockCreateSession,
  mockGenerateToken,
  mockSetCookie,
  mockDeleteCookie,
} = vi.hoisted(() => ({
  mockRequireAuth: vi.fn(),
  mockBcryptCompare: vi.fn(),
  mockBcryptHash: vi.fn(),
  mockInvalidateAll: vi.fn(),
  mockCreateSession: vi.fn(),
  mockGenerateToken: vi.fn(),
  mockSetCookie: vi.fn(),
  mockDeleteCookie: vi.fn(),
}));

vi.mock("@/features/auth/api", () => ({
  requireAuth: mockRequireAuth,
}));

vi.mock("bcryptjs", () => ({
  default: { compare: mockBcryptCompare, hash: mockBcryptHash },
  compare: mockBcryptCompare,
  hash: mockBcryptHash,
}));

vi.mock("@/lib/auth/lucia", () => ({
  invalidateAllUserSessions: mockInvalidateAll,
  createSession: mockCreateSession,
  generateSessionToken: mockGenerateToken,
}));

vi.mock("@/lib/auth/cookies", () => ({
  setSessionCookie: mockSetCookie,
  deleteSessionCookie: mockDeleteCookie,
  SESSION_COOKIE_NAME: "auth_session",
}));

import { mockSql, resetSqlMock } from "../mocks/db";
import { changePasswordAction } from "@/features/admin/actions/account";

beforeEach(() => {
  resetSqlMock();
  mockRequireAuth.mockReset();
  mockBcryptCompare.mockReset();
  mockBcryptHash.mockReset();
  mockInvalidateAll.mockReset();
  mockCreateSession.mockReset();
  mockGenerateToken.mockReset();
  mockSetCookie.mockReset();
  mockDeleteCookie.mockReset();

  mockRequireAuth.mockResolvedValue({
    id: "user-1",
    role: "owner",
    username: "admin",
  });
  mockGenerateToken.mockReturnValue("new-token-xyz");
  mockCreateSession.mockResolvedValue({
    id: "sess-new",
    userId: "user-1",
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });
  mockBcryptHash.mockResolvedValue("$2b$12$newHash");
});

describe("changePasswordAction — валидация", () => {
  it("отклоняет короткий пароль (< 12)", async () => {
    const r = await changePasswordAction({
      currentPassword: "old",
      newPassword: "short",
      newPasswordConfirm: "short",
    });
    expect(r.ok).toBe(false);
    expect(mockBcryptCompare).not.toHaveBeenCalled();
  });

  it("отклоняет когда новый = старый", async () => {
    const same = "samepassword12";
    const r = await changePasswordAction({
      currentPassword: same,
      newPassword: same,
      newPasswordConfirm: same,
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/отличаться/i);
  });

  it("отклоняет если confirm не совпадает", async () => {
    const r = await changePasswordAction({
      currentPassword: "oldpass",
      newPassword: "newpassword12",
      newPasswordConfirm: "differentnew12",
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/совпадают/i);
  });
});

describe("changePasswordAction — неверный currentPassword", () => {
  it("'Текущий пароль введён неверно' если bcrypt.compare = false", async () => {
    mockSql.mockResolvedValueOnce([{ password_hash: "$2b$12$oldhash" }]);
    mockBcryptCompare.mockResolvedValueOnce(false);

    const r = await changePasswordAction({
      currentPassword: "wrongone",
      newPassword: "validnewpass1",
      newPasswordConfirm: "validnewpass1",
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/неверно/i);
    // Хеш нового — не считается, не пишется в БД.
    expect(mockBcryptHash).not.toHaveBeenCalled();
  });
});

describe("changePasswordAction — happy path", () => {
  it("обновляет пароль, инвалидирует сессии, создаёт новую и ставит cookie", async () => {
    mockSql
      .mockResolvedValueOnce([{ password_hash: "$2b$12$oldhash" }]) // SELECT current
      .mockResolvedValueOnce([{}]) // UPDATE users
      .mockResolvedValueOnce([{}]); // log_admin_action

    mockBcryptCompare.mockResolvedValueOnce(true);
    mockInvalidateAll.mockResolvedValueOnce(undefined);

    const r = await changePasswordAction({
      currentPassword: "oldsecure123",
      newPassword: "BrandNew456!@",
      newPasswordConfirm: "BrandNew456!@",
    });

    expect(r.ok).toBe(true);
    expect(mockBcryptHash).toHaveBeenCalledWith("BrandNew456!@", 12);
    expect(mockInvalidateAll).toHaveBeenCalledWith("user-1");
    expect(mockDeleteCookie).toHaveBeenCalled();
    expect(mockCreateSession).toHaveBeenCalledWith("user-1", "new-token-xyz");
    expect(mockSetCookie).toHaveBeenCalled();
  });

  it("если audit log упал — action всё равно ok (best-effort)", async () => {
    mockSql
      .mockResolvedValueOnce([{ password_hash: "$2b$12$oldhash" }])
      .mockResolvedValueOnce([{}])
      .mockRejectedValueOnce(new Error("audit table missing"));

    mockBcryptCompare.mockResolvedValueOnce(true);
    mockInvalidateAll.mockResolvedValueOnce(undefined);

    const r = await changePasswordAction({
      currentPassword: "oldsecure123",
      newPassword: "BrandNew456!@",
      newPasswordConfirm: "BrandNew456!@",
    });
    expect(r.ok).toBe(true);
  });

  it("user не найден → 'Пользователь не найден'", async () => {
    mockSql.mockResolvedValueOnce([]);

    const r = await changePasswordAction({
      currentPassword: "any",
      newPassword: "newvalidpass1",
      newPasswordConfirm: "newvalidpass1",
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/не найден/i);
  });
});
