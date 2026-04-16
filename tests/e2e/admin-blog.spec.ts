import { test, expect } from "@playwright/test";

/**
 * E2E: Admin Blog, CMS Content, SEO, Settings management.
 * Skipped — requires real Supabase auth + seeded data.
 * Enable once test credentials are available.
 */

test.describe("Admin Blog", () => {
  test.skip(true, "Requires Supabase auth + seeded data");

  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/login");
    await page.fill("input[type='email']", "admin@2x2reklama.ru");
    await page.fill("input[type='password']", "testpassword");
    await page.click("button[type='submit']");
    await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 10000 });
  });

  test("blog list page renders with status tabs", async ({ page }) => {
    await page.goto("/admin/blog");
    await expect(page.locator("text=Блог")).toBeVisible();
    await expect(page.locator("text=Все")).toBeVisible();
    await expect(page.locator("text=Опубликованные")).toBeVisible();
    await expect(page.locator("text=Черновики")).toBeVisible();
  });

  test("create new post button navigates to editor", async ({ page }) => {
    await page.goto("/admin/blog");
    await page.locator("a:has-text('Новая статья')").click();
    await expect(page).toHaveURL(/\/admin\/blog\/new/);
    await expect(page.locator("input[placeholder*='Заголовок']")).toBeVisible();
  });

  test("blog editor auto-generates slug from title", async ({ page }) => {
    await page.goto("/admin/blog/new");
    const titleInput = page.locator("input[placeholder*='Заголовок']");
    await titleInput.fill("Как выбрать вывеску");
    // Slug should be auto-generated
    const slugInput = page.locator("input[name='slug']");
    await expect(slugInput).toHaveValue(/kak-vybrat-vyvesku/);
  });

  test("blog editor has TipTap rich text editor", async ({ page }) => {
    await page.goto("/admin/blog/new");
    // TipTap editor should be present
    await expect(page.locator(".tiptap, .ProseMirror")).toBeVisible({ timeout: 5000 });
  });

  test("blog editor has SEO fields section", async ({ page }) => {
    await page.goto("/admin/blog/new");
    await expect(page.locator("text=SEO")).toBeVisible();
  });

  test("blog categories page renders", async ({ page }) => {
    await page.goto("/admin/blog/categories");
    await expect(page.locator("text=Категории")).toBeVisible();
  });

  test("create blog category via dialog", async ({ page }) => {
    await page.goto("/admin/blog/categories");
    await page.locator("button:has-text('Добавить')").click();
    // Dialog should open
    await expect(page.locator("input[name='name']")).toBeVisible();
    await page.fill("input[name='name']", "Тестовая категория");
    // Slug auto-generated
    await page.locator("button:has-text('Сохранить')").click();
    await expect(page.locator("[data-sonner-toast]")).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Admin CMS Content", () => {
  test.skip(true, "Requires Supabase auth + seeded data");

  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/login");
    await page.fill("input[type='email']", "admin@2x2reklama.ru");
    await page.fill("input[type='password']", "testpassword");
    await page.click("button[type='submit']");
    await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 10000 });
  });

  test("banners page renders and allows adding", async ({ page }) => {
    await page.goto("/admin/content/banners");
    await expect(page.locator("text=Баннеры")).toBeVisible();
    await page.locator("button:has-text('Добавить')").click();
    await expect(page.locator("text=Новый баннер")).toBeVisible();
  });

  test("static pages list renders", async ({ page }) => {
    await page.goto("/admin/content/pages");
    await expect(page.locator("text=Страницы")).toBeVisible();
  });

  test("menu page has header and footer sections", async ({ page }) => {
    await page.goto("/admin/content/menu");
    await expect(page.locator("text=Header")).toBeVisible();
    await expect(page.locator("text=Footer")).toBeVisible();
  });

  test("/admin/content redirects to banners", async ({ page }) => {
    await page.goto("/admin/content");
    await expect(page).toHaveURL(/\/admin\/content\/banners/);
  });
});

test.describe("Admin SEO", () => {
  test.skip(true, "Requires Supabase auth + seeded data");

  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/login");
    await page.fill("input[type='email']", "admin@2x2reklama.ru");
    await page.fill("input[type='password']", "testpassword");
    await page.click("button[type='submit']");
    await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 10000 });
  });

  test("SEO page renders with tabs", async ({ page }) => {
    await page.goto("/admin/seo");
    await expect(page.locator("text=SEO")).toBeVisible();
    await expect(page.locator("text=Мета-теги")).toBeVisible();
    await expect(page.locator("text=Шаблоны")).toBeVisible();
    await expect(page.locator("text=Редиректы")).toBeVisible();
  });

  test("redirects tab allows adding new redirect", async ({ page }) => {
    await page.goto("/admin/seo");
    await page.locator("text=Редиректы").click();
    await page.locator("button:has-text('Добавить')").click();
    await expect(page.locator("input[name='from_path']")).toBeVisible();
  });
});

test.describe("Admin Settings", () => {
  test.skip(true, "Requires Supabase auth + seeded data");

  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/login");
    await page.fill("input[type='email']", "admin@2x2reklama.ru");
    await page.fill("input[type='password']", "testpassword");
    await page.click("button[type='submit']");
    await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 10000 });
  });

  test("settings page renders with 5 tabs", async ({ page }) => {
    await page.goto("/admin/settings");
    await expect(page.locator("text=Настройки")).toBeVisible();
    await expect(page.locator("text=Общие")).toBeVisible();
    await expect(page.locator("text=Юридические")).toBeVisible();
    await expect(page.locator("text=Брендинг")).toBeVisible();
    await expect(page.locator("text=Доставка")).toBeVisible();
    await expect(page.locator("text=Промо-бар")).toBeVisible();
  });

  test("general tab has form with save button", async ({ page }) => {
    await page.goto("/admin/settings");
    await expect(page.locator("input[name='store_name']")).toBeVisible();
    await expect(page.locator("button:has-text('Сохранить')")).toBeVisible();
  });

  test("switching tabs changes form content", async ({ page }) => {
    await page.goto("/admin/settings");
    await page.locator("text=Юридические").click();
    await expect(page.locator("input[name='legal_inn']")).toBeVisible();
  });

  test("branding tab has logo and favicon upload", async ({ page }) => {
    await page.goto("/admin/settings");
    await page.locator("text=Брендинг").click();
    await expect(page.locator("text=Логотип")).toBeVisible();
    await expect(page.locator("text=Favicon")).toBeVisible();
  });
});
