import { test, expect } from '@playwright/test';

test('boots without fatal console errors and captures final visual evidence', async ({ page }, testInfo) => {
  const fatals: string[] = [];
  page.on('pageerror', e => fatals.push(e.message));
  page.on('console', m => { if (m.type() === 'error') fatals.push(m.text()); });
  await page.goto('/?perf=1', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveTitle(/QUIÉNES SON/);
  await page.locator('#startBtn').click();
  await expect(page.locator('#hud')).toBeVisible();

  // Let the third-person camera converge from its first render before taking audit evidence.
  await page.waitForTimeout(1800);
  expect(fatals).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath(`${testInfo.project.name}-establishing.png`) });

  if (testInfo.project.name === 'desktop-chromium') {
    // Orbit 180° and move in for an actual front/medium 3D likeness proof.
    await page.evaluate(() => window.__QS_TEST__.cameraClose());
    const vp = page.viewportSize()!;
    await page.mouse.move(vp.width * 0.62, vp.height * 0.52);
    await page.mouse.down();
    await page.mouse.move(vp.width * 0.21, vp.height * 0.52, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(1400);
    await page.screenshot({ path: testInfo.outputPath('moria-close-front.png') });
  }
});
