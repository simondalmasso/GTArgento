from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    s = p.read_text()
    if old not in s:
        raise SystemExit(f'missing expected block in {path}: {old[:70]!r}')
    p.write_text(s.replace(old, new, 1))

replace_once('index.html', '      <div id="orientation" class="panel hidden"><div class="orientation-icon">↻</div><strong>GIRÁ EL TELÉFONO</strong><span>Corrientes se juega en horizontal.</span></div>\n', '')
replace_once('src/game.ts', "const orientation = $('#orientation');\n", '')

replace_once('src/game.ts', '''function updateStick(e: PointerEvent) {
  const r = stick.getBoundingClientRect(); let x = (e.clientX - (r.left + r.width / 2)) / (r.width * 0.5); let y = (e.clientY - (r.top + r.height / 2)) / (r.height * 0.5); const len = Math.hypot(x, y); if (len > 1) { x /= len; y /= len; }
  joy.x = x; joy.y = y; stickKnob.style.transform = `translate(${x * r.width * 0.28}px,${y * r.height * 0.28}px)`;
}
stick.addEventListener('pointerdown', e => { e.preventDefault(); stick.setPointerCapture(e.pointerId); updateStick(e); });
stick.addEventListener('pointermove', e => { if (stick.hasPointerCapture(e.pointerId)) updateStick(e); });
function endStick(e: PointerEvent) { if (stick.hasPointerCapture(e.pointerId)) stick.releasePointerCapture(e.pointerId); joy.x = 0; joy.y = 0; stickKnob.style.transform = 'translate(0px,0px)'; }
stick.addEventListener('pointerup', endStick); stick.addEventListener('pointercancel', endStick);
lookZone.addEventListener('pointerdown', e => { lookPointer = e.pointerId; lookLast = { x: e.clientX, y: e.clientY }; lookZone.setPointerCapture(e.pointerId); });
lookZone.addEventListener('pointermove', e => { if (e.pointerId === lookPointer) { cameraYaw -= (e.clientX - lookLast.x) * 0.006; cameraPitch = THREE.MathUtils.clamp(cameraPitch + (e.clientY - lookLast.y) * 0.005, 0.08, 0.62); lookLast = { x: e.clientX, y: e.clientY }; } });
lookZone.addEventListener('pointerup', () => { lookPointer = -1; }); lookZone.addEventListener('pointercancel', () => { lookPointer = -1; });
''', '''function updateStick(e: PointerEvent) {
  const r = stick.getBoundingClientRect(); let x = (e.clientX - (r.left + r.width / 2)) / (r.width * 0.5); let y = (e.clientY - (r.top + r.height / 2)) / (r.height * 0.5); const len = Math.hypot(x, y); if (len > 1) { x /= len; y /= len; }
  joy.x = x; joy.y = y; stickKnob.style.transform = `translate(${x * r.width * 0.28}px,${y * r.height * 0.28}px)`;
}
let stickPointer = -1;
stick.addEventListener('pointerdown', e => { e.preventDefault(); stickPointer = e.pointerId; try { stick.setPointerCapture(e.pointerId); } catch {} updateStick(e); });
stick.addEventListener('pointermove', e => { if (e.pointerId === stickPointer) updateStick(e); });
function endStick(e: PointerEvent) { if (e.pointerId !== stickPointer) return; try { if (stick.hasPointerCapture(e.pointerId)) stick.releasePointerCapture(e.pointerId); } catch {} stickPointer = -1; joy.x = 0; joy.y = 0; stickKnob.style.transform = 'translate(0px,0px)'; }
stick.addEventListener('pointerup', endStick); stick.addEventListener('pointercancel', endStick);
lookZone.addEventListener('pointerdown', e => { lookPointer = e.pointerId; lookLast = { x: e.clientX, y: e.clientY }; try { lookZone.setPointerCapture(e.pointerId); } catch {} });
lookZone.addEventListener('pointermove', e => { if (e.pointerId === lookPointer) { cameraYaw -= (e.clientX - lookLast.x) * 0.006; cameraPitch = THREE.MathUtils.clamp(cameraPitch + (e.clientY - lookLast.y) * 0.005, 0.08, 0.62); lookLast = { x: e.clientX, y: e.clientY }; } });
lookZone.addEventListener('pointerup', e => { if (e.pointerId === lookPointer) lookPointer = -1; }); lookZone.addEventListener('pointercancel', e => { if (e.pointerId === lookPointer) lookPointer = -1; });
''')

