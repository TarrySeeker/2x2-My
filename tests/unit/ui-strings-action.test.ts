/**
 * @vitest-environment node
 *
 * Unit-тесты для server actions ui-strings:
 *   - updateUiStringAction — guard, валидация ключа, updateTag
 *   - bulkUpdateUiStringsAction — транзакция, rollback при фейле
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

const {
  mockUpdateUiString,
  mockUpdateUiStringsBulk,
  mockRequireAdmin,
  mockUpdateTag,
  mockRevalidatePath,
} = vi.hoisted(() => ({
  mockUpdateUiString: vi.fn(),
  mockUpdateUiStringsBulk: vi.fn(),
  mockRequireAdmin: vi.fn(),
  mockUpdateTag: vi.fn(),
  mockRevalidatePath: vi.fn(),
}));

vi.mock("@/lib/data/ui-strings", () => ({
  updateUiString: mockUpdateUiString,
  updateUiStringsBulk: mockUpdateUiStringsBulk,
  UI_STRINGS_CACHE_TAG: "ui-strings",
}));

vi.mock("@/features/auth/api", () => ({
  requireAdmin: mockRequireAdmin,
}));

vi.mock("next/cache", () => ({
  unstable_cache: (fn: unknown) => fn,
  revalidatePath: mockRevalidatePath,
  updateTag: mockUpdateTag,
  revalidateTag: vi.fn(),
}));

import { mockSql, resetSqlMock } from "../mocks/db";
import {
  updateUiStringAction,
  bulkUpdateUiStringsAction,
} from "@/features/admin/actions/ui-strings";

beforeEach(() => {
  resetSqlMock();
  mockUpdateUiString.mockReset();
  mockUpdateUiStringsBulk.mockReset();
  mockRequireAdmin.mockReset();
  mockUpdateTag.mockReset();
  mockRevalidatePath.mockReset();
  mockRequireAdmin.mockResolvedValue({ id: "u1", role: "content" });
  mockSql.mockResolvedValue([]); // audit_log по умолчанию молча успешен
});

describe("updateUiStringAction", () => {
  it("отклоняет невалидный ключ (без dot notation)", async () => {
    const res = await updateUiStringAction("BADKEY", "value");
    expect(res.ok).toBe(false);
    expect(mockUpdateUiString).not.toHaveBeenCalled();
  });

  it("отклоняет пустое значение", async () => {
    const res = await updateUiStringAction("form.name.label", "");
    expect(res.ok).toBe(false);
    expect(mockUpdateUiString).not.toHaveBeenCalled();
  });

  it("возвращает ошибку, если ключа нет в БД", async () => {
    mockUpdateUiString.mockResolvedValueOnce(false);
    const res = await updateUiStringAction("form.name.label", "Имя");
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/не найдена/i);
  });

  it("happy path: обновляет, инвалидирует тег, revalidate layout", async () => {
    mockUpdateUiString.mockResolvedValueOnce(true);
    const res = await updateUiStringAction("form.name.label", "Имя");
    expect(res.ok).toBe(true);
    expect(res.updated).toBe(1);
    expect(mockUpdateUiString).toHaveBeenCalledWith(
      "form.name.label",
      "Имя",
      "u1",
    );
    expect(mockUpdateTag).toHaveBeenCalledWith("ui-strings");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("если requireAdmin бросил — action не выполняется", async () => {
    mockRequireAdmin.mockRejectedValueOnce(new Error("unauthorized"));
    await expect(
      updateUiStringAction("form.name.label", "X"),
    ).rejects.toThrow();
    expect(mockUpdateUiString).not.toHaveBeenCalled();
  });
});

describe("bulkUpdateUiStringsAction", () => {
  it("пустой список — ok:true, updated:0 без вызовов", async () => {
    const res = await bulkUpdateUiStringsAction([]);
    expect(res.ok).toBe(true);
    expect(res.updated).toBe(0);
    expect(mockUpdateUiStringsBulk).not.toHaveBeenCalled();
  });

  it("отклоняет, если один из ключей невалиден", async () => {
    const res = await bulkUpdateUiStringsAction([
      { key: "form.name.label", value: "Имя" },
      { key: "BAD", value: "X" },
    ]);
    expect(res.ok).toBe(false);
    expect(mockUpdateUiStringsBulk).not.toHaveBeenCalled();
  });

  it("дедуплицирует дубликаты ключей по последнему значению", async () => {
    mockUpdateUiStringsBulk.mockResolvedValueOnce(2);
    const res = await bulkUpdateUiStringsAction([
      { key: "form.name.label", value: "Имя 1" },
      { key: "form.name.label", value: "Имя 2" }, // побеждает
      { key: "form.phone.label", value: "Телефон" },
    ]);
    expect(res.ok).toBe(true);
    const call = mockUpdateUiStringsBulk.mock.calls[0][0] as Array<{
      key: string;
      value: string;
    }>;
    expect(call).toHaveLength(2);
    const name = call.find((c) => c.key === "form.name.label");
    expect(name?.value).toBe("Имя 2");
  });

  it("если data-layer бросил (эмуляция rollback в транзакции) — возвращает ok:false", async () => {
    mockUpdateUiStringsBulk.mockRejectedValueOnce(
      new Error("ui_strings: ключ «missing.key» не найден"),
    );
    const res = await bulkUpdateUiStringsAction([
      { key: "form.name.label", value: "Имя" },
      { key: "missing.key", value: "X" },
    ]);
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/missing\.key|не найден/);
  });

  it("happy: вызывает updateUiStringsBulk + updateTag", async () => {
    mockUpdateUiStringsBulk.mockResolvedValueOnce(3);
    const res = await bulkUpdateUiStringsAction([
      { key: "form.name.label", value: "Имя" },
      { key: "form.phone.label", value: "Телефон" },
      { key: "form.email.label", value: "Email" },
    ]);
    expect(res.ok).toBe(true);
    expect(res.updated).toBe(3);
    expect(mockUpdateTag).toHaveBeenCalledWith("ui-strings");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/", "layout");
  });
});
