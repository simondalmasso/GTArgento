import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import RAPIER from '@dimforge/rapier3d-compat';
import './style.css';

type Vec2 = { x: number; y: number };
type NPCKind = 'paparazzi' | 'fan' | 'neutral';
type NPCState = 'WANDER' | 'CHASE' | 'PHOTO' | 'STAGGER' | 'FLEE';
interface NPC {
  root: THREE.Group;
  kind: NPCKind;
  state: NPCState;
  home: THREE.Vector3;
  target: THREE.Vector3;
  speed: number;
  timer: number;
  knock: THREE.Vector3;
}
interface Shockwave {
  mesh: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  age: number;
}
interface TestApi {
  start: () => void;
  state: () => Record<string, unknown>;
  teleport: (x: number, z: number) => void;
  nearTaxi: () => void;
  destination: () => void;
  entity: (v: number) => void;
  q: () => boolean;
  vehicle: () => void;
  cameraClose: () => void;
}
declare global { interface Window { __QS_TEST__: TestApi } }

const $ = <T extends HTMLElement>(selector: string): T => document.querySelector<T>(selector)!;
const canvas = $('#game') as HTMLCanvasElement;
const intro = $('#intro');
const hud = $('#hud');
const result = $('#result');
const startBtn = $('#startBtn') as HTMLButtonElement;
const restartBtn = $('#restartBtn') as HTMLButtonElement;
const entityFill = $('#entityFill');
const entityValue = $('#entityValue');
const specialText = $('#specialText');
const vehicleHint = $('#vehicleHint');
const objective = $('#objective');
const flash = $('#flash');
const touch = $('#touch');
const stick = $('#stick');
const stickKnob = $('#stickKnob');
const lookZone = $('#lookZone');
const qBtn = $('#qBtn') as HTMLButtonElement;
const runBtn = $('#runBtn') as HTMLButtonElement;
const actionBtn = $('#actionBtn') as HTMLButtonElement;
const qCooldown = $('#qCooldown');
const orientation = $('#orientation');
const perfEl = $('#perf');
const resultTitle = $('#resultTitle');
const resultKicker = $('#resultKicker');
const resultScore = $('#resultScore');

const params = new URLSearchParams(location.search);
const PERF_MODE = params.has('perf');
const BASE_PREVIEW = params.has('base');
const isCoarse = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
if (PERF_MODE) perfEl.classList.remove('hidden');

await RAPIER.init();
const physics = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
const groundBody = physics.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.2, 0));
physics.createCollider(RAPIER.ColliderDesc.cuboid(80, 0.2, 80), groundBody);
const playerBody = physics.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, 1.2, 50));
physics.createCollider(RAPIER.ColliderDesc.capsule(0.7, 0.32), playerBody);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x10091b);
scene.fog = new THREE.Fog(0x130a20, 82, 178);
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 220);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.62;
renderer.shadowMap.enabled = false;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

scene.add(new THREE.HemisphereLight(0x9d91c0, 0x221326, 1.8));
const key = new THREE.DirectionalLight(0xffddec, 2.4);
key.position.set(-28, 42, 24);
key.castShadow = false;
key.shadow.mapSize.set(768, 768);
key.shadow.camera.left = -62;
key.shadow.camera.right = 62;
key.shadow.camera.top = 62;
key.shadow.camera.bottom = -62;
key.shadow.bias = -0.0008;
scene.add(key);
const corrientesGlow = new THREE.PointLight(0xff2d9f, 28, 48, 1.7);
corrientesGlow.position.set(8, 7, 8);
scene.add(corrientesGlow);
const coolGlow = new THREE.PointLight(0x3ebfff, 18, 42, 1.8);
coolGlow.position.set(-34, 9, -20);
scene.add(coolGlow);

const C = {
  road: new THREE.MeshStandardMaterial({ color: 0x12131b, roughness: 0.96 }),
  sidewalk: new THREE.MeshStandardMaterial({ color: 0x57515f, roughness: 0.92 }),
  concrete: new THREE.MeshStandardMaterial({ color: 0x2a2733, roughness: 0.84 }),
  concrete2: new THREE.MeshStandardMaterial({ color: 0x3a2b3e, roughness: 0.82 }),
  black: new THREE.MeshStandardMaterial({ color: 0x08080d, roughness: 0.4, metalness: 0.35 }),
  yellow: new THREE.MeshStandardMaterial({ color: 0xffca18, roughness: 0.45 }),
  pink: new THREE.MeshStandardMaterial({ color: 0xff1c91, roughness: 0.36, emissive: 0x3f001d, emissiveIntensity: 0.7 }),
  fur: new THREE.MeshStandardMaterial({ color: 0xff55ae, roughness: 0.94 }),
  skin: new THREE.MeshStandardMaterial({ color: 0xd99a87, roughness: 0.68 }),
  skinHighlight: new THREE.MeshStandardMaterial({ color: 0xe8a6a0, roughness: 0.66 }),
  hair: new THREE.MeshStandardMaterial({ color: 0x050407, roughness: 0.28 }),
  white: new THREE.MeshStandardMaterial({ color: 0xf4edf2, roughness: 0.55 }),
  glass: new THREE.MeshStandardMaterial({ color: 0x203345, roughness: 0.16, metalness: 0.5 }),
};
const hot = (hex: number, power = 1.8) => new THREE.MeshStandardMaterial({ color: hex, emissive: hex, emissiveIntensity: power, roughness: 0.35 });
const flat = (hex: number, opacity = 1) => new THREE.MeshBasicMaterial({ color: hex, transparent: opacity < 1, opacity, toneMapped: false });

