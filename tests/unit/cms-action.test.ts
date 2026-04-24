/**
 * @vitest-environment node
 *
 * Unit-тесты для `updateSectionAction` (features/admin/actions/cms.ts).
 * Покрывает:
 *  - неизвестный key → {ok:false, error}
 *  - невалидный contentJson по схеме секции → {ok:false, error}
 *  - happy: валидный hero → upsertSection вызван, updateTag/revalidatePath
 *  - audit_log не падает upsert даже если log_admin_action кидает ошибку
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

const {
  mockUpsertSection,
  mockSetSectionPublished,
  mockRequireAdmin,
  mockUpdateTag,
  mockRevalidatePath,
} = vi.hoisted(() => ({
  mockUpsertSection: vi.fn(),
  mockSetSectionPublished: vi.fn(),
  mockRequireAdmin: vi.fn(),
  mockUpdateTag: vi.fn(),
  mockRevalidatePath: vi.fn(),
}));

vi.mock("@/lib/data/cms", () => ({
  upsertSection: mockUpsertSection,
  setSectionPublished: mockSetSectionPublished,
}));

vi.mock("@/features/auth/api", () => ({
  requireAdmin: mockRequireAdmin,
}));

vi.mock("next/cache", () => ({
  updateTag: mockUpdateTag,
  revalidatePath: mockRevalidatePath,
  revalidateTag: vi.fn(),
  unstable_cache: (fn: unknown) => fn,
}));

import { mockSql, resetSqlMock } from "../mocks/db";
import {
  updateSectionAction,
  setSectionPublishedAction,
} from "@/features/admin/actions/cms";

beforeEach(() => {
  resetSqlMock();
  mockUpsertSection.mockReset();
  mockSetSectionPublished.mockReset();
  mockRequireAdmin.mockReset();
  mockUpdateTag.mockReset();
  mockRevalidatePath.mockReset();
  mockRequireAdmin.mockResolvedValue({ id: "u1", role: "owner" });
});

describe("updateSectionAction", () => {
  it("отклоняет неизвестный ключ секции", async () => {
    const res = await updateSectionAction("unknown_key", {});
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/Неизвестная|unknown/i);
    expect(mockUpsertSection).not.toHaveBeenCalled();
  });

  it("отклоняет невалидный contentJson (нет required headline у about)", async () => {
    const res = await updateSectionAction("about", { paragraphs: [] });
    expect(res.ok).toBe(false);
    expect(mockUpsertSection).not.toHaveBeenCalled();
  });

  it("happy: валидный hero → upsertSection + updateTag('cms:hero') + revalidatePath('/')", async () => {
    mockUpsertSection.mockResolvedValueOnce({
      key: "hero",
      content: {},
      isPublished: true,
      updatedAt: new Date().toISOString(),
    });
    mockSql.mockResolvedValueOnce([{}]); // log_admin_action

    const res = await updateSectionAction("hero", {
      eyebrow: "Реклама",
      headline_line1: "Реклама,",
      headline_accent: "которая работает",
      headline_line3: "",
      typewriter: "печать",
      subheadline: "...",
      cta_primary_text: "Получить",
      cta_primary_url: "quote_modal",
      cta_secondary_text: "Работы",
      cta_secondary_url: "/portfolio",
    });

    expect(res.ok).toBe(true);
    expect(mockUpsertSection).toHaveBeenCalledTimes(1);
    expect(mockUpsertSection).toHaveBeenCalledWith(
      "hero",
      expect.objectContaining({ eyebrow: "Реклама" }),
      "u1",
    );
    expect(mockUpdateTag).toHaveBeenCalledWith("cms:hero");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/content/homepage");
  });

  it("если audit_log упал — основной upsert всё равно успех", async () => {
    mockUpsertSection.mockResolvedValueOnce({
      key: "hero",
      content: {},
      isPublished: true,
      updatedAt: new Date().toISOString(),
    });
    mockSql.mockRejectedValueOnce(new Error("audit table missing"));

    const res = await updateSectionAction("hero", {
      eyebrow: "x",
    });
    expect(res.ok).toBe(true);
  });

  it("если upsertSection бросил исключение — {ok:false, error}", async () => {
    mockUpsertSection.mockRejectedValueOnce(new Error("DB connection lost"));
    const res = await updateSectionAction("hero", { eyebrow: "x" });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/DB connection lost|не удалось/i);
  });
});

describe("setSectionPublishedAction", () => {
  it("отклоняет неизвестный ключ", async () => {
    const res = await setSectionPublishedAction("unknown_key", true);
    expect(res.ok).toBe(false);
    expect(mockSetSectionPublished).not.toHaveBeenCalled();
  });

  it("happy path", async () => {
    mockSetSectionPublished.mockResolvedValueOnce(undefined);
    const res = await setSectionPublishedAction("hero", false);
    expect(res.ok).toBe(true);
    expect(mockSetSectionPublished).toHaveBeenCalledWith("hero", false, "u1");
    expect(mockUpdateTag).toHaveBeenCalledWith("cms:hero");
  });
});
