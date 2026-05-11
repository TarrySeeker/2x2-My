/**
 * @vitest-environment node
 *
 * Unit-тесты для server actions `features/admin/actions/page-sections.ts`.
 *
 * Покрывает специально:
 *   - upsertPageSectionAction для path='/' инвалидирует и '/' и
 *     '/admin/content/homepage' и '/admin/content/homepage/<key>'
 *     (важно для исправления bug «правки в админке не доходят до
 *     сайта», задача унификации CMS).
 *   - whitelist отвергает запросы с произвольными парами (page_path,
 *     section_key).
 *   - валидация Zod-схемы home_hero выполняется до записи.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

const {
  mockUpsertPageSection,
  mockReorderPageSections,
  mockSetPageSectionEnabled,
  mockRequireAdmin,
  mockUpdateTag,
  mockRevalidatePath,
} = vi.hoisted(() => ({
  mockUpsertPageSection: vi.fn(),
  mockReorderPageSections: vi.fn(),
  mockSetPageSectionEnabled: vi.fn(),
  mockRequireAdmin: vi.fn(),
  mockUpdateTag: vi.fn(),
  mockRevalidatePath: vi.fn(),
}));

vi.mock("@/lib/data/page-sections", () => ({
  upsertPageSection: mockUpsertPageSection,
  reorderPageSections: mockReorderPageSections,
  setPageSectionEnabled: mockSetPageSectionEnabled,
  pageSectionsCacheTag: (p: string) => `page-sections:${p}`,
}));

vi.mock("@/features/auth/api", () => ({
  requireAdmin: mockRequireAdmin,
  requireResource: mockRequireAdmin,
  requireOwner: mockRequireAdmin,
  requireAuth: mockRequireAdmin,
}));

vi.mock("next/cache", () => ({
  updateTag: mockUpdateTag,
  revalidatePath: mockRevalidatePath,
  revalidateTag: vi.fn(),
  unstable_cache: (fn: unknown) => fn,
}));

import { mockSql, resetSqlMock } from "../mocks/db";
import {
  upsertPageSectionAction,
  togglePageSectionAction,
} from "@/features/admin/actions/page-sections";

beforeEach(() => {
  resetSqlMock();
  mockUpsertPageSection.mockReset();
  mockReorderPageSections.mockReset();
  mockSetPageSectionEnabled.mockReset();
  mockRequireAdmin.mockReset();
  mockUpdateTag.mockReset();
  mockRevalidatePath.mockReset();
  mockRequireAdmin.mockResolvedValue({ id: "u1", role: "owner" });
});

describe("upsertPageSectionAction для path='/'", () => {
  it("happy: hero на главной → upsert + revalidatePath('/') + revalidatePath('/admin/content/homepage')", async () => {
    mockUpsertPageSection.mockResolvedValueOnce({
      id: "s1",
      pagePath: "/",
      sectionKey: "hero",
      contentType: "home_hero",
      content: {},
      displayOrder: 10,
      enabled: true,
      updatedAt: "2026-04-25",
    });
    mockSql.mockResolvedValueOnce([{}]); // log_admin_action

    const res = await upsertPageSectionAction("/", "hero", {
      eyebrow: "Реклама",
      headline_line1: "Мы создаём",
      headline_accent: "рекламу",
      headline_line3: "сегодня",
      typewriter: "2x2",
      subheadline: "Подзаголовок",
      cta_primary_text: "Получить",
      cta_primary_url: "quote_modal",
      cta_secondary_text: "Работы",
      cta_secondary_url: "/portfolio",
    });

    expect(res.ok).toBe(true);
    expect(mockUpsertPageSection).toHaveBeenCalledTimes(1);
    expect(mockUpsertPageSection).toHaveBeenCalledWith(
      expect.objectContaining({
        page_path: "/",
        section_key: "hero",
        content_type: "home_hero",
      }),
      "u1",
    );
    expect(mockUpdateTag).toHaveBeenCalledWith("page-sections:/");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/content/sections");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/content/homepage");
    expect(mockRevalidatePath).toHaveBeenCalledWith(
      "/admin/content/homepage/hero",
    );
  });

  it("отвергает (page_path, section_key) не из whitelist", async () => {
    const res = await upsertPageSectionAction("/", "evil-key", { foo: 1 });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/не определена/i);
    expect(mockUpsertPageSection).not.toHaveBeenCalled();
  });

  it("отвергает невалидный content по home_about (нет required headline)", async () => {
    const res = await upsertPageSectionAction("/", "about", {
      paragraphs: ["А"],
      // headline отсутствует — Zod отклонит
    });
    expect(res.ok).toBe(false);
    expect(mockUpsertPageSection).not.toHaveBeenCalled();
  });

  it("happy: about на главной с минимальным content", async () => {
    mockUpsertPageSection.mockResolvedValueOnce({
      id: "s1",
      pagePath: "/",
      sectionKey: "about",
      contentType: "home_about",
      content: {},
      displayOrder: 50,
      enabled: true,
      updatedAt: "2026-04-25",
    });
    mockSql.mockResolvedValueOnce([{}]);

    const res = await upsertPageSectionAction("/", "about", {
      headline: "О нас",
    });
    expect(res.ok).toBe(true);
  });

  it("для не-главных путей не инвалидирует /admin/content/homepage", async () => {
    mockUpsertPageSection.mockResolvedValueOnce({
      id: "s1",
      pagePath: "/about",
      sectionKey: "hero",
      contentType: "hero",
      content: {},
      displayOrder: 10,
      enabled: true,
      updatedAt: "2026-04-25",
    });
    mockSql.mockResolvedValueOnce([{}]);

    const res = await upsertPageSectionAction("/about", "hero", {
      title: "Привет",
    });
    expect(res.ok).toBe(true);
    expect(mockRevalidatePath).toHaveBeenCalledWith("/about");
    expect(mockRevalidatePath).not.toHaveBeenCalledWith(
      "/admin/content/homepage",
    );
  });
});

describe("togglePageSectionAction для path='/'", () => {
  it("выключение секции инвалидирует /admin/content/homepage", async () => {
    mockSetPageSectionEnabled.mockResolvedValueOnce(undefined);
    const res = await togglePageSectionAction("/", "hero", false);
    expect(res.ok).toBe(true);
    expect(mockRevalidatePath).toHaveBeenCalledWith("/");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/content/homepage");
  });
});