function meshBox(w: number, h: number, d: number, material: THREE.Material, x = 0, y = h / 2, z = 0, shadow = false) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = true;
  return m;
}
function glowSprite(color: number, scale: number, opacity = 0.22) {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }));
  sprite.scale.setScalar(scale);
  return sprite;
}
function labelTexture(text: string, bg: string, fg: string, accent: string, width = 1024, height = 256) {
  const c = document.createElement('canvas');
  c.width = width; c.height = height;
  const g = c.getContext('2d')!;
  g.fillStyle = bg; g.fillRect(0, 0, width, height);
  g.fillStyle = accent; g.fillRect(0, 0, 22, height);
  g.fillStyle = fg; g.font = `900 ${Math.floor(height * 0.43)}px Arial`;
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, width / 2, height * 0.52);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 2;
  return tex;
}
function label(text: string, w: number, h: number, bg = '#15101d', fg = '#fff', accent = '#ff2b9a') {
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: labelTexture(text, bg, fg, accent), toneMapped: false }));
}

const obstacles: Array<{ minX: number; maxX: number; minZ: number; maxZ: number }> = [];
function obstacle(x: number, z: number, w: number, d: number, pad = 0.6) {
  obstacles.push({ minX: x - w / 2 - pad, maxX: x + w / 2 + pad, minZ: z - d / 2 - pad, maxZ: z + d / 2 + pad });
}
function blocked(x: number, z: number) {
  if (Math.abs(x) > 67 || Math.abs(z) > 67) return true;
  return obstacles.some(o => x > o.minX && x < o.maxX && z > o.minZ && z < o.maxZ);
}

function instancedBoxes(geometry: THREE.BoxGeometry, material: THREE.Material, transforms: Array<{ p: THREE.Vector3; s?: THREE.Vector3; r?: number }>) {
  const inst = new THREE.InstancedMesh(geometry, material, transforms.length);
  const dummy = new THREE.Object3D();
  transforms.forEach((t, i) => {
    dummy.position.copy(t.p); dummy.scale.copy(t.s ?? new THREE.Vector3(1, 1, 1)); dummy.rotation.set(0, t.r ?? 0, 0); dummy.updateMatrix(); inst.setMatrixAt(i, dummy.matrix);
  });
  inst.instanceMatrix.needsUpdate = true;
  inst.receiveShadow = true;
  return inst;
}

function createTaxi() {
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
}

function createBus() {
  const g = new THREE.Group(); g.name = 'COLECTIVO_152';
  g.add(meshBox(4.7, 3.8, 10.4, new THREE.MeshStandardMaterial({ color: 0xd8d9cf, roughness: 0.72 }), 0, 1.9, 0));
  g.add(meshBox(4.75, 1.0, 10.45, new THREE.MeshStandardMaterial({ color: 0x1f6f9e, roughness: 0.58 }), 0, 1.15, 0));
  const route = label('152 · BOCA', 3.7, 0.72, '#101010', '#ffe45b', '#ffe45b'); route.position.set(0, 3.22, -5.23); g.add(route);
  return g;
}

function makeMoriaFaceTexture() {
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
}

function createNPC(kind: NPCKind, x: number, z: number): NPC {
  const root = new THREE.Group();
  const bodyColor = kind === 'paparazzi' ? 0x7a263f : kind === 'fan' ? 0x217a94 : 0x5c5964;
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 1.18, 4, 7), new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.75 })); body.position.y = 1.05; root.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 10, 7), C.skin); head.position.y = 2.05; root.add(head);
  if (kind === 'paparazzi') root.add(meshBox(0.4, 0.27, 0.23, C.black, 0, 1.72, -0.34));
  else if (kind === 'fan') { const phone = meshBox(0.14, 0.28, 0.035, new THREE.MeshStandardMaterial({ color: 0xd6d8e2, metalness: 0.5 }), 0.3, 1.78, -0.18); phone.rotation.z = -0.16; root.add(phone); }
  root.position.set(x, 0, z); scene.add(root);
  return { root, kind, state: 'WANDER', home: new THREE.Vector3(x, 0, z), target: new THREE.Vector3(x, 0, z), speed: kind === 'paparazzi' ? 4.2 : kind === 'fan' ? 3 : 1.7, timer: Math.random() * 2, knock: new THREE.Vector3() };
}

