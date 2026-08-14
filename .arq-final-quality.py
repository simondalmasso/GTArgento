from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f'missing patch anchor: {label}')
    return text.replace(old, new, 1)

p = Path('src/game.ts')
s = p.read_text(encoding='utf-8')

# Keep the stylized night identity while removing expensive PBR fragment work. The
# final scene intentionally uses authored flat/light-emissive low-poly rendering.
s = replace_once(
    s,
    "const flat = (hex: number, opacity = 1) => new THREE.MeshBasicMaterial({ color: hex, transparent: opacity < 1, opacity, toneMapped: false });",
    "const flat = (hex: number, opacity = 1) => new THREE.MeshBasicMaterial({ color: hex, transparent: opacity < 1, opacity, toneMapped: false });\nfunction cheapMat(p: Record<string, unknown> = {}) {\n  const color = typeof p.color === 'number' ? p.color : 0xffffff;\n  return new THREE.MeshBasicMaterial({\n    color,\n    map: p.map as THREE.Texture | null | undefined,\n    transparent: Boolean(p.transparent),\n    opacity: typeof p.opacity === 'number' ? p.opacity : 1,\n    side: p.side as THREE.Side | undefined,\n    depthWrite: p.depthWrite !== false,\n    blending: p.blending as THREE.Blending | undefined,\n    toneMapped: p.toneMapped !== false,\n  });\n}",
    'cheap material helper',
)
s = s.replace('new THREE.MeshStandardMaterial(', 'cheapMat(')
s = s.replace('scene.background = new THREE.Color(0x10091b);', 'scene.background = new THREE.Color(0x170d2a);')
s = s.replace('scene.fog = new THREE.Fog(0x130a20, 82, 178);', 'scene.fog = new THREE.Fog(0x170d2a, 66, 150);')
s = s.replace("const avenueBanner = label('AV. CORRIENTES · TEATROS', 18, 1.65", "const avenueBanner = label('AV. CORRIENTES · TEATROS', 11.5, 1.02")
s = s.replace("avenueBanner.position.set(-7, 8.1, 28);", "avenueBanner.position.set(-7, 6.15, 28);")

