/**
 * @vitest-environment node
 *
 * Unit-тесты для `setFeaturedPortfolioAction`.
 * Покрывает:
 *  - max(3) — Zod отклоняет массив из 4+ id
 *  - non-positive id — отклоняется
 *  - happy path — вызывает setFeaturedPortfolio с переданными ids
 *  - DB error — возвращает {ok:false, error}
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

const { mockSetFeatured, mockRequireAdmin, mockUpdateTag, mockRevalidatePath } =
  vi.hoisted(() => ({
    mockSetFeatured: vi.fn(),
    mockRequireAdmin: vi.fn(),
    mockUpdateTag: vi.fn(),
    mockRevalidatePath: vi.fn(),
  }));

vi.mock("@/lib/data/portfolio", () => ({
  setFeaturedPortfolio: mockSetFeatured,
  PORTFOLIO_FEATURED_CACHE_TAG: "portfolio:featured",
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
import { setFeaturedPortfolioAction } from "@/features/admin/actions/portfolio";

beforeEach(() => {
  resetSqlMock();
  mockSetFeatured.mockReset();
  mockRequireAdmin.mockReset();
  mockUpdateTag.mockReset();
  mockRevalidatePath.mockReset();
  mockRequireAdmin.mockResolvedValue({
    id: "user-1",
    username: "admin",
    role: "owner",
  });
});

describe("setFeaturedPortfolioAction", () => {
  it("happy path: 3 валидных id → setFeaturedPortfolio + updateTag + revalidatePath", async () => {
    mockSetFeatured.mockResolvedValueOnce(undefined);
    mockSql.mockResolvedValueOnce([{}]); // log_admin_action

    const result = await setFeaturedPortfolioAction({ ids: [1, 2, 3] });
    expect(result.ok).toBe(true);
    expect(mockSetFeatured).toHaveBeenCalledWith([1, 2, 3]);
    expect(mockUpdateTag).toHaveBeenCalledWith("portfolio:featured");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/content/portfolio");
  });

  it("принимает пустой массив (сброс featured)", async () => {
    mockSetFeatured.mockResolvedValueOnce(undefined);
    mockSql.mockResolvedValueOnce([{}]);
    const result = await setFeaturedPortfolioAction({ ids: [] });
    expect(result.ok).toBe(true);
    expect(mockSetFeatured).toHaveBeenCalledWith([]);
  });

  it("отклоняет массив из 4+ id (Zod max(3))", async () => {
    const result = await setFeaturedPortfolioAction({ ids: [1, 2, 3, 4] });
    expect(result.ok).toBe(false);
    expect(mockSetFeatured).not.toHaveBeenCalled();
  });

  it("отклоняет 0 / отрицательные / нецелые", async () => {
    expect((await setFeaturedPortfolioAction({ ids: [0, 1] })).ok).toBe(false);
    expect((await setFeaturedPortfolioAction({ ids: [-3] })).ok).toBe(false);
    expect((await setFeaturedPortfolioAction({ ids: [1.5] })).ok).toBe(false);
    expect(mockSetFeatured).not.toHaveBeenCalled();
  });

  it("отклоняет невалидный input (не объект)", async () => {
    expect((await setFeaturedPortfolioAction(null)).ok).toBe(false);
    expect((await setFeaturedPortfolioAction("foo")).ok).toBe(false);
  });

  it("DB error → {ok:false, error}", async () => {
    mockSetFeatured.mockRejectedValueOnce(new Error("DB exploded"));
    const result = await setFeaturedPortfolioAction({ ids: [1, 2] });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/DB exploded|не удалось/i);
  });
});
