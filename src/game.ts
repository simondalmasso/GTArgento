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
scene.background = new THREE.Color(0x170d2a);
scene.fog = null;
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 220);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', precision: 'lowp', stencil: false });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
renderer.toneMappingExposure = 1;
renderer.shadowMap.enabled = false;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const gl = renderer.getContext();
const debugRendererInfo = gl.getExtension('WEBGL_debug_renderer_info');
const gpuVendor = String(gl.getParameter(debugRendererInfo ? debugRendererInfo.UNMASKED_VENDOR_WEBGL : gl.VENDOR));
const gpuRenderer = String(gl.getParameter(debugRendererInfo ? debugRendererInfo.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
console.info('QS_WEBGL_RENDERER', JSON.stringify({ gpuVendor, gpuRenderer }));



const key = new THREE.DirectionalLight(0xffddec, 2.4);
key.position.set(-28, 42, 24);
key.castShadow = false;
key.shadow.mapSize.set(768, 768);
key.shadow.camera.left = -62;
key.shadow.camera.right = 62;
key.shadow.camera.top = 62;
key.shadow.camera.bottom = -62;
key.shadow.bias = -0.0008;

const corrientesGlow = new THREE.PointLight(0xff2d9f, 28, 48, 1.7);
corrientesGlow.position.set(8, 7, 8);

const coolGlow = new THREE.PointLight(0x3ebfff, 18, 42, 1.8);
coolGlow.position.set(-34, 9, -20);


const C = {
  road: cheapMat({ color: 0x12131b, roughness: 0.96 }),
  sidewalk: cheapMat({ color: 0x57515f, roughness: 0.92 }),
  concrete: cheapMat({ color: 0x2a2733, roughness: 0.84 }),
  concrete2: cheapMat({ color: 0x3a2b3e, roughness: 0.82 }),
  black: cheapMat({ color: 0x08080d, roughness: 0.4, metalness: 0.35 }),
  yellow: cheapMat({ color: 0xffca18, roughness: 0.45 }),
  pink: cheapMat({ color: 0xff1c91, roughness: 0.36, emissive: 0x3f001d, emissiveIntensity: 0.7 }),
  fur: cheapMat({ color: 0xff55ae, roughness: 0.94 }),
  skin: cheapMat({ color: 0xd99a87, roughness: 0.68 }),
  skinHighlight: cheapMat({ color: 0xe8a6a0, roughness: 0.66 }),
  hair: cheapMat({ color: 0x050407, roughness: 0.28 }),
  white: cheapMat({ color: 0xf4edf2, roughness: 0.55 }),
  glass: cheapMat({ color: 0x203345, roughness: 0.16, metalness: 0.5 }),
};
const hot = (hex: number, power = 1.8) => cheapMat({ color: hex, emissive: hex, emissiveIntensity: power, roughness: 0.35 });
const flat = (hex: number, opacity = 1) => new THREE.MeshBasicMaterial({ color: hex, transparent: opacity < 1, opacity, toneMapped: false });
function cheapMat(p: Record<string, unknown> = {}) {
  const color = typeof p.color === 'number' ? p.color : 0xffffff;
  return new THREE.MeshBasicMaterial({
    color,
    map: p.map as THREE.Texture | null | undefined,
    transparent: Boolean(p.transparent),
    opacity: typeof p.opacity === 'number' ? p.opacity : 1,
    side: p.side as THREE.Side | undefined,
    depthWrite: p.depthWrite !== false,
    blending: p.blending as THREE.Blending | undefined,
    toneMapped: false,
  });
}

function meshBox(w: number, h: number, d: number, material: THREE.Material, x = 0, y = h / 2, z = 0, shadow = false) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = true;
  return m;
}
function glowSprite(color: number, scale: number, opacity = 0.22) {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }));
  sprite.scale.setScalar(scale * 0.46);
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
  const bumper = meshBox(4.0, 0.16, 0.25, cheapMat({ color: 0xc8c8c8, metalness: 0.72, roughness: 0.3 }), 0, 0.55, -3.82); g.add(bumper);
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
  g.add(meshBox(4.7, 3.8, 10.4, cheapMat({ color: 0xd8d9cf, roughness: 0.72 }), 0, 1.9, 0));
  g.add(meshBox(4.75, 1.0, 10.45, cheapMat({ color: 0x1f6f9e, roughness: 0.58 }), 0, 1.15, 0));
  const route = label('152 · BOCA', 3.7, 0.72, '#101010', '#ffe45b', '#ffe45b'); route.position.set(0, 3.22, -5.23); g.add(route);
  return g;
}

