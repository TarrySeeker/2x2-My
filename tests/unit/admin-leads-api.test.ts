/**
 * @vitest-environment node
 *
 * Unit-тесты для `features/admin/api/leads.ts` — низкоуровневые
 * хелперы (без проверки auth/audit).
 *
 * Покрывает:
 *  - isLeadType — whitelist
 *  - LEAD_TABLES — content (защита от регрессии)
 *  - deleteLead: бросает на невалидный type / id; формирует SQL
 *    через sql.unsafe c корректным именем таблицы из whitelist
 *  - getLeadDetail — для каждого типа дёргает sql, нормализует
 *    результат в LeadDetail
 */
import { describe, it, expect, beforeEach } from "vitest";

import { mockSql, resetSqlMock } from "../mocks/db";
import {
  LEAD_TABLES,
  LEAD_TYPES,
  deleteLead,
  getLeadDetail,
  isLeadType,
} from "@/features/admin/api/leads";

beforeEach(() => {
  resetSqlMock();
});

describe("isLeadType / LEAD_TABLES", () => {
  it("LEAD_TYPES = quote/one-click/contact", () => {
    expect(LEAD_TYPES).toEqual(["quote", "one-click", "contact"]);
  });

  it("isLeadType пропускает только whitelist", () => {
    expect(isLeadType("quote")).toBe(true);
    expect(isLeadType("one-click")).toBe(true);
    expect(isLeadType("contact")).toBe(true);
    expect(isLeadType("QUOTE")).toBe(false);
    expect(isLeadType("users")).toBe(false);
    expect(isLeadType("")).toBe(false);
    expect(isLeadType(null)).toBe(false);
    expect(isLeadType(undefined)).toBe(false);
    expect(isLeadType(123)).toBe(false);
  });

  it("LEAD_TABLES сопоставляет только реальные таблицы (защита от опечатки)", () => {
    expect(LEAD_TABLES.quote).toBe("calculation_requests");
    expect(LEAD_TABLES["one-click"]).toBe("leads");
    expect(LEAD_TABLES.contact).toBe("contact_requests");
  });
});

describe("deleteLead — валидация и подстановка имени таблицы", () => {
  it("бросает на не-валидный type", async () => {
    // @ts-expect-error — намеренно передаём плохой type
    await expect(deleteLead("DROP", 1)).rejects.toThrow(/Invalid lead type/);
  });

  it("бросает на не-целочисленный / не-положительный id", async () => {
    await expect(deleteLead("quote", 0)).rejects.toThrow(/Invalid lead id/);
    await expect(deleteLead("quote", -3)).rejects.toThrow(/Invalid lead id/);
    await expect(deleteLead("quote", 1.5)).rejects.toThrow(/Invalid lead id/);
  });

  it("quote → SQL DELETE FROM calculation_requests с параметризованным id", async () => {
    mockSql.unsafe.mockResolvedValueOnce([{ id: 42 }]);

    const deleted = await deleteLead("quote", 42);
    expect(deleted).toBe(1);

    expect(mockSql.unsafe).toHaveBeenCalledTimes(1);
    const [query, params] = mockSql.unsafe.mock.calls[0]!;
    expect(query).toContain("DELETE FROM calculation_requests");
    expect(query).toContain("WHERE id = $1");
    expect(params).toEqual([42]);
  });

  it("one-click → DELETE FROM leads", async () => {
    mockSql.unsafe.mockResolvedValueOnce([{ id: 7 }]);
    await deleteLead("one-click", 7);
    expect(mockSql.unsafe.mock.calls[0]![0]).toContain("DELETE FROM leads");
  });

  it("contact → DELETE FROM contact_requests", async () => {
    mockSql.unsafe.mockResolvedValueOnce([{ id: 11 }]);
    await deleteLead("contact", 11);
    expect(mockSql.unsafe.mock.calls[0]![0]).toContain(
      "DELETE FROM contact_requests",
    );
  });

  it("ничего не удалено → возвращает 0", async () => {
    mockSql.unsafe.mockResolvedValueOnce([]);
    const deleted = await deleteLead("quote", 9999);
    expect(deleted).toBe(0);
  });
});

