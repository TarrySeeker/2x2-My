/**
 * @vitest-environment node
 *
 * Unit-тесты для POST /api/leads/quote и /api/contact и /api/leads/one-click —
 * проверка pdConsent (152-ФЗ) + Idempotency-Key.
 *
 * Покрывает:
 *  - 400 без pdConsent в body
 *  - 400 при pdConsent: false
 *  - happy: pdConsent=true → INSERT, ответ {success:true}
 *  - Idempotency: первый POST INSERT'ит, второй с тем же ключом возвращает {duplicate:true}
 *  - Idempotency UNIQUE-violation race: если в момент INSERT'a пришла
 *    23505, перечитываем существующую запись и отдаём её ID
 *  - 429 на превышение rate-limit
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

let ipCounter = 0;
function uniqueIp(): string {
  ipCounter += 1;
  return `203.0.113.${(ipCounter % 250) + 1}`;
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
describe("POST /api/leads/quote — pdConsent", () => {
  const baseValid = {
    customer_name: "Иван Иванов",
    customer_phone: "+79324247740",
    pdConsent: true,
  };

  it("400 если в body нет pdConsent", async () => {
    const { pdConsent: _, ...withoutConsent } = baseValid;
    const res = await quotePOST(makeReq("/api/leads/quote", withoutConsent));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/согласие/i);
  });

  it("400 если pdConsent === false", async () => {
    const res = await quotePOST(
      makeReq("/api/leads/quote", { ...baseValid, pdConsent: false }),
    );
    expect(res.status).toBe(400);
  });

  it("happy path: pdConsent=true → INSERT и success:true", async () => {
    mockSql.mockResolvedValueOnce([{ id: 42, request_number: "REQ-0001" }]);
    const res = await quotePOST(makeReq("/api/leads/quote", baseValid));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.request_id).toBe(42);
  });
});

describe("POST /api/leads/quote — Idempotency-Key", () => {
  const valid = {
    customer_name: "Иван",
    customer_phone: "+79324247740",
    pdConsent: true,
  };

  it("второй POST с тем же ключом возвращает duplicate:true без INSERT", async () => {
    const ip = "203.0.113.10";
    const key = "550e8400-e29b-41d4-a716-446655440000";

    // 1-й запрос: SELECT по ключу пуст → потом INSERT возвращает id.
    mockSql.mockResolvedValueOnce([]); // SELECT idempotency lookup
    mockSql.mockResolvedValueOnce([{ id: 100, request_number: "REQ-0010" }]); // INSERT

    const res1 = await quotePOST(
      makeReq("/api/leads/quote", valid, ip, { "Idempotency-Key": key }),
    );
    expect(res1.status).toBe(200);
    const body1 = await res1.json();
    expect(body1.success).toBe(true);
    expect(body1.duplicate).toBeUndefined();

    // 2-й запрос: SELECT по ключу находит запись → возвращает duplicate.
    mockSql.mockResolvedValueOnce([{ id: 100, request_number: "REQ-0010" }]);

    const res2 = await quotePOST(
      makeReq("/api/leads/quote", valid, ip, { "Idempotency-Key": key }),
    );
    expect(res2.status).toBe(200);
    const body2 = await res2.json();
    expect(body2.duplicate).toBe(true);
    expect(body2.request_id).toBe(100);
  });

  it("UNIQUE-race: 23505 на INSERT → перечитывает запись, duplicate:true", async () => {
    const key = "race1234-race-1234-race-123412341234";

    // SELECT lookup пуст (одновременный другой POST ещё не закоммитил):
    mockSql.mockResolvedValueOnce([]);
    // INSERT кидает UNIQUE-violation (postgres-js error.code === '23505'):
    const dup = Object.assign(new Error("duplicate key"), { code: "23505" });
    mockSql.mockRejectedValueOnce(dup);
    // Перечитка по idempotency_key возвращает ту самую запись:
    mockSql.mockResolvedValueOnce([{ id: 200, request_number: "REQ-0020" }]);

    const res = await quotePOST(
      makeReq("/api/leads/quote", valid, undefined, { "Idempotency-Key": key }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.duplicate).toBe(true);
    expect(body.request_id).toBe(200);
  });
});

// ===================================================================
// /api/contact
// ===================================================================
describe("POST /api/contact — pdConsent", () => {
  const baseValid = {
    name: "Мария",
    phone: "+79044807740",
    message: "Сообщение",
    pdConsent: true,
  };

  it("400 без pdConsent", async () => {
    const { pdConsent: _, ...rest } = baseValid;
    const res = await contactPOST(makeReq("/api/contact", rest));
    expect(res.status).toBe(400);
  });

  it("happy path: pdConsent=true → INSERT", async () => {
    mockSql.mockResolvedValueOnce([{ id: 7 }]);
    const res = await contactPOST(makeReq("/api/contact", baseValid));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.id).toBe(7);
  });
});

// ===================================================================
// /api/leads/one-click
// ===================================================================
describe("POST /api/leads/one-click — pdConsent", () => {
  const baseValid = {
    name: "Пётр",
    phone: "+79324247740",
    pdConsent: true,
    product_name: "Визитки",
  };

  it("400 без pdConsent", async () => {
    const { pdConsent: _, ...rest } = baseValid;
    const res = await oneClickPOST(makeReq("/api/leads/one-click", rest));
    expect(res.status).toBe(400);
  });

  it("happy path: pdConsent=true → INSERT в leads", async () => {
    mockSql.mockResolvedValueOnce([{ id: 99 }]);
    const res = await oneClickPOST(makeReq("/api/leads/one-click", baseValid));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.lead_id).toBe(99);
  });
});

// ===================================================================
// Rate-limit
// ===================================================================
describe("POST /api/leads/quote — rate-limit (5/min)", () => {
  it("429 на 6-й запрос с одного IP", async () => {
    const ip = "203.0.113.200";
    const valid = {
      customer_name: "X",
      customer_phone: "+79324247740",
      pdConsent: true,
    };
    // 5 успешных:
    for (let i = 0; i < 5; i++) {
      mockSql.mockResolvedValueOnce([{ id: i + 1, request_number: null }]);
      const res = await quotePOST(makeReq("/api/leads/quote", valid, ip));
      expect(res.status).toBe(200);
    }
    // 6-й = 429.
    const res = await quotePOST(makeReq("/api/leads/quote", valid, ip));
    expect(res.status).toBe(429);
  });
});