function buildBaires() {
  scene.add(meshBox(150, 0.08, 150, C.road, 0, -0.04, 0));
  scene.add(meshBox(142, 0.05, 19, new THREE.MeshStandardMaterial({ color: 0x0e0f16, roughness: 0.98 }), 0, 0.01, 6));
  scene.add(meshBox(19, 0.052, 136, new THREE.MeshStandardMaterial({ color: 0x101118, roughness: 0.98 }), -7, 0.012, 0));
  scene.add(meshBox(140, 0.07, 5, C.sidewalk, 0, 0.045, -6));
  scene.add(meshBox(140, 0.07, 5, C.sidewalk, 0, 0.045, 17));
  scene.add(meshBox(5, 0.07, 128, C.sidewalk, -18, 0.045, 0));
  scene.add(meshBox(5, 0.07, 128, C.sidewalk, 4, 0.045, 0));

  const stripeTransforms: Array<{ p: THREE.Vector3; s?: THREE.Vector3 }> = [];
  for (let x = -61; x <= 61; x += 10) stripeTransforms.push({ p: new THREE.Vector3(x, 0.07, 6) });
  for (let i = 0; i < 7; i++) stripeTransforms.push({ p: new THREE.Vector3(-14 + i * 2.1, 0.073, 6), s: new THREE.Vector3(0.22, 1, 42) });
  const lane = instancedBoxes(new THREE.BoxGeometry(5, 0.02, 0.18), flat(0xd7d0c2, 0.55), stripeTransforms); scene.add(lane);

  const buildingGeo = new THREE.BoxGeometry(1, 1, 1);
  const darkBuildings: Array<{ p: THREE.Vector3; s: THREE.Vector3 }> = [];
  const purpleBuildings: Array<{ p: THREE.Vector3; s: THREE.Vector3 }> = [];
  const warmWindows: Array<{ p: THREE.Vector3; s: THREE.Vector3 }> = [];
  const coolWindows: Array<{ p: THREE.Vector3; s: THREE.Vector3 }> = [];
  const blocks = [[-39, -29, 34, 34], [27, -29, 34, 34], [-39, 38, 34, 30], [27, 38, 34, 30]] as const;
  blocks.forEach(([cx, cz, w, d], bi) => {
    for (let i = 0; i < 3; i++) {
      const bw = w / 3 - 1.2; const bh = 17 + ((bi * 7 + i * 5) % 14); const bx = cx - w / 2 + bw / 2 + i * (bw + 1.2);
      const t = { p: new THREE.Vector3(bx, bh / 2, cz), s: new THREE.Vector3(bw, bh, d) };
      (bi % 2 ? purpleBuildings : darkBuildings).push(t); obstacle(bx, cz, bw, d, 0.35);
      for (let floor = 3.2; floor < bh - 2; floor += 4.1) {
        for (let wx = -bw / 2 + 1.5; wx < bw / 2 - 1; wx += 3.15) {
          const frontZ = cz + (cz < 0 ? d / 2 + 0.035 : -d / 2 - 0.035);
          const win = { p: new THREE.Vector3(bx + wx, floor, frontZ), s: new THREE.Vector3(1.15, 1.2, 0.045) };
          (((Math.round(floor) + i + bi) % 3) === 0 ? warmWindows : coolWindows).push(win);
        }
      }
    }
  });
  const b1 = instancedBoxes(buildingGeo, C.concrete, darkBuildings); b1.receiveShadow = true; scene.add(b1);
  const b2 = instancedBoxes(buildingGeo, C.concrete2, purpleBuildings); b2.receiveShadow = true; scene.add(b2);
  scene.add(instancedBoxes(buildingGeo, hot(0xffc873, 0.7), warmWindows));
  scene.add(instancedBoxes(buildingGeo, hot(0x6b8fc8, 0.55), coolWindows));

  const theatreData = [
    ['GRAN REX', -50, 20, 0xff3a9e], ['ÓPERA', -28, 20, 0x58d9ff], ['TEATRO', 21, 20, 0xffbd39], ['PASEO LA PLAZA', 44, 20, 0xff3e66]
  ] as const;
  theatreData.forEach(([name, x, z, color], i) => {
    const facade = meshBox(17, 9.5, 2.8, i % 2 ? C.concrete2 : C.concrete, x, 4.75, z); scene.add(facade);
    const s = label(name, 15, 2.0, '#160c1a', '#fff', `#${color.toString(16).padStart(6, '0')}`); s.position.set(x, 7.2, z - 1.42); scene.add(s);
    const glow = glowSprite(color, 12, 0.18); glow.position.set(x, 7, z - 2.2); scene.add(glow);
    const canopy = meshBox(15.5, 0.14, 2.4, hot(color, 1.3), x, 5.9, z - 2.0); scene.add(canopy);
  });

  const avenueBanner = label('AV. CORRIENTES · TEATROS', 18, 1.65, '#071c18', '#fff4d6', '#36e59f'); avenueBanner.position.set(-7, 8.1, 28); scene.add(avenueBanner);
  const rexNeon = label('GRAN REX', 10.5, 2.0, '#170719', '#fff', '#ff2e9e'); rexNeon.position.set(-25, 7.0, 30); scene.add(rexNeon);
  const operaNeon = label('ÓPERA', 8.5, 2.0, '#081923', '#fff', '#5ae4ff'); operaNeon.position.set(13, 7.0, 30); scene.add(operaNeon);
  const rexGlow = glowSprite(0xff2e9e, 11, .19); rexGlow.position.set(-25, 7, 29.4); scene.add(rexGlow);
  const operaGlow = glowSprite(0x5ae4ff, 10, .16); operaGlow.position.set(13, 7, 29.4); scene.add(operaGlow);

  for (const [x, z, rot] of [[-16, 15, 0], [3, -5, Math.PI], [3, 15, Math.PI]] as const) {
    scene.add(meshBox(0.16, 4, 0.16, C.black, x, 2, z));
    const s = label('AV. CORRIENTES', 6.1, 0.86, '#075f3a', '#fff', '#fff'); s.position.set(x, 3.78, z); s.rotation.y = rot; scene.add(s);
  }

  const ob = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 2.4, 36, 4), new THREE.MeshStandardMaterial({ color: 0xd2d0c8, roughness: 0.88 })); shaft.position.y = 18; ob.add(shaft);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(1.0, 5, 4), new THREE.MeshStandardMaterial({ color: 0xe0ddd6, roughness: 0.85 })); cap.position.y = 38.5; ob.add(cap);
  ob.position.set(-7, 0, -66); ob.rotation.y = Math.PI / 4; scene.add(ob);
  const obGlow = glowSprite(0xe6dcff, 21, 0.16); obGlow.position.set(-7, 23, -66); scene.add(obGlow);

  const kiosk = new THREE.Group(); kiosk.add(meshBox(8, 4.0, 5, new THREE.MeshStandardMaterial({ color: 0x1f4653, roughness: 0.75 }), 0, 2, 0));
  const ks = label('KIOSCO 24H', 7.2, 1.15, '#10252c', '#ffe973', '#ff2b9a'); ks.position.set(0, 3.02, -2.53); kiosk.add(ks); kiosk.position.set(10, 0, -11); scene.add(kiosk); obstacle(10, -11, 8, 5);

  const bus = createBus(); bus.position.set(-30, 0, 6); bus.rotation.y = Math.PI / 2; scene.add(bus);

  const club = new THREE.Group(); club.add(meshBox(12, 7, 2, new THREE.MeshStandardMaterial({ color: 0x19101f, roughness: 0.35, metalness: 0.3 }), 0, 3.5, 0));
  const clubSign = label('BOLICHE · VIP', 11, 1.65, '#160512', '#fff', '#ff1c91'); clubSign.position.set(0, 5.7, -1.03); club.add(clubSign); club.position.set(47, 0, -48); scene.add(club);
  const clubGlow = glowSprite(0xff1c91, 16, 0.22); clubGlow.position.set(47, 4.5, -50); scene.add(clubGlow);
  const destRing = new THREE.Mesh(new THREE.RingGeometry(3.0, 3.35, 48), new THREE.MeshBasicMaterial({ color: 0xff2da1, transparent: true, opacity: 0.9, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
  destRing.rotation.x = -Math.PI / 2; destRing.position.set(47, 0.12, -43); destRing.name = 'DESTINATION_RING'; scene.add(destRing);

  const spawn = label('SALIDA DE ARTISTAS · CORRIENTES', 13, 1.3, '#23112a', '#fff', '#ff2e9e'); spawn.position.set(0, 4.0, 59); scene.add(spawn);
  for (const [x, z] of [[-16, -5], [3, 15], [3, -5]] as const) {
    scene.add(meshBox(0.16, 4, 0.16, C.black, x, 2, z));
    scene.add(meshBox(0.7, 1.8, 0.55, C.black, x, 4.25, z));
    const r = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), hot(0xff1d45, 1.8)); r.position.set(x, 4.7, z - 0.29); scene.add(r);
    const gr = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), hot(0x46ff93, 1.2)); gr.position.set(x, 3.92, z - 0.29); scene.add(gr);
  }
}

