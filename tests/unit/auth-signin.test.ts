/**
 * Unit-тесты для `signIn()` из `features/auth/api.ts`.
 *
 * Покрытие:
 *  - happy path: валидные креды → null, cookie ставится.
 *  - неверный пароль → "Неверный логин или пароль".
 *  - несуществующий пользователь → ту же generic-ошибку (без timing leak).
 *  - заблокированный аккаунт (is_active=false) → "Аккаунт заблокирован".
 *  - валидация: пустые/слишком короткие данные.
 *  - rate-limit: 6-я попытка за 10 минут → блок.
 *
 * Мокаем:
 *  - sql (postgres-js) — через ../mocks/db.
 *  - cookies / next/headers — чтобы не падать без реального request scope.
 *  - bcryptjs — чтобы не гонять реальный hash.
 *  - lib/auth/lucia — createSession/generateSessionToken (cookie pipeline).
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

// ──────────── Моки до импорта signIn ────────────
import { mockSql, resetSqlMock } from "../mocks/db";

const {
  mockSetSessionCookie,
  mockGetSessionToken,
  mockDeleteSessionCookie,
  mockBcryptCompare,
  mockCreateSession,
  mockGenerateSessionToken,
  mockValidateSessionToken,
  mockInvalidateSession,
} = vi.hoisted(() => ({
  mockSetSessionCookie: vi.fn(),
  mockGetSessionToken: vi.fn(),
  mockDeleteSessionCookie: vi.fn(),
  mockBcryptCompare: vi.fn(),
  mockCreateSession: vi.fn(),
  mockGenerateSessionToken: vi.fn(),
  mockValidateSessionToken: vi.fn(),
  mockInvalidateSession: vi.fn(),
}));

vi.mock("@/lib/auth/cookies", () => ({
  SESSION_COOKIE_NAME: "auth_session",
  setSessionCookie: mockSetSessionCookie,
  getSessionToken: mockGetSessionToken,
  deleteSessionCookie: mockDeleteSessionCookie,
}));

vi.mock("bcryptjs", () => ({
  default: { compare: mockBcryptCompare },
  compare: mockBcryptCompare,
}));

vi.mock("@/lib/auth/lucia", () => ({
  createSession: mockCreateSession,
  generateSessionToken: mockGenerateSessionToken,
  validateSessionToken: mockValidateSessionToken,
  invalidateSession: mockInvalidateSession,
  SESSION_EXPIRES_IN_MS: 1000 * 60 * 60 * 24 * 30,
}));

// next/headers — для safeClientIp, который вызывает headers().
vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers({ "x-real-ip": "10.0.0.1" })),
  cookies: vi.fn(async () => ({
    get: () => undefined,
    set: () => undefined,
  })),
}));

// next/navigation — у signOut() есть redirect(), но в этом тесте signOut не дёргается.
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("REDIRECT");
  }),
}));

import { signIn } from "@/features/auth/api";

beforeEach(() => {
  resetSqlMock();
  mockSetSessionCookie.mockReset();
  mockBcryptCompare.mockReset();
  mockCreateSession.mockReset();
  mockGenerateSessionToken.mockReset();
  mockGenerateSessionToken.mockReturnValue("generated-token-xyz");
  mockCreateSession.mockResolvedValue({
    id: "sess-id",
    userId: "u1",
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
  });
});

// Rate-limit в `features/auth/api.ts` хранится в module-level Map по IP.
// Чтобы тесты не "наследовали" счётчики друг от друга — даём каждому
// тесту уникальный IP. Тесты, которым нужно проверить rate-limit
// именно с одного IP, переопределяют header локально.
import * as nextHeaders from "next/headers";

let testIpCounter = 0;
beforeEach(() => {
  testIpCounter += 1;
  vi.mocked(nextHeaders.headers).mockResolvedValue(
    new Headers({ "x-real-ip": `10.10.10.${testIpCounter % 250}` }),
  );
});

describe("signIn — валидация входа", () => {
  it("отклоняет пустой логин", async () => {
    const err = await signIn("", "password123");
    expect(err).toBeTruthy();
    expect(mockSql).not.toHaveBeenCalled();
  });

  it("отклоняет слишком короткий пароль", async () => {
    const err = await signIn("admin", "12345");
    expect(err).toBeTruthy();
    expect(mockSql).not.toHaveBeenCalled();
  });
});

describe("signIn — happy path", () => {
  it("успешно логинит, ставит cookie, возвращает null", async () => {
    mockSql.mockResolvedValueOnce([
      { id: "u1", password_hash: "hash", is_active: true },
    ]);
    mockBcryptCompare.mockResolvedValueOnce(true);

    const err = await signIn("admin", "correct-pass");
    expect(err).toBeNull();
    expect(mockGenerateSessionToken).toHaveBeenCalledTimes(1);
    expect(mockCreateSession).toHaveBeenCalledWith("u1", "generated-token-xyz");
    expect(mockSetSessionCookie).toHaveBeenCalledTimes(1);
  });

  it("работает по email (не только username) — нижний регистр в SELECT", async () => {
    mockSql.mockResolvedValueOnce([
      { id: "u2", password_hash: "h", is_active: true },
    ]);
    mockBcryptCompare.mockResolvedValueOnce(true);

    const err = await signIn("Admin@2X2.RU", "longpass");
    expect(err).toBeNull();
    // identifier должен попасть в SELECT в нижнем регистре —
    // но мы не парсим SQL, проверим через kalls[0] (template strings args).
    const callArgs = mockSql.mock.calls[0];
    // Первый параметр — template strings array, дальше идут значения.
    // postgres-js вызывает sql`SELECT ... ${identifier} ${identifier}` — мы видим оба.
    const interpolated = callArgs.slice(1);
    expect(interpolated).toContain("admin@2x2.ru");
  });
});

describe("signIn — отказы", () => {
  it("несуществующий пользователь → generic 'Неверный логин или пароль'", async () => {
    mockSql.mockResolvedValueOnce([]); // нет такого юзера
    mockBcryptCompare.mockResolvedValueOnce(false); // фиктивный compare

    const err = await signIn("ghost", "anypass");
    expect(err).toBe("Неверный логин или пароль");
    // Cookie НЕ ставится.
    expect(mockSetSessionCookie).not.toHaveBeenCalled();
    // Делается фиктивный bcrypt.compare для timing-attack mitigation.
    expect(mockBcryptCompare).toHaveBeenCalled();
  });

  it("неверный пароль → generic 'Неверный логин или пароль'", async () => {
    mockSql.mockResolvedValueOnce([
      { id: "u1", password_hash: "h", is_active: true },
    ]);
    mockBcryptCompare.mockResolvedValueOnce(false);

    const err = await signIn("admin", "wrongpass");
    expect(err).toBe("Неверный логин или пароль");
    expect(mockSetSessionCookie).not.toHaveBeenCalled();
  });

  it("заблокированный аккаунт → 'Аккаунт заблокирован'", async () => {
    mockSql.mockResolvedValueOnce([
      { id: "u1", password_hash: "h", is_active: false },
    ]);

    const err = await signIn("blocked", "validpass");
    expect(err).toBe("Аккаунт заблокирован");
    expect(mockBcryptCompare).not.toHaveBeenCalled();
    expect(mockSetSessionCookie).not.toHaveBeenCalled();
  });
});

describe("signIn — rate-limit (5 попыток за 10 минут)", () => {
  it("блокирует 6-ю попытку с одного IP в одно окно", async () => {
    // Прибиваем ip к константе — все 6 попыток с одного.
    vi.mocked(nextHeaders.headers).mockResolvedValue(
      new Headers({ "x-real-ip": "10.99.99.99" }),
    );

    // 5 неудачных — каждая отдаёт generic-ошибку, но НЕ блокирующее сообщение.
    for (let i = 0; i < 5; i++) {
      mockSql.mockResolvedValueOnce([]);
      mockBcryptCompare.mockResolvedValueOnce(false);
      const err = await signIn("anyone", "tryguess");
      expect(err).toBe("Неверный логин или пароль");
    }

    // 6-я — должна блокироваться ДО запроса в БД.
    const blocked = await signIn("anyone", "tryguess");
    expect(blocked).toMatch(/Слишком много попыток/);
    // Запрос к БД не делался дополнительно (5 раз был, на 6-й — нет).
    expect(mockSql).toHaveBeenCalledTimes(5);
  });

  it("успешный логин сбрасывает счётчик попыток", async () => {
    vi.mocked(nextHeaders.headers).mockResolvedValue(
      new Headers({ "x-real-ip": "10.88.88.88" }),
    );

    // 4 неудачи
    for (let i = 0; i < 4; i++) {
      mockSql.mockResolvedValueOnce([]);
      mockBcryptCompare.mockResolvedValueOnce(false);
      await signIn("u", "wrongpw");
    }

    // успех
    mockSql.mockResolvedValueOnce([
      { id: "u1", password_hash: "h", is_active: true },
    ]);
    mockBcryptCompare.mockResolvedValueOnce(true);
    expect(await signIn("u", "rightpw")).toBeNull();

    // снова можно делать попытки — счётчик ноль.
    for (let i = 0; i < 5; i++) {
      mockSql.mockResolvedValueOnce([]);
      mockBcryptCompare.mockResolvedValueOnce(false);
      const err = await signIn("u", "wrongpw");
      expect(err).toBe("Неверный логин или пароль");
    }
  });
});
