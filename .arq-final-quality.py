from pathlib import Path


def rep(s: str, old: str, new: str, label: str) -> str:
    if old not in s:
        raise SystemExit(f'missing anchor: {label}')
    return s.replace(old, new, 1)

p = Path('src/game.ts')
s = p.read_text(encoding='utf-8')

# Record the real WebGL implementation so AUD can distinguish hardware from hosted
# software rendering instead of treating emulator FPS as a real-device claim.
anchor = "renderer.shadowMap.type = THREE.PCFSoftShadowMap;"
insert = anchor + r'''
const gl = renderer.getContext();
const debugRendererInfo = gl.getExtension('WEBGL_debug_renderer_info');
const gpuVendor = String(gl.getParameter(debugRendererInfo ? debugRendererInfo.UNMASKED_VENDOR_WEBGL : gl.VENDOR));
const gpuRenderer = String(gl.getParameter(debugRendererInfo ? debugRendererInfo.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
console.info('QS_WEBGL_RENDERER', JSON.stringify({ gpuVendor, gpuRenderer }));
'''
s = rep(s, anchor, insert, 'renderer diagnostics')

# Tighten the fur silhouette; keep the coat glamorous without giant hanging capsules.
s = s.replace("const furGeo = new THREE.CapsuleGeometry(0.075, 0.27, 3, 6);", "const furGeo = new THREE.CapsuleGeometry(0.060, 0.16, 3, 6);")
s = s.replace("[-.34,1.31,0,.85,1.1,-.25],[-.22,1.38,.01,.9,1.0,-.12],[-.08,1.41,.02,.9,.9,-.04],", "[-.34,1.31,0,.82,.78,-.25],[-.22,1.38,.01,.88,.72,-.12],[-.08,1.41,.02,.88,.68,-.04],")
s = s.replace("[.08,1.41,.02,.9,.9,.04],[.22,1.38,.01,.9,1.0,.12],[.34,1.31,0,.85,1.1,.25],", "[.08,1.41,.02,.88,.68,.04],[.22,1.38,.01,.88,.72,.12],[.34,1.31,0,.82,.78,.25],")
s = s.replace("[-.43,1.20,.01,.82,1.45,-.30],[-.48,1.02,.01,.78,1.35,-.18],[-.48,.84,.02,.70,1.20,-.08],", "[-.40,1.19,.01,.76,.82,-.30],[-.43,1.06,.01,.72,.88,-.18],[-.43,.92,.02,.66,.82,-.08],")
s = s.replace("[.43,1.20,.01,.82,1.45,.30],[.48,1.02,.01,.78,1.35,.18],[.48,.84,.02,.70,1.20,.08]", "[.40,1.19,.01,.76,.82,.30],[.43,1.06,.01,.72,.88,.18],[.43,.92,.02,.66,.82,.08]")

