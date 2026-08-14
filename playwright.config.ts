import { defineConfig, devices } from '@playwright/test';

const remote = (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process?.env?.E2E_BASE_URL;
const chromiumArgs = [
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  '--disable-dev-shm-usage',
  '--disable-gpu-watchdog',
];

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: remote || 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  webServer: remote ? undefined : {
    command: 'npm run preview -- --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
  },
  projects: [
    {
      name: 'desktop-chromium',
      grepInvert: /mobile controls expose parity actions/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        launchOptions: { args: chromiumArgs },
      },
    },
    {
      name: 'mobile-chromium',
      use: {
        ...devices['Pixel 7'],
        viewport: { width: 915, height: 412 },
        isMobile: true,
        hasTouch: true,
        launchOptions: { args: chromiumArgs },
      },
    },
    {
      name: 'webkit-mobile-smoke',
      testMatch: /smoke\.spec\.ts/,
      use: { ...devices['iPhone 14'], viewport: { width: 844, height: 390 } },
    },
  ],
});
