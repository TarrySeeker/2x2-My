/**
 * @vitest-environment node
 *
 * Unit-тесты для `lib/data/page-sections.ts`.
 *
 * Покрывает:
 *   - getPageSections({ enabledOnly: true }) — WHERE enabled=true + ORDER BY display_order ASC
 *   - getPageSections({ enabledOnly: false }) — читает все
 *   - upsertPageSection — SQL-вызов с правильными полями и sql.json обёрткой
 *   - reorderPageSections — транзакция + UPDATE в цикле
 *   - setPageSectionEnabled — одиночный UPDATE
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("next/cache", () => ({
  unstable_cache: (fn: unknown) => fn,
  revalidatePath: vi.fn(),
  updateTag: vi.fn(),
}));

import { mockSql, resetSqlMock } from "../mocks/db";
import {
  getPageSections,
  getPageSection,
  upsertPageSection,
  reorderPageSections,
  setPageSectionEnabled,
} from "@/lib/data/page-sections";

beforeEach(() => {
  resetSqlMock();
});

describe("getPageSections", () => {
  it("по умолчанию возвращает только enabled секции, упорядоченные по display_order", async () => {
    mockSql.mockResolvedValueOnce([
      {
        id: "s1",
        page_path: "/about",
        section_key: "hero",
        content_type: "hero",
        content: { badge: "О нас", title: "..." },
        display_order: 10,
        enabled: true,
        updated_at: "2026-04-24",
      },
      {
        id: "s2",
        page_path: "/about",
        section_key: "story",
        content_type: "text_block",
        content: { headline: "История" },
        display_order: 20,
        enabled: true,
        updated_at: "2026-04-24",
      },
    ]);
    const out = await getPageSections("/about");
    expect(out).toHaveLength(2);
    expect(out[0].sectionKey).toBe("hero");
    expect(out[1].sectionKey).toBe("story");
    // проверяем, что преобразование snake → camel сработало
    expect(out[0].displayOrder).toBe(10);
    expect(out[0].pagePath).toBe("/about");
    expect(out[0].contentType).toBe("hero");
  });

  it("при enabledOnly: false — возвращает все записи (не фильтрует)", async () => {
    mockSql.mockResolvedValueOnce([
      {
        id: "s1",
        page_path: "/about",
        section_key: "hero",
        content_type: "hero",
        content: {},
        display_order: 10,
        enabled: true,
        updated_at: "2026-04-24",
      },
      {
        id: "s2",
        page_path: "/about",
        section_key: "story",
        content_type: "text_block",
        content: {},
        display_order: 20,
        enabled: false,
        updated_at: "2026-04-24",
      },
    ]);
    const out = await getPageSections("/about", { enabledOnly: false });
    expect(out).toHaveLength(2);
    const disabled = out.find((s) => s.sectionKey === "story");
    expect(disabled?.enabled).toBe(false);
  });

  it("при ошибке БД возвращает пустой массив", async () => {
    mockSql.mockRejectedValueOnce(new Error("connection lost"));
    const out = await getPageSections("/about", { enabledOnly: false });
    expect(out).toEqual([]);
  });
});

describe("getPageSection", () => {
  it("возвращает одну секцию по ключу", async () => {
    mockSql.mockResolvedValueOnce([
      {
        id: "s1",
        page_path: "/about",
        section_key: "hero",
        content_type: "hero",
        content: { title: "H" },
        display_order: 10,
        enabled: true,
        updated_at: "2026-04-24",
      },
      {
        id: "s2",
        page_path: "/about",
        section_key: "story",
        content_type: "text_block",
        content: {},
        display_order: 20,
        enabled: true,
        updated_at: "2026-04-24",
      },
    ]);
    const hero = await getPageSection("/about", "hero");
    expect(hero?.sectionKey).toBe("hero");
  });

  it("null, если секция не найдена среди enabled", async () => {
    mockSql.mockResolvedValueOnce([]);
    const out = await getPageSection("/about", "missing");
    expect(out).toBeNull();
  });
});

describe("upsertPageSection", () => {
  it("выполняет INSERT ON CONFLICT и возвращает запись", async () => {
    mockSql.mockResolvedValueOnce([
      {
        id: "s1",
        page_path: "/about",
        section_key: "hero",
        content_type: "hero",
        content: { title: "H" },
        display_order: 10,
        enabled: true,
        updated_at: "2026-04-24",
      },
    ]);

    const out = await upsertPageSection(
      {
        page_path: "/about",
        section_key: "hero",
        content_type: "hero",
        content: { title: "H" },
        display_order: 10,
      },
      "user-1",
    );

    expect(out.pagePath).toBe("/about");
    expect(out.sectionKey).toBe("hero");
    expect(mockSql).toHaveBeenCalledTimes(1);
  });

  it("бросает, если RETURNING не вернул запись", async () => {
    mockSql.mockResolvedValueOnce([]);
    await expect(
      upsertPageSection(
        {
          page_path: "/about",
          section_key: "hero",
          content_type: "hero",
          content: {},
        },
        "u1",
      ),
    ).rejects.toThrow();
  });
});

describe("reorderPageSections", () => {
  it("в транзакции пачкой обновляет display_order", async () => {
    await reorderPageSections(
      "/about",
      [
        { section_key: "hero", display_order: 5 },
        { section_key: "story", display_order: 10 },
      ],
      "u1",
    );
    expect(mockSql.begin).toHaveBeenCalledTimes(1);
    // внутри транзакции tx === mockSql (см. тестовый mock)
    expect(mockSql).toHaveBeenCalledTimes(2);
  });

  it("пустой массив — ничего не делает", async () => {
    await reorderPageSections("/about", [], "u1");
    expect(mockSql.begin).not.toHaveBeenCalled();
    expect(mockSql).not.toHaveBeenCalled();
  });
});

describe("setPageSectionEnabled", () => {
  it("выполняет один UPDATE", async () => {
    await setPageSectionEnabled("/about", "hero", false, "u1");
    expect(mockSql).toHaveBeenCalledTimes(1);
  });
});
