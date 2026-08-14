import { defineConfig, devices } from '@playwright/test';

const remote = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: './tests',
  timeout: 45_000,
  expect: { timeout: 8_000 },
  retries: 1,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: remote || 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: remote ? undefined : {
    command: 'npm run preview -- --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'], viewport: { width: 915, height: 412 }, isMobile: true, hasTouch: true } },
    { name: 'webkit-mobile-smoke', testMatch: /smoke\.spec\.ts/, use: { ...devices['iPhone 14'], viewport: { width: 844, height: 390 } } },
  ],
});
