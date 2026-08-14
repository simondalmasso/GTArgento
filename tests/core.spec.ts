import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/?perf=1', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#startBtn')).toBeVisible();
  await page.locator('#startBtn').click();
  await expect(page.locator('#hud')).toBeVisible();
});

test('complete mission loop: move, Q, entidad, taxi, win, fail and restart', async ({ page }, testInfo) => {
  const state = () => page.evaluate(() => window.__QS_TEST__.state());

  const before = await state();
  await page.keyboard.down('w');
  await page.waitForTimeout(350);
  await page.keyboard.up('w');
  const moved = await state();
  expect(Math.hypot(Number(moved.x) - Number(before.x), Number(moved.z) - Number(before.z))).toBeGreaterThan(0.35);

  await page.evaluate(() => window.__QS_TEST__.teleport(-8, 33));
  await page.waitForTimeout(80);
  await page.keyboard.press('q');
  await page.waitForTimeout(120);
  const qState = await state();
  expect(Number(qState.qUses)).toBeGreaterThanOrEqual(1);
  expect(Number(qState.qAffected)).toBeGreaterThanOrEqual(1);
  await page.screenshot({ path: testInfo.outputPath('q-special.png') });

  await page.evaluate(() => { window.__QS_TEST__.entity(0); window.__QS_TEST__.teleport(-10, 34); });
  await page.waitForTimeout(650);
  const pursued = await state();
  expect(Number(pursued.entity)).toBeGreaterThan(0);

  await page.evaluate(() => window.__QS_TEST__.nearTaxi());
  await page.keyboard.press('e');
  await expect.poll(async () => Boolean((await state()).vehicleMode)).toBe(true);
  const taxiBefore = await state();
  await page.keyboard.down('w');
  await page.waitForTimeout(450);
  await page.keyboard.up('w');
  const taxiAfter = await state();
  expect(Math.hypot(Number(taxiAfter.x) - Number(taxiBefore.x), Number(taxiAfter.z) - Number(taxiBefore.z))).toBeGreaterThan(0.1);
  await page.screenshot({ path: testInfo.outputPath('vehicle.png') });

  await page.evaluate(() => window.__QS_TEST__.destination());
  await expect(page.locator('#resultTitle')).toHaveText('MISSION PASSED');
  await page.screenshot({ path: testInfo.outputPath('mission-pass.png') });

  await page.locator('#restartBtn').click();
  await page.evaluate(() => window.__QS_TEST__.entity(100));
  await expect(page.locator('#resultTitle')).toHaveText('LES DISTE ENTIDAD');
  await page.locator('#restartBtn').click();
  const restarted = await state();
  expect(restarted.started).toBe(true);
  expect(restarted.ended).toBe(false);
});

test('mobile controls expose parity actions', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium', 'mobile-only control validation');
  await expect(page.locator('#touch')).toBeVisible();
  await page.evaluate(() => window.__QS_TEST__.teleport(-8, 33));
  await page.locator('#qBtn').dispatchEvent('pointerdown', { pointerType: 'touch', pointerId: 7 });
  await expect.poll(async () => Number((await page.evaluate(() => window.__QS_TEST__.state())).qUses)).toBeGreaterThan(0);

  await page.evaluate(() => window.__QS_TEST__.nearTaxi());
  await expect(page.locator('#actionBtn')).toBeVisible();
  await page.locator('#actionBtn').dispatchEvent('pointerdown', { pointerType: 'touch', pointerId: 8 });
  await expect.poll(async () => Boolean((await page.evaluate(() => window.__QS_TEST__.state())).vehicleMode)).toBe(true);

  await page.screenshot({ path: testInfo.outputPath('mobile-landscape.png') });
});
