import { test, expect } from "@playwright/test";

const protagonists = [
  { id: "moria", button: /Moria Casán/, briefing: /De Corrientes al boliche/, title: "¿QUIÉNES SON?", objective: "Llegá al boliche" },
  { id: "facundo", button: /Facundo Moyano/, briefing: /Persecución arcade ficticia/, title: "LA CORRIDA DEL SIGLO", objective: "Alcanzá el kiosco" },
  { id: "franco", button: /Franco Colapinto/, briefing: /set inspirado en Madrid/, title: "MADRID EXPRESS", objective: "Subite al auto" },
  { id: "tini", button: /Tini Stoessel/, briefing: /tres activos ficticios/, title: "REGLAS DEL SHOW", objective: "Recuperá el contrato" }
];

async function waitForGame(page) {
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.getByRole("button", { name: /JUGAR/ })).toBeEnabled({ timeout: 25_000 });
}

test("menu boots with four selectable protagonists and a WebGL canvas", async ({ page }, testInfo) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await waitForGame(page);
  await expect(page.getByText("GTARGENTO", { exact: true })).toBeVisible();
  await expect(page.getByText("Buenos Aires · cuatro misiones", { exact: true })).toBeVisible();
  for (const p of protagonists) await expect(page.getByRole("button", { name: p.button })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("menu-desktop.png"), fullPage: true });
  expect(pageErrors).toEqual([]);
});

for (const p of protagonists) {
  test("starts " + p.id + " mission with the matching HUD", async ({ page }, testInfo) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await waitForGame(page);
    await page.getByRole("button", { name: p.button }).click();
    await expect(page.getByText(p.briefing)).toBeVisible();
    await page.getByRole("button", { name: /JUGAR/ }).click();
    await expect(page.getByText(p.title, { exact: true })).toBeVisible();
    await expect(page.getByText(p.objective, { exact: true }).first()).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(p.id + "-gameplay.png"), fullPage: true });
    expect(pageErrors).toEqual([]);
  });
}

test("portrait to landscape to portrait does not reload or lose the menu", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await waitForGame(page);
  await page.evaluate(() => { (window as Window & { __orientationProbe?: string }).__orientationProbe = "preserved"; });
  await page.screenshot({ path: testInfo.outputPath("menu-portrait.png"), fullPage: true });
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator("canvas")).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("button", { name: /JUGAR/ })).toBeEnabled();
  const preserved = await page.evaluate(() => (window as Window & { __orientationProbe?: string }).__orientationProbe);
  expect(preserved).toBe("preserved");
  await page.screenshot({ path: testInfo.outputPath("menu-portrait-after-rotation.png"), fullPage: true });
});
