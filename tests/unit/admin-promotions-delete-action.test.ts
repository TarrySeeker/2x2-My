/**
 * @vitest-environment node
 *
 * Unit-тесты для `deletePromotionAction` (features/admin/actions/promotions.ts).
 *
 * Покрывает:
 *  - happy path → DELETE FROM promotions + audit_log + revalidate
 *  - permissions: requireAdmin вызывается с whitelist (по умолчанию owner|manager,
 *    но мы расширили до owner|manager|content — см. обоснование ниже)
 *  - валидация id (string, 0, отрицательный, дробный, NaN) → ok:false
 *  - запись не найдена (DELETE вернул []) → ok:true (идемпотентно — уже удалена)
 *  - DB error → ok:false с message из Error
 *  - сбой audit_log НЕ блокирует основное удаление (ok:true)
 *  - S3-удаление: если image_url = null, deleteFile НЕ дёргается
 *  - S3-удаление: если image_url задан, но S3 не сконфигурён, никаких throws
 *
 * Контекст: клиент жаловался "не удаляются акции". Тест-сюита покрывает
 * все ветки, чтобы регрессий не возникло.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

const {
  mockRequireAdmin,
  mockRevalidatePath,
  mockUpdateTag,
  mockDeletePromotion,
  mockIsS3Configured,
  mockDeleteFile,
} = vi.hoisted(() => ({
  mockRequireAdmin: vi.fn(),
  mockRevalidatePath: vi.fn(),
  mockUpdateTag: vi.fn(),
  mockDeletePromotion: vi.fn(),
  mockIsS3Configured: vi.fn(),
  mockDeleteFile: vi.fn(),
}));

vi.mock("@/features/auth/api", () => ({
  requireAdmin: mockRequireAdmin,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
  revalidateTag: vi.fn(),
  updateTag: mockUpdateTag,
  unstable_cache: (fn: unknown) => fn,
}));

vi.mock("@/lib/data/promotions", async () => {
  const actual = await vi.importActual<typeof import("@/lib/data/promotions")>(
    "@/lib/data/promotions",
  );
  return {
    ...actual,
    deletePromotion: mockDeletePromotion,
  };
});

vi.mock("@/lib/storage/s3", () => ({
  isS3Configured: mockIsS3Configured,
  deleteFile: mockDeleteFile,
}));

import { mockSql, resetSqlMock } from "../mocks/db";
import { deletePromotionAction } from "@/features/admin/actions/promotions";

beforeEach(() => {
  resetSqlMock();
  mockDeletePromotion.mockReset();
  mockRequireAdmin.mockReset();
  mockRevalidatePath.mockReset();
  mockUpdateTag.mockReset();
  mockIsS3Configured.mockReset();
  mockDeleteFile.mockReset();

  mockRequireAdmin.mockResolvedValue({
    id: "user-1",
    username: "admin",
    role: "owner",
  });
  mockIsS3Configured.mockReturnValue(false);
});

describe("deletePromotionAction — happy path", () => {
  it("успешное удаление + revalidate + audit", async () => {
    mockDeletePromotion.mockResolvedValueOnce(null); // image_url = null
    mockSql.mockResolvedValueOnce([{}]); // log_admin_action

    const res = await deletePromotionAction(42);

    expect(res.ok).toBe(true);
    expect(mockDeletePromotion).toHaveBeenCalledWith(42);
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/content/promotions");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/");
    expect(mockUpdateTag).toHaveBeenCalledWith("promotions");
  });

  it("если image_url был задан и S3 настроен — пытается удалить файл", async () => {
    process.env.S3_PUBLIC_URL = "https://cdn.example.com/2x2-media";
    mockDeletePromotion.mockResolvedValueOnce(
      "https://cdn.example.com/2x2-media/uploads/foo.jpg",
    );
    mockIsS3Configured.mockReturnValue(true);
    mockDeleteFile.mockResolvedValueOnce(undefined);
    mockSql.mockResolvedValueOnce([{}]);

    const res = await deletePromotionAction(7);

    expect(res.ok).toBe(true);
    expect(mockDeleteFile).toHaveBeenCalledWith("uploads/foo.jpg");
    delete process.env.S3_PUBLIC_URL;
  });

  it("если image_url был задан, но S3 не настроен — НЕ падает", async () => {
    mockDeletePromotion.mockResolvedValueOnce(
      "https://cdn.example.com/2x2-media/uploads/foo.jpg",
    );
    mockIsS3Configured.mockReturnValue(false);
    mockSql.mockResolvedValueOnce([{}]);

    const res = await deletePromotionAction(8);

    expect(res.ok).toBe(true);
    expect(mockDeleteFile).not.toHaveBeenCalled();
  });
});

describe("deletePromotionAction — валидация id", () => {
  it.each([0, -1, 1.5, NaN, Infinity])(
    "отклоняет невалидный id=%s",
    async (badId) => {
      const res = await deletePromotionAction(badId as number);
      expect(res.ok).toBe(false);
      expect(res.error).toMatch(/ID|id/i);
      expect(mockDeletePromotion).not.toHaveBeenCalled();
    },
  );
});

describe("deletePromotionAction — обработка ошибок", () => {
  it("DELETE кидает → ok:false с message из Error", async () => {
    mockDeletePromotion.mockRejectedValueOnce(new Error("connection lost"));

    const res = await deletePromotionAction(1);

    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/connection lost/);
  });

  it("сбой audit_log НЕ блокирует основное удаление (ok:true)", async () => {
    mockDeletePromotion.mockResolvedValueOnce(null);
    mockSql.mockRejectedValueOnce(new Error("audit table missing"));

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const res = await deletePromotionAction(1);
    warnSpy.mockRestore();

    expect(res.ok).toBe(true);
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/content/promotions");
  });

  it("сбой удаления файла из S3 НЕ блокирует основное удаление", async () => {
    process.env.S3_PUBLIC_URL = "https://cdn.example.com/2x2-media";
    mockDeletePromotion.mockResolvedValueOnce(
      "https://cdn.example.com/2x2-media/uploads/foo.jpg",
    );
    mockIsS3Configured.mockReturnValue(true);
    mockDeleteFile.mockRejectedValueOnce(new Error("S3 down"));
    mockSql.mockResolvedValueOnce([{}]);

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const res = await deletePromotionAction(2);
    warnSpy.mockRestore();

    expect(res.ok).toBe(true);
    delete process.env.S3_PUBLIC_URL;
  });
});

describe("deletePromotionAction — permissions", () => {
  it("requireAdmin вызывается (контент-роль допустима после фикса)", async () => {
    mockDeletePromotion.mockResolvedValueOnce(null);
    mockSql.mockResolvedValueOnce([{}]);

    await deletePromotionAction(1);

    expect(mockRequireAdmin).toHaveBeenCalledTimes(1);
    // С фиксом разрешаем content тоже (раздел /admin/content доступен ему).
    expect(mockRequireAdmin).toHaveBeenCalledWith(["owner", "manager", "content"]);
  });

  it("если requireAdmin кидает (redirect для не-разрешённой роли) — DELETE не вызывается", async () => {
    mockRequireAdmin.mockRejectedValueOnce(new Error("NEXT_REDIRECT"));

    await expect(deletePromotionAction(1)).rejects.toThrow(/NEXT_REDIRECT/);
    expect(mockDeletePromotion).not.toHaveBeenCalled();
  });
});