function makeMoriaFaceTexture() {
  const c=document.createElement('canvas'); c.width=1024; c.height=1024; const g=c.getContext('2d')!;
  const skin=g.createRadialGradient(512,430,90,512,500,590); skin.addColorStop(0,'#efb5a5');skin.addColorStop(.58,'#d99a8d');skin.addColorStop(1,'#aa6668');g.fillStyle=skin;g.fillRect(0,0,1024,1024);

  // Mature oval contour / high cheekbones.
  const side=g.createLinearGradient(0,0,1024,0);side.addColorStop(0,'rgba(71,20,41,.32)');side.addColorStop(.18,'rgba(110,48,60,.08)');side.addColorStop(.5,'rgba(255,226,209,.10)');side.addColorStop(.82,'rgba(110,48,60,.08)');side.addColorStop(1,'rgba(71,20,41,.32)');g.fillStyle=side;g.fillRect(0,0,1024,1024);
  for(const [cx,rot] of [[330,-.16],[694,.16]] as const){g.fillStyle='rgba(122,38,65,.16)';g.beginPath();g.ellipse(cx,575,118,57,rot,0,Math.PI*2);g.fill();g.fillStyle='rgba(255,211,196,.27)';g.beginPath();g.ellipse(cx,557,78,29,rot,0,Math.PI*2);g.fill();}

  const eye=(cx:number,sideSign:number)=>{
    const smoke=g.createRadialGradient(cx,405,10,cx,405,105);smoke.addColorStop(0,'rgba(34,13,31,.78)');smoke.addColorStop(.55,'rgba(79,22,66,.44)');smoke.addColorStop(1,'rgba(89,20,69,0)');g.fillStyle=smoke;g.beginPath();g.ellipse(cx,408,113,49,0,0,Math.PI*2);g.fill();
    g.fillStyle='#fff3ef';g.beginPath();g.moveTo(cx-66,420);g.quadraticCurveTo(cx,384,cx+69,418);g.quadraticCurveTo(cx,444,cx-66,420);g.fill();
    g.fillStyle='#6a4330';g.beginPath();g.ellipse(cx,417,18,20,0,0,Math.PI*2);g.fill();g.fillStyle='#100b0d';g.beginPath();g.arc(cx,417,10,0,Math.PI*2);g.fill();g.fillStyle='rgba(255,255,255,.9)';g.beginPath();g.arc(cx-5,410,4,0,Math.PI*2);g.fill();
    g.strokeStyle='#160914';g.lineWidth=13;g.lineCap='round';g.beginPath();g.moveTo(cx-70,419);g.quadraticCurveTo(cx,379,cx+75,416);g.stroke();g.lineWidth=7;g.beginPath();g.moveTo(cx+sideSign*57,402);g.lineTo(cx+sideSign*100,386);g.stroke();
    g.lineWidth=4;for(let i=-2;i<=2;i++){const x=cx+i*22;g.beginPath();g.moveTo(x,388);g.lineTo(x+i*2,369-Math.abs(i)*2);g.stroke();}
  };
  eye(348,-1);eye(676,1);

  // High arched dark brows.
  g.strokeStyle='#34131f';g.lineWidth=19;g.lineCap='round';g.beginPath();g.moveTo(270,326);g.quadraticCurveTo(350,270,435,317);g.stroke();g.beginPath();g.moveTo(589,317);g.quadraticCurveTo(674,270,754,326);g.stroke();

  // Long narrow nose: side shadows, central highlight, defined nostrils.
  const noseShade=g.createLinearGradient(430,0,594,0);noseShade.addColorStop(0,'rgba(104,43,53,.28)');noseShade.addColorStop(.35,'rgba(151,77,72,.07)');noseShade.addColorStop(.5,'rgba(255,224,207,.32)');noseShade.addColorStop(.65,'rgba(151,77,72,.07)');noseShade.addColorStop(1,'rgba(104,43,53,.28)');g.fillStyle=noseShade;g.beginPath();g.moveTo(464,448);g.quadraticCurveTo(452,620,488,678);g.quadraticCurveTo(512,700,536,678);g.quadraticCurveTo(572,620,560,448);g.closePath();g.fill();
  g.fillStyle='rgba(75,31,39,.48)';g.beginPath();g.ellipse(481,681,15,7,-.15,0,Math.PI*2);g.fill();g.beginPath();g.ellipse(543,681,15,7,.15,0,Math.PI*2);g.fill();

  // Wide glamorous mouth / pronounced cupid's bow.
  g.fillStyle='#9d004e';g.beginPath();g.moveTo(365,758);g.quadraticCurveTo(438,706,512,742);g.quadraticCurveTo(586,706,659,758);g.quadraticCurveTo(586,790,512,783);g.quadraticCurveTo(438,790,365,758);g.fill();
  g.fillStyle='#ef438e';g.beginPath();g.moveTo(378,766);g.quadraticCurveTo(448,748,512,770);g.quadraticCurveTo(576,748,646,766);g.quadraticCurveTo(578,831,512,825);g.quadraticCurveTo(446,831,378,766);g.fill();
  g.strokeStyle='rgba(68,21,36,.46)';g.lineWidth=5;g.beginPath();g.moveTo(390,764);g.quadraticCurveTo(512,784,634,764);g.stroke();

  // Smile lines, forehead/nose highlight, beauty mark.
  g.strokeStyle='rgba(116,55,62,.18)';g.lineWidth=7;g.beginPath();g.moveTo(405,660);g.quadraticCurveTo(382,712,397,744);g.stroke();g.beginPath();g.moveTo(619,660);g.quadraticCurveTo(642,712,627,744);g.stroke();
  g.fillStyle='rgba(255,235,218,.24)';g.beginPath();g.ellipse(512,285,42,94,0,0,Math.PI*2);g.fill();
  g.fillStyle='#28101b';g.beginPath();g.arc(685,724,7,0,Math.PI*2);g.fill();

  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.wrapS=THREE.ClampToEdgeWrapping;tex.wrapT=THREE.ClampToEdgeWrapping;tex.anisotropy=2;return tex;
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
  const faceMaterial = cheapMat({ map: makeMoriaFaceTexture(), color: 0xffffff, roughness: 0.6 });
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
  const root = new THREE.Group(); root.position.set(x,0,z);
  return { root, kind, state:'WANDER', home:new THREE.Vector3(x,0,z), target:new THREE.Vector3(x,0,z), speed:kind==='paparazzi'?4.2:kind==='fan'?3:1.7, timer:Math.random()*2, knock:new THREE.Vector3() };
}

