from pathlib import Path
import re

p = Path('src/game.ts')
s = p.read_text(encoding='utf-8')

# Lighting / contrast: brighter readable Buenos Aires night without expensive shadow passes.
s = s.replace("scene.background = new THREE.Color(0x070711);\nscene.fog = new THREE.Fog(0x090713, 68, 150);", "scene.background = new THREE.Color(0x10091b);\nscene.fog = new THREE.Fog(0x130a20, 82, 178);")
s = s.replace("renderer.toneMappingExposure = 1.4;\nrenderer.shadowMap.enabled = !isCoarse;", "renderer.toneMappingExposure = 1.62;\nrenderer.shadowMap.enabled = false;")
s = s.replace("key.castShadow = !isCoarse;", "key.castShadow = false;")

new_taxi = r'''function createTaxi() {
  const g = new THREE.Group(); g.name = 'TAXI_BAIRES';
  g.add(meshBox(4.35, 0.78, 7.5, C.black, 0, 0.78, 0));
  g.add(meshBox(3.82, 1.18, 4.5, C.yellow, 0, 1.66, -0.12));
  g.add(meshBox(3.32, 0.76, 0.07, C.glass, 0, 1.92, -2.37));
  g.add(meshBox(3.32, 0.72, 0.07, C.glass, 0, 1.9, 2.14));
  const roofSign = label('TAXI', 1.85, 0.66, '#ffd21a', '#111', '#111'); roofSign.position.set(0, 2.66, 0); g.add(roofSign);
  const stripe = meshBox(4.4, 0.14, 7.55, hot(0xffdc24, 1.45), 0, 1.02, 0); g.add(stripe);
  const bumper = meshBox(4.0, 0.16, 0.25, new THREE.MeshStandardMaterial({ color: 0xc8c8c8, metalness: 0.72, roughness: 0.3 }), 0, 0.55, -3.82); g.add(bumper);
  const wheelGeo = new THREE.CylinderGeometry(0.46, 0.46, 0.3, 12);
  const wheels = new THREE.InstancedMesh(wheelGeo, C.black, 4);
  const wheelDummy = new THREE.Object3D();
  [[-2.12, -2.42], [2.12, -2.42], [-2.12, 2.32], [2.12, 2.32]].forEach(([x, z], i) => {
    wheelDummy.position.set(x, 0.48, z); wheelDummy.rotation.set(0, 0, Math.PI / 2); wheelDummy.updateMatrix(); wheels.setMatrixAt(i, wheelDummy.matrix);
  });
  wheels.instanceMatrix.needsUpdate = true; g.add(wheels);
  const lampGeo = new THREE.SphereGeometry(0.18, 8, 6);
  const lamps = new THREE.InstancedMesh(lampGeo, hot(0xfff0b0, 1.5), 2);
  const lampDummy = new THREE.Object3D();
  [-1.35, 1.35].forEach((x, i) => { lampDummy.position.set(x, 0.86, -3.8); lampDummy.updateMatrix(); lamps.setMatrixAt(i, lampDummy.matrix); });
  lamps.instanceMatrix.needsUpdate = true; g.add(lamps);
  return g;
}'''
s, n = re.subn(r"function createTaxi\(\) \{.*?\n\}\n\nfunction createBus", new_taxi + "\n\nfunction createBus", s, flags=re.S)
assert n == 1, f'createTaxi replacement count={n}'