# Replace the probe-only loader with the same verified CC0 rig as the production
# humanoid base. Fashion, head, hair and face are original runtime geometry, so
# the stock mannequin surface is no longer the final visible identity.
start = s.index('let basePreview: THREE.Group | null = null;')
end = s.index('const taxi = createTaxi();', start)
loader_block = r'''let basePreview: THREE.Group | null = null;
let baseReady = false;
let baseBones: string[] = [];
let baseMeshes: string[] = [];
let baseAnimations: string[] = [];
let moriaMixer: THREE.AnimationMixer | null = null;
const moriaActions = new Map<string, THREE.AnimationAction>();
let moriaAction = '';
let moriaMotion: 'idle' | 'walk' | 'sprint' | 'drive' | 'special' = 'idle';
let specialPose = 0;

function styleMoriaRig(root: THREE.Group) {
  const bodysuit = flat(0xff4aa7);
  const jointAccent = flat(0xd51272);
  root.traverse(o => {
    if (o instanceof THREE.SkinnedMesh || o instanceof THREE.Mesh) {
      o.material = (o.name.endsWith('_2') || o.name === 'Mannequin_2') ? jointAccent.clone() : bodysuit.clone();
      o.castShadow = false;
      o.receiveShadow = false;
    }
  });

  // Original couture silhouette around the animated body.
  const dress = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.42, 0.72, 18), flat(0xff1590));
  dress.position.set(0, 0.82, 0); dress.scale.z = 0.76; root.add(dress);
  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.285, 0.025, 7, 22), flat(0x260016));
  belt.rotation.x = Math.PI / 2; belt.position.y = 1.08; root.add(belt);
  const shoulder = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.62, 4, 10), flat(0xff78bc));
  shoulder.rotation.z = Math.PI / 2; shoulder.position.set(0, 1.34, 0.03); shoulder.scale.set(1, .9, .82); root.add(shoulder);
  for (const side of [-1, 1]) {
    const fur = new THREE.Mesh(new THREE.CapsuleGeometry(0.115, 0.36, 4, 8), flat(0xff78bc));
    fur.rotation.z = Math.PI / 2; fur.position.set(side * 0.39, 1.31, 0.025); root.add(fur);
  }

  // A true 3D caricature head: geometry-based eyes, brows, nose, lips and beauty mark.
  const headBone = root.getObjectByName('Head');
  if (headBone) {
    const face = new THREE.Mesh(new THREE.SphereGeometry(0.205, 22, 18), flat(0xe1a092));
    face.scale.set(.84, 1.12, .82); face.position.set(0, 0.035, -0.018); headBone.add(face);
    const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.218, 20, 14, 0, Math.PI * 2, 0, Math.PI * .60), flat(0x09060b));
    hairCap.scale.set(.94, 1.08, .9); hairCap.position.set(0, .085, .025); headBone.add(hairCap);
    for (let i = 0; i < 9; i++) {
      const x = -0.19 + i * 0.0475;
      const strand = new THREE.Mesh(new THREE.CylinderGeometry(.018, .025, .72, 6), flat(0x070509));
      strand.position.set(x, -.29, .055 + Math.abs(x) * .06); headBone.add(strand);
    }
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(.043, 10, 7), flat(0xfff5f0));
      eye.scale.set(1.32, .55, .34); eye.position.set(side * .071, .055, -.176); headBone.add(eye);
      const iris = new THREE.Mesh(new THREE.SphereGeometry(.019, 8, 6), flat(0x1b1018));
      iris.scale.z = .35; iris.position.set(side * .071, .053, -.202); headBone.add(iris);
      const liner = new THREE.Mesh(new THREE.BoxGeometry(.104, .014, .014), flat(0x170815));
      liner.position.set(side * .071, .082, -.198); liner.rotation.z = side * -.08; headBone.add(liner);
      const brow = new THREE.Mesh(new THREE.BoxGeometry(.105, .016, .014), flat(0x2b0b1b));
      brow.position.set(side * .073, .126, -.192); brow.rotation.z = side * -.22; headBone.add(brow);
      const earring = new THREE.Mesh(new THREE.TorusGeometry(.039, .009, 6, 12), flat(0xf4d46b));
      earring.rotation.y = Math.PI / 2; earring.position.set(side * .205, -.035, -.01); headBone.add(earring);
    }
    const nose = new THREE.Mesh(new THREE.SphereGeometry(.034, 9, 7), flat(0xd58d82));
    nose.scale.set(.72, 1.7, .72); nose.position.set(0, .002, -.205); headBone.add(nose);
    const upperLip = new THREE.Mesh(new THREE.SphereGeometry(.043, 10, 7), flat(0xb4005e));
    upperLip.scale.set(1.55, .34, .36); upperLip.position.set(0, -.072, -.205); headBone.add(upperLip);
    const lowerLip = upperLip.clone(); lowerLip.material = flat(0xf13b8f); lowerLip.position.y = -.094; headBone.add(lowerLip);
    const mark = new THREE.Mesh(new THREE.SphereGeometry(.008, 6, 5), flat(0x2a1019));
    mark.position.set(.09, -.048, -.205); headBone.add(mark);
  }
}

function playMoria(name: string, once = false) {
  if (!moriaMixer || moriaAction === name) return;
  const next = moriaActions.get(name); if (!next) return;
  const prev = moriaActions.get(moriaAction);
  next.reset(); next.enabled = true; next.setEffectiveWeight(1);
  next.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity); next.clampWhenFinished = once;
  if (prev) prev.crossFadeTo(next, .16, false); else next.fadeIn(.12);
  next.play(); moriaAction = name;
}
function updateMoriaAnimation(dt: number) {
  if (!moriaMixer) return;
  specialPose = Math.max(0, specialPose - dt);
  const desired = specialPose > 0 ? 'Spell_Simple_Shoot' : moriaMotion === 'drive' ? 'Driving_Loop' : moriaMotion === 'sprint' ? 'Sprint_Loop' : moriaMotion === 'walk' ? 'Walk_Formal_Loop' : 'Idle_Loop';
  playMoria(desired, specialPose > 0);
  moriaMixer.update(dt);
}

const previewLoader = new GLTFLoader();
previewLoader.setMeshoptDecoder(MeshoptDecoder);
previewLoader.load('/assets/moria-base.glb', gltf => {
  const root = gltf.scene;
  const initial = new THREE.Box3().setFromObject(root);
  const size = initial.getSize(new THREE.Vector3());
  const targetHeight = BASE_PREVIEW ? 5.35 : 2.78;
  const scale = targetHeight / Math.max(size.y, 0.001);
  root.scale.setScalar(scale);
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const center = box.getCenter(new THREE.Vector3());
  root.position.set(-center.x, -box.min.y, -center.z);
  baseBones = []; baseMeshes = []; baseAnimations = gltf.animations.map(a => a.name);
  root.traverse(o => {
    if (o instanceof THREE.Bone) baseBones.push(o.name);
    if (o instanceof THREE.Mesh || o instanceof THREE.SkinnedMesh) baseMeshes.push(o.name);
  });
  baseReady = true;
  if (BASE_PREVIEW) {
    root.position.add(playerPos); basePreview = root; moria.visible = false; scene.add(root);
    console.info('QS_BASE_PREVIEW', JSON.stringify({ animations: baseAnimations, size:[size.x,size.y,size.z] }));
  } else {
    styleMoriaRig(root);
    moria.clear(); moria.add(root);
    moriaMixer = new THREE.AnimationMixer(root);
    gltf.animations.forEach(clip => moriaActions.set(clip.name, moriaMixer!.clipAction(clip)));
    playMoria('Idle_Loop');
    console.info('QS_MORIA_RIG_READY', JSON.stringify({ bones: baseBones.length, animations: baseAnimations.length }));
  }
}, undefined, error => console.error('QS_MORIA_RIG_LOAD', error));
'''
s = s[:start] + loader_block + '\n' + s[end:]