replace_once('src/game.ts', '''function updateRendererSize() {
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5) * resolutionScale);
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
function orientationGate() {
  orientation.classList.toggle('hidden', !(isCoarse && innerHeight > innerWidth));
}
updateRendererSize(); orientationGate();
addEventListener('resize', () => { updateRendererSize(); orientationGate(); });
addEventListener('orientationchange', () => setTimeout(() => { updateRendererSize(); orientationGate(); }, 160));
''', '''function refreshViewport() {
  const width = Math.max(1, window.innerWidth);
  const height = Math.max(1, window.innerHeight);
  const portrait = height > width;
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5) * resolutionScale);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  document.documentElement.dataset.gameOrientation = portrait ? 'portrait' : 'landscape';
  hud.dataset.orientation = portrait ? 'portrait' : 'landscape';
  touch.dataset.orientation = portrait ? 'portrait' : 'landscape';
}
refreshViewport();
addEventListener('resize', refreshViewport, { passive: true });
addEventListener('orientationchange', () => {
  refreshViewport();
  requestAnimationFrame(refreshViewport);
  setTimeout(refreshViewport, 120);
}, { passive: true });
''')

replace_once('src/game.ts', '''  const desired = target.clone().addScaledVector(forward, -cameraDistance); desired.y += 0.55;
  if (shake > 0.004) { desired.x += (Math.random() - 0.5) * shake; desired.y += (Math.random() - 0.5) * shake; desired.z += (Math.random() - 0.5) * shake; }
  camera.position.lerp(desired, 1 - Math.pow(0.002, dt)); camera.lookAt(target); camera.fov = 55 + fovKick; camera.updateProjectionMatrix();
''', '''  const portrait = window.innerHeight > window.innerWidth;
  const framingDistance = cameraDistance * (portrait ? (vehicleMode ? 1.18 : 1.32) : 1);
  const desired = target.clone().addScaledVector(forward, -framingDistance); desired.y += portrait ? 1.05 : 0.55;
  if (shake > 0.004) { desired.x += (Math.random() - 0.5) * shake; desired.y += (Math.random() - 0.5) * shake; desired.z += (Math.random() - 0.5) * shake; }
  camera.position.lerp(desired, 1 - Math.pow(0.002, dt)); camera.lookAt(target); camera.fov = (portrait ? 64 : 55) + fovKick; camera.updateProjectionMatrix();
''')