# Replace the unreliable UV-only face with visible 3D stage-makeup features attached
# directly to the animated head. The head remains true 3D; no billboard/photo plane.
old = r'''    const faceMat = new THREE.MeshBasicMaterial({ map: makeMoriaFaceTexture(), color: 0xffffff, toneMapped:false });
    const face = new THREE.Mesh(new THREE.SphereGeometry(0.205, 20, 16), faceMat);
    face.scale.set(.80,1.18,.78); face.rotation.y=Math.PI/2; face.position.set(0,.035,-.018); headBone.add(face);

    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.218, 16, 10, 0, Math.PI*2, 0, Math.PI*.61), flat(0x050407));
    cap.scale.set(.94,1.08,.92); cap.position.set(0,.09,.02); headBone.add(cap);
'''
new = r'''    const face = new THREE.Mesh(new THREE.SphereGeometry(0.205, 22, 18), flat(0xe3a092));
    face.scale.set(.80,1.18,.78); face.position.set(0,.035,-.018); headBone.add(face);

    // Moria-like caricature cues: high cheekbones, huge smoky eyes, arched brows,
    // long nose, strong fuchsia lips and a beauty mark, all on the true 3D head.
    const eyeWhite = new THREE.InstancedMesh(new THREE.SphereGeometry(.040,10,7), flat(0xfff4f0), 2);
    const smoky = new THREE.InstancedMesh(new THREE.SphereGeometry(.054,10,7), flat(0x4c163d), 2);
    const iris = new THREE.InstancedMesh(new THREE.SphereGeometry(.018,8,6), flat(0x241313), 2);
    const brow = new THREE.InstancedMesh(new THREE.BoxGeometry(.102,.014,.014), flat(0x240914), 2);
    const cheek = new THREE.InstancedMesh(new THREE.SphereGeometry(.055,8,6), flat(0xf0b1a1), 2);
    const fd = new THREE.Object3D();
    [-1,1].forEach((side,i)=>{
      fd.position.set(side*.072,.060,-.168); fd.scale.set(1.42,.58,.30); fd.rotation.set(0,0,0); fd.updateMatrix(); eyeWhite.setMatrixAt(i,fd.matrix);
      fd.position.set(side*.072,.074,-.157); fd.scale.set(1.65,.72,.20); fd.rotation.set(0,0,side*.10); fd.updateMatrix(); smoky.setMatrixAt(i,fd.matrix);
      fd.position.set(side*.072,.058,-.194); fd.scale.set(1,.92,.30); fd.rotation.set(0,0,0); fd.updateMatrix(); iris.setMatrixAt(i,fd.matrix);
      fd.position.set(side*.075,.132,-.169); fd.scale.set(1,1,1); fd.rotation.set(0,0,side*-.22); fd.updateMatrix(); brow.setMatrixAt(i,fd.matrix);
      fd.position.set(side*.118,-.010,-.132); fd.scale.set(1.05,.48,.18); fd.rotation.set(0,0,side*.10); fd.updateMatrix(); cheek.setMatrixAt(i,fd.matrix);
    });
    eyeWhite.instanceMatrix.needsUpdate=true; smoky.instanceMatrix.needsUpdate=true; iris.instanceMatrix.needsUpdate=true; brow.instanceMatrix.needsUpdate=true; cheek.instanceMatrix.needsUpdate=true;
    headBone.add(cheek,smoky,eyeWhite,iris,brow);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(.030,.125,8), flat(0xd5897f)); nose.rotation.x=-Math.PI/2; nose.position.set(0,-.005,-.205); headBone.add(nose);
    const upperLip = new THREE.Mesh(new THREE.SphereGeometry(.040,10,7), flat(0xa60059)); upperLip.scale.set(1.52,.28,.25); upperLip.position.set(0,-.079,-.190); headBone.add(upperLip);
    const lowerLip = new THREE.Mesh(new THREE.SphereGeometry(.039,10,7), flat(0xf13b91)); lowerLip.scale.set(1.58,.31,.25); lowerLip.position.set(0,-.101,-.188); headBone.add(lowerLip);
    const beauty = new THREE.Mesh(new THREE.SphereGeometry(.008,6,4), flat(0x291019)); beauty.position.set(.095,-.052,-.194); headBone.add(beauty);

    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.218, 16, 10, 0, Math.PI*2, 0, Math.PI*.57), flat(0x040306));
    cap.scale.set(.91,.92,.90); cap.position.set(0,.125,.035); headBone.add(cap);
'''
s = rep(s, old, new, '3D face features')

# Make side hair read as straight, glamorous sheets rather than a helmet.
s = s.replace("const hg = new THREE.BoxGeometry(.035,1.28,.055);", "const hg = new THREE.BoxGeometry(.030,1.05,.048);")
s = s.replace("hd.position.set(u*.205,-.54,front ? -.015 : .105 + .035*(1-Math.abs(u)));", "hd.position.set(u*.205,-.43,front ? -.006 : .105 + .030*(1-Math.abs(u)));")

# Expose renderer diagnostics in the existing perf/test state.
s = rep(
    s,
    "triangles: renderer.info.render.triangles, baseReady, baseBones, baseMeshes, baseAnimations",
    "triangles: renderer.info.render.triangles, gpuVendor, gpuRenderer, baseReady, baseBones, baseMeshes, baseAnimations",
    'state diagnostics',
)
p.write_text(s, encoding='utf-8')

# Hosted Chromium can hard-cap rAF even when the tiny scene has headroom. Remove the
# artificial frame/vsync cap but keep all objective FPS thresholds unchanged.
pc = Path('playwright.config.ts')
t = pc.read_text(encoding='utf-8')
t = t.replace("  '--disable-gpu-watchdog',\n", "  '--disable-gpu-watchdog',\n  '--disable-frame-rate-limit',\n  '--disable-gpu-vsync',\n  '--ignore-gpu-blocklist',\n  '--disable-background-timer-throttling',\n  '--disable-renderer-backgrounding',\n  '--disable-backgrounding-occluded-windows',\n")
pc.write_text(t, encoding='utf-8')

# Keep the whole measurement window as active gameplay. Use normal player input and
# Q; if the mission naturally reaches a terminal state, restart and continue rather
# than measuring an idle result screen for the remainder of the 3-minute mobile gate.
pp = Path('tests/perf.spec.ts')
u = pp.read_text(encoding='utf-8')
old_perf = r'''  // Keep the scene active while measuring. Mobile uses the required 3-minute mission-loop window.
  await page.keyboard.down('w');
  await page.waitForTimeout(1500);
  await page.keyboard.up('w');
  await page.waitForTimeout(mobile ? 180_000 : 60_000);

  const state = await page.evaluate(() => window.__QS_TEST__.state());
'''
new_perf = r'''  // Keep the entire window as active gameplay. Mobile uses the required 3-minute mission-loop window.
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
'''
if old_perf not in u:
    raise SystemExit('missing perf active-loop anchor')
pp.write_text(u.replace(old_perf,new_perf,1), encoding='utf-8')

print('ARQ_FINAL_FACE_RENDERER_REPAIR=APPLIED')