function makeFacadeTexture(base: string, lit: string, accent: string, shop: string) {
  const c=document.createElement('canvas'); c.width=512; c.height=1024; const g=c.getContext('2d')!;
  const grad=g.createLinearGradient(0,0,0,1024); grad.addColorStop(0,base); grad.addColorStop(1,'#15101d'); g.fillStyle=grad; g.fillRect(0,0,512,1024);
  g.fillStyle='rgba(255,255,255,.08)'; for(let y=135;y<760;y+=155) g.fillRect(0,y,512,8);
  for(let floor=0;floor<4;floor++) for(let col=0;col<5;col++) {
    const x=32+col*96,y=110+floor*155; g.fillStyle=((floor+col)%3===0)?lit:'#26344f'; g.fillRect(x,y,54,76);
    g.fillStyle='rgba(255,255,255,.15)'; g.fillRect(x+4,y+5,4,65); g.fillRect(x+28,y+5,3,65);
    g.fillStyle='#211723'; g.fillRect(x-7,y+82,68,7);
  }
  g.fillStyle='#09070c'; g.fillRect(0,760,512,264); g.fillStyle=accent; g.fillRect(0,760,512,14);
  g.fillStyle='#f5ebdf'; g.font='900 38px Arial'; g.textAlign='center'; g.fillText(shop,256,830);
  for(let i=0;i<4;i++){ g.fillStyle=i%2?accent:'#1f3140'; g.fillRect(24+i*124,870,98,120); }
  const tex=new THREE.CanvasTexture(c); tex.colorSpace=THREE.SRGBColorSpace; tex.minFilter=THREE.LinearFilter; tex.magFilter=THREE.LinearFilter; return tex;
}
function facadePlane(w:number,h:number,x:number,z:number,front:number,tex:THREE.Texture){
  const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:tex,toneMapped:false}));
  m.position.set(x,h/2,z+front*.03); if(front>0) m.rotation.y=Math.PI; return m;
}
function facadeSidePlane(d:number,h:number,x:number,z:number,tex:THREE.Texture){
  const m=new THREE.Mesh(new THREE.PlaneGeometry(d,h),new THREE.MeshBasicMaterial({map:tex,toneMapped:false,side:THREE.FrontSide}));
  m.position.set(x,h/2,z); m.rotation.y=x < 0 ? Math.PI/2 : -Math.PI/2; return m;
}
function makeNightSky(){
  const c=document.createElement('canvas');c.width=32;c.height=512;const g=c.getContext('2d')!;
  const q=g.createLinearGradient(0,0,0,512);q.addColorStop(0,'#090313');q.addColorStop(.48,'#160b2b');q.addColorStop(.82,'#34203f');q.addColorStop(1,'#7a3a55');g.fillStyle=q;g.fillRect(0,0,32,512);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}

