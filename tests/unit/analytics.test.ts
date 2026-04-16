/**
 * Unit-тесты для lib/analytics.ts
 *
 * ВАЖНО: analytics.ts читает process.env.NEXT_PUBLIC_YM_ID и NEXT_PUBLIC_GA4_ID
 * на верхнем уровне (module-scope). Если хочешь переключать env между тестами —
 * используй vi.resetModules() + динамический import внутри теста.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("EVENTS registry", () => {
  it("exposes 26 events as specified in metrics.md + Cart UI Stage 3.1", async () => {
    const { EVENTS } = await import("@/lib/analytics");
    const keys = Object.keys(EVENTS);

    // Макро-конверсии (7)
    expect(keys).toContain("purchase_complete");
    expect(keys).toContain("calc_request_submit");
    expect(keys).toContain("one_click_submit");
    expect(keys).toContain("contact_form_submit");
    expect(keys).toContain("phone_click");
    expect(keys).toContain("whatsapp_click");
    expect(keys).toContain("telegram_click");

    // Микро-конверсии (13)
    expect(keys).toContain("view_product");
    expect(keys).toContain("add_to_cart");
    expect(keys).toContain("remove_from_cart");
    expect(keys).toContain("begin_checkout");
    expect(keys).toContain("checkout_delivery");
    expect(keys).toContain("checkout_payment");
    expect(keys).toContain("calculator_start");
    expect(keys).toContain("calculator_result");
    expect(keys).toContain("email_subscribe");
    expect(keys).toContain("view_portfolio");
    expect(keys).toContain("view_category");
    expect(keys).toContain("search_submit");
    expect(keys).toContain("promo_applied");

    // Cart UI — Stage 3.1 (6)
    expect(keys).toContain("cart_view");
    expect(keys).toContain("cart_icon_click");
    expect(keys).toContain("cart_item_remove");
    expect(keys).toContain("cart_clear");
    expect(keys).toContain("checkout_start");
    expect(keys).toContain("promo_apply");

    // Checkout — Stage 3.2 (4)
    expect(keys).toContain("checkout_view");
    expect(keys).toContain("checkout_submit");
    expect(keys).toContain("order_created");
    expect(keys).toContain("order_error");

    // СДЭК + CDEK Pay — Stage 3.3+3.4 (4 new, purchase_complete already in macro)
    expect(keys).toContain("cdek_widget_open");
    expect(keys).toContain("cdek_select_pvz");
    expect(keys).toContain("payment_create");
    expect(keys).toContain("payment_redirect");

    expect(keys.length).toBe(34); // 7 macro + 13 micro + 6 cart UI + 4 checkout + 4 cdek/pay
  });

  it("every value equals its key (registry is self-referential)", async () => {
    const { EVENTS } = await import("@/lib/analytics");
    for (const [k, v] of Object.entries(EVENTS)) {
      expect(v).toBe(k);
    }
  });
});

describe("trackEvent — no-op без env", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_YM_ID;
    delete process.env.NEXT_PUBLIC_GA4_ID;
    // Чистим window от возможных остатков прошлого теста
    // @ts-expect-error — тестовый reset
    delete window.ym;
    // @ts-expect-error — тестовый reset
    delete window.gtag;
    // @ts-expect-error — тестовый reset
    delete window.dataLayer;
  });

  it("does not throw when YM_ID and GA4_ID are not set", async () => {
    const { trackEvent, EVENTS } = await import("@/lib/analytics");
    expect(() =>
      trackEvent(EVENTS.add_to_cart, { value: 100, currency: "RUB" }),
    ).not.toThrow();
  });

  it("does not call ym/gtag if they don't exist on window", async () => {
    const { trackEvent, EVENTS } = await import("@/lib/analytics");
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    trackEvent(EVENTS.phone_click);
    // В dev-режиме trackEvent логирует через console.info — проверяем что вызвался
    expect(spy).toHaveBeenCalledWith("[analytics]", "phone_click", {});
  });

  it("populates window.dataLayer when params.ecommerce is provided (even без env)", async () => {
    const { trackEvent, EVENTS } = await import("@/lib/analytics");
    trackEvent(EVENTS.add_to_cart, {
      ecommerce: { items: [{ item_id: "vizitki-1000", price: 1700 }] },
    });
    // @ts-expect-error — dataLayer добавляется аугментацией, которую тут не подключаем
    const dl = window.dataLayer as Array<Record<string, unknown>>;
    expect(Array.isArray(dl)).toBe(true);
    expect(dl.length).toBeGreaterThanOrEqual(1);
    expect(dl[dl.length - 1]).toMatchObject({
      event: "add_to_cart",
      ecommerce: { items: expect.any(Array) },
    });
  });
});

describe("trackEvent — с YM_ID", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_YM_ID = "99999999";
    delete process.env.NEXT_PUBLIC_GA4_ID;
  });

  afterEach(() => {
    // @ts-expect-error — ym добавляется внешним скриптом, в тестах мокаем
    delete window.ym;
    // @ts-expect-error — dataLayer добавляется внешним скриптом, в тестах мокаем
    delete window.dataLayer;
    delete process.env.NEXT_PUBLIC_YM_ID;
  });

  it("calls window.ym with reachGoal when ym is defined", async () => {
    const ym = vi.fn();
    // @ts-expect-error — ym добавляется внешним скриптом, в тестах мокаем
    window.ym = ym;
    const { trackEvent, EVENTS } = await import("@/lib/analytics");
    trackEvent(EVENTS.phone_click, { source: "header" });
    expect(ym).toHaveBeenCalledWith(
      99999999,
      "reachGoal",
      "phone_click",
      { source: "header" },
    );
  });

  it("catches ym exceptions without rethrowing", async () => {
    const ym = vi.fn(() => {
      throw new Error("metrika offline");
    });
    // @ts-expect-error — ym добавляется внешним скриптом, в тестах мокаем
    window.ym = ym;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { trackEvent, EVENTS } = await import("@/lib/analytics");
    expect(() => trackEvent(EVENTS.whatsapp_click)).not.toThrow();
    expect(warn).toHaveBeenCalled();
  });
});

describe("captureUtm / getCapturedUtm", () => {
  beforeEach(() => {
    vi.resetModules();
    window.sessionStorage.clear();
  });

  it("stores utm params from location.search", async () => {
    // jsdom позволяет переопределять location.search через reconfigure
    Object.defineProperty(window, "location", {
      value: new URL(
        "https://example.com/?utm_source=yandex&utm_medium=cpc&utm_campaign=visitki&yclid=abc123",
      ),
      writable: true,
    });

    const { captureUtm, getCapturedUtm } = await import("@/lib/analytics");
    captureUtm();

    const stored = getCapturedUtm();
    expect(stored).toEqual({
      utm_source: "yandex",
      utm_medium: "cpc",
      utm_campaign: "visitki",
      yclid: "abc123",
    });
  });

  it("does nothing when no utm params in URL", async () => {
    Object.defineProperty(window, "location", {
      value: new URL("https://example.com/"),
      writable: true,
    });
    const { captureUtm, getCapturedUtm } = await import("@/lib/analytics");
    captureUtm();
    expect(getCapturedUtm()).toBeNull();
  });

  it("does not throw when sessionStorage is unavailable (private mode)", async () => {
    const broken: Storage = {
      ...window.sessionStorage,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
      getItem: () => {
        throw new Error("blocked");
      },
      length: 0,
      clear() {},
      key() {
        return null;
      },
      removeItem() {},
    };
    Object.defineProperty(window, "sessionStorage", {
      value: broken,
      configurable: true,
    });
    Object.defineProperty(window, "location", {
      value: new URL("https://example.com/?utm_source=direct"),
      writable: true,
    });

    const { captureUtm, getCapturedUtm } = await import("@/lib/analytics");
    expect(() => captureUtm()).not.toThrow();
    expect(() => getCapturedUtm()).not.toThrow();
    expect(getCapturedUtm()).toBeNull();
  });
});
