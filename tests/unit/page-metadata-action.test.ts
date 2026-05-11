/**
 * @vitest-environment node
 *
 * Unit-тесты для updatePageMetadataAction.
 * Покрывает:
 *   - отклонение path вне allow-list
 *   - валидация payload (регекс path, keywords)
 *   - happy path с upsert + updateTag + revalidatePath
 *   - path в payload игнорируется, используется rawPath из URL
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

const {
  mockUpsertPageMetadata,
  mockRequireAdmin,
  mockUpdateTag,
  mockRevalidatePath,
} = vi.hoisted(() => ({
  mockUpsertPageMetadata: vi.fn(),
  mockRequireAdmin: vi.fn(),
  mockUpdateTag: vi.fn(),
  mockRevalidatePath: vi.fn(),
}));

vi.mock("@/lib/data/page-metadata", () => ({
  upsertPageMetadata: mockUpsertPageMetadata,
  pageMetadataCacheTag: (p: string) => `page-meta:${p}`,
}));

vi.mock("@/features/auth/api", () => ({
  requireAdmin: mockRequireAdmin,
  requireResource: mockRequireAdmin,
  requireOwner: mockRequireAdmin,
  requireAuth: mockRequireAdmin,
}));

vi.mock("next/cache", () => ({
  unstable_cache: (fn: unknown) => fn,
  revalidatePath: mockRevalidatePath,
  updateTag: mockUpdateTag,
  revalidateTag: vi.fn(),
}));

import { mockSql, resetSqlMock } from "../mocks/db";
import { updatePageMetadataAction } from "@/features/admin/actions/page-metadata";

beforeEach(() => {
  resetSqlMock();
  mockUpsertPageMetadata.mockReset();
  mockRequireAdmin.mockReset();
  mockUpdateTag.mockReset();
  mockRevalidatePath.mockReset();
  mockRequireAdmin.mockResolvedValue({ id: "u1", role: "owner" });
  mockSql.mockResolvedValue([]);
});

describe("updatePageMetadataAction", () => {
  it("отклоняет path вне allow-list", async () => {
    const res = await updatePageMetadataAction("/hack", { title: "x" });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/Неизвестная/i);
    expect(mockUpsertPageMetadata).not.toHaveBeenCalled();
  });

  it("отклоняет слишком длинный title", async () => {
    const tooLong = "a".repeat(250);
    const res = await updatePageMetadataAction("/about", { title: tooLong });
    expect(res.ok).toBe(false);
    expect(mockUpsertPageMetadata).not.toHaveBeenCalled();
  });

  it("happy path: upsert + updateTag + revalidatePath", async () => {
    mockUpsertPageMetadata.mockResolvedValueOnce({
      id: "pm-1",
      path: "/about",
      title: "О нас",
      description: "Описание",
      keywords: ["о нас"],
      ogImage: null,
      noindex: false,
      canonical: null,
      updatedAt: "2026-04-24",
    });
    const res = await updatePageMetadataAction("/about", {
      title: "О нас",
      description: "Описание",
      keywords: ["о нас"],
    });
    expect(res.ok).toBe(true);
    expect(mockUpsertPageMetadata).toHaveBeenCalledTimes(1);
    expect(mockUpdateTag).toHaveBeenCalledWith("page-meta:/about");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/about");
  });

  it("path в payload игнорируется — используется rawPath", async () => {
    mockUpsertPageMetadata.mockResolvedValueOnce({
      id: "pm-1",
      path: "/about",
      title: null,
      description: null,
      keywords: [],
      ogImage: null,
      noindex: false,
      canonical: null,
      updatedAt: "2026-04-24",
    });
    const res = await updatePageMetadataAction("/about", {
      path: "/contacts", // подмена
      title: "О нас",
    });
    expect(res.ok).toBe(true);
    const firstCall = mockUpsertPageMetadata.mock.calls[0][0];
    expect(firstCall.path).toBe("/about");
  });

  it("если requireAdmin бросил — не выполняется", async () => {
    mockRequireAdmin.mockRejectedValueOnce(new Error("unauthorized"));
    await expect(
      updatePageMetadataAction("/about", { title: "x" }),
    ).rejects.toThrow();
    expect(mockUpsertPageMetadata).not.toHaveBeenCalled();
  });
});