new_moria = r'''function makeMoriaFaceTexture() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 1024;
  const g = c.getContext('2d')!;
  const skin = g.createRadialGradient(512, 470, 90, 512, 500, 560);
  skin.addColorStop(0, '#edb5a6'); skin.addColorStop(0.58, '#d99a8c'); skin.addColorStop(1, '#b87672');
  g.fillStyle = skin; g.fillRect(0, 0, 1024, 1024);
  // sculpted contour / high cheekbones
  g.fillStyle = 'rgba(150,50,72,.20)';
  g.beginPath(); g.ellipse(285, 600, 135, 85, -.16, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(739, 600, 135, 85, .16, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(255,205,190,.28)';
  g.beginPath(); g.ellipse(328, 570, 92, 45, -.18, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(696, 570, 92, 45, .18, 0, Math.PI * 2); g.fill();
  // dramatic smoky eye makeup
  for (const cx of [345, 679]) {
    const sh = g.createRadialGradient(cx, 425, 12, cx, 425, 122);
    sh.addColorStop(0, 'rgba(38,17,35,.80)'); sh.addColorStop(.55, 'rgba(83,24,68,.48)'); sh.addColorStop(1, 'rgba(119,22,78,0)');
    g.fillStyle = sh; g.beginPath(); g.ellipse(cx, 430, 135, 78, 0, 0, Math.PI * 2); g.fill();
  }
  const drawEye = (cx: number, flip: number) => {
    g.fillStyle = '#fff4f4'; g.beginPath(); g.moveTo(cx - 84, 448); g.quadraticCurveTo(cx, 390, cx + 87, 449); g.quadraticCurveTo(cx, 486, cx - 84, 448); g.fill();
    g.fillStyle = '#5b3928'; g.beginPath(); g.arc(cx, 445, 29, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#100c10'; g.beginPath(); g.arc(cx, 445, 15, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,.88)'; g.beginPath(); g.arc(cx - 8, 436, 6, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#150b16'; g.lineWidth = 18; g.lineCap = 'round'; g.beginPath(); g.moveTo(cx - 91, 447); g.quadraticCurveTo(cx, 386, cx + 98, 445); g.stroke();
    g.lineWidth = 9; g.beginPath(); g.moveTo(cx + flip * 72, 428); g.lineTo(cx + flip * 132, 405); g.stroke();
    g.lineWidth = 5;
    for (let i = -2; i <= 2; i++) { const x = cx + i * 28; g.beginPath(); g.moveTo(x, 403); g.lineTo(x + i * 3, 374 - Math.abs(i) * 4); g.stroke(); }
  };
  drawEye(345, -1); drawEye(679, 1);
  // high arched brows
  g.strokeStyle = '#3a1825'; g.lineWidth = 24; g.lineCap = 'round';
  g.beginPath(); g.moveTo(250, 330); g.quadraticCurveTo(345, 274, 438, 325); g.stroke();
  g.beginPath(); g.moveTo(586, 325); g.quadraticCurveTo(679, 274, 774, 330); g.stroke();
  // long narrow nose with makeup highlight
  const ng = g.createLinearGradient(452, 0, 572, 0); ng.addColorStop(0, 'rgba(122,65,67,.28)'); ng.addColorStop(.48, 'rgba(255,221,205,.34)'); ng.addColorStop(1, 'rgba(122,65,67,.28)');
  g.fillStyle = ng; g.beginPath(); g.moveTo(470, 470); g.quadraticCurveTo(454, 650, 512, 690); g.quadraticCurveTo(570, 650, 554, 470); g.closePath(); g.fill();
  g.fillStyle = 'rgba(92,45,52,.55)'; g.beginPath(); g.ellipse(480, 676, 18, 9, -.2, 0, Math.PI * 2); g.fill(); g.beginPath(); g.ellipse(544, 676, 18, 9, .2, 0, Math.PI * 2); g.fill();
  // strong signature fuchsia lips
  g.fillStyle = '#a90058'; g.beginPath(); g.moveTo(390, 757); g.quadraticCurveTo(458, 708, 512, 742); g.quadraticCurveTo(566, 708, 635, 757); g.quadraticCurveTo(565, 842, 512, 835); g.quadraticCurveTo(455, 842, 390, 757); g.fill();
  g.fillStyle = '#e9458e'; g.beginPath(); g.moveTo(404, 762); g.quadraticCurveTo(470, 748, 512, 768); g.quadraticCurveTo(555, 748, 620, 762); g.quadraticCurveTo(554, 814, 512, 809); g.quadraticCurveTo(466, 814, 404, 762); g.fill();
  g.strokeStyle = 'rgba(83,30,44,.34)'; g.lineWidth = 5; g.beginPath(); g.moveTo(414, 760); g.quadraticCurveTo(512, 780, 610, 760); g.stroke();
  // face highlights and small diva beauty mark
  g.fillStyle = 'rgba(255,238,224,.28)'; g.beginPath(); g.ellipse(512, 300, 52, 120, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#3b1725'; g.beginPath(); g.arc(700, 735, 8, 0, Math.PI * 2); g.fill();
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; return tex;
}

function createMoria() {
  const g = new THREE.Group(); g.name = 'MORIA_CASAN_3D';
  const legGeo = new THREE.CapsuleGeometry(0.17, 0.9, 5, 8);
  const legs = new THREE.InstancedMesh(legGeo, C.pink, 2); const d = new THREE.Object3D();
  [-0.28, 0.28].forEach((x, i) => { d.position.set(x, 0.9, 0); d.rotation.set(0, 0, 0); d.scale.set(1, 1, 1); d.updateMatrix(); legs.setMatrixAt(i, d.matrix); }); legs.instanceMatrix.needsUpdate = true; g.add(legs);
  const shoeGeo = new THREE.BoxGeometry(0.38, 0.18, 0.62); const shoes = new THREE.InstancedMesh(shoeGeo, hot(0xff0076, 1.35), 2);
  [-0.28, 0.28].forEach((x, i) => { d.position.set(x, 0.16, -0.13); d.updateMatrix(); shoes.setMatrixAt(i, d.matrix); }); shoes.instanceMatrix.needsUpdate = true; g.add(shoes);
  const dress = new THREE.Mesh(new THREE.CylinderGeometry(0.41, 0.64, 1.9, 20), C.pink); dress.position.y = 2.28; dress.scale.z = 0.73; g.add(dress);
  const torso = new THREE.Mesh(new THREE.SphereGeometry(0.56, 20, 14), C.pink); torso.scale.set(0.85, 1.02, 0.67); torso.position.y = 3.18; g.add(torso);
  const coatCore = new THREE.Mesh(new THREE.CapsuleGeometry(0.46, 1.08, 5, 12), C.fur); coatCore.rotation.z = Math.PI / 2; coatCore.position.set(0, 3.28, 0.05); coatCore.scale.set(1.02, 0.85, 0.78); g.add(coatCore);
  const sleeveGeo = new THREE.CapsuleGeometry(0.2, 0.72, 4, 9); const sleeves = new THREE.InstancedMesh(sleeveGeo, C.fur, 2);
  [-0.72, 0.72].forEach((x, i) => { d.position.set(x, 2.86, 0); d.rotation.set(0, 0, x < 0 ? -0.16 : 0.16); d.updateMatrix(); sleeves.setMatrixAt(i, d.matrix); }); sleeves.instanceMatrix.needsUpdate = true; g.add(sleeves);
  const furGeo = new THREE.ConeGeometry(0.11, 0.52, 6); const furTufts = new THREE.InstancedMesh(furGeo, C.fur, 8);
  for (let i = 0; i < 8; i++) { const side = i < 4 ? -1 : 1; const k = i % 4; d.position.set(side * (0.58 + k * 0.1), 3.34 - k * 0.28, 0.08 + (k % 2) * 0.1); d.rotation.set(0, 0, side * (0.32 + k * 0.07)); d.scale.set(1, 1, 1); d.updateMatrix(); furTufts.setMatrixAt(i, d.matrix); } furTufts.instanceMatrix.needsUpdate = true; g.add(furTufts);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.22, 0.34, 12), C.skin); neck.position.y = 4.08; g.add(neck);
  const faceMaterial = new THREE.MeshStandardMaterial({ map: makeMoriaFaceTexture(), color: 0xffffff, roughness: 0.6 });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.53, 30, 22), faceMaterial); head.scale.set(0.84, 1.14, 0.8); head.rotation.y = Math.PI / 2; head.position.set(0, 4.66, 0); g.add(head);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.23, 10), C.skinHighlight); nose.rotation.x = -Math.PI / 2; nose.position.set(0, 4.56, -0.47); g.add(nose);
  const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.58, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.56), C.hair); hairCap.position.set(0, 4.91, 0.07); hairCap.scale.set(0.96, 1.06, 0.96); g.add(hairCap);
  const hairGeo = new THREE.CylinderGeometry(0.055, 0.08, 2.45, 6); const hair = new THREE.InstancedMesh(hairGeo, C.hair, 9);
  const hairPos = [[-.54, 3.85, -.02], [.5, 3.85, -.02], [-.46, 3.84, .18], [-.3, 3.82, .3], [-.15, 3.81, .35], [0, 3.8, .37], [.15, 3.81, .35], [.3, 3.82, .3], [.46, 3.84, .18]];
  hairPos.forEach(([x, y, z], i) => { d.position.set(x, y, z); d.rotation.set(0, 0, x * 0.08); d.scale.set(1, 1, 1); d.updateMatrix(); hair.setMatrixAt(i, d.matrix); }); hair.instanceMatrix.needsUpdate = true; g.add(hair);
  const earGeo = new THREE.TorusGeometry(0.1, 0.024, 6, 14); const earrings = new THREE.InstancedMesh(earGeo, hot(0xf7d66d, 1.1), 2);
  [-0.52, 0.52].forEach((x, i) => { d.position.set(x, 4.55, -0.01); d.rotation.set(0, Math.PI / 2, 0); d.updateMatrix(); earrings.setMatrixAt(i, d.matrix); }); earrings.instanceMatrix.needsUpdate = true; g.add(earrings);
  g.scale.setScalar(1.08);
  return g;
}'''
s, n = re.subn(r"function createMoria\(\) \{.*?\n\}\n\nfunction createNPC", new_moria + "\n\nfunction createNPC", s, flags=re.S)
assert n == 1, f'createMoria replacement count={n}'

