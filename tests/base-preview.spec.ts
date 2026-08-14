import { test, expect } from '@playwright/test';

test('CC0 humanoid base visual probe', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'desktop visual probe only');
  await page.goto('/?base=1&perf=1', { waitUntil: 'domcontentloaded' });
  await page.locator('#startBtn').click();
  await expect.poll(async () => Boolean((await page.evaluate(() => window.__QS_TEST__.state())).baseReady), { timeout: 15000 }).toBe(true);
  const meta = await page.evaluate(() => window.__QS_TEST__.state());
  console.log('QS_RIG_META', JSON.stringify({bones:meta.baseBones, meshes:meta.baseMeshes, animations:meta.baseAnimations}));
  await page.evaluate(() => window.__QS_TEST__.cameraClose());
  await page.waitForTimeout(1800);
  await page.screenshot({ path: testInfo.outputPath('cc0-base-front.png') });
});
