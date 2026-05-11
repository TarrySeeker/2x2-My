/**
 * @vitest-environment node
 *
 * Unit-тесты для сохранения координат офиса в site_settings.contacts.
 *
 * Контекст. Долгое время координаты были захардкожены в
 * components/sections/contacts/ContactMap.tsx — клиент менял их в
 * /admin/content/settings → Контакты, сохранение проходило, но карта
 * на /contacts не обновлялась. Этот тест фиксирует исправление:
 *   1) Zod-схема contactsSettingSchema принимает lat/lng как number и null,
 *      и не теряет их при пустых соседних полях (грабля Кат. 1).
 *   2) updateSiteSettingAction при ключе `contacts`:
 *       - вызывает upsertSetting с теми же значениями lat/lng,
 *       - инвалидирует cache-tag `settings:contacts` (через updateTag),
 *       - инвалидирует путь /contacts,
 *       - инвалидирует root-layout `/` (для Header/Footer, читающих
 *         site_settings.contacts).
 *   3) Грабли LESSONS_LEARNED Кат. 1: defaultValues с числами не должны
 *      превращаться в null (мы валидируем через safeParse), а
 *      revalidatePath должен вызываться с 'layout' для глобальных
 *      настроек.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

import { contactsSettingSchema } from "@/features/admin/schemas/site-settings";

// ── 1) Чистые проверки Zod-схемы (без моков БД) ──

describe("contactsSettingSchema — координаты офиса", () => {
  it("принимает оба значения как числа", () => {
    const result = contactsSettingSchema.safeParse({
      phone_primary: "+7-932-424-77-40",
      address_geo: { lat: 61.0029, lng: 69.0019 },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.address_geo.lat).toBe(61.0029);
      expect(result.data.address_geo.lng).toBe(69.0019);
    }
  });

  it("принимает оба null (клиент очистил поля)", () => {
    const result = contactsSettingSchema.safeParse({
      phone_primary: "+7-932-424-77-40",
      address_geo: { lat: null, lng: null },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.address_geo.lat).toBeNull();
      expect(result.data.address_geo.lng).toBeNull();
    }
  });

  it("по умолчанию подставляет null если address_geo отсутствует", () => {
    const result = contactsSettingSchema.safeParse({
      phone_primary: "+7-932-424-77-40",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.address_geo).toEqual({ lat: null, lng: null });
    }
  });

  it("отклоняет строку вместо числа (lat='abc')", () => {
    const result = contactsSettingSchema.safeParse({
      phone_primary: "+7-932-424-77-40",
      address_geo: { lat: "abc", lng: 69.0019 },
    });
    expect(result.success).toBe(false);
  });

  it("отклоняет undefined у обязательного телефона", () => {
    const result = contactsSettingSchema.safeParse({
      address_geo: { lat: 61.0029, lng: 69.0019 },
    });
    expect(result.success).toBe(false);
  });

  it("сохраняет дробные значения с высокой точностью (6 знаков)", () => {
    const result = contactsSettingSchema.safeParse({
      phone_primary: "+7-932-424-77-40",
      address_geo: { lat: 61.003481, lng: 69.018763 },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      // JSONB не теряет точность float64 — проверим побайтово.
      expect(result.data.address_geo.lat).toBe(61.003481);
      expect(result.data.address_geo.lng).toBe(69.018763);
    }
  });
});

// ── 2) Интеграция с updateSiteSettingAction (моки БД + next/cache) ──

const {
  mockUpsertSetting,
  mockRequireAdmin,
  mockUpdateTag,
  mockRevalidatePath,
} = vi.hoisted(() => ({
  mockUpsertSetting: vi.fn(),
  mockRequireAdmin: vi.fn(),
  mockUpdateTag: vi.fn(),
  mockRevalidatePath: vi.fn(),
}));

vi.mock("@/lib/data/settings", () => ({
  upsertSetting: mockUpsertSetting,
  // getSetting не нужен для теста action'а, но импорт может подтянуться.
  getSetting: vi.fn(),
  getSettingValue: vi.fn(),
  listSettings: vi.fn(),
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
import { updateSiteSettingAction } from "@/features/admin/actions/site-settings";

beforeEach(() => {
  resetSqlMock();
  mockUpsertSetting.mockReset();
  mockRequireAdmin.mockReset();
  mockUpdateTag.mockReset();
  mockRevalidatePath.mockReset();
  mockRequireAdmin.mockResolvedValue({ id: "admin-1", role: "owner" });
});

describe("updateSiteSettingAction — сохранение координат и инвалидация", () => {
  it("happy: координаты сохраняются и кэш инвалидируется правильно", async () => {
    mockUpsertSetting.mockResolvedValueOnce({
      key: "contacts",
      value: {
        phone_primary: "+7-932-424-77-40",
        address: "г. Ханты-Мансийск, ул. Парковая 92 Б",
        address_geo: { lat: 61.0029, lng: 69.0019 },
      },
      updatedAt: new Date().toISOString(),
    });
    // log_admin_action — пусть не падает
    mockSql.mockResolvedValueOnce([{}]);

    const res = await updateSiteSettingAction("contacts", {
      phone_primary: "+7-932-424-77-40",
      address: "г. Ханты-Мансийск, ул. Парковая 92 Б",
      address_geo: { lat: 61.0029, lng: 69.0019 },
    });

    expect(res.ok).toBe(true);

    // upsertSetting вызван один раз с теми же координатами (не строкой!)
    expect(mockUpsertSetting).toHaveBeenCalledTimes(1);
    const [keyArg, valueArg, userIdArg] = mockUpsertSetting.mock.calls[0]!;
    expect(keyArg).toBe("contacts");
    expect(userIdArg).toBe("admin-1");
    expect((valueArg as { address_geo: { lat: number; lng: number } }).address_geo).toEqual(
      { lat: 61.0029, lng: 69.0019 },
    );

    // Инвалидация: тег cache + страница /contacts + root-layout (для Header/Footer)
    expect(mockUpdateTag).toHaveBeenCalledWith("settings:contacts");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/contacts");
    // КРИТИЧНО (грабля LESSONS_LEARNED Кат. 1): для глобальных настроек
    // (contacts/socials/...) нужен revalidatePath с 'layout', иначе
    // Header/Footer останутся с устаревшими данными.
    expect(mockRevalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("сохраняет null-координаты (клиент очистил поля)", async () => {
    mockUpsertSetting.mockResolvedValueOnce({
      key: "contacts",
      value: {
        phone_primary: "+7-932-424-77-40",
        address_geo: { lat: null, lng: null },
      },
      updatedAt: new Date().toISOString(),
    });
    mockSql.mockResolvedValueOnce([{}]);

    const res = await updateSiteSettingAction("contacts", {
      phone_primary: "+7-932-424-77-40",
      address_geo: { lat: null, lng: null },
    });

    expect(res.ok).toBe(true);
    const [, valueArg] = mockUpsertSetting.mock.calls[0]!;
    expect(
      (valueArg as { address_geo: { lat: null; lng: null } }).address_geo,
    ).toEqual({ lat: null, lng: null });
  });

  it("отклоняет невалидные координаты (lat = 'abc')", async () => {
    const res = await updateSiteSettingAction("contacts", {
      phone_primary: "+7-932-424-77-40",
      address_geo: { lat: "abc" as unknown as number, lng: 69.0019 },
    });
    expect(res.ok).toBe(false);
    expect(res.error).toBeDefined();
    expect(mockUpsertSetting).not.toHaveBeenCalled();
  });

  it("если audit_log упал — основной upsert всё равно успех (грабля Кат. 18)", async () => {
    mockUpsertSetting.mockResolvedValueOnce({
      key: "contacts",
      value: {
        phone_primary: "+7-932-424-77-40",
        address_geo: { lat: 61.0029, lng: 69.0019 },
      },
      updatedAt: new Date().toISOString(),
    });
    // audit-вызов фейлится — но это не должно ломать happy-path
    mockSql.mockRejectedValueOnce(new Error("log_admin_action missing"));

    const res = await updateSiteSettingAction("contacts", {
      phone_primary: "+7-932-424-77-40",
      address_geo: { lat: 61.0029, lng: 69.0019 },
    });

    expect(res.ok).toBe(true);
    expect(mockUpsertSetting).toHaveBeenCalledTimes(1);
  });

  it("отклоняет неизвестный ключ настройки", async () => {
    const res = await updateSiteSettingAction("foobar_unknown", {
      foo: "bar",
    });
    expect(res.ok).toBe(false);
    expect(mockUpsertSetting).not.toHaveBeenCalled();
  });
});