new_npc = r'''function createNPC(kind: NPCKind, x: number, z: number): NPC {
  const root = new THREE.Group();
  const bodyColor = kind === 'paparazzi' ? 0x7a263f : kind === 'fan' ? 0x217a94 : 0x5c5964;
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 1.18, 4, 7), new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.75 })); body.position.y = 1.05; root.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 10, 7), C.skin); head.position.y = 2.05; root.add(head);
  if (kind === 'paparazzi') root.add(meshBox(0.4, 0.27, 0.23, C.black, 0, 1.72, -0.34));
  else if (kind === 'fan') { const phone = meshBox(0.14, 0.28, 0.035, new THREE.MeshStandardMaterial({ color: 0xd6d8e2, metalness: 0.5 }), 0.3, 1.78, -0.18); phone.rotation.z = -0.16; root.add(phone); }
  root.position.set(x, 0, z); scene.add(root);
  return { root, kind, state: 'WANDER', home: new THREE.Vector3(x, 0, z), target: new THREE.Vector3(x, 0, z), speed: kind === 'paparazzi' ? 4.2 : kind === 'fan' ? 3 : 1.7, timer: Math.random() * 2, knock: new THREE.Vector3() };
}'''
s, n = re.subn(r"function createNPC\(kind: NPCKind, x: number, z: number\): NPC \{.*?\n\}\n\nfunction buildBaires", new_npc + "\n\nfunction buildBaires", s, flags=re.S)
assert n == 1, f'createNPC replacement count={n}'

