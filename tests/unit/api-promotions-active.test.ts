/**
 * @vitest-environment node
 *
 * Unit-тесты для GET /api/promotions/active.
 *
 * Покрывает:
 *  - 200 с {popup, list}
 *  - popup = первый из listPopupPromotions, либо null
 *  - 429 на превышение rate-limit (60/min/IP)
 *  - 500 при ошибке БД, ответ вида { popup: null, list: [], error }
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

const { mockListActive, mockListPopup } = vi.hoisted(() => ({
  mockListActive: vi.fn(),
  mockListPopup: vi.fn(),
}));

vi.mock("@/lib/data/promotions", () => ({
  listActivePromotions: mockListActive,
  listPopupPromotions: mockListPopup,
  PROMOTIONS_CACHE_TAG: "promotions",
}));

// Мокаем next/cache: в node-окружении vitest нет `incrementalCache`,
// и оригинальный `unstable_cache` падает с Invariant. Подменяем на
// прямой проброс — так замоканные listActive/listPopup вызываются
// на каждом GET и тесты могут управлять их ответами.
vi.mock("next/cache", () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
}));

import { NextRequest } from "next/server";
import { GET } from "@/app/api/promotions/active/route";

let ipCounter = 0;
function uniqueIp(): string {
  ipCounter += 1;
  return `198.51.100.${(ipCounter % 250) + 1}`;
}

function makeRequest(ip = uniqueIp()): NextRequest {
  return new NextRequest("http://localhost/api/promotions/active", {
    method: "GET",
    headers: { "x-forwarded-for": ip },
  });
}

beforeEach(() => {
  mockListActive.mockReset();
  mockListPopup.mockReset();
});

describe("GET /api/promotions/active — happy path", () => {
  it("200 с popup=null когда нет popup-кандидатов", async () => {
    mockListActive.mockResolvedValue([
      { id: 1, title: "Акция 1", body: "...", show_as_popup: false },
    ]);
    mockListPopup.mockResolvedValue([]);

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.popup).toBeNull();
    expect(Array.isArray(body.list)).toBe(true);
  });

  it("200 с popup из listPopupPromotions[0]", async () => {
    mockListActive.mockResolvedValue([
      { id: 2, title: "Active 2", body: "...", show_as_popup: true },
    ]);
    mockListPopup.mockResolvedValue([
      { id: 2, title: "Popup", body: "Скидка!", show_as_popup: true },
    ]);

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.popup).not.toBeNull();
    expect(body.popup.title).toBe("Popup");
  });

  it("ставит Cache-Control header", async () => {
    mockListActive.mockResolvedValue([]);
    mockListPopup.mockResolvedValue([]);
    const res = await GET(makeRequest());
    expect(res.headers.get("cache-control")).toMatch(/public/);
    expect(res.headers.get("cache-control")).toMatch(/stale-while-revalidate/);
  });
});

describe("GET /api/promotions/active — rate-limit", () => {
  it("429 на 61-й запрос за минуту с одного IP", async () => {
    mockListActive.mockResolvedValue([]);
    mockListPopup.mockResolvedValue([]);
    const ip = "198.51.100.99";
    for (let i = 0; i < 60; i++) {
      const res = await GET(makeRequest(ip));
      expect(res.status).toBe(200);
    }
    const res = await GET(makeRequest(ip));
    expect(res.status).toBe(429);
  });
});

describe("GET /api/promotions/active — error path", () => {
  it("500 при ошибке БД, ответ {popup:null, list:[], error}", async () => {
    mockListActive.mockRejectedValue(new Error("DB down"));
    mockListPopup.mockRejectedValue(new Error("DB down"));
    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.popup).toBeNull();
    expect(body.list).toEqual([]);
    expect(body.error).toBeTruthy();
  });
});
