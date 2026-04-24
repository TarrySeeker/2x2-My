/**
 * @vitest-environment node
 *
 * Unit-тесты для `lib/data/page-content.ts`.
 *
 * Покрывает:
 *   - renderPlaceholders: подстановка/неизвестные ключи/экранирование
 *   - buildPlaceholderMap: корректно берёт значения из site_settings
 *   - formatPolicyDate через renderPlaceholders (косвенно)
 *   - getPageContent: сквозная подстановка, published=false → null
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

const { mockGetSettingValue } = vi.hoisted(() => ({
  mockGetSettingValue: vi.fn(),
}));

vi.mock("@/lib/data/settings", () => ({
  getSettingValue: mockGetSettingValue,
}));

vi.mock("next/cache", () => ({
  unstable_cache: (fn: unknown) => fn,
  revalidatePath: vi.fn(),
  updateTag: vi.fn(),
}));

import { mockSql, resetSqlMock } from "../mocks/db";
import {
  renderPlaceholders,
  buildPlaceholderMap,
  getPageContent,
} from "@/lib/data/page-content";

beforeEach(() => {
  resetSqlMock();
  mockGetSettingValue.mockReset();
});

describe("renderPlaceholders", () => {
  it("подставляет известные ключи", () => {
    const md = "Компания {legal_name}, ИНН {inn}, телефон {phone}.";
    const out = renderPlaceholders(md, {
      legal_name: "ИП Сивоконь А.А.",
      inn: "860205123456",
      phone: "+7 (932) 424-77-40",
    });
    expect(out).toBe(
      "Компания ИП Сивоконь А.А., ИНН 860205123456, телефон +7 (932) 424-77-40.",
    );
  });

  it("оставляет неизвестные плейсхолдеры как есть", () => {
    const md = "Привет {unknown_key}, я {legal_name}.";
    const out = renderPlaceholders(md, { legal_name: "2х2" });
    expect(out).toBe("Привет {unknown_key}, я 2х2.");
  });

  it("подставляет несколько вхождений одного ключа", () => {
    const md = "{inn} и ещё раз {inn}";
    const out = renderPlaceholders(md, { inn: "1234567890" });
    expect(out).toBe("1234567890 и ещё раз 1234567890");
  });

  it("пустое значение заменяет плейсхолдер пустой строкой", () => {
    const md = "{legal_name}X";
    const out = renderPlaceholders(md, { legal_name: "" });
    expect(out).toBe("X");
  });

  it("нечувствителен к регистру ключа, но значения берёт из lowercase-map", () => {
    const md = "{LEGAL_NAME}";
    const out = renderPlaceholders(md, { legal_name: "2х2" });
    expect(out).toBe("2х2");
  });
});

describe("buildPlaceholderMap", () => {
  it("собирает ключи из legal_entity, contacts, pd_consent", async () => {
    mockGetSettingValue.mockImplementation(async (key: string) => {
      if (key === "legal_entity") {
        return {
          legal_name: "ИП Сивоконь А.А.",
          inn: "860205123456",
          ogrn: "304860223400064",
          kpp: "",
          legal_address: "Ханты-Мансийск, ул. Парковая 92 Б",
          actual_address: "Ханты-Мансийск, ул. Парковая 92 Б",
        };
      }
      if (key === "contacts") {
        return {
          phone_primary: "+7 (932) 424-77-40",
          email: "info@2x2.ru",
        };
      }
      if (key === "pd_consent") {
        return { current_version: "2026-04-23", policy_url: "/privacy" };
      }
      return {};
    });

    const map = await buildPlaceholderMap();
    expect(map.legal_name).toBe("ИП Сивоконь А.А.");
    expect(map.inn).toBe("860205123456");
    expect(map.phone).toBe("+7 (932) 424-77-40");
    expect(map.email).toBe("info@2x2.ru");
    expect(map.policy_version).toBe("2026-04-23");
    expect(map.policy_date).toBe("23 апреля 2026 г.");
  });

  it("отсутствующие данные дают пустые строки", async () => {
    mockGetSettingValue.mockResolvedValue({});
    const map = await buildPlaceholderMap();
    expect(map.legal_name).toBe("");
    expect(map.inn).toBe("");
    expect(map.phone).toBe("");
    expect(map.policy_date).toBe("");
  });

  it("если policy_version — не ISO-дата, policy_date = raw value", async () => {
    mockGetSettingValue.mockImplementation(async (key: string) =>
      key === "pd_consent"
        ? { current_version: "v7", policy_url: "/privacy" }
        : {},
    );
    const map = await buildPlaceholderMap();
    expect(map.policy_version).toBe("v7");
    expect(map.policy_date).toBe("v7");
  });
});

describe("getPageContent", () => {
  it("возвращает markdown с подставленными плейсхолдерами", async () => {
    mockGetSettingValue.mockImplementation(async (key: string) => {
      if (key === "legal_entity") {
        return { legal_name: "ИП Сивоконь А.А.", inn: "860205123456" };
      }
      if (key === "contacts") {
        return { phone_primary: "+7 (932) 424-77-40", email: "x@y.z" };
      }
      if (key === "pd_consent") {
        return { current_version: "2026-04-23" };
      }
      return {};
    });

    mockSql.mockResolvedValueOnce([
      {
        id: "pc-1",
        path: "/privacy",
        title: "Политика",
        content_markdown:
          "Оператор: {legal_name}, ИНН {inn}. Контакт: {phone}. Версия {policy_version} от {policy_date}.",
        version: 1,
        published: true,
        updated_at: new Date("2026-04-24T00:00:00Z"),
      },
    ]);

    const out = await getPageContent("/privacy");
    expect(out).not.toBeNull();
    expect(out!.contentMarkdown).toBe(
      "Оператор: ИП Сивоконь А.А., ИНН 860205123456. Контакт: +7 (932) 424-77-40. Версия 2026-04-23 от 23 апреля 2026 г..",
    );
    expect(out!.version).toBe(1);
    expect(out!.title).toBe("Политика");
  });

  it("не возвращает контент, если published = false", async () => {
    mockSql.mockResolvedValueOnce([
      {
        id: "pc-1",
        path: "/privacy",
        title: "Политика",
        content_markdown: "text",
        version: 2,
        published: false,
        updated_at: "2026-04-24",
      },
    ]);
    const out = await getPageContent("/privacy");
    expect(out).toBeNull();
  });

  it("возвращает null, если запись отсутствует", async () => {
    mockSql.mockResolvedValueOnce([]);
    const out = await getPageContent("/privacy");
    expect(out).toBeNull();
  });

  it("при ошибке БД не бросает, возвращает null", async () => {
    mockSql.mockRejectedValueOnce(new Error("connection refused"));
    const out = await getPageContent("/privacy");
    expect(out).toBeNull();
  });
});