css = Path('src/style.css')
css.write_text(css.read_text() + '''\n\n/* ORDER-001A — both mobile orientations are fully playable. */
#orientation { display:none !important; pointer-events:none !important; }
@media (pointer:coarse) and (orientation:portrait) {
  #hud { padding:max(10px,env(safe-area-inset-top)) max(10px,env(safe-area-inset-right)) max(14px,env(safe-area-inset-bottom)) max(10px,env(safe-area-inset-left)); }
  .topbar { gap:8px; align-items:stretch; }
  .mission { min-width:0; width:54%; padding:7px 9px; }
  .mission span,.entity-label span { font-size:7px; letter-spacing:.18em; }
  .mission b { font-size:10px; letter-spacing:.045em; line-height:1.15; }
  .entity-card { width:43%; min-width:0; padding:7px 8px; }
  .entity-label b { font-size:16px; }
  .objective { top:max(76px,calc(env(safe-area-inset-top) + 66px)); width:min(88vw,380px); white-space:normal; text-align:center; padding:6px 9px; font-size:8px; line-height:1.25; letter-spacing:.09em; }
  .special-text { top:42%; font-size:clamp(34px,12vw,58px); width:92vw; text-align:center; }
  .stick { left:max(16px,calc(env(safe-area-inset-left) + 12px)); bottom:max(20px,calc(env(safe-area-inset-bottom) + 14px)); width:112px; height:112px; }
  .stick-knob { width:48px; height:48px; margin:-24px; }
  .look-zone { right:0; top:23%; width:58%; height:47%; }
  .q-btn { right:max(18px,calc(env(safe-area-inset-right) + 12px)); bottom:max(22px,calc(env(safe-area-inset-bottom) + 16px)); width:88px; height:88px; }
  .q-btn span { font-size:26px; }
  .run-btn { right:max(116px,calc(env(safe-area-inset-right) + 110px)); bottom:max(28px,calc(env(safe-area-inset-bottom) + 22px)); width:64px; height:64px; }
  .action-btn { right:max(24px,calc(env(safe-area-inset-right) + 18px)); bottom:max(124px,calc(env(safe-area-inset-bottom) + 118px)); width:68px; height:68px; }
}
@media (pointer:coarse) and (orientation:landscape) { .look-zone { right:0; top:15%; width:54%; height:58%; } }
''')

Path('playwright.config.ts').write_text('''import { defineConfig, devices } from '@playwright/test';

const remote = (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process?.env?.E2E_BASE_URL;
const chromiumArgs = ['--disable-dev-shm-usage','--disable-gpu-watchdog','--disable-frame-rate-limit','--disable-gpu-vsync','--ignore-gpu-blocklist','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows'];
const mobileChromium = { ...devices['Pixel 7'], isMobile:true, hasTouch:true, launchOptions:{ args:chromiumArgs } };

export default defineConfig({
  testDir:'./tests', timeout:70_000, expect:{timeout:10_000}, workers:1, fullyParallel:false, retries:0,
  reporter:[['list'],['html',{outputFolder:'playwright-report',open:'never'}]],
  use:{ headless:true, baseURL:remote || 'http://127.0.0.1:4173', trace:'retain-on-failure', screenshot:'only-on-failure', video:'off' },
  webServer:remote ? undefined : { command:'npm run preview -- --port 4173', url:'http://127.0.0.1:4173', reuseExistingServer:true },
  projects:[
    { name:'desktop-chromium', testIgnore:[/orientation\\.spec\\.ts/,/orientation-webkit\\.spec\\.ts/], grepInvert:/mobile controls expose parity actions/, use:{...devices['Desktop Chrome'],viewport:{width:1920,height:1080},launchOptions:{args:chromiumArgs}} },
    { name:'mobile-chromium', testIgnore:[/orientation\\.spec\\.ts/,/orientation-webkit\\.spec\\.ts/], use:{...mobileChromium,viewport:{width:915,height:412}} },
    { name:'mobile-portrait-chromium', testMatch:/orientation\\.spec\\.ts/, grep:/portrait full mission/, use:{...mobileChromium,viewport:{width:412,height:915}} },
    { name:'mobile-landscape-chromium', testMatch:/orientation\\.spec\\.ts/, grep:/landscape full mission/, use:{...mobileChromium,viewport:{width:915,height:412}} },
    { name:'mobile-rotation-chromium', testMatch:/orientation\\.spec\\.ts/, grep:/rotation bidirectional/, use:{...mobileChromium,viewport:{width:412,height:915}} },
    { name:'webkit-mobile-portrait', testMatch:/orientation-webkit\\.spec\\.ts/, grep:/portrait/, use:{...devices['iPhone 14'],viewport:{width:390,height:844}} },
    { name:'webkit-mobile-landscape', testMatch:/orientation-webkit\\.spec\\.ts/, grep:/landscape/, use:{...devices['iPhone 14'],viewport:{width:844,height:390}} },
    { name:'webkit-mobile-smoke', testMatch:/smoke\\.spec\\.ts/, dependencies:['mobile-portrait-chromium','mobile-landscape-chromium','mobile-rotation-chromium','webkit-mobile-portrait','webkit-mobile-landscape'], use:{...devices['iPhone 14'],viewport:{width:844,height:390}} },
  ],
});
''')