function buildBaires() {
  const sky=new THREE.Mesh(new THREE.SphereGeometry(165,24,14),new THREE.MeshBasicMaterial({map:makeNightSky(),side:THREE.BackSide,toneMapped:false})); sky.position.y=18; scene.add(sky);
  scene.add(meshBox(150, 0.08, 150, C.road, 0, -0.04, 0));
  scene.add(meshBox(142, 0.05, 19, cheapMat({ color: 0x0e0f16, roughness: 0.98 }), 0, 0.01, 6));
  scene.add(meshBox(19, 0.052, 136, cheapMat({ color: 0x101118, roughness: 0.98 }), -7, 0.012, 0));
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

  // Detailed porteño street wall skins: balconies/windows/shops make the block read as a finished place, not gray boxes.
  const facadeSpecs = [
    [-39,-11.97,34,22,-1,makeFacadeTexture('#3e3346','#ffc56b','#ff2b96','PIZZERÍA GUERRÍN')],
    [27,-11.97,34,22,-1,makeFacadeTexture('#28384b','#89b8ff','#5ee5ff','LIBRERÍA CORRIENTES')],
    [-39,22.97,34,22,1,makeFacadeTexture('#49313f','#ffcf78','#ff477e','REVISTAS · KIOSCO')],
    [27,22.97,34,22,1,makeFacadeTexture('#333047','#8fb7ff','#ffca48','CAFÉ · TEATRO')],
  ] as const;
  facadeSpecs.forEach(([x,z,w,h,f,tex])=>scene.add(facadePlane(w,h,x,z,f,tex)));

  const sideFacades = [
    [-21.96,38,30,20,makeFacadeTexture('#3a2d43','#ffc970','#ff2697','TEATROS · CORRIENTES')],
    [9.96,38,30,20,makeFacadeTexture('#29374b','#8fc3ff','#42dcff','LIBROS · CAFÉ')],
    [-21.96,-29,34,22,makeFacadeTexture('#4b303b','#ffd28b','#ff4f73','PIZZERÍA · BAR')],
    [9.96,-29,34,22,makeFacadeTexture('#302d45','#9bbcff','#ffc93f','REVISTAS · 24H')],
  ] as const;
  sideFacades.forEach(([x,z,d,h,tex])=>scene.add(facadeSidePlane(d,h,x,z,tex)));

  // Side-facing neon/shop blades along the route.
  const blades=[
    ['GRAN REX',-21.6,45,'#ff2496'],['ÓPERA',9.6,34,'#50ddff'],['PIZZA',-21.6,27,'#ffd04c'],['LIBROS',9.6,48,'#79b9ff'],
    ['CAFÉ',-21.6,-18,'#ff9c63'],['KIOSCO',9.6,-38,'#5ee59c']
  ] as const;
  blades.forEach(([txt,x,z,a],i)=>{const b=label(txt,4.8,.82,'#100b15','#fff7df',a);b.position.set(x,4.4+(i%2)*1.2,z);b.rotation.y=x < 0 ? Math.PI/2 : -Math.PI/2;scene.add(b)});

  // Warm sodium pools and sidewalk edging evoke Corrientes without expensive real lights.
  const poolGeo=new THREE.CircleGeometry(3.8,24); const pools=new THREE.InstancedMesh(poolGeo,flat(0xf3bd72,.095),10); const pd=new THREE.Object3D();
  [-52,-40,-28,-16,-4,8,20,32,44,56].forEach((x,i)=>{pd.position.set(x,.055,14.8);pd.rotation.set(-Math.PI/2,0,0);pd.scale.set(1.6,1,1);pd.updateMatrix();pools.setMatrixAt(i,pd.matrix)}); pools.instanceMatrix.needsUpdate=true; scene.add(pools);

  const curb:Array<{p:THREE.Vector3;s:THREE.Vector3}>=[];
  for(let x=-62;x<=62;x+=8){curb.push({p:new THREE.Vector3(x,.075,16.72),s:new THREE.Vector3(3.2,.025,.10)});curb.push({p:new THREE.Vector3(x,.075,-5.72),s:new THREE.Vector3(3.2,.025,.10)});}
  scene.add(instancedBoxes(new THREE.BoxGeometry(1,1,1),flat(0xe7d9bd),curb));

  const theatreData = [
    ['GRAN REX', -50, 20, 0xff3a9e], ['ÓPERA', -28, 20, 0x58d9ff], ['TEATRO', 21, 20, 0xffbd39], ['PASEO LA PLAZA', 44, 20, 0xff3e66]
  ] as const;
  theatreData.forEach(([name, x, z, color], i) => {
    const facade = meshBox(17, 9.5, 2.8, i % 2 ? C.concrete2 : C.concrete, x, 4.75, z); scene.add(facade);
    const s = label(name, 15, 2.0, '#160c1a', '#fff', `#${color.toString(16).padStart(6, '0')}`); s.position.set(x, 7.2, z - 1.42); scene.add(s);
    const glow = glowSprite(color, 12, 0.18); glow.position.set(x, 7, z - 2.2); scene.add(glow);
    const canopy = meshBox(15.5, 0.14, 2.4, hot(color, 1.3), x, 5.9, z - 2.0); scene.add(canopy);
  });

  const avenueBanner = label('AV. CORRIENTES · TEATROS', 11.5, 1.02, '#071c18', '#fff4d6', '#36e59f'); avenueBanner.position.set(-7, 6.15, 28); scene.add(avenueBanner);
  const rexNeon = label('GRAN REX', 10.5, 2.0, '#170719', '#fff', '#ff2e9e'); rexNeon.position.set(-25, 7.0, 30); scene.add(rexNeon);
  const operaNeon = label('ÓPERA', 8.5, 2.0, '#081923', '#fff', '#5ae4ff'); operaNeon.position.set(13, 7.0, 30); scene.add(operaNeon);
  const rexGlow = glowSprite(0xff2e9e, 11, .19); rexGlow.position.set(-25, 7, 29.4); scene.add(rexGlow);
  const operaGlow = glowSprite(0x5ae4ff, 10, .16); operaGlow.position.set(13, 7, 29.4); scene.add(operaGlow);

  for (const [x, z, rot] of [[-16, 15, 0], [3, -5, Math.PI], [3, 15, Math.PI]] as const) {
    scene.add(meshBox(0.16, 4, 0.16, C.black, x, 2, z));
    const s = label('AV. CORRIENTES', 6.1, 0.86, '#075f3a', '#fff', '#fff'); s.position.set(x, 3.78, z); s.rotation.y = rot; scene.add(s);
  }

  const ob = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 2.4, 36, 4), cheapMat({ color: 0xd2d0c8, roughness: 0.88 })); shaft.position.y = 18; ob.add(shaft);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(1.0, 5, 4), cheapMat({ color: 0xe0ddd6, roughness: 0.85 })); cap.position.y = 38.5; ob.add(cap);
  ob.position.set(-7, 0, -66); ob.rotation.y = Math.PI / 4; scene.add(ob);
  const obGlow = glowSprite(0xe6dcff, 21, 0.16); obGlow.position.set(-7, 23, -66); scene.add(obGlow);

  const kiosk = new THREE.Group(); kiosk.add(meshBox(8, 4.0, 5, cheapMat({ color: 0x1f4653, roughness: 0.75 }), 0, 2, 0));
  const ks = label('KIOSCO 24H', 7.2, 1.15, '#10252c', '#ffe973', '#ff2b9a'); ks.position.set(0, 3.02, -2.53); kiosk.add(ks); kiosk.position.set(10, 0, -11); scene.add(kiosk); obstacle(10, -11, 8, 5);

  const bus = createBus(); bus.position.set(-30, 0, 6); bus.rotation.y = Math.PI / 2; scene.add(bus);

  const club = new THREE.Group(); club.add(meshBox(12, 7, 2, cheapMat({ color: 0x19101f, roughness: 0.35, metalness: 0.3 }), 0, 3.5, 0));
  const clubSign = label('BOLICHE · VIP', 11, 1.65, '#160512', '#fff', '#ff1c91'); clubSign.position.set(0, 5.7, -1.03); club.add(clubSign); club.position.set(47, 0, -48); scene.add(club);
  const clubGlow = glowSprite(0xff1c91, 16, 0.22); clubGlow.position.set(47, 4.5, -50); scene.add(clubGlow);
  const destRing = new THREE.Mesh(new THREE.RingGeometry(3.0, 3.35, 48), new THREE.MeshBasicMaterial({ color: 0xff2da1, transparent: true, opacity: 0.9, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
  destRing.rotation.x = -Math.PI / 2; destRing.position.set(47, 0.12, -43); destRing.name = 'DESTINATION_RING'; scene.add(destRing);

  const spawn = label('SALIDA DE ARTISTAS · CORRIENTES', 13, 1.3, '#23112a', '#fff', '#ff2e9e'); spawn.position.set(0, 4.0, 59); scene.add(spawn);
  const localSigns = [
    ['PIZZERÍA GUERRÍN',-43,4.6,18.47,'#9f0b44'],['CAFÉ NOTABLE',-20,4.4,18.46,'#7a401a'],
    ['LIBROS · REVISTAS',24,4.5,18.47,'#0f6b7e'],['KIOSCO 24 HORAS',47,4.5,18.47,'#075f3a']
  ] as const;
  localSigns.forEach(([txt,x,y,z,bg])=>{const q=label(txt,9.5,.92,bg,'#fff6dc','#ffd35a');q.position.set(x,y,z);scene.add(q)});

  const verticalSigns = [
    ['CORRIENTES', -55, 8.2, 25, '#ff218c'], ['PIZZERÍA', -33, 7.2, 24.5, '#ffd24d'],
    ['LIBRERÍA', 31, 7.4, 24.5, '#52d8ff'], ['REVISTA', 51, 7.8, 25, '#ff5f88']
  ] as const;
  verticalSigns.forEach(([txt, x, y, z, accent]) => {
    const sign = label(txt, 5.8, .82, '#130917', '#fff7e5', accent); sign.position.set(x, y, z); scene.add(sign);
  });
  const posterColors=[0x99164f,0x14577a,0x8b4b16];
  posterColors.forEach((color,ci)=>{
    const posterTransforms:Array<{p:THREE.Vector3;s:THREE.Vector3}>=[];
    for(let x=-55+ci*4;x<=53;x+=12) posterTransforms.push({p:new THREE.Vector3(x,2.0,18.54),s:new THREE.Vector3(1.55,2.45,.05)});
    scene.add(instancedBoxes(new THREE.BoxGeometry(1,1,1),flat(color),posterTransforms));
  });
  const bollards: Array<{ p: THREE.Vector3; s: THREE.Vector3 }> = [];
  for (let x = -55; x <= 55; x += 8) { bollards.push({ p:new THREE.Vector3(x,.32,14.4), s:new THREE.Vector3(.13,.64,.13) }); }
  scene.add(instancedBoxes(new THREE.BoxGeometry(1,1,1), flat(0xe7c8a1), bollards));
  const laneDashes:Array<{p:THREE.Vector3;s:THREE.Vector3}>=[]; for(let z=-56;z<56;z+=10) laneDashes.push({p:new THREE.Vector3(-6,.035,z),s:new THREE.Vector3(.13,.025,3.6)}); scene.add(instancedBoxes(new THREE.BoxGeometry(1,1,1),flat(0xe9e1c9),laneDashes));
  const awnings:Array<{p:THREE.Vector3;s:THREE.Vector3}>=[]; for(const x of [-50,-28,21,44]) awnings.push({p:new THREE.Vector3(x,3.35,18.25),s:new THREE.Vector3(6.8,.14,1.1)}); scene.add(instancedBoxes(new THREE.BoxGeometry(1,1,1),flat(0x98104f),awnings));
  const cornices:Array<{p:THREE.Vector3;s:THREE.Vector3}>=[]; for(const x of [-50,-28,21,44]) { cornices.push({p:new THREE.Vector3(x,8.85,18.4),s:new THREE.Vector3(8.2,.18,.55)}); cornices.push({p:new THREE.Vector3(x,4.55,18.35),s:new THREE.Vector3(8.0,.12,.5)}); } scene.add(instancedBoxes(new THREE.BoxGeometry(1,1,1),flat(0xc6a2b7),cornices));
  const lamps:Array<{p:THREE.Vector3;s:THREE.Vector3}>=[]; for(const x of [-52,-38,-24,-10,8,22,36,50]) lamps.push({p:new THREE.Vector3(x,2.2,13.9),s:new THREE.Vector3(.09,4.4,.09)}); scene.add(instancedBoxes(new THREE.BoxGeometry(1,1,1),flat(0x25202a),lamps));


  const tl = [[-16,-5],[3,15],[3,-5]] as const;
  const poles=tl.map(([x,z])=>({p:new THREE.Vector3(x,2,z),s:new THREE.Vector3(.16,4,.16)}));
  const heads=tl.map(([x,z])=>({p:new THREE.Vector3(x,4.25,z),s:new THREE.Vector3(.7,1.8,.55)}));
  const reds=tl.map(([x,z])=>({p:new THREE.Vector3(x,4.7,z-.29),s:new THREE.Vector3(.34,.34,.34)}));
  const greens=tl.map(([x,z])=>({p:new THREE.Vector3(x,3.92,z-.29),s:new THREE.Vector3(.34,.34,.34)}));
  scene.add(instancedBoxes(new THREE.BoxGeometry(1,1,1),C.black,poles));
  scene.add(instancedBoxes(new THREE.BoxGeometry(1,1,1),C.black,heads));
  scene.add(instancedBoxes(new THREE.BoxGeometry(1,1,1),flat(0xff294b),reds));
  scene.add(instancedBoxes(new THREE.BoxGeometry(1,1,1),flat(0x47f58d),greens));
}

const playerPos = new THREE.Vector3(0, 0, 50);
buildBaires();
const moria = createMoria(); scene.add(moria);
let basePreview: THREE.Group | null = null;
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
  const bodysuit = flat(0xff198f);
  const jointAccent = flat(0xd10a6d);
  root.traverse(o => {
    if (o instanceof THREE.SkinnedMesh || o instanceof THREE.Mesh) {
      o.material = (o.name.endsWith('_2') || o.name === 'Mannequin_2') ? jointAccent : bodysuit;
      o.castShadow = false; o.receiveShadow = false;
    }
  });

  // Fitted Barbiecore dress over the rig; deliberately not a bell/skirt placeholder.
  const dress = new THREE.Mesh(new THREE.CylinderGeometry(0.238, 0.285, 0.84, 20), flat(0xff0787));
  dress.position.set(0, 1.00, 0); dress.scale.z = 0.72; root.add(dress);
  const waist = new THREE.Mesh(new THREE.TorusGeometry(0.273, 0.020, 6, 18), flat(0x290013));
  waist.rotation.x = Math.PI / 2; waist.position.y = 1.13; root.add(waist);

  // Shaggy hot-pink coat concentrated at shoulders/upper arms so the body still reads.
  const furGeo = new THREE.ConeGeometry(0.070, 0.22, 6);
  const fur = new THREE.InstancedMesh(furGeo, flat(0xff62b4), 16);
  const fd = new THREE.Object3D();
  const coat = [
    [-.35,1.36,0,.82,.62,-.45],[-.27,1.40,.01,.9,.58,-.25],[-.17,1.42,.02,.92,.54,-.12],[-.06,1.43,.02,.94,.50,-.04],
    [.06,1.43,.02,.94,.50,.04],[.17,1.42,.02,.92,.54,.12],[.27,1.40,.01,.9,.58,.25],[.35,1.36,0,.82,.62,.45],
    [-.42,1.26,.01,.76,.68,-.32],[-.44,1.14,.01,.72,.70,-.22],[-.43,1.03,.02,.68,.66,-.10],[-.41,.93,.02,.62,.60,-.02],
    [.42,1.26,.01,.76,.68,.32],[.44,1.14,.01,.72,.70,.22],[.43,1.03,.02,.68,.66,.10],[.41,.93,.02,.62,.60,.02]
  ] as const;
  coat.forEach(([x,y,z,sx,sy,rz],i)=>{ fd.position.set(x,y,z); fd.scale.set(sx,sy,.82); fd.rotation.set(0,0,rz); fd.updateMatrix(); fur.setMatrixAt(i,fd.matrix); });
  fur.instanceMatrix.needsUpdate=true; root.add(fur);

  const headBone = root.getObjectByName('Head');
  if (!headBone) return;

  // True 3D head plus a CURVED front-hemisphere facial shell. The full original
  // painted face maps once across -Z/front, so eyes/nose/lips keep their proportions.
  const headBase = new THREE.Mesh(new THREE.SphereGeometry(0.205, 28, 22), flat(0xdf9d8f));
  headBase.scale.set(.74,1.16,.82); headBase.position.set(0,.038,-.014); headBone.add(headBase);
  const faceTex = makeMoriaFaceTexture();
  const faceShellGeo = new THREE.SphereGeometry(0.210, 34, 22, Math.PI * 7 / 6, Math.PI * 2 / 3, 0.065, Math.PI - 0.13);
  const faceShell = new THREE.Mesh(faceShellGeo, new THREE.MeshBasicMaterial({ map: faceTex, color:0xffffff, toneMapped:false }));
  faceShell.scale.copy(headBase.scale); faceShell.position.copy(headBase.position); headBone.add(faceShell);

  // Minimal true-3D profile depth over the painted curved face; avoid cartoon overlays.
  const bridge = new THREE.Mesh(new THREE.CapsuleGeometry(.012,.070,4,7), flat(0xd28b80));
  bridge.position.set(0,.006,-.203); bridge.scale.set(.9,1,.58); headBone.add(bridge);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(.022,10,7), flat(0xd58d82));
  tip.scale.set(.82,.64,.72); tip.position.set(0,-.046,-.218); headBone.add(tip);
  const beauty = new THREE.Mesh(new THREE.SphereGeometry(.0048,6,4), flat(0x251019)); beauty.position.set(.086,-.052,-.205); headBone.add(beauty);

  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.218,20,14,0,Math.PI*2,0,Math.PI*.54), flat(0x020204));
  cap.scale.set(.91,.91,.92); cap.position.set(0,.137,.035); headBone.add(cap);
  const frontLocks=new THREE.InstancedMesh(new THREE.BoxGeometry(.052,.76,.045),flat(0x020204),2); const ld=new THREE.Object3D();
  [-1,1].forEach((side,i)=>{ld.position.set(side*.176,-.205,-.105);ld.rotation.set(0,side*.06,side*.025);ld.scale.set(1,1,1);ld.updateMatrix();frontLocks.setMatrixAt(i,ld.matrix)}); frontLocks.instanceMatrix.needsUpdate=true; headBone.add(frontLocks);

  // Long straight jet-black hair with center part and shoulder-length sheets.
  const hg = new THREE.BoxGeometry(.028,1.22,.046);
  const hair = new THREE.InstancedMesh(hg, flat(0x020204), 15);
  const hd = new THREE.Object3D();
  for(let i=0;i<15;i++){
    const u=(i-7)/7; const front=Math.abs(u)>.70;
    hd.position.set(u*.205,-.50,front ? -.018 : .100 + .030*(1-Math.abs(u)));
    hd.scale.set(front?1.35:1,1+.08*(1-Math.abs(u)),1); hd.rotation.set(0,0,u*.018); hd.updateMatrix(); hair.setMatrixAt(i,hd.matrix);
  }
  hair.instanceMatrix.needsUpdate=true; headBone.add(hair);

  const ear = new THREE.InstancedMesh(new THREE.TorusGeometry(.036,.007,6,12), flat(0xf4d16b), 2);
  const ed=new THREE.Object3D(); [-1,1].forEach((side,i)=>{ed.position.set(side*.197,-.045,-.004);ed.rotation.set(0,Math.PI/2,0);ed.updateMatrix();ear.setMatrixAt(i,ed.matrix)}); ear.instanceMatrix.needsUpdate=true; headBone.add(ear);
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
  if (BASE_PREVIEW) root.scale.setScalar(scale); else root.scale.set(scale * .86, scale, scale * .91);
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