describe("getLeadDetail", () => {
  it("quote: id числовой → SELECT WHERE c.id = $", async () => {
    mockSql.mockResolvedValueOnce([
      {
        id: 1,
        request_number: "CR-000001",
        status: "new",
        customer_name: "Иван",
        customer_phone: "+79324247740",
        customer_email: "i@example.com",
        company_name: null,
        comment: "Нужны визитки",
        params: { tirage: 1000 },
        attachments: ["https://example.com/file.pdf"],
        source_url: "https://2x2.ru/products/vizitki",
        promo_code: "VIZ500",
        pd_consent_at: "2026-04-25T10:00:00Z",
        pd_consent_version: "v1",
        pd_consent_ip: "203.0.113.5",
        idempotency_key: "key-1",
        manager_comment: null,
        assigned_to: null,
        created_at: "2026-04-25T10:00:00Z",
        product_name: "Визитки 90×50",
      },
    ]);

    const lead = await getLeadDetail("quote", "1");
    expect(lead).not.toBeNull();
    expect(lead!.type).toBe("quote");
    expect(lead!.refNumber).toBe("CR-000001");
    expect(lead!.service).toBe("Визитки 90×50");
    expect(lead!.message).toBe("Нужны визитки");
    expect(lead!.attachments).toHaveLength(1);
    expect(lead!.params).toEqual({ tirage: 1000 });
  });

  it("quote: ref CR-000001 → SELECT WHERE c.request_number = $", async () => {
    mockSql.mockResolvedValueOnce([
      {
        id: 5,
        request_number: "CR-000005",
        status: "new",
        customer_name: "А",
        customer_phone: "+79000000000",
        customer_email: null,
        company_name: null,
        comment: null,
        params: null,
        attachments: null,
        source_url: null,
        promo_code: null,
        pd_consent_at: null,
        pd_consent_version: null,
        pd_consent_ip: null,
        idempotency_key: null,
        manager_comment: null,
        assigned_to: null,
        created_at: "2026-04-25T10:00:00Z",
        product_name: null,
      },
    ]);

    const lead = await getLeadDetail("quote", "CR-000005");
    expect(lead).not.toBeNull();
    expect(lead!.id).toBe(5);
    // attachments NULL из БД → пустой массив наружу.
    expect(lead!.attachments).toEqual([]);
  });

  it("one-click: достаёт product_name из context, comment из context.comment", async () => {
    mockSql.mockResolvedValueOnce([
      {
        id: 11,
        status: "new",
        source: "one_click",
        customer_name: "Пётр",
        customer_phone: "+79324247740",
        customer_email: null,
        context: { product_name: "Визитки", comment: "Срочно" },
        page_url: "https://2x2.ru/products/vizitki",
        referer: "https://2x2.ru/",
        user_agent: "Mozilla/5.0",
        utm_source: "yandex",
        utm_medium: null,
        utm_campaign: null,
        promo_code: null,
        pd_consent_at: "2026-04-25T10:00:00Z",
        pd_consent_version: "v1",
        pd_consent_ip: "203.0.113.5",
        idempotency_key: null,
        manager_comment: null,
        assigned_to: null,
        created_at: "2026-04-25T10:00:00Z",
        product_name: null, // не нашли по product_id
      },
    ]);

    const lead = await getLeadDetail("one-click", "11");
    expect(lead).not.toBeNull();
    expect(lead!.type).toBe("one-click");
    expect(lead!.service).toBe("Визитки");
    expect(lead!.message).toBe("Срочно");
    expect(lead!.utm_source).toBe("yandex");
  });

  it("contact: возвращает subject как service", async () => {
    mockSql.mockResolvedValueOnce([
      {
        id: 22,
        status: "new",
        name: "Мария",
        phone: "+79044807740",
        email: "m@example.com",
        subject: "Хочу вывеску",
        message: "Подробное описание задачи…",
        promo_code: null,
        pd_consent_at: null,
        pd_consent_version: null,
        pd_consent_ip: null,
        idempotency_key: null,
        created_at: "2026-04-25T10:00:00Z",
      },
    ]);

    const lead = await getLeadDetail("contact", "22");
    expect(lead).not.toBeNull();
    expect(lead!.type).toBe("contact");
    expect(lead!.subject).toBe("Хочу вывеску");
    expect(lead!.service).toBe("Хочу вывеску");
    expect(lead!.message).toBe("Подробное описание задачи…");
  });

  it("contact: нечисловой id → null без обращения в БД", async () => {
    const lead = await getLeadDetail("contact", "abc");
    expect(lead).toBeNull();
    expect(mockSql).not.toHaveBeenCalled();
  });

  it("любой тип, пустой результат → null", async () => {
    mockSql.mockResolvedValueOnce([]);
    expect(await getLeadDetail("quote", "9999")).toBeNull();

    mockSql.mockResolvedValueOnce([]);
    expect(await getLeadDetail("one-click", "9999")).toBeNull();

    mockSql.mockResolvedValueOnce([]);
    expect(await getLeadDetail("contact", "9999")).toBeNull();
  });
});