Path('tests/orientation.spec.ts').write_text('''import { test, expect, type Page, type TestInfo } from '@playwright/test';
const state=(page:Page)=>page.evaluate(()=>window.__QS_TEST__.state());
async function noBlock(page:Page){ expect(await page.locator('#orientation').count()).toBe(0); }
async function boot(page:Page){ await page.goto('/?perf=1',{waitUntil:'domcontentloaded'}); await noBlock(page); await page.locator('#startBtn').click(); await expect(page.locator('#hud')).toBeVisible(); await expect(page.locator('#touch')).toBeVisible(); await noBlock(page); }
async function stick(page:Page,ms=650,run=false){ const el=page.locator('#stick'); const b=await el.boundingBox(); if(!b)throw new Error('stick missing'); const x=b.x+b.width/2,y=b.y+b.height/2,id=41; if(run)await page.locator('#runBtn').dispatchEvent('pointerdown',{pointerId:51,pointerType:'touch',isPrimary:true}); await el.dispatchEvent('pointerdown',{pointerId:id,pointerType:'touch',isPrimary:true,clientX:x,clientY:y}); await el.dispatchEvent('pointermove',{pointerId:id,pointerType:'touch',isPrimary:true,clientX:x,clientY:b.y+5}); await page.waitForTimeout(ms); await el.dispatchEvent('pointerup',{pointerId:id,pointerType:'touch',isPrimary:true,clientX:x,clientY:b.y+5}); if(run)await page.locator('#runBtn').dispatchEvent('pointerup',{pointerId:51,pointerType:'touch',isPrimary:true}); }
async function orbit(page:Page){ const el=page.locator('#lookZone'); const b=await el.boundingBox(); if(!b)throw new Error('look missing'); const id=61,y=b.y+b.height*.48; await el.dispatchEvent('pointerdown',{pointerId:id,pointerType:'touch',isPrimary:true,clientX:b.x+b.width*.72,clientY:y}); await el.dispatchEvent('pointermove',{pointerId:id,pointerType:'touch',isPrimary:true,clientX:b.x+b.width*.28,clientY:y+18}); await el.dispatchEvent('pointerup',{pointerId:id,pointerType:'touch',isPrimary:true,clientX:b.x+b.width*.28,clientY:y+18}); }
async function tap(page:Page,sel:string,id:number){ await page.locator(sel).dispatchEvent('pointerdown',{pointerId:id,pointerType:'touch',isPrimary:true}); await page.locator(sel).dispatchEvent('pointerup',{pointerId:id,pointerType:'touch',isPrimary:true}); }
async function mission(page:Page,info:TestInfo,png:string){ await boot(page); const a=await state(page); await stick(page,850,true); const b=await state(page); expect(Math.hypot(Number(b.x)-Number(a.x),Number(b.z)-Number(a.z))).toBeGreaterThan(.2); await orbit(page); await page.evaluate(()=>window.__QS_TEST__.teleport(-8,33)); await tap(page,'#qBtn',71); await expect.poll(async()=>Number((await state(page)).qUses)).toBeGreaterThan(0); await page.evaluate(()=>window.__QS_TEST__.nearTaxi()); await expect(page.locator('#actionBtn')).toBeVisible(); await tap(page,'#actionBtn',72); await expect.poll(async()=>Boolean((await state(page)).vehicleMode)).toBe(true); const ta=await state(page); await stick(page,700); const tb=await state(page); expect(Math.hypot(Number(tb.x)-Number(ta.x),Number(tb.z)-Number(ta.z))).toBeGreaterThan(.08); await tap(page,'#actionBtn',73); await expect.poll(async()=>Boolean((await state(page)).vehicleMode)).toBe(false); await page.evaluate(()=>window.__QS_TEST__.destination()); await expect(page.locator('#resultTitle')).toHaveText('MISSION PASSED'); await page.locator('#restartBtn').click(); await page.evaluate(()=>window.__QS_TEST__.entity(100)); await expect(page.locator('#resultTitle')).toHaveText('LES DISTE ENTIDAD'); await page.locator('#restartBtn').click(); const r=await state(page); expect(r.started).toBe(true); expect(r.ended).toBe(false); expect(Number(r.drawCalls)).toBeLessThanOrEqual(140); expect(Number(r.triangles)).toBeLessThanOrEqual(350000); console.log(`ORIENTATION_RENDER ${info.project.name} ${JSON.stringify(r)}`); await page.screenshot({path:info.outputPath(png)}); }
test('portrait full mission',async({page},info)=>{ await boot(page); await page.screenshot({path:info.outputPath('portrait-establishing.png')}); await mission(page,info,'portrait-gameplay.png'); });
test('landscape full mission',async({page},info)=>{ await mission(page,info,'landscape-gameplay.png'); });
test('rotation bidirectional preserves live gameplay',async({page},info)=>{ await boot(page); await page.evaluate(()=>{(window as unknown as {__ROTATION_MARKER__?:string}).__ROTATION_MARKER__='alive'}); const a=await state(page); await stick(page,500); await page.setViewportSize({width:915,height:412}); await page.waitForTimeout(250); await noBlock(page); expect(await page.evaluate(()=>document.documentElement.dataset.gameOrientation)).toBe('landscape'); expect(await page.evaluate(()=>(window as unknown as {__ROTATION_MARKER__?:string}).__ROTATION_MARKER__)).toBe('alive'); await orbit(page); await stick(page,500,true); await page.setViewportSize({width:412,height:915}); await page.waitForTimeout(250); await noBlock(page); expect(await page.evaluate(()=>document.documentElement.dataset.gameOrientation)).toBe('portrait'); expect(await page.evaluate(()=>(window as unknown as {__ROTATION_MARKER__?:string}).__ROTATION_MARKER__)).toBe('alive'); const b=await state(page); expect(b.started).toBe(true); expect(b.ended).toBe(false); expect(Math.hypot(Number(b.x)-Number(a.x),Number(b.z)-Number(a.z))).toBeGreaterThan(.2); await page.evaluate(()=>window.__QS_TEST__.teleport(-8,33)); await tap(page,'#qBtn',81); await expect.poll(async()=>Number((await state(page)).qUses)).toBeGreaterThan(0); await page.screenshot({path:info.outputPath('rotation-back-portrait.png')}); });
''')

Path('tests/orientation-webkit.spec.ts').write_text('''import { test, expect } from '@playwright/test';
for (const orientation of ['portrait','landscape'] as const) test(`WebKit mobile smoke ${orientation}`,async({page},info)=>{ const errors:string[]=[]; page.on('pageerror',e=>errors.push(e.message)); await page.goto('/?perf=1',{waitUntil:'domcontentloaded'}); expect(await page.locator('#orientation').count()).toBe(0); await page.locator('#startBtn').click(); await expect(page.locator('#hud')).toBeVisible(); await expect(page.locator('#touch')).toBeVisible(); expect(await page.evaluate(()=>document.documentElement.dataset.gameOrientation)).toBe(orientation); await page.locator('#qBtn').dispatchEvent('pointerdown',{pointerId:91,pointerType:'touch',isPrimary:true}); await expect.poll(async()=>Number((await page.evaluate(()=>window.__QS_TEST__.state())).qUses)).toBeGreaterThan(0); expect(errors).toEqual([]); await page.screenshot({path:info.outputPath(`webkit-${orientation}.png`)}); });
''')
print('ORDER-001A staged')
