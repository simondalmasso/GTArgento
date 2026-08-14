import { test, expect } from '@playwright/test';

test('boots without fatal console errors', async ({ page }, testInfo) => {
  const fatals: string[] = [];
  page.on('pageerror', e => fatals.push(e.message));
  page.on('console', m => { if (m.type() === 'error') fatals.push(m.text()); });
  await page.goto('/?perf=1', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveTitle(/QUIÉNES SON/);
  await page.locator('#startBtn').click();
  await expect(page.locator('#hud')).toBeVisible();
  await page.waitForTimeout(350);
  expect(fatals).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath(`${testInfo.project.name}-establishing.png`) });
});