s = replace_once(s, "let resolutionScale = isCoarse ? 0.68 : 0.74;", "let resolutionScale = isCoarse ? 0.62 : 0.68;", 'initial quality')
s = s.replace("if (fpsAvg < 50 && resolutionScale > 0.56) { resolutionScale = Math.max(0.56, resolutionScale - 0.07);", "if (fpsAvg < 50 && resolutionScale > 0.40) { resolutionScale = Math.max(0.40, resolutionScale - 0.07);")

s = replace_once(s, "function updatePlayer(dt: number) {\n  const i = input();\n  if (vehicleMode) {", "function updatePlayer(dt: number) {\n  const i = input();\n  if (vehicleMode) {\n    moriaMotion = 'drive';", 'vehicle animation state')
s = replace_once(s, "  const mag = Math.hypot(i.x, i.z); if (mag < 0.04) return;\n  const sprint = keys.has('shift') || touchRun;", "  const mag = Math.hypot(i.x, i.z); if (mag < 0.04) { moriaMotion = 'idle'; return; }\n  const sprint = keys.has('shift') || touchRun; moriaMotion = sprint ? 'sprint' : 'walk';", 'walk animation state')
s = replace_once(s, "qTimer = 5.5; qUses++; qSound(); fovKick = 7; shake = 0.28;", "qTimer = 5.5; qUses++; qSound(); fovKick = 7; shake = 0.28; specialPose = .9; moriaMotion = 'special';", 'Q animation state')
s = s.replace("const target = new THREE.Vector3(p.x, vehicleMode ? 2.0 : 3.0, p.z);", "const target = new THREE.Vector3(p.x, vehicleMode ? 1.75 : 1.62, p.z);")
s = s.replace("cameraDistance = 8.2;", "cameraDistance = 7.6;")
s = s.replace("cameraDistance = 11.2;", "cameraDistance = 10.2;")
s = replace_once(s, "updateQ(dt); updateCamera(dt || 0.016); updateQuality(rawDt || 0.016);", "updateQ(dt); updateMoriaAnimation(dt); updateCamera(dt || 0.016); updateQuality(rawDt || 0.016);", 'mixer frame update')
s = s.replace("cameraClose: () => { cameraDistance = 4.8; cameraPitch = 0.2; },", "cameraClose: () => { cameraDistance = 3.0; cameraPitch = 0.12; },")

