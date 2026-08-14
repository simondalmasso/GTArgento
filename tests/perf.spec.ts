import { test, expect } from '@playwright/test';

test('records objective active-gameplay performance', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'webkit-mobile-smoke', 'Chromium performance project only');

  const mobile = testInfo.project.name === 'mobile-chromium';
  test.setTimeout(mobile ? 240_000 : 120_000);

  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: mobile ? 80 : 25,
    downloadThroughput: mobile ? 524_288 : 2_097_152,
    uploadThroughput: mobile ? 262_144 : 1_048_576,
  });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: mobile ? 2 : 1 });

  await page.goto('/?perf=1', { waitUntil: 'domcontentloaded' });
  await page.locator('#startBtn').click();
  await expect(page.locator('#hud')).toBeVisible();

  // Keep the scene active while measuring. Mobile uses the required 3-minute mission-loop window.
  await page.keyboard.down('w');
  await page.waitForTimeout(1500);
  await page.keyboard.up('w');
  await page.waitForTimeout(mobile ? 180_000 : 60_000);

  const state = await page.evaluate(() => window.__QS_TEST__.state());
  console.log(`PERF_RESULT ${testInfo.project.name} ${JSON.stringify(state)}`);

  expect(Number(state.drawCalls)).toBeLessThanOrEqual(140);
  expect(Number(state.triangles)).toBeLessThanOrEqual(350_000);
  expect(Number(state.fpsMedian)).toBeGreaterThan(0);
  expect(Number(state.fpsP5)).toBeGreaterThan(0);
});
