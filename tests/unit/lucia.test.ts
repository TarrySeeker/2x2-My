/**
 * Unit-тесты для `lib/auth/lucia.ts`.
 *
 * Покрытие:
 *  - generateSessionToken: длина (≥ 32 байта энтропии), уникальность,
 *    base64url-формат.
 *  - hashSessionToken: детерминизм, длина sha256-hex (64 символа),
 *    разные токены → разные хеши.
 *  - createSession + validateSessionToken: round-trip через мок sql.
 *  - validateSessionToken: истёкшая сессия удаляется,
 *    деактивированный пользователь — выкидывается, sliding renewal
 *    при остатке < 15 дней.
 *  - invalidateSession / invalidateAllUserSessions / deleteExpiredSessions
 *    — корректные SQL-вызовы.
 *
 * Завязки на БД мокаются через `tests/mocks/db.ts`.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { mockSql, resetSqlMock } from "../mocks/db";

import {
  generateSessionToken,
  hashSessionToken,
  createSession,
  validateSessionToken,
  invalidateSession,
  invalidateAllUserSessions,
  deleteExpiredSessions,
  SESSION_EXPIRES_IN_MS,
} from "@/lib/auth/lucia";

beforeEach(() => {
  resetSqlMock();
});

// ============================================================
// Token helpers
// ============================================================

describe("generateSessionToken", () => {
  it("возвращает не менее 32 байт энтропии (base64url ≥ 43 символов)", () => {
    const token = generateSessionToken();
    // 32 байта в base64url без паддинга = 43 символа.
    expect(token.length).toBeGreaterThanOrEqual(43);
  });

  it("использует только base64url-алфавит (A-Z, a-z, 0-9, -, _)", () => {
    for (let i = 0; i < 5; i++) {
      const t = generateSessionToken();
      expect(t).toMatch(/^[A-Za-z0-9_-]+$/);
    }
  });

  it("каждый вызов возвращает уникальный токен", () => {
    const tokens = new Set<string>();
    for (let i = 0; i < 100; i++) tokens.add(generateSessionToken());
    expect(tokens.size).toBe(100);
  });
});

describe("hashSessionToken", () => {
  it("возвращает 64-символьный hex (sha256)", () => {
    const h = hashSessionToken("any-token-value");
    expect(h).toHaveLength(64);
    expect(h).toMatch(/^[a-f0-9]{64}$/);
  });

  it("детерминирован: одинаковый ввод → одинаковый хеш", () => {
    const t = "stable-token-123";
    expect(hashSessionToken(t)).toBe(hashSessionToken(t));
  });

  it("разные токены → разные хеши", () => {
    expect(hashSessionToken("a")).not.toBe(hashSessionToken("b"));
  });

  it("совпадает с эталонным sha256 для known input", () => {
    // sha256("test") = 9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08
    expect(hashSessionToken("test")).toBe(
      "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
    );
  });
});

// ============================================================
// CRUD
// ============================================================

describe("createSession", () => {
  it("вставляет sha256(token) как id и возвращает SessionRecord", async () => {
    mockSql.mockResolvedValueOnce([]); // INSERT не возвращает rows

    const token = "abcdef";
    const session = await createSession("user-1", token);

    expect(session.id).toBe(hashSessionToken(token));
    expect(session.userId).toBe("user-1");
    expect(session.expiresAt).toBeInstanceOf(Date);
    // expires ≈ now + 30 дней
    const diff = session.expiresAt.getTime() - Date.now();
    expect(diff).toBeGreaterThan(SESSION_EXPIRES_IN_MS - 1000);
    expect(diff).toBeLessThanOrEqual(SESSION_EXPIRES_IN_MS + 1000);
    expect(mockSql).toHaveBeenCalledTimes(1);
  });
});

describe("validateSessionToken", () => {
  it("возвращает {session:null,user:null} когда нет такой записи", async () => {
    mockSql.mockResolvedValueOnce([]);
    const r = await validateSessionToken("not-existing");
    expect(r.session).toBeNull();
    expect(r.user).toBeNull();
  });

  it("при is_active=false удаляет сессию и возвращает null", async () => {
    const future = new Date(Date.now() + SESSION_EXPIRES_IN_MS);
    mockSql.mockResolvedValueOnce([
      {
        session_id: "sid",
        session_user_id: "uid",
        session_expires_at: future,
        user_id: "uid",
        username: "blocked",
        email: null,
        full_name: null,
        role: "owner",
        avatar_url: null,
        is_active: false,
      },
    ]);
    mockSql.mockResolvedValueOnce([]); // DELETE

    const r = await validateSessionToken("token");
    expect(r.session).toBeNull();
    expect(r.user).toBeNull();
    expect(mockSql).toHaveBeenCalledTimes(2);
  });

  it("при истёкшей сессии удаляет её и возвращает null", async () => {
    const past = new Date(Date.now() - 1000);
    mockSql.mockResolvedValueOnce([
      {
        session_id: "sid",
        session_user_id: "uid",
        session_expires_at: past,
        user_id: "uid",
        username: "u",
        email: null,
        full_name: null,
        role: "owner",
        avatar_url: null,
        is_active: true,
      },
    ]);
    mockSql.mockResolvedValueOnce([]); // DELETE

    const r = await validateSessionToken("token");
    expect(r.session).toBeNull();
    expect(r.user).toBeNull();
    expect(mockSql).toHaveBeenCalledTimes(2);
  });

  it("свежая сессия (>15 дней до истечения) не продлевается", async () => {
    // Осталось > половины срока — UPDATE не должен вызываться.
    const future = new Date(Date.now() + SESSION_EXPIRES_IN_MS - 1000);
    mockSql.mockResolvedValueOnce([
      {
        session_id: "sid",
        session_user_id: "uid",
        session_expires_at: future,
        user_id: "uid",
        username: "u",
        email: "u@e.com",
        full_name: "U",
        role: "manager",
        avatar_url: null,
        is_active: true,
      },
    ]);

    const r = await validateSessionToken("token");
    expect(r.session).not.toBeNull();
    expect(r.user?.role).toBe("manager");
    // Только 1 SELECT, без UPDATE.
    expect(mockSql).toHaveBeenCalledTimes(1);
  });

  it("сессия с остатком <15 дней продлевается (sliding renewal)", async () => {
    // Осталось 1 час — должен быть UPDATE.
    const aboutToRenew = new Date(Date.now() + 60 * 60 * 1000);
    mockSql.mockResolvedValueOnce([
      {
        session_id: "sid",
        session_user_id: "uid",
        session_expires_at: aboutToRenew,
        user_id: "uid",
        username: "u",
        email: null,
        full_name: null,
        role: "owner",
        avatar_url: null,
        is_active: true,
      },
    ]);
    mockSql.mockResolvedValueOnce([]); // UPDATE

    const r = await validateSessionToken("token");
    expect(r.session).not.toBeNull();
    // expires продлено на ~30 дней от now.
    const newDiff = r.session!.expiresAt.getTime() - Date.now();
    expect(newDiff).toBeGreaterThan(SESSION_EXPIRES_IN_MS - 1000);
    expect(mockSql).toHaveBeenCalledTimes(2);
  });

  it("маппит SessionUser из колонок users (id/username/role/...)", async () => {
    const future = new Date(Date.now() + SESSION_EXPIRES_IN_MS - 1000);
    mockSql.mockResolvedValueOnce([
      {
        session_id: "sid",
        session_user_id: "uid",
        session_expires_at: future,
        user_id: "uid",
        username: "alice",
        email: "alice@2x2.ru",
        full_name: "Alice",
        role: "content",
        avatar_url: "/img/a.jpg",
        is_active: true,
      },
    ]);
    const r = await validateSessionToken("token");
    expect(r.user).toEqual({
      id: "uid",
      username: "alice",
      email: "alice@2x2.ru",
      full_name: "Alice",
      role: "content",
      avatar_url: "/img/a.jpg",
      is_active: true,
    });
  });

  it("round-trip: createSession.id === validateSessionToken.session.id", async () => {
    const token = generateSessionToken();
    const expectedId = hashSessionToken(token);

    mockSql.mockResolvedValueOnce([]); // create INSERT
    const created = await createSession("uid", token);
    expect(created.id).toBe(expectedId);

    const future = new Date(Date.now() + SESSION_EXPIRES_IN_MS - 1000);
    mockSql.mockResolvedValueOnce([
      {
        session_id: expectedId,
        session_user_id: "uid",
        session_expires_at: future,
        user_id: "uid",
        username: "u",
        email: null,
        full_name: null,
        role: "owner",
        avatar_url: null,
        is_active: true,
      },
    ]);
    const r = await validateSessionToken(token);
    expect(r.session?.id).toBe(expectedId);
  });
});

describe("invalidateSession / invalidateAllUserSessions / deleteExpiredSessions", () => {
  it("invalidateSession делает DELETE и не возвращает значения", async () => {
    mockSql.mockResolvedValueOnce([]);
    const out = await invalidateSession("sid");
    expect(out).toBeUndefined();
    expect(mockSql).toHaveBeenCalledTimes(1);
  });

  it("invalidateAllUserSessions делает DELETE по user_id", async () => {
    mockSql.mockResolvedValueOnce([]);
    await invalidateAllUserSessions("uid");
    expect(mockSql).toHaveBeenCalledTimes(1);
  });

  it("deleteExpiredSessions запускает DELETE", async () => {
    mockSql.mockResolvedValueOnce([]);
    await deleteExpiredSessions();
    expect(mockSql).toHaveBeenCalledTimes(1);
  });
});
