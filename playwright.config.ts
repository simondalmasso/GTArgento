import { defineConfig, devices } from '@playwright/test';

const remote = (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process?.env?.E2E_BASE_URL;
const chromiumArgs = ['--disable-dev-shm-usage','--disable-gpu-watchdog','--disable-frame-rate-limit','--disable-gpu-vsync','--ignore-gpu-blocklist','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows'];
const mobileChromium = { ...devices['Pixel 7'], isMobile:true, hasTouch:true, launchOptions:{ args:chromiumArgs } };

export default defineConfig({
  testDir:'./tests', timeout:70_000, expect:{timeout:10_000}, workers:1, fullyParallel:false, retries:0,
  reporter:[['list'],['html',{outputFolder:'playwright-report',open:'never'}]],
  use:{ headless:true, baseURL:remote || 'http://127.0.0.1:4173', trace:'retain-on-failure', screenshot:'only-on-failure', video:'off' },
  webServer:remote ? undefined : { command:'npm run preview -- --port 4173', url:'http://127.0.0.1:4173', reuseExistingServer:true },
  projects:[
    { name:'desktop-chromium', testIgnore:[/orientation\.spec\.ts/,/orientation-webkit\.spec\.ts/], grepInvert:/mobile controls expose parity actions/, use:{...devices['Desktop Chrome'],viewport:{width:1920,height:1080},launchOptions:{args:chromiumArgs}} },
    { name:'mobile-chromium', testIgnore:[/orientation\.spec\.ts/,/orientation-webkit\.spec\.ts/], use:{...mobileChromium,viewport:{width:915,height:412}} },
    { name:'mobile-portrait-chromium', testMatch:/orientation\.spec\.ts/, grep:/portrait full mission/, use:{...mobileChromium,viewport:{width:412,height:915}} },
    { name:'mobile-landscape-chromium', testMatch:/orientation\.spec\.ts/, grep:/landscape full mission/, use:{...mobileChromium,viewport:{width:915,height:412}} },
    { name:'mobile-rotation-chromium', testMatch:/orientation\.spec\.ts/, grep:/rotation bidirectional/, use:{...mobileChromium,viewport:{width:412,height:915}} },
    { name:'webkit-mobile-portrait', testMatch:/orientation-webkit\.spec\.ts/, grep:/portrait/, use:{...devices['iPhone 14'],viewport:{width:390,height:844}} },
    { name:'webkit-mobile-landscape', testMatch:/orientation-webkit\.spec\.ts/, grep:/landscape/, use:{...devices['iPhone 14'],viewport:{width:844,height:390}} },
    { name:'webkit-mobile-smoke', testMatch:/smoke\.spec\.ts/, dependencies:['mobile-portrait-chromium','mobile-landscape-chromium','mobile-rotation-chromium','webkit-mobile-portrait','webkit-mobile-landscape'], use:{...devices['iPhone 14'],viewport:{width:844,height:390}} },
  ],
});