# Stronger immediately-readable Corrientes theatre vista near the spawn.
marker = "  for (const [x, z, rot] of [[-16, 15, 0], [3, -5, Math.PI], [3, 15, Math.PI]] as const) {"
insert = r'''  const avenueBanner = label('AV. CORRIENTES · TEATROS', 18, 1.65, '#071c18', '#fff4d6', '#36e59f'); avenueBanner.position.set(-7, 8.1, 28); scene.add(avenueBanner);
  const rexNeon = label('GRAN REX', 10.5, 2.0, '#170719', '#fff', '#ff2e9e'); rexNeon.position.set(-25, 7.0, 30); scene.add(rexNeon);
  const operaNeon = label('ÓPERA', 8.5, 2.0, '#081923', '#fff', '#5ae4ff'); operaNeon.position.set(13, 7.0, 30); scene.add(operaNeon);
  const rexGlow = glowSprite(0xff2e9e, 11, .19); rexGlow.position.set(-25, 7, 29.4); scene.add(rexGlow);
  const operaGlow = glowSprite(0x5ae4ff, 10, .16); operaGlow.position.set(13, 7, 29.4); scene.add(operaGlow);

'''
assert marker in s
s = s.replace(marker, insert + marker, 1)

# Obelisco centered in the actual street vista and tall enough to read over the blocks.
s = s.replace("new THREE.CylinderGeometry(0.8, 2.0, 28, 4)", "new THREE.CylinderGeometry(1.0, 2.4, 36, 4)", 1)
s = s.replace("shaft.position.y = 14", "shaft.position.y = 18", 1)
s = s.replace("new THREE.ConeGeometry(0.8, 4, 4)", "new THREE.ConeGeometry(1.0, 5, 4)", 1)
s = s.replace("cap.position.y = 30", "cap.position.y = 38.5", 1)
s = s.replace("ob.position.set(0, 0, -76)", "ob.position.set(-7, 0, -66)", 1)
s = s.replace("obGlow.position.set(0, 17, -76)", "obGlow.position.set(-7, 23, -66)", 1)

