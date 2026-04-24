import { test } from '@playwright/test'

/**
 * Скриншот ТОЛЬКО viewport главной (above-the-fold + 2 экрана).
 * Используется для визуального ревью когда полный fullPage даёт
 * нечитаемый аспект (главная — 10000+ px по высоте).
 */
test('home viewport top', async ({ page }, testInfo) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)
  await page.screenshot({
    path: `qa-screenshots-viewport/${testInfo.project.name}/home-top.png`,
    fullPage: false,
  })
})

test('home viewport scroll-1', async ({ page }, testInfo) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)
  await page.evaluate(() => window.scrollTo(0, window.innerHeight))
  await page.waitForTimeout(500)
  await page.screenshot({
    path: `qa-screenshots-viewport/${testInfo.project.name}/home-scroll1.png`,
    fullPage: false,
  })
})

test('home viewport scroll-2', async ({ page }, testInfo) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)
  await page.evaluate(() => window.scrollTo(0, window.innerHeight * 2))
  await page.waitForTimeout(500)
  await page.screenshot({
    path: `qa-screenshots-viewport/${testInfo.project.name}/home-scroll2.png`,
    fullPage: false,
  })
})

test('home viewport scroll-3', async ({ page }, testInfo) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)
  await page.evaluate(() => window.scrollTo(0, window.innerHeight * 3))
  await page.waitForTimeout(500)
  await page.screenshot({
    path: `qa-screenshots-viewport/${testInfo.project.name}/home-scroll3.png`,
    fullPage: false,
  })
})

test('home viewport scroll-4', async ({ page }, testInfo) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)
  await page.evaluate(() => window.scrollTo(0, window.innerHeight * 4))
  await page.waitForTimeout(500)
  await page.screenshot({
    path: `qa-screenshots-viewport/${testInfo.project.name}/home-scroll4.png`,
    fullPage: false,
  })
})

test('home viewport bottom', async ({ page }, testInfo) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(500)
  await page.screenshot({
    path: `qa-screenshots-viewport/${testInfo.project.name}/home-bottom.png`,
    fullPage: false,
  })
})