const taxi = createTaxi(); taxi.position.set(16, 0, 6); taxi.rotation.y = Math.PI / 2; scene.add(taxi);
const npcs: NPC[] = [
  createNPC('paparazzi', -10, 34), createNPC('paparazzi', -2, 7), createNPC('paparazzi', 31, -25),
  createNPC('fan', -28, 10), createNPC('fan', 8, -22),
  createNPC('neutral', 15, 10),
];
const npcBodyMat=new THREE.MeshBasicMaterial({color:0xffffff,vertexColors:true,toneMapped:false});
const npcBodies=new THREE.InstancedMesh(new THREE.CapsuleGeometry(.28,1.18,3,6),npcBodyMat,npcs.length);
const npcHeads=new THREE.InstancedMesh(new THREE.SphereGeometry(.27,8,6),C.skin,npcs.length);
const paparazzi=npcs.filter(n=>n.kind==='paparazzi'), fans=npcs.filter(n=>n.kind==='fan');
const npcCameras=new THREE.InstancedMesh(new THREE.BoxGeometry(.4,.27,.23),C.black,paparazzi.length);
const npcPhones=new THREE.InstancedMesh(new THREE.BoxGeometry(.14,.28,.035),flat(0xcbd0db),fans.length);
scene.add(npcBodies,npcHeads,npcCameras,npcPhones);
const npcDummy=new THREE.Object3D();
function syncNPCVisuals(){
  let ci=0,fi=0;
  npcs.forEach((n,i)=>{
    const pos=n.root.position, rot=n.root.rotation.y;
    npcDummy.position.set(pos.x,1.05,pos.z);npcDummy.rotation.set(0,rot,0);npcDummy.scale.set(1,1,1);npcDummy.updateMatrix();npcBodies.setMatrixAt(i,npcDummy.matrix);
    npcBodies.setColorAt(i,new THREE.Color(n.kind==='paparazzi'?0x8d234d:n.kind==='fan'?0x197e9a:0x696570));
    npcDummy.position.set(pos.x,2.05,pos.z);npcDummy.rotation.set(0,rot,0);npcDummy.updateMatrix();npcHeads.setMatrixAt(i,npcDummy.matrix);
    if(n.kind==='paparazzi'){npcDummy.position.set(pos.x,1.72,pos.z-.34);npcDummy.rotation.set(0,rot,0);npcDummy.updateMatrix();npcCameras.setMatrixAt(ci++,npcDummy.matrix)}
    if(n.kind==='fan'){npcDummy.position.set(pos.x+.3,1.78,pos.z-.18);npcDummy.rotation.set(0,rot,-.16);npcDummy.updateMatrix();npcPhones.setMatrixAt(fi++,npcDummy.matrix)}
  });
  npcBodies.instanceMatrix.needsUpdate=true; npcHeads.instanceMatrix.needsUpdate=true; npcCameras.instanceMatrix.needsUpdate=true; npcPhones.instanceMatrix.needsUpdate=true;
  if(npcBodies.instanceColor) npcBodies.instanceColor.needsUpdate=true;
}
syncNPCVisuals();


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
let cameraDistance = 7.6;
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
let resolutionScale = isCoarse ? 0.58 : 0.64;
const fpsSamples: number[] = [];
let fpsAvg = 60;
let fpsMedian = 60;
let fpsP5 = 60;
let qualityClock = 0;