# Put transport on the avenue, not against a building, and orient driving/camera together.
s = s.replace("const bus = createBus(); bus.position.set(-42, 0, -3.4); bus.rotation.y = Math.PI / 2;", "const bus = createBus(); bus.position.set(-30, 0, 6); bus.rotation.y = Math.PI / 2;", 1)
s = s.replace("const taxi = createTaxi(); taxi.position.set(19, 0, 18); taxi.rotation.y = 0.25;", "const taxi = createTaxi(); taxi.position.set(16, 0, 6); taxi.rotation.y = Math.PI / 2;", 1)
s = s.replace("let vehicleHeading = 0.25;", "let vehicleHeading = Math.PI / 2;", 1)
s = s.replace("vehicleMode = false; vehicleSpeed = 0; vehicleHeading = 0.25; taxi.position.set(19, 0, 18); taxi.rotation.y = vehicleHeading;", "vehicleMode = false; vehicleSpeed = 0; vehicleHeading = Math.PI / 2; taxi.position.set(16, 0, 6); taxi.rotation.y = vehicleHeading;", 1)

# Camera safely follows the taxi from behind when entering/exiting.
s = s.replace("playerBody.setNextKinematicTranslation({ x: playerPos.x, y: 1.2, z: playerPos.z }); actionBtn.textContent = 'ENTRAR'; return;", "playerBody.setNextKinematicTranslation({ x: playerPos.x, y: 1.2, z: playerPos.z }); cameraDistance = 8.2; actionBtn.textContent = 'ENTRAR'; return;", 1)
s = s.replace("if (taxi.position.distanceTo(playerPos) < 5) { vehicleMode = true; moria.visible = false; vehicleHeading = taxi.rotation.y; actionBtn.textContent = 'SALIR'; objective.textContent = 'TAXI TOMADO · LLEGÁ AL BOLICHE'; }", "if (taxi.position.distanceTo(playerPos) < 5) { vehicleMode = true; moria.visible = false; vehicleHeading = taxi.rotation.y; cameraYaw = vehicleHeading + Math.PI; cameraPitch = 0.22; cameraDistance = 11.2; actionBtn.textContent = 'SALIR'; objective.textContent = 'TAXI TOMADO · LLEGÁ AL BOLICHE'; }", 1)

# Honest FPS telemetry: simulation remains clamped after background resumes, measurement uses raw RAF delta.
old_frame = "requestAnimationFrame(frame); const dt = Math.min(0.033, Math.max(0, (now - lastTime) / 1000)); lastTime = now; elapsed += dt;"
new_frame = "requestAnimationFrame(frame); const rawDt = Math.max(0, (now - lastTime) / 1000); const dt = Math.min(0.033, rawDt); lastTime = now; elapsed += dt;"
assert old_frame in s
s = s.replace(old_frame, new_frame, 1)
s = s.replace("updateQ(dt); updateCamera(dt || 0.016); updateQuality(dt || 0.016);", "updateQ(dt); updateCamera(dt || 0.016); updateQuality(rawDt || 0.016);", 1)

p.write_text(s, encoding='utf-8')
print('visual/performance repair applied')

# Playwright: headed Chromium/WebKit under Xvfb is a materially better browser-render timing surface than CI headless RAF.
pw = Path('playwright.config.ts')
t = pw.read_text(encoding='utf-8')
needle = "  use: {\n    baseURL: remote || 'http://127.0.0.1:4173',"
assert needle in t
t = t.replace(needle, "  use: {\n    headless: false,\n    baseURL: remote || 'http://127.0.0.1:4173',", 1)
pw.write_text(t, encoding='utf-8')

# Make the objective FPS thresholds executable acceptance gates.
perf = Path('tests/perf.spec.ts')
t = perf.read_text(encoding='utf-8')
t = t.replace("  expect(Number(state.fpsMedian)).toBeGreaterThan(0);\n  expect(Number(state.fpsP5)).toBeGreaterThan(0);", "  expect(Number(state.fpsMedian)).toBeGreaterThanOrEqual(mobile ? 50 : 58);\n  expect(Number(state.fpsP5)).toBeGreaterThanOrEqual(mobile ? 40 : 45);")
perf.write_text(t, encoding='utf-8')
