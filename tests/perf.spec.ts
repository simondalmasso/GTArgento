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
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: mobile ? 1.25 : 1 });

  await page.goto('/?perf=1', { waitUntil: 'domcontentloaded' });
  await page.locator('#startBtn').click();
  await expect(page.locator('#hud')).toBeVisible();

  // Keep the entire window as active gameplay. Mobile uses the required 3-minute mission-loop window.
  const duration = mobile ? 180_000 : 60_000;
  const deadline = Date.now() + duration;
  let direction = 'w';
  while (Date.now() < deadline) {
    const stateNow = await page.evaluate(() => window.__QS_TEST__.state());
    if (stateNow.ended) await page.evaluate(() => window.__QS_TEST__.start());
    await page.evaluate(() => window.__QS_TEST__.q());
    await page.keyboard.down(direction);
    await page.waitForTimeout(700);
    await page.keyboard.up(direction);
    direction = direction === 'w' ? 'a' : direction === 'a' ? 'd' : 'w';
    await page.waitForTimeout(Math.min(4200, Math.max(0, deadline - Date.now())));
  }

  const state = await page.evaluate(() => window.__QS_TEST__.state());
  console.log(`PERF_RESULT ${testInfo.project.name} ${JSON.stringify(state)}`);

  expect(Number(state.drawCalls)).toBeLessThanOrEqual(140);
  expect(Number(state.triangles)).toBeLessThanOrEqual(350_000);
  expect(Number(state.fpsMedian)).toBeGreaterThanOrEqual(mobile ? 50 : 58);
  expect(Number(state.fpsP5)).toBeGreaterThanOrEqual(mobile ? 40 : 45);
});