function refreshViewport() {
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
  cameraYaw = 0; cameraPitch = 0.28; cameraDistance = 7.6;
  npcs.forEach((n, i) => { n.root.position.copy(n.home); n.state = 'WANDER'; n.timer = 0.5 + i * 0.1; n.knock.set(0, 0, 0); }); syncNPCVisuals();
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
  qTimer = 5.5; qUses++; qSound(); fovKick = 7; shake = 0.28; specialPose = .9; moriaMotion = 'special';
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
    playerBody.setNextKinematicTranslation({ x: playerPos.x, y: 1.2, z: playerPos.z }); cameraDistance = 7.6; actionBtn.textContent = 'ENTRAR'; return;
  }
  if (taxi.position.distanceTo(playerPos) < 5) { vehicleMode = true; moria.visible = false; vehicleHeading = taxi.rotation.y; cameraYaw = vehicleHeading + Math.PI; cameraPitch = 0.22; cameraDistance = 10.2; actionBtn.textContent = 'SALIR'; objective.textContent = 'TAXI TOMADO · LLEGÁ AL BOLICHE'; }
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
let stickPointer = -1;
stick.addEventListener('pointerdown', e => { e.preventDefault(); stickPointer = e.pointerId; try { stick.setPointerCapture(e.pointerId); } catch {} updateStick(e); });
stick.addEventListener('pointermove', e => { if (e.pointerId === stickPointer) updateStick(e); });
function endStick(e: PointerEvent) { if (e.pointerId !== stickPointer) return; try { if (stick.hasPointerCapture(e.pointerId)) stick.releasePointerCapture(e.pointerId); } catch {} stickPointer = -1; joy.x = 0; joy.y = 0; stickKnob.style.transform = 'translate(0px,0px)'; }
stick.addEventListener('pointerup', endStick); stick.addEventListener('pointercancel', endStick);
lookZone.addEventListener('pointerdown', e => { lookPointer = e.pointerId; lookLast = { x: e.clientX, y: e.clientY }; try { lookZone.setPointerCapture(e.pointerId); } catch {} });
lookZone.addEventListener('pointermove', e => { if (e.pointerId === lookPointer) { cameraYaw -= (e.clientX - lookLast.x) * 0.006; cameraPitch = THREE.MathUtils.clamp(cameraPitch + (e.clientY - lookLast.y) * 0.005, 0.08, 0.62); lookLast = { x: e.clientX, y: e.clientY }; } });
lookZone.addEventListener('pointerup', e => { if (e.pointerId === lookPointer) lookPointer = -1; }); lookZone.addEventListener('pointercancel', e => { if (e.pointerId === lookPointer) lookPointer = -1; });
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
    moriaMotion = 'drive';
    const throttle = -i.z; const steer = i.x; vehicleSpeed += throttle * 15 * dt; vehicleSpeed *= Math.pow(0.965, dt * 60); vehicleSpeed = THREE.MathUtils.clamp(vehicleSpeed, -7, 17);
    vehicleHeading -= steer * (0.78 + Math.abs(vehicleSpeed) * 0.05) * dt * (vehicleSpeed >= 0 ? 1 : -1);
    const nx = taxi.position.x + Math.sin(vehicleHeading) * vehicleSpeed * dt; const nz = taxi.position.z + Math.cos(vehicleHeading) * vehicleSpeed * dt;
    if (!blocked(nx, nz)) { taxi.position.x = nx; taxi.position.z = nz; } else vehicleSpeed *= -0.15; taxi.rotation.y = vehicleHeading; return;
  }
  const mag = Math.hypot(i.x, i.z); if (mag < 0.04) { moriaMotion = 'idle'; return; }
  const sprint = keys.has('shift') || touchRun; moriaMotion = sprint ? 'sprint' : 'walk'; const speed = sprint ? 8.3 : 5.2;
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
  syncNPCVisuals();
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
  const p = worldPos(); const target = new THREE.Vector3(p.x, vehicleMode ? 1.75 : 1.62, p.z);
  const cp = Math.cos(cameraPitch); const forward = new THREE.Vector3(Math.sin(cameraYaw) * cp, -Math.sin(cameraPitch), -Math.cos(cameraYaw) * cp);
  const portrait = window.innerHeight > window.innerWidth;
  const framingDistance = cameraDistance * (portrait ? (vehicleMode ? 1.18 : 1.32) : 1);
  const desired = target.clone().addScaledVector(forward, -framingDistance); desired.y += portrait ? 1.05 : 0.55;
  if (shake > 0.004) { desired.x += (Math.random() - 0.5) * shake; desired.y += (Math.random() - 0.5) * shake; desired.z += (Math.random() - 0.5) * shake; }
  camera.position.lerp(desired, 1 - Math.pow(0.002, dt)); camera.lookAt(target); camera.fov = (portrait ? 64 : 55) + fovKick; camera.updateProjectionMatrix();
}
function updateQuality(dt: number) {
  const fps = 1 / Math.max(0.001, dt); fpsSamples.push(fps); if (fpsSamples.length > 480) fpsSamples.shift(); qualityClock += dt;
  if (qualityClock < 3.5) return; qualityClock = 0;
  const sorted = [...fpsSamples].sort((a, b) => a - b); fpsAvg = fpsSamples.reduce((a, b) => a + b, 0) / Math.max(1, fpsSamples.length); fpsMedian = sorted[Math.floor(sorted.length * 0.5)] ?? fpsAvg; fpsP5 = sorted[Math.floor(sorted.length * 0.05)] ?? fpsAvg;
  if (fpsAvg < 50 && resolutionScale > 0.32) { resolutionScale = Math.max(0.32, resolutionScale - 0.06); refreshViewport(); }
  else if (fpsAvg > 59 && fpsP5 > 47 && resolutionScale < 0.92) { resolutionScale = Math.min(0.92, resolutionScale + 0.04); refreshViewport(); }
  if (PERF_MODE) perfEl.textContent = `FPS avg ${fpsAvg.toFixed(1)} · med ${fpsMedian.toFixed(1)} · p5 ${fpsP5.toFixed(1)}\nquality ${resolutionScale.toFixed(2)} · DPR ${(Math.min(devicePixelRatio, 1.5) * resolutionScale).toFixed(2)}\ndraw ${renderer.info.render.calls} · tris ${renderer.info.render.triangles}`;
}

