import { test, expect } from "@playwright/test";

/**
 * E2E (Этап 7): cookie-banner показывается до выбора, скрывается после.
 *
 * - Первый заход (пустой localStorage) → banner появляется через ~800мс
 * - Click «Принять» → localStorage cookie_consent='accepted', баннер уходит
 * - Перезагрузка → баннер не возвращается
 * - clear localStorage + reload → баннер снова виден
 */

test.describe("Cookie banner", () => {
  test("показ → click 'Принять' → не возвращается после reload", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });

    const banner = page.getByRole("dialog").filter({ hasText: /cookie|cookies|куки/i });
    // Defer 800мс
    await expect(banner).toBeVisible({ timeout: 3_000 });

    await banner.getByRole("button", { name: /принят/i }).click();
    await expect(banner).not.toBeVisible();

    const stored = await page.evaluate(() =>
      localStorage.getItem("cookie_consent"),
    );
    expect(stored).toBe("accepted");

    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(1_200);
    expect(await banner.count()).toBe(0);
  });

  test("click 'Отклонить' → localStorage = 'declined', не возвращается", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    // Очистить localStorage перед тестом
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: "networkidle" });

    const banner = page.getByRole("dialog").filter({ hasText: /cookie|cookies|куки/i });
    await expect(banner).toBeVisible({ timeout: 3_000 });

    await banner.getByRole("button", { name: /отклонит/i }).click();
    await expect(banner).not.toBeVisible();

    const stored = await page.evaluate(() => localStorage.getItem("cookie_consent"));
    expect(stored).toBe("declined");
  });
});