const playerPos = new THREE.Vector3(0, 0, 50);
buildBaires();
const moria = createMoria(); scene.add(moria);
let basePreview: THREE.Group | null = null;
let baseReady = false;
if (BASE_PREVIEW) {
  const previewLoader = new GLTFLoader();
  previewLoader.setMeshoptDecoder(MeshoptDecoder);
  previewLoader.load('/assets/moria-base.glb', gltf => {
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
const taxi = createTaxi(); taxi.position.set(16, 0, 6); taxi.rotation.y = Math.PI / 2; scene.add(taxi);
const npcs: NPC[] = [
  createNPC('paparazzi', -10, 34), createNPC('paparazzi', -2, 7), createNPC('paparazzi', 31, -25),
  createNPC('fan', -28, 10), createNPC('fan', 8, -22),
  createNPC('neutral', 15, 10),
];

const destination = new THREE.Vector3(47, 0, -43);
let started = false;
let ended = false;
let resultState: '' | 'win' | 'fail' = '';
let entity = 0;
let qTimer = 0;
let qUses = 0;
let qAffected = 0;
let vehicleMode = false;
let vehicleSpeed = 0;
let vehicleHeading = Math.PI / 2;
let cameraYaw = 0;
let cameraPitch = 0.28;
let cameraDistance = 8.2;
let playerYaw = 0;
let audioCtx: AudioContext | null = null;
let fovKick = 0;
let shake = 0;
const shocks: Shockwave[] = [];
const keys = new Set<string>();
const joy: Vec2 = { x: 0, y: 0 };
let touchRun = false;
let lookPointer = -1;
let lookLast: Vec2 = { x: 0, y: 0 };
let dragging = false;
let mouseLast: Vec2 = { x: 0, y: 0 };
let lastTime = performance.now();
let elapsed = 0;
let resolutionScale = isCoarse ? 0.68 : 0.74;
const fpsSamples: number[] = [];
let fpsAvg = 60;
let fpsMedian = 60;
let fpsP5 = 60;
let qualityClock = 0;

function updateRendererSize() {
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
document.addEventListener('visibilitychange', () => {
  keys.clear(); joy.x = 0; joy.y = 0; touchRun = false; stickKnob.style.transform = 'translate(0px,0px)'; lastTime = performance.now();
});

function unlockAudio() {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === 'suspended') void audioCtx.resume();
}
function qSound() {
  if (!audioCtx) return;
  const ctx = audioCtx; const duration = 0.28;
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate); const d = buffer.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = ctx.createBufferSource(); src.buffer = buffer;
  const filter = ctx.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.setValueAtTime(520, ctx.currentTime); filter.frequency.exponentialRampToValueAtTime(130, ctx.currentTime + duration);
  const gain = ctx.createGain(); gain.gain.setValueAtTime(0.12, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  src.connect(filter).connect(gain).connect(ctx.destination); src.start();
}
function updateHud() {
  entity = THREE.MathUtils.clamp(entity, 0, 100);
  entityValue.textContent = String(Math.round(entity)); entityFill.style.width = `${entity}%`;
  qBtn.classList.toggle('cooldown', qTimer > 0);
  qCooldown.textContent = qTimer > 0 ? `${qTimer.toFixed(1)}s` : '¿QUIÉNES SON?';
}
function worldPos() { return vehicleMode ? taxi.position : playerPos; }
function resetGame() {
  entity = 0; qTimer = 0; qUses = 0; qAffected = 0; ended = false; resultState = '';
  vehicleMode = false; vehicleSpeed = 0; vehicleHeading = Math.PI / 2; taxi.position.set(16, 0, 6); taxi.rotation.y = vehicleHeading;
  playerPos.set(0, 0, 50); playerBody.setNextKinematicTranslation({ x: 0, y: 1.2, z: 50 }); moria.visible = !BASE_PREVIEW; moria.position.copy(playerPos); moria.rotation.y = 0; if (basePreview) { basePreview.position.x = playerPos.x; basePreview.position.z = playerPos.z; basePreview.rotation.y = 0; }
  cameraYaw = 0; cameraPitch = 0.28; cameraDistance = 8.2;
  npcs.forEach((n, i) => { n.root.position.copy(n.home); n.state = 'WANDER'; n.timer = 0.5 + i * 0.1; n.knock.set(0, 0, 0); });
  objective.textContent = 'SALÍ POR CORRIENTES · EVITÁ A LOS PAPARAZZI'; updateHud();
}
function startGame() {
  unlockAudio(); started = true; intro.classList.add('hidden'); result.classList.add('hidden'); hud.classList.remove('hidden'); if (isCoarse) touch.classList.remove('hidden'); resetGame();
}
function finish(kind: 'win' | 'fail') {
  if (ended) return; ended = true; resultState = kind; keys.clear(); touch.classList.add('hidden'); result.classList.remove('hidden'); result.classList.toggle('fail', kind === 'fail');
  if (kind === 'win') { resultKicker.textContent = 'MISIÓN CUMPLIDA'; resultTitle.textContent = 'MISSION PASSED'; resultScore.innerHTML = `GLAMOUR +500<br/>ENTIDAD +${Math.round(entity)}`; }
  else { resultKicker.textContent = 'ENTIDAD 100'; resultTitle.textContent = 'LES DISTE ENTIDAD'; resultScore.innerHTML = 'GLAMOUR +0<br/>RESPIRÁ · VOLVÉ A INTENTAR'; }
}
startBtn.addEventListener('click', startGame); restartBtn.addEventListener('click', startGame);

function triggerQ() {
  if (!started || ended || qTimer > 0) return false;
  qTimer = 5.5; qUses++; qSound(); fovKick = 7; shake = 0.28;
  specialText.classList.add('on'); flash.classList.add('on'); setTimeout(() => specialText.classList.remove('on'), 420); setTimeout(() => flash.classList.remove('on'), 150);
  const p = worldPos();
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.8, 1.08, 44), new THREE.MeshBasicMaterial({ color: 0xff35a4, transparent: true, opacity: 0.9, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.set(p.x, 0.16, p.z); scene.add(ring); shocks.push({ mesh: ring, age: 0 });
  let affected = 0;
  npcs.forEach(n => { const delta = n.root.position.clone().sub(p); const dist = delta.length(); if (dist < 12) { affected++; n.state = 'STAGGER'; n.timer = 1.0; n.knock.copy(delta.normalize().multiplyScalar(7.5 * (1 - dist / 15))); } });
  qAffected += affected; entity = Math.max(0, entity - 17 - Math.min(affected * 2, 9)); updateHud(); return true;
}
qBtn.addEventListener('pointerdown', e => { e.preventDefault(); triggerQ(); });

function tryVehicle() {
  if (!started || ended) return;
  if (vehicleMode) {
    vehicleMode = false; moria.visible = true; playerPos.copy(taxi.position).add(new THREE.Vector3(3, 0, 0)); if (blocked(playerPos.x, playerPos.z)) playerPos.copy(taxi.position).add(new THREE.Vector3(-3, 0, 0));
    playerBody.setNextKinematicTranslation({ x: playerPos.x, y: 1.2, z: playerPos.z }); cameraDistance = 8.2; actionBtn.textContent = 'ENTRAR'; return;
  }
  if (taxi.position.distanceTo(playerPos) < 5) { vehicleMode = true; moria.visible = false; vehicleHeading = taxi.rotation.y; cameraYaw = vehicleHeading + Math.PI; cameraPitch = 0.22; cameraDistance = 11.2; actionBtn.textContent = 'SALIR'; objective.textContent = 'TAXI TOMADO · LLEGÁ AL BOLICHE'; }
}
actionBtn.addEventListener('pointerdown', e => { e.preventDefault(); tryVehicle(); });

addEventListener('keydown', e => { const k = e.key.toLowerCase(); keys.add(k); if (k === 'q') triggerQ(); if (k === 'e' || k === 'f') tryVehicle(); });
addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
canvas.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') { dragging = true; mouseLast = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); } });
canvas.addEventListener('pointermove', e => { if (dragging && e.pointerType === 'mouse') { cameraYaw -= (e.clientX - mouseLast.x) * 0.004; cameraPitch = THREE.MathUtils.clamp(cameraPitch + (e.clientY - mouseLast.y) * 0.003, 0.08, 0.62); mouseLast = { x: e.clientX, y: e.clientY }; } });
canvas.addEventListener('pointerup', () => { dragging = false; });

function updateStick(e: PointerEvent) {
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
runBtn.addEventListener('pointerdown', e => { e.preventDefault(); touchRun = true; runBtn.setPointerCapture(e.pointerId); });
runBtn.addEventListener('pointerup', () => { touchRun = false; }); runBtn.addEventListener('pointercancel', () => { touchRun = false; });

function input() {
  let x = joy.x; let z = joy.y;
  if (keys.has('a')) x -= 1; if (keys.has('d')) x += 1; if (keys.has('w')) z -= 1; if (keys.has('s')) z += 1;
  const len = Math.hypot(x, z); if (len > 1) { x /= len; z /= len; } return { x, z };
}
function resolvePosition(current: THREE.Vector3, nx: number, nz: number) {
  const out = current.clone(); if (!blocked(nx, current.z)) out.x = nx; if (!blocked(out.x, nz)) out.z = nz; return out;
}
function updatePlayer(dt: number) {
  const i = input();
  if (vehicleMode) {
    const throttle = -i.z; const steer = i.x; vehicleSpeed += throttle * 15 * dt; vehicleSpeed *= Math.pow(0.965, dt * 60); vehicleSpeed = THREE.MathUtils.clamp(vehicleSpeed, -7, 17);
    vehicleHeading -= steer * (0.78 + Math.abs(vehicleSpeed) * 0.05) * dt * (vehicleSpeed >= 0 ? 1 : -1);
    const nx = taxi.position.x + Math.sin(vehicleHeading) * vehicleSpeed * dt; const nz = taxi.position.z + Math.cos(vehicleHeading) * vehicleSpeed * dt;
    if (!blocked(nx, nz)) { taxi.position.x = nx; taxi.position.z = nz; } else vehicleSpeed *= -0.15; taxi.rotation.y = vehicleHeading; return;
  }
  const mag = Math.hypot(i.x, i.z); if (mag < 0.04) return;
  const sprint = keys.has('shift') || touchRun; const speed = sprint ? 8.3 : 5.2;
  const forward = new THREE.Vector3(Math.sin(cameraYaw), 0, -Math.cos(cameraYaw)); const right = new THREE.Vector3(Math.cos(cameraYaw), 0, Math.sin(cameraYaw));
  const dir = right.multiplyScalar(i.x).add(forward.multiplyScalar(-i.z)).normalize();
  const next = resolvePosition(playerPos, playerPos.x + dir.x * speed * dt, playerPos.z + dir.z * speed * dt); playerPos.copy(next);
  playerYaw = Math.atan2(-dir.x, -dir.z); moria.rotation.y = playerYaw; playerBody.setNextKinematicTranslation({ x: playerPos.x, y: 1.2, z: playerPos.z });
}
function chooseTarget(n: NPC) { n.target.copy(n.home).add(new THREE.Vector3((Math.random() - 0.5) * 10, 0, (Math.random() - 0.5) * 10)); n.timer = 1.7 + Math.random() * 2.2; }
function updateNPCs(dt: number) {
  const p = worldPos();
  for (const n of npcs) {
    const pos = n.root.position; const dist = pos.distanceTo(p); n.timer -= dt;
    if (n.state === 'STAGGER') { pos.addScaledVector(n.knock, dt); n.knock.multiplyScalar(Math.pow(0.86, dt * 60)); if (n.timer <= 0) { n.state = 'FLEE'; n.timer = 1.8; } continue; }
    if (n.state === 'FLEE') { const away = pos.clone().sub(p).setY(0); if (away.lengthSq() > 0.001) pos.addScaledVector(away.normalize(), n.speed * 1.35 * dt); if (n.timer <= 0) { n.state = 'WANDER'; chooseTarget(n); } continue; }
    if (n.kind === 'paparazzi') {
      if (dist < 15 && n.state === 'WANDER') n.state = 'CHASE';
      if (n.state === 'CHASE') { const d = p.clone().sub(pos).setY(0); if (d.length() > 1.8) { d.normalize(); pos.addScaledVector(d, n.speed * dt); n.root.rotation.y = Math.atan2(d.x, d.z); } else { n.state = 'PHOTO'; n.timer = 0.7; } }
      else if (n.state === 'PHOTO') { entity += dt * 14; if (n.timer <= 0) n.state = 'CHASE'; }
      if (dist < 1.1) entity += dt * 22;
    } else if (n.kind === 'fan') {
      if (dist < 8.5) { const d = p.clone().sub(pos).setY(0); if (d.length() > 2.1) pos.addScaledVector(d.normalize(), n.speed * dt); else entity += dt * 3; }
      else if (n.timer <= 0) chooseTarget(n);
    } else {
      if (n.timer <= 0) chooseTarget(n); const d = n.target.clone().sub(pos).setY(0); if (d.length() > 0.3) { d.normalize(); pos.addScaledVector(d, n.speed * dt); n.root.rotation.y = Math.atan2(d.x, d.z); }
    }
  }
  if (entity >= 100) finish('fail'); updateHud();
}
function updateQ(dt: number) {
  qTimer = Math.max(0, qTimer - dt); fovKick *= Math.pow(0.8, dt * 60); shake *= Math.pow(0.82, dt * 60);
  for (let i = shocks.length - 1; i >= 0; i--) { const s = shocks[i]; s.age += dt; const k = 1 + s.age * 11; s.mesh.scale.setScalar(k); s.mesh.material.opacity = Math.max(0, 1 - s.age / 0.9); if (s.age > 0.9) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); shocks.splice(i, 1); } }
}
function updateMission() {
  if (!started || ended) return; const p = worldPos(); if (p.distanceTo(destination) < 6.5) finish('win');
  const nearTaxi = !vehicleMode && taxi.position.distanceTo(playerPos) < 5; vehicleHint.classList.toggle('hidden', !nearTaxi); actionBtn.classList.toggle('hidden', !(nearTaxi || vehicleMode)); actionBtn.textContent = vehicleMode ? 'SALIR' : 'ENTRAR';
}
function updateCamera(dt: number) {
  const p = worldPos(); const target = new THREE.Vector3(p.x, vehicleMode ? 2.0 : 3.0, p.z);
  const cp = Math.cos(cameraPitch); const forward = new THREE.Vector3(Math.sin(cameraYaw) * cp, -Math.sin(cameraPitch), -Math.cos(cameraYaw) * cp);
  const desired = target.clone().addScaledVector(forward, -cameraDistance); desired.y += 0.55;
  if (shake > 0.004) { desired.x += (Math.random() - 0.5) * shake; desired.y += (Math.random() - 0.5) * shake; desired.z += (Math.random() - 0.5) * shake; }
  camera.position.lerp(desired, 1 - Math.pow(0.002, dt)); camera.lookAt(target); camera.fov = 55 + fovKick; camera.updateProjectionMatrix();
}
function updateQuality(dt: number) {
  const fps = 1 / Math.max(0.001, dt); fpsSamples.push(fps); if (fpsSamples.length > 480) fpsSamples.shift(); qualityClock += dt;
  if (qualityClock < 3.5) return; qualityClock = 0;
  const sorted = [...fpsSamples].sort((a, b) => a - b); fpsAvg = fpsSamples.reduce((a, b) => a + b, 0) / Math.max(1, fpsSamples.length); fpsMedian = sorted[Math.floor(sorted.length * 0.5)] ?? fpsAvg; fpsP5 = sorted[Math.floor(sorted.length * 0.05)] ?? fpsAvg;
  if (fpsAvg < 50 && resolutionScale > 0.56) { resolutionScale = Math.max(0.56, resolutionScale - 0.07); updateRendererSize(); }
  else if (fpsAvg > 59 && fpsP5 > 47 && resolutionScale < 0.92) { resolutionScale = Math.min(0.92, resolutionScale + 0.04); updateRendererSize(); }
  if (PERF_MODE) perfEl.textContent = `FPS avg ${fpsAvg.toFixed(1)} · med ${fpsMedian.toFixed(1)} · p5 ${fpsP5.toFixed(1)}\nquality ${resolutionScale.toFixed(2)} · DPR ${(Math.min(devicePixelRatio, 1.5) * resolutionScale).toFixed(2)}\ndraw ${renderer.info.render.calls} · tris ${renderer.info.render.triangles}`;
}

function frame(now: number) {
  requestAnimationFrame(frame); const rawDt = Math.max(0, (now - lastTime) / 1000); const dt = Math.min(0.033, rawDt); lastTime = now; elapsed += dt;
  if (started && !ended && !document.hidden) { updatePlayer(dt); physics.step(); updateNPCs(dt); updateMission(); }
  updateQ(dt); updateCamera(dt || 0.016); updateQuality(rawDt || 0.016);
  moria.position.set(playerPos.x, Math.sin(elapsed * 8.5) * (started && !vehicleMode ? 0.025 : 0), playerPos.z); if (basePreview) { basePreview.position.x = playerPos.x; basePreview.position.z = playerPos.z; basePreview.rotation.y = playerYaw; basePreview.visible = !vehicleMode; }
  const ring = scene.getObjectByName('DESTINATION_RING'); if (ring) ring.rotation.z = elapsed * 0.42;
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);

window.__QS_TEST__ = {
  start: startGame,
  state: () => ({ started, ended, result: resultState, entity, qTimer, qUses, qAffected, vehicleMode, x: worldPos().x, z: worldPos().z, fpsAvg, fpsMedian, fpsP5, quality: resolutionScale, drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles, baseReady }),
  teleport: (x, z) => { if (vehicleMode) taxi.position.set(x, 0, z); else { playerPos.set(x, 0, z); moria.position.copy(playerPos); playerBody.setNextKinematicTranslation({ x, y: 1.2, z }); } },
  nearTaxi: () => { vehicleMode = false; moria.visible = true; playerPos.set(taxi.position.x + 2.4, 0, taxi.position.z); moria.position.copy(playerPos); },
  destination: () => { if (vehicleMode) taxi.position.set(destination.x, 0, destination.z); else { playerPos.copy(destination); moria.position.copy(playerPos); } },
  entity: v => { entity = v; updateHud(); if (entity >= 100) finish('fail'); },
  q: triggerQ,
  vehicle: tryVehicle,
  cameraClose: () => { cameraDistance = 4.8; cameraPitch = 0.2; },
};
