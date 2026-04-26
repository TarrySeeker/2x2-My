/**
 * @vitest-environment node
 *
 * Unit-тесты для CRUD server actions портфолио:
 *  - createPortfolioItemAction
 *  - updatePortfolioItemAction
 *  - deletePortfolioItemAction
 *  - reorderPortfolioItemsAction
 *  - togglePortfolioPublishedAction
 *
 * Проверяем:
 *  - Permission gating (delete доступен только owner/manager).
 *  - Zod-валидация (slug, title, обложка, ids).
 *  - Cache invalidation (revalidatePath/Tag, updateTag).
 *  - Audit-log вызывается, но не валит экшн при ошибке.
 *  - Дружественные ошибки про unique slug.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

const {
  mockRequireAdmin,
  mockUpdateTag,
  mockRevalidatePath,
  mockSetFeatured,
  mockCreate,
  mockUpdate,
  mockDelete,
  mockReorder,
} = vi.hoisted(() => ({
  mockRequireAdmin: vi.fn(),
  mockUpdateTag: vi.fn(),
  mockRevalidatePath: vi.fn(),
  mockSetFeatured: vi.fn(),
  mockCreate: vi.fn(),
  mockUpdate: vi.fn(),
  mockDelete: vi.fn(),
  mockReorder: vi.fn(),
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
  revalidateTag: vi.fn(),
  revalidatePath: mockRevalidatePath,
  unstable_cache: (fn: unknown) => fn,
}));

vi.mock("@/features/admin/api/portfolio", () => ({
  createPortfolioItem: mockCreate,
  updatePortfolioItem: mockUpdate,
  deletePortfolioItem: mockDelete,
  reorderPortfolioItems: mockReorder,
}));

import { mockSql, resetSqlMock } from "../mocks/db";
import {
  createPortfolioItemAction,
  updatePortfolioItemAction,
  deletePortfolioItemAction,
  reorderPortfolioItemsAction,
  togglePortfolioPublishedAction,
} from "@/features/admin/actions/portfolio";

const VALID_PAYLOAD = {
  title: "Крышная вывеска ВТБ",
  slug: "vtb-roof-sign",
  description: "Светодиодная крышная вывеска для отделения банка ВТБ",
  short_description: null,
  category_id: null,
  category_label: "Наружная реклама",
  related_product_id: null,
  client_name: "ВТБ",
  industry: "Банки",
  location: "Ханты-Мансийск",
  year: 2024,
  project_date: null,
  cover_url: "/2x2-media/portfolio/vtb-cover.jpg",
  images: [
    "/2x2-media/portfolio/vtb-1.jpg",
    "/2x2-media/portfolio/vtb-2.jpg",
  ],
  video_url: null,
  is_published: true,
  sort_order: 5,
  seo_title: null,
  seo_description: null,
  published_at: null,
};

beforeEach(() => {
  resetSqlMock();
  mockRequireAdmin.mockReset();
  mockUpdateTag.mockReset();
  mockRevalidatePath.mockReset();
  mockSetFeatured.mockReset();
  mockCreate.mockReset();
  mockUpdate.mockReset();
  mockDelete.mockReset();
  mockReorder.mockReset();
  mockRequireAdmin.mockResolvedValue({
    id: "user-1",
    username: "admin",
    role: "owner",
  });
  // По умолчанию любой sql-запрос (audit-log) проходит без ошибки
  mockSql.mockResolvedValue([{}]);
});

// ─────────────────────────────────────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────────────────────────────────────

describe("createPortfolioItemAction", () => {
  it("happy path: валидные данные → INSERT, cache invalidation, audit", async () => {
    mockCreate.mockResolvedValueOnce({ id: 42 });

    const res = await createPortfolioItemAction(VALID_PAYLOAD);

    expect(res.ok).toBe(true);
    expect(res.data).toEqual({ id: 42 });
    expect(mockCreate).toHaveBeenCalledOnce();
    expect(mockUpdateTag).toHaveBeenCalledWith("portfolio:featured");
    expect(mockUpdateTag).toHaveBeenCalledWith("portfolio");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/portfolio");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/content/portfolio");
    // audit
    expect(mockSql).toHaveBeenCalled();
  });

  it("отклоняет невалидный slug (с заглавными)", async () => {
    const res = await createPortfolioItemAction({
      ...VALID_PAYLOAD,
      slug: "VTB-Roof",
    });
    expect(res.ok).toBe(false);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("отклоняет пустой title", async () => {
    const res = await createPortfolioItemAction({
      ...VALID_PAYLOAD,
      title: "",
    });
    expect(res.ok).toBe(false);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("отклоняет пустой cover_url", async () => {
    const res = await createPortfolioItemAction({
      ...VALID_PAYLOAD,
      cover_url: "",
    });
    expect(res.ok).toBe(false);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("дружественная ошибка про unique slug", async () => {
    mockCreate.mockRejectedValueOnce(
      new Error(
        'duplicate key value violates unique constraint "portfolio_items_slug_key"',
      ),
    );

    const res = await createPortfolioItemAction(VALID_PAYLOAD);
    expect(res.ok).toBe(false);
    expect(res.error).toContain("уже занят");
  });

  it("audit-error НЕ ломает action", async () => {
    mockCreate.mockResolvedValueOnce({ id: 7 });
    mockSql.mockReset();
    mockSql.mockRejectedValueOnce(new Error("audit-table missing"));

    const res = await createPortfolioItemAction(VALID_PAYLOAD);
    expect(res.ok).toBe(true);
  });

  it("принимает роль content (контент-менеджер может создавать)", async () => {
    mockRequireAdmin.mockResolvedValueOnce({
      id: "u-2",
      username: "content",
      role: "content",
    });
    mockCreate.mockResolvedValueOnce({ id: 1 });
    const res = await createPortfolioItemAction(VALID_PAYLOAD);
    expect(res.ok).toBe(true);
    expect(mockRequireAdmin).toHaveBeenCalledWith([
      "owner",
      "manager",
      "content",
    ]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────────────────────────────────────

describe("updatePortfolioItemAction", () => {
  it("happy path", async () => {
    mockUpdate.mockResolvedValueOnce(undefined);
    const res = await updatePortfolioItemAction(15, VALID_PAYLOAD);
    expect(res.ok).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith(15, expect.objectContaining({
      title: VALID_PAYLOAD.title,
      slug: VALID_PAYLOAD.slug,
    }));
    expect(mockRevalidatePath).toHaveBeenCalledWith("/portfolio");
  });

  it("отклоняет нечисловой id", async () => {
    const res = await updatePortfolioItemAction("foo", VALID_PAYLOAD);
    expect(res.ok).toBe(false);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("отклоняет 0 / отрицательный id", async () => {
    expect((await updatePortfolioItemAction(0, VALID_PAYLOAD)).ok).toBe(false);
    expect((await updatePortfolioItemAction(-3, VALID_PAYLOAD)).ok).toBe(false);
  });

  it("дружественная ошибка про unique slug на update", async () => {
    mockUpdate.mockRejectedValueOnce(
      new Error(
        'duplicate key value violates unique constraint "portfolio_items_slug_key"',
      ),
    );
    const res = await updatePortfolioItemAction(1, VALID_PAYLOAD);
    expect(res.ok).toBe(false);
    expect(res.error).toContain("занят другим");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE — permission gating
// ─────────────────────────────────────────────────────────────────────────────

describe("deletePortfolioItemAction", () => {
  it("happy path для owner/manager", async () => {
    mockDelete.mockResolvedValueOnce(undefined);
    const res = await deletePortfolioItemAction(99);
    expect(res.ok).toBe(true);
    expect(mockDelete).toHaveBeenCalledWith(99);
    // requireAdmin должен быть вызван БЕЗ "content"
    expect(mockRequireAdmin).toHaveBeenCalledWith(["owner", "manager"]);
  });

  it("отклоняет некорректный id", async () => {
    const res = await deletePortfolioItemAction("not-a-number");
    expect(res.ok).toBe(false);
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("DB error → {ok:false, error}", async () => {
    mockDelete.mockRejectedValueOnce(new Error("FK violation"));
    const res = await deletePortfolioItemAction(5);
    expect(res.ok).toBe(false);
    expect(res.error).toContain("FK violation");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// REORDER
// ─────────────────────────────────────────────────────────────────────────────

describe("reorderPortfolioItemsAction", () => {
  it("happy path", async () => {
    mockReorder.mockResolvedValueOnce(undefined);
    const orders = [
      { id: 1, sort_order: 0 },
      { id: 2, sort_order: 10 },
      { id: 3, sort_order: 20 },
    ];
    const res = await reorderPortfolioItemsAction(orders);
    expect(res.ok).toBe(true);
    expect(mockReorder).toHaveBeenCalledWith(orders);
  });

  it("отклоняет пустой массив (min(1))", async () => {
    const res = await reorderPortfolioItemsAction([]);
    expect(res.ok).toBe(false);
    expect(mockReorder).not.toHaveBeenCalled();
  });

  it("отклоняет неправильную форму (без id)", async () => {
    const res = await reorderPortfolioItemsAction([{ sort_order: 1 }]);
    expect(res.ok).toBe(false);
    expect(mockReorder).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TOGGLE PUBLISHED
// ─────────────────────────────────────────────────────────────────────────────

describe("togglePortfolioPublishedAction", () => {
  it("happy path: published=true", async () => {
    mockSql.mockReset();
    mockSql.mockResolvedValueOnce([]); // UPDATE
    mockSql.mockResolvedValueOnce([{}]); // audit

    const res = await togglePortfolioPublishedAction(7, true);
    expect(res.ok).toBe(true);
    expect(mockSql).toHaveBeenCalled();
    expect(mockRevalidatePath).toHaveBeenCalledWith("/portfolio");
  });

  it("отклоняет невалидный id", async () => {
    const res = await togglePortfolioPublishedAction("x", true);
    expect(res.ok).toBe(false);
  });

  it("отклоняет невалидный флаг", async () => {
    const res = await togglePortfolioPublishedAction(1, "yes");
    expect(res.ok).toBe(false);
  });
});