function frame(now: number) {
  requestAnimationFrame(frame); const rawDt = Math.max(0, (now - lastTime) / 1000); const dt = Math.min(0.033, rawDt); lastTime = now; elapsed += dt;
  if (started && !ended && !document.hidden) { updatePlayer(dt); physics.step(); updateNPCs(dt); updateMission(); }
  updateQ(dt); updateMoriaAnimation(dt); updateCamera(dt || 0.016); updateQuality(rawDt || 0.016);
  moria.position.set(playerPos.x, Math.sin(elapsed * 8.5) * (started && !vehicleMode ? 0.025 : 0), playerPos.z); if (basePreview) { basePreview.position.x = playerPos.x; basePreview.position.z = playerPos.z; basePreview.rotation.y = playerYaw; basePreview.visible = !vehicleMode; }
  const ring = scene.getObjectByName('DESTINATION_RING'); if (ring) ring.rotation.z = elapsed * 0.42;
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);

window.__QS_TEST__ = {
  start: startGame,
  state: () => ({ started, ended, result: resultState, entity, qTimer, qUses, qAffected, vehicleMode, x: worldPos().x, z: worldPos().z, fpsAvg, fpsMedian, fpsP5, quality: resolutionScale, drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles, gpuVendor, gpuRenderer, baseReady, baseBones, baseMeshes, baseAnimations }),
  teleport: (x, z) => { if (vehicleMode) taxi.position.set(x, 0, z); else { playerPos.set(x, 0, z); moria.position.copy(playerPos); playerBody.setNextKinematicTranslation({ x, y: 1.2, z }); } },
  nearTaxi: () => { vehicleMode = false; moria.visible = true; playerPos.set(taxi.position.x + 2.4, 0, taxi.position.z); moria.position.copy(playerPos); },
  destination: () => { if (vehicleMode) taxi.position.set(destination.x, 0, destination.z); else { playerPos.copy(destination); moria.position.copy(playerPos); } },
  entity: v => { entity = v; updateHud(); if (entity >= 100) finish('fail'); },
  q: triggerQ,
  vehicle: tryVehicle,
  cameraClose: () => { cameraDistance = 3.0; cameraPitch = 0.12; },
};
