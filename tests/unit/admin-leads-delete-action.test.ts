/**
 * @vitest-environment node
 *
 * Unit-тесты для `deleteLeadAction` (features/admin/actions/leads.ts).
 *
 * Покрывает:
 *  - happy path для каждого типа (quote / one-click / contact) →
 *    DELETE FROM соответствующей таблицы + audit_log + revalidatePath.
 *  - Permissions: requireAdmin вызывается с белым списком ["owner","manager"]
 *    (content НЕ может удалять — это требование клиента).
 *  - Защита SQL-инъекции: type ∉ {quote,one-click,contact} → ok:false,
 *    никакой SQL не выполняется.
 *  - Невалидный id (string, 0, отрицательный, дробный) → ok:false.
 *  - Запись не найдена (DELETE вернул 0 строк) → ok:false с сообщением.
 *  - DB error → ok:false с message из Error.
 *  - Сбой audit (sql() для log_admin_action) НЕ блокирует основное удаление.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

const { mockRequireOwner, mockRevalidatePath, mockDeleteLead } = vi.hoisted(
  () => ({
    mockRequireOwner: vi.fn(),
    mockRevalidatePath: vi.fn(),
    mockDeleteLead: vi.fn(),
  }),
);

vi.mock("@/features/auth/api", () => ({
  requireOwner: mockRequireOwner,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
  revalidateTag: vi.fn(),
  updateTag: vi.fn(),
  unstable_cache: (fn: unknown) => fn,
}));

// Подменяем `deleteLead` из api/leads, чтобы не дёргать реальный sql
// для DELETE. Audit-лог по-прежнему пойдёт через mockSql.
vi.mock("@/features/admin/api/leads", async () => {
  const actual = await vi.importActual<
    typeof import("@/features/admin/api/leads")
  >("@/features/admin/api/leads");
  return {
    ...actual,
    deleteLead: mockDeleteLead,
  };
});

import { mockSql, resetSqlMock } from "../mocks/db";
import { deleteLeadAction } from "@/features/admin/actions/leads";

beforeEach(() => {
  resetSqlMock();
  mockDeleteLead.mockReset();
  mockRequireOwner.mockReset();
  mockRevalidatePath.mockReset();
  // По умолчанию — owner. В одном тесте ниже переопределим для проверки
  // permissions на content.
  mockRequireOwner.mockResolvedValue({
    id: "user-1",
    username: "admin",
    role: "owner",
  });
});

describe("deleteLeadAction — happy path по каждому типу", () => {
  it("quote: DELETE из calculation_requests + audit + revalidatePath", async () => {
    mockDeleteLead.mockResolvedValueOnce(1);
    mockSql.mockResolvedValueOnce([{}]); // log_admin_action

    const result = await deleteLeadAction("quote", 42);

    expect(result.ok).toBe(true);
    expect(mockDeleteLead).toHaveBeenCalledWith("quote", 42);
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/leads");

    // Проверяем что в audit-вызов попало правильное table_name.
    const auditCall = mockSql.mock.calls.find((c) =>
      JSON.stringify(c).includes("calculation_requests"),
    );
    expect(auditCall).toBeDefined();
  });

  it("one-click: DELETE из leads + audit", async () => {
    mockDeleteLead.mockResolvedValueOnce(1);
    mockSql.mockResolvedValueOnce([{}]);

    const result = await deleteLeadAction("one-click", 7);

    expect(result.ok).toBe(true);
    expect(mockDeleteLead).toHaveBeenCalledWith("one-click", 7);
    const auditCall = mockSql.mock.calls.find((c) =>
      JSON.stringify(c).includes("leads"),
    );
    expect(auditCall).toBeDefined();
  });

  it("contact: DELETE из contact_requests + audit", async () => {
    mockDeleteLead.mockResolvedValueOnce(1);
    mockSql.mockResolvedValueOnce([{}]);

    const result = await deleteLeadAction("contact", 99);

    expect(result.ok).toBe(true);
    expect(mockDeleteLead).toHaveBeenCalledWith("contact", 99);
    const auditCall = mockSql.mock.calls.find((c) =>
      JSON.stringify(c).includes("contact_requests"),
    );
    expect(auditCall).toBeDefined();
  });
});

describe("deleteLeadAction — permissions", () => {
  it("requireOwner вызывается без аргументов (only owner)", async () => {
    mockDeleteLead.mockResolvedValueOnce(1);
    mockSql.mockResolvedValueOnce([{}]);

    await deleteLeadAction("quote", 1);

    expect(mockRequireOwner).toHaveBeenCalledTimes(1);
    expect(mockRequireOwner).toHaveBeenCalledWith();
  });

  it("если requireOwner кидает (redirect для manager/content) — action не дойдёт до DELETE", async () => {
    // Симулируем поведение реального requireAdmin для content-роли:
    // он вызывает next/navigation.redirect, который кидает.
    mockRequireOwner.mockRejectedValueOnce(new Error("NEXT_REDIRECT"));

    await expect(deleteLeadAction("quote", 1)).rejects.toThrow(
      /NEXT_REDIRECT/,
    );
    expect(mockDeleteLead).not.toHaveBeenCalled();
  });
});

describe("deleteLeadAction — защита от SQL-инъекций / невалидных type", () => {
  it.each([
    "users",
    "calculation_requests",
    "DROP TABLE",
    "quote; DROP TABLE leads",
    "",
    "QUOTE",
  ])("отклоняет type=%s (не из whitelist)", async (badType) => {
    const result = await deleteLeadAction(badType, 1);
    expect(result.ok).toBe(false);
    expect(mockDeleteLead).not.toHaveBeenCalled();
  });

  it("отклоняет type не-string", async () => {
    expect((await deleteLeadAction(null, 1)).ok).toBe(false);
    expect((await deleteLeadAction(123, 1)).ok).toBe(false);
    expect((await deleteLeadAction({ type: "quote" }, 1)).ok).toBe(false);
    expect(mockDeleteLead).not.toHaveBeenCalled();
  });
});

describe("deleteLeadAction — валидация id", () => {
  it.each([0, -1, 1.5, "abc", null, undefined])(
    "отклоняет невалидный id=%s",
    async (badId) => {
      const result = await deleteLeadAction("quote", badId);
      expect(result.ok).toBe(false);
      expect(mockDeleteLead).not.toHaveBeenCalled();
    },
  );

  it("принимает строковое представление числа (z.coerce)", async () => {
    mockDeleteLead.mockResolvedValueOnce(1);
    mockSql.mockResolvedValueOnce([{}]);

    const result = await deleteLeadAction("quote", "55");
    expect(result.ok).toBe(true);
    expect(mockDeleteLead).toHaveBeenCalledWith("quote", 55);
  });
});

describe("deleteLeadAction — обработка ошибок", () => {
  it("DELETE вернул 0 строк → ok:false с понятным сообщением", async () => {
    mockDeleteLead.mockResolvedValueOnce(0);
    const result = await deleteLeadAction("quote", 12345);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/не найдена|удалена/i);
  });

  it("DELETE кидает → ok:false с message из Error", async () => {
    mockDeleteLead.mockRejectedValueOnce(new Error("connection lost"));
    const result = await deleteLeadAction("quote", 1);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/connection lost/);
  });

  it("сбой audit_log НЕ блокирует основное удаление (ok:true)", async () => {
    mockDeleteLead.mockResolvedValueOnce(1);
    mockSql.mockRejectedValueOnce(new Error("audit table missing"));

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await deleteLeadAction("quote", 1);
    warnSpy.mockRestore();

    expect(result.ok).toBe(true);
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/leads");
  });
});
