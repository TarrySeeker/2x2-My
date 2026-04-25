/**
 * @vitest-environment node
 *
 * Регрессионный тест P0-бага «quote leads теряются молча».
 *
 * История:
 *   В `app/api/leads/quote/route.ts` колонка `calculation_requests.attachments`
 *   объявлена как `TEXT[]` (см. db/migrations/002_schema.sql:222), но код
 *   передавал её через `sql.json(attachments)` — что сериализует в JSONB.
 *   Postgres падал с `column "attachments" is of type text[] but expression
 *   is of type jsonb`, ошибка проглатывалась `console.warn`, а клиенту
 *   возвращалось `{ success: true }`. Заявки исчезали бесследно.
 *
 * Контракт после фикса:
 *   1. attachments кладутся в БД через `sql.array(value, 1009)` (text[] OID),
 *      НЕ через `sql.json`. Mock `sql.array` должен быть вызван хотя бы раз.
 *   2. Массив URL'ов передаётся в INSERT как есть (после Zod-валидации).
 *   3. Пустой массив тоже OK (default из Zod схемы).
 *   4. Если INSERT упал по любой причине (кроме 23505 idempotency duplicate),
 *      ответ должен быть `500`, а НЕ ложный `success: true`.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

import { mockSql, resetSqlMock } from "../mocks/db";

vi.mock("@/lib/notifications", () => ({
  sendNotification: vi.fn(async () => undefined),
}));

import { NextRequest } from "next/server";
import { POST as quotePOST } from "@/app/api/leads/quote/route";

let ipCounter = 200;
function uniqueIp(): string {
  ipCounter += 1;
  return `198.51.100.${(ipCounter % 250) + 1}`;
}

function makeReq(
  body: unknown,
  ip = uniqueIp(),
  extraHeaders: Record<string, string> = {},
): NextRequest {
  return new NextRequest("http://localhost/api/leads/quote", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": ip,
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  });
}

const baseValid = {
  customer_name: "Иван Иванов",
  customer_phone: "+79324247740",
  pdConsent: true,
} as const;

beforeEach(() => {
  resetSqlMock();
});

describe("POST /api/leads/quote — attachments TEXT[] regression", () => {
  it("attachments передаются через sql.array (НЕ sql.json) — иначе INSERT падает", async () => {
    mockSql.mockResolvedValueOnce([{ id: 101, request_number: "REQ-0101" }]);

    const url1 = "https://cdn.example.com/file1.pdf";
    const url2 = "https://cdn.example.com/file2.png";

    const res = await quotePOST(
      makeReq({
        ...baseValid,
        attachments: [url1, url2],
      }),
    );

    expect(res.status).toBe(200);

    // Главное утверждение фикса: для attachments TEXT[] вызывается sql.array,
    // а не sql.json. sql.json остаётся для params JSONB.
    expect(mockSql.array).toHaveBeenCalled();
    const arrayCall = mockSql.array.mock.calls.find(
      (call) => Array.isArray(call[0]) && call[0].length === 2,
    );
    expect(arrayCall).toBeDefined();
    expect(arrayCall?.[0]).toEqual([url1, url2]);
    // OID 1009 = text[] в Postgres. С неправильным OID INSERT тоже упадёт.
    expect(arrayCall?.[1]).toBe(1009);
  });

  it("пустой массив attachments (default из Zod) → sql.array([], 1009)", async () => {
    mockSql.mockResolvedValueOnce([{ id: 102, request_number: "REQ-0102" }]);

    const res = await quotePOST(makeReq({ ...baseValid }));

    expect(res.status).toBe(200);
    // Пустой массив тоже должен пойти через sql.array — это default из Zod.
    const emptyArrayCall = mockSql.array.mock.calls.find(
      (call) => Array.isArray(call[0]) && call[0].length === 0,
    );
    expect(emptyArrayCall).toBeDefined();
    expect(emptyArrayCall?.[1]).toBe(1009);
  });

  it("attachments НЕ должны проходить через sql.json (это и был баг)", async () => {
    mockSql.mockResolvedValueOnce([{ id: 103, request_number: "REQ-0103" }]);

    const urls = ["https://cdn.example.com/a.pdf"];
    await quotePOST(makeReq({ ...baseValid, attachments: urls }));

    // sql.json мог быть вызван для `params` (JSONB) — это ОК.
    // Но НЕ должно быть вызова sql.json с тем же массивом URL.
    const jsonCalls = mockSql.json.mock.calls;
    const offendingCall = jsonCalls.find(
      (call) => JSON.stringify(call[0]) === JSON.stringify(urls),
    );
    expect(offendingCall).toBeUndefined();
  });

  it("INSERT упал → ответ 500, а не ложный success: true", async () => {
    // Эмулируем именно ту ошибку, которой страдал прод:
    // "column attachments is of type text[] but expression is of type jsonb".
    const dbError = Object.assign(
      new Error(
        'column "attachments" is of type text[] but expression is of type jsonb',
      ),
      { code: "42804" },
    );
    mockSql.mockRejectedValueOnce(dbError);

    const res = await quotePOST(
      makeReq({
        ...baseValid,
        attachments: ["https://cdn.example.com/z.pdf"],
      }),
    );

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBeUndefined();
    expect(body.error).toBeTruthy();
  });

  it("RETURNING вернул пустой массив → ответ 500 (защита от silent loss)", async () => {
    // Если по какой-то причине RETURNING пустой (например, триггер вернул
    // NULL row) — мы не должны отдать клиенту success без request_id.
    mockSql.mockResolvedValueOnce([]);

    const res = await quotePOST(makeReq({ ...baseValid }));

    expect(res.status).toBe(500);
  });

  it("успешный INSERT → 200 с request_id и request_number", async () => {
    mockSql.mockResolvedValueOnce([{ id: 999, request_number: "REQ-0999" }]);

    const res = await quotePOST(
      makeReq({
        ...baseValid,
        attachments: ["https://cdn.example.com/spec.pdf"],
        comment: "Тестовая заявка",
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.request_id).toBe(999);
    expect(body.request_number).toBe("REQ-0999");
  });

  it("идемпотентность: повтор с тем же ключом → duplicate без второго INSERT", async () => {
    // Первый запрос находит существующую запись по idempotency_key.
    mockSql.mockResolvedValueOnce([
      { id: 555, request_number: "REQ-0555" },
    ]);

    const res = await quotePOST(
      makeReq(
        { ...baseValid },
        uniqueIp(),
        { "idempotency-key": "test-key-attachments-regression" },
      ),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.duplicate).toBe(true);
    expect(body.request_id).toBe(555);
  });
});
