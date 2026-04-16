import { describe, expect, it } from "vitest";
import {
  generalSettingsSchema,
  legalSettingsSchema,
  brandingSettingsSchema,
  deliverySettingsSchema,
  promoBarSettingsSchema,
  settingsUpdateSchema,
} from "@/features/admin/schemas/settings";
import { redirectSchema, seoTemplateSchema } from "@/features/admin/schemas/seo";
import { bannerSchema } from "@/features/admin/schemas/banner";
import { menuItemSchema } from "@/features/admin/schemas/menu";
import { pageSchema } from "@/features/admin/schemas/page";
import {
  statusUpdateSchema,
  assignOrderSchema,
  managerCommentSchema,
} from "@/features/admin/schemas/order";

// ── Settings schemas ──

describe("generalSettingsSchema", () => {
  it("accepts valid general settings", () => {
    const result = generalSettingsSchema.safeParse({
      store_name: "2x2",
      store_description: "Рекламная компания",
      store_phone: "+7-932-424-77-40",
      store_email: "sj_alex86@mail.ru",
      store_address: "ул. Парковая 92 Б",
      working_hours: "Пн–Пт 09:00–19:00",
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty object (all optional)", () => {
    const result = generalSettingsSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = generalSettingsSchema.safeParse({ store_email: "not-email" });
    expect(result.success).toBe(false);
  });

  it("accepts empty string email", () => {
    const result = generalSettingsSchema.safeParse({ store_email: "" });
    expect(result.success).toBe(true);
  });

  it("rejects store_name exceeding 200 chars", () => {
    const result = generalSettingsSchema.safeParse({ store_name: "a".repeat(201) });
    expect(result.success).toBe(false);
  });
});

describe("legalSettingsSchema", () => {
  it("accepts valid legal settings", () => {
    const result = legalSettingsSchema.safeParse({
      legal_name: 'ООО "2х2"',
      legal_inn: "1234567890",
      legal_ogrn: "1234567890123",
      legal_address: "ул. Парковая 92 Б",
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty object", () => {
    const result = legalSettingsSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe("brandingSettingsSchema", () => {
  it("accepts valid branding settings", () => {
    const result = brandingSettingsSchema.safeParse({
      logo_url: "/images/logo.png",
      favicon_url: "/images/favicon.ico",
      social_vk: "https://vk.com/2x2hm",
      social_telegram: "https://t.me/2x2hm",
      social_whatsapp: "+79324247740",
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty strings (clear values)", () => {
    const result = brandingSettingsSchema.safeParse({
      logo_url: "",
      favicon_url: "",
      social_vk: "",
    });
    expect(result.success).toBe(true);
  });
});

describe("deliverySettingsSchema", () => {
  it("accepts valid delivery settings", () => {
    const result = deliverySettingsSchema.safeParse({
      cdek_from_city: "Ханты-Мансийск",
      cdek_from_city_code: 435,
      free_delivery_threshold: 5000,
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative delivery threshold", () => {
    const result = deliverySettingsSchema.safeParse({ free_delivery_threshold: -100 });
    expect(result.success).toBe(false);
  });

  it("rejects negative city code", () => {
    const result = deliverySettingsSchema.safeParse({ cdek_from_city_code: -1 });
    expect(result.success).toBe(false);
  });
});

describe("promoBarSettingsSchema", () => {
  it("accepts valid promo bar settings", () => {
    const result = promoBarSettingsSchema.safeParse({
      promo_bar_text: "Скидка 10% на все визитки!",
      promo_bar_link: "/catalog/vizitki",
      promo_bar_active: true,
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty strings (disable promo bar)", () => {
    const result = promoBarSettingsSchema.safeParse({
      promo_bar_text: "",
      promo_bar_link: "",
      promo_bar_active: false,
    });
    expect(result.success).toBe(true);
  });

  it("rejects promo text exceeding 300 chars", () => {
    const result = promoBarSettingsSchema.safeParse({
      promo_bar_text: "a".repeat(301),
    });
    expect(result.success).toBe(false);
  });
});

describe("settingsUpdateSchema", () => {
  it("accepts valid array of key-value pairs", () => {
    const result = settingsUpdateSchema.safeParse([
      { key: "store_name", value: "2x2" },
      { key: "store_phone", value: "+7-932-424-77-40" },
    ]);
    expect(result.success).toBe(true);
  });

  it("rejects entry with empty key", () => {
    const result = settingsUpdateSchema.safeParse([{ key: "", value: "test" }]);
    expect(result.success).toBe(false);
  });

  it("accepts empty array", () => {
    const result = settingsUpdateSchema.safeParse([]);
    expect(result.success).toBe(true);
  });
});

// ── SEO schemas ──

describe("redirectSchema", () => {
  it("accepts valid 301 redirect", () => {
    const result = redirectSchema.safeParse({
      from_path: "/old-page",
      to_path: "/new-page",
      type: 301,
      is_active: true,
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid 302 redirect", () => {
    const result = redirectSchema.safeParse({
      from_path: "/temp",
      to_path: "/current",
      type: 302,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid redirect type (e.g. 200)", () => {
    const result = redirectSchema.safeParse({
      from_path: "/a",
      to_path: "/b",
      type: 200,
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty from_path", () => {
    const result = redirectSchema.safeParse({
      from_path: "",
      to_path: "/b",
      type: 301,
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty to_path", () => {
    const result = redirectSchema.safeParse({
      from_path: "/a",
      to_path: "",
      type: 301,
    });
    expect(result.success).toBe(false);
  });
});

describe("seoTemplateSchema", () => {
  it("accepts valid SEO templates", () => {
    const result = seoTemplateSchema.safeParse({
      seo_title_template: "{name} — купить в Ханты-Мансийске | 2x2",
      seo_description_template: "{name} по цене от {price} руб. {category}",
    });
    expect(result.success).toBe(true);
  });

  it("defaults to empty strings", () => {
    const result = seoTemplateSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.seo_title_template).toBe("");
      expect(result.data.seo_description_template).toBe("");
    }
  });
});

// ── Order action schemas ──

describe("statusUpdateSchema", () => {
  it("accepts valid status update", () => {
    const result = statusUpdateSchema.safeParse({ status: "confirmed" });
    expect(result.success).toBe(true);
  });

  it("accepts status with comment", () => {
    const result = statusUpdateSchema.safeParse({
      status: "cancelled",
      comment: "Клиент передумал",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid status", () => {
    const result = statusUpdateSchema.safeParse({ status: "invalid" });
    expect(result.success).toBe(false);
  });

  it("rejects comment exceeding 1000 chars", () => {
    const result = statusUpdateSchema.safeParse({
      status: "confirmed",
      comment: "a".repeat(1001),
    });
    expect(result.success).toBe(false);
  });
});

describe("assignOrderSchema", () => {
  it("accepts valid UUID", () => {
    const result = assignOrderSchema.safeParse({
      profile_id: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-UUID string", () => {
    const result = assignOrderSchema.safeParse({ profile_id: "not-uuid" });
    expect(result.success).toBe(false);
  });
});

describe("managerCommentSchema", () => {
  it("accepts valid comment", () => {
    const result = managerCommentSchema.safeParse({ comment: "Клиент просил доставку утром" });
    expect(result.success).toBe(true);
  });

  it("rejects empty comment", () => {
    const result = managerCommentSchema.safeParse({ comment: "" });
    expect(result.success).toBe(false);
  });

  it("rejects comment exceeding 2000 chars", () => {
    const result = managerCommentSchema.safeParse({ comment: "a".repeat(2001) });
    expect(result.success).toBe(false);
  });
});

// ── CMS schemas ──

describe("bannerSchema", () => {
  it("accepts valid banner", () => {
    const result = bannerSchema.safeParse({
      image_url: "/images/hero.jpg",
      position: "hero",
    });
    expect(result.success).toBe(true);
  });

  it("rejects banner without image_url", () => {
    const result = bannerSchema.safeParse({ image_url: "", position: "hero" });
    expect(result.success).toBe(false);
  });

  it("accepts all optional nullable fields as null", () => {
    const result = bannerSchema.safeParse({
      image_url: "/images/hero.jpg",
      title: null,
      subtitle: null,
      description: null,
      mobile_image_url: null,
      link: null,
      button_text: null,
      badge: null,
      active_from: null,
      active_to: null,
    });
    expect(result.success).toBe(true);
  });
});

describe("menuItemSchema", () => {
  it("accepts valid header menu item", () => {
    const result = menuItemSchema.safeParse({
      position: "header",
      title: "Каталог",
      url: "/catalog",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid footer menu item", () => {
    const result = menuItemSchema.safeParse({
      position: "footer",
      title: "О компании",
      url: "/about",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid position", () => {
    const result = menuItemSchema.safeParse({
      position: "sidebar",
      title: "Test",
      url: "/test",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty title", () => {
    const result = menuItemSchema.safeParse({
      position: "header",
      title: "",
      url: "/catalog",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty url", () => {
    const result = menuItemSchema.safeParse({
      position: "header",
      title: "Каталог",
      url: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("pageSchema", () => {
  it("accepts valid page", () => {
    const result = pageSchema.safeParse({
      title: "О компании",
      slug: "about",
      content: "<p>Информация о компании</p>",
    });
    expect(result.success).toBe(true);
  });

  it("rejects page without title", () => {
    const result = pageSchema.safeParse({ title: "", slug: "about", content: "..." });
    expect(result.success).toBe(false);
  });

  it("rejects page without slug", () => {
    const result = pageSchema.safeParse({ title: "Test", slug: "", content: "..." });
    expect(result.success).toBe(false);
  });

  it("rejects page without content", () => {
    const result = pageSchema.safeParse({ title: "Test", slug: "test", content: "" });
    expect(result.success).toBe(false);
  });

  it("defaults is_active to true and show_in_footer to false", () => {
    const result = pageSchema.safeParse({
      title: "Test",
      slug: "test",
      content: "content",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.is_active).toBe(true);
      expect(result.data.show_in_footer).toBe(false);
    }
  });
});
