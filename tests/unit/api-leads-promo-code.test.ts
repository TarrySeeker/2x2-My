/**
 * @vitest-environment node
 *
 * Unit-тесты для поля `promoCode` на трёх POST-эндпоинтах:
 *  - /api/leads/quote
 *  - /api/leads/one-click
 *  - /api/contact
 *
 * Контракт (миграция 016 + lib/validation.ts#promoCodeSchema):
 *   - поле опционально (отсутствие = null в БД, success);
 *   - формат: ^[A-Za-z0-9_-]{4,50}$;
 *   - валидное значение → INSERT с trim'нутым текстом;
 *   - невалидный формат → 400 с человекочитаемым error.
 *
 * Серверная Zod-схема — единственный источник правды (фронт делает
 * лёгкую client-валидацию, но именно сервер защищает БД).
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

import { mockSql, resetSqlMock } from "../mocks/db";

vi.mock("@/lib/notifications", () => ({
  sendNotification: vi.fn(async () => undefined),
}));

import { NextRequest } from "next/server";
import { POST as quotePOST } from "@/app/api/leads/quote/route";
import { POST as contactPOST } from "@/app/api/contact/route";
import { POST as oneClickPOST } from "@/app/api/leads/one-click/route";

let ipCounter = 100;
function uniqueIp(): string {
  ipCounter += 1;
  return `198.51.100.${(ipCounter % 250) + 1}`;
}

function makeReq(
  url: string,
  body: unknown,
  ip = uniqueIp(),
  extraHeaders: Record<string, string> = {},
): NextRequest {
  return new NextRequest(`http://localhost${url}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": ip,
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  resetSqlMock();
});

// ===================================================================
// /api/leads/quote
// ===================================================================
describe("POST /api/leads/quote — promoCode", () => {
  const baseValid = {
    customer_name: "Иван Иванов",
    customer_phone: "+79324247740",
    pdConsent: true,
  };

  it("без promoCode → success (поле опциональное)", async () => {
    mockSql.mockResolvedValueOnce([{ id: 1, request_number: "REQ-0001" }]);
    const res = await quotePOST(makeReq("/api/leads/quote", baseValid));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("валидный promoCode → success, INSERT получает значение", async () => {
    mockSql.mockResolvedValueOnce([{ id: 2, request_number: "REQ-0002" }]);
    const res = await quotePOST(
      makeReq("/api/leads/quote", { ...baseValid, promoCode: "VIZIT2026" }),
    );
    expect(res.status).toBe(200);
    // postgres-js sql tag вызван — проверяем, что среди args есть наш код.
    const callArgs = mockSql.mock.calls.flat();
    const flattened = JSON.stringify(callArgs);
    expect(flattened).toContain("VIZIT2026");
  });

  it("promoCode с пробелами по краям → trim, success", async () => {
    mockSql.mockResolvedValueOnce([{ id: 3, request_number: null }]);
    const res = await quotePOST(
      makeReq("/api/leads/quote", { ...baseValid, promoCode: "  KOD-2026  " }),
    );
    expect(res.status).toBe(200);
    const flattened = JSON.stringify(mockSql.mock.calls.flat());
    expect(flattened).toContain("KOD-2026");
    // Пробелы не должны попасть в БД.
    expect(flattened).not.toContain("  KOD-2026  ");
  });

  it("пустая строка promoCode → null, success", async () => {
    mockSql.mockResolvedValueOnce([{ id: 4, request_number: null }]);
    const res = await quotePOST(
      makeReq("/api/leads/quote", { ...baseValid, promoCode: "" }),
    );
    expect(res.status).toBe(200);
  });

  it("кириллица в promoCode → 400 с понятным сообщением", async () => {
    const res = await quotePOST(
      makeReq("/api/leads/quote", { ...baseValid, promoCode: "ВИЗИТКА" }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/латиница|промокод/i);
  });

  it("слишком короткий promoCode (3 символа) → 400", async () => {
    const res = await quotePOST(
      makeReq("/api/leads/quote", { ...baseValid, promoCode: "ABC" }),
    );
    expect(res.status).toBe(400);
  });

  it("слишком длинный promoCode (51 символ) → 400", async () => {
    const longCode = "A".repeat(51);
    const res = await quotePOST(
      makeReq("/api/leads/quote", { ...baseValid, promoCode: longCode }),
    );
    expect(res.status).toBe(400);
  });
});

// ===================================================================
// /api/leads/one-click
// ===================================================================
describe("POST /api/leads/one-click — promoCode", () => {
  const baseValid = {
    name: "Пётр",
    phone: "+79324247740",
    pdConsent: true,
  };

  it("валидный promoCode → success", async () => {
    mockSql.mockResolvedValueOnce([{ id: 11 }]);
    const res = await oneClickPOST(
      makeReq("/api/leads/one-click", { ...baseValid, promoCode: "BANNER_50" }),
    );
    expect(res.status).toBe(200);
    const flattened = JSON.stringify(mockSql.mock.calls.flat());
    expect(flattened).toContain("BANNER_50");
  });

  it("без promoCode → success", async () => {
    mockSql.mockResolvedValueOnce([{ id: 12 }]);
    const res = await oneClickPOST(makeReq("/api/leads/one-click", baseValid));
    expect(res.status).toBe(200);
  });

  it("спец-символы в promoCode → 400", async () => {
    const res = await oneClickPOST(
      makeReq("/api/leads/one-click", {
        ...baseValid,
        promoCode: "VIZIT@2026",
      }),
    );
    expect(res.status).toBe(400);
  });
});

// ===================================================================
// /api/contact
// ===================================================================
describe("POST /api/contact — promoCode", () => {
  const baseValid = {
    name: "Мария",
    phone: "+79044807740",
    message: "Сообщение",
    pdConsent: true,
  };

  it("валидный promoCode → success, попадает в INSERT", async () => {
    mockSql.mockResolvedValueOnce([{ id: 21 }]);
    const res = await contactPOST(
      makeReq("/api/contact", { ...baseValid, promoCode: "NEWYEAR2026" }),
    );
    expect(res.status).toBe(200);
    const flattened = JSON.stringify(mockSql.mock.calls.flat());
    expect(flattened).toContain("NEWYEAR2026");
  });

  it("без promoCode → success", async () => {
    mockSql.mockResolvedValueOnce([{ id: 22 }]);
    const res = await contactPOST(makeReq("/api/contact", baseValid));
    expect(res.status).toBe(200);
  });

  it("кириллица → 400", async () => {
    const res = await contactPOST(
      makeReq("/api/contact", { ...baseValid, promoCode: "Скидка" }),
    );
    expect(res.status).toBe(400);
  });
});