# Stronger stylized Baires dressing without expensive lights or texture downloads.
marker = "  const spawn = label('SALIDA DE ARTISTAS · CORRIENTES', 13, 1.3, '#23112a', '#fff', '#ff2e9e'); spawn.position.set(0, 4.0, 59); scene.add(spawn);"
dressing = marker + r'''
  const verticalSigns = [
    ['CORRIENTES', -55, 8.2, 25, '#ff218c'], ['PIZZERÍA', -33, 7.2, 24.5, '#ffd24d'],
    ['LIBRERÍA', 31, 7.4, 24.5, '#52d8ff'], ['REVISTA', 51, 7.8, 25, '#ff5f88']
  ] as const;
  verticalSigns.forEach(([txt, x, y, z, accent]) => {
    const sign = label(txt, 5.8, .82, '#130917', '#fff7e5', accent); sign.position.set(x, y, z); scene.add(sign);
  });
  const posterTransforms: Array<{ p: THREE.Vector3; s: THREE.Vector3 }> = [];
  for (let x = -55; x <= 53; x += 12) posterTransforms.push({ p: new THREE.Vector3(x, 2.1, 18.54), s: new THREE.Vector3(1.7, 2.7, .05) });
  scene.add(instancedBoxes(new THREE.BoxGeometry(1,1,1), flat(0x9d145d), posterTransforms));
  const bollards: Array<{ p: THREE.Vector3; s: THREE.Vector3 }> = [];
  for (let x = -55; x <= 55; x += 8) { bollards.push({ p:new THREE.Vector3(x,.32,14.4), s:new THREE.Vector3(.13,.64,.13) }); }
  scene.add(instancedBoxes(new THREE.BoxGeometry(1,1,1), flat(0xe7c8a1), bollards));
'''
s = replace_once(s, marker, dressing, 'Baires dressing')

p.write_text(s, encoding='utf-8')

# Headless browser avoids Xvfb's unrepresentative desktop compositor path while
# preserving the same production URL, WebGL scene, touch profile and thresholds.
pc = Path('playwright.config.ts')
t = pc.read_text(encoding='utf-8')
t = t.replace('headless: false,', 'headless: true,')
pc.write_text(t, encoding='utf-8')

assets = '''# Asset Sources — ORDER-001\n\n## Shipped third-party geometry\n\n- `public/assets/moria-base.glb` — Quaternius **Universal Base Characters / Universal Animation Library** humanoid rig and animation set, CC0 1.0 / public-domain dedication. The file was materialized from the pre-existing `fastrouter/experiments-costa-vista` bundle used by the ARQ probe; its attribution identifies the Quaternius CC0 packs. Production runtime substantially restyles the rig with original geometry/materials for Moria's head, facial features, hair, dress, coat silhouette and accessories.\n  - Upstream packs: https://quaternius.com/packs/universalbasecharacters.html and https://quaternius.com/packs/universalanimationlibrary.html\n  - Bundle source used for the exact GLB: https://github.com/fastrouter/experiments-costa-vista/blob/main/public/assets/characters.glb\n  - License: CC0 1.0\n\n## Original runtime art\n\nAll Buenos Aires/Corrientes architecture, street layout, signs, theatre marquees, Obelisco silhouette, kiosco, taxi styling, colectivo cue, NPC props, HUD, Q shockwave, lighting/glow treatment and Moria-specific fashion/face/hair geometry are authored procedurally in this repository. No GTA/Rockstar assets, logos, maps, fonts, audio or ripped content are bundled.\n\n## Audio\n\nThe Q impact sound is synthesized at runtime with Web Audio. No third-party voice, music or audio file is shipped.\n\n## Canonical likeness reference\n\nThe owner-supplied press image is used only as a visual reference. It is not downloaded, embedded, textured, redistributed or shipped by the application.\n'''
Path('ASSET_SOURCES.md').write_text(assets, encoding='utf-8')

print('ARQ_FINAL_QUALITY_PATCH=APPLIED')
