/**
 * @vitest-environment node
 *
 * Sitemap должен включать /services/[slug] для каждой enabled-услуги.
 * Также проверяем, что /services (статическая страница) присутствует
 * и что при ошибке listEnabledServices sitemap не падает.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockListEnabledServices, mockGetCategories, mockGetProducts, mockGetBlog } =
  vi.hoisted(() => ({
    mockListEnabledServices: vi.fn(),
    mockGetCategories: vi.fn(),
    mockGetProducts: vi.fn(),
    mockGetBlog: vi.fn(),
  }));

vi.mock("@/lib/data/services", () => ({
  listEnabledServices: mockListEnabledServices,
}));

vi.mock("@/lib/data/categories", () => ({
  getCategories: mockGetCategories,
}));

vi.mock("@/lib/data/products", () => ({
  getProducts: mockGetProducts,
}));

vi.mock("@/lib/data/portfolio", () => ({
  getPortfolio: vi.fn(async () => []),
}));

vi.mock("@/lib/data/blog", () => ({
  getPublishedBlogPostsForSitemap: mockGetBlog,
}));

vi.mock("@/content/blog-starters", () => ({
  blogStarters: [],
}));

vi.mock("@/lib/siteConfig", () => ({
  siteUrl: "https://example.test",
}));

import sitemap from "@/app/sitemap";

beforeEach(() => {
  mockListEnabledServices.mockReset();
  mockGetCategories.mockReset();
  mockGetProducts.mockReset();
  mockGetBlog.mockReset();

  mockGetCategories.mockResolvedValue([]);
  mockGetProducts.mockResolvedValue([]);
  mockGetBlog.mockResolvedValue([]);
});

describe("app/sitemap.ts — services", () => {
  it("включает /services/<slug> для каждой enabled-услуги", async () => {
    mockListEnabledServices.mockResolvedValueOnce([
      {
        id: "1",
        slug: "polygrafiya",
        title: "Полиграфия",
        enabled: true,
        display_order: 10,
        updated_at: "2026-04-20T10:00:00Z",
        // ... остальные поля Service
      },
      {
        id: "2",
        slug: "vyveski",
        title: "Вывески",
        enabled: true,
        display_order: 20,
        updated_at: "2026-04-21T10:00:00Z",
      },
      {
        id: "3",
        slug: "svetovye-bukvy",
        title: "Световые буквы",
        enabled: true,
        display_order: 30,
        updated_at: "2026-04-22T10:00:00Z",
      },
    ]);

    const entries = await sitemap();
    const urls = entries.map((e) => e.url);

    expect(urls).toContain("https://example.test/services/polygrafiya");
    expect(urls).toContain("https://example.test/services/vyveski");
    expect(urls).toContain("https://example.test/services/svetovye-bukvy");
  });

  it("устанавливает priority=0.7 и changeFrequency='monthly' для услуг", async () => {
    mockListEnabledServices.mockResolvedValueOnce([
      {
        id: "1",
        slug: "polygrafiya",
        title: "Полиграфия",
        enabled: true,
        display_order: 10,
        updated_at: "2026-04-20T10:00:00Z",
      },
    ]);

    const entries = await sitemap();
    const svc = entries.find(
      (e) => e.url === "https://example.test/services/polygrafiya",
    );
    expect(svc).toBeDefined();
    expect(svc?.priority).toBe(0.7);
    expect(svc?.changeFrequency).toBe("monthly");
  });

  it("использует updated_at из услуги как lastModified", async () => {
    mockListEnabledServices.mockResolvedValueOnce([
      {
        id: "1",
        slug: "polygrafiya",
        title: "Полиграфия",
        enabled: true,
        display_order: 10,
        updated_at: "2026-04-20T10:00:00Z",
      },
    ]);

    const entries = await sitemap();
    const svc = entries.find(
      (e) => e.url === "https://example.test/services/polygrafiya",
    );
    expect(svc?.lastModified).toBeInstanceOf(Date);
    expect((svc?.lastModified as Date).toISOString()).toBe(
      "2026-04-20T10:00:00.000Z",
    );
  });

  it("не падает, если listEnabledServices бросает (БД недоступна)", async () => {
    mockListEnabledServices.mockRejectedValueOnce(new Error("ECONNREFUSED"));

    const entries = await sitemap();
    // Статические страницы (/services и т.п.) всё равно в выдаче.
    const urls = entries.map((e) => e.url);
    expect(urls).toContain("https://example.test/services");
    // Но детальных /services/<slug> нет.
    expect(urls.filter((u) => u.startsWith("https://example.test/services/"))).toHaveLength(0);
  });

  it("не добавляет ничего, если enabled-услуг нет", async () => {
    mockListEnabledServices.mockResolvedValueOnce([]);

    const entries = await sitemap();
    const detailUrls = entries
      .map((e) => e.url)
      .filter((u) => u.startsWith("https://example.test/services/"));
    expect(detailUrls).toHaveLength(0);
  });

  it("сохраняет /services (статическую страницу) в sitemap независимо от детальных URL", async () => {
    mockListEnabledServices.mockResolvedValueOnce([
      {
        id: "1",
        slug: "polygrafiya",
        title: "Полиграфия",
        enabled: true,
        display_order: 10,
        updated_at: "2026-04-20T10:00:00Z",
      },
    ]);

    const entries = await sitemap();
    const list = entries.find((e) => e.url === "https://example.test/services");
    expect(list).toBeDefined();
    expect(list?.priority).toBe(0.9);
  });
});
