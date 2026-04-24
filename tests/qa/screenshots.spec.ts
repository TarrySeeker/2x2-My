import { test, expect } from "@playwright/test";
import path from "node:path";

/**
 * Visual capture suite (no assertions).
 * Iterates over key public pages and saves a full-page screenshot per project/browser.
 *
 * Run example:
 *   PLAYWRIGHT_BASE_URL=https://erfgv.website PLAYWRIGHT_SKIP_SERVER=1 \
 *     pnpm exec playwright test tests/qa/screenshots.spec.ts --reporter=list
 *
 * Output:
 *   test-results/screenshots/<project>/<page>.png
 */

const PAGES: Array<{ slug: string; file: string }> = [
  { slug: "/", file: "home" },
  { slug: "/catalog", file: "catalog" },
  { slug: "/portfolio", file: "portfolio" },
  { slug: "/about", file: "about" },
  { slug: "/contacts", file: "contacts" },
  { slug: "/calculator", file: "calculator" },
];

test.describe.configure({ mode: "serial" });

for (const { slug, file } of PAGES) {
  test(`screenshot ${file}`, async ({ page }, testInfo) => {
    const projectName = testInfo.project.name;
    const outDir = path.join("test-results", "screenshots", projectName);
    const outPath = path.join(outDir, `${file}.png`);

    let lastError: unknown = null;
    try {
      const response = await page.goto(slug, {
        waitUntil: "networkidle",
        timeout: 45_000,
      });
      // Don't fail on non-2xx — we still want to capture what's shown.
      if (response) {
        testInfo.annotations.push({
          type: "http-status",
          description: `${response.status()} for ${slug}`,
        });
      }
    } catch (err) {
      lastError = err;
      try {
        // Fallback: try domcontentloaded if networkidle timed out
        await page.goto(slug, { waitUntil: "domcontentloaded", timeout: 30_000 });
      } catch {
        // ignore — still attempt screenshot of whatever is rendered
      }
    }

    // Small settle delay for hero animations / fonts
    await page.waitForTimeout(1500);

    try {
      await page.screenshot({ path: outPath, fullPage: true, timeout: 30_000 });
      testInfo.attachments.push({
        name: `${projectName}-${file}.png`,
        path: outPath,
        contentType: "image/png",
      });
    } catch (err) {
      // As a last resort try a viewport-only capture
      try {
        await page.screenshot({ path: outPath, fullPage: false });
      } catch {
        // give up — just log
        // eslint-disable-next-line no-console
        console.warn(`screenshot failed for ${projectName}/${file}:`, err);
      }
    }

    // Capture is best-effort — never assert hard so test stays green.
    expect(true).toBe(true);
    if (lastError) {
      testInfo.annotations.push({
        type: "warning",
        description: `nav error on ${slug}: ${(lastError as Error).message}`,
      });
    }
  });
}
