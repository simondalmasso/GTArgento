from pathlib import Path

p = Path('src/game.ts')
s = p.read_text(encoding='utf-8')

old = "import * as THREE from 'three';\nimport RAPIER from '@dimforge/rapier3d-compat';"
new = "import * as THREE from 'three';\nimport { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';\nimport RAPIER from '@dimforge/rapier3d-compat';"
assert old in s
s = s.replace(old, new, 1)

old = "const PERF_MODE = params.has('perf');\nconst isCoarse"
new = "const PERF_MODE = params.has('perf');\nconst BASE_PREVIEW = params.has('base');\nconst isCoarse"
assert old in s
s = s.replace(old, new, 1)

old = "buildBaires();\nconst moria = createMoria(); scene.add(moria);\nconst taxi"
new = '''buildBaires();
const moria = createMoria(); scene.add(moria);
let basePreview: THREE.Group | null = null;
let baseReady = false;
if (BASE_PREVIEW) {
  new GLTFLoader().load('/assets/moria-base.glb', gltf => {
    const root = gltf.scene;
    const initial = new THREE.Box3().setFromObject(root);
    const size = initial.getSize(new THREE.Vector3());
    const targetHeight = 5.35;
    const scale = targetHeight / Math.max(size.y, 0.001);
    root.scale.setScalar(scale);
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    const center = box.getCenter(new THREE.Vector3());
    const min = box.min;
    root.position.set(-center.x, -min.y, -center.z);
    root.position.add(playerPos);
    root.traverse(o => {
      if (o instanceof THREE.Mesh || o instanceof THREE.SkinnedMesh) {
        o.castShadow = false;
        o.receiveShadow = true;
      }
    });
    basePreview = root;
    baseReady = true;
    moria.visible = false;
    scene.add(root);
    console.info('QS_BASE_PREVIEW', JSON.stringify({animations:gltf.animations.map(a=>a.name), size:[size.x,size.y,size.z], nodes:root.children.map(c=>c.name)}));
  }, undefined, error => console.error('QS_BASE_PREVIEW_LOAD', error));
}
const taxi'''
assert old in s
s = s.replace(old, new, 1)

# playerPos is currently declared after this insertion; move it before model load.
s = s.replace("buildBaires();\nconst moria", "const playerPos = new THREE.Vector3(0, 0, 50);\nbuildBaires();\nconst moria", 1)
s = s.replace("\nconst playerPos = new THREE.Vector3(0, 0, 50);\nconst destination", "\nconst destination", 1)

old = "playerPos.set(0, 0, 50); playerBody.setNextKinematicTranslation({ x: 0, y: 1.2, z: 50 }); moria.visible = true; moria.position.copy(playerPos); moria.rotation.y = 0;"
new = "playerPos.set(0, 0, 50); playerBody.setNextKinematicTranslation({ x: 0, y: 1.2, z: 50 }); moria.visible = !BASE_PREVIEW; moria.position.copy(playerPos); moria.rotation.y = 0; if (basePreview) { basePreview.position.x = playerPos.x; basePreview.position.z = playerPos.z; basePreview.rotation.y = 0; }"
assert old in s
s = s.replace(old, new, 1)

old = "moria.position.set(playerPos.x, Math.sin(elapsed * 8.5) * (started && !vehicleMode ? 0.025 : 0), playerPos.z);"
new = "moria.position.set(playerPos.x, Math.sin(elapsed * 8.5) * (started && !vehicleMode ? 0.025 : 0), playerPos.z); if (basePreview) { basePreview.position.x = playerPos.x; basePreview.position.z = playerPos.z; basePreview.rotation.y = playerYaw; basePreview.visible = !vehicleMode; }"
assert old in s
s = s.replace(old, new, 1)

old = "triangles: renderer.info.render.triangles })"
new = "triangles: renderer.info.render.triangles, baseReady })"
assert old in s
s = s.replace(old, new, 1)

p.write_text(s, encoding='utf-8')

spec = Path('tests/base-preview.spec.ts')
spec.write_text('''import { test, expect } from '@playwright/test';\n\ntest('CC0 humanoid base visual probe', async ({ page }, testInfo) => {\n  test.skip(testInfo.project.name !== 'desktop-chromium', 'desktop visual probe only');\n  await page.goto('/?base=1&perf=1', { waitUntil: 'domcontentloaded' });\n  await page.locator('#startBtn').click();\n  await expect.poll(async () => Boolean((await page.evaluate(() => window.__QS_TEST__.state())).baseReady), { timeout: 15000 }).toBe(true);\n  await page.evaluate(() => window.__QS_TEST__.cameraClose());\n  await page.waitForTimeout(1800);\n  await page.screenshot({ path: testInfo.outputPath('cc0-base-front.png') });\n});\n''', encoding='utf-8')
print('base preview probe applied')
